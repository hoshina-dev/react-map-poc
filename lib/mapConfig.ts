/**
 * Map configuration and coordinate system utilities
 * Handles different map styles and their coordinate system requirements
 */

export type MapProvider = "osm" | "positron" | "maplibre-demo" | "mapbox";

export interface MapConfig {
  provider: MapProvider;
  style: any;
  requiresCoordinateAdjustment: boolean;
  coordinateTransform?: (lng: number, lat: number) => [number, number];
}

/**
 * OpenStreetMap Raster Style
 */
export const OSM_STYLE = {
  version: 8 as const,
  sources: {
    "osm-tiles": {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [
    {
      id: "osm-tiles",
      type: "raster" as const,
      source: "osm-tiles",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
};

/**
 * MapLibre Demo Style
 */
export const MAPLIBRE_DEMO_STYLE =
  "https://demotiles.maplibre.org/style.json";

/**
 * Carto Positron Style (clean white/light theme)
 * Used in react-map-gl examples
 */
export const CARTO_POSITRON_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

/**
 * Map provider configurations
 */
export const MAP_CONFIGS: Record<MapProvider, MapConfig> = {
  positron: {
    provider: "positron",
    style: CARTO_POSITRON_STYLE,
    requiresCoordinateAdjustment: false,
  },
  osm: {
    provider: "osm",
    style: OSM_STYLE,
    requiresCoordinateAdjustment: false,
  },
  "maplibre-demo": {
    provider: "maplibre-demo",
    style: MAPLIBRE_DEMO_STYLE,
    requiresCoordinateAdjustment: false,
  },
  mapbox: {
    provider: "mapbox",
    style: "mapbox://styles/mapbox/streets-v11",
    requiresCoordinateAdjustment: false,
  },
};

/**
 * Get map configuration by provider
 */
export function getMapConfig(provider: MapProvider = "positron"): MapConfig {
  return MAP_CONFIGS[provider];
}

/**
 * Transform coordinates if needed based on map provider
 */
export function transformCoordinates(
  lng: number,
  lat: number,
  provider: MapProvider = "positron",
): [number, number] {
  const config = MAP_CONFIGS[provider];
  
  if (config.coordinateTransform) {
    return config.coordinateTransform(lng, lat);
  }
  
  return [lng, lat];
}

/**
 * Validate coordinates are within valid Web Mercator bounds
 */
export function validateCoordinates(lng: number, lat: number): boolean {
  return (
    isFinite(lng) &&
    isFinite(lat) &&
    lng >= -180 &&
    lng <= 180 &&
    lat >= -85.0511 &&
    lat <= 85.0511
  );
}

/**
 * Clamp coordinates to valid Web Mercator bounds
 */
export function clampCoordinates(lng: number, lat: number): [number, number] {
  return [
    Math.max(-180, Math.min(180, lng)),
    Math.max(-85.0511, Math.min(85.0511, lat)),
  ];
}
