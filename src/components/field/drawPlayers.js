import { COLORS, FONT } from '../../utils/theme';

/** Draw players, shots, bumps, eliminations, opponent overlay. */
export function drawPlayers(ctx, w, h, {
  players, eliminations, eliminationPositions, bumpStops, shots, bumpShots = [], runners = [],
  playerAssignments, rosterPlayers, selectedPlayer,
  opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
  opponentAssignments, opponentRosterPlayers,
  getPlayerLabel, getPlayerObj, photoCache, zoom = 1,
  heroPlayerIds = [],
  fieldSide = 'left',
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
  // Stable hash color for an avatar fallback (matches PlayerAvatar palette).
  const AVATAR_PALETTE = ['#1e40af', '#7c3aed', '#be185d', '#b45309', '#15803d', '#0f766e', '#9f1239', '#5b21b6'];
  const avatarColor = (id) => {
    let hash = 0;
    const idStr = String(id || '');
    for (let k = 0; k < idStr.length; k++) { hash = ((hash << 5) - hash) + idStr.charCodeAt(k); hash |= 0; }
    return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
  };

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

  // Draw a small skull marker top-right indicating elimination. Replaces
  // the former ✕ cross per 2026-04-21 user feedback — one elimination signal
  // (💀), used for both runner (▲) and non-runner (●) eliminated players.
  // Dark backdrop disc keeps the emoji legible over the grayscale photo it
  // overlays, matching the visibility the old ✕ had.
  const drawElimMark = (px, py, r) => {
    const cx = px + r * 0.7, cy = py - r * 0.7;
    const fontPx = 14 * s;
    ctx.beginPath(); ctx.arc(cx, cy, fontPx * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fill();
    ctx.font = `${fontPx}px serif`;
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
    // Regular shots — originate from player position
    players.forEach((p, i) => {
      if (!p || !shots[i]?.length) return;
      const color = COLORS.playerColors[i];
      const originX = p.x * w;
      const originY = p.y * h;
      shots[i].forEach(s => {
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(s.x * w, s.y * h);
        ctx.strokeStyle = color + '50'; ctx.lineWidth = 5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        const sx = s.x * w, sy = s.y * h;
        if (s.isKill) {
          ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', sx, sy);
        } else {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx - 7, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 7, sy); ctx.lineTo(sx + 10, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy - 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy + 7); ctx.lineTo(sx, sy + 10); ctx.stroke();
          const bx2 = sx + 14, by2 = sy - 10;
          ctx.beginPath(); ctx.arc(bx2, by2, 7, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fill();
          ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 1.5; ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx2-3, by2-3); ctx.lineTo(bx2+3, by2+3); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(bx2+3, by2-3); ctx.lineTo(bx2-3, by2+3); ctx.stroke();
        }
      });
    });
    // Bump shots — originate from bump (2nd position)
    if (bumpShots) {
      players.forEach((p, i) => {
        const bs = bumpStops?.[i];
        if (!bs || !bumpShots[i]?.length) return;
        const color = COLORS.playerColors[i];
        const originX = bs.x * w, originY = bs.y * h;
        bumpShots[i].forEach(s => {
          ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(s.x * w, s.y * h);
          ctx.strokeStyle = color + '40'; ctx.lineWidth = 2.5; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
          const sx = s.x * w, sy = s.y * h;
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

  // Bump shot lines + markers (shots from bump/destination position)
  if (bumpShots) {
    bumpStops?.forEach((bs, i) => {
      if (!bs || !bumpShots[i]?.length) return;
      const color = COLORS.playerColors[i];
      const originX = bs.x * w, originY = bs.y * h;
      bumpShots[i].forEach(s => {
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(s.x * w, s.y * h);
        ctx.strokeStyle = color + '50'; ctx.lineWidth = 5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
        const sx = s.x * w, sy = s.y * h;
        if (s.isKill) {
          ctx.fillStyle = COLORS.skull; ctx.font = 'bold 14px serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', sx, sy);
        } else {
          ctx.strokeStyle = color; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, 2.5, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
          ctx.beginPath(); ctx.moveTo(sx - 10, sy); ctx.lineTo(sx - 7, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx + 7, sy); ctx.lineTo(sx + 10, sy); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy - 10); ctx.lineTo(sx, sy - 7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(sx, sy + 7); ctx.lineTo(sx, sy + 10); ctx.stroke();
        }
      });
    });
  }

  // Bump stop markers + curved arrows (player start → bump destination)
  bumpStops?.forEach((bs, i) => {
    if (!bs) return;
    const bx = bs.x * w, by = bs.y * h;
    if (players[i]) {
      const px = players[i].x * w, py = players[i].y * h;
      const ddx = bx - px, ddy = by - py, len = Math.sqrt(ddx*ddx + ddy*ddy);
      if (len > 8) {
        const curveFactor = bs.curve ?? 0.15;
        const nx = ddx/len, ny = ddy/len;
        const perpX = -ny * len * curveFactor, perpY = nx * len * curveFactor;
        const cpx = (px + bx) / 2 + perpX, cpy = (py + by) / 2 + perpY;

        // Curved path — solid color, player → destination
        ctx.strokeStyle = COLORS.bumpStop + 'aa'; ctx.lineWidth = 5; ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(cpx, cpy, bx, by); ctx.stroke(); ctx.setLineDash([]);

        // Arrow at destination end
        if (len > 24) {
          const t = 0.88;
          const tx = 2*(1-t)*(cpx-px) + 2*t*(bx-cpx);
          const ty = 2*(1-t)*(cpy-py) + 2*t*(by-cpy);
          const tl = Math.sqrt(tx*tx + ty*ty);
          const anx = tx/tl, any = ty/tl;
          const ax = px*(1-t)*(1-t) + 2*cpx*t*(1-t) + bx*t*t;
          const ay = py*(1-t)*(1-t) + 2*cpy*t*(1-t) + by*t*t;
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
    const color = COLORS.playerColors[i];
    ctx.strokeStyle = color + '30';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Player circles
  players.forEach((p, i) => {
    if (!p) return;
    const px = p.x * w, py = p.y * h, r = 18 * s;
    const color = COLORS.playerColors[i];
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
        trianglePath();
        const bg = avatarColor(playerObj.id);
        ctx.fillStyle = bg; ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = isSel ? 3 * s : 2.5 * s; ctx.stroke();
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(r * 0.85)}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initial, px, py + 2 * s);
      } else {
        trianglePath();
        const grad = ctx.createRadialGradient(px - 3 * s, py - 3 * s, 2 * s, px, py, r);
        grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = isSel ? 2.5 * s : 1.5 * s; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * s}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), px, py + 2*s);
      }
      // Number badge (only when there's a real player)
      const num = playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
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
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = avatarColor(playerObj.id); ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = isSel ? 3 * s : 2.5 * s; ctx.stroke();
        const initial = (playerObj.nickname || playerObj.name || '?').charAt(0).toUpperCase();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(r * 0.9)}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(initial, px, py);
      } else {
        // Unassigned (P1/P2/etc) — single solid circle with label in center
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(px - 3 * s, py - 3 * s, 2 * s, px, py, r);
        grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = isSel ? 2.5 * s : 1.5 * s; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * s}px ${FONT}`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(label.slice(0, 3), px, py);
      }
      // Number badge bottom-right (only when there's a real player number)
      const num = playerObj?.number ? String(playerObj.number).slice(0, 3) : null;
      if (num) drawNumberBadge(px + r - 9 * s, py + r - 7 * s + 2 * s, num, color);
    }
  });
}
