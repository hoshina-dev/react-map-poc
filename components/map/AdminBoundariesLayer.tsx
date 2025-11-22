"use client";

import React, { useEffect, useRef, useState } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";

interface Props {
  mapRef: React.RefObject<MapRef | null>;
  adminBoundaries: any;
  onRegionHover?: (name: string | null) => void;
}

export default function AdminBoundariesLayer({
  mapRef,
  adminBoundaries,
  onRegionHover,
}: Props) {
  const [hoveredName, setHoveredName] = useState<string | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !adminBoundaries) return;

    const handleMouseMove = (e: any) => {
      const features = e.features;

      if (features && features.length > 0) {
        const feature = features[0];
        const id = feature.id;
        
        // Extract name and clean up null bytes that may be present in TopoJSON data
        const rawName = feature.properties?.name ?? feature.properties?.NAME ?? feature.properties?.admin ?? null;
        const name = rawName ? rawName.replace(/\0+$/, "").trim() : null;

        // Always update hover state and send name up
        // Use name for highlighting since IDs may not be available
        setHoveredName(name);
        onRegionHover?.(name);
        map.getCanvas().style.cursor = "pointer";
      } else {
        setHoveredName(null);
        onRegionHover?.(null);
        map.getCanvas().style.cursor = "";
      }
    };

    const handleMouseLeave = () => {
      setHoveredName(null);
      onRegionHover?.(null);
      map.getCanvas().style.cursor = "";
    };

    // Use interactive layer events to limit event handling to this layer
    map.on("mousemove", "admin-boundaries-fill", handleMouseMove);
    map.on("mouseleave", "admin-boundaries-fill", handleMouseLeave);

    return () => {
      map.off("mousemove", "admin-boundaries-fill", handleMouseMove);
      map.off("mouseleave", "admin-boundaries-fill", handleMouseLeave);
      setHoveredName(null);
    };
  }, [mapRef, adminBoundaries, onRegionHover]);

  if (!adminBoundaries) return null;

  return (
    <Source id="admin-boundaries" type="geojson" data={adminBoundaries} promoteId="id">
      <Layer id="admin-boundaries-fill" type="fill" paint={{ "fill-color": "#E6E6E6", "fill-opacity": 0.0 }} />

      {/* Highlight layer - only shows the hovered feature via filter */}
      <Layer
        id="admin-boundaries-fill-highlight"
        type="fill"
        filter={hoveredName !== null ? ["==", ["get", "name"], hoveredName] : ["==", ["get", "name"], "__none__"]}
        paint={{ "fill-color": "#4ECDC4", "fill-opacity": 0.5 }}
      />

      <Layer id="admin-boundaries-line" type="line" paint={{ "line-color": "#333", "line-width": 1.2 }} />

      <Layer
        id="admin-boundaries-line-highlight"
        type="line"
        filter={hoveredName !== null ? ["==", ["get", "name"], hoveredName] : ["==", ["get", "name"], "__none__"]}
        paint={{ "line-color": "#00B4A6", "line-width": 2.5 }}
      />
    </Source>
  );
}
