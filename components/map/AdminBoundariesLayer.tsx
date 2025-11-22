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
  const [hoveredId, setHoveredId] = useState<string | number | null>(null);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !adminBoundaries) return;

    // Debug: show basic info about loaded adminBoundaries
    console.log("📦 AdminBoundariesLayer mounted:", {
      featureCount: adminBoundaries?.features?.length || 0,
      firstFeatureId: adminBoundaries?.features?.[0]?.id,
      firstFeatureName: adminBoundaries?.features?.[0]?.properties?.name?.substring(0, 20),
    });

    const handleMouseMove = (e: any) => {
      const features = e.features;
      console.log("🔍 AdminBoundariesLayer HOVER:", {
        hasFeatures: !!features,
        featureCount: features?.length || 0,
      });

      if (features && features.length > 0) {
        const feature = features[0];
        const id = feature.id;
        
        // Extract name and clean up null bytes that may be present in TopoJSON data
        const rawName = feature.properties?.name ?? feature.properties?.NAME ?? feature.properties?.admin ?? null;
        const name = rawName ? rawName.replace(/\0+$/, "").trim() : null;
        
        console.log("🏷️ Province Name Extracted:", {
          id,
          rawName: rawName ? `"${rawName}"` : null,
          cleanedName: name ? `"${name}"` : null,
          allProperties: Object.keys(feature.properties || {}),
        });

        // Always update hover state and send name up, even if ID is undefined
        // The ID will be used for highlighting if available
        if (id !== undefined && id !== null) {
          setHoveredId(id);
        }
        onRegionHover?.(name);
        map.getCanvas().style.cursor = "pointer";
      } else {
        setHoveredId(null);
        onRegionHover?.(null);
        map.getCanvas().style.cursor = "";
      }
    };

    const handleMouseLeave = () => {
      setHoveredId(null);
      onRegionHover?.(null);
      map.getCanvas().style.cursor = "";
    };

    // Use interactive layer events to limit event handling to this layer
    map.on("mousemove", "admin-boundaries-fill", handleMouseMove);
    map.on("mouseleave", "admin-boundaries-fill", handleMouseLeave);

    return () => {
      map.off("mousemove", "admin-boundaries-fill", handleMouseMove);
      map.off("mouseleave", "admin-boundaries-fill", handleMouseLeave);
      setHoveredId(null);
    };
  }, [mapRef, adminBoundaries, onRegionHover]);

  if (!adminBoundaries) return null;

  return (
    <Source id="admin-boundaries" type="geojson" data={adminBoundaries} promoteId="id">
      <Layer id="admin-boundaries-fill" type="fill" paint={{ "fill-color": "#E6E6E6", "fill-opacity": 0.7 }} />

      {/* Highlight layer - only shows the hovered feature via filter */}
      <Layer
        id="admin-boundaries-fill-highlight"
        type="fill"
        filter={hoveredId !== null ? ["==", ["get", "id"], hoveredId] : ["==", ["get", "id"], "__none__"]}
        paint={{ "fill-color": "#4A90E2", "fill-opacity": 0.85 }}
      />

      <Layer id="admin-boundaries-line" type="line" paint={{ "line-color": "#333", "line-width": 1.2 }} />

      <Layer
        id="admin-boundaries-line-highlight"
        type="line"
        filter={hoveredId !== null ? ["==", ["get", "id"], hoveredId] : ["==", ["get", "id"], "__none__"]}
        paint={{ "line-color": "#1F5FA6", "line-width": 2.5 }}
      />
    </Source>
  );
}
