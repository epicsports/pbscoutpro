// ─── PbScoutPro Theme ───

// ── Layer 1: Primitive palette ──
const P = {
  gray50:'#f8fafc', gray100:'#f1f5f9', gray200:'#e2e8f0', gray300:'#cbd5e1',
  gray400:'#94a3b8', gray500:'#64748b', gray600:'#475569', gray700:'#334155',
  gray800:'#1e293b', gray900:'#0f172a', gray950:'#0a0e17',
  amber400:'#fbbf24', amber500:'#f59e0b', amber600:'#d97706', amber700:'#b47708',
  red400:'#f87171', red500:'#ef4444', red600:'#dc2626', red900:'#7f1d1d',
  green400:'#4ade80', green500:'#22c55e', green600:'#16a34a', green900:'#14532d',
  blue400:'#60a5fa', blue500:'#3b82f6', blue600:'#2563eb',
  orange400:'#fb923c', orange500:'#f97316', orange600:'#ea580c',
  purple400:'#c084fc', purple500:'#a855f7', purple600:'#9333ea',
  white:'#ffffff', black:'#000000',
};

// ── Layer 2: Semantic tokens (dark theme) ──
export const COLORS = {
  // Surfaces
  bg: P.gray950,
  surface: '#111827',
  surfaceLight: '#1a2234',
  surfaceHover: '#1f2b3d',
  // Borders
  border: '#2a3548',
  borderActive: P.amber500,
  // Brand
  accent: P.amber500,
  accentDim: P.amber700,
  // Status
  danger: P.red500,
  dangerDim: P.red900,
  success: P.green500,
  successDim: P.green900,
  // Text
  text: P.gray200,
  textDim: P.gray400,    // #94a3b8 — 7:1 on bg, WCAG AAA
  textMuted: P.gray500,  // #64748b — 4.5:1 on bg, WCAG AA
  white: P.white,
  black: P.black,
  // Match outcomes
  win: P.green500,
  loss: P.red500,
  timeout: P.amber500,
  // Canvas-specific
  playerColors: [P.red500, P.blue500, P.green500, P.purple500, P.orange500],
  eliminatedOverlay: P.gray600,
  skull: P.red500,
  bumpStop: P.amber400,
  // Field lines
  discoLine: P.orange500,
  zeekerLine: P.blue500,
};

// ── Layer 3: Heatmap color schemes ──
// Each scheme: function(value 0-1) → rgba string
export const HEATMAP = {
  // Default: green→red (safe), orange (arc), blue (exposed)
  default: {
    name: 'Standard',
    safe(v) {
      const r = Math.round(v * 255), g = Math.round((1 - v) * 200);
      return `rgba(${r},${g},0,${Math.min(0.55, v * 0.7 + 0.05)})`;
    },
    arc(v) {
      return `rgba(255,${Math.round(160 - v * 60)},${Math.round(40 - v * 30)},${Math.min(0.45, v * 0.6 + 0.04)})`;
    },
    exposed(v) {
      return `rgba(${Math.round(v * 100)},${Math.round(v * 80)},${Math.round(180 + v * 75)},${Math.min(0.35, v * 0.5 + 0.03)})`;
    },
    bump(v) {
      return `rgba(0,${Math.round(180 + v * 75)},${Math.round(200 + v * 55)},${Math.min(0.5, v * 0.6 + 0.03)})`;
    },
    legend: {safe:'#22c55e', arc:'#f97316', exposed:'#3b82f6', bump:'#06b6d4'},
    legendLabels: {safe:'Bezpieczny', arc:'Lob', exposed:'Ryzykowny', bump:'Przycupa'},
  },
  // Color-blind safe: white→yellow (safe), orange (arc), purple (exposed)
  colorblind: {
    name: 'Daltonizm',
    safe(v) {
      const r = Math.round(200 + v * 55), g = Math.round(200 + v * 55), b = Math.round(200 - v * 200);
      return `rgba(${r},${g},${b},${Math.min(0.55, v * 0.7 + 0.05)})`;
    },
    arc(v) {
      return `rgba(255,${Math.round(160 - v * 60)},${Math.round(40 - v * 30)},${Math.min(0.45, v * 0.6 + 0.04)})`;
    },
    exposed(v) {
      return `rgba(${Math.round(140 + v * 60)},${Math.round(60 + v * 30)},${Math.round(200 + v * 55)},${Math.min(0.40, v * 0.5 + 0.04)})`;
    },
    bump(v) {
      return `rgba(0,${Math.round(180 + v * 75)},${Math.round(200 + v * 55)},${Math.min(0.5, v * 0.6 + 0.03)})`;
    },
    legend: {safe:'#fbbf24', arc:'#f97316', exposed:'#a855f7', bump:'#06b6d4'},
    legendLabels: {safe:'Bezpieczny', arc:'Lob', exposed:'Ryzykowny', bump:'Przycupa'},
  },
};

