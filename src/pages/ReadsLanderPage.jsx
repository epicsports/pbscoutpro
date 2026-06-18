// Reads Lunar Lander — 4th Arcade game (§121). Retro amber-LCD lander ported
// from the approved prototype `docs/prototypes/lunar-lander.html` (its physics/
// terrain/controls/HUD/states ARE the spec). Single <canvas> play-field with a
// canvas-drawn HUD + state screens; DOM device-bezel chrome + thumb controls.
// Leaderboard §121 (`leaderboards/readsLander`, shared {board} rule — no rules
// change). Lazy own chunk (App.jsx /break/lander).
//
// HARD RULES (Jacek): NO Reads brand mark in-game — silk-screen TEXT title only.
// Palette = named constants from theme (no scattered hex); the warm LCD glass +
// bezel have no theme token, so they are NAMED constants here.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

// ── palette (named; AMBER from theme, warm LCD/bezel have no token) ─────────
const AMBER = COLORS.accent;                       // #f59e0b — brand amber
const amberA = (a) => `rgba(245, 158, 11, ${a})`;  // accent channels w/ live alpha
const AM_DIM = amberA(0.16);
const AM_GHOST = amberA(0.07);
const LCD_GLASS = '#130d04';                        // warm LCD glass (no theme token)
const reduceMotion = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── virtual world + feel tunables (prototype constants ARE the spec) ────────
const VW = 160, VH = 224;
const CANVAS_W = 640, CANVAS_H = 896, S = CANVAS_W / VW;   // 4 px / unit
const GRAVITY0 = 16, THRUST = 38, ROT_SPD = 2.7, FUEL_MAX0 = 100, BURN = 21;
const SAFE_VY = 16, SAFE_VX = 11, SAFE_ANG = 0.20, LANDER_R = 4.2;

