/**
 * Service for loading and managing geographic data
 * Handles TopoJSON to GeoJSON conversion and caching
 */

import { feature } from "topojson-client";
import type { Topology, GeometryObject } from "topojson-specification";

import type { GeoJSONFeatureCollection, GeoJSONFeature } from "@/types/map";

// In-memory cache for loaded geographic data
const geoCache = new Map<
  string,
  { data: GeoJSONFeatureCollection; loadedAt: number }
>();

/**
 * Fixes antimeridian crossing issues in GeoJSON features.
 * Features that cross the antimeridian (180°/-180° line) need to be
 * split into multiple polygons to render correctly on web maps.
 * 
 * This function shifts coordinates that are on the "wrong side" of the
 * antimeridian by adding 360° to negative longitudes when needed.
 */
function fixAntimeridianCrossing(geoJSON: GeoJSONFeatureCollection): GeoJSONFeatureCollection {
  const fixedFeatures = geoJSON.features.map((feature: GeoJSONFeature) => {
    const geometry = feature.geometry;
    if (!geometry) return feature;

    // Type for coordinate arrays
    type Ring = [number, number][];
    type Polygon = Ring[];
    type MultiPolygon = Polygon[];

    let polygons: Polygon[] = [];
    let isMultiPolygon = false;

    if (geometry.type === 'Polygon') {
      polygons = [geometry.coordinates as Polygon];
    } else if (geometry.type === 'MultiPolygon') {
      polygons = geometry.coordinates as MultiPolygon;
      isMultiPolygon = true;
    } else {
      return feature;
    }

    let hasAntimeridianIssue = false;
    const fixedPolygons: Polygon[] = polygons.map(polygon => {
      return polygon.map(ring => {
        // Check if this ring crosses the antimeridian
        const lngs = ring.map(coord => coord[0]);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        
        // If the ring spans more than 180 degrees, it crosses the antimeridian
        if (maxLng - minLng > 180) {
          hasAntimeridianIssue = true;
          // Shift negative longitudes to be > 180
          return ring.map(coord => {
            if (coord[0] < 0) {
              return [coord[0] + 360, coord[1]] as [number, number];
            }
            return coord;
          });
        }
        return ring;
      });
    });

    if (!hasAntimeridianIssue) {
      return feature;
    }

    // Create the fixed geometry
    const fixedGeometry = isMultiPolygon
      ? { type: 'MultiPolygon' as const, coordinates: fixedPolygons }
      : { type: 'Polygon' as const, coordinates: fixedPolygons[0]! };

    return {
      ...feature,
      geometry: fixedGeometry,
    };
  });

  return {
    ...geoJSON,
    features: fixedFeatures,
  } as GeoJSONFeatureCollection;
}

/**
 * Base paths for geographic data files
 */
export const GEO_PATHS = {
  worldLow: "/geo/world-110m.json",
  worldMedium: "/geo/world-50m.json",
  adminByCountry: (countryName: string) => {
    const filename = countryName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return `/geo/admin-by-country/${filename}-admin.json`;
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
    
    geoJSON = feature(topology, firstObject as GeometryObject) as unknown as GeoJSONFeatureCollection;
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
    return await loadTopoJSON(GEO_PATHS.worldLow);
  } catch (_error) {
    console.warn(
      "[GeoDataService] world-110m.json not found, trying world-50m.json",
    );
    return loadTopoJSON(GEO_PATHS.worldMedium);
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
