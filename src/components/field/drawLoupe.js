/**
 * Draw magnifying loupe — shows clean field image magnified under finger.
 * Drawn AFTER ctx.restore() (in screen space, not zoom-transformed).
 */
export function drawLoupe(ctx, w, h, { activeTouchPos, loupeSourceRef, canvas, isInteractive }) {
  if (!activeTouchPos || !isInteractive) return;

  const loupeR = 50, loupeZoom = 3;
  const sourceR = loupeR / loupeZoom;
  const tx = activeTouchPos.x, ty = activeTouchPos.y;
  const gap = 40;
  const hand = typeof localStorage !== 'undefined' ? localStorage.getItem('pbscoutpro-handedness') || 'right' : 'right';

  // Above finger, fallback below when near top edge
  const offsetX = hand === 'right' ? -30 : 30;
  let lx = tx + offsetX;
  let ly = ty - loupeR - gap;
  if (ly - loupeR < 0) ly = ty + loupeR + gap;
  if (lx - loupeR < 0) lx = loupeR;
  if (lx + loupeR > w) lx = w - loupeR;

  // Source coords: canvas pixel space = CSS coords × DPR (canvas is 2x)
  const dpr = 2;
  const srcCx = tx * dpr, srcCy = ty * dpr;
  const srcR = sourceR * dpr;

  ctx.save();
  ctx.beginPath();
  ctx.arc(lx, ly, loupeR, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(loupeSourceRef.current || canvas,
    Math.max(0, srcCx - srcR), Math.max(0, srcCy - srcR), srcR * 2, srcR * 2,
    lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2
  );
  ctx.restore();

  // Border
  ctx.beginPath();
  ctx.arc(lx, ly, loupeR, 0, Math.PI * 2);
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Crosshair
  ctx.strokeStyle = 'rgba(250,204,21,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(lx - 10, ly); ctx.lineTo(lx + 10, ly);
  ctx.moveTo(lx, ly - 10); ctx.lineTo(lx, ly + 10);
  ctx.stroke();
}
