"use client";

// Server Action-based data adapter for @hoshina/react-map
// Uses Next.js Server Actions to keep GraphQL endpoint secure

import type {
  GeoDataLoader,
  GeoJSONFeatureCollection,
} from "@hoshina/react-map";

import {
  loadAdminBoundariesAction,
  loadWorldMapAction,
} from "./geoDataActions";

/**
 * GeoDataLoader implementation using Next.js Server Actions
 * All GraphQL queries are executed server-side, keeping the endpoint hidden from clients
 */
export const mapDataLoader: GeoDataLoader = {
  /**
   * Loads the world map (Level 0 - all countries)
   */
  async loadWorldMap(): Promise<GeoJSONFeatureCollection> {
    return loadWorldMapAction();
  },

  /**
   * Loads admin boundaries for a specific country (Level 1)
   * @param parentCode - The ISO code of the parent country (e.g., "US", "DE")
   */
  async loadAdminBoundaries(
    parentCode: string,
  ): Promise<GeoJSONFeatureCollection | null> {
    return loadAdminBoundariesAction(parentCode);
  },
};
