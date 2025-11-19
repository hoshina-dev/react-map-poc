"use client";
import React, { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";
import { Box, Text, Center, Loader, Button } from "@mantine/core";
import { getCentroid, estimateScaleFromBounds, getBounds } from "../lib/mapUtils";
import { loadWorldMap, loadCountryDetail, getCountryCode } from "../lib/geoDataService";

export default function MapChart() {
  const [geoData, setGeoData] = useState<CountriesCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projCenter, setProjCenter] = useState<[number, number]>([0, 0]);
  const [projScale, setProjScale] = useState<number>(140);
  const [zoom, setZoom] = useState<number>(1);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

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

  async function handleCountryClick(geo: any) {
    try {
      const center = getCentroid(geo);
      const bounds = getBounds(geo);
      const scale = estimateScaleFromBounds(bounds);
      
      // Calculate zoom factor based on the scale
      const zoomFactor = scale / 140; // 140 is default world scale
      
      setProjCenter(center);
      setProjScale(scale);
      setZoom(zoomFactor);

      // Load detailed TopoJSON when zooming into a country (threshold: zoom > 3)
      if (zoomFactor > 3) {
        const countryCode = getCountryCode(geo);
        if (countryCode && countryCode !== selectedCountry) {
          setSelectedCountry(countryCode);
          setLoadingDetail(true);
          try {
            const detailData = await loadCountryDetail(countryCode);
            setGeoData(detailData);
          } catch (err) {
            console.warn(`Failed to load detail for ${countryCode}:`, err);
            // Keep using world data as fallback
          } finally {
            setLoadingDetail(false);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }

  async function resetZoom() {
    setProjCenter([0, 0]);
    setProjScale(140);
    setZoom(1);
    setSelectedCountry(null);
    
    // Reload world map data
    try {
      const worldData = await loadWorldMap();
      setGeoData(worldData);
    } catch (err) {
      console.error("Failed to reload world map:", err);
    }
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
        projection="geoMercator"
      >
        <ZoomableGroup
          center={projCenter}
          zoom={zoom}
          minZoom={1}
          maxZoom={20}
          onMoveEnd={(position) => {
            setProjCenter(position.coordinates);
            setZoom(position.zoom);
          }}
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
        </ZoomableGroup>
      </ComposableMap>
    </Box>
  );
}
