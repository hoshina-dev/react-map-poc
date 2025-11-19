/**
 * Ambient type declarations for geographic data structures
 * These types are globally available without imports
 */

import type { Feature, FeatureCollection, Geometry } from 'geojson';

declare global {
  /**
   * Properties typically found in world-atlas TopoJSON features
   */
  interface CountryProperties {
    name: string;           // Country name (e.g., "United States of America")
    iso_a2?: string;        // ISO 3166-1 alpha-2 (e.g., "US")
    iso_a3?: string;        // ISO 3166-1 alpha-3 (e.g., "USA")
    iso_n3?: string;        // ISO 3166-1 numeric (e.g., "840")
    admin?: string;         // Admin name
    [key: string]: unknown; // Allow additional properties
  }

  /**
   * A GeoJSON feature representing a country
   */
  interface CountryFeature extends Feature {
    properties: CountryProperties;
    geometry: Geometry;
  }

  /**
   * A collection of country features
   */
  interface CountriesCollection extends FeatureCollection {
    features: CountryFeature[];
  }

  /**
   * Zoom level enumeration for data loading strategy
   */
  enum ZoomLevel {
    World = 'world',      // Show world-110m.json
    Country = 'country',  // Show detailed country data
  }

  /**
   * Geographic data cache entry
   */
  interface GeoDataCacheEntry {
    data: CountriesCollection;
    loadedAt: number;
    source: string; // URL or path where data was loaded from
  }

  /**
   * Map view state
   */
  interface MapViewState {
    center: [number, number] | null;  // [longitude, latitude]
    scale: number;
    selectedCountry: string | null;   // ISO code of selected country
    zoomLevel: ZoomLevel;
  }
}

export {};
