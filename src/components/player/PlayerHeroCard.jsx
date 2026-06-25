/**
 * PlayerHeroCard — premium "North Star" hero player card.
 *
 * Extracted verbatim from PlayerStatsPage.jsx (§ 24 / design-review 2026-06-21)
 * so the design review can render it in isolation against edge-case data. Same
 * visual output as the inline IIFE it replaces — team-color band + jersey number
 * watermark + name treatment + meta strip + 3-stat line. Keeps the photo lightbox
 * Avatar and all identity info (real-logo TeamBadge, multi-team +N, HERO).
 *
 * Graceful fallbacks preserved:
 *   - no nickname → no eyebrow line
 *   - no number → no watermark, no #n meta chip, no avatar number badge
 *   - missing OR failed photo → initials fallback (never an empty circle)
 *   - long surname → 2-line wrap + ellipsis (line-height 1.05, no font-shrink)
 *   - no stat-line data → the whole stat line hides
 *
 * Props:
 *   player        — { id, name, nickname, number, color, photoURL, teamId, hero }
 *   playerTeam    — the resolved team doc (for color + TeamBadge), or null
 *   isHero        — show the ★ HERO badge
 *   stats         — computePlayerStats output ({ positions, bunkers, ... })
 *   matches       — match-history rows (matches[0] = last match)
 *   onPhotoClick  — (photoURL) => void, opens the photo lightbox
 */
import React from 'react';
import { COLORS, FONT, ZONE_COLORS, ELEV, TNUM } from '../../utils/theme';
import TeamBadge from '../TeamBadge';
import RdIcon from '../RdIcon';
import { playerTeams } from '../../utils/playerTeams';
import { winRateColor } from '../../utils/colorScale';
import { useLanguage } from '../../hooks/useLanguage';

// ─── Side detection helpers (§ 59.4) ───
// classifyPosition returns full zone labels like "Snake Base", "Dorito 50".
// For § 59 we collapse depth and key by side (Snake / Center / Dorito).
function sideOf(zone) {
  if (!zone) return 'Center';
  if (zone.startsWith('Snake')) return 'Snake';
  if (zone.startsWith('Dorito')) return 'Dorito';
  return 'Center';
}
// Aggregate stats.positions ([{zone:"Snake Base", count, pct}, ...]) into
// side totals — collapses depth per § 59.7. Returns { Snake, Center, Dorito,
// total } where each side carries `count`. pct is recomputed against total.
function aggregateBySide(positions) {
  const acc = { Snake: 0, Center: 0, Dorito: 0 };
  let total = 0;
  (positions || []).forEach(p => {
    const s = sideOf(p.zone);
    acc[s] += p.count || 0;
    total += p.count || 0;
  });
  return { ...acc, total };
}

// ─── Avatar — 64px circle with number in accent color ───
// Design-review 2026-06-22: ALWAYS fall back to initials — on a missing photo
// OR a photo that fails to load (no empty grey circle). Number badge is hidden
// entirely when the player has no number (no "#?" placeholder).
function Avatar({ player, isHero, onPhotoClick }) {
  const color = player?.color || COLORS.accent;
  const photoURL = player?.photoURL;
  const [photoFailed, setPhotoFailed] = React.useState(false);
  const showPhoto = !!photoURL && !photoFailed;
  const initial = (player?.nickname || player?.name || '?').charAt(0).toUpperCase();
  const hasNumber = player?.number != null && player?.number !== '';
  // Stable color for fallback by id hash
  const hashColor = (() => {
    const s = player?.id || initial;
    let h = 0;
    for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
    const palette = ['#1e40af', '#7c3aed', '#be185d', '#b45309', '#15803d', '#0f766e', '#9f1239', '#5b21b6'];
    return palette[Math.abs(h) % palette.length];
  })();

  // Photo opens a full-image lightbox when present — PBLeagues photos are
  // usually head-to-toe shots tightly cropped by the 64px circle, so the
  // tap-to-enlarge restores the original framing.
  const clickableProps = showPhoto && onPhotoClick ? {
    role: 'button',
    onClick: (e) => { e.stopPropagation(); onPhotoClick(photoURL); },
    style: { cursor: 'pointer', WebkitTapHighlightColor: 'transparent' },
  } : {};

  return (
    <div {...clickableProps} style={{ position: 'relative', flexShrink: 0, ...(clickableProps.style || {}) }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: showPhoto ? COLORS.surfaceLight : hashColor,
        border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
        fontFamily: FONT, fontWeight: 800, fontSize: 28, color: COLORS.white,
      }}>
        {showPhoto ? (
          <img src={photoURL} alt=""
            onError={() => setPhotoFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          initial
        )}
      </div>
      {/* Number badge — only when the player has a number (no #? placeholder). */}
      {hasNumber && (
        <div style={{
          position: 'absolute', bottom: -4, right: -4,
          minWidth: 26, height: 22, borderRadius: 11, padding: '0 6px',
          background: COLORS.accent, border: `2px solid ${COLORS.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.black,
          letterSpacing: '-.02em',
        }}>#{player.number}</div>
      )}
      {isHero && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 20, height: 20, borderRadius: '50%',
          background: COLORS.accent, border: `2px solid ${COLORS.bg}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: COLORS.black, fontWeight: 800,
        }}><RdIcon name="star" size={11} /></div>
      )}
    </div>
  );
}