// ── Light theme overrides ──
const LIGHT_COLORS = {
  bg: '#f8fafc', surface: '#ffffff', surfaceLight: '#f1f5f9', surfaceHover: '#e2e8f0',
  border: '#cbd5e1', borderActive: P.amber600,
  text: P.gray900, textDim: P.gray600, textMuted: P.gray500,
  accent: P.amber600, accentDim: P.amber700,
};
const DARK_COLORS = {
  bg: P.gray950, surface: '#111827', surfaceLight: '#1a2234', surfaceHover: '#1f2b3d',
  border: '#2a3548', borderActive: P.amber500,
  text: P.gray200, textDim: P.gray400, textMuted: P.gray500,
  accent: P.amber500, accentDim: P.amber700,
};

export let currentTheme = 'dark';
export function setTheme(theme) {
  currentTheme = theme;
  const src = theme === 'light' ? LIGHT_COLORS : DARK_COLORS;
  Object.assign(COLORS, src);
  // Update CSS custom properties for global.css
  const root = document.documentElement;
  if (root) {
    root.style.setProperty('--bg', COLORS.bg);
    root.style.setProperty('--surface', COLORS.surface);
    root.style.setProperty('--surface-light', COLORS.surfaceLight);
    root.style.setProperty('--border', COLORS.border);
    root.style.setProperty('--text', COLORS.text);
    root.style.setProperty('--text-dim', COLORS.textDim);
    root.style.setProperty('--text-muted', COLORS.textMuted);
    root.style.setProperty('--accent', COLORS.accent);
    document.body.style.background = COLORS.bg;
    document.body.style.color = COLORS.text;
  }
}
export function toggleTheme() {
  setTheme(currentTheme === 'dark' ? 'light' : 'dark');
}

// Active scheme — change this to switch globally
export let activeHeatmap = HEATMAP.default;
export function setHeatmapScheme(name) {
  activeHeatmap = HEATMAP[name] || HEATMAP.default;
}

// ── Counter analysis lane colors ──
export const LANE_COLORS = {
  safe: P.green500,     // #22c55e — green solid line
  arc: P.orange500,     // #f97316 — orange dashed line
  exposed: P.blue500,   // #3b82f6 — blue dashed line
};

// ── Counter scoring weights ──
export const COUNTER_WEIGHTS = {
  safe: 2.0,
  arc: 1.2,
  exposed: 0.3,
};

export const LEAGUES = ['NXL', 'DPL', 'PXL'];
export const LEAGUE_COLORS = { NXL: '#ef4444', DPL: '#3b82f6', PXL: '#22c55e' };
export const FONT = `'JetBrains Mono', 'Fira Code', 'SF Mono', monospace`;

// Touch-friendly sizing (research-based: min 44px targets, 48px recommended)
export const TOUCH = {
  minTarget: 44, targetLg: 48,
  btnPadY: 10, btnPadX: 16, btnPadYSm: 6, btnPadXSm: 10,
  spacing: 8, spacingLg: 12,
  fontBase: 14, fontSm: 12, fontXs: 11, fontLg: 16, fontXl: 18,
  chipHeight: 36, iconBtn: 40,
};

