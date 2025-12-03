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
    if (!focusedCountry) {
      setAdminBoundaries(null);
      setFitToBounds(null);
      return;
    }

    async function loadCountryData() {
      setLoading(true);
      const countryToLoad = focusedCountry;
      try {
        const boundaries = await loadAdminBoundaries(countryToLoad!);
        if (!boundaries || !boundaries.features || boundaries.features.length === 0) {
          console.warn(`No boundaries found for ${countryToLoad}`);
          setAdminBoundaries(null);
          setFitToBounds(null);
          setLoading(false);
          // Do NOT clear focusedCountry, allow user to try another country
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
        // Calculate bounding box for the country (use featuresWithIds to preserve IDs)
        let [minLng, minLat, maxLng, maxLat] = bbox(featuresWithIds);
        // Handle date line crossing (e.g., US with Alaska)
        if (maxLng - minLng > 180) {
          const mainFeatures = featuresWithIds.features.filter((f) => {
            try {
              const featureBbox = bbox(f);
              if (!featureBbox) return false;
              const [fMinLng, , fMaxLng] = featureBbox;
              if (fMaxLng - fMinLng > 180) return false;
              const centerLng = (fMinLng + fMaxLng) / 2;
              if (centerLng < -130 || centerLng > 170) return false;
              return true;
            } catch {
              return false;
            }
          });
          if (mainFeatures.length > 0) {
            const mainBoundaries = {
              type: "FeatureCollection" as const,
              features: mainFeatures,
            };
            [minLng, minLat, maxLng, maxLat] = bbox(mainBoundaries);
          }
        }
        // Validate bounds
        if (!isFinite(minLng) || !isFinite(maxLng) || !isFinite(minLat) || !isFinite(maxLat)) {
          console.error(`Invalid bounds for ${countryToLoad}`);
          setAdminBoundaries(null);
          setFitToBounds(null);
          setLoading(false);
          return;
        }
        // Set max bounds with minimal padding (5%)
        const lngDiff = maxLng - minLng;
        const latDiff = maxLat - minLat;
        const lngPadding = lngDiff * 0.05;
        const latPadding = latDiff * 0.05;
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
        setAdminBoundaries(featuresWithIds);
        setFitToBounds(bounds);
        setLoading(false);
        setTimeout(() => {
          setIsTransitioning(false);
        }, 200);
      } catch (error) {
        console.warn("Failed to load admin boundaries:", error);
        setAdminBoundaries(null);
        setFitToBounds(null);
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
        return;
      }
      setIsTransitioning(true);

      // First reset to world view to ensure clean state
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
    // Lock transitions during exit
    setIsTransitioning(true);

    // Clear all focus mode state and reset view simultaneously
    setFocusedCountry(null);
    setHoveredRegion(null);
    setAdminBoundaries(null);
    setFitToBounds(null);
    setLoading(false);
    setViewState({ longitude: 0, latitude: 20, zoom: 2 });

    // Clear transition lock after zoom out completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

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
