/** Remap the most frequent non-neutral pixels in a raster to primary / secondary / tertiary (by rank). */

const ALPHA_SKIP = 12;
const LUMA_LOW = 0.035;
const LUMA_HIGH = 0.965;
const QUANT_SHIFT = 4;
/** Max RGB Euclidean distance to treat a pixel as belonging to a source swatch. */
const REPLACE_MAX_DIST = 95;

function luma(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function parseHex(hex: string): { r: number; g: number; b: number } | null {
  const s = hex.trim();
  const m = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) {
    return null;
  }
  let h = m[1];
  if (h.length === 3) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  }
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function dist2(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

type Bucket = { count: number; sumR: number; sumG: number; sumB: number };

function quantKey(r: number, g: number, b: number): string {
  const qr = (r >> QUANT_SHIFT) << QUANT_SHIFT;
  const qg = (g >> QUANT_SHIFT) << QUANT_SHIFT;
  const qb = (b >> QUANT_SHIFT) << QUANT_SHIFT;
  return `${qr},${qg},${qb}`;
}

function collectBuckets(data: Uint8ClampedArray, useLumaFilter: boolean): Map<string, Bucket> {
  const map = new Map<string, Bucket>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < ALPHA_SKIP) {
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (useLumaFilter) {
      const L = luma(r, g, b);
      if (L < LUMA_LOW || L > LUMA_HIGH) {
        continue;
      }
    }
    const key = quantKey(r, g, b);
    let bucket = map.get(key);
    if (!bucket) {
      bucket = { count: 0, sumR: 0, sumG: 0, sumB: 0 };
      map.set(key, bucket);
    }
    bucket.count += 1;
    bucket.sumR += r;
    bucket.sumG += g;
    bucket.sumB += b;
  }
  return map;
}

function topRepresentatives(map: Map<string, Bucket>, n: number): { r: number; g: number; b: number }[] {
  const sorted = [...map.entries()].sort((a, b) => b[1].count - a[1].count);
  const out: { r: number; g: number; b: number }[] = [];
  for (let i = 0; i < Math.min(n, sorted.length); i++) {
    const b = sorted[i][1];
    out.push({
      r: Math.round(b.sumR / b.count),
      g: Math.round(b.sumG / b.count),
      b: Math.round(b.sumB / b.count)
    });
  }
  return out;
}

/**
 * Loads an image from a same-origin object URL (or URL), draws it to a canvas, and returns a new object URL
 * with pixels remapped: 1st most frequent accent → primary, 2nd → secondary, 3rd → tertiary.
 */
export async function recolorRasterByOccurrence(
  imageUrl: string,
  primary: string,
  secondary: string,
  tertiary: string
): Promise<string | null> {
  const p = parseHex(primary);
  const s = parseHex(secondary);
  const t = parseHex(tertiary);
  if (!p || !s || !t) {
    return null;
  }
  const targets = [p, s, t];

  const img = new Image();
  img.decoding = "async";
  img.src = imageUrl;
  try {
    await img.decode();
  } catch {
    return null;
  }

  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    return null;
  }
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;

  let map = collectBuckets(data, true);
  if (map.size < 2) {
    map = collectBuckets(data, false);
  }
  if (map.size === 0) {
    return null;
  }

  const sources = topRepresentatives(map, 3);
  if (sources.length === 0) {
    return null;
  }

  const maxD2 = REPLACE_MAX_DIST * REPLACE_MAX_DIST;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < ALPHA_SKIP) {
      continue;
    }
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const pixel = { r, g, b };
    let bestIdx = 0;
    let bestD = dist2(pixel, sources[0]);
    for (let j = 1; j < sources.length; j++) {
      const d = dist2(pixel, sources[j]);
      if (d < bestD) {
        bestD = d;
        bestIdx = j;
      }
    }
    if (bestD > maxD2) {
      continue;
    }
    const tgt = targets[Math.min(bestIdx, targets.length - 1)];
    data[i] = tgt.r;
    data[i + 1] = tgt.g;
    data[i + 2] = tgt.b;
  }

  ctx.putImageData(imageData, 0, 0);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(null);
        return;
      }
      resolve(URL.createObjectURL(blob));
    }, "image/png");
  });
}
