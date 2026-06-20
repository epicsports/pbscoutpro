import React, { useState } from 'react';
import { COLORS, ELEV, FONT, SPACE, TRACKING } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import RdIcon from '../RdIcon';

const HANDEDNESS_KEY = 'pbscoutpro-handedness';
const COLORBLIND_KEY = 'pbscoutpro-colorblind';

/**
 * Shared building blocks for the More tab (training + tournament).
 *
 * Information architecture:
 *  1. SESSION  — what you're working on now (edit + layout)
 *  2. BROWSE   — workspace data (layouts/teams/players/scouts)
 *  3. ACTIONS  — single adaptive row (end/close when live → delete when ended)
 *  4. ACCOUNT  — profile + workspace + sign out
 *
 * Status display lives in the global context bar (AppShell) — the More tab
 * does not re-render it. "Create new tournament/training" lives in the
 * context picker (header "Change" button).
 */

export function MoreShell({ children }) {
  return (
    <div style={{
      padding: SPACE.lg,
      paddingBottom: 32,
      display: 'flex',
      flexDirection: 'column',
      gap: SPACE.lg,
      maxWidth: 720,
      margin: '0 auto',
      width: '100%',
      boxSizing: 'border-box',
    }}>
      {children}
    </div>
  );
}

// Premium eyebrow + Card (ELEV). Eyebrow = uppercase label + hairline rule; the
// card is a resting surface with a 1px hairline + soft shadow + 16px radius.
export function MoreSection({ title, tone = 'default', children }) {
  const isDanger = tone === 'danger';
  return (
    <div style={{ marginTop: isDanger ? SPACE.md : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 2px 9px', padding: '0 2px' }}>
        <span style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 800,
          color: isDanger ? `${COLORS.danger}cc` : COLORS.textMuted,
          textTransform: 'uppercase', letterSpacing: TRACKING.label,
        }}>{title}</span>
        <div style={{ flex: 1, height: 1, background: ELEV.hairline }} />
      </div>
      <div style={{
        background: ELEV.surface,
        border: `1px solid ${isDanger ? `${COLORS.danger}33` : ELEV.hairline}`,
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: ELEV.shadow1,
      }}>
        {children}
      </div>
    </div>
  );
}

// Premium row — a sunken icon TILE (RdIcon line-icon via `iconName`; emoji `icon`
// is a transitional fallback rendered inside the same tile) + title + sub + chevron
// (or rightSlot). Hairline divider between rows.
export function MoreItem({ icon, iconName, label, sub, onClick, danger, accent, isLast, rightSlot, testId }) {
  const labelColor = danger ? COLORS.danger : accent ? COLORS.accent : COLORS.text;
  const iconTone = danger ? COLORS.danger : accent ? COLORS.accent : COLORS.textDim;
  return (
    <div className="rd-zone" onClick={onClick} data-testid={testId} style={{
      display: 'flex', alignItems: 'center', gap: 13,
      padding: '12px 13px', minHeight: 52,
      cursor: onClick ? 'pointer' : 'default',
      borderBottom: isLast ? 'none' : `1px solid ${ELEV.hairline}`,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: 10, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
        color: iconTone, boxShadow: ELEV.innerTop, fontSize: 16,
      }}>{iconName ? <RdIcon name={iconName} size={17} /> : icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 700,
          color: labelColor,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>{label}</div>
        {sub && (
          <div style={{
            fontFamily: FONT, fontSize: 12.5, color: COLORS.textDim,
            marginTop: 1,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>{sub}</div>
        )}
      </div>
      {rightSlot ? rightSlot : onClick && (
        <span style={{ color: COLORS.textMuted, display: 'flex', flexShrink: 0 }}><RdIcon name="chevron" size={15} /></span>
      )}
    </div>
  );
}

/**
 * ScoutingSection — user-configurable preferences that affect the
 * scouting surface (canvas, loupe). Today the only option is loupe
 * handedness; future brief will add more (e.g., haptic feedback,
 * default point mode). Kept as its own MoreSection so discovery
 * scales as we grow.
 *
 * Handedness persists via localStorage under `pbscoutpro-handedness`
 * (read in `drawLoupe.js`). No Firestore sync — this is a per-device
 * ergonomic preference, not account-level.
 */
export function ScoutingSection() {
  const { t } = useLanguage();
  const [handedness, setHandedness] = useState(() => {
    try { return localStorage.getItem(HANDEDNESS_KEY) || 'right'; }
    catch { return 'right'; }
  });
  const toggleHandedness = () => {
    const next = handedness === 'right' ? 'left' : 'right';
    setHandedness(next);
    try { localStorage.setItem(HANDEDNESS_KEY, next); } catch {}
  };
  const handLabel = handedness === 'right'
    ? (t('handedness_right') || 'RIGHT')
    : (t('handedness_left') || 'LEFT');

  // § 115 colour-blind mode — one per-device setting drives heatmaps + the
  // intensity ramp. Persist + reload so every canvas re-reads the scheme app-wide
  // (boot-read in main.jsx). No Firestore sync (per-device, like handedness).
  const [colorblind, setColorblind] = useState(() => {
    try { return localStorage.getItem(COLORBLIND_KEY) === 'on'; } catch { return false; }
  });
  const toggleColorblind = () => {
    const next = !colorblind;
    setColorblind(next);
    try { localStorage.setItem(COLORBLIND_KEY, next ? 'on' : 'off'); } catch {}
    window.location.reload();
  };
  const pill = (text) => (
    <span style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.accent,
      padding: '4px 8px', borderRadius: 6, background: `${COLORS.accent}10`,
      border: `1px solid ${COLORS.accent}30`, letterSpacing: 0.4,
      display: 'inline-flex', alignItems: 'center', marginRight: 4,
    }}>{text}</span>
  );
  return (
    <MoreSection title={t('scouting_section') || 'Scouting'}>
      <MoreItem
        iconName="hand"
        label={t('handedness_label') || 'Dominant hand'}
        sub={t('handedness_sub') || 'Loupe position while scouting'}
        onClick={toggleHandedness}
        rightSlot={pill(handLabel)}
      />
      <MoreItem
        iconName="palette"
        label={t('colorblind_label') || 'Colour-blind mode'}
        sub={t('colorblind_sub') || 'Heatmaps + intensity ramp'}
        onClick={toggleColorblind}
        rightSlot={pill(colorblind ? (t('on') || 'ON') : (t('off') || 'OFF'))}
        isLast
      />
    </MoreSection>
  );
}

/**
 * LanguageSection — last section of every More tab.
 * Single MoreItem showing current language as a pill on the right.
 * Tap toggles between PL and EN (only two languages supported today).
 */
export function LanguageSection() {
  const { lang, setLang, t } = useLanguage();
  const next = lang === 'pl' ? 'en' : 'pl';
  const flag = lang === 'pl' ? '🇵🇱' : '🇬🇧';
  const langName = lang === 'pl' ? 'Polski' : 'English';
  return (
    <MoreSection title={t('language_section') || 'Język'}>
      <MoreItem
        iconName="globe"
        label={langName}
        onClick={() => setLang(next)}
        rightSlot={
          <span style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 700,
            color: COLORS.accent,
            padding: '4px 8px', borderRadius: 6,
            background: `${COLORS.accent}10`,
            border: `1px solid ${COLORS.accent}30`,
            letterSpacing: 0.4,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            marginRight: 4,
          }}>
            {flag} {lang.toUpperCase()}
          </span>
        }
        isLast
      />
    </MoreSection>
  );
}
