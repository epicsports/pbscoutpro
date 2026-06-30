import { COLORS, FONT, FONT_COND } from '../../utils/theme';
import { pointInPolygon } from '../../utils/helpers';
import { drawLineFromTo } from './drawLineFromTo';

/** Draw players, shots, bumps, eliminations, opponent overlay. */
export function drawPlayers(ctx, w, h, {
  players, eliminations, eliminationPositions, bumpStops, shots, bumpShots = [], runners = [],
  playerAssignments, rosterPlayers, selectedPlayer,
  opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
  opponentAssignments, opponentRosterPlayers,
  getPlayerLabel, getPlayerObj, photoCache, zoom = 1,
  heroPlayerIds = [],
  fieldSide = 'left',
  // § 79 — Scout-side shot-origin semantic. Default `false` preserves Tactic
  // semantic (§ 2.9: "Shot 1st (from player)" → from `players[i]`). When
  // `true`, the `shots[i]` lane origins from `bumpStops[i]` whenever a bump
  // exists (= pre-bump shots fired from cover before the player moved). Set
  // by MatchPage scout (no Shot-2nd UI surface there); Tactic / LayoutDetail
  // tactic-preview / BunkerEditor keep the default. Per user 2026-05-25:
  // "shoots from bump-stop (start), then jumps to new position".
  bumpShotOriginAtStart = false,
  // § 88 — Unified zones scouting pill. When `zones` is an array, render a
  // zone-colored pill below each placed player whose position falls inside
  // a drawn zone polygon. Overlap rule: first zone in `zones[]` order wins
  // (v1 simplification). Pass null (or omit) on surfaces where pills aren't
  // wanted (Tactic / LayoutDetail tactic-preview / BunkerEditor).
  zones = null,
  // ── NIGHT BUILD (canvas marker + shots) — RENDER ONLY ──
  // `teamColor`  = the brand color (hex) of the team whose markers live in
  //   `players`. When valid AND visually distinct from `opponentColor` (when
  //   the opponent overlay is shown) the whole team's marks read in the brand
  //   color; otherwise we fall back to the per-slot role palette
  //   (`COLORS.playerColors[i]`) so the two teams stay DISTINGUISHABLE and
  //   surfaces without a team (Tactic / LayoutDetail / BunkerEditor) are
  //   byte-identical to before. Never the amber accent (§27 — accent is
  //   interactive-only; team color is identity).
  // `teamName`   = the team's name (data), tiled as the no-avatar watermark.
  // `flowOffset` = current animated dash offset (px) for shot-lane flow, or
  //   null when animation is OFF (reduced-motion / large set / not visible) —
  //   null ⇒ static lanes (the prior look, no white flow / no crosshair pulse).
  teamColor = null,
  teamName = null,
  flowOffset = null,
}) {
  // HERO check for a given player slot — matches assigned player id.
  const isHeroSlot = (assignments, idx) => {
    if (!heroPlayerIds.length || !assignments) return false;
    const pid = assignments[idx];
    return !!pid && heroPlayerIds.includes(pid);
  };
  // Scale factor: keep markers same CSS size regardless of zoom
  const s = 1 / zoom;

  // ── Visual helpers ──
  // ── Team-color resolution (NIGHT BUILD item #1) ──
  const isHex = (c) => typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c);
  const hexToRgb = (hex) => {
    let hStr = hex.replace('#', '');
    if (hStr.length === 3) hStr = hStr.split('').map(c => c + c).join('');
    const n = parseInt(hStr, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  };
  const mixTo = (hex, target, t) => {
    const { r, g, b } = hexToRgb(hex);
    const m = (a) => Math.round(a + (target - a) * t);
    return `rgb(${m(r)},${m(g)},${m(b)})`;
  };
  const lighten = (hex, t) => mixTo(hex, 255, t);
  const darken = (hex, t) => mixTo(hex, 0, t);
  const colorDist = (a, b) => {
    const x = hexToRgb(a), y = hexToRgb(b);
    return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
  };
  // Distinction guard: only adopt the brand color when it's a real hex AND —
  // if the opponent overlay is on — it reads apart from the opponent color
  // (RGB distance ≥ 60). On collision/missing we keep the role palette so both
  // teams remain readable. Computed once (team-level, not per-slot).
  const teamColorOk = isHex(teamColor) &&
    !(showOpponentLayer && isHex(opponentColor) && colorDist(teamColor, opponentColor) < 60);
  const markerColor = (i) => (teamColorOk ? teamColor : COLORS.playerColors[i]);

  // ── No-avatar watermark (NIGHT BUILD item #2) ──
  // Team-color radial gradient + the team name tiled at ~−28° + the number on
  // top (Oswald). `name` omitted ⇒ clean watermark (gradient + center text).
  // `shapePath()` defines the clip (circle or runner triangle). Never an empty
  // disc — this is the identity fallback (design law).
  const drawWatermark = (cx, cy, r, baseColor, name, centerText, shapePath, isSel) => {
    const base = isHex(baseColor) ? baseColor : '#475569';
    ctx.save();
    shapePath();
    ctx.clip();
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.15, cx, cy, r);
    grad.addColorStop(0, lighten(base, 0.18));
    grad.addColorStop(1, darken(base, 0.45));
    ctx.fillStyle = grad;
    ctx.fillRect(cx - r * 1.5, cy - r * 1.5, r * 3, r * 3);
    if (name) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-28 * Math.PI / 180);
      ctx.font = `800 ${Math.max(6, r * 0.5)}px ${FONT}`;
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const tile = (name + '  ').toUpperCase();
      const tileW = ctx.measureText(tile).width || r;
      const step = Math.max(5, r * 0.6);
      for (let y = -r * 1.5; y < r * 1.5; y += step) {
        const off = (Math.round(y / step) % 2) ? -tileW / 2 : 0;
        for (let x = -r * 1.8 + off; x < r * 1.8; x += tileW) ctx.fillText(tile, x, y);
      }
      ctx.restore();
    }
    ctx.restore();
    // White identity ring (à la prototype), selection keeps the brighter ring.
    shapePath();
    ctx.strokeStyle = isSel ? '#fff' : 'rgba(255,255,255,0.85)';
    ctx.lineWidth = (isSel ? 3 : 2) * s;
    ctx.stroke();
    // Number / label on top — Oswald, white with shadow for legibility.
    if (centerText) {
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.font = `700 ${Math.round(r * 0.95)}px ${FONT_COND}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 2 * s; ctx.shadowOffsetY = 1 * s;
      ctx.fillText(String(centerText).slice(0, 3), cx, cy + 0.5 * s);
      ctx.restore();
    }
  };

  // ── Shot-lane flow overlay (NIGHT BUILD item #3) ──
  // A thin white dashed line over a lane, its dash offset advanced by the rAF
  // driver (BaseCanvas). No-op when `flowOffset` is null (static look).
  const drawFlow = (x1, y1, x2, y2) => {
    if (flowOffset == null) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 1.3;
    ctx.lineCap = 'round';
    ctx.setLineDash([2, 9]);
    ctx.lineDashOffset = -flowOffset;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.restore();
  };
  // Crosshair pulse scale for precise shot markers — gentle breathe while the
  // flow runs; 1 (no pulse) when animation is off.
  const crossPulse = flowOffset == null ? 1 : (1 + 0.18 * Math.sin((flowOffset / 22) * Math.PI * 2));

  // Draw the small number pill badge attached to a marker (bottom-right by default).
  const drawNumberBadge = (cx, cy, num, fillColor, opts = {}) => {
    if (!num) return;
    const fontPx = (opts.fontPx ?? 10) * s;
    ctx.font = `bold ${fontPx}px ${FONT}`;
    const textW = ctx.measureText(num).width;
    const padX = 4 * s;
    const badgeW = Math.max(textW + padX * 2, 18 * s);
    const badgeH = 14 * s;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH, badgeH / 2);
    else ctx.rect(cx - badgeW / 2, cy - badgeH / 2, badgeW, badgeH);
    ctx.fillStyle = fillColor; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1 * s; ctx.stroke();
    ctx.fillStyle = opts.textColor || '#fff';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(num, cx, cy);
  };

  // Small elimination marker top-right. Same backdrop disc (solid black +
  // red ring, r=sz) as the former ✕ — only the glyph inside changes from
  // two red diagonals to a skull. Photo + red tint overlay on the player
  // circle itself are untouched.
  const drawElimMark = (px, py, r) => {
    const cx = px + r * 0.7, cy = py - r * 0.7;
    const sz = 8 * s;
    ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0a0a'; ctx.fill();
    ctx.strokeStyle = COLORS.danger || '#ef4444'; ctx.lineWidth = 1.5 * s; ctx.stroke();
    ctx.font = `${sz * 1.6}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💀', cx, cy);
  };

  // Get cached photo for a slot (returns Image or null).
  const getCachedPhoto = (playerObj) => {
    if (!playerObj?.photoURL) return null;
    const img = photoCache?.get(playerObj.photoURL);
    return (img && img.complete) ? img : null;
  };
  // Opponent overlay (mirrored)
  if (showOpponentLayer && opponentPlayers) {
    opponentPlayers.forEach((p, i) => {
      if (!p) return;
      const px = (1 - p.x) * w, py = p.y * h;
      const isElim = opponentEliminations[i];
      const label = getPlayerLabel(opponentAssignments, opponentRosterPlayers, i) ||
                    getPlayerLabel(playerAssignments, rosterPlayers, i);
      if (isElim) {
        ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.arc(px, py, 12 * s, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
        ctx.strokeStyle = COLORS.skull + '60'; ctx.lineWidth = 1.5 * s; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = `${11 * s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py);
      } else {
        ctx.globalAlpha = 0.35;
        ctx.beginPath(); ctx.arc(px, py, 13 * s, 0, Math.PI * 2);
        ctx.fillStyle = opponentColor; ctx.fill();
        ctx.strokeStyle = opponentColor + '80'; ctx.lineWidth = 1 * s; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#fff'; ctx.font = `bold ${9 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label.slice(0, 3), px, py);
      }
    });
  }

  // Shot lines + markers
  if (shots) {
    // Regular shots — origin defaults to player position (`players[i]`). When
    // `bumpShotOriginAtStart` is true (scout flow on MatchPage) AND a bump
    // exists for this slot, origin swaps to `bumpStops[i]` (= drag-start =
    // pre-bump position, "shoots from cover before moving"). § 79 / § 2.9
    // carve-out — Tactic keeps default `false` to preserve "Shot 1st (from
    // player) / Shot 2nd (from bump)" dual-lane semantic.
    players.forEach((p, i) => {
      if (!p || !shots[i]?.length) return;
      const color = markerColor(i);
      const bumpStart = bumpShotOriginAtStart && bumpStops?.[i] ? bumpStops[i] : null;
      const originX = (bumpStart ? bumpStart.x : p.x) * w;
      const originY = (bumpStart ? bumpStart.y : p.y) * h;
      shots[i].forEach(s => {
        drawLineFromTo(ctx, originX, originY, s.x * w, s.y * h, { stroke: color + '50', width: 5, dash: [4, 3] });
        const sx = s.x * w, sy = s.y * h;
        drawFlow(originX, originY, sx, sy);   // precise lane flow (item #3)
        if (s.isKill) {
          ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', sx, sy);
        } else {
          // § 86 — shot crosshair marker (no kill). Dead-X icon block
          // removed (was rendered offset top-right of each shot at
          // +14/-10 px, hit-tested only when `mode==='shoot'` — but that
          // mode only fired when ShotDrawer modal was OPEN, which
          // occluded the canvas → dead affordance by construction).
          // Delete is now tap-on-shot-center inside the ShotDrawer (§ 75
          // grammar), wired via touchHandler.findShot's center hit-test.
          // NIGHT BUILD: radius/tick breathe with `crossPulse` (1 = static).
          const cp = crossPulse;
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 6 * cp, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx - 10 * cp, sy); ctx.lineTo(sx - 7 * cp, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 7 * cp, sy); ctx.lineTo(sx + 10 * cp, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - 10 * cp); ctx.lineTo(sx, sy - 7 * cp); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy + 7 * cp); ctx.lineTo(sx, sy + 10 * cp); ctx.stroke();
        }
      });
    });
    // Bump shots — originate from bump (2nd position)
    if (bumpShots) {
      players.forEach((p, i) => {
        const bs = bumpStops?.[i];
        if (!bs || !bumpShots[i]?.length) return;
        const color = markerColor(i);
        const originX = bs.x * w, originY = bs.y * h;
        bumpShots[i].forEach(s => {
          drawLineFromTo(ctx, originX, originY, s.x * w, s.y * h, { stroke: color + '40', width: 2.5, dash: [3, 4] });
          const sx = s.x * w, sy = s.y * h;
          drawFlow(originX, originY, sx, sy);
          if (s.isKill) {
            ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('💀', sx, sy);
          } else {
            ctx.strokeStyle = color + 'aa'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(sx, sy, 2, 0, Math.PI * 2); ctx.fillStyle = color + 'aa'; ctx.fill();
          }
        });
      });
    }
  }

  // Bump shot lines + markers — origin = `bumpStops[i]` (= drag-start =
  // chronologically FIRST position per § 2.5 / § 79 data model; the comment
  // here previously said "destination position", which was wrong relative to
  // the actual write semantics in MatchPage / TacticPage `onBumpPlayer`).
  // This is the Tactic "Shot 2nd (from bump)" lane per § 2.9 — kept as the
  // OTHER end of the bump from `shots[i]` regardless of the scout flag.
  if (bumpShots) {
    bumpStops?.forEach((bs, i) => {
      if (!bs || !bumpShots[i]?.length) return;
      const color = markerColor(i);
      const originX = bs.x * w, originY = bs.y * h;
      bumpShots[i].forEach(s => {
        drawLineFromTo(ctx, originX, originY, s.x * w, s.y * h, { stroke: color + '50', width: 5, dash: [4, 3] });
        const sx = s.x * w, sy = s.y * h;
        drawFlow(originX, originY, sx, sy);
        if (s.isKill) {
          ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', sx, sy);
        } else {
          const cp = crossPulse;
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 6 * cp, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx - 10 * cp, sy); ctx.lineTo(sx - 7 * cp, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 7 * cp, sy); ctx.lineTo(sx + 10 * cp, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - 10 * cp); ctx.lineTo(sx, sy - 7 * cp); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy + 7 * cp); ctx.lineTo(sx, sy + 10 * cp); ctx.stroke();
        }
      });
    });
  }

  // Bump stop markers + curved arrows. Per § 79 / § 2.5 data semantics:
  //   `bumpStops[i]` = drag-START (where the player was BEFORE the bump)
  //   `players[i]`   = drag-END   (where the player ENDED UP after the bump)
  // Arrow runs START → END with the arrowhead landing on `players[i]`
  // (= destination, per user spec). Older comment here said "player start
  // → bump destination" which was wrong about which variable is start vs end;
  // the bezier was also reversed (start=players, end=bumps, tip on bumps).
  // Arc bow side is preserved across the fix: the perpendicular direction is
  // computed from the OLD (players→bumps) vector so saved `bs.curve` signs
  // render on the same physical side as before.
  bumpStops?.forEach((bs, i) => {
    if (!bs) return;
    const bx = bs.x * w, by = bs.y * h;           // start = bumpStops
    if (players[i]) {
      const px = players[i].x * w, py = players[i].y * h;  // end = players
      const ddx = bx - px, ddy = by - py, len = Math.sqrt(ddx*ddx + ddy*ddy);
      if (len > 8) {
        const curveFactor = bs.curve ?? 0.15;
        // Perp direction computed from players→bumps vector (legacy) so the
        // bow side stays the same after the start/end swap.
        const nx = ddx/len, ny = ddy/len;
        const perpX = -ny * len * curveFactor, perpY = nx * len * curveFactor;
        const cpx = (px + bx) / 2 + perpX, cpy = (py + by) / 2 + perpY;

        // Curved path — solid color, START (bumpStops) → END (players).
        ctx.strokeStyle = COLORS.bumpStop + 'aa'; ctx.lineWidth = 5; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(cpx, cpy, px, py); ctx.stroke(); ctx.setLineDash([]);

        // Arrowhead at t=0.88 along the NEW bezier (start=bx,by; end=px,py)
        // → lands near `(px,py)` = `players[i]` = destination per user spec.
        if (len > 24) {
          const t = 0.88;
          const tx = 2*(1-t)*(cpx-bx) + 2*t*(px-cpx);
          const ty = 2*(1-t)*(cpy-by) + 2*t*(py-cpy);
          const tl = Math.sqrt(tx*tx + ty*ty);
          const anx = tx/tl, any = ty/tl;
          const ax = bx*(1-t)*(1-t) + 2*cpx*t*(1-t) + px*t*t;
          const ay = by*(1-t)*(1-t) + 2*cpy*t*(1-t) + py*t*t;
          ctx.beginPath();
          ctx.moveTo(ax - anx*8 + any*5, ay - any*8 - anx*5);
          ctx.lineTo(ax - anx*8 - any*5, ay - any*8 + anx*5);
          ctx.lineTo(ax + anx*4, ay + any*4);
          ctx.closePath(); ctx.fillStyle = COLORS.bumpStop + 'dd'; ctx.fill();
        }
      }
    }
    // Destination marker — large ring + dot
    ctx.beginPath(); ctx.arc(bx, by, 14, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bumpStop + '35'; ctx.fill();
    ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(bx, by, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bumpStop; ctx.fill();
  });

  // Elimination positions
  eliminationPositions?.forEach(ep => {
    if (!ep) return;
    ctx.fillStyle = COLORS.skull; ctx.font = '14px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💀', ep.x * w, ep.y * h);
  });

  // ── Run lines from base center to each player ──
  const baseX = (fieldSide === 'right' ? 0.98 : 0.02) * w;
  const baseY = 0.5 * h;
  players.forEach((p, i) => {
    if (!p) return;
    const px = p.x * w, py = p.y * h;
    const color = markerColor(i);
    drawLineFromTo(ctx, baseX, baseY, px, py, { stroke: color + '30', width: 2, dash: [6, 4] });
  });

  // Player circles
  players.forEach((p, i) => {
    if (!p) return;
    const px = p.x * w, py = p.y * h, r = 18 * s;
    const color = markerColor(i);
    const isSel = selectedPlayer === i;
    const isElim = eliminations[i];
    const isRunner = runners[i];
    const isHero = isHeroSlot(playerAssignments, i);

    // HERO amber glow ring — always visible, behind selection and player circle (§ 25)
    if (isHero) {
      ctx.save();
      ctx.beginPath(); ctx.arc(px, py, r + 3.5 * s, 0, Math.PI * 2);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.5 * s;
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 12 * s;
      ctx.stroke();
      ctx.restore();
    }

    // Selection ring
    if (isSel) {
      ctx.beginPath(); ctx.arc(px, py, r + 7 * s, 0, Math.PI * 2);
      ctx.fillStyle = color + '25'; ctx.fill();
      ctx.strokeStyle = color + '70'; ctx.lineWidth = 2 * s; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    if (isRunner && isElim) {
      // Runner eliminated: triangle with photo (grayscale) + corner X + muted badge
      const tr = r * 1.15;
      const playerObj = getPlayerObj?.(playerAssignments, rosterPlayers, i);
      const photo = getCachedPhoto(playerObj);
      // Triangle path
      const trianglePath = () => {
        ctx.beginPath();
        ctx.moveTo(px, py - tr); ctx.lineTo(px + tr, py + tr * 0.7); ctx.lineTo(px - tr, py + tr * 0.7);
        ctx.closePath();
      };
      if (photo) {
        ctx.save();
        trianglePath(); ctx.clip();
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(photo, px - tr, py - tr, tr * 2, tr * 2);
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(239,68,68,0.25)';
        ctx.fillRect(px - tr, py - tr, tr * 2, tr * 2);
        ctx.restore();
        trianglePath();
        ctx.strokeStyle = COLORS.danger || '#ef4444'; ctx.lineWidth = 2 * s; ctx.stroke();
      } else if (playerObj) {
        trianglePath();
        ctx.fillStyle = '#3a2424'; ctx.fill();
        ctx.strokeStyle = COLORS.danger || '#ef4444'; ctx.lineWidth = 2 * s; ctx.stroke();
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        ctx.fillStyle = '#9ca3af'; ctx.font = `bold ${Math.round(r * 0.85)}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initial, px, py + 2 * s);
      } else {
        trianglePath();
        ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
        ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2 * s; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `${14 * s}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py + 2 * s);
      }
      // Corner X + muted number badge
      drawElimMark(px, py, tr * 0.9);
      const num = playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
      if (num) drawNumberBadge(px + tr - 9 * s, py + tr * 0.7 - 7 * s + 2 * s, num, '#374151');
    } else if (isElim) {
      // Eliminated: circle with photo (grayscale) + corner X + muted badge
      ctx.beginPath(); ctx.arc(px + 1 * s, py + 1 * s, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      const playerObj = getPlayerObj?.(playerAssignments, rosterPlayers, i);
      const photo = getCachedPhoto(playerObj);
      if (photo) {
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
        ctx.filter = 'grayscale(1)';
        ctx.drawImage(photo, px - r, py - r, r * 2, r * 2);
        ctx.filter = 'none';
        ctx.fillStyle = 'rgba(239,68,68,0.28)';
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = COLORS.danger || '#ef4444'; ctx.lineWidth = 2 * s; ctx.stroke();
      } else if (playerObj) {
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = '#3a2424'; ctx.fill();
        ctx.strokeStyle = COLORS.danger || '#ef4444'; ctx.lineWidth = 2 * s; ctx.stroke();
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        ctx.fillStyle = '#9ca3af'; ctx.font = `bold ${Math.round(r * 0.9)}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initial, px, py);
      } else {
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
        ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2 * s; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `${14 * s}px serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('💀', px, py);
      }
      drawElimMark(px, py, r);
      const num = playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
      if (num) drawNumberBadge(px + r - 9 * s, py + r - 7 * s + 2 * s, num, '#374151');
    } else if (isRunner) {
      // Runner: triangle pointing up — photo / initial / label
      const tr = r * 1.15;
      // Shadow
      ctx.beginPath();
      ctx.moveTo(px + 1*s, py - tr + 1*s); ctx.lineTo(px + tr + 1*s, py + tr*0.7 + 1*s); ctx.lineTo(px - tr + 1*s, py + tr*0.7 + 1*s);
      ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      const playerObj = getPlayerObj?.(playerAssignments, rosterPlayers, i);
      const photo = getCachedPhoto(playerObj);
      const trianglePath = () => {
        ctx.beginPath();
        ctx.moveTo(px, py - tr); ctx.lineTo(px + tr, py + tr * 0.7); ctx.lineTo(px - tr, py + tr * 0.7);
        ctx.closePath();
      };
      if (photo) {
        ctx.save();
        trianglePath(); ctx.clip();
        ctx.drawImage(photo, px - tr, py - tr, tr * 2, tr * 2);
        ctx.restore();
        trianglePath();
        ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = isSel ? 3 * s : 2.5 * s; ctx.stroke();
      } else if (playerObj) {
        // No-avatar watermark (item #2) — team gradient + tiled name + number.
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        const centerText = playerObj.number ? String(playerObj.number) : initial;
        drawWatermark(px, py + tr * 0.1, tr, color, teamName, centerText, trianglePath, isSel);
      } else {
        // Unassigned — clean watermark (gradient + label, no tiled name).
        drawWatermark(px, py + tr * 0.1, tr, color, teamName,
          getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), trianglePath, isSel);
      }
      // Number badge — photo path only (watermark already centers the number).
      const num = photo && playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
      if (num) drawNumberBadge(px + tr - 9 * s, py + tr * 0.7 - 7 * s + 2 * s, num, color);
    } else {
      // Gun-up: circle (standard) — photo / initial / label
      ctx.beginPath(); ctx.arc(px + 1 * s, py + 1 * s, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      const playerObj = getPlayerObj?.(playerAssignments, rosterPlayers, i);
      const photo = getCachedPhoto(playerObj);
      const label = getPlayerLabel(playerAssignments, rosterPlayers, i);
      if (photo) {
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(photo, px - r, py - r, r * 2, r * 2);
        ctx.restore();
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = isSel ? 3 * s : 2.5 * s; ctx.stroke();
      } else if (playerObj) {
        // No-avatar watermark (item #2) — team gradient + tiled name + number.
        const circlePath = () => { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); };
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        const centerText = playerObj.number ? String(playerObj.number) : initial;
        drawWatermark(px, py, r, color, teamName, centerText, circlePath, isSel);
      } else {
        // Unassigned (P1/P2/etc) — clean watermark (gradient + label center).
        const circlePath = () => { ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); };
        drawWatermark(px, py, r, color, teamName, label.slice(0, 3), circlePath, isSel);
      }
      // Number badge — photo path only (watermark already centers the number).
      const num = photo && playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
      if (num) drawNumberBadge(px + r - 9 * s, py + r - 7 * s + 2 * s, num, color);
    }
  });

  // § 88 — Scouting pills. After all player circles are drawn, overlay a
  // zone-colored pill below each placed player whose position falls inside
  // a drawn zone polygon. Overlap rule: first zone in `zones[]` order wins.
  // Skipped entirely when `zones` is null (Tactic / LayoutDetail tactic-
  // preview / BunkerEditor). Drawn LAST so the pill never sits under the
  // player marker / number badge.
  if (Array.isArray(zones) && zones.length) {
    const drawableZones = zones.filter(z =>
      z && Array.isArray(z.polygon) && z.polygon.length >= 3
    );
    if (drawableZones.length) {
      players.forEach((p, i) => {
        if (!p) return;
        const px = p.x * w, py = p.y * h, r = 18 * s;
        const matched = drawableZones.find(z => pointInPolygon(p, z.polygon));
        if (!matched) return;
        const name = matched.name || '';
        const color = matched.color || '#ef4444';
        // Pill — drawNumberBadge-style, anchored below the marker.
        const fontPx = 9 * s;
        ctx.font = `bold ${fontPx}px ${FONT}`;
        const textW = ctx.measureText(name).width;
        const padX = 6 * s;
        const pillW = textW + padX * 2;
        const pillH = 14 * s;
        const pillX = px - pillW / 2;
        const pillY = py + r + 4 * s;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
        else ctx.rect(pillX, pillY, pillW, pillH);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1 * s; ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(name, px, pillY + pillH / 2);
      });
    }
  }
}
