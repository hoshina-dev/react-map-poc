#!/usr/bin/env node

/**
 * Complete setup script for admin boundaries data
 * 
 * This script:
 * 1. Converts Natural Earth shapefile directly to TopoJSON
 * 2. Splits the TopoJSON into individual country files
 * 3. Cleans up intermediate files
 * 
 * Prerequisites:
 * - Download and extract ne_10m_admin_1_states_provinces.zip from Natural Earth
 * - Place the extracted folder in the raw/ directory
 * 
 * Usage:
 *   node scripts/setup-admin-boundaries.js
 */

const fs = require('fs');
const path = require('path');
const shapefile = require('shapefile');
const topojson = require('topojson-server');
const { feature } = require('topojson-client');

// Paths
const SHAPEFILE_PATH = 'raw/ne_10m_admin_1_states_provinces/ne_10m_admin_1_states_provinces.shp';
const TEMP_TOPOJSON = 'public/geo/ne_10m_admin_1_states_provinces.json';
const OUTPUT_DIR = 'public/geo/admin-by-country';

console.log('🌍 Admin Boundaries Setup Script\n');

// Check if shapefile exists
if (!fs.existsSync(SHAPEFILE_PATH)) {
  console.error('❌ Shapefile not found!');
  console.error(`   Expected: ${SHAPEFILE_PATH}`);
  console.error('\n📥 Download instructions:');
  console.error('   1. Visit: https://www.naturalearthdata.com/downloads/10m-cultural-vectors/');
  console.error('   2. Download: ne_10m_admin_1_states_provinces.zip');
  console.error('   3. Extract to: raw/ne_10m_admin_1_states_provinces/');
  process.exit(1);
}

async function main() {
  console.log('Step 1: Converting shapefile to TopoJSON...');
  console.log(`  Reading: ${SHAPEFILE_PATH}`);
  
  // Read shapefile and convert directly to TopoJSON
  const features = [];
  await shapefile.read(SHAPEFILE_PATH)
    .then(geojson => {
      features.push(...geojson.features);
    });
  
  console.log(`  Found ${features.length} features`);
  
  // Create GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection',
    features: features
  };
  
  console.log('  Converting to TopoJSON...');
  const topology = topojson.topology(
    { states: geojson },
    { 'property-transform': (feature) => feature.properties }
  );
  
  // Ensure directory exists
  const tempDir = path.dirname(TEMP_TOPOJSON);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  console.log(`  Writing: ${TEMP_TOPOJSON}`);
  fs.writeFileSync(TEMP_TOPOJSON, JSON.stringify(topology));
  
  const fileSize = fs.statSync(TEMP_TOPOJSON).size;
  console.log(`  ✓ Created TopoJSON: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Step 2: Split by country
  console.log('Step 2: Splitting into country files...');
  
  const geoJSON = feature(topology, topology.objects.states);
  console.log(`  Total features: ${geoJSON.features.length}`);
  
  // Group by country
  const byCountry = {};
  geoJSON.features.forEach(f => {
    const country = (f.properties.admin || '').trim().replace(/\0/g, '');
    if (!country || country === 'Antarctica') return;
    
    if (!byCountry[country]) {
      byCountry[country] = [];
    }
    byCountry[country].push(f);
  });
  
  // Create output directory
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const countries = Object.keys(byCountry).sort();
  console.log(`  Splitting into ${countries.length} country files...`);
  
  let saved = 0;
  let totalSize = 0;
  
  countries.forEach(country => {
    const countryFeatures = byCountry[country];
    const countryGeoJSON = {
      type: 'FeatureCollection',
      features: countryFeatures
    };
    
    // Convert to TopoJSON
    const countryTopo = topojson.topology(
      { states: countryGeoJSON },
      { 'property-transform': (feature) => feature.properties }
    );
    
    // Create filename
    const filename = country.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-admin.json';
    
    const outputPath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(outputPath, JSON.stringify(countryTopo));
    
    const size = fs.statSync(outputPath).size;
    totalSize += size;
    saved++;
    
    if (saved <= 5 || saved % 50 === 0) {
      console.log(`    [${saved}/${countries.length}] ${country}: ${countryFeatures.length} states, ${(size/1024).toFixed(1)} KB`);
    }
  });
  
  console.log(`  ✓ Saved ${saved} country files`);
  console.log(`  Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB\n`);
  
  // Step 3: Clean up
  console.log('Step 3: Cleaning up...');
  console.log(`  Removing temporary file: ${TEMP_TOPOJSON}`);
  fs.unlinkSync(TEMP_TOPOJSON);
  console.log('  ✓ Cleanup complete\n');
  
  // Show largest files
  console.log('📊 Top 10 largest country files:');
  const files = fs.readdirSync(OUTPUT_DIR)
    .map(f => ({
      name: f,
      size: fs.statSync(path.join(OUTPUT_DIR, f)).size
    }))
    .sort((a, b) => b.size - a.size);
  
  files.slice(0, 10).forEach((f, i) => {
    console.log(`  ${i + 1}. ${f.name}: ${(f.size/1024/1024).toFixed(2)} MB`);
  });
  
  console.log('\n✅ Setup complete! Admin boundaries ready to use.');
}

main().catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
