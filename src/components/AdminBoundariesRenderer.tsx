"use client";
import React from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

interface AdminBoundariesRendererProps {
  geoData: CountriesCollection;
  projCenter: [number, number];
  zoom: number;
  onMoveEnd: (position: { coordinates: [number, number]; zoom: number }) => void;
  onFeatureClick: (geo: any) => void;
}

export default function AdminBoundariesRenderer({
  geoData,
  projCenter,
  zoom,
  onMoveEnd,
  onFeatureClick,
}: AdminBoundariesRendererProps) {
  return (
    <ComposableMap
      width={900}
      height={450}
      projection="geoMercator"
    >
      <ZoomableGroup
        center={projCenter}
        zoom={zoom}
        minZoom={1}
        maxZoom={20}
        onMoveEnd={onMoveEnd}
      >
        <Geographies geography={geoData}>
          {({ geographies }: { geographies: Array<Record<string, unknown>> }) =>
            geographies.map((geo: any, i: number) => {
              const rsmKey = (geo as { rsmKey?: string }).rsmKey ?? i;
              
              // Filter out Antarctica, ocean boundaries, and features without proper names
              const name = geo.properties?.name?.trim().replace(/\0/g, '') || "";
              const admin = geo.properties?.admin?.trim().replace(/\0/g, '') || "";
              const isInteractive = name.length > 0 && admin !== "Antarctica";
              
              return (
                <Geography
                  key={String(rsmKey)}
                  geography={geo}
                  onClick={() => isInteractive && onFeatureClick(geo)}
                  style={{
                    default: { 
                      outline: "none", 
                      fill: "#F5F5F5", 
                      stroke: "#999",
                      strokeWidth: 0.3,
                      cursor: isInteractive ? "pointer" : "default",
                      pointerEvents: isInteractive ? "all" : "none",
                    },
                    hover: { 
                      fill: isInteractive ? "#8ED1C6" : "#F5F5F5", 
                      outline: "none", 
                      cursor: isInteractive ? "pointer" : "default",
                      stroke: "#666",
                      strokeWidth: 0.5,
                    },
                    pressed: { 
                      outline: "none",
                      fill: isInteractive ? "#6BB5A8" : "#F5F5F5",
                    },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ZoomableGroup>
    </ComposableMap>
  );
}
