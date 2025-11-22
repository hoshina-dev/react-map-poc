"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Badge, Box, Button, Center, Group, Loader, Text } from "@mantine/core";
import React, { useCallback, useEffect, useState } from "react";

import {
  clearCache,
  loadAdminBoundaries,
  loadWorldMap,
} from "@/lib/geoDataService";
import { createViewStateForFeature } from "@/lib/mapUtils";
import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  ViewState,
} from "@/types/map";

import BaseMap from "./BaseMap";

export default function MapContainer() {
  const [geoData, setGeoData] = useState<GeoJSONFeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: 0,
    latitude: 20,
    zoom: 2,
  });
  const [focusedCountry, setFocusedCountry] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [useAdminBoundaries, setUseAdminBoundaries] = useState(false);

  // Load initial world map
  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setFocusedCountry(null);
        setViewState({ longitude: 0, latitude: 20, zoom: 2 });

        const worldData = await loadWorldMap();

        if (mounted) {
          setGeoData(worldData);
        }
      } catch (err: unknown) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : String(err ?? "unknown error"),
          );
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

  const handleFeatureClick = useCallback(
    async (feature: GeoJSONFeature) => {
      const countryName = feature.properties?.name || feature.properties?.admin;
      if (!countryName) return;

      try {
        // Calculate view state to focus on the feature
        const newViewState = createViewStateForFeature(feature);
        setViewState(newViewState);
        setFocusedCountry(countryName);

        if (useAdminBoundaries) {
          setLoadingDetail(true);
          const adminData = await loadAdminBoundaries(countryName);
          if (adminData) {
            setGeoData(adminData);
          }
          setLoadingDetail(false);
        }
      } catch (e) {
        console.error("Error focusing feature:", e);
      }
    },
    [useAdminBoundaries],
  );

  const exitFocusMode = useCallback(async () => {
    setFocusedCountry(null);
    setViewState({ longitude: 0, latitude: 20, zoom: 2 });
    setLoadingDetail(true);

    try {
      const worldData = await loadWorldMap();
      setGeoData(worldData);
    } catch (err) {
      console.error("Failed to reload map:", err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const toggleAdminBoundaries = useCallback(() => {
    setUseAdminBoundaries((prev) => !prev);
    clearCache(); // Clear cache when switching modes
  }, []);

  if (loading) {
    return (
      <Center style={{ padding: 24 }}>
        <Loader />
        <Text ml="sm">Loading map…</Text>
      </Center>
    );
  }

  if (error) {
    return (
      <Box style={{ padding: 16 }}>
        <Text c="red">Error loading map: {error}</Text>
      </Box>
    );
  }

  return (
    <Box style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          {focusedCountry && (
            <Badge size="lg" color="blue" variant="filled">
              Focusing: {focusedCountry}
            </Badge>
          )}
          {loadingDetail && (
            <Badge size="sm" color="gray" variant="light">
              Loading details...
            </Badge>
          )}
          {viewState.zoom && (
            <Text size="xs" c="dimmed">
              Zoom: {viewState.zoom.toFixed(1)}x
            </Text>
          )}
        </Group>
        <Group gap="xs">
          <Button
            onClick={toggleAdminBoundaries}
            size="xs"
            variant="default"
            color={useAdminBoundaries ? "green" : "gray"}
          >
            {useAdminBoundaries ? "Admin Boundaries (10m)" : "World (110m)"}
          </Button>
          {focusedCountry && (
            <Button onClick={exitFocusMode} size="xs" variant="light">
              Exit Focus Mode
            </Button>
          )}
        </Group>
      </Group>

      <BaseMap
        initialViewState={viewState}
        geoData={geoData}
        onFeatureClick={handleFeatureClick}
        style={{ width: "100%", height: "600px", borderRadius: "8px" }}
      />
    </Box>
  );
}
