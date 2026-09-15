import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPng(width, height, drawFn) {
  // RGBA buffer
  const stride = width * 4;
  const rawData = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (stride + 1);
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  function createChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcVal = crc32(Buffer.concat([typeBuf, data]));
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal >>> 0, 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Simple CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return crc ^ 0xffffffff;
}

// Icon rendering functions
function drawFieldPulse(isMaskable) {
  return (x, y, w, h) => {
    // normalized coords [-1, 1]
    const nx = (x / w) * 2 - 1;
    const ny = (y / h) * 2 - 1;

    // Maskable has no outer rounded corner clipping; standard has soft corner clip
    const r = Math.sqrt(nx * nx + ny * ny);
    if (!isMaskable) {
      // Rounded rect check (radius ~ 0.22)
      const absX = Math.abs(nx);
      const absY = Math.abs(ny);
      if (absX > 0.96 || absY > 0.96) {
        return [0, 0, 0, 0]; // transparent
      }
      if (absX > 0.74 && absY > 0.74) {
        const dx = absX - 0.74;
        const dy = absY - 0.74;
        if (dx * dx + dy * dy > 0.22 * 0.22) {
          return [0, 0, 0, 0];
        }
      }
    }

    // Scale inner elements if maskable to preserve 15% safe zone
    const scale = isMaskable ? 0.75 : 0.9;
    const sx = nx / scale;
    const sy = ny / scale;

    // Background gradient: #0f172a (15, 23, 42) to #1e293b (30, 41, 59)
    const bgT = (ny + 1) * 0.5;
    let bgR = Math.round(15 + (30 - 15) * bgT);
    let bgG = Math.round(23 + (41 - 23) * bgT);
    let bgB = Math.round(42 + (59 - 42) * bgT);

    // Shield outline: top crown at sy = -0.55 to sy = 0.55, sx = -0.45 to sx = 0.45
    // Top border: sy = -0.55 + |sx| * 0.15
    // Bottom point: sy = 0.55, tapering from sx=0.45 at sy=0.0 to sx=0 at sy=0.55
    let inShield = false;
    let inShieldBorder = false;

    if (sy >= -0.55 && sy <= 0.55 && Math.abs(sx) <= 0.48) {
      const topY = -0.55 + Math.abs(sx) * 0.2;
      let maxY = 0.15;
      if (sy > 0.0) {
        // Curve to point at (0, 0.55)
        const t = (sy - 0.0) / 0.55;
        const maxW = 0.48 * (1 - t * t);
        if (Math.abs(sx) <= maxW && sy >= topY) {
          inShield = true;
          // Check border thickness
          if (Math.abs(sx) > maxW - 0.06 || sy < topY + 0.06 || (0.55 - sy) < 0.06) {
            inShieldBorder = true;
          }
        }
      } else if (sy >= topY) {
        inShield = true;
        if (Math.abs(sx) > 0.42 || sy < topY + 0.06) {
          inShieldBorder = true;
        }
      }
    }

    if (inShieldBorder) {
      // Golden Amber shield border: #f59e0b (245, 158, 11)
      return [245, 158, 11, 255];
    }

    // Inside Shield: Dark Slate #1e293b
    if (inShield) {
      bgR = 30;
      bgG = 41;
      bgB = 59;
    }

    // Pulse EHS waveform inside shield
    // Path points roughly:
    // (-0.35, 0.0) -> (-0.15, 0.0) -> (-0.06, -0.22) -> (0.06, 0.22) -> (0.15, -0.08) -> (0.22, 0.0) -> (0.35, 0.0)
    function distToSegment(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
      if (l2 === 0) return Math.hypot(px - x1, py - y1);
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    }

    const segments = [
      [-0.35, 0.0, -0.15, 0.0],
      [-0.15, 0.0, -0.06, -0.24],
      [-0.06, -0.24, 0.06, 0.24],
      [0.06, 0.24, 0.15, -0.08],
      [0.15, -0.08, 0.22, 0.0],
      [0.22, 0.0, 0.35, 0.0],
    ];

    let minDist = 999;
    for (const [x1, y1, x2, y2] of segments) {
      const d = distToSegment(sx, sy, x1, y1, x2, y2);
      if (d < minDist) minDist = d;
    }

    // Line thickness ~ 0.038
    if (minDist < 0.038) {
      // Emerald Pulse: #10b981 (16, 185, 129)
      return [16, 185, 129, 255];
    }

    // Center official verification dot
    const dotDist = Math.hypot(sx, sy);
    if (dotDist < 0.045) {
      // Sky blue node #38bdf8
      return [56, 189, 248, 255];
    }

    return [bgR, bgG, bgB, 255];
  };
}

const pubDir = path.resolve('public');
if (!fs.existsSync(pubDir)) {
  fs.mkdirSync(pubDir, { recursive: true });
}

// 192x192
console.log('Generating pwa-192x192.png...');
const p192 = createPng(192, 192, drawFieldPulse(false));
fs.writeFileSync(path.join(pubDir, 'pwa-192x192.png'), p192);

// 512x512
console.log('Generating pwa-512x512.png...');
const p512 = createPng(512, 512, drawFieldPulse(false));
fs.writeFileSync(path.join(pubDir, 'pwa-512x512.png'), p512);

// 512x512 maskable
console.log('Generating pwa-maskable-512x512.png...');
const pMaskable = createPng(512, 512, drawFieldPulse(true));
fs.writeFileSync(path.join(pubDir, 'pwa-maskable-512x512.png'), pMaskable);

// 180x180 apple touch icon
console.log('Generating apple-touch-icon.png...');
const pApple = createPng(180, 180, drawFieldPulse(false));
fs.writeFileSync(path.join(pubDir, 'apple-touch-icon.png'), pApple);

// 32x32 favicon
console.log('Generating favicon.ico...');
const pFav = createPng(32, 32, drawFieldPulse(false));
fs.writeFileSync(path.join(pubDir, 'favicon.ico'), pFav);

console.log('All PWA icons generated successfully!');
