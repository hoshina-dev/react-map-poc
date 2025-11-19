"use client";
import React from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

interface WorldMapRendererProps {
  geoData: CountriesCollection;
  projCenter: [number, number];
  zoom: number;
  onMoveEnd: (position: { coordinates: [number, number]; zoom: number }) => void;
  onCountryClick: (geo: any) => void;
}

export default function WorldMapRenderer({
  geoData,
  projCenter,
  zoom,
  onMoveEnd,
  onCountryClick,
}: WorldMapRendererProps) {
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
              
              return (
                <Geography
                  key={String(rsmKey)}
                  geography={geo}
                  onClick={() => onCountryClick(geo)}
                  style={{
                    default: { 
                      outline: "none", 
                      fill: "#E6E6E6", 
                      stroke: "#DDD",
                      strokeWidth: 0.5,
                      cursor: "pointer",
                      pointerEvents: "all",
                    },
                    hover: { 
                      fill: "#8ED1C6", 
                      outline: "none", 
                      cursor: "pointer",
                      stroke: "#AAA",
                      strokeWidth: 0.5,
                    },
                    pressed: { 
                      outline: "none",
                      fill: "#6BB5A8",
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
