"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import AdminBoundariesLayer from "./AdminBoundariesLayer";

import { getMapConfig } from "@/lib/mapConfig";
import type { ViewState } from "@/types/map";

interface BaseMapProps {
  initialViewState?: Partial<ViewState>;
  onCountryClick?: (countryName: string) => void;
  onCountryHover?: (countryName: string | null) => void;
  onViewStateChange?: (viewState: ViewState) => void;
  focusedCountry?: string | null;
  adminBoundaries?: any;
  worldCountries?: any;
  maxBounds?: [[number, number], [number, number]] | null;
  fitToBounds?: [[number, number], [number, number]] | null;
  style?: React.CSSProperties;
  mapProvider?: "osm" | "maplibre-demo" | "mapbox";
}

const DEFAULT_VIEW_STATE: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

export default function BaseMap({
  initialViewState,
  onCountryClick,
  onCountryHover,
  onViewStateChange,
  focusedCountry,
  adminBoundaries,
  worldCountries,
  maxBounds,
  fitToBounds,
  style = { width: "100%", height: "600px" },
  mapProvider = "osm",
}: BaseMapProps) {
  const mapConfig = getMapConfig(mapProvider);
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });
  const [minZoom, setMinZoom] = useState<number | undefined>(undefined);
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Track map movement to prevent clicks during animation
  useEffect(() => {
    if (!mapLoaded) return;
    
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleMoveStart = () => {
      console.log("[BaseMap] Map started moving");
      setIsMapMoving(true);
    };

    const handleMoveEnd = () => {
      console.log("[BaseMap] Map stopped moving");
      setIsMapMoving(false);
    };

    map.on('movestart', handleMoveStart);
    map.on('moveend', handleMoveEnd);

    return () => {
      map.off('movestart', handleMoveStart);
      map.off('moveend', handleMoveEnd);
    };
  }, [mapLoaded]);

  // Update view state when focusedCountry changes (for focus mode transitions)
  useEffect(() => {
    if (!mapLoaded) return;
    
    console.log("[BaseMap] focusedCountry changed:", focusedCountry, "initialViewState:", initialViewState);
    if (!initialViewState) return;
    
    const map = mapRef.current?.getMap();
    
    // When exiting focus mode, force immediate jump to world view
    if (!focusedCountry && map) {
      console.log("[BaseMap] Exiting focus - forcing jumpTo world view");
      map.jumpTo({
        center: [initialViewState.longitude || 0, initialViewState.latitude || 20],
        zoom: initialViewState.zoom || 2,
      });
    }
    
    // Update internal state but don't trigger onViewStateChange to prevent loop
    setViewState((prev) => ({ ...prev, ...initialViewState }));
    
    // Only manage minZoom when entering focus mode, not when exiting
    if (focusedCountry && initialViewState.zoom) {
      console.log("[BaseMap] Setting minZoom to:", initialViewState.zoom);
      setMinZoom(initialViewState.zoom);
      if (map) {
        map.setMinZoom(initialViewState.zoom);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedCountry, mapLoaded]); // Depend on mapLoaded to ensure map is ready

  // Clear minZoom when exiting focus mode
  useEffect(() => {
    if (!mapLoaded) return;
    
    if (!focusedCountry && minZoom !== undefined) {
      console.log("[BaseMap] Exiting focus mode - clearing minZoom");
      setMinZoom(undefined);
      const map = mapRef.current?.getMap();
      if (map) {
        map.setMinZoom(0); // Reset to no minimum zoom
      }
    }
  }, [focusedCountry, minZoom]);

  // Hover state for admin boundaries is handled by AdminBoundariesLayer

  // Set maxBounds on MapLibre instance
  useEffect(() => {
    if (!mapLoaded) return;
    
    console.log("[BaseMap] maxBounds changed:", maxBounds);
    const map = mapRef.current?.getMap();
    if (map) {
      if (maxBounds === null) {
        console.log("[BaseMap] Explicitly removing maxBounds from map");
        map.setMaxBounds(undefined);
      } else {
        console.log("[BaseMap] Setting maxBounds on map:", maxBounds);
        map.setMaxBounds(maxBounds);
      }
    }
  }, [maxBounds]);

  // Fit to bounds when entering focus mode
  useEffect(() => {
    if (!mapLoaded) return;
    
    console.log("[BaseMap] fitToBounds changed:", fitToBounds);
    const map = mapRef.current?.getMap();
    if (map && fitToBounds) {
      console.log("[BaseMap] Current map state before fitBounds:", {
        center: map.getCenter(),
        zoom: map.getZoom(),
      });
      console.log("[BaseMap] Calling map.fitBounds:", fitToBounds);
      map.fitBounds(
        [
          [fitToBounds[0][0], fitToBounds[0][1]],
          [fitToBounds[1][0], fitToBounds[1][1]],
        ],
        {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          duration: 0, // No animation
        }
      );
      // Log after fitBounds
      setTimeout(() => {
        console.log("[BaseMap] Map state after fitBounds:", {
          center: map.getCenter(),
          zoom: map.getZoom(),
        });
      }, 50);
    }
  }, [fitToBounds]);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
    onViewStateChange?.(evt.viewState);
  }, [onViewStateChange]);

  const handleLoad = useCallback(() => {
    console.log("[BaseMap] Map loaded - ready for operations");
    setMapLoaded(true);
  }, []);

  const handleClick = useCallback(
    (event: any) => {
      if (!onCountryClick) return;

      // Ignore clicks while map is moving/animating
      if (isMapMoving) {
        console.log("[BaseMap] Ignoring click - map is moving");
        return;
      }

      const features = event.features;

      if (focusedCountry && features && features.length > 0) {
        // In focus mode, clicking on admin boundaries
        const feature = features[0];
        const stateName = feature.properties?.name;
        if (stateName) {
          console.log("Clicked state/province:", stateName);
        }
      } else if (!focusedCountry && features && features.length > 0) {
        // Not in focus mode - clicking on world countries
        const feature = features[0];
        const countryName = feature.properties?.name || feature.properties?.admin;
        if (countryName) {
          onCountryClick(countryName);
        }
      }
      // If in focus mode but clicked outside features, do nothing (don't allow switching countries)
    },
    [onCountryClick, focusedCountry, isMapMoving],
  );

  const handleMouseMove = useCallback(
    (event: any) => {
      if (!onCountryHover) return;

      const map = mapRef.current?.getMap();
      if (!map) return;

      // Only handle world-country hover here; admin boundary hover handled in AdminBoundariesLayer
      if (!focusedCountry) {
        const features = event.features;
        if (features && features.length > 0) {
          const feature = features[0];
          const countryName = feature.properties?.name || feature.properties?.admin;
          onCountryHover(countryName || null);
          map.getCanvas().style.cursor = "pointer";
        } else {
          onCountryHover(null);
          map.getCanvas().style.cursor = "";
        }
      }
    },
    [onCountryHover, focusedCountry],
  );

  const handleMouseLeave = useCallback(() => {
    if (onCountryHover) {
      onCountryHover(null);
    }
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = "";
    }
  }, [onCountryHover]);

  // Log render state
  console.log("[BaseMap] Rendering with:", {
    focusedCountry,
    hasAdminBoundaries: !!adminBoundaries,
    maxBounds,
    minZoom,
    viewState: { lng: viewState.longitude, lat: viewState.latitude, zoom: viewState.zoom },
  });

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={handleMove}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      mapStyle={mapConfig.style}
      maxZoom={15}
      interactiveLayerIds={
        focusedCountry && adminBoundaries
          ? ["admin-boundaries-fill"]
          : worldCountries
            ? ["world-countries-fill"]
            : undefined
      }
    >
      {!focusedCountry && worldCountries && (
        <Source id="world-countries" type="geojson" data={worldCountries}>
          <Layer
            id="world-countries-fill"
            type="fill"
            paint={{
              "fill-color": "transparent",
              "fill-opacity": 0,
            }}
          />
        </Source>
      )}
      {focusedCountry && adminBoundaries && (
        <AdminBoundariesLayer
          mapRef={mapRef}
          adminBoundaries={adminBoundaries}
          onRegionHover={onCountryHover}
        />
      )}
    </Map>
  );
}
