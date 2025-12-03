"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { Box } from "@mantine/core";
import React, { useCallback, useEffect, useState } from "react";
import type { MapProvider } from "@/lib/mapConfig";

import { loadAdminBoundaries } from "@/lib/geoDataService";
import { clampCoordinates } from "@/lib/mapConfig";
import type { GeoJSONFeatureCollection, ViewState } from "@/types/map";
import { bbox } from "@turf/turf";

import BaseMap from "./BaseMap";
import MapInfoBar from "./MapInfoBar";

interface MapContainerProps {
  mapProvider?: MapProvider;
}

export default function MapContainer({ mapProvider }: MapContainerProps) {
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

  const [fitToBounds, setFitToBounds] = useState<
    [[number, number], [number, number]] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    console.log(
      "[MapContainer] Focus effect triggered, focusedCountry:",
      focusedCountry
    );

    if (!focusedCountry) {
      console.log("[MapContainer] No focused country, clearing boundaries");
      setAdminBoundaries(null);
      setFitToBounds(null);
      return;
    }

    async function loadCountryData() {
      console.log(`[MapContainer] Loading boundaries for: ${focusedCountry}`);
      setLoading(true);

      // Keep focusedCountry in local variable but don't pass to BaseMap yet
      const countryToLoad = focusedCountry;

      try {
        const boundaries = await loadAdminBoundaries(countryToLoad!);
        if (
          !boundaries ||
          !boundaries.features ||
          boundaries.features.length === 0
        ) {
          console.warn(`No boundaries found for ${countryToLoad}`);
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

        console.log(
          `[MapContainer] Added IDs to ${featuresWithIds.features.length} features. Sample ID:`,
          featuresWithIds.features[0]?.id
        );

        // Calculate bounding box for the country (use featuresWithIds to preserve IDs)
        let [minLng, minLat, maxLng, maxLat] = bbox(featuresWithIds);

        // Handle date line crossing (e.g., US with Alaska)
        // If longitude span > 180°, likely crosses date line
        if (maxLng - minLng > 180) {
          console.log(`${countryToLoad} crosses date line, adjusting bounds`);

          // Filter out features that cross the date line themselves
          // AND features that are far west (Alaska) or far east (Pacific territories)
          const mainFeatures = featuresWithIds.features.filter((f) => {
            try {
              const featureBbox = bbox(f);
              if (!featureBbox) return false;

              const [fMinLng, , fMaxLng] = featureBbox;

              // Exclude features that themselves cross date line (span > 180°)
              if (fMaxLng - fMinLng > 180) {
                console.log(
                  `  Excluding date-line crossing feature at [${fMinLng.toFixed(1)}, ${fMaxLng.toFixed(1)}]`
                );
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
            console.log(
              `Filtered to ${mainFeatures.length} continental features`
            );
            const mainBoundaries = {
              type: "FeatureCollection" as const,
              features: mainFeatures,
            };
            [minLng, minLat, maxLng, maxLat] = bbox(mainBoundaries);
          }
        }

        // Validate bounds
        if (
          !isFinite(minLng) ||
          !isFinite(maxLng) ||
          !isFinite(minLat) ||
          !isFinite(maxLat)
        ) {
          console.error(`Invalid bounds for ${countryToLoad}`);
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

        console.log(
          `[MapContainer] ${countryToLoad} - Bounds: [${lngDiff.toFixed(2)}° x ${latDiff.toFixed(2)}°]`
        );
        console.log(`[MapContainer] All data ready, batching state updates`);

        // Batch all state updates together - React will batch these automatically
        setAdminBoundaries(featuresWithIds);
        setFitToBounds(bounds);
        setLoading(false);

        // Clear transition lock after everything is set
        setTimeout(() => {
          console.log(
            `[MapContainer] Transition complete for ${countryToLoad}`
          );
          setIsTransitioning(false);
        }, 200);
      } catch (error) {
        console.error("Failed to load admin boundaries:", error);
        setFocusedCountry(null);
        setLoading(false);
        setIsTransitioning(false);
      }
    }

    loadCountryData();
  }, [focusedCountry]);

  const handleCountryClick = useCallback(
    (countryName: string) => {
      // Prevent clicking during transitions, loading, or when already focused
      if (focusedCountry || loading || isTransitioning) {
        console.log(
          "Already in focus mode, loading, or transitioning - ignoring click"
        );
        return;
      }
      console.log("[MapContainer] Country clicked:", countryName);
      setIsTransitioning(true);

      // First reset to world view to ensure clean state
      console.log(
        "[MapContainer] Resetting to world view before loading country"
      );
      setViewState({ longitude: 0, latitude: 20, zoom: 2 });

      // Small delay to let map reset, then load country
      setTimeout(() => {
        setFocusedCountry(countryName);
      }, 50);
    },
    [focusedCountry, loading, isTransitioning]
  );

  const handleCountryHover = useCallback((regionName: string | null) => {
    setHoveredRegion(regionName);
  }, []);

  const handleViewStateChange = useCallback((newViewState: ViewState) => {
    // Only track zoom changes for display, don't update full viewState to prevent loop
    setViewState((prev) => ({
      ...prev,
      zoom: newViewState.zoom,
    }));
  }, []);

  const exitFocusMode = useCallback(() => {
    console.log("[MapContainer] exitFocusMode called");
    console.log("[MapContainer] Current state:", {
      focusedCountry,
      hasAdminBoundaries: !!adminBoundaries,
      viewState,
    });

    // Lock transitions during exit
    setIsTransitioning(true);

    // Clear all focus mode state and reset view simultaneously
    setFocusedCountry(null);
    setHoveredRegion(null);
    setAdminBoundaries(null);
    setFitToBounds(null);
    setLoading(false);

    console.log("[MapContainer] State cleared, resetting view to world");
    setViewState({ longitude: 0, latitude: 20, zoom: 2 });

    // Clear transition lock after zoom out completes
    setTimeout(() => {
      console.log("[MapContainer] Exit transition complete");
      setIsTransitioning(false);
    }, 300);
  }, [focusedCountry, adminBoundaries, viewState]);

  return (
    <Box style={{ width: "100%", maxWidth: 1200, margin: "0 auto" }}>
      <MapInfoBar
        focusedCountry={focusedCountry}
        hoveredRegion={hoveredRegion}
        loading={loading}
        zoom={viewState.zoom}
        currentZoom={viewState.zoom}
        onExitFocus={exitFocusMode}
      />

      <BaseMap
        initialViewState={viewState}
        onCountryClick={handleCountryClick}
        onCountryHover={handleCountryHover}
        onViewStateChange={handleViewStateChange}
        focusedCountry={focusedCountry}
        adminBoundaries={adminBoundaries}
        worldCountries={worldCountries}
        fitToBounds={fitToBounds}
        mapProvider={mapProvider}
        style={{ width: "100%", height: "600px", borderRadius: "8px" }}
      />
    </Box>
  );
}