// ── NXL 2026 Bunker Taxonomy ──
// isBeam: true = structural cover (snake beam), no label in comms
// isPosition: true (default) = playable position, labeled in comms
export const BUNKER_TYPES = [
  // ── Beams (cover only, no comms label) ──
  { abbr: 'SB',  name: 'Snake Beam',    height: 0.76, group: 'beam', isBeam: true, w: 3.0, d: 0.76 },

  // ── Low (≤0.9m) ──
  { abbr: 'SD',  name: 'Small Dorito',  height: 0.85, group: 'low', w: 1.0, d: 1.2 },
  { abbr: 'Tr',  name: 'Tree',          height: 0.90, group: 'low', w: 0.6, d: 0.6, shape: 'circle' },
  { abbr: 'R',   name: 'Rollie',        height: 0.90, group: 'low', w: 0.9, d: 0.9, shape: 'circle' },

  // ── Medium (1.0–1.2m) ──
  { abbr: 'MD',  name: 'Med. Dorito',   height: 1.00, group: 'med', w: 1.2, d: 1.8 },
  { abbr: 'Ck',  name: 'Cake',          height: 1.00, group: 'med', w: 1.5, d: 1.5 },
  { abbr: 'Br',  name: 'Brick',         height: 1.15, group: 'med', w: 1.5, d: 0.9 },
  { abbr: 'C',   name: 'Can',           height: 1.20, group: 'med', w: 0.9, d: 0.9, shape: 'circle' },
  { abbr: 'MW',  name: 'Mini Wedge',    height: 1.20, group: 'med', w: 1.5, d: 0.8 },

  // ── Tall (1.3–1.5m) ──
  { abbr: 'GD',  name: 'Giant Dorito',  height: 1.30, group: 'tall', w: 1.5, d: 2.2 },
  { abbr: 'Wg',  name: 'Wing',          height: 1.40, group: 'tall', w: 2.0, d: 1.0 },
  { abbr: 'Az',  name: 'Aztec',         height: 1.40, group: 'tall', w: 1.5, d: 1.5 },
  { abbr: 'GP',  name: 'Giant Plus',    height: 1.50, group: 'tall', w: 2.5, d: 2.5 },
  { abbr: 'T',   name: 'Temple',        height: 1.50, group: 'tall', w: 1.8, d: 1.5 },
  { abbr: 'GB',  name: 'Giant Brick',   height: 1.50, group: 'tall', w: 3.0, d: 1.5 },
  { abbr: 'Pn',  name: 'Pin',           height: 1.50, group: 'tall', w: 0.5, d: 0.5, shape: 'circle' },

  // ── Extra tall (≥1.6m) ──
  { abbr: 'TCK', name: 'Tall Cake',     height: 1.60, group: 'xtall', w: 1.5, d: 1.5 },
  { abbr: 'GW',  name: 'Giant Wing',    height: 1.70, group: 'xtall', w: 2.4, d: 1.5 },
  { abbr: 'Mn',  name: 'Monolith',      height: 1.80, group: 'xtall', w: 2.0, d: 0.6 },
  { abbr: 'MT',  name: 'Maya Temple',   height: 1.80, group: 'xtall', w: 2.5, d: 2.0 },
];

export const BUNKER_GROUP_COLORS = {
  beam: P.gray400,   // gray — structural, not played
  low: P.green500,   // green
  med: P.amber500,   // amber
  tall: P.red400,    // light red
  xtall: P.red600,   // dark red
};

export const BUNKER_GROUP_LABELS = {
  beam: 'Belki',
  low: 'Niskie (≤0.9m)',
  med: 'Średnie (1.0–1.2m)',
  tall: 'Wysokie (1.3–1.5m)',
  xtall: 'Bardzo wysokie (≥1.6m)',
};

// Legacy flat list for backward compatibility
export const BUNKER_TYPE_NAMES = BUNKER_TYPES.map(b => b.name);

// Lookup helpers
export const bunkerByAbbr = (abbr) => BUNKER_TYPES.find(b => b.abbr === abbr);
export const bunkerHeight = (abbr) => bunkerByAbbr(abbr)?.height || 1.2;

export function guessType(name) {
  if (!name) return 'Br';
  const n = name.toUpperCase().trim();

  // ── Snake beams vs snake positions ──
  // SB, SB1, SB2, SNAKE BEAM → beam (cover, no label)
  if (/^SB\d*$|SNAKE\s*BEAM/.test(n)) return 'SB';
  // S1, S2, S3, S50, SNAKE1, SNAKE → position (Can — playable)
  if (/^S\d+$|^SNAKE\d*$/.test(n)) return 'C';

  // ── Doritos ──
  if (/^SD/.test(n)) return 'SD';
  if (/^GD|GIANT.?D/.test(n)) return 'GD';
  if (/^MD|DORITO|^D\d|^D50/.test(n)) return 'MD';

  // ── Cylinders ──
  if (/^C\d*$|^CAN/.test(n)) return 'C';
  if (/^R\d*$|ROLL/.test(n)) return 'R';
  if (/^TR|TREE/.test(n)) return 'Tr';
  if (/^PN|^PIN|PENCIL/.test(n)) return 'Pn';

  // ── Bricks & wedges ──
  if (/^GB|GIANT.?B/.test(n)) return 'GB';
  if (/^BR|BRICK/.test(n)) return 'Br';
  if (/^MW|MINI.?W/.test(n)) return 'MW';
  if (/^GW|GIANT.?W/.test(n)) return 'GW';
  if (/^WG|^WING/.test(n)) return 'Wg';
  if (/^MN|MONOL/.test(n)) return 'Mn';

  // ── Cakes ──
  if (/^TCK|TALL.?C/.test(n)) return 'TCK';
  if (/^CK|CAKE/.test(n)) return 'Ck';

  // ── Temples & specials ──
  if (/^MT|MAYA/.test(n)) return 'MT';
  if (/^AZ|AZTEC/.test(n)) return 'Az';
  if (/^T\d*$|TEMPLE/.test(n)) return 'T';
  if (/^GP|PLUS|STAR|DALLAS/.test(n)) return 'GP';

  return 'Br'; // default: brick
}

