"""Utilities for geo data server-side: bbox computation and safe IO."""
from typing import Any
import os
import json


def read_json_sync(path: str) -> Any:
    with open(path, 'rb') as fh:
        return json.load(fh)


def extract_coords_from_geometry(geom: dict) -> list[tuple[float, float]]:
    coords = []
    if not geom:
        return coords
    t = geom.get('type')
    c = geom.get('coordinates')
    if not isinstance(c, list):
        return coords
    if t == 'Point':
        return [(c[0], c[1])]
    if t in ('MultiPoint', 'LineString'):
        return [(x[0], x[1]) for x in c]
    if t in ('MultiLineString', 'Polygon'):
        for part in c:
            for p in part:
                coords.append((p[0], p[1]))
        return coords
    if t == 'MultiPolygon':
        for poly in c:
            for ring in poly:
                for p in ring:
                    coords.append((p[0], p[1]))
        return coords
    if t == 'GeometryCollection':
        for g in geom.get('geometries', []):
            coords.extend(extract_coords_from_geometry(g))
        return coords
    return coords


def compute_bbox_from_feature_collection(fc: dict) -> list[float] | None:
    if not fc or 'features' not in fc:
        return None
    minx = miny = float('inf')
    maxx = maxy = float('-inf')
    seen = False
    for feature in fc.get('features', []):
        geom = feature.get('geometry')
        if not geom:
            continue
        for (lng, lat) in extract_coords_from_geometry(geom):
            seen = True
            if lng < minx:
                minx = lng
            if lng > maxx:
                maxx = lng
            if lat < miny:
                miny = lat
            if lat > maxy:
                maxy = lat
    if not seen:
        return None
    return [minx, miny, maxx, maxy]


def file_size(path: str) -> int:
    try:
        return os.path.getsize(path)
    except Exception:
        return 0
