"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, { useCallback, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";

import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  ViewState,
} from "@/types/map";

interface BaseMapProps {
  initialViewState?: Partial<ViewState>;
  geoData?: GeoJSONFeatureCollection | null;
  onFeatureClick?: (feature: GeoJSONFeature) => void;
  style?: React.CSSProperties;
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
  geoData,
  onFeatureClick,
  style = { width: "100%", height: "600px" },
}: BaseMapProps) {
  const [viewState, setViewState] = useState<ViewState>({
    ...DEFAULT_VIEW_STATE,
    ...initialViewState,
  });

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleClick = useCallback(
    (event: { features?: unknown[] }) => {
      if (!onFeatureClick) return;

      const features = event.features;
      if (features && features.length > 0) {
        onFeatureClick(features[0] as GeoJSONFeature);
      }
    },
    [onFeatureClick],
  );

  return (
    <Map
      {...viewState}
      onMove={handleMove}
      onClick={handleClick}
      style={style}
      mapStyle={{
        version: 8,
        sources: {},
        layers: [
          {
            id: "background",
            type: "background",
            paint: {
              "background-color": "#f0f0f0",
            },
          },
        ],
      }}
      interactiveLayerIds={geoData ? ["countries-fill"] : []}
    >
      {geoData && (
        <Source id="countries" type="geojson" data={geoData}>
          <Layer
            id="countries-fill"
            type="fill"
            paint={{
              "fill-color": "#E6E6E6",
              "fill-opacity": 0.8,
            }}
          />
          <Layer
            id="countries-line"
            type="line"
            paint={{
              "line-color": "#999",
              "line-width": 1,
            }}
          />
        </Source>
      )}
    </Map>
  );
}
