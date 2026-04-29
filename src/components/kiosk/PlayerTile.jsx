import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * PlayerTile — § 55.2 5-row identity layout (mockup v3).
 *
 * Photo zone (45% height) + info zone (55% height). Info zone has 5 rows:
 *   1. firstname (11px/500 textMuted, line-height 1.1)
 *   2. lastname  (11px/500 textMuted, line-height 1.1)
 *   3. nick in quotes (16px/700 text — DOMINANTA WIZUALNA, primary recognition)
 *   4. jersey (#NN, 14px/600 textDim, line-height 1.1)
 *   5. status bar 6px (color = state, see below)
 *
 * Rows 1-2 optional — if player has no firstName/lastName, tile shows
 * only nick + jersey + status bar (4 rows of info).
 *
 * State communicated through status bar color + tile border (Apple HIG —
 * visual properties, not text labels per § 55.2):
 *   'czeka'      → border `COLORS.border` static, status bar `COLORS.border`
 *   'sugerowany' → border 2px amber + glow, status bar amber shimmer
 *                  (MVP optional per § 55.2; left in API but not auto-set)
 *   'zalogowane' → border 2px green, status bar green solid, ✓ overlay
 *                  30px top-right, nick rendered in green, tile bg tinted
 *
 * Squad label overlay top-left: 10px white on rgba(0,0,0,0.4) bg, 3px 7px
 * padding, 4px radius. Tekst pochodzi z resolveSquadLabel() — uses
 * training.squadNames[key] (forward-compatible z § 53 squad names branch)
 * else falls back to legacy R1-R5 labels via squadName(key).toUpperCase().
 */

// Local resolver to keep this file independent of feat/custom-squad-names branch
// (which adds `getSquadName` + `defaultName` to utils/squads.js but is parked
// unverified). When that branch lands, this resolver still works — it'll just
// pick up training.squadNames if present and otherwise display legacy R1-R5.
function resolveSquadLabel(training, squadKey, fallbackLabel) {
  const stored = training?.squadNames?.[squadKey];
  if (stored && typeof stored === 'string' && stored.trim()) {
    return stored.toUpperCase();
  }
  return (fallbackLabel || squadKey || '').toUpperCase();
}

export default function PlayerTile({
  player,            // { id, firstName?, lastName?, nickname, name, number, photoURL? }
  squadKey,          // 'red' | 'blue' | ... — for label overlay color tint
  squadColor,        // hex — for photo gradient fallback
  squadLegacyLabel,  // 'R1'/'R2'/... — fallback for resolveSquadLabel
  training,          // training doc for squadNames lookup
  filled,            // bool — has player already submitted self-log?
  suggested,         // bool (optional) — coach hint, MVP: not auto-set
  onTap,             // callback — fires with player.id
}) {
  const firstName = player?.firstName || null;
  const lastName  = player?.lastName  || null;
  const nick      = player?.nickname || player?.name || '?';
  const jersey    = player?.number != null ? `#${player.number}` : '';

  // Tile-state colors per § 55.2 status table
  const tileBg = filled
    ? 'rgba(34, 197, 94, 0.04)'
    : COLORS.surface;
  const tileBorder = filled
    ? `2px solid ${COLORS.success}`
    : suggested
      ? `2px solid rgba(245, 158, 11, 0.5)`
      : `2px solid ${COLORS.border}`;
  const tileShadow = suggested ? '0 0 20px rgba(245, 158, 11, 0.15)' : 'none';

  const statusBarBg = filled
    ? COLORS.success
    : suggested
      ? 'rgba(245, 158, 11, 0.3)'
      : COLORS.border;

  const nickColor = filled ? COLORS.success : COLORS.text;

  // Photo zone — gradient from squad color when no photoURL.
  const photoBg = squadColor
    ? `linear-gradient(135deg, ${squadColor}, ${squadColor}cc)`
    : `linear-gradient(135deg, ${COLORS.danger}, ${COLORS.danger}cc)`;

  // Initial letter for photo fallback (when no photoURL)
  const initialLetter = (nick || firstName || '?').charAt(0).toUpperCase();

  const squadOverlay = resolveSquadLabel(training, squadKey, squadLegacyLabel);

  return (
    <div
      onClick={onTap}
      style={{
        background: tileBg,
        border: tileBorder,
        borderRadius: 18,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: tileShadow,
        WebkitTapHighlightColor: 'transparent',
        // Min size enforces § 27 touch target on the whole tile
        minHeight: 200,
      }}
    >
      {/* Squad label overlay (top-left) */}
      {squadOverlay && (
        <div style={{
          position: 'absolute',
          top: 8, left: 12,
          fontSize: 10, color: '#fff', fontWeight: 800,
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '3px 7px', borderRadius: 4,
          letterSpacing: 0.4, zIndex: 2,
          fontFamily: FONT,
        }}>{squadOverlay}</div>
      )}

      {/* ✓ overlay (top-right) — only when filled */}
      {filled && (
        <div style={{
          position: 'absolute',
          top: 10, right: 10,
          width: 30, height: 30,
          background: COLORS.success, color: '#fff',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800,
          border: `3px solid ${COLORS.bg}`,
          zIndex: 2,
          fontFamily: FONT,
        }}>✓</div>
      )}

      {/* Photo zone (45%) */}
      <div style={{
        flex: '0 0 45%',
        background: player?.photoURL ? `#000 url("${player.photoURL}") center/cover no-repeat` : photoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 48, fontWeight: 900, color: '#fff',
        fontFamily: FONT,
      }}>
        {!player?.photoURL && initialLetter}
      </div>

      {/* Info zone (55%) */}
      <div style={{
        flex: 1,
        background: COLORS.surface,
        padding: `14px 12px 12px`,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'center', gap: 4,
        borderTop: `1px solid ${COLORS.border}`,
        textAlign: 'center',
      }}>
        {firstName && (
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 500,
            color: COLORS.textMuted, lineHeight: 1.1,
          }}>{firstName}</div>
        )}
        {lastName && (
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 500,
            color: COLORS.textMuted, lineHeight: 1.1,
          }}>{lastName}</div>
        )}
        <div style={{
          fontFamily: FONT, fontSize: 16, fontWeight: 700,
          color: nickColor, lineHeight: 1.1,
        }}>{`"${nick}"`}</div>
        {jersey && (
          <div style={{
            fontFamily: FONT, fontSize: 14, fontWeight: 600,
            color: COLORS.textDim, lineHeight: 1.1,
          }}>{jersey}</div>
        )}
        {/* Status bar — § 55.2 Apple HIG affordance, color = state */}
        <div style={{
          height: 6,
          background: statusBarBg,
          margin: `${SPACE.xs}px 12px 0`,
          borderRadius: 2,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {suggested && !filled && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)',
              animation: 'kiosk-tile-shimmer 2s infinite',
            }} />
          )}
        </div>
      </div>
    </div>
  );
}
