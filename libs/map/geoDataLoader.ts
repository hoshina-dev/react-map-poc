// GraphQL-based data adapter for @hoshina/react-map

import {
  fixAntimeridianCrossing,
  type GeoDataLoader,
  type GeoJSONFeatureCollection,
} from "@hoshina/react-map";

import {
  AdminAreasDocument,
  type AdminAreasQuery,
  ChildrenByCodeDocument,
  type ChildrenByCodeQuery,
} from "@/graphql/generated/graphql";
import { getApolloClient } from "@/libs/apollo";

interface AdminArea {
  id: string;
  name: string;
  isoCode: string;
  geometry: unknown;
  adminLevel: number;
  parentCode?: string | null | undefined;
}

/**
 * Transforms GraphQL AdminArea responses to GeoJSON FeatureCollection format
 */
function transformToGeoJSON(adminAreas: AdminArea[]): GeoJSONFeatureCollection {
  const raw: GeoJSONFeatureCollection = {
    type: "FeatureCollection",
    features: adminAreas.map((area) => ({
      type: "Feature" as const,
      id: area.id,
      geometry:
        area.geometry as GeoJSONFeatureCollection["features"][0]["geometry"],
      properties: {
        name: area.name,
        isoCode: area.isoCode,
      },
    })),
  };

  // Fix antimeridian crossing issues for features like Russia, Fiji
  return fixAntimeridianCrossing(raw);
}

/**
 * GraphQL implementation of GeoDataLoader
 * Fetches geographic data from the GAPI backend via Apollo Client
 */
export const mapDataLoader: GeoDataLoader = {
  /**
   * Loads the world map (Level 0 - all countries)
   */
  async loadWorldMap(): Promise<GeoJSONFeatureCollection> {
    const client = getApolloClient();

    const { data } = await client.query<AdminAreasQuery>({
      query: AdminAreasDocument,
      variables: { adminLevel: 0 },
    });

    if (!data) {
      throw new Error("Failed to load world map: No data returned");
    }

    return transformToGeoJSON(data.adminAreas);
  },

  /**
   * Loads admin boundaries for a specific country (Level 1)
   * @param parentCode - The ISO code of the parent country (e.g., "US", "DE")
   */
  async loadAdminBoundaries(
    parentCode: string,
  ): Promise<GeoJSONFeatureCollection | null> {
    const client = getApolloClient();

    try {
      const { data } = await client.query<ChildrenByCodeQuery>({
        query: ChildrenByCodeDocument,
        variables: { parentCode, childLevel: 1 },
      });

      if (!data || !data.childrenByCode.length) {
        return null;
      }

      return transformToGeoJSON(data.childrenByCode);
    } catch (error) {
      console.error(
        `Failed to load admin boundaries for ${parentCode}:`,
        error,
      );
      return null;
    }
  },
};
