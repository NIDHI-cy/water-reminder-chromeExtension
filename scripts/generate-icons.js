/**
 * Pure Node.js script to generate PNG icons and avatar using built-in node:zlib
 * No external dependencies required!
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function makeChunk(type, dataBuffer) {
  const lengthBuf = Buffer.alloc(4);
  lengthBuf.writeUInt32BE(dataBuffer.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, dataBuffer]);

  // zlib.crc32 is available in Node 22
  const crcNum = zlib.crc32(body);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcNum >>> 0, 0);

  return Buffer.concat([lengthBuf, body, crcBuf]);
}

function createPng(width, height, rgbaBuffer) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // Deflate
  ihdrData.writeUInt8(0, 11); // Filter 0
  ihdrData.writeUInt8(0, 12); // No interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT
  const scanlineLen = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLen);
  for (let y = 0; y < height; y++) {
    const rawOffset = y * scanlineLen;
    rawData[rawOffset] = 0; // Filter: None
    rgbaBuffer.copy(rawData, rawOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  const compressed = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Pixel drawing helpers
class PixelCanvas {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.buffer = Buffer.alloc(width * height * 4); // RGBA initialized to 0
  }

  setPixel(x, y, r, g, b, a = 255) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
    const idx = (Math.floor(y) * this.width + Math.floor(x)) * 4;
    // Alpha blending with existing pixel
    const srcA = a / 255;
    const dstA = this.buffer[idx + 3] / 255;
    const outA = srcA + dstA * (1 - srcA);

    if (outA > 0) {
      this.buffer[idx] = Math.round((r * srcA + this.buffer[idx] * dstA * (1 - srcA)) / outA);
      this.buffer[idx + 1] = Math.round((g * srcA + this.buffer[idx + 1] * dstA * (1 - srcA)) / outA);
      this.buffer[idx + 2] = Math.round((b * srcA + this.buffer[idx + 2] * dstA * (1 - srcA)) / outA);
      this.buffer[idx + 3] = Math.round(outA * 255);
    }
  }

  fillCircle(cx, cy, radius, r, g, b, a = 255) {
    const r2 = radius * radius;
    const minX = Math.max(0, Math.floor(cx - radius));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + radius));
    const minY = Math.max(0, Math.floor(cy - radius));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + radius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 <= r2) {
          // Antialiased edge
          const edgeDist = radius - Math.sqrt(d2);
          const alpha = edgeDist < 1 ? Math.max(0, Math.min(1, edgeDist)) * a : a;
          this.setPixel(x, y, r, g, b, alpha);
        }
      }
    }
  }

  strokeCircle(cx, cy, radius, thickness, r, g, b, a = 255) {
    const halfThick = thickness / 2;
    const minR = radius - halfThick;
    const maxR = radius + halfThick;
    const minR2 = minR * minR;
    const maxR2 = maxR * maxR;

    const minX = Math.max(0, Math.floor(cx - maxR));
    const maxX = Math.min(this.width - 1, Math.ceil(cx + maxR));
    const minY = Math.max(0, Math.floor(cy - maxR));
    const maxY = Math.min(this.height - 1, Math.ceil(cy + maxR));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 >= minR2 && d2 <= maxR2) {
          this.setPixel(x, y, r, g, b, a);
        }
      }
    }
  }

  fillRect(x1, y1, w, h, r, g, b, a = 255) {
    for (let y = y1; y < y1 + h; y++) {
      for (let x = x1; x < x1 + w; x++) {
        this.setPixel(x, y, r, g, b, a);
      }
    }
  }

  toPngBuffer() {
    return createPng(this.width, this.height, this.buffer);
  }
}

// Generate the Retro Water Drop Icon
function renderWaterDropIcon(size) {
  const canvas = new PixelCanvas(size, size);
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128; // scale factor

  // Outer dark synth circular badge
  canvas.fillCircle(cx, cy, 60 * s, 18, 12, 34, 255); // deep purple-black
  // Neon cyan/magenta glowing border
  canvas.strokeCircle(cx, cy, 58 * s, 3.5 * s, 255, 0, 127, 255); // Neon pink
  canvas.strokeCircle(cx, cy, 55 * s, 1.5 * s, 0, 245, 212, 220); // Neon cyan inner glow

  // Headphone band arch
  for (let angle = Math.PI * 0.9; angle <= Math.PI * 2.1; angle += 0.02) {
    const hx = cx + Math.cos(angle) * (38 * s);
    const hy = cy - (10 * s) + Math.sin(angle) * (34 * s);
    canvas.fillCircle(hx, hy, 3 * s, 255, 84, 0, 240); // Orange-pink band
  }

  // Headphone foam pads (Left & Right)
  const padW = 9 * s;
  const padH = 18 * s;
  canvas.fillRect(cx - 40 * s, cy - 2 * s, padW, padH, 255, 183, 3, 255); // Left yellow-orange pad
  canvas.fillRect(cx + 31 * s, cy - 2 * s, padW, padH, 255, 183, 3, 255); // Right pad

  // Water Drop Body (Bottom circle + top triangle tapering up)
  const dropRadius = 24 * s;
  const dropCenterY = cy + 14 * s;
  canvas.fillCircle(cx, dropCenterY, dropRadius, 0, 245, 212, 255); // Cyan base

  // Top taper of droplet
  const topY = cy - 20 * s;
  for (let y = topY; y < dropCenterY; y++) {
    const t = (y - topY) / (dropCenterY - topY);
    const halfWidth = Math.sin(t * Math.PI * 0.5) * dropRadius;
    for (let x = cx - halfWidth; x <= cx + halfWidth; x++) {
      // Gradient from light cyan at top to rich electric blue at bottom
      const r = Math.round(0 * (1 - t) + 30 * t);
      const g = Math.round(245 * (1 - t) + 160 * t);
      const b = Math.round(212 * (1 - t) + 245 * t);
      canvas.setPixel(x, y, r, g, b, 255);
    }
  }

  // Droplet Highlight (White reflection)
  if (size >= 32) {
    canvas.fillCircle(cx - 10 * s, dropCenterY - 6 * s, 4 * s, 255, 255, 255, 220);
    canvas.fillCircle(cx - 13 * s, dropCenterY + 4 * s, 2.5 * s, 255, 255, 255, 180);
  }

  // Cute face on droplet
  if (size >= 32) {
    // Left eye (wink curve)
    canvas.fillCircle(cx - 8 * s, dropCenterY + 4 * s, 2 * s, 12, 9, 20, 255);
    // Right eye (sparkle dot)
    canvas.fillCircle(cx + 8 * s, dropCenterY + 4 * s, 2.5 * s, 12, 9, 20, 255);
    canvas.fillCircle(cx + 9 * s, dropCenterY + 3 * s, 1 * s, 255, 255, 255, 255);
    // Cute smile
    canvas.fillCircle(cx, dropCenterY + 11 * s, 2 * s, 255, 0, 127, 240);
  }

  return canvas.toPngBuffer();
}

// Generate the Max Avatar Character PNG (128x128)
function renderMaxAvatar(size = 128) {
  const canvas = new PixelCanvas(size, size);
  const cx = size / 2;
  const cy = size / 2;
  const s = size / 128;

  // Background Synth circular badge
  canvas.fillCircle(cx, cy, 60 * s, 18, 12, 34, 255);
  // Outer Neon Rings
  canvas.strokeCircle(cx, cy, 59 * s, 2 * s, 255, 0, 127, 200); // Pink neon
  canvas.strokeCircle(cx, cy, 56 * s, 2.5 * s, 0, 245, 212, 255); // Cyan neon

  // Horizon warm glow
  canvas.fillCircle(cx, cy + 20 * s, 35 * s, 255, 0, 127, 45);

  // Back Red Hair Volume
  canvas.fillCircle(cx, cy - 8 * s, 36 * s, 193, 18, 31, 255); // Auburn base
  canvas.fillCircle(cx - 20 * s, cy + 14 * s, 18 * s, 225, 45, 30, 255); // Left hair strand
  canvas.fillCircle(cx + 20 * s, cy + 14 * s, 18 * s, 225, 45, 30, 255); // Right hair strand

  // Retro Skater Jacket (Navy with yellow and white stripe)
  canvas.fillCircle(cx, cy + 70 * s, 42 * s, 29, 53, 87, 255); // Navy jacket
  // Yellow chest stripe
  for (let x = cx - 35 * s; x <= cx + 35 * s; x++) {
    const y = cy + 38 * s + Math.abs(x - cx) * 0.2;
    canvas.fillCircle(x, y, 4 * s, 255, 183, 3, 255);
  }
  // Cyan zipper
  for (let y = cy + 28 * s; y < size - 5 * s; y++) {
    canvas.setPixel(cx, y, 0, 245, 212, 255);
    canvas.setPixel(cx + 1, y, 0, 245, 212, 255);
  }

  // Neck
  canvas.fillRect(cx - 7 * s, cy + 12 * s, 14 * s, 16 * s, 244, 181, 132, 255);

  // Face (Warm peach skin)
  canvas.fillCircle(cx, cy - 2 * s, 21 * s, 255, 223, 186, 255);

  // Cheeks (Rosy glow)
  canvas.fillCircle(cx - 13 * s, cy + 4 * s, 5 * s, 255, 0, 127, 75);
  canvas.fillCircle(cx + 13 * s, cy + 4 * s, 5 * s, 255, 0, 127, 75);

  // Freckles! (Signature Max feature)
  const freckles = [
    [-11, 2], [-8, 4], [-14, 5], [-7, 2],
    [11, 2], [8, 4], [14, 5], [7, 2]
  ];
  for (const [fx, fy] of freckles) {
    canvas.setPixel(cx + fx * s, cy + fy * s, 193, 18, 31, 220);
  }

  // Fiery Red Hair Bangs & Waves (Front framing)
  canvas.fillCircle(cx, cy - 22 * s, 20 * s, 255, 123, 0, 255); // Top bright orange-red
  canvas.fillCircle(cx - 15 * s, cy - 14 * s, 14 * s, 230, 57, 70, 255);
  canvas.fillCircle(cx + 15 * s, cy - 14 * s, 14 * s, 230, 57, 70, 255);

  // Eyes (Determined, cool blue eyes)
  canvas.fillCircle(cx - 9 * s, cy - 3 * s, 3.5 * s, 0, 180, 216, 255);
  canvas.fillCircle(cx - 9 * s, cy - 3 * s, 1.8 * s, 12, 9, 20, 255);
  canvas.setPixel(cx - 8 * s, cy - 4 * s, 255, 255, 255, 255); // highlight

  canvas.fillCircle(cx + 9 * s, cy - 3 * s, 3.5 * s, 0, 180, 216, 255);
  canvas.fillCircle(cx + 9 * s, cy - 3 * s, 1.8 * s, 12, 9, 20, 255);
  canvas.setPixel(cx + 10 * s, cy - 4 * s, 255, 255, 255, 255); // highlight

  // Playful confident smirk
  for (let x = cx - 6 * s; x <= cx + 6 * s; x++) {
    const t = (x - (cx - 6 * s)) / (12 * s);
    const y = cy + 10 * s + Math.sin(t * Math.PI) * (2 * s);
    canvas.setPixel(x, y, 160, 20, 40, 255);
  }

  // 80s Walkman Headphones on ears
  // Headband
  for (let angle = Math.PI * 0.95; angle <= Math.PI * 2.05; angle += 0.03) {
    const hx = cx + Math.cos(angle) * (26 * s);
    const hy = cy - (14 * s) + Math.sin(angle) * (22 * s);
    canvas.fillCircle(hx, hy, 2 * s, 200, 200, 200, 255); // Metallic band
  }
  // Foam Ear Pads (Orange Retro Pads)
  canvas.fillRect(cx - 28 * s, cy - 10 * s, 6 * s, 16 * s, 255, 123, 0, 255);
  canvas.fillRect(cx + 22 * s, cy - 10 * s, 6 * s, 16 * s, 255, 123, 0, 255);

  // Companion Water Droplet in lower right corner
  const wdx = cx + 32 * s;
  const wdy = cy + 24 * s;
  canvas.fillCircle(wdx, wdy, 9 * s, 0, 245, 212, 255);
  canvas.fillCircle(wdx - 3 * s, wdy - 3 * s, 3 * s, 255, 255, 255, 220);
  canvas.fillCircle(wdx - 2 * s, wdy + 1 * s, 1.2 * s, 10, 20, 40, 255);
  canvas.fillCircle(wdx + 2 * s, wdy + 1 * s, 1.2 * s, 10, 20, 40, 255);

  return canvas.toPngBuffer();
}

// Generate all assets
function run() {
  const iconDir = path.join(rootDir, 'assets', 'icons');
  const charDir = path.join(rootDir, 'assets', 'characters');

  fs.mkdirSync(iconDir, { recursive: true });
  fs.mkdirSync(charDir, { recursive: true });

  const sizes = [16, 32, 48, 128];
  for (const size of sizes) {
    const pngBuf = renderWaterDropIcon(size);
    const filePath = path.join(iconDir, `icon-${size}.png`);
    fs.writeFileSync(filePath, pngBuf);
    console.log(`Generated: assets/icons/icon-${size}.png (${pngBuf.length} bytes)`);
  }

  // Generate Max character avatar PNG
  const avatarBuf = renderMaxAvatar(128);
  const avatarPath = path.join(charDir, 'max-avatar.png');
  fs.writeFileSync(avatarPath, avatarBuf);
  console.log(`Generated: assets/characters/max-avatar.png (${avatarBuf.length} bytes)`);

  console.log('All PNG icons and avatar successfully generated!');
}

run();
