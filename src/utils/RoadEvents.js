// RoadEvents — reusable road-game event system (host-contract decoupled).
// Framework-agnostic plain class (NOT baked into any game component) so other
// arcade games can reuse it. Ported verbatim from docs/prototypes/read_warrior.html
// (Jacek's explicit requirement: a standalone module).
//
// HOST CONTRACT — the game passes a `host` object; the class references ONLY
// `this.h`, never game globals:
//   host.dist            (getter)  — current distance
//   host.speed           (getter)  — current speed
//   host.playerX         (getter)  — player car screen x
//   host.cars            (getter)  — ambient traffic array [{d,lane,v,w,h,type}]
//   host.curve(d)                  — road center x at world-distance d
//   host.halfW(d)                  — road half-width at d
//   host.screenY(d)                — screen y for world-distance d
//   host.geom            {PY,W,H,PXPERM}
//   host.reduce          (bool)    — prefers-reduced-motion
//   host.tex             {d25,d50,…} — precomputed dither CanvasPattern tiles
//   host.spawnCar(o)               — spawn ambient car (used by traffic jam)
//   host.boost(mult,secs)          — apply a speed boost (rider pickup)
//   host.bust()                    — police bust (crash + fuel steal)
//   host.beep(f,dur,vol)           — short SFX
//   host.sfx(name)                 — named SFX: boost|alert|sparkle|siren|bust
// API: reset() · update(dt) · renderRoad(ctx) (under cars) · render(ctx) (over
//      player) · refueling(dist) (bool) · emitHearts(x,y,n).
//
// In-canvas amber is a named constant (the brief lists #fbbf24 as a valid amber;
// "define once, not scattered"). Keeps Road Warrior's brighter phosphor look.
const AMBER = '#fbbf24';

