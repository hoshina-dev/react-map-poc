import { geoCentroid, geoBounds } from 'd3-geo';

export function getCentroid(feature: any): [number, number] {
  // returns [longitude, latitude]
  try {
    const c = geoCentroid(feature as any);
    return [c[0] ?? 0, c[1] ?? 0];
  } catch (e) {
    return [0, 0];
  }
}

export function estimateScaleFromBounds(bounds: [[number, number], [number, number]]): number {
  // bounds: [[minLon,minLat],[maxLon,maxLat]]
  try {
    const lonRange = Math.abs((bounds[1][0] ?? 0) - (bounds[0][0] ?? 0)) || 1;
    const latRange = Math.abs((bounds[1][1] ?? 0) - (bounds[0][1] ?? 0)) || 1;
    const maxRange = Math.max(lonRange, latRange);
    // Heuristic mapping: smaller geographic ranges -> larger scale (zoom in),
    // while very large ranges (whole world) result in smaller scale (zoom out).
    // Use a constant so that when maxRange ~= 360 (world) we get the default 140.
    const WORLD_BASE = 50400; // 140 * 360
    const raw = Math.round(WORLD_BASE / Math.max(maxRange, 0.0001));
    const scale = Math.max(50, Math.min(2000, raw));
    return scale;
  } catch (e) {
    return 140;
  }
}

export function getBounds(feature: any): [[number, number], [number, number]] {
  try {
    return geoBounds(feature as any) as [[number, number], [number, number]];
  } catch (e) {
    return [[-180, -90], [180, 90]];
  }
}
