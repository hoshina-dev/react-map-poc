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

const checks = [
  {
    name: 'World map (110m)',
    path: 'public/geo/world-110m.json',
    required: true,
    type: 'file'
  },
  {
    name: 'World map (50m)',
    path: 'public/geo/world-50m.json',
    required: true,
    type: 'file'
  },
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

checks.forEach(check => {
  const exists = fs.existsSync(check.path);
  const isCorrectType = exists && (
    (check.type === 'file' && fs.statSync(check.path).isFile()) ||
    (check.type === 'directory' && fs.statSync(check.path).isDirectory())
  );
  
  if (check.required) {
    if (exists && isCorrectType) {
      console.log(`✓ ${check.name}`);
      if (check.type === 'file') {
        const size = fs.statSync(check.path).size;
        console.log(`  Size: ${(size / 1024).toFixed(1)} KB`);
      }
    } else {
      console.log(`✗ ${check.name} - MISSING (REQUIRED)`);
      console.log(`  Path: ${check.path}`);
      allPassed = false;
    }
  } else {
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
