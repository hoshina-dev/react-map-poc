"use client";
import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Box, Text, Center, Loader } from "@mantine/core";
import { feature as topoFeature } from "topojson-client";

const localGeo = "/features.json"; // local demo file in public/


export default function MapChart() {
  const [geoData, setGeoData] = useState<unknown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(localGeo);
   
        if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
        const data = await res.json();

        // If TopoJSON, convert to GeoJSON FeatureCollection
        if (data && data.type === "Topology") {
          const objectKeys = Object.keys(data.objects || {});
          if (objectKeys.length === 0) throw new Error("TopoJSON has no objects");
          const first = data.objects[objectKeys[0]];
          const geo = topoFeature(data, first);
          if (mounted) setGeoData(geo);
        } else if (data && (data.type === "FeatureCollection" || data.type === "Feature")) {
          if (mounted) setGeoData(data);
        } else {
          throw new Error("Unsupported geo data format");
        }
      } catch (err: unknown) {
        if (mounted)
          setError(err instanceof Error ? err.message : String(err ?? "unknown error"));
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading)
    return (
      <Center style={{ padding: 24 }}>
        <Loader />
        <Text ml="sm">Loading map…</Text>
      </Center>
    );

  if (error)
    return (
      <Box style={{ padding: 16 }}>
        <Text c="red">There was a problem when fetching the map data: {error}</Text>
      </Box>
    );

  return (
    <Box style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <ComposableMap width={900} height={450} projectionConfig={{ scale: 140 }}>
        <Geographies geography={geoData as Record<string, unknown>}>
          {({ geographies }: { geographies: Array<Record<string, unknown>> }) =>
            geographies.map((geo: Record<string, unknown>, i: number) => {
              const rsmKey = (geo as { rsmKey?: string }).rsmKey ?? i;
              return (
                <Geography
                  key={String(rsmKey)}
                  geography={geo as Record<string, unknown>}
                  style={{
                    default: { outline: "none", fill: "#E6E6E6", stroke: "#DDD" },
                    hover: { fill: "#8ED1C6", outline: "none" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </Box>
  );
}
