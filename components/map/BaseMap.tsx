"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";

import { getMapConfig } from "@/lib/mapConfig";
import type { ViewState } from "@/types/map";

interface BaseMapProps {
  initialViewState?: Partial<ViewState>;
  onCountryClick?: (countryName: string) => void;
  onCountryHover?: (countryName: string | null) => void;
  focusedCountry?: string | null;
  adminBoundaries?: any;
  worldCountries?: any;
  maxBounds?: [[number, number], [number, number]] | null;
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
  focusedCountry,
  adminBoundaries,
  worldCountries,
  maxBounds,
  style = { width: "100%", height: "600px" },
  mapProvider = "osm",
}: BaseMapProps) {
  const mapConfig = getMapConfig(mapProvider);
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });
  const [hoveredStateId, setHoveredStateId] = useState<string | number | null>(
    null,
  );
  const [minZoom, setMinZoom] = useState<number | undefined>(undefined);

  // Update view state when initialViewState changes
  useEffect(() => {
    if (initialViewState) {
      setViewState((prev) => ({ ...prev, ...initialViewState }));
      // Set minZoom to the initial zoom when entering focus mode
      if (focusedCountry && initialViewState.zoom) {
        setMinZoom(initialViewState.zoom);
      } else if (!focusedCountry) {
        setMinZoom(undefined);
      }
    }
  }, [initialViewState, focusedCountry]);

  // Clean up hover state when exiting focus mode
  useEffect(() => {
    if (!focusedCountry && hoveredStateId !== null) {
      const map = mapRef.current?.getMap();
      if (map) {
        map.setFeatureState(
          { source: "admin-boundaries", id: hoveredStateId },
          { hover: false },
        );
      }
      setHoveredStateId(null);
    }
  }, [focusedCountry, hoveredStateId]);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleClick = useCallback(
    (event: any) => {
      if (!onCountryClick) return;

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
    [onCountryClick, focusedCountry],
  );

  const handleMouseMove = useCallback(
    (event: any) => {
      if (!onCountryHover) return;

      const map = mapRef.current?.getMap();
      if (!map) return;

      if (focusedCountry) {
        // In focus mode, hover over admin boundaries
        const features = event.features;
        if (features && features.length > 0) {
          const feature = features[0];
          const stateName = feature.properties?.name;

          if (hoveredStateId !== null && hoveredStateId !== feature.id) {
            map.setFeatureState(
              { source: "admin-boundaries", id: hoveredStateId },
              { hover: false },
            );
          }

          if (feature.id) {
            setHoveredStateId(feature.id);
            map.setFeatureState(
              { source: "admin-boundaries", id: feature.id },
              { hover: true },
            );
          }

          onCountryHover(stateName || null);
          map.getCanvas().style.cursor = "pointer";
        } else {
          if (hoveredStateId !== null) {
            map.setFeatureState(
              { source: "admin-boundaries", id: hoveredStateId },
              { hover: false },
            );
            setHoveredStateId(null);
          }
          onCountryHover(null);
          map.getCanvas().style.cursor = "";
        }
      } else {
        // Not in focus mode - hover over world countries
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
    [onCountryHover, focusedCountry, hoveredStateId],
  );

  const handleMouseLeave = useCallback(() => {
    if (onCountryHover) {
      onCountryHover(null);
    }
    const map = mapRef.current?.getMap();
    if (map) {
      map.getCanvas().style.cursor = "";
      if (hoveredStateId !== null) {
        map.setFeatureState(
          { source: "admin-boundaries", id: hoveredStateId },
          { hover: false },
        );
        setHoveredStateId(null);
      }
    }
  }, [onCountryHover, hoveredStateId]);

  return (
    <Map
      ref={mapRef}
      {...viewState}
      onMove={handleMove}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      mapStyle={mapConfig.style}
      maxBounds={maxBounds || undefined}
      minZoom={minZoom}
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
        <Source
          id="admin-boundaries"
          type="geojson"
          data={adminBoundaries}
          promoteId="id"
        >
          <Layer
            id="admin-boundaries-fill"
            type="fill"
            paint={{
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                "#4A90E2",
                "#E6E6E6",
              ],
              "fill-opacity": 0.6,
            }}
          />
          <Layer
            id="admin-boundaries-line"
            type="line"
            paint={{
              "line-color": "#333",
              "line-width": 1.5,
            }}
          />
        </Source>
      )}
    </Map>
  );
}
