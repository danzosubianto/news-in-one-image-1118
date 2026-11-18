// font.ts — a hand-drawn 5x7 bitmap typeface and the text layout helpers
// the front page is set in. Each glyph is seven row bitmasks, bit 4 the
// leftmost column. Text is stamped pixel by pixel onto the Canvas from
// png.ts; the supersampled downscale there smooths the result.

import type { Canvas, Rgb } from "./png.ts";

export const GLYPH_W = 5;
export const GLYPH_H = 7;

export const GLYPHS: Record<string, readonly number[]> = {
  A: [14, 17, 17, 31, 17, 17, 17],
  B: [30, 17, 17, 30, 17, 17, 30],
  C: [14, 17, 16, 16, 16, 17, 14],
  D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31],
  F: [31, 16, 16, 30, 16, 16, 16],
  G: [14, 17, 16, 23, 17, 17, 15],
  H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14],
  J: [7, 2, 2, 2, 2, 18, 12],
  K: [17, 18, 20, 24, 20, 18, 17],
  L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17],
  N: [17, 25, 21, 19, 17, 17, 17],
  O: [14, 17, 17, 17, 17, 17, 14],
  P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 21, 18, 13],
  R: [30, 17, 17, 30, 20, 18, 17],
  S: [15, 16, 16, 14, 1, 1, 30],
  T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14],
  V: [17, 17, 17, 17, 17, 10, 4],
  W: [17, 17, 17, 21, 21, 21, 10],
  X: [17, 10, 4, 4, 4, 10, 17],
  Y: [17, 10, 4, 4, 4, 4, 4],
  Z: [31, 1, 2, 4, 8, 16, 31],
  "0": [14, 17, 19, 21, 25, 17, 14],
  "1": [4, 12, 4, 4, 4, 4, 14],
  "2": [14, 17, 1, 2, 4, 8, 31],
  "3": [14, 17, 1, 6, 1, 17, 14],
  "4": [2, 6, 10, 18, 31, 2, 2],
  "5": [31, 16, 30, 1, 1, 17, 14],
  "6": [6, 8, 16, 30, 17, 17, 14],
  "7": [31, 1, 2, 4, 8, 8, 8],
  "8": [14, 17, 17, 14, 17, 17, 14],
  "9": [14, 17, 17, 15, 1, 2, 12],
  " ": [0, 0, 0, 0, 0, 0, 0],
};

// Lowercase letters sit on rows 2-6 (x-height five rows); g, j, p, q and y
// use the rows below the baseline for their descenders.
Object.assign(GLYPHS, {
  a: [0, 0, 14, 1, 15, 17, 15],
  b: [16, 16, 30, 17, 17, 17, 30],
  c: [0, 0, 14, 17, 16, 17, 14],
  d: [1, 1, 14, 17, 17, 17, 15],
  e: [0, 0, 14, 17, 31, 16, 14],
  f: [6, 8, 28, 8, 8, 8, 8],
  g: [0, 0, 14, 17, 15, 1, 14],
  h: [16, 16, 22, 25, 17, 17, 17],
  i: [4, 0, 12, 4, 4, 4, 14],
  j: [2, 0, 6, 2, 2, 18, 12],
  k: [16, 16, 18, 20, 24, 20, 18],
  l: [12, 4, 4, 4, 4, 4, 14],
  m: [0, 0, 26, 21, 21, 21, 21],
  n: [0, 0, 22, 25, 17, 17, 17],
  o: [0, 0, 14, 17, 17, 17, 14],
  p: [0, 0, 30, 17, 30, 16, 16],
  q: [0, 0, 14, 17, 15, 1, 1],
  r: [0, 0, 22, 25, 16, 16, 16],
  s: [0, 0, 15, 16, 14, 1, 30],
  t: [8, 8, 28, 8, 8, 9, 6],
  u: [0, 0, 17, 17, 17, 17, 14],
  v: [0, 0, 17, 17, 17, 10, 4],
  w: [0, 0, 17, 21, 21, 21, 10],
  x: [0, 0, 17, 10, 4, 10, 17],
  y: [0, 0, 17, 17, 15, 1, 14],
  z: [0, 0, 31, 2, 4, 8, 31],
  ".": [0, 0, 0, 0, 0, 12, 12],
  ",": [0, 0, 0, 0, 12, 4, 8],
  "'": [4, 4, 8, 0, 0, 0, 0],
  "-": [0, 0, 0, 14, 0, 0, 0],
  "—": [0, 0, 0, 31, 0, 0, 0],
  ":": [0, 12, 12, 0, 12, 12, 0],
  ";": [0, 12, 12, 0, 12, 4, 8],
  "!": [4, 4, 4, 4, 4, 0, 4],
  "?": [14, 17, 1, 2, 4, 0, 4],
  "(": [2, 4, 8, 8, 8, 4, 2],
  ")": [8, 4, 2, 2, 2, 4, 8],
  "/": [1, 1, 2, 4, 8, 16, 16],
  "&": [12, 18, 20, 8, 21, 18, 13],
  "%": [24, 25, 2, 4, 8, 19, 3],
  $: [4, 15, 20, 14, 5, 30, 4],
  "+": [0, 4, 4, 14, 4, 4, 0],
  "·": [0, 0, 0, 12, 12, 0, 0],
  '"': [10, 10, 10, 0, 0, 0, 0],
} as Record<string, readonly number[]>);


