#!/usr/bin/env node
/**
 * Polyfill React.cache for React 18 + Next.js 15 compatibility.
 * Next.js 15 uses React.cache() internally (e.g. in encryption.js),
 * but React.cache was only introduced in React 19.
 * Also patches react-server-dom-webpack proxy handlers to allow .propTypes access
 * (React 18 RSC runtime accesses .propTypes on client module proxies).
 * Run via: npm run postinstall (or node scripts/patch-react-cache.js)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// --- Patch 1: React.cache polyfill ---
const reactIndexPath = path.join(__dirname, '..', 'node_modules', 'react', 'index.js');

try {
  const content = fs.readFileSync(reactIndexPath, 'utf8');

  if (!content.includes('Polyfill React.cache')) {
    const polyfill = `
// Polyfill React.cache for Next.js 15 compatibility (React 18 does not have cache)
if (typeof module.exports.cache !== 'function') {
  module.exports.cache = function cache(fn) { return fn; };
}
`;
    fs.writeFileSync(reactIndexPath, content + polyfill, 'utf8');
    console.log('✓ React.cache polyfill applied successfully');
  } else {
    console.log('✓ React.cache polyfill already applied');
  }
} catch (err) {
  console.warn('⚠ Could not patch React.cache:', err.message);
}

// --- Patch 2: propTypes proxy handler fix ---
// React 18 RSC proxy throws "Cannot access X.propTypes on the server"
// because the proxy handler switch doesn't include "propTypes" as an allowed case.
// We add it next to "defaultProps".
const nextCompiledDir = path.join(__dirname, '..', 'node_modules', 'next', 'dist', 'compiled');
const dirsToScan = [
  'react-server-dom-webpack',
  'react-server-dom-turbopack',
  'react-server-dom-turbopack-experimental',
];

let patchedCount = 0;
for (const dir of dirsToScan) {
  const cjsDir = path.join(nextCompiledDir, dir, 'cjs');
  if (!fs.existsSync(cjsDir)) continue;

  const files = fs.readdirSync(cjsDir).filter(f => f.endsWith('.js'));
  for (const file of files) {
    const filePath = path.join(cjsDir, file);
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('case "defaultProps"') && !content.includes('case "propTypes"')) {
        content = content.replace(
          /case "defaultProps":/g,
          'case "propTypes":\n              return;\n            case "defaultProps":'
        );
        fs.writeFileSync(filePath, content, 'utf8');
        patchedCount++;
      }
    } catch (e) {
      // skip files we can't read/write
    }
  }
}

if (patchedCount > 0) {
  console.log(`✓ Patched propTypes proxy handler in ${patchedCount} files`);
} else {
  console.log('✓ propTypes proxy handler already patched (or not needed)');
}

// --- Patch 3: Bundled runtime files (app-page*.runtime.*.js) ---
// These are the actual files loaded by Next.js dev server, containing minified copies
const runtimeDir = path.join(nextCompiledDir, 'next-server');
let runtimePatchCount = 0;
if (fs.existsSync(runtimeDir)) {
  const runtimeFiles = fs.readdirSync(runtimeDir).filter(f => f.startsWith('app-page') && f.endsWith('.js'));
  for (const file of runtimeFiles) {
    const filePath = path.join(runtimeDir, file);
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('case"defaultProps":case"toJSON":return') && !content.includes('case"propTypes":case"defaultProps"')) {
        content = content.replace(
          /case"defaultProps":case"toJSON":return/g,
          'case"propTypes":case"defaultProps":case"toJSON":return'
        );
        fs.writeFileSync(filePath, content, 'utf8');
        runtimePatchCount++;
      }
    } catch (e) {}
  }
}
if (runtimePatchCount > 0) {
  console.log(`✓ Patched propTypes in ${runtimePatchCount} bundled runtime files`);
} else {
  console.log('✓ Bundled runtime files already patched (or not needed)');
}
