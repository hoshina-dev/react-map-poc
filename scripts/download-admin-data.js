#!/usr/bin/env node

/**
 * Downloads Natural Earth admin boundaries data
 * 
 * Usage:
 *   node scripts/download-admin-data.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DATA_URL = 'https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_1_states_provinces.zip';
const ZIP_FILE = 'raw/ne_10m_admin_1_states_provinces.zip';
const EXTRACT_DIR = 'raw/ne_10m_admin_1_states_provinces';

console.log('Downloading Natural Earth Admin Boundaries Data\n');

// Create raw directory if it doesn't exist
if (!fs.existsSync('raw')) {
  fs.mkdirSync('raw', { recursive: true });
}

// Download file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    console.log(`Downloading from: ${url}`);
    console.log(`Saving to: ${dest}\n`);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return https.get(response.headers.location, (redirectResponse) => {
          const totalSize = parseInt(redirectResponse.headers['content-length'], 10);
          let downloaded = 0;
          
          redirectResponse.on('data', (chunk) => {
            downloaded += chunk.length;
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            process.stdout.write(`\rProgress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
          });
          
          redirectResponse.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log('\n✓ Download complete\n');
            resolve();
          });
        }).on('error', (err) => {
          fs.unlink(dest, () => {});
          reject(err);
        });
      } else {
        const totalSize = parseInt(response.headers['content-length'], 10);
        let downloaded = 0;
        
        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const percent = ((downloaded / totalSize) * 100).toFixed(1);
          process.stdout.write(`\rProgress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('\n✓ Download complete\n');
          resolve();
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  // Check if already downloaded
  if (fs.existsSync(ZIP_FILE)) {
    console.log('ZIP file already exists, skipping download\n');
  } else {
    await downloadFile(DATA_URL, ZIP_FILE);
  }
  
  // Extract
  console.log('Extracting files...');
  
  if (fs.existsSync(EXTRACT_DIR)) {
    console.log(`Removing old extraction directory: ${EXTRACT_DIR}`);
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  }
  
  fs.mkdirSync(EXTRACT_DIR, { recursive: true });
  
  try {
    // Use unzip command (available on macOS and most Linux)
    execSync(`unzip -q "${ZIP_FILE}" -d "${EXTRACT_DIR}"`, { stdio: 'inherit' });
    console.log(`✓ Extracted to: ${EXTRACT_DIR}\n`);
  } catch (err) {
    console.error('❌ Failed to extract. Please extract manually.');
    console.error(`   ZIP file: ${ZIP_FILE}`);
    console.error(`   Extract to: ${EXTRACT_DIR}`);
    process.exit(1);
  }
  
  // Verify shapefile exists
  const shpFile = path.join(EXTRACT_DIR, 'ne_10m_admin_1_states_provinces.shp');
  if (!fs.existsSync(shpFile)) {
    console.error('Shapefile not found after extraction!');
    process.exit(1);
  }
  
  console.log('Download and extraction complete!');
  console.log('\nNext step:');
  console.log('   node scripts/setup-admin-boundaries.js');
}

main().catch(err => {
  console.error('\nError:', err.message);
  process.exit(1);
});
