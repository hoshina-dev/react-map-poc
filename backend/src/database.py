import os
import json
import gzip
import re

# Compute project root and public/geo path relative to this file.
# backend/src/database.py => project root is two levels up
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BASE_DATA_DIR = os.path.join(PROJECT_ROOT, 'public', 'geo')


def world_file_path() -> str:
	p = os.path.join(BASE_DATA_DIR, 'world-110m.json')
	if os.path.exists(p):
		return p
	raise FileNotFoundError('world file not found in public/geo')


def admin_file_path(country: str) -> str:
	# Normalize country name: lowercase, replace non-alphanum with dash, trim dashes
	key = country.lower()
	key = ''.join([c if c.isalnum() else '-' for c in key])
	key = re.sub(r'-+', '-', key).strip('-')

	base = os.path.join(BASE_DATA_DIR, 'admin-by-country')
	p = os.path.join(base, f"{key}-admin.json")
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


def clean_geojson(data: dict) -> dict:
	"""
	Clean GeoJSON data to keep only essential properties (name and geometry).
	This reduces payload size significantly.
	Also adds sequential IDs to features for MapLibre feature matching.
	"""	
	if data.get('type') == 'FeatureCollection' and 'features' in data:
		cleaned_features = []
		for i, feat in enumerate(data['features']):
			props = feat.get('properties', {})
			
			# Extract name from various possible fields
			name = (
				props.get('name') or
				props.get('name_en') or
				props.get('NAME') or
				props.get('admin') or
				props.get('NAME_EN') or
				props.get('name_long') or
				props.get('brk_name') or
				props.get('formal_en') or
				props.get('gn_name') or
				'Unknown'
			)
			
			cleaned_feature = {
				'type': feat.get('type'),
				'id': i,  # Add sequential ID for feature matching
				'geometry': feat.get('geometry'),
				'properties': {'name': name}
			}
			
			cleaned_features.append(cleaned_feature)
		
		return {
			'type': 'FeatureCollection',
			'features': cleaned_features
		}
	
	return data