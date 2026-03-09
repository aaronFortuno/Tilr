/**
 * Packaging script for Tilr browser extension.
 * Creates a clean ZIP file ready for Chrome Web Store upload.
 *
 * Usage: node scripts/package.js
 * Output: dist/tilr-<version>.zip
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;
const distDir = join(ROOT, 'dist');
const zipPath = join(distDir, `tilr-${version}.zip`);

// Files and directories to include in the package
const INCLUDE = [
  'manifest.json',
  'popup/',
  'background/',
  'lib/',
  '_locales/',
  'icons/icon16.png',
  'icons/icon48.png',
  'icons/icon128.png',
  'LICENSE',
];

// Collect all files to package
function collectFiles() {
  const files = [];

  for (const entry of INCLUDE) {
    const fullPath = join(ROOT, entry);

    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walkDir(fullPath, files);
      } else {
        files.push(fullPath);
      }
    } catch (_e) {
      console.warn(`Warning: ${entry} not found, skipping`);
    }
  }

  return files;
}

function walkDir(dir, files) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkDir(full, files);
    } else {
      files.push(full);
    }
  }
}

// Minimal ZIP writer (store method, no compression needed for small files)
function createZip(files, outputPath) {
  const entries = [];

  for (const filePath of files) {
    const relPath = relative(ROOT, filePath).replace(/\\/g, '/');
    const data = readFileSync(filePath);
    entries.push({ name: relPath, data });
  }

  const buffers = [];
  const centralDir = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuffer = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const size = entry.data.length;

    // Local file header
    const local = Buffer.alloc(30 + nameBuffer.length);
    local.writeUInt32LE(0x04034b50, 0);   // signature
    local.writeUInt16LE(20, 4);            // version needed
    local.writeUInt16LE(0, 6);             // flags
    local.writeUInt16LE(0, 8);             // compression: store
    local.writeUInt16LE(0, 10);            // mod time
    local.writeUInt16LE(0, 12);            // mod date
    local.writeUInt32LE(crc, 14);          // crc-32
    local.writeUInt32LE(size, 18);         // compressed size
    local.writeUInt32LE(size, 22);         // uncompressed size
    local.writeUInt16LE(nameBuffer.length, 26); // name length
    local.writeUInt16LE(0, 28);            // extra length
    nameBuffer.copy(local, 30);

    buffers.push(local, entry.data);

    // Central directory entry
    const central = Buffer.alloc(46 + nameBuffer.length);
    central.writeUInt32LE(0x02014b50, 0);  // signature
    central.writeUInt16LE(20, 4);          // version made by
    central.writeUInt16LE(20, 6);          // version needed
    central.writeUInt16LE(0, 8);           // flags
    central.writeUInt16LE(0, 10);          // compression: store
    central.writeUInt16LE(0, 12);          // mod time
    central.writeUInt16LE(0, 14);          // mod date
    central.writeUInt32LE(crc, 16);        // crc-32
    central.writeUInt32LE(size, 20);       // compressed size
    central.writeUInt32LE(size, 24);       // uncompressed size
    central.writeUInt16LE(nameBuffer.length, 28); // name length
    central.writeUInt16LE(0, 30);          // extra length
    central.writeUInt16LE(0, 32);          // comment length
    central.writeUInt16LE(0, 34);          // disk start
    central.writeUInt16LE(0, 36);          // internal attrs
    central.writeUInt32LE(0, 38);          // external attrs
    central.writeUInt32LE(offset, 42);     // local header offset
    nameBuffer.copy(central, 46);

    centralDir.push(central);
    offset += local.length + entry.data.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const c of centralDir) {
    buffers.push(c);
    centralDirSize += c.length;
  }

  // End of central directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);       // signature
  eocd.writeUInt16LE(0, 4);                // disk number
  eocd.writeUInt16LE(0, 6);                // central dir disk
  eocd.writeUInt16LE(entries.length, 8);   // entries on disk
  eocd.writeUInt16LE(entries.length, 10);  // total entries
  eocd.writeUInt32LE(centralDirSize, 12);  // central dir size
  eocd.writeUInt32LE(centralDirOffset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20);              // comment length
  buffers.push(eocd);

  const zip = Buffer.concat(buffers);
  mkdirSync(distDir, { recursive: true });
  writeFileSync(outputPath, zip);
  return zip.length;
}

// CRC-32 implementation
function crc32(buf) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// --- Main ---

const files = collectFiles();
console.log(`Packaging Tilr v${version}...`);
console.log(`Files to include: ${files.length}`);

for (const f of files) {
  console.log(`  ${relative(ROOT, f).replace(/\\/g, '/')}`);
}

const size = createZip(files, zipPath);
console.log(`\nCreated: dist/tilr-${version}.zip (${(size / 1024).toFixed(1)} KB)`);
console.log('Ready for Chrome Web Store upload!');
