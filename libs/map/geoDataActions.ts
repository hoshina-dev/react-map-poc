"use server";

import {
  fixAntimeridianCrossing,
  type GeoJSONFeatureCollection,
} from "@hoshina/react-map";

import {
  AdminAreasDocument,
  type AdminAreasQuery,
  ChildrenByCodeDocument,
  type ChildrenByCodeQuery,
} from "@/graphql/generated/graphql";
import { getServerApolloClient } from "@/libs/apollo/client";

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
 * Server Action: Loads the world map (Level 0 - all countries)
 */
export async function loadWorldMapAction(): Promise<GeoJSONFeatureCollection> {
  const client = getServerApolloClient();

  const { data } = await client.query<AdminAreasQuery>({
    query: AdminAreasDocument,
    variables: { adminLevel: 0 },
  });

  if (!data) {
    throw new Error("Failed to load world map: No data returned");
  }

  return transformToGeoJSON(data.adminAreas);
}

/**
 * Server Action: Loads admin boundaries for a specific country (Level 1)
 * @param parentCode - The ISO code of the parent country (e.g., "US", "DE")
 */
export async function loadAdminBoundariesAction(
  parentCode: string,
  childLevel: number,
): Promise<GeoJSONFeatureCollection | null> {
  const client = getServerApolloClient();

  try {
    const { data } = await client.query<ChildrenByCodeQuery>({
      query: ChildrenByCodeDocument,
      variables: { parentCode, childLevel },
    });

    if (!data || !data.childrenByCode.length) {
      return null;
    }

    return transformToGeoJSON(data.childrenByCode);
  } catch (error) {
    console.error(`Failed to load admin boundaries for ${parentCode}:`, error);
    return null;
  }
}
