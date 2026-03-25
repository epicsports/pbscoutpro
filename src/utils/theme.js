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
