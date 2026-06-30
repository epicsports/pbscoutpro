import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../hooks/useLanguage';
import { hasFlag, flagDataUri } from '../../utils/flags';
import { splitTeamName } from '../../utils/color';
import { COLORS, FONT, FONT_COND, TEAM_COLORS } from '../../utils/theme';

/**
 * VsIntro — the "VS" point-open intro overlay (design handoff: "Scout — VS intro").
 *
 * A DISPLAY-ONLY ~1.25s overlay that plays once when a scouting point is opened.
 * It diagonally splits the live match-field card between the scouted team and the
 * opponent (crest watermark + city/nickname lockup + side badge), shows a centre
 * coin `PUNKT #N`, then wipes away revealing the field card underneath. There is
 * NO interactive control inside the overlay — tapping anywhere dismisses it early.
 *
 * Self-contained overlay (Jacek decision #3): it is its OWN absolutely-positioned
 * layer over the canvas region. It does NOT add container-type / containment to the
 * card (the card's fragile canvas sizing must not be disturbed). Portrait-vs-landscape
 * split is decided by measuring THIS overlay's own box (aspect ratio) via a
 * ResizeObserver — NOT a container query on the card, NOT the device width.
 *
 *   Portrait box (w < h): top/bottom diagonal split.
 *   Landscape box (w ≥ h): left/right diagonal split.
 *
 * Crest watermark (Jacek decision #4) — 3-tier, flag behaves like the logo:
 *   tier1 `logoUrl` image  → watermark
 *   tier2 country flag     → watermark (SAME treatment as the logo)
 *   tier3 colour-only      → NO image; the panel's gradient fade alone is the bg.
 *
 * Reduced motion (`prefers-reduced-motion`) → the intro is skipped entirely; the
 * field card is the default end state, so the intro is purely additive.
 *
 * Keyframes (`vsi*`) live in `src/styles/global.css` next to `rdFade`/`rd-press`.
 */

// Logo/flag resolution mirrors the app's 3-tier identity (CrestBand.jsx).
// Tier1 = uploaded logo, Tier2 = inline-SVG country flag, Tier3 = null (no image).
function crestSrc(team) {
  if (team?.logoUrl) return team.logoUrl;
  if (hasFlag(team?.country)) return flagDataUri(team.country);
  return null;
}

const clampPx = (min, val, max) => Math.min(max, Math.max(min, val));

// color-mix gradient helpers — derive panel fades from the team brand colour,
// exactly as the design's `--cA`/`--cB` custom-prop gradients do.
const mix = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;
const cityColor = (c, pct) => `color-mix(in srgb, ${c} ${pct}%, #fff)`;

const CREST_MASK =
  'radial-gradient(ellipse 62% 62% at center, #000 30%, rgba(0,0,0,.5) 55%, transparent 75%)';
