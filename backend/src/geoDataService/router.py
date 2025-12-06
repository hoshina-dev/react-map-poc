from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse, Response
import os
import aiofiles

from backend.src import database
from .utils import read_json_sync, compute_bbox_from_feature_collection
from .constants import GEO_MEDIA_TYPE
from .schemas import MetaResponse, AdminListResponse

router = APIRouter(prefix="/geo")


async def read_bytes(path: str) -> bytes:
    async with aiofiles.open(path, 'rb') as f:
        return await f.read()


@router.get("/world")
async def get_world():
    try:
        p = database.world_file_path()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="world geo file not found")

    gz = p + '.gz'
    if os.path.exists(gz):
        content = await read_bytes(gz)
        return Response(content=content, media_type=GEO_MEDIA_TYPE, headers={"Content-Encoding": "gzip"})

    try:
        data = read_json_sync(p)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/{country}")
async def get_admin(country: str):
    try:
        p = database.admin_file_path(country)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="admin geo file not found")

    gz = p + '.gz'
    if os.path.exists(gz):
        content = await read_bytes(gz)
        return Response(content=content, media_type=GEO_MEDIA_TYPE, headers={"Content-Encoding": "gzip"})

    try:
        data = read_json_sync(p)
        return JSONResponse(content=data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/meta/world", response_model=MetaResponse)
async def meta_world() -> JSONResponse:
    try:
        p = database.world_file_path()
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="world geo file not found")
    info: dict[str, str | int | list | None] = {"path": os.path.relpath(p, database.get_base_data_dir()), "size": os.path.getsize(p)}
    try:
        data = read_json_sync(p)
        if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
            info['featureCount'] = len(data.get('features', []))
            bbox = compute_bbox_from_feature_collection(data)
            if bbox:
                info['bbox'] = bbox
        else:
            info['featureCount'] = None
    except Exception:
        pass
    return JSONResponse(content=info)


@router.get("/meta/admin/{country}", response_model=MetaResponse)
async def meta_admin(country: str) -> JSONResponse:
    try:
        p = database.admin_file_path(country)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="admin geo file not found")
    info: dict[str, str | int | list | None] = {"path": os.path.relpath(p, database.get_base_data_dir()), "size": os.path.getsize(p)}
    try:
        data = read_json_sync(p)
        if isinstance(data, dict) and data.get('type') == 'FeatureCollection':
            info['featureCount'] = len(data.get('features', []))
            bbox = compute_bbox_from_feature_collection(data)
            if bbox:
                info['bbox'] = bbox
        else:
            info['featureCount'] = None
    except Exception:
        pass
    return JSONResponse(content=info)


@router.get("/list/admins", response_model=AdminListResponse)
async def list_admins():
    countries = database.list_admin_countries()
    return JSONResponse(content={"countries": countries})
