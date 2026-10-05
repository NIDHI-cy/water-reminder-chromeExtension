/**
 * Max's Water Reminder - Manifest & Configuration Validation Tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_SETTINGS } from '../shared/constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

test('Manifest V3 Schema Validation', () => {
  const manifestPath = path.join(rootDir, 'manifest.json');
  assert.ok(fs.existsSync(manifestPath), 'manifest.json must exist');

  const content = fs.readFileSync(manifestPath, 'utf-8');
  const manifest = JSON.parse(content);

  assert.equal(manifest.manifest_version, 3, 'Must be Manifest V3');
  assert.equal(manifest.name, "Max's Water Reminder", 'Name must match');
  assert.ok(manifest.version, 'Must specify version');
  assert.ok(manifest.description, 'Must specify description');

  // Verify background worker
  assert.ok(manifest.background?.service_worker, 'Background service worker must be specified');
  const bgPath = path.join(rootDir, manifest.background.service_worker);
  assert.ok(fs.existsSync(bgPath), `Background worker file must exist at ${bgPath}`);
  assert.equal(manifest.background.type, 'module', 'Background worker should be ES module');

  // Verify popup
  assert.ok(manifest.action?.default_popup, 'Action default_popup must be specified');
  const popupPath = path.join(rootDir, manifest.action.default_popup);
  assert.ok(fs.existsSync(popupPath), `Popup HTML file must exist at ${popupPath}`);

  // Verify content scripts
  assert.ok(Array.isArray(manifest.content_scripts), 'content_scripts array must exist');
  for (const cs of manifest.content_scripts) {
    for (const js of cs.js) {
      const csPath = path.join(rootDir, js);
      assert.ok(fs.existsSync(csPath), `Content script file must exist at ${csPath}`);
    }
  }

  // Verify icons
  for (const size of [16, 32, 48, 128]) {
    const iconRelPath = manifest.icons?.[size] || manifest.action?.default_icon?.[size];
    assert.ok(iconRelPath, `Icon for size ${size} must be configured`);
    const iconAbsPath = path.join(rootDir, iconRelPath);
    assert.ok(fs.existsSync(iconAbsPath), `Icon file must exist: ${iconAbsPath}`);
  }

  // Verify web accessible resources
  assert.ok(Array.isArray(manifest.web_accessible_resources), 'web_accessible_resources must exist');
  const avatarPath = path.join(rootDir, 'assets', 'characters', 'max-avatar.svg');
  assert.ok(fs.existsSync(avatarPath), 'Max avatar SVG must exist');
});

test('Production vs Development Defaults Validation', () => {
  assert.equal(
    DEFAULT_SETTINGS.isDevMode,
    false,
    'Production default must NOT have isDevMode enabled'
  );
  assert.equal(
    DEFAULT_SETTINGS.prodIntervalMinutes,
    30,
    'Production interval must be 30 minutes'
  );
  assert.equal(
    DEFAULT_SETTINGS.devIntervalMinutes,
    1,
    'Development interval must be 1 minute'
  );
  assert.equal(
    DEFAULT_SETTINGS.sessionGapThresholdMinutes,
    20,
    'Session inactivity gap threshold must be 20 minutes'
  );
});
