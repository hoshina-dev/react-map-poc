"use client";
import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { Box, Text, Center, Loader, Button } from "@mantine/core";
import { getCentroid, estimateScaleFromBounds, getBounds } from "../lib/mapUtils";
import { loadWorldMap } from "../lib/geoDataService";

export default function MapChart() {
  const [geoData, setGeoData] = useState<CountriesCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projCenter, setProjCenter] = useState<[number, number] | null>(null);
  const [projScale, setProjScale] = useState<number | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        const worldData = await loadWorldMap();
        if (mounted) {
          setGeoData(worldData);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(err instanceof Error ? err.message : String(err ?? "unknown error"));
        }
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

  if (!geoData) return null;

  function handleCountryClick(geo: any) {
    try {
      const center = getCentroid(geo);
      const bounds = getBounds(geo);
      const scale = estimateScaleFromBounds(bounds);
      setProjCenter(center);
      setProjScale(scale);
    } catch (e) {
      // ignore
    }
  }

  function resetZoom() {
    setProjCenter(null);
    setProjScale(undefined);
  }

  return (
    <Box style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button onClick={resetZoom} size="xs">
          Reset zoom
        </Button>
      </div>

      <ComposableMap
        width={900}
        height={450}
        projectionConfig={{ ...(projCenter ? { center: projCenter } : {}), scale: projScale ?? 140 }}
      >
        <Geographies geography={geoData}>
          {({ geographies }: { geographies: Array<Record<string, unknown>> }) =>
            geographies.map((geo: any, i: number) => {
              const rsmKey = (geo as { rsmKey?: string }).rsmKey ?? i;
              return (
                <Geography
                  key={String(rsmKey)}
                  geography={geo}
                  onClick={() => handleCountryClick(geo)}
                  style={{
                    default: { outline: "none", fill: "#E6E6E6", stroke: "#DDD", cursor: "pointer" },
                    hover: { fill: "#8ED1C6", outline: "none", cursor: "pointer" },
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