export const POINT_OUTCOMES = [
  { key: 'win', label: 'Wygrana', emoji: '✅', color: COLORS.win },
  { key: 'loss', label: 'Przegrana', emoji: '❌', color: COLORS.loss },
  { key: 'timeout', label: 'Czas', emoji: '⏱', color: COLORS.timeout },
];

export const BUMP_STOP_RANGE = { min: 1, max: 5, step: 1 };

// Divisions per league
export const DIVISIONS = {
  NXL: ['PRO', 'SEMI-PRO', 'D2', 'D3', 'D4'],
  PXL: ['Div.1', 'Div.2', 'Div.3'],
  DPL: ['Div.1', 'Div.2', 'Div.3'],
};

export const APP_NAME = 'PbScoutPro';
export const APP_VERSION = '0.4';
export const APP_AUTHOR = 'Jacek Parczewski';

// ─── Responsive tokens ───
// Usage: import { responsive } from '../utils/theme'
// Then: const R = responsive(device.type)
// R.font.base, R.touch.minTarget, R.layout.maxWidth, R.layout.padding etc.

export const responsive = (deviceType = 'mobile') => {
  const mobile = {
    font: { xs: 11, sm: 12, base: 14, lg: 16, xl: 18, xxl: 22 },
    touch: { minTarget: 44, targetLg: 52, btnPadY: 10, btnPadX: 16, btnPadYSm: 8, btnPadXSm: 12 },
    layout: { maxWidth: '100%', padding: 12, gap: 8, cardPad: '10px 12px' },
    canvas: { maxHeight: 340 },
    modal: { maxWidth: '100%', borderRadius: 14 },
    icon: { size: 18, btn: 40 },
  };

  const tablet = {
    font: { xs: 12, sm: 13, base: 14, lg: 16, xl: 20, xxl: 26 },
    touch: { minTarget: 44, targetLg: 52, btnPadY: 10, btnPadX: 18, btnPadYSm: 7, btnPadXSm: 12 },
    layout: { maxWidth: 768, padding: 20, gap: 12, cardPad: '12px 16px' },
    canvas: { maxHeight: 480 },
    modal: { maxWidth: 560, borderRadius: 16 },
    icon: { size: 18, btn: 40 },
  };

  const desktop = {
    font: { xs: 11, sm: 12, base: 13, lg: 15, xl: 18, xxl: 24 },
    touch: { minTarget: 36, targetLg: 44, btnPadY: 8, btnPadX: 16, btnPadYSm: 5, btnPadXSm: 10 },
    layout: { maxWidth: 1200, padding: 24, gap: 16, cardPad: '10px 16px' },
    canvas: { maxHeight: 600 },
    modal: { maxWidth: 480, borderRadius: 12 },
    icon: { size: 16, btn: 36 },
  };

  return { mobile, tablet, desktop }[deviceType] || mobile;
};

// ─── Layout helpers ───
// Two-column layout on tablet/desktop, single column on mobile
export const twoCol = (deviceType) =>
  deviceType !== 'mobile'
    ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }
    : { display: 'flex', flexDirection: 'column', gap: 12 };

// Sidebar layout (list + detail) — only on desktop
export const sidebarLayout = (deviceType) =>
  deviceType === 'desktop'
    ? { display: 'grid', gridTemplateColumns: '320px 1fr', gap: 0, minHeight: '100vh' }
    : { display: 'flex', flexDirection: 'column' };
