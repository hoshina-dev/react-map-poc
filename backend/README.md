# Very simple FastAPI server (geo API) even monkey with macbook can follow

This small FastAPI app serves geo files from `public/geo` and provides simple metadata endpoints. 

Use UV and cd to `backend/` first to set up a virtualenv:

```bash
uv sync
```
if uv error something python3.12 doesn't exist,
```bash
uv python install 3.12
uv sync
```

Run locally at root:

```bash
npm run backend:run
```

Endpoints:
- `GET /api/geo/world` - returns `public/geo/world-110m.json` (or error if missing)
- `GET /api/geo/admin/{country}` - returns `public/geo/admin-by-country/{country}-admin.json`
- `GET /api/geo/meta/world` - metadata for world file (size, bbox, featureCount)
- `GET /api/geo/meta/admin/{country}` - metadata for admin file
- `GET /api/geo/list/admins` - list available admin country keys (derived from filenames)

Notes:
 - CORS allows `http://localhost:3000` by default so Next dev can fetch directly.
- This is intentionally minimal as a POC; 
