"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MapRef } from "react-map-gl/maplibre";
import MapGL from "react-map-gl/maplibre";
import { bbox } from "@turf/turf";

import { getMapConfig, clampCoordinates } from "@/lib/mapConfig";
import { loadWorldMap, loadAdminBoundaries } from "@/lib/geoDataService";
import type { ViewState, GeoJSONFeatureCollection } from "@/types/map";
import GeoLayer from "./GeoLayer";
import type { LevelConfig } from "./GeoLayer";

// Re-export LevelConfig for external use
export type { LevelConfig };

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

/** Maximum focus level supported (0 = world, 1 = country/admin0, 2 = admin1, etc.) */
export const MAX_FOCUS_LEVEL = 4;

/** Represents a focused entity at any admin level */
export interface FocusedEntity {
  /** The name/id of the focused entity */
  name: string;
  /** The admin level (0 = world, 1 = country, 2 = admin1, etc.) */
  level: number;
}

/** Focus state exposed via callbacks and API */
export interface FocusState {
  /** Current focus level (0 = world view, 1+ = focused on entity) */
  level: number;
  /** Stack of focused entities from level 1 to current level */
  entityStack: FocusedEntity[];
  /** Currently hovered region name */
  hoveredRegion: string | null;
  /** Whether data is loading */
  isLoading: boolean;
}

export interface SiteMapProps {
  /** Map tile provider */
  mapProvider?: "osm" | "positron" | "maplibre-demo" | "mapbox";
  /** Custom styles for the map container */
  style?: React.CSSProperties;
  /** Called when a feature is clicked */
  onFeatureClick?: (info: { name: string; level: number }) => void;
  /** Called when hover changes */
  onHover?: (name: string | null) => void;
  /** Called when focus state changes */
  onFocusChange?: (state: FocusState) => void;
}

export interface SiteMapHandle {
  /** Get current map state */
  getState: () => {
    focusState: FocusState;
    viewState: ViewState;
  };
  /** Focus on an entity at a specific level */
  focus: (entityName: string, level?: number) => Promise<void>;
  /** Go back one level */
  goBack: () => void;
  /** Exit focus mode completely and return to world view */
  exitFocus: () => void;
  /** Get the underlying MapLibre map instance */
  getMap: () => maplibregl.Map | null;
}

// -----------------------------------------------------------------------------
// Level Configuration
// -----------------------------------------------------------------------------

interface LevelConfigWithLoader extends LevelConfig {
  getDataLoader: (parentEntity?: string) => Promise<GeoJSONFeatureCollection | null>;
}

const LEVEL_CONFIGS: Record<number, LevelConfigWithLoader> = {
  0: {
    layerId: "world-countries",
    highlightProperty: "name",
    variant: "country",
    getDataLoader: async () => loadWorldMap(),
  },
  1: {
    layerId: "admin-boundaries-1",
    highlightProperty: "name_en",
    variant: "default",
    getDataLoader: async (country) => country ? loadAdminBoundaries(country) : null,
  },
  // Future levels can be added here:
  // 2: { layerId: "admin-boundaries-2", ... },
  // 3: { layerId: "admin-boundaries-3", ... },
  // 4: { layerId: "admin-boundaries-4", ... },
};

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_VIEW: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
};

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------

