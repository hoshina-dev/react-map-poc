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
}

/**
 * Loads the world base map with fallback support
 * Tries world-110m.json first, falls back to world-50m.json
 * This should be called on initial app load
 */
export async function loadWorldMap(): Promise<CountriesCollection> {
  try {
    return await loadAndParseTopoJSON(GEO_PATHS.worldLow);
  } catch (error) {
    console.warn('[GeoDataService] world-110m.json not found, trying world-50m.json fallback');
    return loadAndParseTopoJSON(GEO_PATHS.worldMedium);
  }
}

/**
 * Loads a medium-resolution world map (optional fallback)
 */
export async function loadWorldMapMedium(): Promise<CountriesCollection> {
  return loadAndParseTopoJSON(GEO_PATHS.worldMedium);
}

/**
 * Loads high-detail TopoJSON for a specific country
 * Smart fallback: tries local file first, then filters from world map
 * 
 * @param countryCode - ISO country code (e.g., "US", "FR", "JP")
 * @returns Promise resolving to detailed country data or filtered world data
 */
export async function loadCountryDetail(countryCode: string): Promise<CountriesCollection> {
  const countryPath = GEO_PATHS.countryDetail(countryCode);
  
  try {
    // Try to load dedicated country file first
    return await loadAndParseTopoJSON(countryPath);
  } catch (error) {
    console.warn(`[GeoDataService] Country file not found for ${countryCode}, filtering from world map`);
    // Smart fallback: filter the country from world map data
    return filterCountryFromWorld(countryCode);
  }
}

/**
 * Filters a single country from the world map data
 * This is used as a smart fallback when country-specific files don't exist
 * 
 * @param countryCode - ISO country code to filter
 * @returns Promise resolving to filtered collection with just that country
 */
export async function filterCountryFromWorld(countryCode: string): Promise<CountriesCollection> {
  const worldData = await loadWorldMap();
  const normalizedCode = countryCode.toUpperCase();
  
  // Try to match by various ISO codes or name
  const filtered = worldData.features.filter(feature => {
    const props = feature.properties as CountryProperties;
    return (
      props.iso_a2?.toUpperCase() === normalizedCode ||
      props.iso_a3?.toUpperCase() === normalizedCode ||
      props.iso_n3 === normalizedCode ||
      props.name?.toUpperCase().includes(normalizedCode)
    );
  });

  if (filtered.length === 0) {
    console.warn(`[GeoDataService] No country found matching: ${countryCode}`);
    return worldData; // Return full world if no match
  }

  console.log(`[GeoDataService] Filtered ${filtered.length} feature(s) for ${countryCode}`);
  
  return {
    type: 'FeatureCollection',
    features: filtered,
  };
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

/**
 * Gets a country's ISO codes from a feature
 * Helper for identifying countries in the map
 */
export function getCountryCode(feature: CountryFeature): string | null {
  const props = feature.properties as CountryProperties;
  return props.iso_a2 || props.iso_a3 || null;
}
