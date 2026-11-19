// art.ts — the pictures of the front page: a drawn scene for the lead
// story and one spot illustration per story card. Everything is flat
// shapes stamped with the rasteriser in png.ts — no image files, no
// network, the same shapes on every run.

import type { Canvas, Rgb } from "./png.ts";

const INK: Rgb = [22, 24, 29];
const PAPER: Rgb = [247, 243, 234];
const RED: Rgb = [174, 42, 36];
const OCHRE: Rgb = [216, 138, 30];
const SMOKE_A: Rgb = [88, 86, 84];
const SMOKE_B: Rgb = [126, 121, 113];
const SMOKE_C: Rgb = [164, 158, 146];
const SEA: Rgb = [30, 58, 84];
const SEA_LINE: Rgb = [86, 128, 158];
const LAND: Rgb = [38, 34, 30];

/** Blend two colours, t from 0 (a) to 1 (b). */
function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

/** A fighter jet silhouette, nose pointing right, centred on (cx, cy)
 *  and s px long: swept delta wing, tail fin, canopy bump. */
function jet(cv: Canvas, cx: number, cy: number, s: number, c: Rgb): void {
  const u = s / 40;
  cv.poly(
    [
      [cx - 20 * u, cy],
      [cx - 6 * u, cy - 3 * u],
      [cx + 4 * u, cy - 10 * u],
      [cx + 7 * u, cy - 3 * u],
      [cx + 20 * u, cy + 1 * u],
      [cx + 7 * u, cy + 4 * u],
      [cx + 2 * u, cy + 11 * u],
      [cx - 4 * u, cy + 4 * u],
      [cx - 16 * u, cy + 8 * u],
      [cx - 14 * u, cy + 1 * u],
    ],
    c,
  );
}

/** A small quadcopter drone: body, four arms, four rotor ticks. */
function drone(cv: Canvas, cx: number, cy: number, s: number, c: Rgb): void {
  const u = s / 30;
  cv.rect(cx - 5 * u, cy - 2.5 * u, 10 * u, 5 * u, c);
  for (const [dx, dy] of [[-11, -6], [11, -6], [-11, 6], [11, 6]] as const) {
    cv.line(cx, cy, cx + dx * u * 0.8, cy + dy * u * 0.8, 1.6 * u, c);
    cv.line(cx + dx * u - 4 * u, cy + dy * u, cx + dx * u + 4 * u, cy + dy * u, 1.8 * u, c);
  }
  cv.disc(cx, cy + 4.5 * u, 1.8 * u, c);
}

/** The lead picture: American jets over Qeshm Island at dusk — the
 *  missile site under strike, smoke rising, drones answering. Drawn in
 *  the panel (x, y, w, h); the caller adds the caption strip. */
