/**
 * Service for loading and managing geographic data
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

// Antimeridian fixing is provided by `lib/geoUtils.ts` and imported above.

// `BASE_PATH` is provided by `const/index.ts` and imported above.

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

  const topoData: Topology | GeoJSONFeatureCollection = await response.json();

  // Convert TopoJSON to GeoJSON
  let geoJSON: GeoJSONFeatureCollection;

  if ("type" in topoData && topoData.type === "Topology") {
    const topology = topoData as Topology;
    const objectKeys = Object.keys(topology.objects);

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

    geoJSON = feature(
      topology,
      firstObject as GeometryObject,
    ) as unknown as GeoJSONFeatureCollection;
  } else if ("type" in topoData && topoData.type === "FeatureCollection") {
    geoJSON = topoData as GeoJSONFeatureCollection;
  } else {
    throw new Error(`Unsupported data format`);
  }

  // Fix antimeridian crossing issues (Russia, Fiji, Antarctica, etc.)
  geoJSON = fixAntimeridianCrossing(geoJSON);

  // Cache the result
  geoCache.set(path, {
    data: geoJSON,
    loadedAt: Date.now(),
  });

  return geoJSON;
}

/**
 * Loads the world base map
 */
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

/**
 * Loads admin boundaries for a specific country
 */
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

/**
 * Clears the geo data cache
 */
export function clearCache(): void {
  geoCache.clear();
}

/**
 * Gets cache statistics
 */
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
