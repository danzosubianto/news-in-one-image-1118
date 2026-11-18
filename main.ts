// main.ts — "The World Today": a one-page newspaper front page that sums
// up the world news of Wednesday 18 November 2026 in a single image.
//
// The program draws the page itself (type, rules and a small globe motif)
// with the rasteriser in png.ts and the typeface in font.ts, and writes
// the result to /output/entry.png (or $MAKEFUN_OUTPUT_DIR locally).
// It reads nothing, uses no network and is fully deterministic: the two
// grading runs produce byte-identical files.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Canvas, type Rgb } from "./png.ts";
import {
  drawAligned,
  drawParagraph,
  drawText,
  textHeight,
  textWidth,
  type TextStyle,
} from "./font.ts";

// ---------------------------------------------------------------- palette
const PAPER: Rgb = [247, 243, 234];
const INK: Rgb = [22, 24, 29];
const BODY: Rgb = [56, 58, 64]; // deck grey
const HAIR: Rgb = [186, 178, 164]; // hairline rules
const RED: Rgb = [174, 42, 36];
const NAVY: Rgb = [33, 64, 102];
const TEAL: Rgb = [24, 100, 82];
const OCHRE: Rgb = [160, 102, 18];
const PLUM: Rgb = [116, 44, 88];
const STEEL: Rgb = [44, 84, 120];

// ---------------------------------------------------------------- the day
const DAY_LINE = "WEDNESDAY, 18 NOVEMBER 2026";

interface Story {
  section: string;
  color: Rgb;
  headline: string;
  deck: string;
}

const LEAD: Story = {
  section: "GULF CONFLICT — MIDDLE EAST",
  color: RED,
  headline: "US STRIKES IRANIAN MISSILE SITE ON QESHM ISLAND",
  deck:
    "American jets struck a missile site on Qeshm. " +
    "Iran answered with drones on Bahrain and Kuwait.",
};

const STORIES: Story[] = [
  {
    section: "EUROPE",
    color: NAVY,
    headline: "UKRAINE HITS KERCH BRIDGE AGAIN",
    deck: "Part of the road span fell into the strait.",
  },
  {
    section: "ASIA-PACIFIC",
    color: TEAL,
    headline: "XI, PUTIN, TRUMP MEET AT APEC",
    deck: "Xi opens Shenzhen summit urging AI ties and free trade.",
  },
  {
    section: "AMERICAS",
    color: OCHRE,
    headline: "PELTOLA FLIPS ALASKA SENATE SEAT",
    deck: "Democrats widen their Senate majority to 56 seats.",
  },
  {
    section: "HEALTH",
    color: PLUM,
    headline: "EBOLA IN CONGO PASSES 11,000 CASES",
    deck: "Outbreak doubled in three months, UN says; 5,400 dead.",
  },
  {
    section: "MIDDLE EAST",
    color: RED,
    headline: "EISENKOT TO FORM ISRAEL GOVERNMENT",
    deck: "Herzog passes over Netanyahu; new Knesset sworn in.",
  },
  {
    section: "PACIFIC",
    color: STEEL,
    headline: "CYCLONE XAVIER HITS COOK ISLANDS",
    deck: "Category 5 storm makes landfall in the north.",
  },
];

const BRIEFS: string[] = [
  "N. KOREA MISSILE TO SEA OF JAPAN · RUSSIA PLANE CRASH KILLS 19",
  "WORLD COURT: MYANMAR RULING · US LOSES MEASLES STATUS",
  "FOUR NATIONS URGE OPEN GAZA AID ROUTES · ROMANIA HIT BY 5.3 QUAKE",
];

// ------------------------------------------------------------- composition
const W = 1024;
const H = 1024;
const MARGIN = 40;
const RIGHT = W - MARGIN;
const CONTENT_W = RIGHT - MARGIN;

const KICKER: TextStyle = { scale: 2.5, bold: true, tracking: 3 };
const MASTHEAD: TextStyle = { scale: 8.5, bold: true, tracking: 1 };
const DATE_STYLE: TextStyle = { scale: 4.25, bold: true, tracking: 1 };
const TAG_STYLE: TextStyle = { scale: 3, bold: true, tracking: 1 };
const LEAD_HEAD: TextStyle = { scale: 6, bold: true };
const DECK_STYLE: TextStyle = { scale: 3 };
const LABEL_STYLE: TextStyle = { scale: 2.5, bold: true, tracking: 1 };
const CARD_HEAD: TextStyle = { scale: 3.5, bold: true };
const CARD_DECK: TextStyle = { scale: 2.5 };
const BRIEF_STYLE: TextStyle = { scale: 2.25, bold: true };
const STAT_NUM: TextStyle = { scale: 3.5, bold: true };
const STAT_LAB: TextStyle = { scale: 2 };

function rule(cv: Canvas, y: number, thick: number, color: Rgb): void {
  cv.rect(MARGIN, y, CONTENT_W, thick, color);
}

/** A small wireframe globe: outline, equator, two parallels, meridians. */
function drawGlobe(cv: Canvas, cx: number, cy: number, r: number, c: Rgb): void {
  cv.ring(cx, cy, r, 2.2, c);
  cv.line(cx - r, cy, cx + r, cy, 1.4, c);
  for (const f of [-0.48, 0.48]) {
    const dy = r * f;
    const half = Math.sqrt(r * r - dy * dy);
    cv.line(cx - half, cy + dy, cx + half, cy + dy, 1.1, c);
  }
  for (const a of [0.45, 0.8]) {
    let px = cx;
    let py = cy - r;
    for (let i = 1; i <= 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      const x = cx + Math.sin(t) * r * a;
      const y = cy - Math.cos(t) * r;
      cv.line(px, py, x, y, 1.1, c);
      px = x;
      py = y;
    }
  }
  cv.line(cx, cy - r, cx, cy + r, 1.1, c);
}

