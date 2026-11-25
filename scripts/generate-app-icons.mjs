import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

/**
 * Pure Node.js icon generator (zero native/OS binary dependencies)
 * Renders Lovely Talk's Cyber Rabbit neon mascot into crisp PNGs,
 * multi-resolution Windows .ico, and Android mipmap launcher icons.
 */

function clamp(v, min = 0, max = 255) {
  return v < min ? min : v > max ? max : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function sdfRoundedRect(px, py, cx, cy, hw, hh, r) {
  const qx = Math.abs(px - cx) - (hw - r);
  const qy = Math.abs(py - cy) - (hh - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdfEllipse(px, py, cx, cy, rx, ry, angleRad = 0) {
  const cos = Math.cos(-angleRad);
  const sin = Math.sin(-angleRad);
  const dx = px - cx;
  const dy = py - cy;
  const lx = dx * cos - dy * sin;
  const ly = dx * sin + dy * cos;
  const nx = lx / rx;
  const ny = ly / ry;
  const k0 = Math.hypot(nx, ny);
  if (k0 === 0) return -Math.min(rx, ry);
  const k1 = Math.hypot(lx / (rx * rx), ly / (ry * ry));
  return (k0 * (k0 - 1)) / k1;
}

function blendPixel(buf, idx, r, g, b, a) {
  if (a <= 0) return;
  const srcA = clamp(a, 0, 1);
  const dstA = buf[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  buf[idx] = Math.round((r * srcA + buf[idx] * dstA * (1 - srcA)) / outA);
  buf[idx + 1] = Math.round((g * srcA + buf[idx + 1] * dstA * (1 - srcA)) / outA);
  buf[idx + 2] = Math.round((b * srcA + buf[idx + 2] * dstA * (1 - srcA)) / outA);
  buf[idx + 3] = Math.round(outA * 255);
}

function renderCyberRabbitRgba(size, { transparentBg = false } = {}) {
  const buf = Buffer.alloc(size * size * 4);
  const scale = size / 512;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Normalized to 512x512 canvas space
      const px = (x + 0.5) / scale;
      const py = (y + 0.5) / scale;
      const idx = (y * size + x) * 4;

      // 1. Rounded dark-indigo gradient background + neon outer ring
      if (!transparentBg) {
        const bgDist = sdfRoundedRect(px, py, 256, 256, 248, 248, 108);
        const bgAlpha = 1 - smoothstep(-1.5, 1.5, bgDist);
        if (bgAlpha > 0) {
          const rad = Math.hypot(px - 256, py - 230) / 340;
          const t = clamp(rad, 0, 1);
          const r = lerp(76, 11, t);
          const g = lerp(10, 3, t);
          const b = lerp(122, 26, t);
          blendPixel(buf, idx, r, g, b, bgAlpha);

          // Neon border ring
          const ringDist = Math.abs(sdfRoundedRect(px, py, 256, 256, 232, 232, 94));
          const ringGlow = Math.exp(-(ringDist * ringDist) / 140) * 0.45;
          const ringCore = 1 - smoothstep(4.5, 7.5, ringDist);
          const gradT = clamp((px + py) / 1024, 0, 1);
          const rr = lerp(240, 56, gradT);
          const rg = lerp(171, 189, gradT);
          const rb = lerp(252, 248, gradT);
          blendPixel(buf, idx, rr, rg, rb, Math.min(1, ringGlow + ringCore * 0.92));
        }
      }

      // 2. Cyber Rabbit silhouette (union of left ear, right ear, and rounded head)
      const scaleBunny = transparentBg ? 0.8 : 1.0;
      const bx = (px - 256) / scaleBunny + 256;
      const by = (py - 256) / scaleBunny + 256;

      const dHead = sdfEllipse(bx, by, 256, 316, 124, 108, 0);
      const dLeftEar = sdfEllipse(bx, by, 200, 152, 34, 96, -0.22);
      const dRightEar = sdfEllipse(bx, by, 312, 152, 34, 96, 0.22);

      // Smooth minimum union
      const k = 18;
      const smin = (a, b) => {
        const h = Math.max(k - Math.abs(a - b), 0) / k;
        return Math.min(a, b) - h * h * k * 0.25;
      };
      const dBunny = smin(dHead, Math.min(dLeftEar, dRightEar));

      // Bunny interior fill
      const fillAlpha = 1 - smoothstep(-1.5, 1.5, dBunny);
      if (fillAlpha > 0) {
        blendPixel(buf, idx, 20, 7, 43, fillAlpha);
      }

      // Bunny neon outline + glow
      const outlineDist = Math.abs(dBunny);
      const glow = Math.exp(-(outlineDist * outlineDist) / 220) * 0.52;
      const stroke = 1 - smoothstep(5.5, 9.0, outlineDist);
      if (glow > 0.005 || stroke > 0) {
        blendPixel(buf, idx, 232, 121, 249, glow);
        blendPixel(buf, idx, 248, 218, 254, stroke);
      }

      // 3. Left X eye, Right X eye, and cute curved w/smile mouth
      const dLeftX1 = distToSegment(bx, by, 186, 294, 218, 326);
      const dLeftX2 = distToSegment(bx, by, 218, 294, 186, 326);
      const dRightX1 = distToSegment(bx, by, 294, 294, 326, 326);
      const dRightX2 = distToSegment(bx, by, 326, 294, 294, 326);

      // Smile arc segments
      const dMouth1 = distToSegment(bx, by, 240, 356, 256, 368);
      const dMouth2 = distToSegment(bx, by, 256, 368, 272, 356);

      const dFace = Math.min(dLeftX1, dLeftX2, dRightX1, dRightX2, dMouth1, dMouth2);
      const faceGlow = Math.exp(-(dFace * dFace) / 110) * 0.48;
      const faceStroke = 1 - smoothstep(4.5, 7.5, dFace);
      if (faceGlow > 0.005 || faceStroke > 0) {
        blendPixel(buf, idx, 232, 121, 249, faceGlow);
        blendPixel(buf, idx, 250, 232, 255, faceStroke);
      }
    }
  }

  return buf;
}

// --- Pure PNG Encoder ---
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type None
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Multi-resolution Windows .ICO Encoder (PNG-embedded frames, supported Windows Vista+) ---
function encodeIco(pngEntries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: ICO
  header.writeUInt16LE(pngEntries.length, 4);

  let offset = 6 + pngEntries.length * 16;
  const dirEntries = [];
  const payloads = [];

  for (const { size, png } of pngEntries) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0; // color palette
    entry[3] = 0; // reserved
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    payloads.push(png);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...payloads]);
}

