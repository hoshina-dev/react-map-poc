"use client";

import React, { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { LayerProps } from "react-map-gl/maplibre";

interface Props {
  adminBoundaries: any;
  hoveredProvince: string | null;
}

// Base layer style for all states/provinces
const baseLayer: LayerProps = {
  id: "admin-boundaries-fill",
  type: "fill",
  paint: {
    "fill-color": "#E6E6E6",
    "fill-opacity": 0.6,
  },
};

// Highlight layer style (shown only when hovering)
const highlightLayer: LayerProps = {
  id: "admin-boundaries-fill-highlight",
  type: "fill",
  paint: {
    "fill-color": "#4ECDC4",
    "fill-opacity": 0.8,
  },
};

// Border layer
const lineLayer: LayerProps = {
  id: "admin-boundaries-line",
  type: "line",
  paint: {
    "line-color": "#333",
    "line-width": 1,
  },
};

const AdminBoundariesLayer = ({ adminBoundaries, hoveredProvince }: Props) => {
  const filter: ["in", string, string] = useMemo(
    () => ["in", "name_en", hoveredProvince || ""],
    [hoveredProvince]
  );

  if (!adminBoundaries) return null;

  console.log(
    "[AdminBoundariesLayer] Rendering with hoveredProvince:",
    hoveredProvince,
    "filter:",
    filter
  );

  return (
    <Source id="admin-boundaries" type="geojson" data={adminBoundaries}>
      <Layer {...baseLayer} />
      <Layer
        id="admin-boundaries-fill-highlight"
        type="fill"
        paint={{
          "fill-color": "#4ECDC4",
          "fill-opacity": 0.8,
        }}
        filter={filter}
      />
      <Layer {...lineLayer} />
    </Source>
  );
};

AdminBoundariesLayer.displayName = "AdminBoundariesLayer";

export default AdminBoundariesLayer;