const SEAM_GRAD_V = 'linear-gradient(180deg, transparent, rgba(255,255,255,.6), transparent)';
const SEAM_GRAD_H = 'linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent)';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function VsIntro({
  playKey,
  enabled = true,
  pointNumber,
  scouted,
  opponent,
  scoutedColor,
  opponentColor,
}) {
  const { t } = useLanguage();
  const hostRef = useRef(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  // Portrait only: the host height is pinned to the VISIBLE scroll viewport (see
  // the measure() comment) so the intro never spills below the scroll fold. Null
  // in landscape → the host stays inset:0 (full wrapper box, unchanged).
  const [hostH, setHostH] = useState(null);
  const [token, setToken] = useState(0);
  const [done, setDone] = useState(false);
  const [reduce] = useState(prefersReducedMotion);

  // Replay when a different point is opened (active-point change). The overlay
  // also plays on mount (entering the editor for a point) because the editor
  // subtree unmounts/remounts on review↔edit transitions.
  useEffect(() => {
    setDone(false);
    setToken((x) => x + 1);
  }, [playKey]);

  // Measure the overlay's box (aspect ratio drives portrait vs landscape).
  // useLayoutEffect seeds the box before first paint so the very first frame
  // already lands in the correct split (no flash of the wrong orientation).
  //
  // PORTRAIT bottom-clip fix: the field canvas (= the wrapper this overlay fills)
  // is sized by `maxCanvasHeight` and can be TALLER than the scroll viewport it
  // lives in (header + roster + save bar eat the rest), so a full-wrapper overlay
  // would push its bottom lockup below the scroll fold (clipped). Canvas sizing is
  // locked (§6.6), so instead we PIN the portrait overlay to the visible scroll
  // viewport: effH = min(wrapperH, nearest-scroll-ancestor clientHeight). Every
  // downstream % / `ps` size then derives from this fit-to-cell height → the three
  // stacked blocks always fit. LANDSCAPE keeps the full wrapper box (unchanged):
  // hostH stays null and box = the wrapper rect exactly as before.
  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return undefined;
    const wrap = el.parentElement || el;
    const measure = () => {
      const wr = wrap.getBoundingClientRect();
      const wrapW = wr.width;
      const wrapH = wr.height;
      let h = wrapH;
      const portraitBox = wrapW > 0 && wrapH > 0 && wrapW < wrapH;
      if (portraitBox) {
        let p = wrap.parentElement;
        let vis = 0;
        while (p) {
          const ov = window.getComputedStyle(p).overflowY;
          if (ov === 'auto' || ov === 'scroll') { vis = p.clientHeight; break; }
          p = p.parentElement;
        }
        if (vis > 0) h = Math.min(wrapH, vis);
      }
      setHostH(portraitBox ? h : null);
      setBox((prev) => (prev.w === wrapW && prev.h === h ? prev : { w: wrapW, h }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(wrap);
    // also observe the scroll ancestor so rotation / chrome-height changes refit.
    let sp = wrap.parentElement;
    while (sp) {
      const ov = window.getComputedStyle(sp).overflowY;
      if (ov === 'auto' || ov === 'scroll') { ro.observe(sp); break; }
      sp = sp.parentElement;
    }
    return () => ro.disconnect();
  }, [token]);

  if (!enabled || reduce || done) return null;

  const dismiss = () => setDone(true);
  const onAnimEnd = (e) => {
    // vsiOut is the longest animation (1.25s) on the .vs root — it finishes last.
    if (e.animationName === 'vsiOut') setDone(true);
  };

  const landscape = box.w >= box.h;
  const measured = box.w > 0 && box.h > 0;

  // ── derived sizes (replace the design's cqw/cqh container units with px
  //    computed from the measured box) ──
  // Landscape is already box-derived (scales with box.w). PORTRAIT was fixed px
  // (nick 37, coin 60, …) and clipped the bottom lockup on short field cells.
  // `ps` scales the whole portrait composition by the MEASURED box height so the
  // three stacked blocks (top lockup · centre coin · bottom lockup) always fit:
  // ps = 1 on tall cells (current look, no regression) and shrinks proportionally
  // on short cells (no clip). H_REF ≈ a comfortable portrait cell height; floor
  // 0.85 keeps the smallest scaled label (badge 9.5px → 8.1px) ≥ 8px per § 27.
  const ps = landscape ? 1 : clampPx(0.85, box.h / 520, 1);
  const nickFont = landscape ? clampPx(44, 0.066 * box.w, 88) : 37 * ps;
  const cityFont = landscape ? 15 : 12.5 * ps;
  const cityTrack = landscape ? '3.6px' : '3px';
  const badgeFont = landscape ? 10.5 : 9.5 * ps;
  const badgeMb = landscape ? 11 : 7 * ps;
  const crestH = (landscape ? 0.54 : 0.5) * box.h;
  const pnFont = landscape ? clampPx(64, 0.07 * box.w, 96) : 60 * ps;
  const plFont = landscape ? 12 : 11 * ps;
  const plTrack = landscape ? '5px' : '4px';
  const vsFont = landscape ? clampPx(20, 0.024 * box.w, 30) : 17 * ps;
  const chipPad = landscape ? '14px 40px' : `${10 * ps}px ${30 * ps}px`;
  const chipRadius = landscape ? 22 : 18 * ps;

  const scoutedCrest = crestSrc(scouted);
  const opponentCrest = crestSrc(opponent);

  // ── panel clip + gradient (per orientation) ──
  const panelRClip = landscape
    ? 'polygon(0 0, 54% 0, 46% 100%, 0 100%)'
    : 'polygon(0 0, 100% 0, 100% 42%, 0 58%)';
  const panelBClip = landscape
    ? 'polygon(54% 0, 100% 0, 100% 100%, 46% 100%)'
    : 'polygon(0 58%, 100% 42%, 100% 100%, 0 100%)';
  const panelRBg = landscape
    ? `linear-gradient(120deg, ${mix(scoutedColor, 60)}, ${mix(scoutedColor, 10)} 78%)`
    : `linear-gradient(160deg, ${mix(scoutedColor, 66)}, ${mix(scoutedColor, 12)})`;
  const panelBBg = landscape
    ? `linear-gradient(240deg, ${mix(opponentColor, 60)}, ${mix(opponentColor, 10)} 78%)`
    : `linear-gradient(200deg, ${mix(opponentColor, 16)}, ${mix(opponentColor, 66)})`;

  const seamStyle = landscape
    ? { top: '-6%', bottom: '-6%', left: '50%', width: 2, transform: 'rotate(4.6deg)', background: SEAM_GRAD_V }
    : { left: '-4%', right: '-4%', top: '50%', height: 2, transform: 'rotate(-4.6deg)', background: SEAM_GRAD_H };

  const lockAStyle = landscape
    ? { top: 0, bottom: 0, left: 0, right: '54%', alignItems: 'center', justifyContent: 'center' }
    : { top: '17%', left: 0, right: 0, justifyContent: 'center' };
  const lockBStyle = landscape
    ? { top: 0, bottom: 0, left: '54%', right: 0, alignItems: 'center', justifyContent: 'center' }
    : { bottom: '15%', left: 0, right: 0, justifyContent: 'center' };

  const crestRStyle = landscape
    ? { left: '26%', top: '50%', transform: 'translate(-50%,-50%)' }
    : { left: '50%', top: '26%', transform: 'translate(-50%,-50%)' };
  const crestBStyle = landscape
    ? { left: '74%', top: '50%', transform: 'translate(-50%,-50%)' }
    : { left: '50%', top: '74%', transform: 'translate(-50%,-50%)' };

  const crestImg = (src, perOrient) =>
    src ? (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute',
          height: crestH,
          width: 'auto',
          opacity: 0.34,
          mixBlendMode: 'screen',
          pointerEvents: 'none',
          WebkitMaskImage: CREST_MASK,
          maskImage: CREST_MASK,
          ...perOrient,
        }}
      />
    ) : null;

  const lockup = (team, color, side /* 'scout' | 'opp' */) => {
    const isScout = side === 'scout';
    // splitTeamName: last token = nick, leading tokens = city-eyebrow. Single-word
    // names return city === nick, so the eyebrow collapses (nick-only lockup).
    const { city: splitCity, nick: splitNick } = splitTeamName(team?.name || '');
    const city = splitCity === splitNick ? '' : splitCity;
    const nick = splitNick || '—';
    return (
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          minWidth: 0,
          maxWidth: landscape ? '96%' : undefined,
          padding: landscape ? 0 : '0 10px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            whiteSpace: 'nowrap',
            fontFamily: FONT,
            fontSize: badgeFont,
            fontWeight: 800,
            letterSpacing: '1.4px',
            textTransform: 'uppercase',
            padding: '3px 8px',
            borderRadius: 6,
            marginBottom: badgeMb,
            background: isScout ? COLORS.accent : 'rgba(8,11,18,.66)',
            color: isScout ? '#0a0e17' : COLORS.textDim,
            border: isScout ? 'none' : '1px solid #28324a',
          }}
        >
          {isScout ? `◀ ${t('vs_intro_scouting')}` : `${t('vs_intro_opponent')} ▶`}
        </div>
        {city ? (
          <div
            style={{
              fontFamily: FONT,
              fontSize: cityFont,
              fontWeight: 800,
              letterSpacing: cityTrack,
              textTransform: 'uppercase',
              color: cityColor(color, isScout ? 42 : 30),
              textShadow: '0 1px 4px rgba(0,0,0,.7)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {city}
          </div>
        ) : null}
        <div
          style={{
            fontFamily: FONT_COND,
            fontWeight: 700,
            fontSize: nickFont,
            lineHeight: 0.94,
            letterSpacing: '.3px',
            marginTop: city ? (landscape ? 8 : 5) : 0,
            textTransform: 'uppercase',
            color: '#fff',
            textShadow: '0 2px 10px rgba(0,0,0,.8)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {nick}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      onPointerDown={dismiss}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        // portrait → pinned to the visible scroll viewport; landscape → inset:0.
        ...(hostH != null ? { height: hostH } : { bottom: 0 }),
        zIndex: 60,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
    >
      {measured && (
        <div
          key={token}
          onAnimationEnd={onAnimEnd}
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            animation: 'vsiOut 1.25s cubic-bezier(.6,0,.2,1) both',
          }}
        >
          {/* scrim */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(8,11,18,.5)',
              animation: 'vsiFade 1.25s both',
            }}
          />
          {/* panel R — scouted team */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: panelRClip,
              background: panelRBg,
              animation: 'vsiSlideA .44s cubic-bezier(.3,.7,0,1) both',
            }}
          >
            {crestImg(scoutedCrest, { ...crestRStyle, animation: 'vsiCrestL .6s .12s cubic-bezier(.2,.8,.2,1) both' })}
          </div>
          {/* panel B — opponent */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: panelBClip,
              background: panelBBg,
              animation: 'vsiSlideB .44s cubic-bezier(.3,.7,0,1) both',
            }}
          >
            {crestImg(opponentCrest, { ...crestBStyle, animation: 'vsiCrestR .6s .12s cubic-bezier(.2,.8,.2,1) both' })}
          </div>
          {/* seam */}
          <div style={{ position: 'absolute', ...seamStyle, animation: 'vsiSeam .5s .1s both' }} />
          {/* lockup A — scouted */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              zIndex: 5,
              ...lockAStyle,
              animation: 'vsiInL .44s .06s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            {lockup(scouted, scoutedColor, 'scout')}
          </div>
          {/* lockup B — opponent */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              alignItems: 'center',
              zIndex: 5,
              ...lockBStyle,
              animation: 'vsiInR .44s .06s cubic-bezier(.2,.8,.2,1) both',
            }}
          >
            {lockup(opponent, opponentColor, 'opp')}
          </div>
          {/* coin — PUNKT #N + VS */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              zIndex: 8,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              animation: 'vsiCoinPop .48s .14s cubic-bezier(.2,1.3,.4,1) both',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: chipPad,
                borderRadius: chipRadius,
                background: 'rgba(8,11,18,.94)',
                border: '1px solid #28324a',
                boxShadow: '0 10px 30px rgba(0,0,0,.65)',
              }}
            >
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: plFont,
                  fontWeight: 800,
                  letterSpacing: plTrack,
                  color: COLORS.accent,
                }}
              >
                {t('vs_intro_point_label')}
              </span>
              <span
                style={{
                  fontFamily: FONT_COND,
                  fontSize: pnFont,
                  fontWeight: 700,
                  lineHeight: 0.84,
                  color: '#fff',
                }}
              >
                #{pointNumber}
              </span>
            </div>
            <div
              style={{
                fontFamily: FONT_COND,
                fontWeight: 700,
                fontStyle: 'italic',
                fontSize: vsFont,
                lineHeight: 0.8,
                color: '#fff',
                opacity: 0.82,
                letterSpacing: '1px',
                textShadow: '0 0 14px rgba(245,158,11,.4), 0 2px 8px rgba(0,0,0,.75)',
              }}
            >
              {(() => {
                const vs = t('vs_intro_vs') || 'VS';
                return (
                  <>
                    {vs.slice(0, -1)}
                    <b style={{ color: COLORS.accent }}>{vs.slice(-1)}</b>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
