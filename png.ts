// png.ts — a tiny software rasteriser and PNG writer.
// Node standard library only: pixels are painted into a supersampled
// framebuffer, box-downsampled for smooth edges, then encoded as a
// truecolour PNG with zlib deflate.

import { deflateSync } from "node:zlib";

export type Rgb = readonly [number, number, number];

// Supersampling factor: the page is drawn at SS x its final size and
// averaged down, which anti-aliases the bitmap type and the rules.
const SS = 2;

export class Canvas {
  readonly width: number; // final image width, px
  readonly height: number; // final image height, px
  private readonly dw: number; // device width  = width * SS
  private readonly dh: number; // device height = height * SS
  private readonly buf: Uint8ClampedArray;

  constructor(width: number, height: number, bg: Rgb) {
    this.width = width;
    this.height = height;
    this.dw = width * SS;
    this.dh = height * SS;
    this.buf = new Uint8ClampedArray(this.dw * this.dh * 3);
    for (let i = 0; i < this.dw * this.dh; i++) {
      this.buf[i * 3] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  private put(dx: number, dy: number, c: Rgb): void {
    if (dx < 0 || dy < 0 || dx >= this.dw || dy >= this.dh) return;
    const i = (dy * this.dw + dx) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  /** Filled rectangle in final-image coordinates. */
  rect(x: number, y: number, w: number, h: number, c: Rgb): void {
    const x0 = Math.round(x * SS);
    const y0 = Math.round(y * SS);
    const x1 = Math.round((x + w) * SS);
    const y1 = Math.round((y + h) * SS);
    for (let dy = y0; dy < y1; dy++)
      for (let dx = x0; dx < x1; dx++) this.put(dx, dy, c);
  }

  /** Filled disc in final-image coordinates. */
  disc(cx: number, cy: number, r: number, c: Rgb): void {
    const dcx = cx * SS;
    const dcy = cy * SS;
    const dr = r * SS;
    const x0 = Math.floor(dcx - dr);
    const x1 = Math.ceil(dcx + dr);
    const y0 = Math.floor(dcy - dr);
    const y1 = Math.ceil(dcy + dr);
    for (let dy = y0; dy <= y1; dy++)
      for (let dx = x0; dx <= x1; dx++) {
        const ddx = dx - dcx;
        const ddy = dy - dcy;
        if (ddx * ddx + ddy * ddy <= dr * dr) this.put(dx, dy, c);
      }
  }

  /** Ring (annulus outline) in final-image coordinates. */
  ring(cx: number, cy: number, r: number, thick: number, c: Rgb): void {
    const dcx = cx * SS;
    const dcy = cy * SS;
    const dr = r * SS;
    const dt = thick * SS;
    const x0 = Math.floor(dcx - dr - dt);
    const x1 = Math.ceil(dcx + dr + dt);
    const y0 = Math.floor(dcy - dr - dt);
    const y1 = Math.ceil(dcy + dr + dt);
    for (let dy = y0; dy <= y1; dy++)
      for (let dx = x0; dx <= x1; dx++) {
        const ddx = dx - dcx;
        const ddy = dy - dcy;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (Math.abs(d - dr) <= dt / 2) this.put(dx, dy, c);
      }
  }

  /** Straight segment in final-image coordinates, stamped square brush. */
  line(x0: number, y0: number, x1: number, y1: number, thick: number, c: Rgb): void {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * SS;
    const half = (thick * SS) / 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const cx = (x0 + (x1 - x0) * t) * SS;
      const cy = (y0 + (y1 - y0) * t) * SS;
      for (let dy = Math.floor(cy - half); dy <= cy + half; dy++)
        for (let dx = Math.floor(cx - half); dx <= cx + half; dx++)
          this.put(dx, dy, c);
    }
  }

  /** Downsample the device buffer to the final size (box filter). */
  private pixels(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(this.width * this.height * 3);
    for (let y = 0; y < this.height; y++)
      for (let x = 0; x < this.width; x++) {
        let r = 0;
        let g = 0;
        let b = 0;
        for (let sy = 0; sy < SS; sy++)
          for (let sx = 0; sx < SS; sx++) {
            const i = ((y * SS + sy) * this.dw + (x * SS + sx)) * 3;
            r += this.buf[i];
            g += this.buf[i + 1];
            b += this.buf[i + 2];
          }
        const o = (y * this.width + x) * 3;
        const n = SS * SS;
        out[o] = r / n;
        out[o + 1] = g / n;
        out[o + 2] = b / n;
      }
    return out;
  }

  /** Encode the finished page as a PNG file image. */
  toPng(): Buffer {
    const px = this.pixels();
    const stride = this.width * 3;
    const raw = Buffer.alloc((stride + 1) * this.height);
    let prev: Uint8ClampedArray | null = null;
    for (let y = 0; y < this.height; y++) {
      const row = px.subarray(y * stride, (y + 1) * stride);
      const { type, data } = filterRow(row, prev);
      const off = y * (stride + 1);
      raw[off] = type;
      raw.set(data, off + 1);
      prev = row;
    }
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.width, 0);
    ihdr.writeUInt32BE(this.height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: truecolour RGB
    const idat = deflateSync(raw, { level: 9 });
    return Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", idat),
      chunk("IEND", Buffer.alloc(0)),
    ]);
  }
}

/** Pick the PNG filter (of None/Sub/Up/Average/Paeth) that leaves the
 *  smallest signed-byte sum for this row, the usual cheap heuristic. */
function filterRow(
  row: Uint8ClampedArray,
  prev: Uint8ClampedArray | null,
): { type: number; data: Buffer } {
  let bestType = 0;
  let bestData: Buffer | null = null;
  let bestScore = Infinity;
  for (let type = 0; type <= 4; type++) {
    const data = Buffer.alloc(row.length);
    let score = 0;
    for (let i = 0; i < row.length; i++) {
      const a = i >= 3 ? row[i - 3] : 0;
      const b = prev ? prev[i] : 0;
      const c = prev && i >= 3 ? prev[i - 3] : 0;
      let pred = 0;
      if (type === 1) pred = a;
      else if (type === 2) pred = b;
      else if (type === 3) pred = (a + b) >> 1;
      else if (type === 4) pred = paeth(a, b, c);
      const v = (row[i] - pred) & 0xff;
      data[i] = v;
      score += v < 128 ? v : 256 - v;
    }
    if (score < bestScore) {
      bestScore = score;
      bestType = type;
      bestData = data;
    }
  }
  return { type: bestType, data: bestData as Buffer };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

const CRC_TABLE = ((): Int32Array => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
