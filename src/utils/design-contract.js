/**
 * PbScoutPro Design Contract
 * 
 * Single source of truth for UI layout rules.
 * Shared components import from here — not from ad-hoc inline values.
 * If you need to change a spacing/sizing rule, change it HERE.
 */

import { COLORS, FONT, TOUCH } from './theme';

// ── Page Header ──
export const HEADER = {
  padding: '10px 16px',
  background: COLORS.surface,
  borderBottom: `1px solid ${COLORS.border}`,
  position: 'sticky',
  top: 0,
  zIndex: 20,
  title: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: TOUCH.fontBase,
    color: COLORS.text,
  },
  backLabel: {
    fontFamily: FONT,
    fontSize: TOUCH.fontSm,
    fontWeight: 500,
    color: COLORS.accent,
  },
  subtitle: {
    fontFamily: FONT,
    fontSize: 10,
    color: COLORS.textDim,
  },
};

// ── Bottom Bars (mode tabs, action bars) ──
export const BOTTOM_BAR = {
  position: 'sticky',
  bottom: 0,
  zIndex: 20,
  background: COLORS.surface,
  borderTop: `1px solid ${COLORS.border}`,
  paddingBottom: 'env(safe-area-inset-bottom, 0px)',
};

// ── Mode Tab (inside ModeTabBar) ──
export const MODE_TAB = {
  flex: 1,
  padding: '10px 4px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 2,
  icon: { fontSize: 18 },
  label: {
    fontFamily: FONT,
    fontSize: 10,
  },
  active: {
    borderTop: `2px solid ${COLORS.accent}`,
    color: COLORS.accent,
    fontWeight: 700,
  },
  inactive: {
    borderTop: '2px solid transparent',
    color: COLORS.textMuted,
    fontWeight: 400,
  },
};

// ── Bottom Sheet ──
export const BOTTOM_SHEET = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  sheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: COLORS.surface,
    borderTop: `1px solid ${COLORS.border}`,
    borderRadius: '14px 14px 0 0',
    padding: '8px 16px 16px',
    paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
    zIndex: 91,
    maxHeight: '50vh',
    overflowY: 'auto',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    background: COLORS.border,
  },
  title: {
    fontFamily: FONT,
    fontWeight: 700,
    fontSize: TOUCH.fontBase,
    color: COLORS.text,
    marginBottom: 10,
  },
};

// ── Form Controls ──
export const FORM = {
  // Shared border/bg for all controls
  border: `1px solid ${COLORS.border}`,
  borderRadius: 8,
  background: COLORS.bg,
  color: COLORS.text,
  fontFamily: FONT,
  
  input: {
    fontSize: TOUCH.fontSm,
    minHeight: 44, // mobile touch target
    minHeightDesktop: 36,
    padding: '10px 14px',
    paddingDesktop: '7px 12px',
  },
  select: {
    fontSize: TOUCH.fontSm,
    minHeight: 44,
    minHeightDesktop: 36,
    padding: '8px 12px',
  },
  checkbox: {
    labelFontSize: TOUCH.fontXs,
    gap: 6,
    minHeight: 32,
  },
  slider: {
    labelFontSize: TOUCH.fontXs,
    labelMinWidth: 48,
    valueFontSize: TOUCH.fontXs,
    valueMinWidth: 28,
    height: 20,
    gap: 6,
  },
  textarea: {
    fontSize: TOUCH.fontSm,
    minHeight: 56,
    resize: 'vertical',
  },
  fieldLabel: {
    fontFamily: FONT,
    fontSize: TOUCH.fontXs,
    color: COLORS.textDim,
    marginBottom: 4,
  },
};

// ── Touch Targets ──
export const TOUCH_RULES = {
  minTarget: 44,        // minimum touch target on mobile (px)
  minTargetDesktop: 36,  // minimum on desktop
  recommendedTarget: 48, // recommended per Apple HIG
};

// ── Canvas Toolbar (FieldEditor) ──
export const CANVAS_TOOLBAR = {
  padding: 4,
  gap: 4,
  background: COLORS.surface,
  borderBottom: `1px solid ${COLORS.border}40`,
  button: {
    padding: '0 8px',
    minWidth: 32,
  },
};

// ── Player Colors ──
export const PLAYER_COLORS = COLORS.playerColors;

// ── Heatmap Toggle ──
export const HEATMAP_TOGGLE = {
  gap: 8,
  size: 'sm',
};

// ── Page Layout ──
export const PAGE = {
  maxWidth: 640,
  // Bottom padding for tab pages (clearance for BottomNav)
  tabPagePaddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))',
};
