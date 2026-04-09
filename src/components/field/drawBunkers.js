import { COLORS, FONT } from '../../utils/theme';

/** Draw bunker labels, anchor dots, selection ring, counter lanes. */
export function drawBunkers(ctx, w, h, {
  bunkers, showBunkers, showHalfLabels, layoutEditMode, selectedBunkerId,
  showCounter, counterData, selectedCounterBunkerId,
}) {
  if (!(showBunkers || layoutEditMode === 'bunker') || !bunkers.length) return;

  const labelFont = Math.max(10, Math.min(15, w * 0.026));
  ctx.font = `bold ${labelFont}px ${FONT}`;
  const lpad = Math.round(labelFont * 0.7);
  const lh = Math.round(labelFont * 1.8);

  // When showHalfLabels is true, only show bunkers with x <= 0.55 (left 55%)
  const visibleBunkers = showHalfLabels ? bunkers.filter(b => b.x <= 0.55) : bunkers;

  const rr = (x, y, rw, rh, r) => {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, rw, rh, r); else ctx.rect(x, y, rw, rh);
  };

  // Find paired bunker ID for selection highlight
  const selectedMasterId = selectedBunkerId
    ? (bunkers.find(b => b.id === selectedBunkerId)?.masterId || selectedBunkerId)
    : null;
  const isSelected = (b) => {
    if (!selectedBunkerId) return false;
    if (b.id === selectedBunkerId) return true;
    // Also highlight the paired bunker (master ↔ mirror)
    if (b.masterId && b.masterId === selectedMasterId) return true;
    if (b.id === selectedMasterId) return true;
    return false;
  };

  visibleBunkers.forEach(b => {
    const bx = b.x * w, by = b.y * h;
    const label = b.positionName ?? b.name ?? '';
    const isMirror = b.role === 'mirror';
    const mirrorAlpha = isMirror ? 0.3 : 1;

    // Skip label rendering for empty labels (e.g. snake beams)
    if (!label) {
      // Still draw anchor dot
      ctx.globalAlpha = mirrorAlpha;
      const anchorR = layoutEditMode === 'bunker' ? 4 : 2;
      ctx.beginPath(); ctx.arc(bx, by, anchorR, 0, Math.PI * 2);
      ctx.fillStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.55)'; ctx.fill();
      if (isSelected(b)) {
        ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2);
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
        ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.globalAlpha = 1;
      return;
    }

    ctx.globalAlpha = mirrorAlpha;

    const labelGap = 20; // px gap between anchor dot and label bottom
    const pillTop = by - lh - labelGap;
    const pillBot = by - labelGap;
    const pillMidY = (pillTop + pillBot) / 2;

    ctx.font = `bold ${labelFont}px ${FONT}`;
    const tw = ctx.measureText(label).width;
    const pillLeft = bx - tw / 2 - lpad;
    const pillW = tw + lpad * 2;

    // Connecting dot line
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, pillBot);
    ctx.strokeStyle = 'rgba(250,204,21,0.20)'; ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]); ctx.stroke(); ctx.setLineDash([]);

    // Anchor dot
    const anchorR = layoutEditMode === 'bunker' ? 4 : 2;
    ctx.beginPath(); ctx.arc(bx, by, anchorR, 0, Math.PI * 2);
    ctx.fillStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.55)'; ctx.fill();
    if (layoutEditMode === 'bunker') { ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 1; ctx.stroke(); }

    // Selected bunker highlight (master + mirror pair)
    if (isSelected(b)) {
      ctx.save();
      ctx.globalAlpha = 1; // highlight always full opacity
      ctx.beginPath(); ctx.arc(bx, by, 18, 0, Math.PI * 2);
      ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3;
      ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = mirrorAlpha;
    }

    // Label pill
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 4;
    ctx.fillStyle = 'rgba(8,12,22,0.65)';
    rr(pillLeft, pillTop, pillW, lh, 4); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = layoutEditMode === 'bunker' ? 'rgba(250,204,21,0.8)' : 'rgba(250,204,21,0.35)';
    ctx.lineWidth = layoutEditMode === 'bunker' ? 1.5 : 0.8;
    rr(pillLeft, pillTop, pillW, lh, 4); ctx.stroke();

    // Text
    ctx.fillStyle = layoutEditMode === 'bunker' ? '#facc15' : 'rgba(250,204,21,0.75)';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, bx, pillMidY + 0.5);

    // Edit mode: bigger drag handle
    if (layoutEditMode === 'bunker') {
      ctx.strokeStyle = 'rgba(250,204,21,0.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(bx, by, anchorR + 6, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(250,204,21,0.15)';
      ctx.beginPath(); ctx.arc(bx, by, anchorR + 6, 0, Math.PI * 2); ctx.fill();
    }

    ctx.globalAlpha = 1;
  });

  // Counter lane lines + score badges
  if (showCounter && counterData?.counters) {
    counterData.counters.forEach((c, i) => {
      if (i >= 5) return;
      const b = bunkers.find(bk => bk.id === c.bunkerId);
      if (!b) return;
      const bx = b.x * w, by = b.y * h;
      const isSelected = c.bunkerId === selectedCounterBunkerId;
      const alpha = selectedCounterBunkerId ? (isSelected ? 1 : 0.25) : 1;
      const bestLane = c.safe || c.arc || c.exposed;
      const laneColor = c.safe ? '#22c55e' : c.arc ? '#f97316' : '#3b82f6';
      if (bestLane) {
        ctx.globalAlpha = alpha; ctx.beginPath();
        ctx.moveTo(bestLane.laneStart.x * w, bestLane.laneStart.y * h);
        ctx.lineTo(bestLane.laneEnd.x * w, bestLane.laneEnd.y * h);
        ctx.strokeStyle = laneColor; ctx.lineWidth = Math.max(1.5, bestLane.pHit * 5);
        ctx.setLineDash(c.safe ? [6, 3] : c.arc ? [5, 4] : [4, 4]);
        ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = alpha;
      const pct = Math.round((c.safe?.pHit || c.arc?.pHit || c.exposed?.pHit || 0) * 100);
      const badgeY = by + 10;
      ctx.fillStyle = isSelected ? laneColor + 'dd' : 'rgba(0,0,0,0.88)';
      rr(bx - 21, badgeY, 42, 19, 4); ctx.fill();
      ctx.strokeStyle = laneColor; ctx.lineWidth = isSelected ? 2 : 1;
      rr(bx - 21, badgeY, 42, 19, 4); ctx.stroke();
      ctx.fillStyle = isSelected ? (c.safe ? '#000' : '#fff') : laneColor;
      ctx.font = `bold 10px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`#${i+1} ${pct}%`, bx, badgeY + 9.5);
      ctx.globalAlpha = 1;
    });
  }
}