const SiteMap = forwardRef<SiteMapHandle, SiteMapProps>(function SiteMap(
  {
    mapProvider = "positron",
    style = { width: "100%", height: "600px" },
    onFeatureClick,
    onHover,
    onFocusChange,
  },
  ref
) {
  const mapRef = useRef<MapRef>(null);
  const mapConfig = useMemo(() => getMapConfig(mapProvider), [mapProvider]);

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Focus state: stack of focused entities
  const [focusLevel, setFocusLevel] = useState(0);
  const [entityStack, setEntityStack] = useState<FocusedEntity[]>([]);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  
  // Currently focused feature geometry (for zooming when no child data)
  const [focusedFeature, setFocusedFeature] = useState<GeoJSON.Feature | null>(null);

  // Geo data by level
  const [dataByLevel, setDataByLevel] = useState<Record<number, GeoJSONFeatureCollection | null>>({});

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  // Find the most recent level that has data (fall back to parent if current has none)
  const effectiveDataLevel = useMemo(() => {
    for (let level = focusLevel; level >= 0; level--) {
      if (dataByLevel[level]?.features?.length) return level;
    }
    return 0;
  }, [focusLevel, dataByLevel]);

  const currentData = dataByLevel[effectiveDataLevel] ?? null;
  const levelConfig = LEVEL_CONFIGS[effectiveDataLevel] ?? LEVEL_CONFIGS[0]!;
  const interactiveLayerIds = currentData ? [`${levelConfig.layerId}-fill`] : [];

  // ---------------------------------------------------------------------------
  // Load world data on mount
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await loadWorldMap();
        if (mounted) {
          setDataByLevel((prev) => ({ ...prev, 0: data }));
        }
      } catch (err) {
        console.error("Failed to load world map:", err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // ---------------------------------------------------------------------------
  // Load data when focus level changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (focusLevel === 0) {
      setFocusedFeature(null);
      return;
    }

    const config = LEVEL_CONFIGS[focusLevel];
    
    // If no config for this level, just zoom to the focused feature
    if (!config) {
      if (focusedFeature) {
        const featureCollection = {
          type: "FeatureCollection" as const,
          features: [focusedFeature],
        };
        fitToBounds(featureCollection as GeoJSONFeatureCollection);
      }
      setIsLoading(false);
      setTimeout(() => setIsTransitioning(false), 300);
      return;
    }

    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        // Get parent entity for loading
        const parentEntity = entityStack[focusLevel - 1]?.name;
        const data = await config.getDataLoader(parentEntity);

        if (!mounted) return;

        if (!data?.features?.length) {
          // No data available at this level - zoom to focused feature instead
          setDataByLevel((prev) => ({ ...prev, [focusLevel]: null }));
          
          if (focusedFeature) {
            const featureCollection = {
              type: "FeatureCollection" as const,
              features: [focusedFeature],
            };
            fitToBounds(featureCollection as GeoJSONFeatureCollection);
          }
          
          setIsLoading(false);
          setTimeout(() => setIsTransitioning(false), 300);
          return;
        }

        // Add IDs to features for hover
        const withIds = {
          ...data,
          features: data.features.map((f: any, i: number) => ({ ...f, id: i })),
        };

        // Compute and fit to bounds
        fitToBounds(withIds);

        setDataByLevel((prev) => ({ ...prev, [focusLevel]: withIds }));
        setIsLoading(false);
        setTimeout(() => setIsTransitioning(false), 300);
      } catch (err) {
        console.error(`Failed to load data for level ${focusLevel}:`, err);
        if (mounted) {
          setDataByLevel((prev) => ({ ...prev, [focusLevel]: null }));
          setIsLoading(false);
          setIsTransitioning(false);
        }
      }
    })();

    return () => { mounted = false; };
  }, [focusLevel, entityStack]);

  // ---------------------------------------------------------------------------
  // Helper: Fit map to bounds
  // ---------------------------------------------------------------------------

  const fitToBounds = useCallback((data: GeoJSONFeatureCollection) => {
    let [minLng, minLat, maxLng, maxLat] = bbox(data) as [number, number, number, number];

    // Handle antimeridian crossing
    if (maxLng - minLng > 180) {
      const mainFeatures = data.features.filter((f: any) => {
        try {
          const fb = bbox(f) as [number, number, number, number];
          if (fb[2] - fb[0] > 180) return false;
          const centerLng = (fb[0] + fb[2]) / 2;
          return centerLng > -130 && centerLng < 170;
        } catch {
          return false;
        }
      });
      if (mainFeatures.length) {
        [minLng, minLat, maxLng, maxLat] = bbox({ type: "FeatureCollection", features: mainFeatures }) as [number, number, number, number];
      }
    }

    // Apply padding
    const lngPad = (maxLng - minLng) * 0.05;
    const latPad = (maxLat - minLat) * 0.05;
    const [cMinLng, cMinLat] = clampCoordinates(minLng - lngPad, minLat - latPad);
    const [cMaxLng, cMaxLat] = clampCoordinates(maxLng + lngPad, maxLat + latPad);

    mapRef.current?.getMap()?.fitBounds([[cMinLng, cMinLat], [cMaxLng, cMaxLat]], {
      padding: 50,
      duration: 500,
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Notify parent of focus changes
  // ---------------------------------------------------------------------------

  useEffect(() => {
    onFocusChange?.({
      level: focusLevel,
      entityStack,
      hoveredRegion,
      isLoading,
    });
  }, [focusLevel, entityStack, hoveredRegion, isLoading, onFocusChange]);

  // ---------------------------------------------------------------------------
  // Imperative handle (API)
  // ---------------------------------------------------------------------------

  useImperativeHandle(ref, () => ({
    getState: () => ({
      focusState: {
        level: focusLevel,
        entityStack,
        hoveredRegion,
        isLoading,
      },
      viewState,
    }),

    focus: async (entityName: string, level?: number) => {
      if (isTransitioning || isLoading) return;
      
      const targetLevel = level ?? focusLevel + 1;
      if (targetLevel > MAX_FOCUS_LEVEL || targetLevel < 1) return;

      setIsTransitioning(true);
      
      // Update entity stack
      const newStack = entityStack.slice(0, targetLevel - 1);
      newStack.push({ name: entityName, level: targetLevel });
      
      setEntityStack(newStack);
      setFocusLevel(targetLevel);
    },

    goBack: () => {
      if (focusLevel <= 0) return;
      
      setIsTransitioning(true);
      const newLevel = focusLevel - 1;
      const newStack = entityStack.slice(0, newLevel);
      
      setEntityStack(newStack);
      setFocusLevel(newLevel);
      setHoveredRegion(null);
      setFocusedFeature(null);

      if (newLevel === 0) {
        mapRef.current?.getMap()?.flyTo({
          center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
          zoom: DEFAULT_VIEW.zoom,
          duration: 500,
        });
      } else {
        // Find the most recent level with data and fit to it
        for (let level = newLevel; level >= 0; level--) {
          const levelData = dataByLevel[level];
          if (levelData) {
            fitToBounds(levelData);
            break;
          }
        }
      }

      setTimeout(() => setIsTransitioning(false), 500);
    },

    exitFocus: () => {
      setIsTransitioning(true);
      setEntityStack([]);
      setFocusLevel(0);
      setHoveredRegion(null);
      setFocusedFeature(null);
      
      mapRef.current?.getMap()?.flyTo({
        center: [DEFAULT_VIEW.longitude, DEFAULT_VIEW.latitude],
        zoom: DEFAULT_VIEW.zoom,
        duration: 500,
      });
      
      setTimeout(() => setIsTransitioning(false), 500);
    },

    getMap: () => mapRef.current?.getMap() ?? null,
  }), [focusLevel, entityStack, hoveredRegion, viewState, isLoading, isTransitioning, dataByLevel, fitToBounds]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleLoad = useCallback(() => setMapLoaded(true), []);

  const handleMove = useCallback((evt: { viewState: ViewState }) => {
    setViewState(evt.viewState);
  }, []);

  const handleClick = useCallback((event: any) => {
    if (isTransitioning || isLoading) return;

    const features = event.features;
    if (!features?.length) return;

    const feature = features[0];
    const props = feature.properties;
    const name = props?.name_en || props?.name || props?.admin;
    if (!name) return;

    onFeatureClick?.({ name, level: focusLevel });

    // Always allow drilling down up to MAX_FOCUS_LEVEL
    const nextLevel = focusLevel + 1;
    if (nextLevel <= MAX_FOCUS_LEVEL) {
      setIsTransitioning(true);
      
      // Store the clicked feature for zooming
      setFocusedFeature(feature);
      
      const newStack = [...entityStack];
      newStack.push({ name, level: nextLevel });
      
      setEntityStack(newStack);
      setFocusLevel(nextLevel);
    }
  }, [focusLevel, entityStack, isTransitioning, isLoading, onFeatureClick]);

  const handleMouseMove = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = event.features;
    if (features?.length) {
      const props = features[0].properties;
      const name = props?.name_en || props?.name || props?.admin;
      if (name && name !== hoveredRegion) {
        setHoveredRegion(name);
        onHover?.(name);
        map.getCanvas().style.cursor = "pointer";
      }
    } else if (hoveredRegion) {
      setHoveredRegion(null);
      onHover?.(null);
      map.getCanvas().style.cursor = "";
    }
  }, [hoveredRegion, onHover]);

  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
    onHover?.(null);
    const canvas = mapRef.current?.getMap()?.getCanvas();
    if (canvas) canvas.style.cursor = "";
  }, [onHover]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <MapGL
      ref={mapRef}
      {...viewState}
      onMove={handleMove}
      onLoad={handleLoad}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={style}
      mapStyle={mapConfig.style}
      maxZoom={15}
      interactiveLayerIds={interactiveLayerIds}
    >
      {currentData && (
        <GeoLayer
          key={levelConfig.layerId}
          levelConfig={levelConfig}
          data={currentData}
          highlightValue={hoveredRegion}
          showBaseFill
        />
      )}
    </MapGL>
  );
});

export default SiteMap;