export function drawLeadScene(cv: Canvas, x: number, y: number, w: number, h: number): void {
  // Dusk sky: flat bands from deep blue to a warm horizon.
  const skyTop: Rgb = [26, 40, 64];
  const skyLow: Rgb = [203, 148, 102];
  const horizon = y + h * 0.66;
  const bands = 28;
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const by = y + (horizon - y) * (i / bands);
    cv.rect(x, by, w, (horizon - y) / bands + 1, mix(skyTop, skyLow, t * t));
  }
  // Sea below the horizon, with short wave strokes.
  cv.rect(x, horizon, w, y + h - horizon, SEA);
  for (let r = 0; r < 3; r++) {
    const wy = horizon + 9 + r * ((y + h - horizon - 12) / 3);
    for (let i = 0; i < 8; i++) {
      const wx = x + 30 + i * (w / 8) + (r % 2) * 34;
      cv.line(wx, wy, wx + 22 + (i % 3) * 7, wy, 2, SEA_LINE);
    }
  }
  // Low sun over the island's flat top, and its broken reflection.
  const sunX = x + w * 0.65;
  const sunY = horizon - h * 0.16;
  cv.disc(sunX, sunY, h * 0.15, OCHRE);
  cv.disc(sunX, sunY, h * 0.10, [238, 178, 84]);
  for (let i = 0; i < 4; i++) {
    const rw = 26 - i * 4;
    const ry = horizon + 10 + i * 9;
    cv.line(sunX - rw, ry, sunX - rw * 0.25, ry, 2.4, OCHRE);
    cv.line(sunX + rw * 0.15, ry, sunX + rw * 0.8, ry, 2.4, OCHRE);
  }

  // Qeshm: a long low island silhouette along the horizon, a headland
  // rising at the right, the mainland a fainter line behind at left.
  cv.poly(
    [
      [x, horizon + 2],
      [x + w * 0.30, horizon + 2],
      [x + w * 0.36, horizon - h * 0.05],
      [x + w * 0.52, horizon - h * 0.06],
      [x + w * 0.60, horizon - h * 0.02],
      [x + w * 0.70, horizon - h * 0.13],
      [x + w * 0.80, horizon - h * 0.15],
      [x + w * 0.88, horizon - h * 0.05],
      [x + w, horizon + 2],
    ],
    LAND,
  );

  // The missile site on the island's flat top: two launchers, a radar
  // mast, one missile still on its rail.
  const siteX = x + w * 0.44;
  const siteY = horizon - h * 0.06;
  cv.rect(siteX - 34, siteY - 4, 30, 5, INK);
  cv.poly([[siteX - 32, siteY - 4], [siteX - 8, siteY - 22], [siteX - 3, siteY - 19], [siteX - 24, siteY - 2]], INK);
  cv.rect(siteX + 10, siteY - 4, 26, 5, INK);
  cv.line(siteX + 44, siteY, siteX + 44, siteY - 26, 2.6, INK);
  cv.arc(siteX + 44, siteY - 28, 8, Math.PI, Math.PI * 2, 2.2, INK);

  // The strike: a burst where the jets hit, and smoke climbing.
  const hitX = x + w * 0.545;
  const hitY = horizon - h * 0.055;
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.3;
    const r = (15 + (i % 3) * 6) * (h / 130);
    cv.line(hitX, hitY, hitX + Math.cos(a) * r, hitY + Math.sin(a) * r * 0.8, 2.6, OCHRE);
  }
  cv.disc(hitX, hitY, 10 * (h / 130), RED);
  cv.disc(hitX, hitY, 6 * (h / 130), OCHRE);
  cv.disc(hitX, hitY, 3 * (h / 130), [250, 226, 160]);
  cv.disc(hitX + 15, hitY - 23 * (h / 130), 10 * (h / 130), SMOKE_C);
  cv.disc(hitX + 25, hitY - 39 * (h / 130), 13 * (h / 130), SMOKE_B);
  cv.disc(hitX + 38, hitY - 54 * (h / 130), 15 * (h / 130), SMOKE_A);
  cv.disc(hitX + 52, hitY - 66 * (h / 130), 12 * (h / 130), SMOKE_B);

  // Two jets high at left, contrails behind them, flying in — sized
  // from the panel's height so they read at a glance, not as specks.
  jet(cv, x + w * 0.17, y + h * 0.20, h * 0.52, INK);
  jet(cv, x + w * 0.27, y + h * 0.31, h * 0.40, INK);
  cv.line(x + 8, y + h * 0.185, x + w * 0.17 - h * 0.27, y + h * 0.20, 2, PAPER);
  cv.line(x + 8, y + h * 0.225, x + w * 0.17 - h * 0.27, y + h * 0.205, 2, PAPER);
  cv.line(x + w * 0.10, y + h * 0.30, x + w * 0.27 - h * 0.21, y + h * 0.31, 2, PAPER);

  // The answer: three drones out over the water, heading away.
  drone(cv, x + w * 0.86, y + h * 0.40, h * 0.20, INK);
  drone(cv, x + w * 0.92, y + h * 0.50, h * 0.16, INK);
  drone(cv, x + w * 0.80, y + h * 0.52, h * 0.135, INK);
}

export type IconKind = "bridge" | "summit" | "senate" | "virus" | "star" | "cyclone";

/** One story's spot illustration, drawn in the square (x, y, s, s) in
 *  ink with the story's accent colour. */
