// Take a Break — the game selector (§119.S). A data-driven vertical list of the
// in-app mini-games; each row opens its game, back returns here. Adding a game =
// one GAMES entry + one lazy route. Per-row HI = that game's leaderboard #1
// (cheap one-shot; degrades silently if the board is unavailable). Lazy chunk
// (App.jsx /break). Reuses the shared ui/theme; games live at /break/<id>.
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ChevronRight } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import * as ds from '../services/dataService';

// Brand mark (amber dot + seam) — Reads Mini's icon.
function ReadsGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden>
      <circle cx="12" cy="12" r="8" fill={COLORS.accent} />
      <rect x="2" y="11" width="20" height="2" fill={COLORS.surface} />
    </svg>
  );
}
// Snake glyph (placeholder per §119.S — swap for final art later).
function SnakeGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }} aria-hidden>
      <path d="M4 18c2.2 0 2.2-3 4.4-3s2.2 3 4.4 3 2.2-6 4.4-6" />
      <path d="M4 12c2.2 0 2.2-3 4.4-3S10.6 12 12.8 12" />
      <circle cx="19.4" cy="9" r="2.1" fill={COLORS.accent} stroke="none" />
    </svg>
  );
}

// Lander glyph (menu tile — chrome, exempt from the in-game brand-mark ban).
function LanderGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }} aria-hidden>
      <path d="M8 7h8l1.6 4-1.6 3.2H8L6.4 11 8 7Z" />
      <path d="M9 6.6a3 3 0 0 1 6 0" />
      <path d="M8 14.2 6 19M16 14.2 18 19M6 19h2M16 19h2" />
    </svg>
  );
}

// Data-driven game registry. New games append here + add a lazy /break/<id> route.
const GAMES = [
  { id: 'snake', route: '/break/snake', Icon: SnakeGlyph, nameKey: 'reads_snake_name', nameFallback: 'side is the best!', subKey: 'reads_snake_sub', subFallback: 'Classic snake', top: ds.getReadsSnakeTop },
  { id: 'lander', route: '/break/lander', Icon: LanderGlyph, nameKey: 'reads_lander_name', nameFallback: 'Lunar Lander', subKey: 'reads_lander_menu_sub', subFallback: 'Land soft', top: ds.getReadsLanderTop },
  { id: 'reads', route: '/break/reads', Icon: ReadsGlyph, nameKey: 'reads_mini_name', nameFallback: 'Reads Mini', subKey: 'reads_mini_sub', subFallback: 'Catch the drops', top: ds.getReadsMiniTop },
];

export default function TakeABreakPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [his, setHis] = useState({});   // { [id]: topScore }

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(GAMES.map(async (g) => {
        try { const rows = await g.top(1); return [g.id, rows[0]?.score || 0]; }
        catch { return [g.id, null]; }
      }));
      if (alive) setHis(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, []);

  return (
    <div data-testid="take-a-break"
      style={{
        position: 'fixed', inset: 0, background: COLORS.bg, zIndex: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: FONT, color: COLORS.text, overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      {/* Header */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('take_a_break_close') || 'Close'} data-testid="take-a-break-close" onClick={() => navigate('/')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <X size={22} />
        </div>
        <span style={{ flex: 1, fontSize: FONT_SIZE.sm, fontWeight: 800, letterSpacing: 1, color: COLORS.textDim }}>
          {t('reads_mini_menu_label') || 'Take a Break'}
        </span>
        <div style={{ minWidth: TOUCH.minTarget }} />
      </div>

      {/* Game list */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', flexDirection: 'column', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        {GAMES.map((g) => {
          const hi = his[g.id];
          return (
            <button key={g.id} type="button" data-testid={`game-row-${g.id}`} onClick={() => navigate(g.route)}
              style={{
                display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', textAlign: 'left',
                minHeight: 60, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box',
                background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent', color: COLORS.text,
              }}>
              <span style={{ flex: 'none', width: 46, height: 46, borderRadius: RADIUS.md, background: `${COLORS.accent}1a`, border: `1px solid ${COLORS.accent}4d`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <g.Icon size={26} />
              </span>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: FONT_SIZE.base, fontWeight: 800, color: COLORS.text }}>{t(g.nameKey) || g.nameFallback}</span>
                <span style={{ fontSize: FONT_SIZE.xs, fontWeight: 600, letterSpacing: 0.4, color: COLORS.textMuted, textTransform: 'uppercase' }}>{t(g.subKey) || g.subFallback}</span>
              </span>
              {hi != null && hi > 0 && (
                <span style={{ flex: 'none', fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textDim, fontVariantNumeric: 'tabular-nums', letterSpacing: 0.4 }}>
                  HI&nbsp;{String(hi).padStart(4, '0')}
                </span>
              )}
              <span style={{ flex: 'none', display: 'flex', alignItems: 'center', color: COLORS.textMuted }}><ChevronRight size={20} /></span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
