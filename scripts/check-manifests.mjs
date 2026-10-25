#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const APPS = [
  'apps/mylauncher',
  'apps/mycheck',
  'apps/stokis',
  'apps/mycustomer',
  'apps/myperformance',
  'packages/shared',
];

async function validateManifests() {
  console.log('🔍 Validating app manifests...\n');

  const manifests = new Map();
  const errors = [];

  // Load all manifests
  for (const appPath of APPS) {
    const manifestPath = path.join(rootDir, appPath, 'app.manifest.json');

    if (!fs.existsSync(manifestPath)) {
      errors.push(`❌ Missing app.manifest.json in ${appPath}`);
      continue;
    }

    try {
      const content = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(content);

      if (!manifest.name) {
        errors.push(`❌ ${appPath}: Missing 'name' field`);
        continue;
      }

      // Check for duplicate names
      if (manifests.has(manifest.name)) {
        errors.push(`❌ Duplicate app name: '${manifest.name}' in ${appPath}`);
        continue;
      }

      manifests.set(manifest.name, { path: appPath, manifest });
    } catch (e) {
      errors.push(`❌ Invalid JSON in ${appPath}/app.manifest.json: ${e.message}`);
    }
  }

  // Validate dependencies exist
  for (const [name, { path: appPath, manifest }] of manifests) {
    if (manifest.depends && Array.isArray(manifest.depends)) {
      for (const dep of manifest.depends) {
        if (dep === '@mochikin/shared') {
          if (!manifests.has('shared')) {
            errors.push(`❌ ${appPath}: depends on @mochikin/shared but 'shared' not found in registry`);
          }
        } else if (!manifests.has(dep)) {
          errors.push(`❌ ${appPath}: depends on unknown app '${dep}'`);
        }
      }
    }
  }

  // Check for circular dependencies
  function hasCycle(startApp, visited = new Set(), path = []) {
    if (visited.has(startApp)) {
      return path.includes(startApp);
    }

    visited.add(startApp);
    path.push(startApp);

    const { manifest } = manifests.get(startApp) || {};
    if (manifest?.depends && Array.isArray(manifest.depends)) {
      for (const dep of manifest.depends) {
        const depName = dep === '@mochikin/shared' ? 'shared' : dep;
        if (hasCycle(depName, new Set(visited), [...path])) {
          return true;
        }
      }
    }

    return false;
  }

  for (const name of manifests.keys()) {
    if (hasCycle(name)) {
      errors.push(`❌ Circular dependency detected involving '${name}'`);
    }
  }

  // Report results
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    console.error(`\n❌ Validation failed with ${errors.length} error(s)\n`);
    process.exit(1);
  }

  console.log(`✅ All ${manifests.size} manifests valid`);
  console.log(`✅ No circular dependencies detected`);
  console.log(`✅ All dependencies resolved\n`);
  process.exit(0);
}

validateManifests().catch((e) => {
  console.error('❌ Unexpected error:', e.message);
  process.exit(1);
});
