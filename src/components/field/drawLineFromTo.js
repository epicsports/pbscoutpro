// drawLineFromTo — the single shared "line from point A to point B" stroke,
// extracted from the duplicated connector/run-line idiom (drawPlayers shot &
// bump & base-run lines · HeatmapCanvas "luf" connectors · HitabilityCanvas
// position→target links). Pixel-identical to the inline versions it replaces:
// the caller owns the styling (stroke colour, width, optional alpha + dash),
// this only does beginPath → moveTo → lineTo → stroke and restores the two
// transient bits (dash, alpha) it touched.
//
// All callers pass PIXEL coordinates (already scaled by w/h) — keeping the
// normalisation at the call site preserves each site's exact behaviour.
export function drawLineFromTo(ctx, ax, ay, bx, by, { stroke, width = 1, alpha, dash } = {}) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  if (stroke != null) ctx.strokeStyle = stroke;
  ctx.lineWidth = width;
  if (alpha != null) ctx.globalAlpha = alpha;
  if (dash) ctx.setLineDash(dash);
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
  if (alpha != null) ctx.globalAlpha = 1;
}
