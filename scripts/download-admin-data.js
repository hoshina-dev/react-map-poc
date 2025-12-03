#!/usr/bin/env node

/**
 * Downloads Natural Earth admin boundaries data
 *
 * Usage:
 *   node scripts/download-admin-data.js
 */

const fs = require("fs");
const path = require("path");
const https = require("https");
const { execSync } = require("child_process");

const DATA_URL = "https://naturalearth.s3.amazonaws.com/10m_cultural/ne_10m_admin_1_states_provinces.zip"
  // "https://www.naturalearthdata.com/http//www.naturalearthdata.com/download/10m/cultural/ne_10m_admin_1_states_provinces.zip";

const RAW_DIR = path.join(process.cwd(), "raw");
const ZIP_FILE = path.join(RAW_DIR, "ne_10m_admin_1_states_provinces.zip");
const EXTRACT_DIR = path.join(RAW_DIR, "ne_10m_admin_1_states_provinces");

console.log("Downloading Natural Earth Admin Boundaries Data\n");

// Ensure raw directory exists
if (!fs.existsSync(RAW_DIR)) {
  fs.mkdirSync(RAW_DIR, { recursive: true });
}

/**
 * Download a file, following all redirects recursively.
 */
function downloadWithRedirects(url, dest, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 10) {
      return reject(new Error("Too many redirects"));
    }

      https
        .get(url, (response) => {
        // Redirect (301 / 302 / 307 / 308)
        if (
          response.statusCode >= 300 &&
          response.statusCode < 400 &&
          response.headers.location
        ) {
          console.log(`[Redirect] → ${response.headers.location}`);
          return downloadWithRedirects(
            response.headers.location,
            dest,
            redirectCount + 1
          )
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200) {
          return reject(
            new Error(`Request failed with status ${response.statusCode}`)
          );
        }

        const contentType = response.headers["content-type"] || "";
        if (contentType.includes("text/html")) {
          // Save HTML response for debugging
          const htmlPath = `${dest}.html`;
          const htmlStream = fs.createWriteStream(htmlPath);
          response.pipe(htmlStream);
          htmlStream.on("finish", () => {
            htmlStream.close();
            return reject(
              new Error(
                `Server returned HTML instead of a ZIP. Saved response to ${htmlPath}`
              )
            );
          });
          return;
        }

        const file = fs.createWriteStream(dest);
        const totalSize = parseInt(response.headers["content-length"], 10);
        let downloaded = 0;
        let hasSize = !isNaN(totalSize);

        response.on("data", (chunk) => {
          downloaded += chunk.length;

          if (hasSize) {
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            process.stdout.write(
              `\rProgress: ${percent}% (${(downloaded / 1024 / 1024).toFixed(
                2
              )} MB / ${(totalSize / 1024 / 1024).toFixed(2)} MB)`
            );
          } else {
            process.stdout.write(
              `\rDownloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`
            );
          }
        });

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          console.log("\n✓ Download complete\n");
          resolve();
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

/**
 * Try to extract a ZIP file to a destination directory.
 * Tries system `unzip`, then PowerShell on Windows, then Node `unzipper`.
 */
async function extractZip(zipPath, destDir) {
  // Try system unzip first (works on macOS / Linux)
  try {
    execSync(`unzip -q "${zipPath}" -d "${destDir}"`, { stdio: "inherit" });
    console.log(`✓ Extracted to: ${destDir}\n`);
    return;
  } catch (err) {
    console.warn("System `unzip` failed, trying platform-specific fallbacks...");
  }

  // On Windows, try PowerShell Expand-Archive
  if (process.platform === "win32") {
    try {
      const psCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
      execSync(`powershell -NoProfile -Command "${psCmd}"`, { stdio: "inherit" });
      console.log(`✓ Extracted with PowerShell to: ${destDir}\n`);
      return;
    } catch (err) {
      console.warn("PowerShell Expand-Archive failed, trying Node fallback...");
    }
  }

  // Node fallback using `unzipper` package
  try {
    const unzipper = require("unzipper");
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Extract({ path: destDir }))
        .on("close", resolve)
        .on("error", reject);
    });
    console.log(`✓ Extracted with unzipper to: ${destDir}\n`);
    return;
  } catch (err) {
    console.error("All extraction methods failed.");
    console.error("Install the `unzip` system tool, or add the `unzipper` package:");
    console.error("  npm install --save-dev unzipper");
    throw err;
  }
}

async function main() {
  // Check if already downloaded
  if (fs.existsSync(ZIP_FILE)) {
    console.log("ZIP file already exists, skipping download\n");
  } else {
    console.log(`Downloading from:\n${DATA_URL}\n`);
    await downloadWithRedirects(DATA_URL, ZIP_FILE);
  }

  // Extract Step
  console.log("Extracting files...");

  if (fs.existsSync(EXTRACT_DIR)) {
    console.log(`Removing old extraction directory: ${EXTRACT_DIR}`);
    fs.rmSync(EXTRACT_DIR, { recursive: true, force: true });
  }

  fs.mkdirSync(EXTRACT_DIR, { recursive: true });

  try {
    await extractZip(ZIP_FILE, EXTRACT_DIR);
  } catch (err) {
    console.error("Extraction failed:", err.message || err);
    process.exit(1);
  }

  // Verify shapefile exists
  const shpFile = path.join(
    EXTRACT_DIR,
    "ne_10m_admin_1_states_provinces.shp"
  );

  if (!fs.existsSync(shpFile)) {
    console.error("Shapefile not found after extraction!");
    process.exit(1);
  }

  console.log("Download and extraction complete!");
  console.log("\nNext step:");
  console.log("   node scripts/setup-admin-boundaries.js");
}

main().catch((err) => {
  console.error("\nError:", err.message);
  process.exit(1);
});
