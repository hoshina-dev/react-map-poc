/**
 * Utility functions for map calculations
 */

import { bbox, center } from "@turf/turf";

import type { GeoJSONFeature, ViewState } from "@/types/map";

/**
 * Gets the center coordinates of a GeoJSON feature
 */
export function getFeatureCenter(feature: GeoJSONFeature): [number, number] {
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
export function getFeatureBounds(
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
export function calculateZoomFromBounds(
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
  let zoom = Math.log2(360 / maxRange) - 1;

  // Clamp zoom between reasonable values
  zoom = Math.max(1, Math.min(zoom, 15));

  return zoom;
}

/**
 * Creates a view state to focus on a specific feature
 */
export function createViewStateForFeature(
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
