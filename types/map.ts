/**
 * Type definitions for map components
 */

import type { Feature, FeatureCollection, Geometry, Polygon, MultiPolygon } from "geojson";

export interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type GeoJSONGeometry = Geometry | Polygon | MultiPolygon;

export type GeoJSONFeature = Feature<Geometry, CountryProperties>;

export type GeoJSONFeatureCollection = FeatureCollection<
  Geometry,
  CountryProperties
>;

export interface CountryProperties {
  name?: string;
  admin?: string;
  iso_a2?: string;
  iso_a3?: string;
  iso_n3?: string;
}

export interface MapStyleConfig {
  version: 8;
  sources: Record<string, any>;
  layers: any[];
}
