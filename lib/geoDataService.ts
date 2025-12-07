/**
 * Service for loading and managing geographic data (LEGACY)
 * 
 * This file is now used as a fallback by geoDataProvider.ts
 * Handles TopoJSON to GeoJSON conversion and caching
 */

import { feature } from "topojson-client";
import type { GeometryObject, Topology } from "topojson-specification";

import type { GeoJSONFeatureCollection } from "@/types/map";
import { fixAntimeridianCrossing } from "./geoUtils";
import { BASE_PATH } from "@/const";

// In-memory cache for loaded geographic data
const geoCache = new Map<
  string,
  { data: GeoJSONFeatureCollection; loadedAt: number }
>();

/**
 * Base paths for geographic data files
 */
export const GEO_PATHS = {
  worldLow: () => `${BASE_PATH}/geo/world-110m.json`,
  worldMedium: () => `${BASE_PATH}/geo/world-50m.json`,
  adminByCountry: (countryName: string) => {
    const filename = countryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `${BASE_PATH}/geo/admin-by-country/${filename}-admin.json`;
  },
} as const;

/**
 * Normalize raw data: convert TopoJSON to GeoJSON if needed,
 * fix antimeridian, and clean properties to minimal format.
 * Used by both backend responses and local file fallback.
 */
export function normalizeGeoData(rawData: any): GeoJSONFeatureCollection {
  let geoData: any = rawData;

  // Convert TopoJSON to GeoJSON if necessary
  if (geoData && geoData.type === "Topology") {
    const topology = geoData as Topology;
    const objectKeys = Object.keys(topology.objects || {});
    
    if (objectKeys.length === 0) {
      throw new Error("TopoJSON has no objects");
    }
    
    const firstObjectKey = objectKeys[0];
    if (!firstObjectKey) {
      throw new Error("No valid object key found in TopoJSON");
    }
    
    const firstObject = topology.objects[firstObjectKey];
    if (!firstObject) {
      throw new Error(`TopoJSON object "${firstObjectKey}" is undefined`);
    }
    
    geoData = feature(
      topology,
      firstObject as GeometryObject
    ) as unknown as GeoJSONFeatureCollection;
  } else if (geoData && geoData.type === "FeatureCollection") {
    geoData = geoData as GeoJSONFeatureCollection;
  } else {
    throw new Error("Input data is not a valid GeoJSON or TopoJSON object.");
  }

  // Fix antimeridian crossing
  geoData = fixAntimeridianCrossing(geoData);

  // Normalize properties: keep only name and geometry, add sequential IDs
  const cleanedFeatures = geoData.features.map((feat: any, i: number) => {
    const props = feat.properties || {};
    const name =
      props.name ||
      props.name_en ||
      props.NAME ||
      props.admin ||
      props.NAME_EN ||
      props.name_long ||
      props.brk_name ||
      props.formal_en ||
      props.gn_name ||
      "Unknown";

    return {
      type: feat.type,
      id: typeof feat.id === "number" || typeof feat.id === "string" ? feat.id : i,
      geometry: feat.geometry,
      properties: { name },
    };
  });

  return {
    type: "FeatureCollection",
    features: cleanedFeatures,
  } as GeoJSONFeatureCollection;
}

/**
 * Loads and parses a TopoJSON file, converting it to GeoJSON FeatureCollection
 */
export async function loadTopoJSON(
  path: string,
): Promise<GeoJSONFeatureCollection> {
  // Check cache first
  const cached = geoCache.get(path);
  if (cached) {
    return cached.data;
  }

  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const rawData = await response.json();
  const geoJSON = normalizeGeoData(rawData);

  // Cache the result
  geoCache.set(path, {
    data: geoJSON,
    loadedAt: Date.now(),
  });

  return geoJSON;
}

export async function loadWorldMap(): Promise<GeoJSONFeatureCollection> {
  try {
    return await loadTopoJSON(GEO_PATHS.worldLow());
  } catch (_error) {
    console.warn(
      "[GeoDataService] world-110m.json not found, trying world-50m.json",
    );
    return loadTopoJSON(GEO_PATHS.worldMedium());
  }
}

export async function loadAdminBoundaries(
  countryName: string,
): Promise<GeoJSONFeatureCollection | null> {
  const path = GEO_PATHS.adminByCountry(countryName);

  try {
    return await loadTopoJSON(path);
  } catch (_error) {
    console.warn(
      `[GeoDataService] No admin boundaries found for ${countryName}`,
    );
    return null;
  }
}

export function clearCache(): void {
  geoCache.clear();
}

export function getCacheStats() {
  return {
    size: geoCache.size,
    entries: Array.from(geoCache.entries()).map(([key, value]) => ({
      path: key,
      featureCount: value.data.features.length,
      loadedAt: new Date(value.loadedAt).toISOString(),
    })),
  };
}
