import { COLORS, FONT } from '../../utils/theme';

/** Draw players, shots, bumps, eliminations, opponent overlay. */
export function drawPlayers(ctx, w, h, {
  players, eliminations, eliminationPositions, bumpStops, shots,
  playerAssignments, rosterPlayers, selectedPlayer,
  opponentPlayers, opponentEliminations, showOpponentLayer, opponentColor,
  opponentAssignments, opponentRosterPlayers,
  getPlayerLabel, zoom = 1,
}) {
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
    players.forEach((p, i) => {
      if (!p || !shots[i]?.length) return;
      const color = COLORS.playerColors[i];
      const bs = bumpStops?.[i];
      const originX = (bs ? bs.x : p.x) * w;
      const originY = (bs ? bs.y : p.y) * h;
      shots[i].forEach(s => {
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.lineTo(s.x * w, s.y * h);
        ctx.strokeStyle = color + '40'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
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
  }

  // Bump stop markers + arrows
  bumpStops?.forEach((bs, i) => {
    if (!bs) return;
    const bx = bs.x * w, by = bs.y * h;
    if (players[i]) {
      const px = players[i].x * w, py = players[i].y * h;
      const grad = ctx.createLinearGradient(bx, by, px, py);
      grad.addColorStop(0, COLORS.bumpStop + 'dd'); grad.addColorStop(1, COLORS.bumpStop + '33');
      ctx.strokeStyle = grad; ctx.lineWidth = 2; ctx.setLineDash([5, 3]);
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(px, py); ctx.stroke(); ctx.setLineDash([]);
      const ddx = px - bx, ddy = py - by, len = Math.sqrt(ddx*ddx + ddy*ddy);
      if (len > 24) {
        const mx = bx + ddx * 0.52, my = by + ddy * 0.52, nx = ddx/len, ny = ddy/len;
        ctx.beginPath();
        ctx.moveTo(mx - nx*7 - ny*5, my - ny*7 + nx*5);
        ctx.lineTo(mx - nx*7 + ny*5, my - ny*7 - nx*5);
        ctx.lineTo(mx + nx*7, my + ny*7);
        ctx.closePath(); ctx.fillStyle = COLORS.bumpStop + 'bb'; ctx.fill();
      }
    }
    ctx.beginPath(); ctx.arc(bx, by, 11, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.bumpStop + '28'; ctx.fill();
    ctx.strokeStyle = COLORS.bumpStop; ctx.lineWidth = 2;
    ctx.setLineDash([2, 2]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.bumpStop; ctx.font = `bold 9px ${FONT}`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${bs.duration}s`, bx, by);
  });

  // Elimination positions
  eliminationPositions?.forEach(ep => {
    if (!ep) return;
    ctx.fillStyle = COLORS.skull; ctx.font = '14px serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('💀', ep.x * w, ep.y * h);
  });

  // Player circles
  players.forEach((p, i) => {
    if (!p) return;
    const px = p.x * w, py = p.y * h, r = 18 * s;
    const color = COLORS.playerColors[i];
    const isSel = selectedPlayer === i;
    const isElim = eliminations[i];
    if (isSel) {
      ctx.beginPath(); ctx.arc(px, py, r + 7 * s, 0, Math.PI * 2);
      ctx.fillStyle = color + '25'; ctx.fill();
      ctx.strokeStyle = color + '70'; ctx.lineWidth = 2 * s; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(px + 1 * s, py + 1 * s, r, 0, Math.PI * 2); ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
    if (isElim) {
      ctx.fillStyle = COLORS.eliminatedOverlay; ctx.fill();
      ctx.strokeStyle = COLORS.skull + '80'; ctx.lineWidth = 2 * s; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `${14 * s}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', px, py);
    } else {
      const grad = ctx.createRadialGradient(px - 3 * s, py - 3 * s, 2 * s, px, py, r);
      grad.addColorStop(0, color); grad.addColorStop(1, color + 'bb');
      ctx.fillStyle = grad; ctx.fill();
      ctx.strokeStyle = isSel ? '#fff' : 'rgba(0,0,0,0.3)'; ctx.lineWidth = isSel ? 2.5 * s : 1.5 * s; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.font = `bold ${11 * s}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(getPlayerLabel(playerAssignments, rosterPlayers, i).slice(0, 3), px, py);
    }
  });
}
