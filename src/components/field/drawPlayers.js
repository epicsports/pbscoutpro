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
      // Runner eliminated: triangle with skull
      const tr = r * 1.15;
      ctx.beginPath();
      ctx.moveTo(px, py - tr); ctx.lineTo(px + tr, py + tr*0.7); ctx.lineTo(px - tr, py + tr*0.7);
      ctx.closePath();
      ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
      ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${14 * s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', px, py + 2*s);
    } else if (isElim) {
      // Eliminated: skull
      ctx.beginPath(); ctx.arc(px + 1 * s, py + 1 * s, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
      ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
      ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${14 * s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', px, py);
    } else if (isRunner) {
      // Runner: triangle pointing up
      const tr = r * 1.15;
      // Shadow
      ctx.beginPath();
      ctx.moveTo(px + 1*s, py - tr + 1*s); ctx.lineTo(px + tr + 1*s, py + tr*0.7 + 1*s); ctx.lineTo(px - tr + 1*s, py + tr*0.7 + 1*s);
      ctx.closePath(); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
      // Triangle
      ctx.beginPath();
      ctx.moveTo(px, py - tr); ctx.lineTo(px + tr, py + tr*0.7); ctx.lineTo(px - tr, py + tr*0.7);
      ctx.closePath();
      const grad = ctx.createRadialGradient(px - 3 * s, py - 3 * s, 2 * s, px, py, r);
      grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = isSel ? 2.5 * s : 1.5 * s; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), px, py + 2*s);
    } else {
      // Gun-up: circle (standard)
      ctx.beginPath(); ctx.arc(px + 1 * s, py + 1 * s, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();

      // Try to draw player photo inside the circle
      const playerObj = getPlayerObj?.(playerAssignments, rosterPlayers, i);
      const photo = playerObj?.photoURL && photoCache?.get(playerObj.photoURL);
      if (photo && photo.complete) {
        // Clip to circle and drawImage
        ctx.save();
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(photo, px - r, py - r, r * 2, r * 2);
        ctx.restore();
        // Color ring
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.strokeStyle = isSel ? '#fff' : color; ctx.lineWidth = isSel ? 3 * s : 2.5 * s; ctx.stroke();
        // Number badge — bottom-right pill, on top of photo
        const num = getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3);
        ctx.font = `bold ${10 * s}px ${FONT}`;
        const textW = ctx.measureText(num).width;
        const padX = 4 * s;
        const badgeW = Math.max(textW + padX * 2, 18 * s);
        const badgeH = 14 * s;
        const bx = px + r - badgeW / 2;
        const by = py + r - badgeH / 2 + 2 * s;
        // Badge background
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(bx - badgeW / 2, by - badgeH / 2, badgeW, badgeH, badgeH / 2);
        else ctx.rect(bx - badgeW / 2, by - badgeH / 2, badgeW, badgeH);
        ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1 * s; ctx.stroke();
        // Badge text
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(num, bx, by);
      } else {
        // Fallback: solid color circle with label inside
        ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(px - 3 * s, py - 3 * s, 2 * s, px, py, r);
        grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
        ctx.fillStyle = grad; ctx.fill();
        ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = isSel ? 2.5 * s : 1.5 * s; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), px, py);
      }
    }
  });
}
