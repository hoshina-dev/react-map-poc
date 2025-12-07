#!/usr/bin/env node

/**
 * remove-geo-files.js
 *
 * Usage:
 *   # Dry-run (show files that would be removed):
 *   node scripts/remove-geo-files.js --mode json --dry
 *
 *   # Actually delete all .json files under public/geo:
 *   node scripts/remove-geo-files.js --mode json
 *
 *   # Delete all .json.gz files instead:
 *   node scripts/remove-geo-files.js --mode gz
 *
 * This script only operates inside the `public/geo` directory and will
 * recursively remove matching files. Use with caution. Recommended to
 * run with `--dry` first.
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.findIndex(a => a === name || a.startsWith(name + '='));
  if (idx === -1) return undefined;
  const val = args[idx];
  if (val.includes('=')) return val.split('=')[1];
  const next = args[idx + 1];
  if (!next) return undefined;
  return next;
};

const mode = (getArg('--mode') || getArg('-m') || 'json').toLowerCase();
const dry = args.includes('--dry') || args.includes('-d');

if (!['json', 'gz'].includes(mode)) {
  console.error('Invalid mode. Use --mode json OR --mode gz');
  process.exit(2);
}

const ROOT = path.join(process.cwd(), 'public', 'geo');
if (!fs.existsSync(ROOT) || !fs.statSync(ROOT).isDirectory()) {
  console.error('Directory not found: public/geo');
  process.exit(3);
}

const ext = mode === 'json' ? '.json' : '.json.gz';

function findFiles(dir) {
  const out = [];
  const items = fs.readdirSync(dir);
  for (const it of items) {
    const p = path.join(dir, it);
    try {
      const st = fs.statSync(p);
      if (st.isDirectory()) {
        out.push(...findFiles(p));
      } else if (st.isFile() && p.endsWith(ext)) {
        out.push(p);
      }
    } catch (err) {
      // ignore permission errors
    }
  }
  return out;
}

const files = findFiles(ROOT);
if (files.length === 0) {
  console.log(`No files with extension ${ext} found under public/geo`);
  process.exit(0);
}

console.log(`${dry ? '[dry-run]' : '[deleting]'} Found ${files.length} file(s) to ${dry ? 'report' : 'remove'}:`);
files.forEach(f => console.log('  ', path.relative(process.cwd(), f)));

if (dry) {
  console.log('\nDry run complete. No files were deleted.');
  process.exit(0);
}

let removed = 0;
for (const f of files) {
  try {
    fs.unlinkSync(f);
    removed += 1;
  } catch (err) {
    console.error('Failed to remove', f, err.message);
  }
}

console.log(`\nDone. Removed ${removed} file(s).`);

// Exit
process.exit(0);
