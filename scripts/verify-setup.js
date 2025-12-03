#!/usr/bin/env node

/**
 * Verifies the project setup and data files
 * 
 * Usage:
 *   node scripts/verify-setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying World Map POC Setup\n');


const world110Path = 'public/geo/world-110m.json';
const world50Path = 'public/geo/world-50m.json';

const checks = [
  {
    name: 'Admin boundaries directory',
    path: 'public/geo/admin-by-country',
    required: false,
    type: 'directory',
    setupCmd: 'node scripts/download-admin-data.js && node scripts/setup-admin-boundaries.js'
  },
  {
    name: 'Raw data directory',
    path: 'raw/ne_10m_admin_1_states_provinces',
    required: false,
    type: 'directory',
    setupCmd: 'node scripts/download-admin-data.js'
  }
];


let allPassed = true;
let needsSetup = false;

// Check for at least one world map file
const has110 = fs.existsSync(world110Path) && fs.statSync(world110Path).isFile();
const has50 = fs.existsSync(world50Path) && fs.statSync(world50Path).isFile();

if (has110 || has50) {
  if (has110) {
    const size = fs.statSync(world110Path).size;
    console.log(`✓ World map (110m) present\n  Size: ${(size / 1024).toFixed(1)} KB`);
  }
  if (has50) {
    const size = fs.statSync(world50Path).size;
    console.log(`✓ World map (50m) present\n  Size: ${(size / 1024).toFixed(1)} KB`);
  }
} else {
  console.log('✗ World map (110m or 50m) - MISSING (REQUIRED)');
  console.log('  At least one of these files must exist:');
  console.log(`    - ${world110Path}`);
  console.log(`    - ${world50Path}`);
  allPassed = false;
}

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const isCorrectType = exists && (
    (check.type === 'file' && fs.statSync(check.path).isFile()) ||
    (check.type === 'directory' && fs.statSync(check.path).isDirectory())
  );
  if (exists && isCorrectType) {
    console.log(`✓ ${check.name}`);
    if (check.type === 'directory') {
      const files = fs.readdirSync(check.path).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        console.log(`  Files: ${files.length}`);
      }
    }
  } else {
    console.log(`⚠ ${check.name} - Not set up (optional)`);
    if (check.setupCmd) {
      console.log(`  Run: ${check.setupCmd}`);
    }
    needsSetup = true;
  }
  console.log();
});

// Check node_modules
if (fs.existsSync('node_modules')) {
  console.log('✓ Dependencies installed\n');
} else {
  console.log('✗ Dependencies not installed');
  console.log('  Run: npm install\n');
  allPassed = false;
}

// Summary
console.log('─'.repeat(50));
if (allPassed && !needsSetup) {
  console.log('\n✅ All systems ready! Run: npm run dev\n');
} else if (allPassed) {
  console.log('\n⚠️  Basic setup complete, but admin boundaries not set up');
  console.log('   The app will work but only show country boundaries.');
  console.log('\n   To enable state/province boundaries:');
  console.log('   1. node scripts/download-admin-data.js');
  console.log('   2. node scripts/setup-admin-boundaries.js\n');
} else {
  console.log('\n❌ Setup incomplete. Please fix the issues above.\n');
  process.exit(1);
}
