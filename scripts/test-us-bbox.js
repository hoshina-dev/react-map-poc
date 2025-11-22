const fs = require('fs');
const { feature } = require('topojson-client');
const turf = require('@turf/turf');

const data = JSON.parse(fs.readFileSync('public/geo/admin-by-country/united-states-of-america-admin.json', 'utf8'));
const geo = feature(data, data.objects[Object.keys(data.objects)[0]]);

console.log('Testing US date line crossing fix...');
const fullBbox = turf.bbox(geo);
console.log('Full bbox:', fullBbox);
console.log('Width:', fullBbox[2] - fullBbox[0]);

// Check all state centroids
console.log('\nAll state centroids:');
geo.features.forEach((f, i) => {
  const center = turf.bbox(f);
  const centerLng = center ? (center[0] + center[2]) / 2 : null;
  const name = f.properties?.name || `Feature ${i}`;
  console.log(`  ${name}: ${centerLng?.toFixed(2)}`);
});

if (fullBbox[2] - fullBbox[0] > 180) {
  console.log('\nCrosses date line, filtering...');
  
  // New logic: exclude features that cross date line AND outliers
  const mainFeatures = geo.features.filter(f => {
    try {
      const featureBbox = turf.bbox(f);
      if (!featureBbox) return false;
      
      const [fMinLng, , fMaxLng] = featureBbox;
      
      // Exclude features that themselves cross date line (span > 180°)
      if (fMaxLng - fMinLng > 180) {
        const name = f.properties?.name || 'Unknown';
        console.log(`  Excluding date-line crossing: ${name} [${fMinLng.toFixed(1)}, ${fMaxLng.toFixed(1)}]`);
        return false;
      }
      
      // Exclude features in extreme west (< -130, Alaska) or east (> 170, Pacific)
      const centerLng = (fMinLng + fMaxLng) / 2;
      if (centerLng < -130 || centerLng > 170) {
        const name = f.properties?.name || 'Unknown';
        console.log(`  Excluding outlier: ${name} at ${centerLng.toFixed(1)}°`);
        return false;
      }
      
      return true;
    } catch {
      return false;
    }
  });
  
  console.log('\nMain features count:', mainFeatures.length);
  
  if (mainFeatures.length > 0) {
    const mainBbox = turf.bbox({ type: 'FeatureCollection', features: mainFeatures });
    console.log('Main bbox:', mainBbox);
    console.log('Main width:', mainBbox[2] - mainBbox[0]);
    
    // Calculate what the code would set
    const [minLng, minLat, maxLng, maxLat] = mainBbox;
    const lngDiff = maxLng - minLng;
    const latDiff = maxLat - minLat;
    const centerLng = (minLng + maxLng) / 2;
    const centerLat = (minLat + maxLat) / 2;
    
    console.log('\nCalculated center:', [centerLng.toFixed(2), centerLat.toFixed(2)]);
    console.log('Is finite:', isFinite(centerLng), isFinite(centerLat));
    console.log('Dimensions:', lngDiff.toFixed(2), '° x', latDiff.toFixed(2), '°');
  }
}
