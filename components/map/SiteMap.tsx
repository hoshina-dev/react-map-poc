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

import { getMapConfig } from "@/lib/mapConfig";
import { calculateFitBounds } from "@/lib/mapUtils";
import { loadWorldMap, loadAdminBoundaries } from "@/lib/geoDataProvider";
import type { ViewState, GeoJSONFeatureCollection } from "@/types/map";
import GeoLayer from "./GeoLayer";
import type { LevelConfig } from "./GeoLayer";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

// Re-export LevelConfig for external use
export type { LevelConfig };

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
  /** Called when the map view state changes (zoom, pan, etc.) */
  onViewStateChange?: (viewState: ViewState) => void;
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
    highlightProperty: "name",
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
    onViewStateChange,
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

  // Track the parent entity name that determines which data to load
  // For level 1, this is the country we clicked (entityStack[0])
  // For level 2+, this is the entity at level-1 (e.g., country name for admin-2)
  const parentEntityForLoading = focusLevel >= 1 ? entityStack[focusLevel - 1]?.name : undefined;

  useEffect(() => {
    console.log('[useEffect:loadData] Triggered:', { focusLevel, parentEntityForLoading, entityStack });
    
    if (focusLevel === 0) {
      console.log('[useEffect:loadData] Level 0, clearing focused feature');
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

    // Always reload when parent entity changes - clear existing data first
    // This handles switching from US states to France states
    setDataByLevel(prev => ({ ...prev, [focusLevel]: null }));

    let mounted = true;
    (async () => {
      setIsLoading(true);
      try {
        // Get parent entity for loading - for level 1, use the clicked country name
        // For level 2+, use the parent from the stack
        const parentEntity = focusLevel === 1 
          ? entityStack[0]?.name 
          : entityStack[focusLevel - 2]?.name;
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

        // Compute and fit to bounds
        fitToBounds(data);
        setDataByLevel((prev) => ({ ...prev, [focusLevel]: data }));
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
  }, [focusLevel, parentEntityForLoading]);

  // ---------------------------------------------------------------------------
  // Helper: Fit map to bounds
  // ---------------------------------------------------------------------------

  const fitToBounds = useCallback((data: GeoJSONFeatureCollection) => {
    const bounds = calculateFitBounds(data, 0.05);
    mapRef.current?.getMap()?.fitBounds(bounds, {
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
      
      const newStack = entityStack.slice(0, targetLevel - 1);
      let lastEntity = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      if (lastEntity && lastEntity.level === focusLevel) {
        newStack[newStack.length - 1] = { name: entityName, level: focusLevel };
        setEntityStack(newStack);
      } else {
        newStack.push({ name: entityName, level: targetLevel });
        setEntityStack(newStack);
        setFocusLevel(targetLevel);
      }
    },

    goBack: () => {
      console.log('[goBack] Current state:', { focusLevel, entityStack, effectiveDataLevel, dataByLevel: Object.keys(dataByLevel) });
      
      if (focusLevel <= 0) return;
      
      setIsTransitioning(true);
      
      // Go back one level from current focus level
      const newLevel = focusLevel - 1;
      
      // Keep only entities with level <= newLevel
      const newStack = entityStack.filter(e => e.level <= newLevel);
      
      // Clear data for levels above newLevel to prevent lingering
      setDataByLevel(prev => {
        const updated = { ...prev };
        for (let i = newLevel + 1; i <= MAX_FOCUS_LEVEL; i++) {
          delete updated[i];
        }
        return updated;
      });
      
      console.log('[goBack] New state:', { newLevel, newStack });
      
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
        // Fit to the data at the new level (or nearest available)
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
    if (typeof onViewStateChange === 'function') {
      onViewStateChange(evt.viewState);
    }
  }, [onViewStateChange]);

  const handleClick = useCallback((event: any) => {
    if (isTransitioning || isLoading) return;

    const features = event.features;
    if (!features?.length) return;

    const feature = features[0];
    const props = feature.properties;
    const name = props?.name; // Now using normalized 'name' property
    if (!name) return;

    onFeatureClick?.({ name, level: focusLevel });

    console.log('[handleClick] Before:', { focusLevel, entityStack, effectiveDataLevel, name });

    // Determine the next level based on what we're currently viewing
    // If we're viewing fallback data (effectiveDataLevel < focusLevel), clicking should try to drill down from effective level
    const currentViewLevel = effectiveDataLevel;
    const nextLevel = currentViewLevel + 1;
    
    if (nextLevel <= MAX_FOCUS_LEVEL) {
      setIsTransitioning(true);
      
      // Store the clicked feature for zooming
      setFocusedFeature(feature);
      
      // Check if we tried to drill down before but couldn't (focusLevel > effectiveDataLevel)
      // In that case, clicking another feature at the same visible level is a reselection
      const wasAtFallbackLevel = focusLevel > effectiveDataLevel;
      
      if (wasAtFallbackLevel) {
        // We're reselecting within the fallback level - replace the entity that failed to drill down
        // Keep entities up to the effective level, replace/add the one for the next level attempt
        const newStack = entityStack.filter(e => e.level < nextLevel);
        newStack.push({ name, level: nextLevel });
        
        console.log('[handleClick] Reselecting (was at fallback):', { newStack, nextLevel, wasAtFallbackLevel });
        
        setEntityStack(newStack);
        setFocusLevel(nextLevel);
        
        // Just zoom to the new feature since we know there's no data at nextLevel
        const featureCollection = {
          type: "FeatureCollection" as const,
          features: [feature],
        };
        fitToBounds(featureCollection as GeoJSONFeatureCollection);
        setTimeout(() => setIsTransitioning(false), 500);
      } else {
        // Normal drill-down: add new entity and advance level
        const newStack = [...entityStack, { name, level: nextLevel }];
        
        console.log('[handleClick] Drill down:', { newStack, nextLevel });
        
        setEntityStack(newStack);
        setFocusLevel(nextLevel);
      }
    }
  }, [focusLevel, entityStack, effectiveDataLevel, isTransitioning, isLoading, onFeatureClick, fitToBounds]);

  const handleMouseMove = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = event.features;
    if (features?.length) {
      const props = features[0].properties;
      const name = props?.name; // Now using normalized 'name' property
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
