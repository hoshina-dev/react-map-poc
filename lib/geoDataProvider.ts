/**
 * Geographic Data Provider
 * 
 * This module serves as the unified interface for fetching geographic data.
 * It attempts to fetch from the backend API first, and falls back to local
 * JSON files if the backend is unavailable.
 * 
 * Key features:
 * - Backend-first approach with automatic fallback
 * - Connection health monitoring
 * - Caching support
 * 
 * Note: Data cleaning (keeping only name and geometry) is handled by:
 * - Backend: database.clean_geojson() before sending
 * - Frontend fallback: geoDataService.loadTopoJSON() for local files
 */

import type { GeoJSONFeatureCollection } from "@/types/map";
import { loadTopoJSON, GEO_PATHS, normalizeGeoData } from "./geoDataService";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const BACKEND_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const BACKEND_API_PATH = "/api/geo";
const BACKEND_TIMEOUT = 5000;
let backendHealthStatus: {
  isHealthy: boolean;
  lastChecked: number;
  checkIntervalMs: number;
} = {
  isHealthy: true, // Optimistically assume backend is available
  lastChecked: 0,
  checkIntervalMs: 60000, // Re-check every minute
};

/**
 * Checks if the backend is available by making a lightweight request
 */
async function checkBackendHealth(): Promise<boolean> {
  const now = Date.now();
  
  // Use cached result if recent
  if (now - backendHealthStatus.lastChecked < backendHealthStatus.checkIntervalMs) {
    return backendHealthStatus.isHealthy;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);

    const response = await fetch(`${BACKEND_BASE_URL}/health`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    backendHealthStatus.isHealthy = response.ok;
    backendHealthStatus.lastChecked = now;

    return response.ok;
  } catch (error) {
    console.warn("[GeoDataProvider] Backend health check failed:", error);
    backendHealthStatus.isHealthy = false;
    backendHealthStatus.lastChecked = now;
    return false;
  }
}

export async function forceBackendHealthCheck(): Promise<boolean> {
  backendHealthStatus.lastChecked = 0;
  return checkBackendHealth();
}

export function getBackendHealthStatus() {
  return {
    ...backendHealthStatus,
    age: Date.now() - backendHealthStatus.lastChecked,
  };
}

/**
 * Fetches data from backend with automatic fallback to local files
 */
async function fetchWithFallback(
  backendPath: string,
  fallbackLoader: () => Promise<GeoJSONFeatureCollection | null>
): Promise<GeoJSONFeatureCollection | null> {
  // Check if backend is healthy
  const isBackendHealthy = await checkBackendHealth();

  if (isBackendHealthy) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);

      const response = await fetch(`${BACKEND_BASE_URL}${BACKEND_API_PATH}${backendPath}`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Accept": "application/json, application/geo+json",
          "Accept-Encoding": "gzip",
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const rawData = await response.json();
        console.log(`[GeoDataProvider] ✓ Loaded from backend: ${backendPath}`);
        
        // Normalize TopoJSON/GeoJSON from backend
        return normalizeGeoData(rawData);
      } else {
        console.warn(`[GeoDataProvider] Backend returned ${response.status}, falling back to local files`);
      }
    } catch (error) {
      console.warn(`[GeoDataProvider] Backend request failed, falling back to local files:`, error);
      // Mark backend as unhealthy
      backendHealthStatus.isHealthy = false;
      backendHealthStatus.lastChecked = Date.now();
    }
  } else {
    console.log(`[GeoDataProvider] Backend unavailable, using local files`);
  }

  // Fallback to local files
  try {
    const data = await fallbackLoader();
    if (data) {
      console.log(`[GeoDataProvider] ✓ Loaded from local files (fallback)`);
      // Local files already cleaned by geoDataService
      return data;
    }
  } catch (error) {
    console.error(`[GeoDataProvider] Failed to load fallback data:`, error);
  }

  return null;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------
export async function loadWorldMap(): Promise<GeoJSONFeatureCollection> {
  const data = await fetchWithFallback(
    "/world",
    async () => {
      try {
        return await loadTopoJSON(GEO_PATHS.worldLow());
      } catch (_error) {
        console.warn(
          "[GeoDataProvider] world-110m.json not found, trying world-50m.json",
        );
        return loadTopoJSON(GEO_PATHS.worldMedium());
      }
    }
  );

  if (!data) {
    throw new Error("Failed to load world map from both backend and local files");
  }

  return data;
}

/**
 * Loads admin boundaries for a specific country (backend first, with fallback to local)
 */
export async function loadAdminBoundaries(
  countryName: string
): Promise<GeoJSONFeatureCollection | null> {
  return fetchWithFallback(
    `/admin/${encodeURIComponent(countryName.toLowerCase())}`,
    async () => {
      const path = GEO_PATHS.adminByCountry(countryName);
      try {
        return await loadTopoJSON(path);
      } catch (_error) {
        console.warn(
          `[GeoDataProvider] No admin boundaries found for ${countryName}`,
        );
        return null;
      }
    }
  );
}

/**
 * Lists all available admin countries
 * Returns empty array if backend is unavailable
 */
export async function listAdminCountries(): Promise<string[]> {
  const isBackendHealthy = await checkBackendHealth();

  if (!isBackendHealthy) {
    console.log(`[GeoDataProvider] Backend unavailable, cannot list admin countries`);
    return [];
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);

    const response = await fetch(`${BACKEND_BASE_URL}${BACKEND_API_PATH}/list/admins`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.countries || [];
    }
  } catch (error) {
    console.warn(`[GeoDataProvider] Failed to list admin countries:`, error);
  }

  return [];
}

/**
 * Gets metadata about a geographic dataset (backend only)
 */
export async function getGeoMetadata(
  type: "world" | "admin",
  countryName?: string
): Promise<{
  path?: string;
  size?: number;
  featureCount?: number;
  bbox?: [number, number, number, number];
} | null> {
  const isBackendHealthy = await checkBackendHealth();

  if (!isBackendHealthy) {
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT);

    const path = type === "world" 
      ? `/meta/world`
      : `/meta/admin/${encodeURIComponent(countryName!.toLowerCase())}`;

    const response = await fetch(`${BACKEND_BASE_URL}${BACKEND_API_PATH}${path}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.warn(`[GeoDataProvider] Failed to get metadata:`, error);
  }

  return null;
}
