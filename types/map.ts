/**
 * Type definitions for map components
 */

import type {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Polygon,
} from "geojson";
import type { CSSProperties } from "react";

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

/**
 * Map API types for the public `Map` component
 */

export type GeoDataByLevel = Record<number, GeoJSONFeatureCollection | null>;

export interface MapExportPayload {
  /** latitude of a clicked or exported point */
  lat?: number;
  /** longitude of a clicked or exported point */
  lng?: number;
  /** the full GeoJSON feature (if a feature was clicked) */
  feature?: GeoJSONFeature;
  /** administrative level the feature belongs to (0 = world, 1 = country, ...) */
  level?: number;
}

export interface FeatureEvent {
  feature: GeoJSONFeature;
  level: number;
}

export interface HoverEvent {
  feature: GeoJSONFeature | null;
  level?: number;
}

export interface MapProps {
  /** GeoJSON data grouped by administrative level. */
  geoDataByLevel: GeoDataByLevel;
  /** Which level should be focused/rendered (0 = world). */
  focusedLevel?: number;
  /** Optional focused entity (level + id) to control drill state. */
  focusedEntity?: { level: number; id: string | null };
  /** When true, the map will automatically drill into clicked features. Default: true */
  autoFocusOnClick?: boolean;
  /** Optional initial view state for the map. */
  initialView?: ViewState;
  /** Which property in feature.properties should be used for highlighting (optional). */
  highlightProperty?: string;
  /** Enable or disable map interactions. Default: true */
  interactive?: boolean;
  /** Called when a feature is clicked. */
  onFeatureClick?: (e: FeatureEvent) => void;
  /** Called when mouse moves over a feature (or null when leaving). */
  onFeatureHover?: (e: HoverEvent) => void;
  /** Called when the user pans/zooms the map. */
  onViewportChange?: (view: ViewState) => void;
  /** Generic export event: emits lat/lng and optional feature for external UI. */
  onExportData?: (payload: MapExportPayload) => void;
  /** Optional style container props for the map wrapper. */
  className?: string;
  style?: CSSProperties;
}

