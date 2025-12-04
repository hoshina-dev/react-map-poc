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


**Design Notes**

- `Map` focuses on rendering and interactions only. It expects the parent to provide GeoJSON data (`geoDataByLevel`) and to manage higher-level concerns (loading, caching, drill-down behavior).

- Keep `Map` pure and side-effect free where possible. Emit events and let consumers decide how to handle them.


**Usage Example**

```ts
import { SiteMap } from "@/components/map";
```

function Page() {
  const [geoDataByLevel, setGeoDataByLevel] = useState({ 0: worldGeojson });
  const [selected, setSelected] = useState(null);

  const handleExport = (payload) => {
    // show coordinates in a sidebar, or persist to state
    setSelected(payload);
  };

  return (
    <div style={{ display: 'flex' }}>
      <Map
        geoDataByLevel={geoDataByLevel}
        focusedLevel={0}
        onFeatureClick={({ feature, level }) => console.log('click', feature, level)}
        onExportData={handleExport}
      />

      <aside>
        {selected ? (
          <div>
            <div>Lat: {selected.lat}</div>
            <div>Lng: {selected.lng}</div>
            <div>Name: {selected.feature?.properties?.name}</div>
          </div>
        ) : (
          <div>No selection</div>
        )}
      </aside>
    </div>
  );
}
```


**Migration Notes**

- `MapContainer` previously combined data loading and map rendering. After refactor:
  - Create a `MapDemoContainer` that loads data (calls `geoDataService`) and passes `geoDataByLevel` to `Map`.
  - Use `Map` directly in pages where the parent already owns the data and wants to control UI outside the map.

**Testing Recommendations**

- Unit-test `Map` event emission by simulating clicks and verifying the handlers receive expected payloads (use React Testing Library + JSDOM or an integration test with a headless browser).
- Add tests for `lib/mapUtils.calculateViewForFocus` and `lib/geoUtils.fixAntimeridianCrossing` to ensure predictable behavior.
