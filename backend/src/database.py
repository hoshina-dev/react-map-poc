import os
import json

# Compute project root and public/geo path relative to this file.
# backend/src/database.py => project root is two levels up
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE_DATA_DIR = os.path.join(PROJECT_ROOT, 'public', 'geo')


def world_file_path() -> str:
	candidates = [
		os.path.join(BASE_DATA_DIR, 'world-110m.json'),
		os.path.join(BASE_DATA_DIR, 'world-110m.topojson'),
		os.path.join(BASE_DATA_DIR, 'world-110m.geojson'),
	]
	for p in candidates:
		if os.path.exists(p):
			return p
	raise FileNotFoundError('world file not found in public/geo')


def admin_file_path(country: str) -> str:
	# sanitize country key
	key = country.replace('..', '')
	p = os.path.join(BASE_DATA_DIR, 'admin-by-country', f"{key}-admin.json")
	if os.path.exists(p):
		return p
	raise FileNotFoundError(f'admin file not found for {country}')


def list_admin_countries() -> list[str]:
	d = os.path.join(BASE_DATA_DIR, 'admin-by-country')
	if not os.path.isdir(d):
		return []
	out = []
	for fn in os.listdir(d):
		if fn.endswith('-admin.json'):
			out.append(fn.replace('-admin.json', ''))
	return sorted(out)


def read_json_sync(path: str):
	with open(path, 'rb') as fh:
		return json.load(fh)


def get_base_data_dir() -> str:
	return BASE_DATA_DIR