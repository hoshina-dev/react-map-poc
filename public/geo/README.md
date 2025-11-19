# TopoJSON Data Sources

This directory contains geographic data in TopoJSON format for the world map visualization.

## Directory Structure

```
geo/
├── world-110m.json       # Low-resolution world map (overview, ~80KB)
├── world-50m.json        # Medium-resolution world map (optional, ~200KB)
└── countries/            # High-detail country-specific files (loaded on-demand)
    ├── usa.json
    ├── canada.json
    └── ...
```

## Data Sources

### Primary Source: World Atlas (Recommended)
- **Repository**: https://github.com/topojson/world-atlas
- **License**: BSD-3-Clause
- **Maintained by**: Mike Bostock (creator of D3.js)
- **Files**:
  - `world-110m.json` - 1:110,000,000 scale
  - `world-50m.json` - 1:50,000,000 scale (more detail)

### Alternative Source: Natural Earth
- **Website**: https://www.naturalearthdata.com/
- **Repository**: https://github.com/nvkelso/natural-earth-vector
- **License**: Public Domain
- **Already converted to TopoJSON**

## Download Instructions

### Option 1: World Atlas (Simplest)

Download from the latest release:

```bash
# From project root
cd public/geo

# Download low-res world (recommended for base map)
curl -o world-110m.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json

# Optional: Download medium-res world
curl -o world-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json
```

### Option 2: Natural Earth via TopoJSON Server

```bash
cd public/geo

# Download Natural Earth 110m cultural vectors
curl -o world-110m.json "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson" \
  | npx -y topojson-server -o world-110m.json -- /dev/stdin
```

## Country-Level Detail Files

For high-resolution country-specific files, we recommend:

1. **Generate from world-50m.json**: Extract individual countries using topojson-client
2. **Use country-specific sources**: Download from Natural Earth or OpenStreetMap
3. **Load on-demand**: Only download when user zooms into a country

### Example: Extract USA from world map

```bash
# Install topojson CLI tools if needed
npm install -g topojson-client topojson-server

# Extract a single country (example: USA, iso code "840")
topo2geo countries=- < world-50m.json | \
  ndjson-filter 'd.properties.iso_n3 === "840"' | \
  geo2topo countries=- > countries/usa.json
```

## Properties Available in World Atlas TopoJSON

Each country feature includes:
- `name` - Country name
- `iso_a2` - ISO 3166-1 alpha-2 code (e.g., "US")
- `iso_a3` - ISO 3166-1 alpha-3 code (e.g., "USA")
- `iso_n3` - ISO 3166-1 numeric code (e.g., "840")

## Usage in Application

The `geoDataService.ts` utility will:
1. Load `world-110m.json` on initial render (fast load)
2. Cache the parsed GeoJSON in memory
3. On country click/zoom, load detailed country file from `countries/` if available
4. Fall back to world-level detail if country file doesn't exist

## File Size Recommendations

- **Base world map**: Use 110m (~80KB) for fast initial load
- **Country detail**: Generate/download on-demand, keep under 500KB per country
- **Optional middle tier**: Use 50m (~200KB) for countries without dedicated files

## Notes

- All files should be in TopoJSON format (more compact than GeoJSON)
- Use `.json` extension for consistency
- Consider adding to `.gitignore` if files are large
- CDN delivery recommended for production
