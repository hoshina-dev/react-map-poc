from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.src.geoDataService.router import router as geo_router
from backend.src.geoDataService import constants


app = FastAPI(title="Geo API")

# Apply CORS for local development (adjust origins in constants.DEFAULT_ORIGINS)
app.add_middleware(
	CORSMiddleware,
	allow_origins=constants.DEFAULT_ORIGINS,
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

# Mount the geo router under /api (router prefix defines /geo)
app.include_router(geo_router, prefix="/api")

