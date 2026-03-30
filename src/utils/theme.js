// ─── PbScoutPro Theme ───

export const COLORS = {
  bg: '#0a0e17',
  surface: '#111827',
  surfaceLight: '#1a2234',
  surfaceHover: '#1f2b3d',
  border: '#2a3548',
  borderActive: '#f59e0b',
  accent: '#f59e0b',
  accentDim: '#b47708',
  danger: '#ef4444',
  dangerDim: '#991b1b',
  success: '#22c55e',
  successDim: '#166534',
  text: '#e2e8f0',
  textDim: '#64748b',
  textMuted: '#475569',
  white: '#ffffff',
  black: '#000000',
  win: '#22c55e',
  loss: '#ef4444',
  timeout: '#f59e0b',
  playerColors: ['#ef4444', '#3b82f6', '#22c55e', '#a855f7', '#f97316'],
  eliminatedOverlay: '#475569',
  skull: '#ef4444',
  bumpStop: '#fbbf24',
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

export const BUNKER_TYPES = [
  'Can', 'Rollie', 'Dorito', 'Temple', 'X-Bunker', 'Brick',
  'Dollhouse', 'Carwash', 'Snake', 'Tower', 'Beam', 'Wing',
  'Tall Cake', 'Small Cake', 'Maya', 'Inne',
];

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
