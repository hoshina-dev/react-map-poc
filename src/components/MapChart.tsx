"use client";
import React, { useEffect, useState } from "react";
import { Box, Text, Center, Loader, Button, Badge, Group } from "@mantine/core";
import { getCentroid, estimateScaleFromBounds, getBounds } from "../lib/mapUtils";
import { loadWorldMap, loadCountryDetail, loadAdminBoundariesForCountry } from "../lib/geoDataService";
import WorldMapRenderer from "./WorldMapRenderer";
import AdminBoundariesRenderer from "./AdminBoundariesRenderer";

export default function MapChart() {
  const [geoData, setGeoData] = useState<CountriesCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projCenter, setProjCenter] = useState<[number, number]>([0, 0]);
  const [zoom, setZoom] = useState<number>(1);
  const [focusedCountry, setFocusedCountry] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [useAdminBoundaries, setUseAdminBoundaries] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        // Reset focus mode when switching data sources
        setIsFocusMode(false);
        setFocusedCountry(null);
        setProjCenter([0, 0]);
        setZoom(1);
        
        // Always load world map initially - admin boundaries are loaded on-demand per country
        const path = '/geo/world-110m.json';
        
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const topoData = await response.json();
        
        // Convert TopoJSON to GeoJSON
        const objectKey = Object.keys(topoData.objects)[0];
        const { feature } = await import('topojson-client');
        const geoJSON = feature(topoData, topoData.objects[objectKey]) as CountriesCollection;
        
        if (mounted) {
          setGeoData(geoJSON);
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
  }, [useAdminBoundaries]);

  // Keyboard controls for zoom
  useEffect(() => {
    function handleKeyPress(e: KeyboardEvent) {
      if (e.key === '+' || e.key === '=') {
        setZoom(prev => Math.min(prev * 1.2, 20));
      } else if (e.key === '-' || e.key === '_') {
        setZoom(prev => Math.max(prev / 1.2, 1));
      }
    }

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
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
    const featureName = geo.properties?.name || geo.properties?.admin;
    if (!featureName) return;

    try {
      const center = getCentroid(geo);
      const bounds = getBounds(geo);
      const scale = estimateScaleFromBounds(bounds);
      const zoomFactor = scale / 140;
      
      // Enter focus mode
      setIsFocusMode(true);
      setFocusedCountry(featureName);
      setProjCenter(center);
      setZoom(zoomFactor);

      setLoadingDetail(true);
      try {
        if (useAdminBoundaries) {
          // Load admin boundaries for the specific country
          const countryName = geo.properties?.admin || featureName;
          const adminData = await loadAdminBoundariesForCountry(countryName);
          if (adminData) {
            setGeoData(adminData);
          }
        } else {
          // Load detailed country data in world map mode
          const detailData = await loadCountryDetail(featureName);
          setGeoData(detailData);
        }
      } catch (err) {
        console.warn(`Failed to load detail for ${featureName}:`, err);
      } finally {
        setLoadingDetail(false);
      }
    } catch (e) {
      console.error('Error focusing feature:', e);
    }
  }

  async function exitFocusMode() {
    setIsFocusMode(false);
    setFocusedCountry(null);
    setProjCenter([0, 0]);
    setZoom(1);
    setLoadingDetail(true);
    
    // Reload world map when exiting focus
    try {
      const path = '/geo/world-110m.json';
      
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const topoData = await response.json();
      
      const objectKey = Object.keys(topoData.objects)[0];
      const { feature } = await import('topojson-client');
      const geoJSON = feature(topoData, topoData.objects[objectKey]) as CountriesCollection;
      
      setGeoData(geoJSON);
    } catch (err) {
      console.error("Failed to reload map:", err);
    } finally {
      setLoadingDetail(false);
    }
  }

  return (
    <Box style={{ width: "100%", maxWidth: 900, margin: "0 auto" }}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          {isFocusMode && focusedCountry && (
            <Badge size="lg" color="blue" variant="filled">
              Focusing: {focusedCountry}
            </Badge>
          )}
          {loadingDetail && (
            <Badge size="sm" color="gray" variant="light">
              Loading details...
            </Badge>
          )}
          <Text size="xs" c="dimmed">
            Zoom: {zoom.toFixed(1)}x | Use +/- keys to zoom
          </Text>
        </Group>
        <Group gap="xs">
          <Button 
            onClick={() => setUseAdminBoundaries(!useAdminBoundaries)} 
            size="xs" 
            variant="default"
            color={useAdminBoundaries ? "green" : "gray"}
          >
            {useAdminBoundaries ? "Admin Boundaries (10m)" : "World (110m)"}
          </Button>
          {isFocusMode && (
            <Button onClick={exitFocusMode} size="xs" variant="light">
              Exit Focus Mode
            </Button>
          )}
        </Group>
      </Group>

      {useAdminBoundaries ? (
        <AdminBoundariesRenderer
          geoData={geoData}
          projCenter={projCenter}
          zoom={zoom}
          onMoveEnd={(position) => {
            setProjCenter(position.coordinates);
            setZoom(position.zoom);
          }}
          onFeatureClick={handleCountryClick}
        />
      ) : (
        <WorldMapRenderer
          geoData={geoData}
          projCenter={projCenter}
          zoom={zoom}
          onMoveEnd={(position) => {
            setProjCenter(position.coordinates);
            setZoom(position.zoom);
          }}
          onCountryClick={handleCountryClick}
        />
      )}
    </Box>
  );
}
