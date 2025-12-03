const fs = require('fs');
const { feature } = require('topojson-client');

// Load world map
const world = JSON.parse(fs.readFileSync('public/geo/world-110m.json', 'utf8'));
const geo = feature(world, world.objects[Object.keys(world.objects)[0]]);

// Find Russia and Fiji
const russia = geo.features.find(f => f.properties?.name === 'Russia');
const fiji = geo.features.find(f => f.properties?.name === 'Fiji');

console.log('=== RUSSIA ===');
if (russia) {
  console.log('Type:', russia.geometry?.type);
  if (russia.geometry?.type === 'MultiPolygon') {
    console.log('Polygon count:', russia.geometry.coordinates.length);
    russia.geometry.coordinates.forEach((poly, i) => {
      const ring = poly[0];
      const lngs = ring.map(c => c[0]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      if (maxLng - minLng > 180) {
        console.log('Polygon', i, 'crosses antimeridian: lng range', minLng.toFixed(1), 'to', maxLng.toFixed(1));
      }
    });
  }
}

console.log('\n=== FIJI ===');
if (fiji) {
  console.log('Type:', fiji.geometry?.type);
  if (fiji.geometry?.type === 'MultiPolygon') {
    console.log('Polygon count:', fiji.geometry.coordinates.length);
    fiji.geometry.coordinates.forEach((poly, i) => {
      const ring = poly[0];
      const lngs = ring.map(c => c[0]);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      console.log('Polygon', i, ': lng range', minLng.toFixed(1), 'to', maxLng.toFixed(1));
      if (maxLng - minLng > 180) {
        console.log('  ^ CROSSES ANTIMERIDIAN');
      }
    });
  }
}

// Check all features for antimeridian issues
console.log('\n=== ALL ANTIMERIDIAN CROSSINGS ===');
geo.features.forEach(f => {
  const name = f.properties?.name;
  const geom = f.geometry;
  if (!geom) return;
  
  let coords = [];
  if (geom.type === 'Polygon') {
    coords = [geom.coordinates];
  } else if (geom.type === 'MultiPolygon') {
    coords = geom.coordinates;
  }
  
  coords.forEach((poly, i) => {
    const ring = poly[0];
    if (!ring) return;
    const lngs = ring.map(c => c[0]);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    if (maxLng - minLng > 180) {
      console.log(name, '- polygon', i, ': spans', (maxLng - minLng).toFixed(1), 'degrees');
    }
  });
});
