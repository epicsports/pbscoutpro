import React from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { hasFlag, flagDataUri } from '../../utils/flags';
import { splitTeamName, rdShade } from '../../utils/color';
import { COLORS, FONT, FONT_COND, ELEV } from '../../utils/theme';
import RdIcon from '../RdIcon';

/**
 * SideSwapStrip — the consolidated matchup flip-card strip (design handoff
 * "Scout point — consolidated": the `.strip` / `.tside` / `.ctr` row, scoutpoint.jsx
 * lines 34-56 + 402-427). Rendered in BOTH the landscape immersive rail (the top
 * of the matchup card, with the phase timeline as its bottom strip) and the phone
 * portrait floating overlay on the field's top edge.
 *
 * One horizontal strip, three columns:
 *   [ field-LEFT team half ]  ·  [ centre: Punkt N + score + ⇄ ]  ·  [ field-RIGHT team half ]
 *
 * Each team half is FILLED with a 2-stop gradient DERIVED from that team's brand
 * colour (`color` → `rdShade(color)`), with the team's 3-tier identity crest
 * (logo → country flag → none, SAME resolver as VsIntro / CrestBand) bleeding LARGE
 * from the outer edge (`opacity .4`, `mix-blend-mode:screen`, gradient mask fading
 * under the city/nick lockup). The scouted side carries an amber "◀ Scout" tag; the
 * opponent a dimmed "Rywal ▶" tag.
 *
 * The centre amber ⇄ button is the REAL field-side swap (NOT display-only): it calls
 * `onSwap`, which flips the existing `fieldSide` + mirrors the live capture EXACTLY
 * as before. When `fieldSide` flips, the two halves exchange position because the
 * strip mirrors the FIELD (left half = field-left team).
 *
 * `orientation`:
 *   'vertical'   — the narrow landscape/immersive rail (compact: smaller nick, swap
 *                  stacked under the score). [legacy name — layout is still a row]
 *   'horizontal' — the phone portrait floating overlay (larger nick, score + swap
 *                  inline). [default]
 *
 * CHROME ONLY — `onSwap` is the unchanged `handleManualSwapSides`; the strip writes
 * no capture state. Identity colours/crests travel with each team (NEVER amber —
 * § 27: amber is reserved for the interactive ⇄ + the scouted "Scout" tag, both
 * interactive/active). The outer card backing (border / radius / glass) is supplied
 * by the host (rail matchup card / portrait float wrapper) so this strip is just the
 * 3-column band.
 */

// 3-tier identity resolver — mirrors VsIntro.crestSrc / CrestBand fallback order.
function crestSrc(team) {
  if (team?.logoUrl) return team.logoUrl;
  if (hasFlag(team?.country)) return flagDataUri(team.country);
  return null;
}

const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const cityColor = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, #fff)`;

// Crest bleed mask — opaque from the outer edge, fading to transparent under the
// text (ported from CrestBand's WM_LOGO; prototype `.bleed` mask).
const MASK_L = 'linear-gradient(90deg, #000, #000 44%, transparent 84%)';
const MASK_R = 'linear-gradient(270deg, #000, #000 44%, transparent 84%)';

// Two-stop team gradient (filled side), derived from a single brand colour:
//   stop A = brand @ 46%, stop B = darkened brand @ 30%, → transparent.
// `fromRight` mirrors the angle so the opponent half reads from the right edge.
const sideGradient = (color, fromRight) => {
  const a = color;
  const b = rdShade(color, 0.42); // darker 2nd stop (rgb string; composes in color-mix)
  return fromRight
    ? `linear-gradient(260deg, ${mix(a, 46)}, ${mix(b, 30)} 64%, transparent)`
    : `linear-gradient(100deg, ${mix(a, 46)}, ${mix(b, 30)} 64%, transparent)`;
};

