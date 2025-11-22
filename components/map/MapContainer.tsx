"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Box } from "@mantine/core";
import React, { useCallback, useEffect, useState } from "react";

import { loadAdminBoundaries } from "@/lib/geoDataService";
import { validateCoordinates, clampCoordinates } from "@/lib/mapConfig";
import type { GeoJSONFeatureCollection, ViewState } from "@/types/map";
import { bbox } from "@turf/turf";

import BaseMap from "./BaseMap";
import MapInfoBar from "./MapInfoBar";

export default function MapContainer() {
  const [viewState, setViewState] = useState<Partial<ViewState>>({
    longitude: 0,
    latitude: 20,
    zoom: 2,
  });
  const [focusedCountry, setFocusedCountry] = useState<string | null>(null);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [adminBoundaries, setAdminBoundaries] =
    useState<GeoJSONFeatureCollection | null>(null);
  const [worldCountries, setWorldCountries] =
    useState<GeoJSONFeatureCollection | null>(null);
  const [maxBounds, setMaxBounds] = useState<
    [[number, number], [number, number]] | null
  >(null);
  const [loading, setLoading] = useState(false);

  // Load world countries for clicking
  useEffect(() => {
    async function loadWorldData() {
      try {
        const { loadWorldMap } = await import("@/lib/geoDataService");
        const countries = await loadWorldMap();
        setWorldCountries(countries);
      } catch (error) {
        console.error("Failed to load world countries:", error);
      }
    }
    loadWorldData();
  }, []);

  // Load admin boundaries when a country is focused
  useEffect(() => {
    if (!focusedCountry) {
      setAdminBoundaries(null);
      setMaxBounds(null);
      return;
    }

    async function loadCountryData() {
      setLoading(true);
      try {
        const boundaries = await loadAdminBoundaries(focusedCountry!);
        if (!boundaries || !boundaries.features || boundaries.features.length === 0) {
          console.warn(`No boundaries found for ${focusedCountry}`);
          setFocusedCountry(null);
          setLoading(false);
          return;
        }

        // Add unique IDs to features for hover state
        const featuresWithIds = {
          ...boundaries,
          features: boundaries.features.map((f, i) => ({
            ...f,
            id: i,
          })),
        };

        setAdminBoundaries(featuresWithIds);

        // Calculate bounding box for the country
        let [minLng, minLat, maxLng, maxLat] = bbox(boundaries);

        // Handle date line crossing (e.g., US with Alaska)
        // If longitude span > 180°, likely crosses date line
        if (maxLng - minLng > 180) {
          console.log(`${focusedCountry} crosses date line, adjusting bounds`);
          
          // Filter out features that cross the date line themselves
          // AND features that are far west (Alaska) or far east (Pacific territories)
          const mainFeatures = boundaries.features.filter(f => {
            try {
              const featureBbox = bbox(f);
              if (!featureBbox) return false;
              
              const [fMinLng, , fMaxLng] = featureBbox;
              
              // Exclude features that themselves cross date line (span > 180°)
              if (fMaxLng - fMinLng > 180) {
                console.log(`  Excluding date-line crossing feature at [${fMinLng.toFixed(1)}, ${fMaxLng.toFixed(1)}]`);
                return false;
              }
              
              // Exclude features in extreme west (< -130, Alaska) or east (> 170, Pacific)
              const centerLng = (fMinLng + fMaxLng) / 2;
              if (centerLng < -130 || centerLng > 170) {
                console.log(`  Excluding outlier at ${centerLng.toFixed(1)}°`);
                return false;
              }
              
              return true;
            } catch {
              return false;
            }
          });
          
          if (mainFeatures.length > 0) {
            console.log(`Filtered to ${mainFeatures.length} continental features`);
            const mainBoundaries = {
              type: 'FeatureCollection' as const,
              features: mainFeatures
            };
            [minLng, minLat, maxLng, maxLat] = bbox(mainBoundaries);
          }
        }

        // Validate bounds
        if (!isFinite(minLng) || !isFinite(maxLng) || !isFinite(minLat) || !isFinite(maxLat)) {
          console.error(`Invalid bounds for ${focusedCountry}`);
          setFocusedCountry(null);
          setLoading(false);
          return;
        }

        // Set max bounds with minimal padding (5%)
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const lngPadding = lngDiff * 0.05;
        const latPadding = latDiff * 0.05;

        // Clamp bounds to valid Web Mercator limits
        const [clampedMinLng, clampedMinLat] = clampCoordinates(
          minLng - lngPadding,
          minLat - latPadding
        );
        const [clampedMaxLng, clampedMaxLat] = clampCoordinates(
          maxLng + lngPadding,
          maxLat + latPadding
        );

        const bounds: [[number, number], [number, number]] = [
          [clampedMinLng, clampedMinLat],
          [clampedMaxLng, clampedMaxLat],
        ];

        setMaxBounds(bounds);

        // Calculate center
        const centerLng = (minLng + maxLng) / 2;
        const centerLat = (minLat + maxLat) / 2;

        // Validate center coordinates
        if (!validateCoordinates(centerLng, centerLat)) {
          console.error(`Invalid center coordinates for ${focusedCountry}: [${centerLng}, ${centerLat}]`);
          setFocusedCountry(null);
          setLoading(false);
          return;
        }

        // Calculate zoom to fit the country in the container (1200x600)
        const containerWidth = 1200;
        const containerHeight = 600;

        // Account for Web Mercator projection distortion at the latitude
        const latRad = (centerLat * Math.PI) / 180;
        const adjustedLngDiff = lngDiff / Math.cos(latRad);

        // Calculate zoom level that fits both dimensions with 15% padding
        const WORLD_DIM = { width: 360, height: 180 };
        const ZOOM_PADDING = 0.85; // 15% padding

        const zoomLng =
          Math.log2(
            (containerWidth * ZOOM_PADDING * WORLD_DIM.width) /
              (256 * adjustedLngDiff),
          ) - 1;
        const zoomLat =
          Math.log2(
            (containerHeight * ZOOM_PADDING * WORLD_DIM.height) /
              (256 * latDiff),
          ) - 1;

        // Use the smaller zoom to ensure the entire country fits
        const zoom = Math.max(2, Math.min(Math.floor(Math.min(zoomLng, zoomLat)), 15));

        console.log(`${focusedCountry} - Center: [${centerLng.toFixed(2)}, ${centerLat.toFixed(2)}], Zoom: ${zoom}`);

        setViewState({
          longitude: centerLng,
          latitude: centerLat,
          zoom,
        });
      } catch (error) {
        console.error("Failed to load admin boundaries:", error);
        setFocusedCountry(null);
      } finally {
        setLoading(false);
      }
    }

    loadCountryData();
  }, [focusedCountry]);

  const handleCountryClick = useCallback((countryName: string) => {
    // Prevent clicking another country while already in focus mode or loading
    if (focusedCountry || loading) {
      console.log("Already in focus mode or loading, ignoring click");
      return;
    }
    setFocusedCountry(countryName);
  }, [focusedCountry, loading]);

  const handleCountryHover = useCallback((regionName: string | null) => {
    setHoveredRegion(regionName);
  }, []);

  const exitFocusMode = useCallback(() => {
    // Clear all focus mode state
    setFocusedCountry(null);
    setHoveredRegion(null);
    setAdminBoundaries(null);
    setMaxBounds(null);
    setLoading(false);
    
    // Reset to world view with a slight delay to ensure state is cleared
    setTimeout(() => {
      setViewState({ longitude: 0, latitude: 20, zoom: 2 });
    }, 0);
  }, []);

  return (
    <Box style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
      <MapInfoBar
        focusedCountry={focusedCountry}
        hoveredRegion={hoveredRegion}
        loading={loading}
        zoom={viewState.zoom}
        onExitFocus={exitFocusMode}
      />
      
      <BaseMap
        initialViewState={viewState}
        onCountryClick={handleCountryClick}
        onCountryHover={handleCountryHover}
        focusedCountry={focusedCountry}
        adminBoundaries={adminBoundaries}
        worldCountries={worldCountries}
        maxBounds={maxBounds}
        style={{ width: "100%", height: "600px", borderRadius: "8px" }}
      />
    </Box>
  );
}