// ── pure sim (framework-agnostic; ported verbatim, operates on G) ───────────
function genLevel(G, level) {
  const peaks = 6 + Math.min(level, 7);
  const groundTop = VH * 0.55, groundBot = VH * 0.88;
  const pts = []; const n = peaks + 3;
  for (let i = 0; i <= n; i++) pts.push({ x: (i / n) * VW, y: groundTop + Math.random() * (groundBot - groundTop) });
  const padCount = level <= 1 ? 2 : (level <= 3 ? 2 : 1);
  const pads = []; const used = new Set();
  for (let p = 0; p < padCount; p++) {
    let seg; let guard = 0;
    do { seg = 1 + Math.floor(Math.random() * (n - 2)); guard++; } while ((used.has(seg) || used.has(seg - 1) || used.has(seg + 1)) && guard < 30);
    used.add(seg);
    const baseW = 30 - Math.min(level * 2.2, 16);
    const w = Math.max(11, baseW + Math.random() * 6);
    const cx = pts[seg].x;
    const x1 = Math.max(4, cx - w / 2), x2 = Math.min(VW - 4, cx + w / 2);
    const py = Math.min(groundBot, Math.max(groundTop + 10, pts[seg].y));
    pads.push({ x1, x2, y: py, mult: w <= 14 ? 4 : (w <= 20 ? 3 : 2) });
  }
  const surf = []; const STEP = 2;
  for (let x = 0; x <= VW; x += STEP) {
    const t = x / VW * n; const i = Math.min(n - 1, Math.floor(t)); const f = t - i;
    let y = pts[i].y * (1 - f) + pts[i + 1].y * f;
    for (const pad of pads) if (x >= pad.x1 - STEP && x <= pad.x2 + STEP) y = pad.y;
    surf.push({ x, y });
  }
  for (const pad of pads) for (const s of surf) if (s.x >= pad.x1 && s.x <= pad.x2) s.y = pad.y;
  G.terrain = surf; G.pads = pads;
  genSky(G);
}
// Cosmic sky (night-mode beautify) — randomized star field (+optional cluster),
// 1–3 nebulae, 0–2 planets. Cosmetic data only; sim/physics unchanged.
function genSky(G) {
  const stars = []; const N = 40 + ((Math.random() * 22) | 0);
  for (let i = 0; i < N; i++) {
    const r = Math.random();
    stars.push({ x: Math.random() * VW, y: 5 + Math.random() * (VH * 0.47), b: 0.18 + Math.random() * 0.82, big: r > 0.84, bright: r > 0.93, ph: Math.random() * 6.2832 });
  }
  if (Math.random() < 0.5) {
    const cx = 16 + Math.random() * (VW - 32), cy = 8 + Math.random() * (VH * 0.34), m = 5 + ((Math.random() * 6) | 0);
    for (let i = 0; i < m; i++) stars.push({ x: cx + (Math.random() * 2 - 1) * 10, y: cy + (Math.random() * 2 - 1) * 7, b: 0.2 + Math.random() * 0.7, big: Math.random() > 0.8, bright: false, ph: Math.random() * 6.2832 });
  }
  G.stars = stars;
  const neb = []; const nb = 1 + ((Math.random() * 3) | 0);
  for (let i = 0; i < nb; i++) neb.push({ x: 16 + Math.random() * (VW - 32), y: 10 + Math.random() * (VH * 0.34), rx: 18 + Math.random() * 30, ry: 10 + Math.random() * 16, rot: Math.random() * Math.PI, d1: 0.07 + Math.random() * 0.08, d2: 0.16 + Math.random() * 0.12 });
  G.neb = neb;
  const planets = []; const pc = Math.random() < 0.20 ? 0 : (Math.random() < 0.74 ? 1 : 2);
  for (let i = 0; i < pc; i++) {
    let qx, qy, guard = 0;
    do { qx = 14 + Math.random() * (VW - 28); qy = 40 + Math.random() * 34; guard++; }
    while (planets.some((q) => Math.hypot(q.x - qx, q.y - qy) < 34) && guard < 20);
    planets.push({ x: qx, y: qy, r: 9 + Math.random() * 10, phase: (Math.random() * 1.5 - 0.75), d: 0.34 + Math.random() * 0.22, ring: Math.random() < 0.28, ringTilt: 0.45 + Math.random() * 0.7 });
  }
  G.planets = planets;
}
function terrainYAt(G, x) {
  const t = G.terrain; if (!t.length) return VH;
  if (x <= t[0].x) return t[0].y;
  if (x >= t[t.length - 1].x) return t[t.length - 1].y;
  const idx = Math.min(t.length - 2, Math.floor(x / 2)); const a = t[idx], b = t[idx + 1];
  const f = (x - a.x) / (b.x - a.x || 1); return a.y * (1 - f) + b.y * f;
}
function padAt(G, x) { for (const p of G.pads) if (x >= p.x1 && x <= p.x2) return p; return null; }
function freshGame() {
  return {
    mode: 'ready', prevMode: 'play', level: 1, score: 0, lives: 3,
    fuelMax: FUEL_MAX0, gravity: GRAVITY0, x: VW / 2, y: 24, vx: 0, vy: 0, ang: 0, fuel: FUEL_MAX0,
    thrusting: false, terrain: [], pads: [], stars: [], t: 0, blink: 0, flash: 0,
    msgScore: 0, msgMult: 1, shake: 0, lastLandX: VW / 2, best: 0, newBest: false,
  };
}
function spawn(G) { G.x = 20 + Math.random() * (VW - 40); G.y = 22; G.vx = (Math.random() * 2 - 1) * 8; G.vy = 4; G.ang = 0; G.fuel = G.fuelMax; G.thrusting = false; G.shake = 0; }
function startGame(G) { G.level = 1; G.score = 0; G.lives = 3; G.newBest = false; nextLevel(G, true); }
function nextLevel(G, reset) {
  if (!reset) G.level++;
  G.fuelMax = Math.max(62, FUEL_MAX0 - (G.level - 1) * 5);
  G.gravity = GRAVITY0 + (G.level - 1) * 0.7;
  genLevel(G, G.level); spawn(G); G.mode = 'play';
}
function land(G, pad, snd) {
  const vT = Math.hypot(G.vx, G.vy); const mult = pad.mult;
  const pts = Math.round(mult * 100 + G.fuel * 2 + Math.max(0, (SAFE_VY - vT)) * 6);
  G.msgScore = Math.max(pts, mult * 100); G.msgMult = mult;
  G.score = Math.min(9999, G.score + G.msgScore); G.lastLandX = (pad.x1 + pad.x2) / 2;
  G.mode = 'landed'; snd.land();
}
function crash(G, snd) { G.mode = 'crashed'; G.lives--; G.flash = 1; G.shake = 6; snd.crash(); }
function advance(G) {
  if (G.mode === 'ready') { startGame(G); return; }
  if (G.mode === 'landed') { nextLevel(G, false); return; }
  if (G.mode === 'crashed') { if (G.lives > 0) { genLevel(G, G.level); spawn(G); G.mode = 'play'; } else { G.mode = 'gameover'; } return; }
  if (G.mode === 'gameover') { startGame(G); return; }
}
function update(G, dt, input, snd) {
  G.t += dt; G.blink = (Math.sin(G.t * 9) > 0) ? 1 : 0;
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 2.2);
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 14);
  if (G.mode !== 'play') { snd.thrust(false, 0); return; }
  if (input.left) G.ang -= ROT_SPD * dt;
  if (input.right) G.ang += ROT_SPD * dt;
  G.ang = ((G.ang + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI;
  G.thrusting = input.thrust && G.fuel > 0;
  let ax = 0, ay = G.gravity;
  if (G.thrusting) { ax += Math.sin(G.ang) * THRUST; ay -= Math.cos(G.ang) * THRUST; G.fuel = Math.max(0, G.fuel - BURN * dt); }
  G.vx += ax * dt; G.vy += ay * dt; G.x += G.vx * dt; G.y += G.vy * dt;
  if (G.x < 6) { G.x = 6; G.vx = Math.abs(G.vx) * 0.3; }
  if (G.x > VW - 6) { G.x = VW - 6; G.vx = -Math.abs(G.vx) * 0.3; }
  if (G.y < 6) { G.y = 6; if (G.vy < 0) G.vy = 0; }
  const footY = G.y + LANDER_R + 1.5; const groundY = terrainYAt(G, G.x);
  if (footY >= groundY) {
    G.y = groundY - LANDER_R - 1.5; const pad = padAt(G, G.x);
    const safe = pad && G.vy <= SAFE_VY && Math.abs(G.vx) <= SAFE_VX && Math.abs(G.ang) <= SAFE_ANG;
    if (safe) land(G, pad, snd); else crash(G, snd);
  }
  snd.thrust(G.thrusting, G.fuel / G.fuelMax);
}

// ── canvas render (ported; px=v*S) ─────────────────────────────────────────
function mkRender(ctx) {
  const px = (v) => v * S;
  const setFont = (size, weight) => { ctx.font = `${weight || 'bold'} ${size * S}px "SF Mono",ui-monospace,"Courier New",monospace`; };
  const text = (str, x, y, size, align, alpha, weight) => {
    setFont(size, weight); ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
    ctx.globalAlpha = alpha == null ? 1 : alpha; ctx.fillStyle = AMBER; ctx.fillText(str, px(x), px(y)); ctx.globalAlpha = 1;
  };
  // Ordered-dither (Bayer 4x4) pattern tiles — device-pixel grain, GPU-repeated.
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function mkDither(density, cell) {
    const N = 4; cell = cell || 2;
    const tile = document.createElement('canvas'); tile.width = N * cell; tile.height = N * cell;
    const g = tile.getContext('2d'); g.fillStyle = AMBER; const th = density * 16;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (BAYER[y * N + x] < th) g.fillRect(x * cell, y * cell, cell, cell);
    return ctx.createPattern(tile, 'repeat');
  }
  const dSparse = mkDither(0.26, 2), dMed = mkDither(0.50, 2), dDense = mkDither(0.78, 2), dGlow = mkDither(0.40, 2);
  const ditherCache = {};
  const ditherFor = (d) => { const k = Math.max(0.05, Math.min(0.92, Math.round(d * 20) / 20)); return ditherCache[k] || (ditherCache[k] = mkDither(k, 2)); };
  let shootT = 4 + Math.random() * 6, shoot = null;
  function drawNebula(G) {
    if (!G.neb) return;
    for (const nb of G.neb) {
      const pad = nb.rx + nb.ry;
      ctx.save(); ctx.beginPath(); ctx.ellipse(px(nb.x), px(nb.y), px(nb.rx), px(nb.ry), nb.rot, 0, 6.2832); ctx.clip();
      ctx.fillStyle = ditherFor(nb.d1); ctx.fillRect(px(nb.x - pad), px(nb.y - pad), px(pad * 2), px(pad * 2)); ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.ellipse(px(nb.x), px(nb.y), px(nb.rx * 0.55), px(nb.ry * 0.55), nb.rot, 0, 6.2832); ctx.clip();
      ctx.fillStyle = ditherFor(nb.d2); ctx.fillRect(px(nb.x - pad), px(nb.y - pad), px(pad * 2), px(pad * 2)); ctx.restore();
    }
  }
  function drawPlanets(G) {
    const arr = G.planets; if (!arr) return;
    for (const p of arr) {
      if (p.ring) { ctx.save(); ctx.strokeStyle = amberA(0.32); ctx.lineWidth = 1.0; ctx.beginPath(); ctx.ellipse(px(p.x), px(p.y), px(p.r * 1.7), px(p.r * 0.55 * p.ringTilt), 0.5, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.arc(px(p.x), px(p.y), px(p.r), 0, 6.2832); ctx.clip();
      ctx.fillStyle = ditherFor(p.d); ctx.fillRect(px(p.x - p.r), px(p.y - p.r), px(p.r * 2), px(p.r * 2));
      const cres = Math.abs(p.phase), dir = p.phase >= 0 ? 1 : -1, off = p.r * (1.5 - 1.3 * cres) * dir;
      ctx.fillStyle = LCD_GLASS; ctx.beginPath(); ctx.arc(px(p.x + off), px(p.y), px(p.r * 1.06), 0, 6.2832); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = amberA(0.4); ctx.lineWidth = 1.0; ctx.beginPath(); ctx.arc(px(p.x), px(p.y), px(p.r), 0, 6.2832); ctx.stroke();
    }
  }
  function drawShootingStar(G) {
    if (reduceMotion) return;
    if (!shoot && G.t > shootT) { shoot = { x0: Math.random() * VW * 0.7, y0: 6 + Math.random() * 34, dx: 46, dy: 20, t0: G.t }; shootT = G.t + 7 + Math.random() * 9; }
    if (!shoot) return;
    const e = G.t - shoot.t0, dur = 0.55; if (e > dur) { shoot = null; return; }
    const k = e / dur; const hx = shoot.x0 + shoot.dx * k, hy = shoot.y0 + shoot.dy * k;
    const nrm = Math.hypot(shoot.dx, shoot.dy), ux = -shoot.dx / nrm, uy = -shoot.dy / nrm, L = 5;
    ctx.save(); ctx.globalAlpha = Math.sin(k * Math.PI);
    ctx.strokeStyle = AMBER; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(px(hx), px(hy)); ctx.lineTo(px(hx + ux * L), px(hy + uy * L)); ctx.stroke();
    ctx.fillStyle = AMBER; ctx.fillRect(px(hx) - 1.5, px(hy) - 1.5, 3, 3); ctx.restore();
  }
  function drawSky(G) {
    drawNebula(G); drawPlanets(G);
    ctx.fillStyle = AMBER;
    for (const s of G.stars) {
      const lit = reduceMotion ? true : (s.b > 0.5 ? true : (Math.sin(G.t * 3 + s.ph) > 0));
      if (!lit) continue;
      const sz = s.big ? Math.max(3, S * 0.8) : Math.max(2, S * 0.45);
      ctx.fillRect(px(s.x) - sz / 2, px(s.y) - sz / 2, sz, sz);
      if (s.bright) {
        const k = reduceMotion ? 2.2 : (2.0 + Math.sin(G.t * 4 + s.ph) * 1.0);
        ctx.fillRect(px(s.x) - sz * k, px(s.y) - 1, sz * 2 * k, 2);
        ctx.fillRect(px(s.x) - 1, px(s.y) - sz * k, 2, sz * 2 * k);
      }
    }
    drawShootingStar(G);
  }
  function drawLander(x, y, ang, thrusting, ghost) {
    ctx.save(); ctx.translate(px(x), px(y)); ctx.rotate(ang); ctx.scale(S, S);
    const col = ghost ? AM_GHOST : AMBER;
    ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-2.4, -1.6); ctx.lineTo(2.4, -1.6); ctx.lineTo(3.2, 0.4); ctx.lineTo(2.0, 2.2); ctx.lineTo(-2.0, 2.2); ctx.lineTo(-3.2, 0.4); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.arc(0, -1.6, 1.5, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill();
    ctx.fillStyle = LCD_GLASS; ctx.beginPath(); ctx.arc(0, -1.35, 0.85, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(-2.4, 2.0); ctx.lineTo(-3.6, 4.2); ctx.lineTo(-4.6, 4.2); ctx.moveTo(2.4, 2.0); ctx.lineTo(3.6, 4.2); ctx.lineTo(4.6, 4.2); ctx.stroke();
    if (thrusting) { const flick = reduceMotion ? 0.7 : (0.55 + Math.random() * 0.7); ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(-1.2, 2.4); ctx.lineTo(1.2, 2.4); ctx.lineTo(0, 2.4 + 3.0 * flick); ctx.closePath(); ctx.fill(); }
    ctx.restore();
  }
  function drawExhaust(G) {
    if (!(G.mode === 'play' && G.thrusting)) return;
    const flick = reduceMotion ? 0.8 : (0.6 + Math.random() * 0.7);
    ctx.save(); ctx.translate(px(G.x), px(G.y)); ctx.rotate(G.ang);
    ctx.fillStyle = dGlow;
    ctx.beginPath(); ctx.moveTo(px(-2.1), px(2.6)); ctx.lineTo(px(2.1), px(2.6)); ctx.lineTo(0, px(2.6 + 6.5 * flick)); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  function drawTerrain(G) {
    const t = G.terrain; if (!t.length) return;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(px(t[0].x), px(t[0].y));
    for (let i = 1; i < t.length; i++) ctx.lineTo(px(t[i].x), px(t[i].y));
    ctx.lineTo(px(VW), px(VH)); ctx.lineTo(0, px(VH)); ctx.closePath(); ctx.clip();
    const top = px(VH * 0.50), h = px(VH) - top;
    ctx.fillStyle = dSparse; ctx.fillRect(0, top, CANVAS_W, h * 0.34);
    ctx.fillStyle = dMed; ctx.fillRect(0, top + h * 0.34, CANVAS_W, h * 0.33);
    ctx.fillStyle = dDense; ctx.fillRect(0, top + h * 0.67, CANVAS_W, h * 0.34);
    ctx.restore();
    ctx.lineWidth = 1.6; ctx.strokeStyle = AMBER; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(px(t[0].x), px(t[0].y));
    for (let i = 1; i < t.length; i++) ctx.lineTo(px(t[i].x), px(t[i].y)); ctx.stroke();
    for (const p of G.pads) {
      ctx.lineWidth = 3; ctx.strokeStyle = AMBER;
      ctx.beginPath(); ctx.moveTo(px(p.x1), px(p.y)); ctx.lineTo(px(p.x2), px(p.y)); ctx.stroke();
      ctx.lineWidth = 1.1;
      for (let xx = p.x1 + 1.4; xx < p.x2; xx += 3) { ctx.beginPath(); ctx.moveTo(px(xx), px(p.y)); ctx.lineTo(px(xx - 1.3), px(p.y + 2.6)); ctx.stroke(); }
      text('x' + p.mult, (p.x1 + p.x2) / 2, p.y - 3, 6, 'center', 0.95);
    }
  }
  function drawHUD(G) {
    text('SCORE', 6, 9, 5.5, 'left', 0.6); text(String(G.score).padStart(5, '0'), 6, 16.5, 7.5, 'left', 1);
    const liveHi = Math.max(G.best, G.score); const hiBeaten = G.score > 0 && G.score >= G.best && G.best > 0;
    text('HI', VW / 2, 9, 5.5, 'center', 0.6); if (!(hiBeaten && G.blink)) text(String(liveHi).padStart(5, '0'), VW / 2, 16.5, 7.5, 'center', 1);
    text('LV' + G.level, VW - 6, 9, 5.5, 'right', 0.7);
    for (let i = 0; i < G.lives; i++) drawLander(VW - 9 - i * 10, 16.5 - 4.0, 0, false, false);
    const groundY = terrainYAt(G, G.x); const alt = Math.max(0, Math.round(groundY - (G.y + LANDER_R)));
    const vy = Math.round(G.vy); const vx = Math.round(G.vx);
    const vyBad = G.vy > SAFE_VY, vxBad = Math.abs(G.vx) > SAFE_VX;
    text('VS', 6, 26, 5, 'left', 0.6); if (!(vyBad && G.blink)) text((vy > 0 ? '+' : '') + vy, 18, 26, 6, 'left', vyBad ? 1 : 0.9);
    text('HS', 44, 26, 5, 'left', 0.6); if (!(vxBad && G.blink)) text((vx > 0 ? '+' : '') + vx, 56, 26, 6, 'left', vxBad ? 1 : 0.9);
    text('ALT', VW - 6, 26, 5, 'right', 0.6); text(String(alt), VW - 26, 26, 6, 'right', 0.9);
    const fx = 6, fy = 30, fw = VW - 12, fh = 3.2;
    ctx.strokeStyle = amberA(0.4); ctx.lineWidth = 0.8; ctx.strokeRect(px(fx), px(fy), px(fw), px(fh));
    const frac = G.fuel / G.fuelMax; const fuelBlink = frac < 0.18 && G.blink;
    if (!fuelBlink) { ctx.fillStyle = AMBER; ctx.fillRect(px(fx), px(fy), px(fw * frac), px(fh)); }
    text('FUEL', fx, fy - 1.2, 4.5, 'left', 0.55);
  }
  function drawCenter(lines) {
    ctx.fillStyle = 'rgba(10,8,2,0.55)'; ctx.fillRect(0, px(VH * 0.30), px(VW), px(VH * 0.40));
    let y = VH * 0.30 + 14;
    for (const l of lines) { text(l.s, VW / 2, y, l.size, 'center', l.alpha == null ? 1 : l.alpha, l.weight); y += (l.size * 1.7); }
  }
  return function render(G, t) {
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H); ctx.fillStyle = LCD_GLASS; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.save(); if (G.shake > 0) ctx.translate((Math.random() * 2 - 1) * G.shake, (Math.random() * 2 - 1) * G.shake);
    drawSky(G); drawTerrain(G);
    if (G.mode !== 'ready') { drawLander(G.x, G.y, G.ang, (G.mode === 'play') && G.thrusting, false); drawExhaust(G); }
    ctx.restore();
    drawHUD(G);
    if (G.flash > 0) { ctx.fillStyle = amberA(G.flash * 0.5); ctx.fillRect(0, 0, CANVAS_W, CANVAS_H); }
    // Canvas state-screen text is art/English-only (arcade convention) — literals,
    // NOT t() (undefined i18n keys returned the key NAME on the title screen).
    if (G.mode === 'ready') drawCenter([
      { s: 'LUNAR LANDER', size: 11, weight: 'bold' },
      { s: 'TAKE A BREAK', size: 5, alpha: 0.5 }, { s: '', size: 2 },
      { s: G.best > 0 ? ('HI  ' + String(G.best).padStart(5, '0')) : '', size: 6.5, alpha: 0.9 }, { s: '', size: 2 },
      { s: 'LAND SOFT · STAY LEVEL', size: 6, alpha: 0.85 },
      { s: 'MIND YOUR FUEL', size: 6, alpha: 0.85 }, { s: '', size: 3 },
      { s: G.blink ? 'TAP TO START' : ' ', size: 7 },
    ]);
    else if (G.mode === 'landed') drawCenter([
      { s: 'TOUCHDOWN', size: 11 },
      { s: 'PAD BONUS x' + G.msgMult, size: 6, alpha: 0.85 },
      { s: '+' + G.msgScore, size: 9 }, { s: '', size: 3 },
      { s: G.blink ? ('TAP FOR LEVEL ' + (G.level + 1)) : ' ', size: 6 },
    ]);
    else if (G.mode === 'crashed') drawCenter([
      { s: 'CRASHED', size: 11 },
      { s: G.lives > 0 ? (G.lives + ' LANDERS LEFT') : 'NO LANDERS LEFT', size: 6, alpha: 0.85 },
      { s: '', size: 3 },
      { s: G.blink ? (G.lives > 0 ? 'TAP TO RETRY' : 'TAP TO CONTINUE') : ' ', size: 6 },
    ]);
    else if (G.mode === 'gameover') drawCenter([
      { s: 'GAME OVER', size: 11 },
      { s: 'SCORE  ' + String(G.score).padStart(5, '0'), size: 7 },
      G.newBest ? { s: G.blink ? '— NEW BEST —' : ' ', size: 7, alpha: 1 } : { s: G.best ? ('HI  ' + String(G.best).padStart(5, '0')) : '', size: 6, alpha: 0.75 },
      { s: '', size: 3 }, { s: G.blink ? 'TAP TO PLAY AGAIN' : ' ', size: 6 },
    ]);
    else if (G.mode === 'paused') drawCenter([{ s: 'PAUSED', size: 11 }, { s: G.blink ? 'TAP TO RESUME' : ' ', size: 6 }]);
  };
}

// ── audio (WebAudio thrust bed + blips; iOS-safe) ───────────────────────────
function makeAudio() {
  let ctxA = null, master = null, thrustGain = null, lp = null, on = true;
  let musicTimer = null, mstep = 0;
  // Sparse minor wander under the thrust noise bed (night-mode beautify).
  const MUSIC = [220, 0, 277, 0, 330, 277, 0, 196, 220, 0, 262, 0, 330, 392, 0, 247];
  const MUSIC_STEP_MS = 210;
  function ensure() {
    if (ctxA) return;
    try {
      ctxA = new (window.AudioContext || window.webkitAudioContext)();
      master = ctxA.createGain(); master.gain.value = on ? 0.5 : 0; master.connect(ctxA.destination);
      const len = ctxA.sampleRate * 1.5; const buf = ctxA.createBuffer(1, len, ctxA.sampleRate); const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const noiseSrc = ctxA.createBufferSource(); noiseSrc.buffer = buf; noiseSrc.loop = true;
      lp = ctxA.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420;
      thrustGain = ctxA.createGain(); thrustGain.gain.value = 0;
      noiseSrc.connect(lp); lp.connect(thrustGain); thrustGain.connect(master); noiseSrc.start();
    } catch { ctxA = null; }
  }
  function blip(freq, dur, type) {
    if (!ctxA || !on) return; const o = ctxA.createOscillator(), g = ctxA.createGain();
    o.type = type || 'square'; o.frequency.value = freq; g.gain.value = 0.0001; o.connect(g); g.connect(master);
    const t = ctxA.currentTime; g.gain.exponentialRampToValueAtTime(0.4, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + dur); o.start(t); o.stop(t + dur + 0.02);
  }
  function note(freq) {
    if (!ctxA || !on || !freq) return; const o = ctxA.createOscillator(), g = ctxA.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.0001; o.connect(g); g.connect(master);
    const t = ctxA.currentTime; g.gain.exponentialRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.start(t); o.stop(t + 0.22);
  }
  return {
    resume() { ensure(); if (ctxA && ctxA.state === 'suspended') ctxA.resume().catch(() => {}); if (ctxA && !ctxA.__pbUnlocked) { ctxA.__pbUnlocked = true; try { const b = ctxA.createBuffer(1, 1, 22050); const s = ctxA.createBufferSource(); s.buffer = b; s.connect(ctxA.destination); s.start(0); } catch {} } },
    thrust(active, frac) { if (!ctxA || !on) { if (thrustGain) thrustGain.gain.value = 0; return; } const target = active ? 0.18 + 0.12 * frac : 0; thrustGain.gain.setTargetAtTime(target, ctxA.currentTime, 0.04); if (lp) lp.frequency.setTargetAtTime(active ? 520 : 420, ctxA.currentTime, 0.05); },
    musicStart() { if (musicTimer || !ctxA || !on) return; mstep = 0; musicTimer = setInterval(() => { note(MUSIC[mstep % MUSIC.length]); mstep++; }, MUSIC_STEP_MS); },
    musicStop() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    land() { blip(660, 0.12, 'square'); setTimeout(() => blip(990, 0.18, 'square'), 90); },
    crash() {
      if (!ctxA || !on) return; const o = ctxA.createOscillator(), g = ctxA.createGain(), f = ctxA.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 900; o.type = 'sawtooth'; o.frequency.value = 120; o.connect(f); f.connect(g); g.connect(master);
      const t = ctxA.currentTime; g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.frequency.exponentialRampToValueAtTime(40, t + 0.5); o.start(t); o.stop(t + 0.55);
    },
    setOn(v) { on = v; if (master) master.gain.value = on ? 0.5 : 0; if (!on) this.musicStop(); },
    dispose() { this.musicStop(); try { if (ctxA) ctxA.close(); } catch {} },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function ReadsLanderPage() {
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const gameRef = useRef(freshGame());
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio();
  const inputRef = useRef({ left: false, right: false, thrust: false });
  const renderRef = useRef(null);
  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const bestRef = useRef(0);

  const [, setFrame] = useState(0);
  const [mode, setMode] = useState('ready');
  const [soundOn, setSoundOn] = useState(true);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);

  const loadBest = useCallback(async () => {
    let best = 0;
    try { const top = await ds.getReadsLanderTop(1); best = top[0]?.score || 0; } catch {}
    if (uid) { try { const mine = await ds.getReadsLanderMyScore(uid); best = Math.max(best, mine?.score || 0); } catch {} }
    bestRef.current = best; gameRef.current.best = best;
  }, [uid]);
  useEffect(() => { loadBest(); }, [loadBest]);

  // Game loop.
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d'); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    renderRef.current = mkRender(ctx);
    genLevel(gameRef.current, 1);
    let raf;
    const frame = (now) => {
      const G = gameRef.current; const A = audioRef.current;
      let dt = (now - (lastRef.current || now)) / 1000; lastRef.current = now; if (dt > 0.05) dt = 0.05;
      if (G.mode === 'gameover' || G.mode === 'landed') { if (G.score > bestRef.current) { G.best = bestRef.current = G.score; G.newBest = true; } }
      update(G, dt, inputRef.current, A);
      if (G.mode === 'play') A.musicStart(); else A.musicStop();
      renderRef.current(G, t);
      if (G.mode !== mode) setMode(G.mode);
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); rafRef.current = raf;
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // iOS hardening: block document scroll/bounce while mounted.
  useEffect(() => { const block = (e) => e.preventDefault(); document.addEventListener('touchmove', block, { passive: false }); return () => document.removeEventListener('touchmove', block); }, []);
  useEffect(() => () => { try { audioRef.current?.dispose(); } catch {} }, []);

  // Reset the initials picker each time we (re)enter gameover.
  useEffect(() => { if (mode === 'gameover') { setSubmitted(false); setInitials('AAA'); } }, [mode]);

  const advanceTap = () => { audioRef.current.resume(); const G = gameRef.current; if (G.mode !== 'play') { if (G.mode === 'gameover' && G.newBest && uid && !submitted) return; advance(G); } };

  const hold = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); audioRef.current.resume(); inputRef.current[key] = true; if (key === 'thrust') { const G = gameRef.current; if (G.mode !== 'play') advanceTap(); } try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} },
    onPointerUp: () => { inputRef.current[key] = false; },
    onPointerLeave: () => { inputRef.current[key] = false; },
    onPointerCancel: () => { inputRef.current[key] = false; },
  });

  // Keyboard (desktop).
  useEffect(() => {
    const down = (e) => {
      if (e.repeat) return; audioRef.current.resume(); const G = gameRef.current; const inp = inputRef.current;
      if (e.code === 'ArrowLeft') inp.left = true;
      else if (e.code === 'ArrowRight') inp.right = true;
      else if (e.code === 'ArrowUp' || e.code === 'Space') { inp.thrust = true; if (G.mode !== 'play') advanceTap(); e.preventDefault(); }
      else if (e.code === 'Enter') { if (G.mode !== 'play') advanceTap(); }
      else if (e.code === 'KeyP') { if (G.mode === 'play') G.mode = 'paused'; else if (G.mode === 'paused') G.mode = 'play'; }
    };
    const up = (e) => { const inp = inputRef.current; if (e.code === 'ArrowLeft') inp.left = false; else if (e.code === 'ArrowRight') inp.right = false; else if (e.code === 'ArrowUp' || e.code === 'Space') inp.thrust = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, uid]);

  // Pause when tab hidden.
  useEffect(() => { const onHide = () => { if (document.hidden && gameRef.current.mode === 'play') gameRef.current.mode = 'paused'; }; document.addEventListener('visibilitychange', onHide); return () => document.removeEventListener('visibilitychange', onHide); }, []);

  const togglePause = () => { audioRef.current.resume(); const G = gameRef.current; if (G.mode === 'play') { G.prevMode = 'play'; G.mode = 'paused'; } else if (G.mode === 'paused') G.mode = 'play'; };
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); audioRef.current.setOn(v); audioRef.current.resume(); };

  const bumpInitial = (idx, dir) => { setInitials((cur) => { const arr = cur.split(''); let code = arr[idx].charCodeAt(0) - 65 + dir; code = ((code % 26) + 26) % 26; arr[idx] = String.fromCharCode(65 + code); return arr.join(''); }); };
  const submitScore = async () => {
    if (submitted) return; setSubmitted(true);
    try { await ds.submitReadsLanderScore(uid, { initials, score: gameRef.current.score }); } catch {}
  };

  // Emulator-only test hook (inert in prod).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__pbtest) return;
    window.__pbLanderTest = {
      state: () => ({ score: gameRef.current.score, mode: gameRef.current.mode, lives: gameRef.current.lives }),
      forceScore: (n) => { gameRef.current.score = Math.max(0, Math.min(9999, n | 0)); },
      gameOver: () => { gameRef.current.mode = 'gameover'; },
    };
    return () => { try { delete window.__pbLanderTest; } catch {} };
  }, []);

  const showInitials = mode === 'gameover' && gameRef.current.newBest && !!uid && !submitted;

  return (
    <div data-testid="reads-lander"
      style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: AMBER, overflow: 'hidden', ...NO_SELECT, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Chrome bar */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('reads_lander_back') || 'Back'} data-testid="reads-lander-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <span style={{ flex: 1, textAlign: 'center', fontSize: FONT_SIZE.xs, fontWeight: 700, letterSpacing: 3, color: amberA(0.55) }}>L U N A R&nbsp;&nbsp;L A N D E R</span>
        <div role="button" aria-label={t('reads_lander_pause') || 'Pause'} data-testid="reads-lander-pause" onClick={togglePause}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: AMBER }}>
          {mode === 'paused' ? <Play size={20} /> : <Pause size={20} />}
        </div>
        <div role="button" aria-label={t('reads_lander_sound') || 'Sound'} data-testid="reads-lander-sound" onClick={toggleSound}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: soundOn ? AMBER : COLORS.textMuted }}>
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </div>
      </div>

      {/* LCD */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 440, flex: '0 1 auto', padding: `0 ${SPACE.md}px`, display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', maxHeight: '60vh', aspectRatio: '160 / 224', borderRadius: RADIUS.lg, overflow: 'hidden', border: `1px solid #241a08`, boxShadow: 'inset 0 0 40px rgba(0,0,0,.85)' }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} data-testid="reads-lander-canvas"
            onPointerDown={(e) => { e.preventDefault(); advanceTap(); }}
            style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }} />
          {/* scanline + vignette overlays (LCD authenticity) */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,.16) 3px)', mixBlendMode: 'multiply' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(120% 120% at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%)' }} />
          {/* new-best initials overlay (DOM — leaderboard needs [A-Z]{3}) */}
          {showInitials && (
            <div data-testid="reads-lander-initials" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, background: `${COLORS.bg}e8`, padding: SPACE.lg, boxSizing: 'border-box' }}>
              <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: AMBER, letterSpacing: 1 }}>{t('reads_lander_enter_initials') || 'NEW BEST — ENTER INITIALS'}</div>
              <div style={{ display: 'flex', gap: SPACE.md }}>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <button type="button" aria-label={`up-${idx}`} data-testid={`reads-lander-initial-up-${idx}`} onClick={() => bumpInitial(idx, 1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                    <span style={{ fontSize: 30, fontWeight: 900, color: AMBER, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                    <button type="button" aria-label={`down-${idx}`} data-testid={`reads-lander-initial-down-${idx}`} onClick={() => bumpInitial(idx, -1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
                  </div>
                ))}
              </div>
              <button type="button" data-testid="reads-lander-submit" onClick={submitScore}
                style={{ marginTop: SPACE.sm, padding: '12px 28px', minHeight: TOUCH.minTarget, background: AMBER, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer' }}>
                {t('reads_lander_save') || 'SAVE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls deck */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.md, padding: SPACE.lg, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <button type="button" className="lander-btn" data-testid="reads-lander-left" aria-label={t('reads_lander_rot_left') || 'Rotate left'} {...hold('left')} style={rotBtn}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6 3 12l6 6" /><path d="M3 12h13a4 4 0 0 1 0 8h-3" /></svg>
          </button>
          <button type="button" data-testid="reads-lander-right" aria-label={t('reads_lander_rot_right') || 'Rotate right'} {...hold('right')} style={rotBtn}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6 21 12l-6 6" /><path d="M21 12H8a4 4 0 0 0 0 8h3" /></svg>
          </button>
        </div>
        <button type="button" data-testid="reads-lander-thrust" aria-label={t('reads_lander_thrust') || 'Thrust'} {...hold('thrust')} style={thrustBtn}>
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3c3 3 4.5 6.5 4.5 10A4.5 4.5 0 0 1 12 17.5 4.5 4.5 0 0 1 7.5 13C7.5 9.5 9 6 12 3Z" /><path d="M9 19c0 1.5 1.3 2.5 3 2.5s3-1 3-2.5" /></svg>
          <span style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700 }}>{t('reads_lander_thrust') || 'THRUST'}</span>
        </button>
      </div>
    </div>
  );
}

const rotBtn = { ...ARCADE_BTN, width: 62, height: 62 };
const thrustBtn = { ...ARCADE_BTN, width: 104, height: 84, flexDirection: 'column', gap: 4 };
const iniBtn = { minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', background: COLORS.surface, color: AMBER, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md, cursor: 'pointer' };
