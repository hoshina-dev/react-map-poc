 # World Map POC

Lightweight proof-of-concept that demonstrates on-demand loading of admin (state/province) boundaries using MapLibre and `react-map-gl`. This repo is for experimentation — not production-ready.

## Features

- 🗺️ Interactive world map with click-to-focus
- 🔍 Zoom in/out with keyboard controls (+/- keys)
- 📍 Focus mode: Click any country or state to zoom in
- ⚡ Optimized loading: Admin boundaries loaded on-demand per country
- 🎨 Clean UI with Mantine components

## Quick Start
Install and run the dev server (the `setup` step runs automatically before dev):

```bash
npm install
npm run dev
```

That's it — `npm run dev` will check/download and prepare Natural Earth admin data as needed.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure
```
├── public/geo/                      # Map/topojson assets
├── raw/                             # Downloaded/extracted Natural Earth (not committed)
├── scripts/                         # Downloading & processing helpers
│   ├── check-and-download.js
│   ├── download-admin-data.js
│   ├── setup-admin-boundaries.js
│   └── extract-country.js
├── app/                             # Next.js app code (components, pages)
└── package.json
```

## Important notes
- The project uses MapLibre + `react-map-gl`.
- The download/ extraction script is cross-platform: it tries system `unzip` (macOS/Linux), PowerShell on Windows, then the Node `unzipper` fallback.
- Data directories:
	- `raw/` — downloaded/extracted Natural Earth files (not checked into git)
	- `public/geo/admin-by-country/` — per-country TopoJSON files loaded on demand

## Useful scripts
- `npm run dev` — start dev server (runs `npm run setup` first)
- `npm run setup` — checks data and runs download/processing
- `node scripts/download-admin-data.js` — download & extract Natural Earth ZIP
- `node scripts/setup-admin-boundaries.js` — convert shapefile → TopoJSON and split by country

## Troubleshooting
- If a download fails and the server returns HTML, check `raw/*.html` for the saved error response.
- If extraction fails and you don't have `unzip`, install it or run `npm install` (to get the `unzipper` fallback).

Manual download fallback (if automated download fails):

1. Download the Natural Earth admin-1 ZIP manually:

	- Visit: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/
	- Download: "Download states and provinces" (about 14.22 MB) — filename: `ne_10m_admin_1_states_provinces.zip` (version 5.1.1)

2. Place the downloaded ZIP in the project `raw/` directory (create `raw/` if missing):


3. Let the project extract it for you and continue setup:

```bash
npm run setup
```


