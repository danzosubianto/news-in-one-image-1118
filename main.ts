// main.ts — "The World Today": a one-page newspaper front page that sums
// up the world news of Wednesday 18 November 2026 in a single image.
//
// The program draws the whole page itself — masthead, a drawn picture of
// the lead story, spot illustrations for the six other stories, type and
// rules — with the rasteriser in png.ts, the typeface in font.ts and the
// pictures in art.ts, and writes the result to /output/entry.png (or
// $MAKEFUN_OUTPUT_DIR locally). It reads nothing, uses no network and is
// fully deterministic: the two grading runs produce byte-identical files.

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { Canvas, type Rgb } from "./png.ts";
import {
  drawAligned,
  drawParagraph,
  drawText,
  textHeight,
  textWidth,
  wrapText,
  type TextStyle,
} from "./font.ts";
import { drawIcon, drawLeadScene, type IconKind } from "./art.ts";

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
  icon: IconKind;
  headline: string;
  deck: string;
}

const LEAD = {
  section: "GULF CONFLICT — MIDDLE EAST",
  color: RED,
  headline: "US STRIKES IRANIAN MISSILE SITE ON QESHM ISLAND",
  deck:
    "American jets struck a missile site on Qeshm. " +
    "Iran answered with drones on Bahrain and Kuwait.",
  caption: "QESHM ISLAND · THE STRAIT OF HORMUZ — JETS IN, DRONES OUT",
};

