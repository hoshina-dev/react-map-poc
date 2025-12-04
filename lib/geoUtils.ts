/**
 * Shared geographic utilities used by runtime code.
 * Extracted from `geoDataService` so logic can be reused and tested.
 */
import type { GeoJSONFeature, GeoJSONFeatureCollection } from "@/types/map";

function getLngsFromRing(ring: [number, number][]) {
  return ring.map((c) => c[0]);
}

export function featureCrossesAntimeridian(feature: GeoJSONFeature | null): boolean {
  if (!feature || !feature.geometry) return false;
  const geom = feature.geometry;

  const polygons: any[] = [];
  if (geom.type === "Polygon") polygons.push(geom.coordinates);
  else if (geom.type === "MultiPolygon") polygons.push(...geom.coordinates);
  else return false;

  for (const poly of polygons) {
    const ring = poly[0];
    if (!ring) continue;
    const lngs = getLngsFromRing(ring as [number, number][]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (maxLng - minLng > 180) return true;
  }

  return false;
}

export function fixAntimeridianCrossing(
  geoJSON: GeoJSONFeatureCollection,
): GeoJSONFeatureCollection {
  if (!geoJSON || !Array.isArray(geoJSON.features)) return geoJSON;

  const fixedFeatures = geoJSON.features.map((feature) => {
    const geometry = feature.geometry;
    if (!geometry) return feature;

    let polygons: any[] = [];
    let isMulti = false;
    if (geometry.type === "Polygon") polygons = [geometry.coordinates];
    else if (geometry.type === "MultiPolygon") {
      polygons = geometry.coordinates;
      isMulti = true;
    } else return feature;

    let hasIssue = false;
    const fixedPolygons = polygons.map((polygon) =>
      polygon.map((ring: [number, number][]) => {
        const lngs = getLngsFromRing(ring);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        if (maxLng - minLng > 180) {
          hasIssue = true;
          return ring.map((coord) => {
            if (coord[0] < 0) return [coord[0] + 360, coord[1]] as [number, number];
            return coord as [number, number];
          });
        }
        return ring as [number, number][];
      }),
    );

    if (!hasIssue) return feature;

    const fixedGeometry = isMulti
      ? { type: "MultiPolygon", coordinates: fixedPolygons }
      : { type: "Polygon", coordinates: fixedPolygons[0] };

    return {
      ...feature,
      geometry: fixedGeometry as any,
    };
  });

  return {
    ...geoJSON,
    features: fixedFeatures,
  } as GeoJSONFeatureCollection;
}
