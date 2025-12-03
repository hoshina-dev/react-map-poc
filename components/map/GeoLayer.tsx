"use client";

import React, { useMemo, memo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";
import type { FilterSpecification } from "maplibre-gl";

// Layer style configuration
interface LayerStyle {
  fillColor: string;
  fillOpacity: number;
  highlightColor: string;
  highlightOpacity: number;
  lineColor: string;
  lineWidth: number;
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

interface GeoLayerProps {
  /** Unique identifier for this layer */
  id: string;
  /** GeoJSON data to render */
  data: GeoJSON.FeatureCollection | null;
  /** Property name to match for highlighting (e.g., "name", "name_en") */
  highlightProperty: string;
  /** Current value to highlight (null = no highlight) */
  highlightValue: string | null;
  /** Layer style variant */
  variant?: "default" | "country";
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
  id,
  data,
  highlightProperty,
  highlightValue,
  variant = "default",
  style: customStyle,
  showBaseFill = true,
}: GeoLayerProps) {
  // Merge default style with variant and custom overrides
  const layerStyle = useMemo(() => {
    const baseStyle = variant === "country" ? COUNTRY_STYLE : DEFAULT_STYLE;
    return { ...baseStyle, ...customStyle };
  }, [variant, customStyle]);

  // Memoize layer props to prevent re-renders
  const baseLayerProps: LayerProps = useMemo(() => ({
    id: `${id}-fill`,
    type: "fill" as const,
    paint: {
      "fill-color": layerStyle.fillColor,
      "fill-opacity": layerStyle.fillOpacity,
    },
  }), [id, layerStyle.fillColor, layerStyle.fillOpacity]);

  const lineLayerProps: LayerProps = useMemo(() => ({
    id: `${id}-line`,
    type: "line" as const,
    paint: {
      "line-color": layerStyle.lineColor,
      "line-width": layerStyle.lineWidth,
    },
  }), [id, layerStyle.lineColor, layerStyle.lineWidth]);

  // Create filter expression for highlighting - only changes when highlight changes
  const highlightFilter: FilterSpecification = useMemo(
    () => ["==", ["get", highlightProperty], highlightValue || ""],
    [highlightProperty, highlightValue]
  );

  const highlightLayerProps: LayerProps = useMemo(() => ({
    id: `${id}-highlight`,
    type: "fill" as const,
    paint: {
      "fill-color": layerStyle.highlightColor,
      "fill-opacity": layerStyle.highlightOpacity,
    },
    filter: highlightFilter,
  }), [id, layerStyle.highlightColor, layerStyle.highlightOpacity, highlightFilter]);

  if (!data) return null;

  return (
    <Source id={id} type="geojson" data={data}>
      {showBaseFill && <Layer {...baseLayerProps} />}
      {highlightValue && <Layer {...highlightLayerProps} />}
      <Layer {...lineLayerProps} />
    </Source>
  );
}

// Memoize the entire component - only re-render when props actually change
const GeoLayer = memo(GeoLayerComponent);
export default GeoLayer;

// Export types for external use
export type { GeoLayerProps, LayerStyle };