export function drawIcon(cv: Canvas, kind: IconKind, x: number, y: number, s: number, accent: Rgb): void {
  const u = s / 60; // the icons are designed on a 60-unit grid
  const cx = x + s / 2;
  if (kind === "bridge") {
    // Kerch: two towers, cables fanning to the deck — and the right
    // span dropped into the strait.
    cv.rect(x + 11 * u, y + 6 * u, 4.4 * u, 32 * u, INK);
    cv.rect(x + 43 * u, y + 6 * u, 4.4 * u, 32 * u, INK);
    cv.line(x + 13 * u, y + 7 * u, x + 3 * u, y + 36 * u, 2 * u, accent);
    cv.line(x + 13 * u, y + 7 * u, x + 30 * u, y + 36 * u, 2 * u, accent);
    cv.line(x + 45 * u, y + 7 * u, x + 31 * u, y + 36 * u, 2 * u, accent);
    cv.line(x + 2 * u, y + 36 * u, x + 31 * u, y + 36 * u, 4.4 * u, INK);
    cv.poly(
      [[x + 31 * u, y + 36 * u], [x + 58 * u, y + 47 * u], [x + 57 * u, y + 51 * u], [x + 31 * u, y + 40 * u]],
      INK,
    );
    for (const wx of [9, 27, 45])
      cv.arc(x + wx * u, y + 54 * u, 5 * u, Math.PI, Math.PI * 2, 2 * u, accent);
  } else if (kind === "summit") {
    // APEC: three flags of three powers over one table line.
    const cols: Rgb[] = [RED, accent, [24, 100, 82]];
    for (let i = 0; i < 3; i++) {
      const px = x + (12 + i * 18) * u;
      cv.line(px, y + 8 * u, px, y + 46 * u, 2.6 * u, INK);
      cv.poly(
        [[px, y + 8 * u], [px + 13 * u, y + 11 * u], [px, y + 17 * u]],
        cols[i],
      );
    }
    cv.line(x + 4 * u, y + 50 * u, x + 56 * u, y + 50 * u, 3.4 * u, INK);
  } else if (kind === "senate") {
    // A capitol dome for a Senate seat changing hands.
    cv.arc(cx, y + 34 * u, 17 * u, Math.PI, Math.PI * 2, 3.4 * u, INK);
    cv.line(cx, y + 6 * u, cx, y + 15 * u, 3 * u, accent);
    cv.disc(cx, y + 6 * u, 2.6 * u, accent);
    cv.rect(x + 10 * u, y + 34 * u, 40 * u, 4 * u, INK);
    for (let i = 0; i < 4; i++)
      cv.rect(x + (14 + i * 10) * u, y + 38 * u, 3.4 * u, 10 * u, INK);
    cv.rect(x + 7 * u, y + 48 * u, 46 * u, 4 * u, INK);
  } else if (kind === "virus") {
    // Ebola: a spiked ball, unmistakable at any size.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const x1 = cx + Math.cos(a) * 13 * u;
      const y1 = y + 30 * u + Math.sin(a) * 13 * u;
      const x2 = cx + Math.cos(a) * 21 * u;
      const y2 = y + 30 * u + Math.sin(a) * 21 * u;
      cv.line(x1, y1, x2, y2, 3 * u, accent);
      cv.disc(x2, y2, 3.6 * u, accent);
    }
    cv.disc(cx, y + 30 * u, 13 * u, accent);
    cv.disc(cx - 4 * u, y + 26 * u, 3 * u, PAPER);
    cv.disc(cx + 5 * u, y + 34 * u, 2.4 * u, PAPER);
  } else if (kind === "star") {
    // A new government in Jerusalem: the Star of David.
    const cy = y + 30 * u;
    const r = 20 * u;
    const up: [number, number][] = [
      [cx, cy - r],
      [cx - r * 0.87, cy + r * 0.5],
      [cx + r * 0.87, cy + r * 0.5],
    ];
    const dn: [number, number][] = [
      [cx, cy + r],
      [cx - r * 0.87, cy - r * 0.5],
      [cx + r * 0.87, cy - r * 0.5],
    ];
    for (const tri of [up, dn])
      for (let i = 0; i < 3; i++)
        cv.line(tri[i][0], tri[i][1], tri[(i + 1) % 3][0], tri[(i + 1) % 3][1], 3.2 * u, accent);
  } else {
    // Cyclone Xavier: a spiral tightening to an eye.
    const cy = y + 30 * u;
    cv.arc(cx + 3 * u, cy, 23 * u, Math.PI * 0.55, Math.PI * 0.55 + 5.3, 4.4 * u, accent);
    cv.arc(cx + 1 * u, cy, 15 * u, Math.PI * 1.75, Math.PI * 1.75 + 5.3, 4.2 * u, accent);
    cv.arc(cx, cy, 7.5 * u, Math.PI * 0.3, Math.PI * 0.3 + 5.0, 3.8 * u, INK);
    cv.disc(cx, cy, 2.2 * u, INK);
  }
}
