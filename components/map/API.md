**Map Component API**

- **Purpose**: `Map` is a small, focused React component that renders map layers and exposes interaction events. It does not load or cache data — that responsibility belongs to a container (e.g. `MapDemoContainer`).

**Props (TypeScript)**

- `geoDataByLevel: Record<number, GeoJSON.FeatureCollection | null>`
  - GeoJSON collections keyed by administrative level: `0` = world, `1` = country, `2` = admin2, etc.

- `focusedLevel?: number` (default: `0`)
  - Which level to display/highlight.

- `initialView?: ViewState`
  - Optional initial center/zoom (longitude, latitude, zoom, pitch, bearing).

- `highlightProperty?: string`
  - Optional feature property name used by highlight/filter logic (e.g. `name` or `admin`).

- `interactive?: boolean` (default: `true`)
  - Enable or disable map interactions (click/hover/drag).

- `onFeatureClick?: (e: { feature: GeoJSON.Feature; level: number }) => void`
  - Called when a visible feature is clicked. The handler receives the full GeoJSON feature and its level.

- `onFeatureHover?: (e: { feature: GeoJSON.Feature | null; level?: number }) => void`
  - Called when mouse moves over a feature (or `null` when leaving).

- `onViewportChange?: (view: ViewState) => void`
  - Called when the visible viewport changes (pan/zoom).

- `onExportData?: (payload: { lat?: number; lng?: number; feature?: GeoJSON.Feature; level?: number }) => void`
  - Generic export event. Call this when you want to surface lat/lng or feature data to the outside world (sidebar, form, etc.).

- `className?: string` / `style?: React.CSSProperties`
  - Optional wrapper styling props.
```markdown
**SiteMap Component API**

- **Purpose**: `SiteMap` is a self-contained, opinionated map component that handles data loading (world + per-country admin boundaries), drill-down focus, zooming/fitting, hover highlighting and exposes a small imperative API via `ref` for programmatic control.

Key points:
- Loads world base map automatically on mount.
- Loads administrative boundaries for a focused entity when available (via `lib/geoDataService`).
- Supports multi-level focus (configurable up to `MAX_FOCUS_LEVEL`).
- Exposes an imperative `SiteMapHandle` (via `ref`) to drive focus, navigation, and inspect internal state.

## Public Props (TypeScript)

- `mapProvider?: "osm" | "positron" | "maplibre-demo" | "mapbox"` — tile provider (default: `"positron"`).
- `style?: React.CSSProperties` — container styling for the map element.
- `onFeatureClick?: (info: { name: string; level: number }) => void` — called when a feature is clicked (name inferred from feature properties).
- `onHover?: (name: string | null) => void` — called when hover changes (passes hovered feature name or `null`).
- `onFocusChange?: (state: FocusState) => void` — called whenever the internal focus state changes (level, entityStack, hoveredRegion, isLoading).

## Imperative API (`SiteMapHandle`) (via `ref`)

Pass a `ref` to `SiteMap` to call these methods from parent components.

- `getState(): { focusState: FocusState; viewState: ViewState }` — returns current focus state and the map view state (longitude/latitude/zoom).
- `focus(entityName: string, level?: number): Promise<void>` — programmatically focus (drill) to `entityName`. If `level` is omitted, advances one level deeper than current. Respects `MAX_FOCUS_LEVEL`.
- `goBack(): void` — go back one focus level (like a breadcrumb back action).
- `exitFocus(): void` — exit focus mode and return to global/world view.
- `getMap(): maplibregl.Map | null` — get underlying MapLibre instance (for advanced use).

## Types

### `FocusState`

- `level: number` — current focus level (0 = world, 1..N = focused levels).
- `entityStack: { name: string; level: number }[]` — stack of focused entities from level 1 up to current.
- `hoveredRegion: string | null` — current hovered feature name.
- `isLoading: boolean` — whether the component is currently loading data for the focused level.

### `LevelConfig`

`SiteMap` exposes the concept of `LevelConfig` (documented/typed in `GeoLayer.tsx`) for each administrative level. A `LevelConfig` includes:

- `layerId: string` — unique layer identifier used by MapLibre.
- `highlightProperty: string` — feature property used for highlighting/filtering.
- `variant: "country" | "default"` — visual variant for styling.

Internally `SiteMap` uses an extended `LevelConfigWithLoader` which adds a `getDataLoader(parentEntity?: string)` function for loading the GeoJSON for that level.

`MAX_FOCUS_LEVEL` is exported and indicates the maximum depth the component supports (default in this project is 4).

## Behavior and Notes

- Clicking a feature will automatically attempt to drill to the next focus level (up to `MAX_FOCUS_LEVEL`). If the deeper level has GeoJSON data available the map will load and render it. If no deeper GeoJSON is available, the map will still zoom/fly to the clicked feature's bounds (the component stores the clicked feature geometry and fits to it), and the parent level's data remains visible as the visual context.
- The map computes bounding boxes with antimeridian handling and applies a small padding before calling `fitBounds`.
- Hovering over features updates `hoveredRegion` and calls `onHover`; cursor style is changed to pointer when hovering.
- `onFocusChange` is called with a stable object describing the focus state; prefer using a `useCallback` handler on the parent to avoid unnecessary re-renders.

## Example Usage

```tsx
import { useRef, useCallback } from "react";
import { SiteMap, MapInfoBar } from "@/components/map";

function Page() {
  const mapRef = useRef(null);

  const handleFocusChange = useCallback((state) => {
    // update UI (info bar, breadcrumbs) from focus state
    console.log("Focus changed:", state);
  }, []);

  return (
    <div>
      <MapInfoBar focusState={{ level: 0, entityStack: [], hoveredRegion: null, isLoading: false }} mapRef={mapRef} />
      <SiteMap ref={mapRef} mapProvider="positron" onFocusChange={handleFocusChange} />
    </div>
  );
}
```

## GeoLayer

`GeoLayer` is a small presentational component used by `SiteMap` to render GeoJSON for a particular level. Rather than passing individual style/prop values, `SiteMap` now passes a `levelConfig` object to `GeoLayer` and `GeoLayer` decides which properties (highlightProperty, variant) to use.

## Testing & Debugging Tips

- To verify zooming behavior for levels with no data, click an admin feature (e.g., state) and confirm the map flies to the feature bounds even if no deeper GeoJSON is rendered.
- Use `mapRef.current?.getState()` to inspect `viewState` (zoom/lat/lng) from the browser console during development.

## Migration / Integration

- If you previously provided `geoDataByLevel` externally, `SiteMap` now loads world and per-country admin data internally. If you still need external control over data sources, you can either:
  - Extend `LEVEL_CONFIGS` in `SiteMap` to point to your own loader, or
  - Fork `SiteMap` to accept explicit `dataByLevel` props and bypass internal loading (advanced use-case).

---

This file documents the public surface of `SiteMap` as implemented in `components/map/SiteMap.tsx` and the related `GeoLayer` used for rendering.
```
