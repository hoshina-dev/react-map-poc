#!/usr/bin/env node
/**
 * Extract a single country from world TopoJSON file
 * Usage: node extract-country.js <country-name> [output-file] [source-file]
 * Example: node extract-country.js "United States"
 * Example: node extract-country.js France france.json world-50m.json
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node extract-country.js <country-name> [output-file] [source-file]');
  console.error('Example: node extract-country.js "United States"');
  console.error('Example: node extract-country.js France france.json world-50m.json');
  process.exit(1);
}

const countryName = args[0];
const outputFile = args[1] || `${countryName.toLowerCase().replace(/\s+/g, '-')}.json`;
const sourceFile = args[2] || 'world-50m.json';
const PUBLIC_GEO = path.join(process.cwd(), 'public', 'geo');
const worldFile = path.join(PUBLIC_GEO, sourceFile);

if (!fs.existsSync(worldFile)) {
  console.error(`Source file not found: ${worldFile}`);
  console.error(`Available files in public/geo:`);
  const files = fs.readdirSync(PUBLIC_GEO);
  files.forEach(f => console.error(`  - ${f}`));
  process.exit(1);
}

// Read world TopoJSON
const worldData = JSON.parse(fs.readFileSync(worldFile, 'utf8'));

// Find the country geometries by name
const allGeometries = worldData.objects.countries.geometries;
const countryGeometries = allGeometries.filter(geo => {
  const name = geo.properties.name;
  return name && name.toLowerCase() === countryName.toLowerCase();
});

if (countryGeometries.length === 0) {
  console.error(`Country "${countryName}" not found`);
  console.error(`\nAvailable countries (first 20):`);
  allGeometries.slice(0, 20).forEach(geo => {
    console.error(`  - ${geo.properties.name}`);
  });
  console.error(`\nTry: node scripts/extract-country.js "United States"`);
  process.exit(1);
}

// Collect all arc indices used by this country
const arcIndices = new Set();
countryGeometries.forEach(geo => {
  const collectArcs = (geom) => {
    if (geom.type === 'Polygon') {
      geom.arcs.forEach(ring => ring.forEach(idx => arcIndices.add(Math.abs(idx))));
    } else if (geom.type === 'MultiPolygon') {
      geom.arcs.forEach(polygon => 
        polygon.forEach(ring => ring.forEach(idx => arcIndices.add(Math.abs(idx))))
      );
    }
  };
  
  if (geo.type === 'GeometryCollection') {
    geo.geometries.forEach(collectArcs);
  } else {
    collectArcs(geo);
  }
});

// Create arc index mapping (old index -> new index)
const sortedArcs = Array.from(arcIndices).sort((a, b) => a - b);
const arcMapping = new Map();
sortedArcs.forEach((oldIdx, newIdx) => arcMapping.set(oldIdx, newIdx));

// Remap geometry arcs to new indices
const remapGeometries = (geometries) => {
  return geometries.map(geo => {
    const remapArcs = (geom) => {
      if (geom.type === 'Polygon') {
        return {
          ...geom,
          arcs: geom.arcs.map(ring => 
            ring.map(idx => {
              const sign = idx < 0 ? -1 : 1;
              const absIdx = Math.abs(idx);
              const newIdx = arcMapping.get(absIdx);
              return newIdx !== undefined ? sign * newIdx : idx;
            })
          )
        };
      } else if (geom.type === 'MultiPolygon') {
        return {
          ...geom,
          arcs: geom.arcs.map(polygon =>
            polygon.map(ring =>
              ring.map(idx => {
                const sign = idx < 0 ? -1 : 1;
                const absIdx = Math.abs(idx);
                const newIdx = arcMapping.get(absIdx);
                return newIdx !== undefined ? sign * newIdx : idx;
              })
            )
          )
        };
      }
      return geom;
    };

    if (geo.type === 'GeometryCollection') {
      return {
        ...geo,
        geometries: geo.geometries.map(remapArcs)
      };
    }
    return remapArcs(geo);
  });
};

// Extract only the arcs we need
const extractedArcs = sortedArcs.map(idx => worldData.arcs[idx]);

// Create new TopoJSON with remapped arcs
const countryTopoJSON = {
  type: 'Topology',
  objects: {
    country: {
      type: 'GeometryCollection',
      geometries: remapGeometries(countryGeometries)
    }
  },
  arcs: extractedArcs,
  transform: worldData.transform,
  bbox: worldData.bbox
};

// Write output
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'geo', 'countries');
const outputPath = path.join(OUTPUT_DIR, outputFile);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(countryTopoJSON));

const outputSize = fs.statSync(outputPath).size;
const originalSize = fs.statSync(worldFile).size;
console.log(`✓ Extracted ${countryGeometries[0].properties.name}`);
console.log(`  Output: ${outputFile} (${(outputSize / 1024).toFixed(1)} KB)`);
console.log(`  Arcs: ${extractedArcs.length} of ${worldData.arcs.length} (${((extractedArcs.length / worldData.arcs.length) * 100).toFixed(1)}%)`);
console.log(`  Size reduction: ${((1 - outputSize / originalSize) * 100).toFixed(1)}%`);