interface Stat {
  num: string;
  label: string;
}

const LEAD_STATS: Stat[] = [
  { num: "3RD", label: "attack on Bahrain in one week" },
  { num: "2", label: "Gulf states hit by drones" },
  { num: "1", label: "missile site struck on Qeshm" },
];

/** The bordered "at a glance" box of key numbers beside the lead deck.
 *  Each stat is a big number in a fixed column, its label wrapped in the
 *  space remaining. Returns the y of the box's bottom edge. */
function glanceBox(cv: Canvas, x: number, y: number, w: number): number {
  const pad = 14;
  const boxH = 146;
  cv.rect(x, y, w, 2, INK);
  cv.rect(x, y, 2, boxH, INK);
  cv.rect(x + w - 2, y, 2, boxH, INK);
  cv.rect(x, y + boxH - 2, w, 2, INK);
  drawText(cv, x + pad, y + 10, "AT A GLANCE", LABEL_STYLE, RED);
  const labelX = x + pad + 62;
  let cy = y + 36;
  for (const s of LEAD_STATS) {
    drawText(cv, x + pad, cy + 2, s.num, STAT_NUM, RED);
    drawParagraph(cv, labelX, cy, s.label, x + w - pad - labelX, STAT_LAB, BODY, 17);
    cy += 34;
  }
  return y + boxH;
}

function card(cv: Canvas, x: number, y: number, w: number, s: Story): void {
  cv.rect(x, y, w, 5, s.color);
  drawText(cv, x + 2, y + 13, s.section, LABEL_STYLE, s.color);
  drawParagraph(cv, x + 2, y + 38, s.headline, w - 8, CARD_HEAD, INK, 29);
  drawParagraph(cv, x + 2, y + 94, s.deck, w - 8, CARD_DECK, BODY, 19);
}

function compose(): Canvas {
  const cv = new Canvas(W, H, PAPER);
  let y = 24;

  // Kicker between two rules.
  rule(cv, y, 3, INK);
  y += 8;
  drawAligned(cv, MARGIN, RIGHT, y, "THE WORLD'S NEWS · ONE DAY · ONE PAGE", KICKER, INK, "center");
  y += textHeight(KICKER) + 6;
  rule(cv, y, 1.5, INK);

  // Masthead with a globe at each end.
  const mastY = y + 12;
  drawGlobe(cv, MARGIN + 32, mastY + 30, 27, INK);
  drawGlobe(cv, RIGHT - 32, mastY + 30, 27, INK);
  drawAligned(cv, MARGIN, RIGHT, mastY, "THE WORLD TODAY", MASTHEAD, INK, "center");
  y = mastY + textHeight(MASTHEAD) + 10;

  // Date bar: the day, unmissable.
  cv.rect(MARGIN, y, CONTENT_W, 50, INK);
  drawAligned(cv, MARGIN, RIGHT, y + 10, DAY_LINE, DATE_STYLE, PAPER, "center");
  y += 50 + 10;

  // Lead story: tag (with a red underline rule), headline, deck + numbers.
  drawText(cv, MARGIN, y, LEAD.section, TAG_STYLE, LEAD.color);
  cv.rect(MARGIN, y + textHeight(TAG_STYLE) + 3, textWidth(LEAD.section, TAG_STYLE), 2.5, LEAD.color);
  y += textHeight(TAG_STYLE) + 10;
  y = drawParagraph(cv, MARGIN, y, LEAD.headline, CONTENT_W, LEAD_HEAD, INK, 50);
  y += 6;
  const deckBottom = drawParagraph(cv, MARGIN, y, LEAD.deck, 600, DECK_STYLE, BODY, 28);
  const boxBottom = glanceBox(cv, 688, y - 4, RIGHT - 688);
  y = Math.max(deckBottom, boxBottom) + 10;
  rule(cv, y, 1.5, HAIR);
  y += 14;

  // In brief: three lines of one-line world briefs.
  drawText(cv, MARGIN, y, "IN BRIEF", LABEL_STYLE, RED);
  y += textHeight(LABEL_STYLE) + 7;
  for (const b of BRIEFS) {
    drawAligned(cv, MARGIN, RIGHT, y, b, BRIEF_STYLE, INK, "center");
    y += 21;
  }
  y += 2;
  rule(cv, y, 1.5, HAIR);
  y += 12;

  // Six story cards, two columns by three rows, with a ruled gutter
  // between the columns and a hairline under each of the first two rows.
  const gap = 20;
  const colW = (CONTENT_W - gap) / 2;
  const rowH = 132;
  cv.line(MARGIN + colW + gap / 2, y - 4, MARGIN + colW + gap / 2, y + 3 * rowH + 16, 1.2, HAIR);
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cardY = y + row * (rowH + 8);
    card(cv, MARGIN + col * (colW + gap), cardY, colW, STORIES[i]);
    if (col === 1 && row < 2)
      cv.rect(MARGIN, cardY + rowH + 4, CONTENT_W, 1.2, HAIR);
  }
  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
writeFileSync(join(outDir, "entry.png"), compose().toPng());
