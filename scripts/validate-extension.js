/**
 * Duck's Water Reminder - Extension Validator
 * Validates manifest.json, directory structure, files, and configuration before packaging.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let errors = 0;
let warnings = 0;

function logPass(msg) {
  console.log(`\x1b[32m✔ PASS:\x1b[0m ${msg}`);
}

function logFail(msg) {
  console.error(`\x1b[31m✖ FAIL:\x1b[0m ${msg}`);
  errors++;
}

console.log('--- Validating Duck\'s Water Reminder Chrome Extension ---');

// 1. Manifest
const manifestPath = path.join(rootDir, 'manifest.json');
if (!fs.existsSync(manifestPath)) {
  logFail('manifest.json does not exist!');
  process.exit(1);
}

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  logPass('manifest.json is valid JSON');
} catch (e) {
  logFail(`manifest.json JSON syntax error: ${e.message}`);
  process.exit(1);
}

if (manifest.manifest_version !== 3) {
  logFail(`manifest_version must be 3, found: ${manifest.manifest_version}`);
} else {
  logPass('manifest_version is 3');
}

// 2. Service Worker
if (!manifest.background?.service_worker) {
  logFail('manifest background.service_worker missing');
} else {
  const swPath = path.join(rootDir, manifest.background.service_worker);
  if (fs.existsSync(swPath)) {
    logPass(`Service worker exists at ${manifest.background.service_worker}`);
  } else {
    logFail(`Service worker file NOT found: ${swPath}`);
  }
}

// 3. Popup
if (!manifest.action?.default_popup) {
  logFail('manifest action.default_popup missing');
} else {
  const popPath = path.join(rootDir, manifest.action.default_popup);
  if (fs.existsSync(popPath)) {
    logPass(`Popup HTML exists at ${manifest.action.default_popup}`);
  } else {
    logFail(`Popup HTML NOT found: ${popPath}`);
  }
}

// 4. Icons
const iconSizes = [16, 32, 48, 128];
for (const size of iconSizes) {
  const iconRel = manifest.icons?.[size];
  if (!iconRel) {
    logFail(`Icon size ${size} not specified in manifest.icons`);
  } else {
    const iconAbs = path.join(rootDir, iconRel);
    if (fs.existsSync(iconAbs)) {
      logPass(`Icon ${size}x${size} exists (${iconRel})`);
    } else {
      logFail(`Icon ${size}x${size} NOT found: ${iconAbs}`);
    }
  }
}

// 5. Content Scripts
for (const cs of manifest.content_scripts || []) {
  for (const js of cs.js || []) {
    const csAbs = path.join(rootDir, js);
    if (fs.existsSync(csAbs)) {
      logPass(`Content script exists: ${js}`);
    } else {
      logFail(`Content script NOT found: ${csAbs}`);
    }
  }
}

// 6. Duck Sprite
const duckPng = path.join(rootDir, 'assets', 'characters', 'duck.png');
if (fs.existsSync(duckPng)) {
  logPass('Duck character sprite exists: assets/characters/duck.png');
} else {
  logFail('Duck character sprite NOT found: assets/characters/duck.png');
}

// 7. Verify 30-Minute Interval
import('../shared/constants.js').then(({ DEFAULT_SETTINGS }) => {
  if (DEFAULT_SETTINGS.intervalMinutes === 30) {
    logPass('Reminder interval is set to exactly 30 minutes');
  } else {
    logFail(`Reminder interval is ${DEFAULT_SETTINGS.intervalMinutes}m, expected 30m`);
  }

  console.log('\n--- Summary ---');
  console.log(`Passed with ${errors} errors and ${warnings} warnings.`);
  if (errors > 0) {
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ Extension is 100% valid and ready to load into Chrome!\x1b[0m');
  }
});
