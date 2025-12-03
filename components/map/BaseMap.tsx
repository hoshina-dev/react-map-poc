"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import GeoLayer from "./GeoLayer";

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
  fitToBounds?: [[number, number], [number, number]] | null;
  style?: React.CSSProperties;
  mapProvider?: "osm" | "positron" | "maplibre-demo" | "mapbox";
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
  fitToBounds,
  style = { width: "100%", height: "600px" },
  mapProvider = "positron",
}: BaseMapProps) {
  const mapConfig = getMapConfig(mapProvider);
  const mapRef = useRef<MapRef>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });
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
      // console.log("[BaseMap] Exiting focus - forcing jumpTo world view");
      map.jumpTo({
        center: [initialViewState.longitude || 0, initialViewState.latitude || 20],
        zoom: initialViewState.zoom || 2,
      });
    }
    
    // Update internal state but don't trigger onViewStateChange to prevent loop
    setViewState((prev) => ({ ...prev, ...initialViewState }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusedCountry, mapLoaded]); // Depend on mapLoaded to ensure map is ready

  // Hover state for admin boundaries is handled by AdminBoundariesLayer

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

      // Handle admin boundary hover when in focus mode
      if (focusedCountry && adminBoundaries) {
        const features = event.features;
        if (features && features.length > 0) {
          const feature = features[0];
          // console.log("[BaseMap] Hover feature:", feature.properties);
          // Use clean name_en property (no null bytes!)
          const name = feature.properties?.name_en || null;

          if (name) {
            console.log("[BaseMap] Setting hoveredProvince:", name);
            setHoveredProvince(name);
            onCountryHover(name);
            map.getCanvas().style.cursor = "pointer";
          }
        } else {
          console.log("[BaseMap] No features, clearing filter");
          setHoveredProvince(null);
          onCountryHover(null);
          map.getCanvas().style.cursor = "";
        }
      }
      // Handle world-country hover when not in focus mode
      else if (!focusedCountry) {
        const features = event.features;
        if (features && features.length > 0) {
          const feature = features[0];
          const countryName = feature.properties?.name || feature.properties?.admin;
          setHoveredCountry(countryName || null);
          onCountryHover(countryName || null);
          map.getCanvas().style.cursor = "pointer";
        } else {
          setHoveredCountry(null);
          onCountryHover(null);
          map.getCanvas().style.cursor = "";
        }
      }
    },
    [onCountryHover, focusedCountry, adminBoundaries],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setHoveredProvince(null);
    if (onCountryHover) {
      onCountryHover(null);
    }
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = "";
    }
  }, [onCountryHover]);

  // Log render state (reduce noise)
  // console.log("[BaseMap] Rendering with:", { focusedCountry, hoveredCountry, hoveredProvince });

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
      {/* World countries layer (shown when not focused) */}
      {!focusedCountry && worldCountries && (
        <GeoLayer
          id="world-countries"
          data={worldCountries}
          highlightProperty="name"
          highlightValue={hoveredCountry}
          variant="country"
          showBaseFill={true}
        />
      )}

      {/* Admin boundaries layer (shown when focused) */}
      {focusedCountry && adminBoundaries && (
        <GeoLayer
          id="admin-boundaries"
          data={adminBoundaries}
          highlightProperty="name_en"
          highlightValue={hoveredProvince}
          variant="default"
        />
      )}
    </Map>
  );
}
