// Reads Asteroids — 6th Arcade game. Vector-rock shooter in Reads amber-phosphor,
// ported 1:1 from docs/prototypes/asteroids.html. Single <canvas> (cosmic sky +
// screen-anchored dither rocks + procedural audio + canvas HUD). DOM chrome =
// console frame + back + sound + touch pad (rotate/thrust/fire/jump). Leaderboard
// (`leaderboards/readsAsteroids`, shared {board} rule — no rules change). Lazy own
// chunk (/break/asteroids).
//
// The prototype carried only an in-memory `hi`; this wires the real persistent
// best + a [A-Z]{3} new-best overlay (same as Lander/Warrior).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

const W = 360, H = 640;
const AMBER = '#f59e0b', AMBER4 = '#fbbf24', DARKBG = '#0a0e17';

export default function ReadsAsteroidsPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const canvasRef = useRef(null);
  const apiRef = useRef(null);
  const bestRef = useRef(0);
  const [soundOn, setSoundOn] = useState(true);
  const [over, setOver] = useState(false);
  const [pbScore, setPbScore] = useState(0);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);

  const loadBest = useCallback(async () => {
    let best = 0;
    try { const top = await ds.getReadsAsteroidsTop(1); best = top[0]?.score || 0; } catch {}
    if (uid) { try { const mine = await ds.getReadsAsteroidsMyScore(uid); best = Math.max(best, mine?.score || 0); } catch {} }
    bestRef.current = best; if (apiRef.current) apiRef.current.setBest(best);
  }, [uid]);
  useEffect(() => { loadBest(); }, [loadBest]);

  // iOS hardening: block document scroll/bounce while mounted.
  useEffect(() => { const block = (e) => e.preventDefault(); document.addEventListener('touchmove', block, { passive: false }); return () => document.removeEventListener('touchmove', block); }, []);

  // ── game setup (canvas + RAF), ported from the prototype ──────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    // screen-anchored dither tile (amber dots on transparent) for rock interiors
    const tile = document.createElement('canvas'); tile.width = tile.height = 6; const tctx = tile.getContext('2d');
    tctx.clearRect(0, 0, 6, 6); tctx.fillStyle = 'rgba(245,158,11,0.5)';
    [[1, 1], [4, 4], [1, 4], [4, 1], [2.5, 2.5]].forEach(p => { tctx.beginPath(); tctx.arc(p[0], p[1], 0.85, 0, 7); tctx.fill(); });
    const ditherPat = ctx.createPattern(tile, 'repeat');

    // ── procedural audio ──
    const Audio_ = { ctx: null, master: null, on: true, hb: 0, hbTog: false, thrustNode: null, thrustGain: null, ufoOsc: null, ufoGain: null };
    function aInit() { if (Audio_.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; Audio_.ctx = new AC(); Audio_.master = Audio_.ctx.createGain(); Audio_.master.gain.value = 0.26; Audio_.master.connect(Audio_.ctx.destination); }
    let _audioUnlocked = false;
    function unlockAudio() { aInit(); if (!Audio_.ctx) return; if (Audio_.ctx.state === 'suspended') Audio_.ctx.resume(); if (!_audioUnlocked) { try { const b = Audio_.ctx.createBuffer(1, 1, 22050), s = Audio_.ctx.createBufferSource(); s.buffer = b; s.connect(Audio_.ctx.destination); s.start(0); } catch {} _audioUnlocked = true; } }
    function blip(freq, dur, type = 'square', vol = 0.5, slideTo) { if (!Audio_.on || !Audio_.ctx) return; const c = Audio_.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(Audio_.master); o.start(t); o.stop(t + dur + 0.02); }
    function noise(dur, vol = 0.5, lp = 1200) { if (!Audio_.on || !Audio_.ctx) return; const c = Audio_.ctx, t = c.currentTime; const n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = buf; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(Audio_.master); s.start(t); }
    const sFire = () => blip(680, 0.16, 'square', 0.32, 180);
    function sBoom(size) { const v = size === 3 ? 0.62 : size === 2 ? 0.5 : 0.4; noise(size === 3 ? 0.42 : size === 2 ? 0.3 : 0.22, v, size === 3 ? 900 : 1500); blip(size === 3 ? 90 : 140, 0.18, 'triangle', 0.3, 40); }
    function sThrust(on) { if (!Audio_.ctx) return; const c = Audio_.ctx; if (on && !Audio_.thrustNode) { const n = Math.floor(c.sampleRate * 0.5), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1); const s = c.createBufferSource(); s.buffer = buf; s.loop = true; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; const g = c.createGain(); g.gain.value = Audio_.on ? 0.12 : 0; s.connect(f); f.connect(g); g.connect(Audio_.master); s.start(); Audio_.thrustNode = s; Audio_.thrustGain = g; } else if (!on && Audio_.thrustNode) { try { Audio_.thrustNode.stop(); } catch {} Audio_.thrustNode = null; Audio_.thrustGain = null; } }
    function sUFO(on) { if (!Audio_.ctx) return; const c = Audio_.ctx; if (on && !Audio_.ufoOsc) { const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.value = 420; const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 7; lg.gain.value = 120; lfo.connect(lg); lg.connect(o.frequency); g.gain.value = Audio_.on ? 0.08 : 0; o.connect(g); g.connect(Audio_.master); o.start(); lfo.start(); Audio_.ufoOsc = o; Audio_.ufoGain = g; } else if (!on && Audio_.ufoOsc) { try { Audio_.ufoOsc.stop(); } catch {} Audio_.ufoOsc = null; Audio_.ufoGain = null; } }
    const sLife = () => { blip(523, 0.1, 'square', 0.3); setTimeout(() => blip(784, 0.14, 'square', 0.3), 110); };
    function heartbeat(dt) { if (state !== 'play' || !Audio_.on || !Audio_.ctx) return; const interval = Math.max(0.34, 0.4 + 0.085 * asteroids.length); Audio_.hb += dt; if (Audio_.hb >= interval) { Audio_.hb = 0; Audio_.hbTog = !Audio_.hbTog; blip(Audio_.hbTog ? 70 : 55, 0.13, 'sine', 0.42); } }
    function musicNote(freq, dur, type, vol) { if (!Audio_.on || !Audio_.ctx) return; const c = Audio_.ctx, t = c.currentTime; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0008, t + dur); o.connect(g); g.connect(Audio_.master); o.start(t); o.stop(t + dur + 0.04); }
    const Music_ = { acc: 0, step: 0, dur: 0.33 };
    const M_BASS = { 0: 110, 4: 87, 8: 98, 12: 82 };
    const M_LEAD = { 0: 440, 2: 523, 5: 587, 8: 523, 10: 440, 13: 392 };
    function musicTick(dt) { if (!Audio_.on || !Audio_.ctx || state === 'over') return; Music_.acc += dt; if (Music_.acc < Music_.dur) return; Music_.acc -= Music_.dur; const i = Music_.step % 16; if (M_BASS[i]) musicNote(M_BASS[i], 0.62, 'triangle', 0.09); if (M_LEAD[i]) musicNote(M_LEAD[i], 0.5, 'square', 0.066); if (Music_.step % 32 === 20) musicNote(880, 0.4, 'sine', 0.05); if (Music_.step % 32 === 28) musicNote(1047, 0.4, 'sine', 0.045); Music_.step++; }

    // ── cosmic backdrop ──
    let sky = { stars: [], nebulae: [], planets: [], shoot: null };
    const rnd = (a, b) => a + Math.random() * (b - a);
    function genSky() {
      const stars = []; const n = Math.floor(rnd(46, 64));
      for (let i = 0; i < n; i++) stars.push({ x: rnd(0, W), y: rnd(0, H), s: Math.random() < 0.18 ? 1.6 : 0.9, ph: rnd(0, 6.28), tw: rnd(0.6, 1.6) });
      const nebulae = []; const nn = Math.floor(rnd(1, 3.2));
      for (let i = 0; i < nn; i++) nebulae.push({ x: rnd(0, W), y: rnd(0, H * 0.8), r: rnd(60, 120), rot: rnd(0, 6.28), a: rnd(0.05, 0.11) });
      const planets = []; if (Math.random() < 0.7) { planets.push({ x: rnd(W * 0.55, W * 0.92), y: rnd(H * 0.12, H * 0.34), r: rnd(16, 30), ring: Math.random() < 0.5, a: rnd(0.5, 0.85) }); }
      sky = { stars, nebulae, planets, shoot: null, shootT: rnd(3, 7) };
    }
    function drawSky(dt) {
      ctx.fillStyle = DARKBG; ctx.fillRect(0, 0, W, H);
      sky.nebulae.forEach(nb => { ctx.save(); ctx.globalAlpha = nb.a; ctx.translate(nb.x, nb.y); ctx.rotate(nb.rot); ctx.fillStyle = ditherPat || AMBER; ctx.beginPath(); ctx.ellipse(0, 0, nb.r, nb.r * 0.6, 0, 0, 6.28); ctx.fill(); ctx.restore(); });
      sky.planets.forEach(p => { ctx.save(); ctx.globalAlpha = p.a * 0.5; ctx.translate(p.x, p.y); ctx.fillStyle = ditherPat || AMBER; ctx.beginPath(); ctx.arc(0, 0, p.r, 0, 6.28); ctx.fill(); ctx.globalAlpha = p.a; ctx.strokeStyle = AMBER; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, p.r, -0.6, 2.2); ctx.stroke(); if (p.ring) { ctx.globalAlpha = p.a * 0.7; ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.8, p.r * 0.5, 0.3, 0, 6.28); ctx.stroke(); } ctx.restore(); });
      const tnow = performance.now() / 1000;
      sky.stars.forEach(s => { const a = 0.4 + 0.5 * Math.abs(Math.sin(tnow * s.tw + s.ph)); ctx.globalAlpha = a; ctx.fillStyle = s.s > 1 ? AMBER4 : AMBER; ctx.fillRect(s.x - s.s / 2, s.y - s.s / 2, s.s, s.s); });
      ctx.globalAlpha = 1;
      sky.shootT -= dt; if (!sky.shoot && sky.shootT <= 0) { sky.shoot = { x: rnd(0, W * 0.5), y: rnd(0, H * 0.4), vx: rnd(160, 240), vy: rnd(80, 150), life: 0.7 }; }
      if (sky.shoot) { const sh = sky.shoot; ctx.globalAlpha = Math.min(1, sh.life * 2); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - sh.vx * 0.06, sh.y - sh.vy * 0.06); ctx.stroke(); ctx.globalAlpha = 1; sh.x += sh.vx * dt; sh.y += sh.vy * dt; sh.life -= dt; if (sh.life <= 0) { sky.shoot = null; sky.shootT = rnd(4, 9); } }
    }

    // ── entities / state ──
    let ship = null, bullets = [], asteroids = [], ufo = null, ufoBullets = [], particles = [];
    let score = 0, hi = bestRef.current, lives = 3, wave = 1, invuln = 0, ufoTimer = 0, state = 'start', waveFlash = 0;
    let extraLifeAt = 0;
    const keys = { left: false, right: false, thrust: false, fire: false };
    let fireCD = 0;

    const newShip = () => ({ x: W / 2, y: H / 2, a: -Math.PI / 2, vx: 0, vy: 0, r: 13 });
    function makeAsteroid(x, y, size) {
      const r = size === 3 ? 46 : size === 2 ? 26 : 15; const verts = []; const n = Math.floor(rnd(9, 13));
      for (let i = 0; i < n; i++) { const ang = i / n * 6.28; const rad = r * rnd(0.74, 1.12); verts.push([Math.cos(ang) * rad, Math.sin(ang) * rad]); }
      const sp = rnd(16, 40) * (1 + (wave - 1) * 0.06) * (size === 1 ? 1.7 : size === 2 ? 1.3 : 1); const dir = rnd(0, 6.28);
      return { x, y, vx: Math.cos(dir) * sp, vy: Math.sin(dir) * sp, a: rnd(0, 6.28), va: rnd(-1, 1), r, size, verts };
    }
    function spawnWave() { asteroids = []; const count = Math.min(3 + wave, 9); for (let i = 0; i < count; i++) { let x, y; do { x = rnd(0, W); y = rnd(0, H); } while (Math.hypot(x - W / 2, y - H / 2) < 130); asteroids.push(makeAsteroid(x, y, 3)); } genSky(); waveFlash = 1.4; }
    function resetGame() { ship = newShip(); bullets = []; ufoBullets = []; particles = []; ufo = null; score = 0; lives = 3; wave = 1; invuln = 2.2; ufoTimer = rnd(16, 26); extraLifeAt = 0; spawnWave(); }

    function splat(x, y, n, spread) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.28), s = rnd(20, spread); particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.4, 0.9), r: rnd(1, 2.6) }); } }
    function wrap(o) { if (o.x < 0) o.x += W; else if (o.x > W) o.x -= W; if (o.y < 0) o.y += H; else if (o.y > H) o.y -= H; }
    function fire() { if (bullets.length >= 5) return; const nx = ship.x + Math.cos(ship.a) * ship.r, ny = ship.y + Math.sin(ship.a) * ship.r; bullets.push({ x: nx, y: ny, vx: Math.cos(ship.a) * 430 + ship.vx, vy: Math.sin(ship.a) * 430 + ship.vy, life: 0.95 }); sFire(); }
    function hyperspace() { if (state !== 'play' || !ship) return; ship.x = rnd(30, W - 30); ship.y = rnd(30, H - 30); ship.vx = ship.vy = 0; invuln = 1.4; blip(300, 0.18, 'sawtooth', 0.3, 900); if (Math.random() < 0.06) { loseLife(); } }
    function loseLife() { splat(ship.x, ship.y, 26, 160); sBoom(3); lives--; sThrust(false); keys.thrust = false; if (lives <= 0) { gameOver(); } else { ship = newShip(); invuln = 2.4; } }
    function gameOver() { state = 'over'; hi = Math.max(hi, score); sUFO(false); sThrust(false); const final = Math.floor(score); if (final > bestRef.current && uid) { setPbScore(final); setSubmitted(false); setInitials('AAA'); } setOver(true); }
    function spawnUFO() { const fromL = Math.random() < 0.5; ufo = { x: fromL ? -20 : W + 20, y: rnd(H * 0.15, H * 0.7), vx: (fromL ? 1 : -1) * rnd(55, 80), vy: 0, r: 15, fire: rnd(0.8, 1.6), wig: rnd(0, 6.28) }; sUFO(true); }

    function update(dt) {
      if (state !== 'play') return;
      waveFlash = Math.max(0, waveFlash - dt); invuln = Math.max(0, invuln - dt); heartbeat(dt);
      if (keys.left) ship.a -= 4.6 * dt; if (keys.right) ship.a += 4.6 * dt;
      if (keys.thrust) { ship.vx += Math.cos(ship.a) * 240 * dt; ship.vy += Math.sin(ship.a) * 240 * dt; }
      const sp = Math.hypot(ship.vx, ship.vy), MAX = 320; if (sp > MAX) { ship.vx *= MAX / sp; ship.vy *= MAX / sp; }
      ship.vx *= Math.pow(0.45, dt); ship.vy *= Math.pow(0.45, dt); ship.x += ship.vx * dt; ship.y += ship.vy * dt; wrap(ship);
      fireCD -= dt; if (keys.fire && fireCD <= 0) { fire(); fireCD = 0.28; }
      for (let i = bullets.length - 1; i >= 0; i--) { const b = bullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt; if (b.life <= 0) bullets.splice(i, 1); }
      asteroids.forEach(a => { a.x += a.vx * dt; a.y += a.vy * dt; a.a += a.va * dt; wrap(a); });
      ufoTimer -= dt; if (!ufo && ufoTimer <= 0 && asteroids.length > 0) { spawnUFO(); }
      if (ufo) { ufo.wig += dt * 2; ufo.x += ufo.vx * dt; ufo.y += Math.sin(ufo.wig) * 22 * dt; ufo.fire -= dt; if (ufo.fire <= 0) { const ang = Math.atan2(ship.y - ufo.y, ship.x - ufo.x) + rnd(-0.25, 0.25); ufoBullets.push({ x: ufo.x, y: ufo.y, vx: Math.cos(ang) * 220, vy: Math.sin(ang) * 220, life: 2.4 }); blip(520, 0.12, 'square', 0.25, 260); ufo.fire = rnd(1.0, 1.8); } if (ufo.x < -40 || ufo.x > W + 40) { ufo = null; sUFO(false); ufoTimer = rnd(18, 30); } }
      for (let i = ufoBullets.length - 1; i >= 0; i--) { const b = ufoBullets[i]; b.x += b.vx * dt; b.y += b.vy * dt; wrap(b); b.life -= dt; if (b.life <= 0) ufoBullets.splice(i, 1); }
      for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; if (p.life <= 0) particles.splice(i, 1); }
      for (let i = asteroids.length - 1; i >= 0; i--) { const a = asteroids[i]; for (let j = bullets.length - 1; j >= 0; j--) { const b = bullets[j]; if (Math.hypot(a.x - b.x, a.y - b.y) < a.r) { bullets.splice(j, 1); destroyAsteroid(i); break; } } }
      if (ufo) { for (let j = bullets.length - 1; j >= 0; j--) { const b = bullets[j]; if (Math.hypot(ufo.x - b.x, ufo.y - b.y) < ufo.r) { bullets.splice(j, 1); splat(ufo.x, ufo.y, 22, 150); sBoom(2); score += 200; ufo = null; sUFO(false); ufoTimer = rnd(18, 30); break; } } }
      if (invuln <= 0) {
        for (const a of asteroids) { if (Math.hypot(a.x - ship.x, a.y - ship.y) < a.r + ship.r * 0.7) { loseLife(); break; } }
        if (state === 'play' && ufo && Math.hypot(ufo.x - ship.x, ufo.y - ship.y) < ufo.r + ship.r) { loseLife(); }
        if (state === 'play') for (let j = ufoBullets.length - 1; j >= 0; j--) { const b = ufoBullets[j]; if (Math.hypot(b.x - ship.x, b.y - ship.y) < ship.r) { ufoBullets.splice(j, 1); loseLife(); break; } }
      }
      if (state === 'play' && asteroids.length === 0) { wave++; ufoTimer = rnd(14, 24); spawnWave(); }
    }
    function destroyAsteroid(i) { const a = asteroids[i]; score += a.size === 3 ? 20 : a.size === 2 ? 50 : 100; splat(a.x, a.y, a.size * 7, 60 + a.size * 30); sBoom(a.size); asteroids.splice(i, 1); if (a.size > 1) { for (let k = 0; k < 2; k++) asteroids.push(makeAsteroid(a.x, a.y, a.size - 1)); } const ml = Math.floor(score / 10000); if (ml > extraLifeAt) { extraLifeAt = ml; lives++; sLife(); } }

    // ── render ──
    function drawShipShape(x, y, a, scale) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(scale, scale); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-10, -9); ctx.lineTo(-6, 0); ctx.lineTo(-10, 9); ctx.closePath(); ctx.fillStyle = 'rgba(245,158,11,0.16)'; ctx.fill(); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.8; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
    const SEG = { '0': [1, 1, 1, 1, 1, 1, 0], '1': [0, 1, 1, 0, 0, 0, 0], '2': [1, 1, 0, 1, 1, 0, 1], '3': [1, 1, 1, 1, 0, 0, 1], '4': [0, 1, 1, 0, 0, 1, 1], '5': [1, 0, 1, 1, 0, 1, 1], '6': [1, 0, 1, 1, 1, 1, 1], '7': [1, 1, 1, 0, 0, 0, 0], '8': [1, 1, 1, 1, 1, 1, 1], '9': [1, 1, 1, 1, 0, 1, 1] };
    function drawDigit(x, y, w, h, segs) { const tk = Math.max(1.6, w * 0.16); const on = AMBER, off = 'rgba(245,158,11,0.07)'; const seg = (i, hx, hy, hw, hh) => { ctx.fillStyle = segs[i] ? on : off; ctx.fillRect(hx, hy, hw, hh); }; seg(0, x + tk, y, w - 2 * tk, tk); seg(1, x + w - tk, y + tk, tk, h / 2 - tk); seg(2, x + w - tk, y + h / 2, tk, h / 2 - tk); seg(3, x + tk, y + h - tk, w - 2 * tk, tk); seg(4, x, y + h / 2, tk, h / 2 - tk); seg(5, x, y + tk, tk, h / 2 - tk); seg(6, x + tk, y + h / 2 - tk / 2, w - 2 * tk, tk); }
    function drawScore() { const str = String(Math.floor(score)).padStart(5, '0'); const dw = 15, dh = 24, gap = 4; const total = str.length * (dw + gap) - gap; let x = W / 2 - total / 2, y = 14; for (const ch of str) { drawDigit(x, y, dw, dh, SEG[ch] || SEG['0']); x += dw + gap; } }
    function drawHud() {
      // lives — ship glyphs, top-left
      for (let i = 0; i < Math.max(0, lives); i++) { const lx = 14 + i * 16, ly = 16; ctx.save(); ctx.translate(lx, ly); ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-3, 0); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fillStyle = 'rgba(245,158,11,0.15)'; ctx.fill(); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); }
      // wave — top-right
      ctx.textAlign = 'right'; ctx.fillStyle = '#64748b'; ctx.font = '800 10px ui-monospace,Menlo,monospace'; ctx.fillText('WAVE', W - 14, 14); ctx.fillStyle = '#b47708'; ctx.font = '800 13px ui-monospace,Menlo,monospace'; ctx.fillText(String(wave), W - 14, 28); ctx.textAlign = 'left';
      drawScore();
    }
    function render(dt) {
      drawSky(dt);
      asteroids.forEach(a => { ctx.save(); const pts = a.verts.map(v => { const c = Math.cos(a.a), s = Math.sin(a.a); return [a.x + v[0] * c - v[1] * s, a.y + v[0] * s + v[1] * c]; }); ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = ditherPat || 'rgba(245,158,11,0.2)'; ctx.fill(); ctx.strokeStyle = AMBER; ctx.lineWidth = 1.7; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore(); });
      if (ufo) { ctx.save(); ctx.translate(ufo.x, ufo.y); ctx.fillStyle = ditherPat || 'rgba(245,158,11,0.2)'; ctx.beginPath(); ctx.ellipse(0, 2, 16, 6, 0, 0, 6.28); ctx.fill(); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 2, 16, 6, 0, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, -3, 8, 5, 0, Math.PI, 0); ctx.stroke(); ctx.restore(); }
      ctx.fillStyle = AMBER4; bullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.2, 0, 6.28); ctx.fill(); });
      ctx.fillStyle = AMBER; ufoBullets.forEach(b => { ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, 6.28); ctx.fill(); });
      particles.forEach(p => { ctx.globalAlpha = Math.min(1, p.life * 2); ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.28); ctx.fill(); });
      ctx.globalAlpha = 1;
      if (ship && (state === 'play' || state === 'over')) { const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0; if (!blink) { if (keys.thrust && state === 'play') { ctx.save(); ctx.translate(ship.x, ship.y); ctx.rotate(ship.a); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(-6 - rnd(6, 12), 0); ctx.lineTo(-6, 4); ctx.stroke(); ctx.restore(); } drawShipShape(ship.x, ship.y, ship.a, 1); } }
      if (waveFlash > 0 && state === 'play') { ctx.globalAlpha = Math.min(1, waveFlash); ctx.fillStyle = AMBER; ctx.font = '900 22px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('WAVE ' + wave, W / 2, H * 0.4); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
      drawHud();
      if (state === 'start') overlay('ASTEROIDS', 'READS · TAKE A BREAK', 'TAP TO START');
      else if (state === 'over') overlay('GAME OVER', 'SCORE ' + Math.floor(score), 'TAP TO RETRY');
    }
    function overlay(title, sub, cta) { ctx.fillStyle = 'rgba(10,14,23,.78)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = '900 30px Inter, sans-serif'; ctx.fillText(title, W / 2, H / 2 - 24); ctx.fillStyle = '#e2e8f0'; ctx.font = '700 13px ui-monospace,Menlo,monospace'; ctx.fillText(sub, W / 2, H / 2 + 6); ctx.fillStyle = '#b47708'; ctx.font = '600 12px ui-monospace,Menlo,monospace'; ctx.fillText('BEST ' + Math.max(hi, bestRef.current), W / 2, H / 2 + 30); const p = 0.6 + 0.4 * Math.abs(Math.sin(performance.now() / 420)); ctx.globalAlpha = p; ctx.fillText(cta, W / 2, H / 2 + 58); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }

    let last = performance.now(), raf;
    function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(dt); musicTick(dt); raf = requestAnimationFrame(loop); }

    function startGame() { unlockAudio(); resetGame(); state = 'play'; setOver(false); }
    genSky();
    raf = requestAnimationFrame(loop);

    apiRef.current = {
      startOrAdvance: () => { unlockAudio(); if (state !== 'play') startGame(); },
      pressGet: () => keys,
      tapFire: () => { if (state === 'play') { keys.fire = true; setTimeout(() => { keys.fire = false; }, 60); } },
      tapJump: () => { if (state === 'play') hyperspace(); },
      setSound: (v) => { Audio_.on = v; if (!v) { sThrust(false); sUFO(false); } else unlockAudio(); },
      setBest: (b) => { hi = Math.max(hi, b); },
      getState: () => state,
      getScore: () => Math.floor(score),
      forceScore: (n) => { score = Math.max(0, Math.min(9999, n | 0)); },
      gameOver: () => gameOver(),
    };
    if (window.__pbtest) window.__pbAsteroidsTest = { state: () => apiRef.current.getState(), forceScore: (n) => apiRef.current.forceScore(n), gameOver: () => apiRef.current.gameOver() };

    return () => { cancelAnimationFrame(raf); try { sThrust(false); sUFO(false); if (Audio_.ctx) Audio_.ctx.close(); } catch {} try { delete window.__pbAsteroidsTest; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // keyboard (desktop)
  useEffect(() => {
    const km = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'thrust', w: 'thrust', W: 'thrust' };
    const down = (e) => {
      const api = apiRef.current; if (!api) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (api.getState() !== 'play') { api.startOrAdvance(); return; } api.pressGet().fire = true; return; }
      if (e.key === 'h' || e.key === 'H') { api.tapJump(); return; }
      const k = km[e.key]; if (!k) return; e.preventDefault(); if (api.getState() !== 'play') { api.startOrAdvance(); return; } api.pressGet()[k] = true;
    };
    const up = (e) => { const api = apiRef.current; if (!api) return; if (e.key === ' ' || e.code === 'Space') { api.pressGet().fire = false; return; } const k = km[e.key]; if (k) api.pressGet()[k] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const holdBtn = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); const api = apiRef.current; if (!api) return; if (api.getState() !== 'play') { api.startOrAdvance(); return; } api.pressGet()[key] = true; },
    onPointerUp: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
    onPointerLeave: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
    onPointerCancel: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
  });
  const tapBtn = (fn) => ({ onPointerDown: (e) => { e.preventDefault(); const api = apiRef.current; if (!api) return; if (api.getState() !== 'play') { api.startOrAdvance(); return; } api[fn](); } });

  const toggleSound = () => { const v = !soundOn; setSoundOn(v); apiRef.current?.setSound(v); };
  const bumpInitial = (idx, dir) => { setInitials((cur) => { const arr = cur.split(''); let code = arr[idx].charCodeAt(0) - 65 + dir; code = ((code % 26) + 26) % 26; arr[idx] = String.fromCharCode(65 + code); return arr.join(''); }); };
  const submitScore = async () => { if (submitted) return; setSubmitted(true); try { await ds.submitReadsAsteroidsScore(uid, { initials, score: pbScore }); bestRef.current = Math.max(bestRef.current, pbScore); apiRef.current?.setBest(bestRef.current); } catch {} };

  const showInitials = over && pbScore > 0 && !!uid && !submitted;

  return (
    <div data-testid="reads-asteroids"
      style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: AMBER, overflow: 'hidden', ...NO_SELECT, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Chrome bar */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('reads_asteroids_back') || 'Back'} data-testid="reads-asteroids-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <span style={{ flex: 1, fontSize: FONT_SIZE.sm, fontWeight: 700, letterSpacing: 1, color: COLORS.textDim }}>ASTEROIDS</span>
        <div role="button" aria-label={t('reads_asteroids_sound') || 'Sound'} data-testid="reads-asteroids-sound" onClick={toggleSound}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: soundOn ? AMBER : COLORS.textMuted }}>
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </div>
      </div>

      {/* console (letterbox 9:16) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, flex: 1, minHeight: 0, padding: `0 ${SPACE.md}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', maxHeight: '100%', maxWidth: '100%', height: '100%', aspectRatio: '9 / 16', borderRadius: RADIUS.lg, overflow: 'hidden', background: DARKBG, boxShadow: 'inset 0 0 0 2px #000, inset 0 0 24px rgba(0,0,0,.5)' }}>
          <canvas ref={canvasRef} data-testid="reads-asteroids-canvas"
            onPointerDown={(e) => { e.preventDefault(); apiRef.current?.startOrAdvance(); }}
            style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 50% 35%, transparent 55%, rgba(0,0,0,.5) 100%)' }} />
          {showInitials && (
            <div data-testid="reads-asteroids-initials" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, background: `${COLORS.bg}e8`, padding: SPACE.lg, boxSizing: 'border-box' }}>
              <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: AMBER, letterSpacing: 1 }}>{t('reads_asteroids_enter_initials') || 'NEW BEST — ENTER INITIALS'}</div>
              <div style={{ display: 'flex', gap: SPACE.md }}>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <button type="button" aria-label={`up-${idx}`} data-testid={`reads-asteroids-initial-up-${idx}`} onClick={() => bumpInitial(idx, 1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                    <span style={{ fontSize: 30, fontWeight: 900, color: AMBER, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                    <button type="button" aria-label={`down-${idx}`} data-testid={`reads-asteroids-initial-down-${idx}`} onClick={() => bumpInitial(idx, -1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
                  </div>
                ))}
              </div>
              <button type="button" data-testid="reads-asteroids-submit" onClick={submitScore}
                style={{ marginTop: SPACE.sm, padding: '12px 28px', minHeight: TOUCH.minTarget, background: AMBER, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer' }}>
                {t('reads_asteroids_save') || 'SAVE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls — icon buttons in a left cluster (rotate + jump) and a right
          cluster (thrust + fire), matching the Lander deck (§121): no bare text
          labels, 60–82px targets, space-between layout. */}
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: SPACE.sm, padding: SPACE.lg, boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <button type="button" data-testid="reads-asteroids-left" aria-label={t('reads_asteroids_left') || 'Rotate left'} {...holdBtn('left')} style={rotBtn}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 6 3 12l6 6" /><path d="M3 12h13a4 4 0 0 1 0 8h-3" /></svg>
          </button>
          <button type="button" data-testid="reads-asteroids-right" aria-label={t('reads_asteroids_right') || 'Rotate right'} {...holdBtn('right')} style={rotBtn}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M15 6 21 12l-6 6" /><path d="M21 12H8a4 4 0 0 0 0 8h3" /></svg>
          </button>
          <button type="button" data-testid="reads-asteroids-jump" aria-label={t('reads_asteroids_jump') || 'Jump'} {...tapBtn('tapJump')} style={jumpBtn}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor" aria-hidden><path d="M12 2.5l1.9 6.6 6.6 1.9-6.6 1.9L12 19.5l-1.9-6.6L3.5 11l6.6-1.9z" /></svg>
          </button>
        </div>
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <button type="button" data-testid="reads-asteroids-thrust" aria-label={t('reads_asteroids_thrust') || 'Thrust'} {...holdBtn('thrust')} style={actBtn}>
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor" aria-hidden><path d="M12 3l7 9h-4v9H9v-9H5z" /></svg>
          </button>
          <button type="button" data-testid="reads-asteroids-fire" aria-label={t('reads_asteroids_fire') || 'Fire'} {...holdBtn('fire')} style={{ ...actBtn, color: AMBER4 }}>
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor" aria-hidden><circle cx="12" cy="12" r="7" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const rotBtn = { ...ARCADE_BTN, width: 60, height: 60 };
const jumpBtn = { ...ARCADE_BTN, width: 58, height: 60 };
const actBtn = { ...ARCADE_BTN, width: 82, height: 72 };
const iniBtn = { ...ARCADE_BTN, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, borderRadius: RADIUS.md };
