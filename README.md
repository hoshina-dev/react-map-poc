# World Map POC

An interactive world map with admin boundaries (states/provinces) built with Next.js, Mantine UI, and react-simple-maps.

## Features

- 🗺️ Interactive world map with click-to-focus
- 🔍 Zoom in/out with keyboard controls (+/- keys)
- 🌍 Toggle between country-level (110m) and admin boundaries (10m resolution)
- 📍 Focus mode: Click any country or state to zoom in
- ⚡ Optimized loading: Admin boundaries loaded on-demand per country
- 🎨 Clean UI with Mantine components

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── public/geo/
│   ├── world-110m.json              # Low-res world map (105KB)
│   ├── world-50m.json               # Medium-res world map (740KB)
│   └── admin-by-country/            # Admin boundaries by country (loaded on-demand)
│       ├── united-states-of-america-admin.json (2.6MB)
│       ├── canada-admin.json (2.9MB)
│       └── ... (252 countries total)
├── raw/                             # Raw data (not in git)
│   └── ne_10m_admin_1_states_provinces/  # Extracted shapefile
├── scripts/
│   ├── download-admin-data.js       # Download Natural Earth data
│   ├── setup-admin-boundaries.js    # Process shapefile → country files
│   └── extract-country.js           # Extract individual countries from world map
└── src/
    ├── components/
    │   ├── MapChart.tsx             # Main container with state management
    │   ├── WorldMapRenderer.tsx     # Renders country-level map
    │   └── AdminBoundariesRenderer.tsx  # Renders state/province map
    └── lib/
        ├── geoDataService.ts        # Data loading & caching
        └── mapUtils.ts              # Geographic calculations
```

## Data Preparation Guide

This project uses geographic data from [Natural Earth](https://www.naturalearthdata.com/). The admin boundaries data is **not included** in the repository due to its size.

### Quick Setup (2 commands)

```bash
# Step 1: Download and extract the data (one-time setup)
node scripts/download-admin-data.js

# Step 2: Process shapefile into country-specific TopoJSON files
node scripts/setup-admin-boundaries.js
```

Or use the npm script:

```bash
npm run setup:data
```

> **Note:** The download script for the ZIP file is currently broken. Please download the file manually from [this link](https://www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_1_states_provinces.zip) and place it in the `raw/` directory before running `npm run setup:data`.


**Verify your setup:**

```bash
npm run setup
```

That's it! This will:
1. Download `ne_10m_admin_1_states_provinces.zip` (~31 MB) from Natural Earth
2. Extract the shapefile to `raw/ne_10m_admin_1_states_provinces/`
3. Convert shapefile directly to TopoJSON (skips intermediate GeoJSON)
4. Split into 252 country files in `public/geo/admin-by-country/`
5. Clean up temporary files

### Manual Setup (if scripts fail)

If the automated scripts don't work on your system:

1. **Download the data:**
   - Visit: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
   - Download: `ne_10m_admin_1_states_provinces.zip`
   - Extract to: `raw/ne_10m_admin_1_states_provinces/`

2. **Run the setup script:**
   ```bash
   node scripts/setup-admin-boundaries.js
   ```

### What You'll Get

After running the setup:
- **252 country files** in `public/geo/admin-by-country/`
- File sizes: 0.5 KB to 4.5 MB per country
- Total size: ~150 MB for all countries
- On-demand loading: Only loads what you need

**Largest files:**
- Russia: 4.56 MB
- United Kingdom: 4.50 MB  
- Canada: 2.94 MB
- United States: 2.58 MB
- France: 2.28 MB

## Usage

### Keyboard Controls

- **`+` or `=`** - Zoom in
- **`-` or `_`** - Zoom out

### Mouse Controls

- **Click** - Focus on country/state
- **Drag** - Pan the map
- **Exit Focus Mode** button - Return to world view

### Toggle Modes

- **World (110m)** - Show country boundaries, click to load country details
- **Admin Boundaries (10m)** - Show country boundaries, click to load state/province details

## Technologies

- **Next.js 15.5.3** - React framework with pages router
- **Mantine 8.3.8** - UI component library
- **react-simple-maps 3.0.0** - Map rendering with D3
- **topojson-client** - TopoJSON to GeoJSON conversion
- **d3-geo** - Geographic projections and calculations

## Data Sources

- **Natural Earth** - Free vector and raster map data
  - [10m Admin 1 - States/Provinces](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)
  - [110m and 50m Cultural Vectors](https://www.naturalearthdata.com/downloads/110m-cultural-vectors/)

## Performance Optimization

The app uses several strategies to handle large geographic datasets:

1. **On-demand loading** - Only load data when needed
2. **TopoJSON format** - Shared arcs reduce file size by 46%
3. **Country-based splitting** - 252 small files instead of one 111MB file
4. **In-memory caching** - Avoid re-fetching the same data
5. **Progressive enhancement** - Start with low-res, load high-res on focus

## License

MIT
