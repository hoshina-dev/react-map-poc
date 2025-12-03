#!/usr/bin/env node

/**
 * Checks whether admin-by-country data exists; if not, downloads and sets it up.
 * Then runs verify-setup to show status/warnings.
 *
 * Usage:
 *   node scripts/check-and-download.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function existsDir(p) {
  try {
    return fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch (e) {
    return false;
  }
}

function hasJsonFiles(dir) {
  try {
    if (!existsDir(dir)) return false;
    const files = fs.readdirSync(dir);
    return files.some((f) => f.toLowerCase().endsWith('.json'));
  } catch (e) {
    return false;
  }
}

async function main() {
  const adminDir = path.join('public', 'geo', 'admin-by-country');
  const rawDir = path.join('raw', 'ne_10m_admin_1_states_provinces');

  const hasAdminJson = hasJsonFiles(adminDir);
  const hasRaw = existsDir(rawDir);

  if (hasAdminJson) {
    console.log('✅ Admin-by-country JSON files present; no download required.');
  } else if (hasRaw) {
    console.log('⚠ Raw shapefile data present but `public/geo/admin-by-country` missing. Running setup step to convert data...');
    try {
      execSync('node scripts/setup-admin-boundaries.js', { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Failed to run setup-admin-boundaries.js', err.message || err);
      process.exit(1);
    }
  } else {
    console.log('⚠ Admin boundaries not present. Attempting to download and set them up now...');
    try {
      execSync('node scripts/download-admin-data.js', { stdio: 'inherit' });
      execSync('node scripts/setup-admin-boundaries.js', { stdio: 'inherit' });
    } catch (err) {
      console.error('❌ Download or setup failed:', err.message || err);
      console.error('You can run `node scripts/download-admin-data.js` manually for more detail.');
      process.exit(1);
    }
  }

  // Run verification (will print warnings; do not fail here)
  try {
    execSync('node scripts/verify-setup.js', { stdio: 'inherit' });
  } catch (err) {
    // verify-setup exits non-zero for missing required files — bubble up
    process.exit(err.status || 1);
  }
}

main();
