/**
 * Utility functions for map calculations
 */

import { bbox, center } from "@turf/turf";

import type { GeoJSONFeature, GeoJSONFeatureCollection, ViewState } from "@/types/map";
import { clampCoordinates } from "./mapConfig";

/**
 * Gets the center coordinates of a GeoJSON feature
 */
function getFeatureCenter(feature: GeoJSONFeature): [number, number] {
  try {
    const centerPoint = center(feature);
    return centerPoint.geometry.coordinates as [number, number];
  } catch (e) {
    console.error("Error calculating center:", e);
    return [0, 0];
  }
}

/**
 * Gets the bounding box of a GeoJSON feature
 */
function getFeatureBounds(
  feature: GeoJSONFeature,
): [number, number, number, number] {
  try {
    return bbox(feature) as [number, number, number, number];
  } catch (e) {
    console.error("Error calculating bounds:", e);
    return [-180, -90, 180, 90];
  }
}

/**
 * Calculates appropriate zoom level based on bounding box
 */
function calculateZoomFromBounds(
  bounds: [number, number, number, number],
  _mapWidth: number = 800,
  _mapHeight: number = 600,
): number {
  const [west, south, east, north] = bounds;

  const lonRange = Math.abs(east - west);
  const latRange = Math.abs(north - south);

  // Calculate zoom based on the larger dimension
  const maxRange = Math.max(lonRange, latRange);

  // Heuristic: smaller range = higher zoom
  // This approximation works for web mercator projection
  // https://en.wikipedia.org/wiki/Web_Mercator_projection
  let zoom = Math.log2(360 / maxRange) - 1;

  // Clamp zoom between reasonable values
  zoom = Math.max(1, Math.min(zoom, 15));

  return zoom;
}

/**
 * Creates a view state to focus on a specific feature
 */
function createViewStateForFeature(
  feature: GeoJSONFeature,
  mapWidth?: number,
  mapHeight?: number,
): ViewState {
  const [longitude, latitude] = getFeatureCenter(feature);
  const bounds = getFeatureBounds(feature);
  const zoom = calculateZoomFromBounds(bounds, mapWidth, mapHeight);

  return {
    longitude,
    latitude,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Calculate a recommended view (center + zoom) for a given focus level
 * and optional feature. This centralizes zoom heuristics so the app can
 * consistently determine how far to zoom when entering a focus mode.
 *
 * Parameters:
 * - focusedLevel: integer admin level (0 = world, 1 = country, 2 = admin2, ...)
 * - feature: optional GeoJSON feature to focus on (if omitted, returns a
 *   default world view for level 0 or no-op for deeper levels)
 * - mapWidth/mapHeight: optional viewport size to improve zoom calculation
 */
export function calculateViewForFocus(
  focusedLevel: number,
  feature?: GeoJSONFeature | null,
  mapWidth?: number,
  mapHeight?: number,
): ViewState {
  // Default world view
  const WORLD_VIEW: ViewState = {
    longitude: 0,
    latitude: 20,
    zoom: 2,
    pitch: 0,
    bearing: 0,
  };

  // If no feature provided, return world view for level 0
  if (!feature) {
    if (focusedLevel === 0) return WORLD_VIEW;
    // For deeper levels without a feature, fallback to world view as a safe default
    return WORLD_VIEW;
  }

  // Compute a base view from the feature bounds/center
  const baseView = createViewStateForFeature(feature, mapWidth, mapHeight);

  // Level-based clamps to ensure the zoom feels appropriate for the level
  const levelClamps: Record<number, { min: number; max: number }> = {
    0: { min: 1, max: 4 },
    1: { min: 3, max: 8 },
    2: { min: 6, max: 12 },
    3: { min: 8, max: 14 },
    4: { min: 10, max: 15 },
  };

  const clamp = levelClamps[focusedLevel] ?? { min: 3, max: 12 };

  // Apply clamp to the computed zoom
  const zoom = Math.max(clamp.min, Math.min(baseView.zoom, clamp.max));

  return {
    longitude: baseView.longitude,
    latitude: baseView.latitude,
    zoom,
    pitch: 0,
    bearing: 0,
  };
}

/**
 * Calculates optimal bounds for a GeoJSON FeatureCollection with antimeridian handling
 * Returns bounds that can be passed to map.fitBounds()
 */
export function calculateFitBounds(
  data: GeoJSONFeatureCollection,
  padding: number = 0.05
): [[number, number], [number, number]] {
  let [minLng, minLat, maxLng, maxLat] = bbox(data) as [number, number, number, number];

  // Handle antimeridian crossing (e.g., Russia, Fiji)
  if (maxLng - minLng > 180) {
    const mainFeatures = data.features.filter((f: any) => {
      try {
        const fb = bbox(f) as [number, number, number, number];
        if (fb[2] - fb[0] > 180) return false;
        const centerLng = (fb[0] + fb[2]) / 2;
        return centerLng > -130 && centerLng < 170;
      } catch {
        return false;
      }
    });
    if (mainFeatures.length) {
      [minLng, minLat, maxLng, maxLat] = bbox({ 
        type: "FeatureCollection", 
        features: mainFeatures 
      }) as [number, number, number, number];
    }
  }

  // Apply padding as percentage of range
  const lngPad = (maxLng - minLng) * padding;
  const latPad = (maxLat - minLat) * padding;
  const [cMinLng, cMinLat] = clampCoordinates(minLng - lngPad, minLat - latPad);
  const [cMaxLng, cMaxLat] = clampCoordinates(maxLng + lngPad, maxLat + latPad);

  return [[cMinLng, cMinLat], [cMaxLng, cMaxLat]];
}
