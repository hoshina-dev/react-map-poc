"use client";

import type { FilterSpecification } from "maplibre-gl";
import React, { memo, useMemo } from "react";
import type { LayerProps } from "react-map-gl/maplibre";
import { Layer, Source } from "react-map-gl/maplibre";

// Layer style configuration
export interface LayerStyle {
  fillColor: string;
  fillOpacity: number;
  highlightColor: string;
  highlightOpacity: number;
  lineColor: string;
  lineWidth: number;
}

/** Configuration for a geographic layer level */
export interface LevelConfig {
  layerId: string;
  highlightProperty: string;
  variant: "country" | "default";
}

const DEFAULT_STYLE: LayerStyle = {
  fillColor: "#E6E6E6",
  fillOpacity: 0.6,
  highlightColor: "#4ECDC4",
  highlightOpacity: 0.8,
  lineColor: "#333",
  lineWidth: 1,
};

const COUNTRY_STYLE: LayerStyle = {
  fillColor: "transparent",
  fillOpacity: 0,
  highlightColor: "#4ECDC4",
  highlightOpacity: 0.4,
  lineColor: "#666",
  lineWidth: 0.5,
};

const VARIANT_STYLES: Record<LevelConfig["variant"], LayerStyle> = {
  default: DEFAULT_STYLE,
  country: COUNTRY_STYLE,
};

export interface GeoLayerProps {
  /** Level configuration containing layerId, highlightProperty, and variant */
  levelConfig: LevelConfig;
  /** GeoJSON data to render */
  data: GeoJSON.FeatureCollection | null;
  /** Current value to highlight (null = no highlight) */
  highlightValue: string | null;
  /** Custom style overrides */
  style?: Partial<LayerStyle>;
  /** Whether to show the base fill layer */
  showBaseFill?: boolean;
}

/**
 * Reusable geographic layer component with hover highlighting.
 * Uses MapLibre's filter-based approach for efficient rendering.
 * Memoized to prevent unnecessary re-renders.
 */
function GeoLayerComponent({
  levelConfig,
  data,
  highlightValue,
  style: customStyle,
  showBaseFill = true,
}: GeoLayerProps) {
  const { layerId: id, highlightProperty, variant } = levelConfig;
  
  // Use a globally stable source id to avoid MapLibre errors when the
  // rendered layer/id switches during transitions 
  const GLOBAL_SOURCE_ID = "react-map-poc-geo-source";
  
  // Merge default style with variant and custom overrides
  const layerStyle = useMemo(() => {
    const baseStyle = VARIANT_STYLES[variant];
    return { ...baseStyle, ...customStyle };
  }, [variant, customStyle]);

  // Memoize layer props to prevent re-renders
  const baseLayerProps: LayerProps = useMemo(
    () => ({
      id: `${id}-fill`,
      type: "fill" as const,
      paint: {
        "fill-color": layerStyle.fillColor,
        "fill-opacity": layerStyle.fillOpacity,
      },
    }),
    [id, layerStyle.fillColor, layerStyle.fillOpacity],
  );

  const lineLayerProps: LayerProps = useMemo(
    () => ({
      id: `${id}-line`,
      type: "line" as const,
      paint: {
        "line-color": layerStyle.lineColor,
        "line-width": layerStyle.lineWidth,
      },
    }),
    [id, layerStyle.lineColor, layerStyle.lineWidth],
  );

  // Create filter expression for highlighting - only changes when highlight changes
  const highlightFilter: FilterSpecification = useMemo(
    () => ["==", ["get", highlightProperty], highlightValue || ""],
    [highlightProperty, highlightValue],
  );

  const highlightLayerProps: LayerProps = useMemo(
    () => ({
      id: `${id}-highlight`,
      type: "fill" as const,
      paint: {
        "fill-color": layerStyle.highlightColor,
        "fill-opacity": layerStyle.highlightOpacity,
      },
      filter: highlightFilter,
    }),
    [
      id,
      layerStyle.highlightColor,
      layerStyle.highlightOpacity,
      highlightFilter,
    ],
  );

  if (!data) return null;

  return (
    <Source id={GLOBAL_SOURCE_ID} type="geojson" data={data}>
      {showBaseFill && <Layer {...baseLayerProps} />}
      {highlightValue && <Layer {...highlightLayerProps} />}
      <Layer {...lineLayerProps} />
    </Source>
  );
}

// Memoize the entire component - only re-render when props actually change
const GeoLayer = memo(GeoLayerComponent);
export default GeoLayer;