export default function PlayerHeroCard({ player, playerTeam, isHero, stats, matches, onPhotoClick }) {
  const { t } = useLanguage();
  const tc = playerTeam?.color || COLORS.accent;
  const hs = aggregateBySide(stats.positions);
  const sideMeta = [
    { k: 'Snake',  label: t('zone_snake'),  n: hs.Snake,  color: ZONE_COLORS.snake },
    { k: 'Center', label: t('zone_center'), n: hs.Center, color: ZONE_COLORS.center },
    { k: 'Dorito', label: t('zone_dorito'), n: hs.Dorito, color: ZONE_COLORS.dorito },
  ].sort((a, b) => b.n - a.n);
  const topSide = sideMeta[0];
  const topSidePct = hs.total > 0 && topSide.n > 0 ? Math.round((topSide.n / hs.total) * 100) : null;
  const topStart = (stats.bunkers || []).slice().sort((a, b) => (b.survivalRate ?? -1) - (a.survivalRate ?? -1))[0] || null;
  const lastMatch = (matches || [])[0] || null;
  const hasNumber = player.number != null && player.number !== '';
  const nameParts = (player.name || '').trim().split(/\s+/);
  const first = nameParts[0] || player.name || '';
  const last = nameParts.slice(1).join(' ');
  const hasStatLine = topSidePct != null || (topStart && topStart.survivalRate != null) || lastMatch;
  const Dot = () => <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.textMuted, flexShrink: 0 }} />;
  const StatCell = ({ value, unit, label, sub, color }) => (
    <div style={{ flex: 1, minWidth: 0, padding: '12px 6px', textAlign: 'center' }}>
      <div style={{ fontFamily: FONT, fontWeight: 800, color: color || COLORS.text, lineHeight: 1, letterSpacing: '-.5px' }}>
        <span style={{ fontSize: 25, ...TNUM }}>{value ?? '—'}</span>
        {value != null && unit && <span style={{ fontSize: 13, fontWeight: 800, color: COLORS.textMuted, marginLeft: 1 }}>{unit}</span>}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.6px', textTransform: 'uppercase', marginTop: 7 }}>{label}</div>
      {sub && <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textDim, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ borderRadius: 18, overflow: 'hidden', border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1, background: ELEV.surface }}>
      {/* hero band */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '18px 16px', background: `radial-gradient(120% 130% at 82% 8%, ${tc}59, ${tc}10 46%, transparent 70%), linear-gradient(165deg, ${ELEV.raised}, ${ELEV.surface})` }}>
        {hasNumber && (
          <div style={{ position: 'absolute', top: -34, right: -8, fontFamily: FONT, fontSize: 168, fontWeight: 900, lineHeight: 1, color: '#ffffff', opacity: 0.06, letterSpacing: '-6px', pointerEvents: 'none', ...TNUM }}>{player.number}</div>
        )}
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: '22%', width: 5, transform: 'skewX(-16deg)', background: tc, opacity: 0.5, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, bottom: 0, right: '19%', width: 2, transform: 'skewX(-16deg)', background: tc, opacity: 0.85, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 15 }}>
          <Avatar player={player} isHero={isHero} onPhotoClick={onPhotoClick} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {player.nickname && (
              <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 900, color: tc, letterSpacing: '1.2px', textTransform: 'uppercase', marginBottom: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>„{player.nickname}”</div>
            )}
            {last && (
              <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 500, color: COLORS.text, lineHeight: 1.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{first}</div>
            )}
            {/* Surname (heavy line): wrap to 2 lines + ellipsis (design-review
                2026-06-22 — long hyphenated names wrap, never font-shrink). */}
            <div style={{ fontFamily: FONT, fontSize: 25, fontWeight: 900, color: COLORS.text, lineHeight: 1.05, letterSpacing: '-.5px', textTransform: 'uppercase', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{last || first}</div>
          </div>
        </div>
        {/* meta strip */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {topSidePct != null && (
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: topSide.color, letterSpacing: '.1px', whiteSpace: 'nowrap' }}>{topSide.label}</span>
          )}
          {playerTeam && (
            <>
              {topSidePct != null && <Dot />}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <TeamBadge team={playerTeam} size={16} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{playerTeam.name}</span>
              </span>
              {playerTeams(player).length > 1 && (
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textDim, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 4, padding: '1px 5px' }}>+{playerTeams(player).length - 1}</span>
              )}
            </>
          )}
          {hasNumber && (
            <>
              <Dot />
              <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.text, ...TNUM }}>#{player.number}</span>
            </>
          )}
          {isHero && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginLeft: 2, padding: '2px 7px', borderRadius: 6, background: COLORS.accentA12, border: `1px solid ${COLORS.accentA20}`, fontFamily: FONT, fontSize: 10, fontWeight: 800, color: COLORS.accent, letterSpacing: '.3px' }}><RdIcon name="star" size={10} />HERO</span>
          )}
        </div>
      </div>
      {/* stat line */}
      {hasStatLine && (
        <div style={{ display: 'flex', borderTop: `1px solid ${ELEV.hairline}`, background: ELEV.surface }}>
          <StatCell value={topSidePct} unit="%" label={t('hero_strona')} sub={topSidePct != null ? topSide.label : null} color={topSidePct != null ? topSide.color : null} />
          <div style={{ width: 1, background: ELEV.hairline, margin: '12px 0' }} />
          <StatCell value={topStart?.survivalRate} unit="%" label={t('hero_start')} sub={topStart?.name} color={topStart ? winRateColor(topStart.survivalRate) : null} />
          <div style={{ width: 1, background: ELEV.hairline, margin: '12px 0' }} />
          <StatCell value={lastMatch ? `${lastMatch.scoreA}–${lastMatch.scoreB}` : null} label={t('hero_ostatni')} sub={lastMatch ? (lastMatch.isWin ? t('hero_wygrana') : t('hero_przegrana')) : null} color={lastMatch ? (lastMatch.isWin ? COLORS.success : COLORS.danger) : null} />
        </div>
      )}
    </div>
  );
}
