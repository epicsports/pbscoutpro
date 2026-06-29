import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { hasFlag, flagDataUri } from '../../utils/flags';
import { splitTeamName } from '../../utils/color';
import { COLORS, FONT, FONT_COND, ELEV } from '../../utils/theme';
import RdIcon from '../RdIcon';

/**
 * SideSwapStrip — the consolidated manual side-swap strip (design handoff:
 * "Scout — VS intro", the `.pstrip` + `.swap`/`.swapwrap` strip, lines ~119/132-371).
 *
 * Replaces the old "flip pill" + separate start-side indicator with ONE strip:
 *   [ team on field-left ]  ·  ( amber ⇄ )  ·  [ team on field-right ]
 * Each half shows the team's 3-tier identity crest (logo → country flag → none,
 * SAME resolver as VsIntro / CrestBand) bleeding in from the outer edge, a
 * city-eyebrow + nickname lockup (`splitTeamName`), and a small side chip
 * (LEFT / RIGHT) — amber for the scouted team, neutral for the opponent.
 *
 * The centre amber ⇄ button is the REAL field-side swap (NOT display-only): it
 * calls `onSwap`, which flips the existing `fieldSide` + mirrors the live capture
 * EXACTLY as the previous flip pill did. When `fieldSide` flips, the two halves
 * exchange position because the strip mirrors the FIELD (left half = field-left
 * team), so the swap reads as a literal left/right exchange.
 *
 * `orientation`:
 *   'horizontal' (default) — the design's portrait `.pstrip` (phone chrome).
 *   'vertical'             — ADAPTED for the narrow landscape/immersive rail
 *                            (the design hides `.pstrip` in landscape; we stack
 *                            field-left team / ⇄ / field-right team instead).
 *
 * Identity colours travel with each team (NEVER amber — § 27: amber is reserved
 * for the interactive ⇄ control + the scouted-side chip, both interactive/active).
 */

// 3-tier identity resolver — mirrors VsIntro.crestSrc / CrestBand fallback order.
function crestSrc(team) {
  if (team?.logoUrl) return team.logoUrl;
  if (hasFlag(team?.country)) return flagDataUri(team.country);
  return null;
}

const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const cityColor = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, #fff)`;

// Left-bleed → fade-right (and its mirror), ported from CrestBand's WM_LOGO.
const MASK_L = 'linear-gradient(90deg, #000 0%, #000 48%, transparent 84%)';
const MASK_R = 'linear-gradient(270deg, #000 0%, #000 48%, transparent 84%)';

export default function SideSwapStrip({
  scouted,
  opponent,
  scoutedColor,
  opponentColor,
  fieldSide,
  onSwap,
  orientation = 'horizontal',
}) {
  const { t } = useLanguage();
  const vertical = orientation === 'vertical';

  // The scouted (active) team starts from `fieldSide`; the opponent is opposite.
  // The strip mirrors the FIELD, so the field-left team is the LEAD half.
  const scoutedOnLeft = fieldSide !== 'right';
  const lead = scoutedOnLeft
    ? { team: scouted, color: scoutedColor, isScouted: true, side: 'left' }
    : { team: opponent, color: opponentColor, isScouted: false, side: 'left' };
  const trail = scoutedOnLeft
    ? { team: opponent, color: opponentColor, isScouted: false, side: 'right' }
    : { team: scouted, color: scoutedColor, isScouted: true, side: 'right' };

  // In horizontal the trailing half bleeds/aligns from the RIGHT edge; in the
  // narrow vertical rail both halves bleed from the left (text reads left).
  const renderCell = (slot, fromRight) => {
    const { team, color, isScouted, side } = slot;
    const { city, nick } = splitTeamName(team?.name || '');
    const src = crestSrc(team);
    const alignEnd = !vertical && fromRight;
    const sideLabel = t(side === 'left' ? 'match_side_left' : 'match_side_right');

    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: alignEnd ? 'flex-end' : 'flex-start',
          background: fromRight
            ? `linear-gradient(270deg, ${mix(color, 52)}, transparent 80%)`
            : `linear-gradient(90deg, ${mix(color, 52)}, transparent 80%)`,
          minHeight: 52,
        }}
      >
        {src ? (
          <img
            src={src}
            alt=""
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [fromRight ? 'right' : 'left']: -10,
              height: vertical ? 42 : 54,
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.9,
              mixBlendMode: 'screen',
              pointerEvents: 'none',
              WebkitMaskImage: fromRight ? MASK_R : MASK_L,
              maskImage: fromRight ? MASK_R : MASK_L,
            }}
          />
        ) : null}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            alignItems: alignEnd ? 'flex-end' : 'flex-start',
            textAlign: alignEnd ? 'right' : 'left',
            padding: alignEnd ? '0 12px 0 46px' : '0 46px 0 12px',
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: 9,
              fontWeight: 800,
              letterSpacing: '1.3px',
              textTransform: 'uppercase',
              lineHeight: 1.2,
              padding: '2px 6px',
              borderRadius: 5,
              whiteSpace: 'nowrap',
              background: isScouted ? COLORS.accent : 'rgba(8,11,18,.55)',
              color: isScouted ? COLORS.black : COLORS.textDim,
              border: isScouted ? 'none' : `1px solid ${ELEV.hairlineStrong}`,
            }}
          >
            {sideLabel}
          </span>
          {city ? (
            <span
              style={{
                fontFamily: FONT,
                fontSize: 9.5,
                fontWeight: 800,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: cityColor(color, 42),
                textShadow: '0 1px 4px rgba(0,0,0,.7)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
              }}
            >
              {city}
            </span>
          ) : null}
          <span
            style={{
              fontFamily: FONT_COND,
              fontSize: vertical ? 18 : 20,
              fontWeight: 700,
              lineHeight: 0.98,
              textTransform: 'uppercase',
              color: COLORS.white,
              textShadow: '0 2px 8px rgba(0,0,0,.8)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '100%',
            }}
          >
            {nick}
          </span>
        </div>
      </div>
    );
  };

  // Centre amber ⇄ — the REAL swap (interactive → amber is correct per § 27).
  const swapWrap = (
    <div
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: ELEV.sunken,
        ...(vertical ? { width: '100%', height: 48 } : { width: 52, alignSelf: 'stretch' }),
      }}
    >
      <button
        type="button"
        className="sss-swap"
        onClick={onSwap}
        title={t('match_swap_sides')}
        aria-label={t('match_swap_sides')}
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          flex: 'none',
          background: ELEV.raised,
          border: `1px solid ${ELEV.hairlineStrong}`,
          color: COLORS.accent,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,.55)',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
        }}
      >
        <RdIcon name="swap" size={18} />
      </button>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'stretch',
        width: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        border: `1px solid ${ELEV.hairline}`,
        background: ELEV.surface,
        boxShadow: ELEV.innerTop,
      }}
    >
      {renderCell(lead, false)}
      {swapWrap}
      {renderCell(trail, !vertical)}
    </div>
  );
}