const STORIES: Story[] = [
  {
    section: "EUROPE",
    color: NAVY,
    icon: "bridge",
    headline: "UKRAINE HITS KERCH BRIDGE AGAIN",
    deck: "Part of the road span fell into the strait.",
  },
  {
    section: "ASIA-PACIFIC",
    color: TEAL,
    icon: "summit",
    headline: "XI, PUTIN, TRUMP MEET AT APEC",
    deck: "Xi opens Shenzhen summit urging AI ties and free trade.",
  },
  {
    section: "AMERICAS",
    color: OCHRE,
    icon: "senate",
    headline: "PELTOLA FLIPS ALASKA SENATE SEAT",
    deck: "Democrats widen their Senate majority to 56 seats.",
  },
  {
    section: "HEALTH",
    color: PLUM,
    icon: "virus",
    headline: "EBOLA IN CONGO PASSES 11,000 CASES",
    deck: "Outbreak doubled in three months, UN says; 5,400 dead.",
  },
  {
    section: "MIDDLE EAST",
    color: RED,
    icon: "star",
    headline: "EISENKOT TO FORM ISRAEL GOVERNMENT",
    deck: "Herzog passes over Netanyahu; new Knesset sworn in.",
  },
  {
    section: "PACIFIC",
    color: STEEL,
    icon: "cyclone",
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
const MASTHEAD: TextStyle = { scale: 8, bold: true, tracking: 1 };
const DATE_STYLE: TextStyle = { scale: 4, bold: true, tracking: 1 };
const TAG_STYLE: TextStyle = { scale: 3, bold: true, tracking: 1 };
const LEAD_HEAD: TextStyle = { scale: 5.5, bold: true };
const DECK_STYLE: TextStyle = { scale: 2.9 };
const LABEL_STYLE: TextStyle = { scale: 2.4, bold: true, tracking: 1 };
const CAPTION: TextStyle = { scale: 2.2, bold: true, tracking: 1 };
const CARD_HEAD: TextStyle = { scale: 3.2, bold: true };
const CARD_DECK: TextStyle = { scale: 2.3 };
const BRIEF_STYLE: TextStyle = { scale: 1.95, bold: true };
const STAT_NUM: TextStyle = { scale: 3.2, bold: true };
const STAT_LAB: TextStyle = { scale: 1.9 };
const FOOT_STYLE: TextStyle = { scale: 1.85, bold: true, tracking: 2 };

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

/** The "at a glance" strip under the lead deck: a bordered box, its
 *  title at the left, then the day's key numbers in three columns, each
 *  a big red number with its label wrapped beside it. */
function glanceStrip(cv: Canvas, x: number, y: number, w: number, h: number): void {
  cv.rect(x, y, w, 2, INK);
  cv.rect(x, y, 2, h, INK);
  cv.rect(x + w - 2, y, 2, h, INK);
  cv.rect(x, y + h - 2, w, 2, INK);
  drawText(cv, x + 14, y + 9, "AT A", LABEL_STYLE, RED);
  drawText(cv, x + 14, y + 9 + 20, "GLANCE", LABEL_STYLE, RED);
  const colX = x + 118;
  const colW = (x + w - 14 - colX) / 3;
  for (let i = 0; i < LEAD_STATS.length; i++) {
    const s = LEAD_STATS[i];
    const cx = colX + i * colW;
    if (i > 0) cv.rect(cx - 12, y + 10, 1.2, h - 20, HAIR);
    const numW = textWidth(s.num, STAT_NUM);
    drawText(cv, cx, y + 12, s.num, STAT_NUM, RED);
    drawParagraph(cv, cx + numW + 10, y + 10, s.label, colW - numW - 22, STAT_LAB, BODY, 13);
  }
}

/** One story card: colour bar, section label, its spot illustration at
 *  the top right, headline and deck. The card's box is (x, y, w, h);
 *  the headline is set in the width the icon leaves, the deck sits on a
 *  fixed line near the card's foot so the rows keep one rhythm. */
function card(cv: Canvas, x: number, y: number, w: number, h: number, s: Story): void {
  cv.rect(x, y, w, 4, s.color);
  drawText(cv, x + 2, y + 10, s.section, LABEL_STYLE, s.color);
  const iconS = 52;
  drawIcon(cv, s.icon, x + w - iconS - 2, y + 6, iconS, s.color);
  const headW = w - iconS - 16;
  const headLines = wrapText(s.headline, headW, CARD_HEAD);
  let cy = y + 30;
  for (const line of headLines) {
    drawText(cv, x + 2, cy, line, CARD_HEAD, INK);
    cy += 24;
  }
  drawParagraph(cv, x + 2, y + h - 30, s.deck, w - 8, CARD_DECK, BODY, 15.5);
}

function compose(): Canvas {
  const cv = new Canvas(W, H, PAPER);
  let y = 18;

  // Kicker between two rules.
  rule(cv, y, 3, INK);
  y += 8;
  drawAligned(cv, MARGIN, RIGHT, y, "THE WORLD'S NEWS · ONE DAY · ONE PAGE", KICKER, INK, "center");
  y += textHeight(KICKER) + 6;
  rule(cv, y, 1.5, INK);

  // Masthead with a globe at each end.
  const mastY = y + 10;
  drawGlobe(cv, MARGIN + 30, mastY + 27, 25, INK);
  drawGlobe(cv, RIGHT - 30, mastY + 27, 25, INK);
  drawAligned(cv, MARGIN, RIGHT, mastY, "THE WORLD TODAY", MASTHEAD, INK, "center");
  y = mastY + textHeight(MASTHEAD) + 10;

  // Date bar: the day, unmissable.
  cv.rect(MARGIN, y, CONTENT_W, 46, INK);
  drawAligned(cv, MARGIN, RIGHT, y + 9, DAY_LINE, DATE_STYLE, PAPER, "center");
  y += 46 + 10;

  // Lead story: tag with a red underline rule, then the headline.
  drawText(cv, MARGIN, y, LEAD.section, TAG_STYLE, LEAD.color);
  cv.rect(MARGIN, y + textHeight(TAG_STYLE) + 3, textWidth(LEAD.section, TAG_STYLE), 2.5, LEAD.color);
  y += textHeight(TAG_STYLE) + 11;
  y = drawParagraph(cv, MARGIN, y, LEAD.headline, CONTENT_W, LEAD_HEAD, INK, 44);
  y += 4;

  // The lead picture: a framed panel with the drawn scene and a caption
  // strip along its foot.
  const panelH = 136;
  cv.rect(MARGIN, y, CONTENT_W, panelH, INK);
  drawLeadScene(cv, MARGIN + 3, y + 3, CONTENT_W - 6, panelH - 6);
  const capH = 26;
  cv.rect(MARGIN + 3, y + panelH - 3 - capH, CONTENT_W - 6, capH, INK);
  drawText(cv, MARGIN + 14, y + panelH - 3 - capH + 6, LEAD.caption, CAPTION, PAPER);
  y += panelH + 8;

  // The lead deck, then the key numbers at a glance.
  y = drawParagraph(cv, MARGIN, y, LEAD.deck, CONTENT_W, DECK_STYLE, BODY, 25);
  y += 4;
  glanceStrip(cv, MARGIN, y, CONTENT_W, 52);
  y += 52 + 10;

  // Six story cards, two columns by three rows, with a ruled gutter
  // between the columns and a hairline under each of the first two rows.
  const gap = 20;
  const colW = (CONTENT_W - gap) / 2;
  const rowH = 112;
  cv.line(MARGIN + colW + gap / 2, y - 2, MARGIN + colW + gap / 2, y + 3 * rowH + 12, 1.2, HAIR);
  for (let i = 0; i < STORIES.length; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cardY = y + row * (rowH + 6);
    card(cv, MARGIN + col * (colW + gap), cardY, colW, rowH, STORIES[i]);
    if (col === 1 && row < 2)
      cv.rect(MARGIN, cardY + rowH + 2, CONTENT_W, 1.2, HAIR);
  }
  y += 3 * rowH + 2 * 6 + 10;

  // In brief: a black band of one-line world briefs across the foot,
  // set left-aligned beside the band's label so no line can touch it.
  const bandH = 70;
  cv.rect(MARGIN, y, CONTENT_W, bandH, INK);
  drawText(cv, MARGIN + 14, y + 10, "IN", LABEL_STYLE, [232, 176, 92]);
  drawText(cv, MARGIN + 14, y + 10 + 20, "BRIEF", LABEL_STYLE, [232, 176, 92]);
  let by = y + 8;
  for (const b of BRIEFS) {
    drawText(cv, MARGIN + 140, by, b, BRIEF_STYLE, PAPER);
    by += 19;
  }
  y += bandH + 7;

  // Footer: the paper's name and the day once more, between rules.
  drawAligned(cv, MARGIN, RIGHT, y, "THE WORLD TODAY · " + DAY_LINE, FOOT_STYLE, BODY, "center");
  return cv;
}

const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
writeFileSync(join(outDir, "entry.png"), compose().toPng());
