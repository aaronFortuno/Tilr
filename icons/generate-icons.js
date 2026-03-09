/**
 * Generates Tilr extension icons (16, 48, 128px).
 * Design: rounded rectangle background with a 2x2 grid of tiles,
 * representing the window-tiling concept.
 *
 * Uses raw PNG generation with zlib (no external dependencies).
 * Run: node icons/generate-icons.js
 */

import { writeFileSync } from 'fs';
import { deflateSync } from 'zlib';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function createPNG(width, height, pixels) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT chunk
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0; // filter: none
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = y * (1 + width * 4) + 1 + x * 4;
      rawData[dstIdx] = pixels[srcIdx];     // R
      rawData[dstIdx + 1] = pixels[srcIdx + 1]; // G
      rawData[dstIdx + 2] = pixels[srcIdx + 2]; // B
      rawData[dstIdx + 3] = pixels[srcIdx + 3]; // A
    }
  }
  const compressed = deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function generateIcon(size) {
  const pixels = Buffer.alloc(size * size * 4);

  // Colors
  const bg = { r: 45, g: 55, b: 72 };        // Dark slate background
  const tile1 = { r: 74, g: 144, b: 217 };    // Blue (top-left)
  const tile2 = { r: 72, g: 199, b: 142 };    // Green (top-right)
  const tile3 = { r: 237, g: 137, b: 54 };    // Orange (bottom-left)
  const tile4 = { r: 159, g: 122, b: 234 };   // Purple (bottom-right)
  const tileColors = [tile1, tile2, tile3, tile4];

  const cornerRadius = Math.round(size * 0.18);
  const padding = Math.max(1, Math.round(size * 0.12));
  const gap = Math.max(1, Math.round(size * 0.06));
  const tileRadius = Math.max(1, Math.round(size * 0.06));

  // Inner area for tiles
  const innerLeft = padding;
  const innerTop = padding;
  const innerW = size - padding * 2;
  const innerH = size - padding * 2;

  const halfW = Math.floor((innerW - gap) / 2);
  const halfH = Math.floor((innerH - gap) / 2);

  // Tile rectangles [x, y, w, h]
  const tiles = [
    [innerLeft, innerTop, halfW, halfH],
    [innerLeft + halfW + gap, innerTop, innerW - halfW - gap, halfH],
    [innerLeft, innerTop + halfH + gap, halfW, innerH - halfH - gap],
    [innerLeft + halfW + gap, innerTop + halfH + gap, innerW - halfW - gap, innerH - halfH - gap],
  ];

  function isInRoundedRect(px, py, rx, ry, rw, rh, r) {
    if (px < rx || px >= rx + rw || py < ry || py >= ry + rh) return false;
    // Check corners
    const corners = [
      [rx + r, ry + r],
      [rx + rw - r, ry + r],
      [rx + r, ry + rh - r],
      [rx + rw - r, ry + rh - r],
    ];
    for (const [cx, cy] of corners) {
      const inCornerRegion =
        (px < rx + r || px >= rx + rw - r) &&
        (py < ry + r || py >= ry + rh - r);
      if (inCornerRegion && distance(px, py, cx, cy) > r) {
        return false;
      }
    }
    return true;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;

      // Check if in background rounded rect
      if (!isInRoundedRect(x, y, 0, 0, size, size, cornerRadius)) {
        pixels[idx] = 0;
        pixels[idx + 1] = 0;
        pixels[idx + 2] = 0;
        pixels[idx + 3] = 0; // Transparent
        continue;
      }

      // Check if in any tile
      let inTile = false;
      for (let t = 0; t < 4; t++) {
        const [tx, ty, tw, th] = tiles[t];
        if (isInRoundedRect(x, y, tx, ty, tw, th, tileRadius)) {
          const c = tileColors[t];
          pixels[idx] = c.r;
          pixels[idx + 1] = c.g;
          pixels[idx + 2] = c.b;
          pixels[idx + 3] = 255;
          inTile = true;
          break;
        }
      }

      if (!inTile) {
        // Background
        pixels[idx] = bg.r;
        pixels[idx + 1] = bg.g;
        pixels[idx + 2] = bg.b;
        pixels[idx + 3] = 255;
      }
    }
  }

  return createPNG(size, size, pixels);
}

// Generate all sizes
for (const size of [16, 48, 128]) {
  const png = generateIcon(size);
  const path = join(__dirname, `icon${size}.png`);
  writeFileSync(path, png);
  console.log(`Generated ${path} (${png.length} bytes)`);
}