export default class RoadEvents {
  constructor(host) { this.h = host; this.reset(); }
  reset() { this.active = []; this.zones = []; this.hearts = []; this.nextEv = this._r(5, 8); this.nextZone = 2.5; this.label = ''; this.labelT = 0; }
  _r(a, b) { return a + Math.random() * (b - a); }
  trigger() {
    const k = ['jam', 'police', 'rider'][(Math.random() * 3) | 0];
    if (k === 'jam') { const lane = [-0.6, 0, 0.6][(Math.random() * 3) | 0], n = 4 + ((Math.random() * 3) | 0); for (let i = 0; i < n; i++) this.h.spawnCar({ d: this.h.dist + 112 + i * 8, lane, v: 1.5, jam: true }); this._label('TRAFFIC JAM'); this.h.sfx('alert'); }
    else if (k === 'police') { this.active.push({ kind: 'police', x: this.h.playerX, y: this.h.geom.H + 40, t: 0, life: this._r(7, 10), gave: false, sir: 0 }); this._label('POLICE!'); this.h.sfx('alert'); }
    else { this.active.push({ kind: 'rider', d: this.h.dist + 108, side: Math.random() < 0.5 ? -1 : 1, picked: false }); this._label('RIDER AHEAD'); }
  }
  _label(s) { this.label = s; this.labelT = 1.4; }
  spawnZone() { const d0 = this.h.dist + 112; this.zones.push({ d0, d1: d0 + this._r(60, 90), lane: [-0.4, 0, 0.4][(Math.random() * 3) | 0] }); }
  refueling(d) { const px = this.h.playerX; for (const z of this.zones) { if (d >= z.d0 && d <= z.d1) { const cx = this.h.curve(d) + z.lane * this.h.halfW(d), bw = 0.4 * this.h.halfW(d); if (Math.abs(px - cx) < bw) return true; } } return false; }
  emitHearts(x, y, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283; this.hearts.push({ x: x + Math.cos(a) * 12, y: y + Math.sin(a) * 12, vx: Math.cos(a) * this._r(18, 46), vy: -this._r(28, 68), life: this._r(0.7, 1.3) }); } }
  update(dt) {
    const { H, PY } = this.h.geom;
    this.nextEv -= dt; if (this.nextEv <= 0 && this.active.length < 2) { this.trigger(); this.nextEv = this._r(7, 12); }
    this.nextZone -= dt; if (this.nextZone <= 0) { this.spawnZone(); this.nextZone = this._r(10, 15); }
    if (this.labelT > 0) this.labelT -= dt;
    this.zones = this.zones.filter((z) => z.d1 > this.h.dist - 12);
    for (const e of this.active) {
      if (e.kind === 'police') {
        e.t += dt; e.sir -= dt; if (e.sir <= 0 && !e.gave) { this.h.beep(((performance.now() / 300 | 0) % 2) ? 760 : 540, 0.07, 0.05); e.sir = 0.3; }
        e.x += (this.h.playerX - e.x) * Math.min(1, dt * 1.05);   // laggier lateral follow (was 1.8) — weaving shakes the cops
        const ty = e.gave ? H + 60 : PY + 8; e.y += (ty - e.y) * Math.min(1, dt * 0.95);   // slower close-in (was 1.3)
        if (!e.gave && Math.abs(e.x - this.h.playerX) < 24 && Math.abs(e.y - PY) < 28) { this.h.bust(); e.gave = true; this.h.sfx('bust'); }
        if (!e.gave) { for (const c of this.h.cars) { const cy = this.h.screenY(c.d), cx = this.h.curve(c.d) + c.lane * this.h.halfW(c.d), cw = c.w || 24, ch = c.h || 40; if (Math.abs(cx - e.x) < (24 + cw) / 2 * 0.8 && Math.abs(cy - e.y) < (40 + ch) / 2 * 0.8) { e.gave = true; this.h.sfx('bust'); break; } } }
        if (e.t > e.life) e.gave = true;
        if (e.gave && e.y > H + 50) e.done = true;
      } else if (e.kind === 'rider') {
        const y = this.h.screenY(e.d), lx = this.h.curve(e.d) + e.side * (this.h.halfW(e.d) - 9);
        if (!e.picked && Math.abs(lx - this.h.playerX) < 24 && Math.abs(y - PY) < 26) { e.picked = true; this.h.boost(2, 4.5); this.h.sfx('boost'); this.emitHearts(this.h.playerX, PY, 12); this._label('LOVE x2'); }
        if (y > H + 30) e.done = true;
      }
    }
    this.active = this.active.filter((e) => !e.done);
    for (const p of this.hearts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 22 * dt; p.life -= dt; }
    this.hearts = this.hearts.filter((p) => p.life > 0);
  }
  renderRoad(ctx) {
    const { PY, H, PXPERM } = this.h.geom;
    for (const z of this.zones) {
      const yT = Math.max(0, this.h.screenY(z.d1)), yB = Math.min(H, this.h.screenY(z.d0));
      for (let y = yT; y < yB; y += 2) { const d = this.h.dist + (PY - y) / PXPERM, cx = this.h.curve(d) + z.lane * this.h.halfW(d), bw = 0.4 * this.h.halfW(d); ctx.globalAlpha = 0.20; ctx.fillStyle = AMBER; ctx.fillRect(cx - bw, y, bw * 2, 2); if (((d * PXPERM) % 26) < 5) { ctx.globalAlpha = 0.6; ctx.fillRect(cx - bw, y, bw * 2, 2); } ctx.globalAlpha = 1; }
    }
  }
  render(ctx) {
    const { W, H } = this.h.geom;
    for (const e of this.active) { if (e.kind === 'police') this._police(ctx, e); else if (e.kind === 'rider' && !e.picked) this._rider(ctx, this.h.curve(e.d) + e.side * (this.h.halfW(e.d) - 9), this.h.screenY(e.d)); }
    for (const p of this.hearts) { ctx.globalAlpha = Math.min(1, p.life); ctx.fillStyle = AMBER; this._heart(ctx, p.x, p.y, 5); ctx.globalAlpha = 1; }
    if (this.labelT > 0) { ctx.save(); ctx.globalAlpha = Math.min(1, this.labelT); ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = '700 15px ui-monospace,Menlo,monospace'; ctx.fillText(this.label, W / 2, H * 0.30); ctx.restore(); ctx.textAlign = 'left'; }
  }
  _fr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }
  _police(ctx, e) {
    const w = 24, h = 40, A = AMBER; const on = ((performance.now() / 120 | 0) % 2) === 0; ctx.save(); ctx.translate(e.x, e.y);
    ctx.globalAlpha = 0.5; ctx.fillStyle = this.h.tex.d25; ctx.beginPath(); ctx.arc(on ? -7 : 7, -3, 12 + (on ? 2 : 0), 0, 6.283); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = A; this._fr(ctx, -w / 2, -h / 2, w, h, 7); ctx.fillStyle = '#160f04'; this._fr(ctx, -w / 2 + 3, -h / 2 + 4, w - 6, h - 8, 5);
    ctx.fillStyle = A; this._fr(ctx, -w / 2 + 6, -h / 2 + 7, w - 12, 9, 3); this._fr(ctx, -w / 2 + 6, h / 2 - 15, w - 12, 8, 3);
    ctx.fillStyle = on ? A : '#3a2e0f'; this._fr(ctx, -9, -2, 8, 4, 1); ctx.fillStyle = on ? '#3a2e0f' : A; this._fr(ctx, 1, -2, 8, 4, 1); ctx.restore();
  }
  _rider(ctx, x, y) {
    const A = AMBER, t = performance.now(), pulse = this.h.reduce ? 1 : 0.78 + 0.22 * Math.sin(t / 180), flut = this.h.reduce ? 0 : Math.sin(t / 120) * 1.5; ctx.save(); ctx.globalAlpha = pulse; ctx.fillStyle = A; ctx.strokeStyle = A; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.ellipse(x - 1 + flut, y - 12, 5, 8, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 14, 3, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 4, y - 10); ctx.quadraticCurveTo(x - 1.5, y - 6, x - 2.5, y - 2); ctx.lineTo(x + 2.5, y - 2); ctx.quadraticCurveTo(x + 1.5, y - 6, x + 4, y - 10); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2.5, y - 2); ctx.lineTo(x - 6, y + 9); ctx.lineTo(x + 6, y + 9); ctx.lineTo(x + 2.5, y - 2); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - 2, y + 9); ctx.lineTo(x - 2.5, y + 16); ctx.moveTo(x + 2, y + 9); ctx.lineTo(x + 2.5, y + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 2.5, y + 16); ctx.lineTo(x - 5, y + 16); ctx.moveTo(x + 2.5, y + 16); ctx.lineTo(x + 5, y + 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 3, y - 8); ctx.lineTo(x + 9, y - 13); ctx.stroke();
    ctx.globalAlpha = Math.min(1, pulse); this._heart(ctx, x, y - 23, 4); ctx.restore();
  }
  _heart(ctx, x, y, s) { ctx.beginPath(); ctx.moveTo(x, y + s * 0.3); ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.3); ctx.bezierCurveTo(x - s, y + s * 0.7, x, y + s, x, y + s * 1.2); ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.7, x + s, y + s * 0.3); ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3); ctx.closePath(); ctx.fill(); }
}