export default function SideSwapStrip({
  scouted,
  opponent,
  scoutedColor,
  opponentColor,
  fieldSide,
  onSwap,
  orientation = 'horizontal',
  floating = false, // accepted for call-site compat; backing now lives on the host
  pointLabel = null, // "Punkt 5" — centre eyebrow (accent)
  score = null,      // "2:1"    — centre score (Oswald)
}) {
  const { t } = useLanguage();
  const vertical = orientation === 'vertical'; // landscape rail (compact)

  // The scouted (active) team starts from `fieldSide`; the opponent is opposite.
  // The strip mirrors the FIELD, so the field-left team is the LEAD half.
  const scoutedOnLeft = fieldSide !== 'right';
  const lead = scoutedOnLeft
    ? { team: scouted, color: scoutedColor, isScouted: true, side: 'left' }
    : { team: opponent, color: opponentColor, isScouted: false, side: 'left' };
  const trail = scoutedOnLeft
    ? { team: opponent, color: opponentColor, isScouted: false, side: 'right' }
    : { team: scouted, color: scoutedColor, isScouted: true, side: 'right' };

  const SCOUT = t('match_scout_tag');
  const RIVAL = t('match_rival_tag');

  const renderCell = (slot, fromRight) => {
    const { team, color, isScouted } = slot;
    const { city, nick } = splitTeamName(team?.name || '');
    const src = crestSrc(team);
    // Tag text — arrow points outward toward the team's own half (prototype).
    const tagText = isScouted
      ? (fromRight ? `${SCOUT} ▶` : `◀ ${SCOUT}`)
      : (fromRight ? `${RIVAL} ▶` : RIVAL);

    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: fromRight ? 'flex-end' : 'flex-start',
          background: sideGradient(color, fromRight),
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
              [fromRight ? 'right' : 'left']: -24,
              height: vertical ? 100 : 92,
              width: 'auto',
              objectFit: 'contain',
              opacity: 0.4,
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
            gap: 4,
            alignItems: fromRight ? 'flex-end' : 'flex-start',
            textAlign: fromRight ? 'right' : 'left',
            padding: fromRight ? '0 11px 0 9px' : '0 9px 0 11px',
          }}
        >
          <span
            style={{
              fontFamily: FONT,
              fontSize: vertical ? 8 : 8.5,
              fontWeight: 800,
              letterSpacing: '1.1px',
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
            {tagText}
          </span>
          {city ? (
            <span
              style={{
                fontFamily: FONT,
                fontSize: vertical ? 8 : 9,
                fontWeight: 800,
                letterSpacing: '1.9px',
                textTransform: 'uppercase',
                color: cityColor(color, 34),
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
              fontSize: vertical ? 13 : 16,
              fontWeight: 700,
              lineHeight: 1.0,
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
  const swapBtn = (
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
        border: `1px solid ${COLORS.accent}`,
        color: COLORS.accent,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,.4)',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
      }}
    >
      <RdIcon name="swap" size={18} />
    </button>
  );

  // Score lockup — Oswald, dim colon (prototype `.score` + `.score i`).
  const [sA, sB] = String(score || '').split(':');
  const scoreEl = score ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 4,
        fontFamily: FONT_COND,
        fontSize: vertical ? 22 : 21,
        fontWeight: 700,
        color: COLORS.white,
        lineHeight: 1,
      }}
    >
      <span>{sA}</span>
      <span style={{ color: COLORS.textMuted, fontSize: vertical ? 14 : 15 }}>:</span>
      <span>{sB}</span>
    </div>
  ) : null;

  const centre = (
    <div
      style={{
        flex: 'none',
        width: vertical ? 70 : 116,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: vertical ? 5 : 6,
        padding: vertical ? '7px 3px' : '0 4px',
        background: ELEV.bg,
        borderLeft: `1px solid ${ELEV.hairline}`,
        borderRight: `1px solid ${ELEV.hairline}`,
      }}
    >
      {pointLabel ? (
        <span
          style={{
            fontFamily: FONT,
            fontSize: vertical ? 8 : 8.5,
            fontWeight: 800,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            color: COLORS.accent,
            lineHeight: 1,
            whiteSpace: 'nowrap',
          }}
        >
          {pointLabel}
        </span>
      ) : null}
      {vertical ? (
        <>
          {scoreEl}
          {swapBtn}
        </>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          {scoreEl}
          {swapBtn}
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'stretch',
        width: '100%',
        overflow: 'hidden',
        minHeight: vertical ? 76 : 56,
      }}
    >
      {renderCell(lead, false)}
      {centre}
      {renderCell(trail, true)}
    </div>
  );
}
