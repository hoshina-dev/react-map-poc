/**
 * geoDataService.ts
 * 
 * Manages loading and caching of TopoJSON geographic data.
 * Handles world-level base maps and country-specific detail loading.
 */

import { feature } from 'topojson-client';

// In-memory cache for loaded geographic data
const geoCache = new Map<string, GeoDataCacheEntry>();

/**
 * Base paths for geographic data files
 */
const GEO_PATHS = {
  worldLow: '/geo/world-110m.json',
  worldMedium: '/geo/world-50m.json',
  countryDetail: (countryCode: string) => `/geo/countries/${countryCode.toLowerCase()}.json`,
} as const;

/**
 * Loads and parses a TopoJSON file, converting it to GeoJSON FeatureCollection
 * 
 * @param path - Path to the TopoJSON file
 * @returns Promise resolving to GeoJSON FeatureCollection
 */
async function loadAndParseTopoJSON(path: string): Promise<CountriesCollection> {
  // Check cache first
  const cached = geoCache.get(path);
  if (cached) {
    console.log(`[GeoDataService] Cache hit: ${path}`);
    return cached.data;
  }

  console.log(`[GeoDataService] Loading: ${path}`);
  
  try {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const topoData = await response.json();

    // Convert TopoJSON to GeoJSON
    let geoJSON: CountriesCollection;

    if (topoData.type === 'Topology') {
      // TopoJSON format - need to convert
      const objectKeys = Object.keys(topoData.objects || {});
      if (objectKeys.length === 0) {
        throw new Error('TopoJSON has no objects');
      }
      
      // Use first object (typically "countries" or "land")
      const firstObject = topoData.objects[objectKeys[0]];
      geoJSON = feature(topoData, firstObject) as CountriesCollection;
    } else if (topoData.type === 'FeatureCollection') {
      // Already GeoJSON
      geoJSON = topoData as CountriesCollection;
    } else {
      throw new Error(`Unsupported data format: ${topoData.type}`);
    }

    // Cache the result
    const cacheEntry: GeoDataCacheEntry = {
      data: geoJSON,
      loadedAt: Date.now(),
      source: path,
    };
    geoCache.set(path, cacheEntry);

    console.log(`[GeoDataService] Loaded ${geoJSON.features.length} features from ${path}`);
    return geoJSON;

  } catch (error) {
    console.error(`[GeoDataService] Failed to load ${path}:`, error);
    throw error;
  }
}

/**
 * Loads the world base map (low resolution)
 * This should be called on initial app load
 */
export async function loadWorldMap(): Promise<CountriesCollection> {
  return loadAndParseTopoJSON(GEO_PATHS.worldLow);
}

/**
 * Loads a medium-resolution world map (optional fallback)
 */
export async function loadWorldMapMedium(): Promise<CountriesCollection> {
  return loadAndParseTopoJSON(GEO_PATHS.worldMedium);
}

/**
 * Loads high-detail TopoJSON for a specific country
 * Falls back to world map if country file doesn't exist
 * 
 * @param countryCode - ISO country code (e.g., "US", "FR", "JP")
 * @returns Promise resolving to detailed country data or world fallback
 */
export async function loadCountryDetail(countryCode: string): Promise<CountriesCollection> {
  const countryPath = GEO_PATHS.countryDetail(countryCode);
  
  try {
    return await loadAndParseTopoJSON(countryPath);
  } catch (error) {
    console.warn(`[GeoDataService] Country detail not found for ${countryCode}, using world map`);
    // Fallback to world map if country file doesn't exist
    return loadWorldMap();
  }
}

/**
 * Clears the geo data cache (useful for memory management)
 */
export function clearCache(): void {
  geoCache.clear();
  console.log('[GeoDataService] Cache cleared');
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