function writePngIcon(outPath, size, options = {}) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const rgba = renderCyberRabbitRgba(size, options);
  const png = encodePng(size, size, rgba);
  fs.writeFileSync(outPath, png);
  return png;
}

function main() {
  const buildDir = path.join(ROOT, 'build-resources');
  fs.mkdirSync(buildDir, { recursive: true });

  // 1. Electron / Desktop master 512x512 PNG
  const png512 = writePngIcon(path.join(buildDir, 'icon.png'), 512);

  // 2. Public favicon / web icon
  fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'public', 'icon-512.png'), png512);

  // 3. Windows multi-size .ico (256, 128, 64, 48, 32, 24, 16)
  const icoSizes = [256, 128, 64, 48, 32, 24, 16];
  const icoFrames = icoSizes.map((size) => ({
    size,
    png: encodePng(size, size, renderCyberRabbitRgba(size)),
  }));
  const icoBuffer = encodeIco(icoFrames);
  fs.writeFileSync(path.join(buildDir, 'icon.ico'), icoBuffer);

  // 4. Android launcher mipmap icons (if android/ exists)
  const androidResDir = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');
  if (fs.existsSync(androidResDir)) {
    const densities = [
      { name: 'mipmap-mdpi', launcher: 48, foreground: 108 },
      { name: 'mipmap-hdpi', launcher: 72, foreground: 162 },
      { name: 'mipmap-xhdpi', launcher: 96, foreground: 216 },
      { name: 'mipmap-xxhdpi', launcher: 144, foreground: 324 },
      { name: 'mipmap-xxxhdpi', launcher: 192, foreground: 432 },
    ];
    for (const d of densities) {
      const targetDir = path.join(androidResDir, d.name);
      const launcherPng = writePngIcon(path.join(targetDir, 'ic_launcher.png'), d.launcher);
      fs.writeFileSync(path.join(targetDir, 'ic_launcher_round.png'), launcherPng);
      writePngIcon(path.join(targetDir, 'ic_launcher_foreground.png'), d.foreground, {
        transparentBg: true,
      });
    }
    console.log('[icons] Generated Android mipmap launcher icons in android/app/src/main/res');
  }

  console.log('[icons] Generated build-resources/icon.png, build-resources/icon.ico, public/icon-512.png');
}

main();