export interface TextStyle {
  scale: number; // final-image px per font pixel
  bold?: boolean;
  tracking?: number; // extra px between glyphs, final-image px
}

/** Horizontal advance of one character cell. */
export function cellAdvance(style: TextStyle): number {
  return (GLYPH_W + 1) * style.scale + (style.tracking ?? 0);
}

/** Width of a string set in this style. */
export function textWidth(text: string, style: TextStyle): number {
  if (text.length === 0) return 0;
  return (
    text.length * cellAdvance(style) - style.scale - (style.tracking ?? 0)
  );
}

/** Height of one line of text (cap height plus full glyph box). */
export function textHeight(style: TextStyle): number {
  return GLYPH_H * style.scale;
}

function glyphFor(ch: string): readonly number[] {
  return GLYPHS[ch] ?? GLYPHS[ch.toUpperCase()] ?? GLYPHS[" "];
}

/** Stamp one line of text with its top-left at (x, y). Returns the
 *  x coordinate just past the last glyph. */
export function drawText(
  cv: Canvas,
  x: number,
  y: number,
  text: string,
  style: TextStyle,
  color: Rgb,
): number {
  const s = style.scale;
  const stampW = style.bold ? s * 1.5 : s;
  let cx = x;
  for (const ch of text) {
    const glyph = glyphFor(ch);
    for (let row = 0; row < GLYPH_H; row++) {
      const bits = glyph[row];
      for (let col = 0; col < GLYPH_W; col++) {
        if (bits & (1 << (GLYPH_W - 1 - col)))
          cv.rect(cx + col * s, y + row * s, stampW, s, color);
      }
    }
    cx += cellAdvance(style);
  }
  return cx;
}

/** Draw one line aligned within the span [x0, x1]. */
export function drawAligned(
  cv: Canvas,
  x0: number,
  x1: number,
  y: number,
  text: string,
  style: TextStyle,
  color: Rgb,
  align: "left" | "center" | "right",
): void {
  const w = textWidth(text, style);
  const x = align === "left" ? x0 : align === "right" ? x1 - w : (x0 + x1 - w) / 2;
  drawText(cv, x, y, text, style, color);
}

/** Greedy word wrap: split text into lines no wider than maxWidth. */
export function wrapText(
  text: string,
  maxWidth: number,
  style: TextStyle,
): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line === "" ? word : line + " " + word;
    if (line !== "" && textWidth(trial, style) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line !== "") lines.push(line);
  return lines;
}

/** Draw a wrapped paragraph; returns the y just below its last line. */
export function drawParagraph(
  cv: Canvas,
  x: number,
  y: number,
  text: string,
  maxWidth: number,
  style: TextStyle,
  color: Rgb,
  lineHeight: number,
): number {
  const lines = wrapText(text, maxWidth, style);
  let cy = y;
  for (const line of lines) {
    drawText(cv, x, cy, line, style, color);
    cy += lineHeight;
  }
  return cy;
}
