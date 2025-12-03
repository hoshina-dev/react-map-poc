"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, { useCallback, useEffect, useRef, useState, useMemo } from "react";
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
  const mapConfig = useMemo(() => getMapConfig(mapProvider), [mapProvider]);
  const mapRef = useRef<MapRef>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });
  const [isMapMoving, setIsMapMoving] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Memoize interactive layer IDs to prevent array recreation on each render
  const interactiveLayerIds = useMemo(() => {
    if (focusedCountry && adminBoundaries) {
      return ["admin-boundaries-fill"];
    }
    if (worldCountries) {
      return ["world-countries-fill"];
    }
    return undefined;
  }, [focusedCountry, adminBoundaries, worldCountries]);

  // Track map movement to prevent clicks during animation
  useEffect(() => {
    if (!mapLoaded) return;
    
    const map = mapRef.current?.getMap();
    if (!map) return;

    const handleMoveStart = () => setIsMapMoving(true);
    const handleMoveEnd = () => setIsMapMoving(false);

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
    if (!initialViewState) return;
    
    const map = mapRef.current?.getMap();
    
    // When exiting focus mode, force immediate jump to world view
    if (!focusedCountry && map) {
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
    
    const map = mapRef.current?.getMap();
    if (map && fitToBounds) {
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
    }
  }, [fitToBounds, mapLoaded]);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
    onViewStateChange?.(evt.viewState);
  }, [onViewStateChange]);

  const handleLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  const handleClick = useCallback(
    (event: any) => {
      if (!onCountryClick) return;

      // Ignore clicks while map is moving/animating
      if (isMapMoving) return;

      const features = event.features;

      if (focusedCountry && features && features.length > 0) {
        // In focus mode, clicking on admin boundaries
        const feature = features[0];
        const stateName = feature.properties?.name;
        // State click handling can be added here if needed
        void stateName;
      } else if (!focusedCountry && features && features.length > 0) {
        // Not in focus mode - clicking on world countries
        const feature = features[0];
        const countryName = feature.properties?.name || feature.properties?.admin;
        if (countryName) {
          onCountryClick(countryName);
        }
      }
    },
    [onCountryClick, focusedCountry, isMapMoving],
  );

  const handleMouseMove = useCallback(
    (event: any) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      const features = event.features;
      const hasFeatures = features && features.length > 0;

      // Handle admin boundary hover when in focus mode
      if (focusedCountry && adminBoundaries) {
        if (hasFeatures) {
          const name = features[0].properties?.name_en || null;
          if (name && name !== hoveredProvince) {
            setHoveredProvince(name);
            onCountryHover?.(name);
            map.getCanvas().style.cursor = "pointer";
          }
        } else if (hoveredProvince) {
          setHoveredProvince(null);
          onCountryHover?.(null);
          map.getCanvas().style.cursor = "";
        }
      }
      // Handle world-country hover when not in focus mode
      else if (!focusedCountry) {
        if (hasFeatures) {
          const countryName = features[0].properties?.name || features[0].properties?.admin;
          if (countryName && countryName !== hoveredCountry) {
            setHoveredCountry(countryName);
            onCountryHover?.(countryName);
            map.getCanvas().style.cursor = "pointer";
          }
        } else if (hoveredCountry) {
          setHoveredCountry(null);
          onCountryHover?.(null);
          map.getCanvas().style.cursor = "";
        }
      }
    },
    [onCountryHover, focusedCountry, adminBoundaries, hoveredCountry, hoveredProvince],
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredCountry(null);
    setHoveredProvince(null);
    onCountryHover?.(null);
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = "";
    }
  }, [onCountryHover]);

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
      interactiveLayerIds={interactiveLayerIds}
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
