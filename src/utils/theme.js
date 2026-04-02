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
  textDim: P.gray500,
  textMuted: P.gray600,
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
export const BUNKER_TYPES = [
  // Low (≤0.9m)
  { abbr: 'SB',  name: 'Snake Beam',    height: 0.76, group: 'low' },
  { abbr: 'SD',  name: 'Small Dorito',  height: 0.85, group: 'low' },
  { abbr: 'Tr',  name: 'Tree',          height: 0.90, group: 'low' },
  // Medium (1.0–1.2m)
  { abbr: 'MD',  name: 'Med. Dorito',   height: 1.00, group: 'med' },
  { abbr: 'Ck',  name: 'Cake',          height: 1.00, group: 'med' },
  { abbr: 'Br',  name: 'Brick',         height: 1.15, group: 'med' },
  { abbr: 'C',   name: 'Can',           height: 1.20, group: 'med' },
  { abbr: 'MW',  name: 'Mini Wedge',    height: 1.20, group: 'med' },
  // Tall (≥1.4m)
  { abbr: 'Wg',  name: 'Wing',          height: 1.40, group: 'tall' },
  { abbr: 'GP',  name: 'Giant Plus',    height: 1.50, group: 'tall' },
  { abbr: 'T',   name: 'Temple',        height: 1.50, group: 'tall' },
  { abbr: 'GB',  name: 'Giant Brick',   height: 1.50, group: 'tall' },
  { abbr: 'TCK', name: 'Tall Cake',     height: 1.60, group: 'tall' },
  { abbr: 'GW',  name: 'Giant Wing',    height: 1.70, group: 'tall' },
  { abbr: 'MT',  name: 'Maya Temple',   height: 1.80, group: 'tall' },
];

export const BUNKER_GROUP_COLORS = {
  low: P.green500,  // green
  med: P.amber500,  // amber
  tall: P.red500,   // red
};

// Legacy flat list for backward compatibility
export const BUNKER_TYPE_NAMES = BUNKER_TYPES.map(b => b.name);

// Lookup helpers
export const bunkerByAbbr = (abbr) => BUNKER_TYPES.find(b => b.abbr === abbr);
export const bunkerHeight = (abbr) => bunkerByAbbr(abbr)?.height || 1.2;

export function guessType(name) {
  if (!name) return 'Br';
  const n = name.toUpperCase();
  if (/^SB\d?$|SNAKE|^S\d/.test(n)) return 'SB';
  if (/^SD/.test(n)) return 'SD';
  if (/^MD|DORITO|^D\d|^D50/.test(n)) return 'MD';
  if (/^TR|TREE/.test(n)) return 'Tr';
  if (/^C\d?$|CAN|CYLINDER/.test(n)) return 'C';
  if (/^GB|GIANT.?B/.test(n)) return 'GB';
  if (/^BR|BRICK/.test(n)) return 'Br';
  if (/^MW|MINI.?W/.test(n)) return 'MW';
  if (/^GW|GIANT.?W/.test(n)) return 'GW';
  if (/^WG|^WING/.test(n)) return 'Wg';
  if (/^TCK|TALL.?C/.test(n)) return 'TCK';
  if (/^CK|CAKE/.test(n)) return 'Ck';
  if (/^MT|MAYA/.test(n)) return 'MT';
  if (/^T\d?$|TEMPLE/.test(n)) return 'T';
  if (/^GP|PLUS|STAR/.test(n)) return 'GP';
  return 'Br';
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
