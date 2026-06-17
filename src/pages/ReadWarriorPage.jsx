// Read Warrior — 5th Arcade game (§122). Road-Fighter-feel racer in Reads
// amber-phosphor, ported 1:1 from docs/prototypes/read_warrior.html. Single
// <canvas> (textures + traffic + RoadEvents); DOM chrome = console frame +
// brand mark + ◀ ▶ GAS controls + sound. Reuses the shared RoadEvents module
// (src/utils/RoadEvents.js). Leaderboard §122 (`leaderboards/readWarrior`,
// shared {board} rule — no rules change). Lazy own chunk (/break/warrior).
//
// Brand mark KEPT in-game (Jacek 2026-06-17 — clean large canvas/SVG render,
// not the pixelated case the no-mark directive targets). Palette = named header
// constants (brief lists #fbbf24/#f59e0b as the valid amber; "define once").
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import RoadEvents from '../utils/RoadEvents';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

const W = 360, H = 640;
// Amber-phosphor palette — named constants (no scattered literals). AMBER lit /
// MID mid / DIM unlit; warm FIELD/ROAD/etc. have no theme token.
const ON = '#fbbf24', MID = '#c98a18', DIM = '#3a2e0f', FIELD = '#160f04',
  SHOULDER = '#1d1606', ROAD = '#0c0a06', VOID = '#050403', WALL = '#0e0a04', LOWMID = '#9a7b1f';

export default function ReadWarriorPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const canvasRef = useRef(null);
  const apiRef = useRef(null);          // {getScore, getMode, restart, setSound}
  const bestRef = useRef(0);
  const [soundOn, setSoundOn] = useState(true);
  const [over, setOver] = useState(false);
  const [pbScore, setPbScore] = useState(0);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);

  const loadBest = useCallback(async () => {
    let best = 0;
    try { const top = await ds.getReadWarriorTop(1); best = top[0]?.score || 0; } catch {}
    if (uid) { try { const mine = await ds.getReadWarriorMyScore(uid); best = Math.max(best, mine?.score || 0); } catch {} }
    bestRef.current = best; if (apiRef.current) apiRef.current.setBest(best);
  }, [uid]);
  useEffect(() => { loadBest(); }, [loadBest]);

  // iOS hardening: block document scroll/bounce while mounted.
  useEffect(() => { const block = (e) => e.preventDefault(); document.addEventListener('touchmove', block, { passive: false }); return () => document.removeEventListener('touchmove', block); }, []);

  // ── game setup (canvas + RAF + RoadEvents), ported from the prototype ──────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = (a, b) => a + Math.random() * (b - a), mtof = (m) => 440 * Math.pow(2, (m - 69) / 12), clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // 1-bit texture tiles (precomputed; screen-anchored).
    const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    const tile = (w, h, fn) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); fn(g); return ctx.createPattern(c, 'repeat'); };
    const bayer = (level, col) => tile(4, 4, (g) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if ((B4[y * 4 + x] + 0.5) / 16 < level) { g.fillStyle = col; g.fillRect(x, y, 1, 1); } });
    const TEX = {
      grass: bayer(0.30, '#34280c'), d50: bayer(0.5, ON), d25: bayer(0.25, ON),
      water: tile(6, 6, (g) => { g.fillStyle = '#46370f'; g.fillRect(0, 1, 4, 1); g.fillRect(3, 4, 3, 1); }),
      water2: tile(6, 6, (g) => { g.fillStyle = '#46370f'; g.fillRect(2, 0, 4, 1); g.fillRect(0, 3, 4, 1); }),
      brick: tile(10, 6, (g) => { g.fillStyle = '#2a2008'; g.fillRect(0, 0, 10, 1); g.fillRect(0, 3, 10, 1); g.fillRect(0, 0, 1, 3); g.fillRect(5, 3, 1, 3); }),
    };

    // audio
    const MUS = { bpm: 132, lead: [69, 72, 76, 72, 65, 69, 72, 69, 72, 76, 79, 76, 67, 71, 74, 71], bass: [45, 0, 45, 0, 41, 0, 41, 0, 48, 0, 48, 0, 43, 0, 43, 0] };
    const Audio = {
      ctx: null, on: true, master: null, music: null, sfxG: null, engG: null, engO: null, next: 0, step: 0,
      ensure() { if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); if (!this.ctx.__pbUnlocked) { this.ctx.__pbUnlocked = true; try { const b = this.ctx.createBuffer(1, 1, 22050); const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start(0); } catch {} } return; } const C = window.AudioContext || window.webkitAudioContext; if (!C) return; this.ctx = new C(); this.__pbUnlocked = true; this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 1 : 0; this.master.connect(this.ctx.destination); this.music = this.ctx.createGain(); this.music.gain.value = 0.5; this.music.connect(this.master); this.sfxG = this.ctx.createGain(); this.sfxG.gain.value = 0.9; this.sfxG.connect(this.master); this.engG = this.ctx.createGain(); this.engG.gain.value = 0; this.engG.connect(this.master); this.engO = this.ctx.createOscillator(); this.engO.type = 'square'; this.engO.frequency.value = 80; this.engO.connect(this.engG); this.engO.start(); this.next = this.ctx.currentTime + 0.1; this.step = 0; },
      note(f, tt, dur, vol, dest) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(f, tt); g.gain.setValueAtTime(0, tt); g.gain.setValueAtTime(vol, tt + 0.002); g.gain.setValueAtTime(vol, tt + dur * 0.8); g.gain.setValueAtTime(0, tt + dur * 0.85); o.connect(g).connect(dest); o.start(tt); o.stop(tt + dur + 0.02); },
      sweep(f0, f1, dur, vol) { if (!this.ctx || !this.on) return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'square'; o.frequency.setValueAtTime(f0, c.currentTime); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), c.currentTime + dur); g.gain.setValueAtTime(vol, c.currentTime); g.gain.setValueAtTime(vol, c.currentTime + dur * 0.8); g.gain.linearRampToValueAtTime(0, c.currentTime + dur); o.connect(g).connect(this.sfxG); o.start(); o.stop(c.currentTime + dur + 0.02); },
      beep(f, dur, vol) { if (!this.ctx || !this.on) return; this.note(f, this.ctx.currentTime, dur, vol, this.sfxG); },
      boost() { this.sweep(280, 1120, 0.34, 0.07); },
      sparkle() { if (!this.ctx || !this.on) return; const tt = this.ctx.currentTime;[84, 88, 91, 96].forEach((m, i) => this.note(mtof(m), tt + i * 0.04, 0.05, 0.05, this.sfxG)); },
      alert() { if (!this.ctx || !this.on) return; const tt = this.ctx.currentTime; this.note(523, tt, 0.08, 0.06, this.sfxG); this.note(523, tt + 0.12, 0.08, 0.06, this.sfxG); },
      jingle() { if (!this.ctx || !this.on) return; const tt = this.ctx.currentTime;[60, 64, 67, 72].forEach((m, i) => this.note(mtof(m), tt + i * 0.08, 0.1, 0.07, this.sfxG)); },
      over() { if (!this.ctx || !this.on) return; const tt = this.ctx.currentTime;[69, 64, 60, 53].forEach((m, i) => this.note(mtof(m), tt + i * 0.13, 0.13, 0.07, this.sfxG)); },
      crash() { if (!this.ctx || !this.on) return; const c = this.ctx, dur = 0.34; const buf = c.createBuffer(1, (c.sampleRate * dur) | 0, c.sampleRate), d = buf.getChannelData(0); let v = 1, h = 0; for (let i = 0; i < d.length; i++) { if ((h -= 1) <= 0) { h = 2 + ((Math.random() * 5) | 0); v = -v; } d[i] = v; } const s = c.createBufferSource(); s.buffer = buf; const g = c.createGain(); g.gain.setValueAtTime(0.12, c.currentTime); g.gain.linearRampToValueAtTime(0, c.currentTime + dur); s.connect(g).connect(this.sfxG); s.start(); this.note(120, c.currentTime, dur, 0.07, this.sfxG); },
      frame(playing, speed) { if (!this.ctx || !this.on) { if (this.engG) this.engG.gain.value = 0; return; } this.engG.gain.value = playing ? 0.022 : 0; if (playing) this.engO.frequency.value = 58 + speed * 1.9; const sd = 60 / MUS.bpm / 4, tt = this.ctx.currentTime; while (this.next < tt + 0.15) { const i = this.step % 16; if (MUS.lead[i]) this.note(mtof(MUS.lead[i]), this.next, sd * 0.92, 0.045, this.music); if (MUS.bass[i]) this.note(mtof(MUS.bass[i]), this.next, sd * 1.7, 0.05, this.music); this.next += sd; this.step++; } },
      setOn(v) { this.on = v; if (this.master) this.master.gain.value = v ? 1 : 0; },
    };

    const VEH = { car: { w: 24, h: 40, v: [6, 12] }, bus: { w: 28, h: 64, v: [5, 9] }, truck: { w: 28, h: 74, v: [5, 8] }, tractor: { w: 26, h: 46, v: [2, 4] } };
    const pickType = () => { const r = Math.random() * 100; return r < 58 ? 'car' : r < 72 ? 'bus' : r < 88 ? 'truck' : 'tractor'; };
    const TYPES = { straight: { amp: 0.15, w: 84 }, curve: { amp: 1.0, w: 80 }, highway: { amp: 0.45, w: 106 }, bridge: { amp: 0.30, w: 62 }, tunnel: { amp: 0.55, w: 80 } };
    const ORDER = ['curve', 'highway', 'straight', 'bridge', 'tunnel'];
    const weave = (d) => 55 * Math.sin(d * 0.016) + 20 * Math.sin(d * 0.043);
    let sections = [];
    const makeSection = (prev) => { let ty; do { ty = ORDER[(Math.random() * ORDER.length) | 0]; } while (ty === prev.type); const len = (ty === 'bridge' || ty === 'tunnel') ? rand(220, 300) : rand(300, 440); return { start: prev.end, end: prev.end + len, type: ty }; };
    const ensureSections = (upto) => { if (!sections.length) sections.push({ start: 0, end: 300, type: 'straight' }); while (sections[sections.length - 1].end < upto) sections.push(makeSection(sections[sections.length - 1])); while (sections.length > 3 && sections[1].end < dist - 40) sections.shift(); };
    const pAt = (d) => { if (!sections.length) return { type: 'straight', amp: 0.15, w: 84 }; for (let i = 0; i < sections.length; i++) { const s = sections[i]; if (d >= s.start && d < s.end) { const cur = TYPES[s.type], prev = i > 0 ? TYPES[sections[i - 1].type] : cur, f = clamp((d - s.start) / 40, 0, 1), e = f * f * (3 - 2 * f); return { type: s.type, amp: prev.amp + (cur.amp - prev.amp) * e, w: prev.w + (cur.w - prev.w) * e }; } } const c = TYPES[sections[sections.length - 1].type]; return { type: sections[sections.length - 1].type, amp: c.amp, w: c.w }; };
    const curSection = () => { for (const s of sections) if (dist >= s.start && dist < s.end) return s; return sections[sections.length - 1]; };
    const curve = (d) => midX + weave(d) * pAt(d).amp;
    const halfW = (d) => pAt(d).w + 6 * Math.sin(d * 0.02);

    const midX = W / 2, PY = H * 0.74, PXPERM = 6, TOP = 58, PCW = 24, PCH = 40;
    const worldY = (dd, y) => dd + (PY - y) / PXPERM, screenY = (d) => PY - (d - dist) * PXPERM;
    const ST = { menu: 0, play: 1, over: 2 }; let state = ST.menu;
    let dist, speed, cruise, carX, vx, fuel, score, hi = 0, overtakes, cars, slicks, fx, exhT, spawnT, slickT, slip, crash, crashAng, inv, shake, dead, lowBeepT, lastSec, secLabel, secLabelT, boostT, boostMult, fuelFlash, stealAmt;
    hi = bestRef.current;

    const gameOver = (r) => { state = ST.over; dead = r; Audio.over(); const final = Math.floor(score); if (final > bestRef.current && uid) { setPbScore(final); setSubmitted(false); setInitials('AAA'); } setOver(true); };

    const host = {
      get dist() { return dist; }, get speed() { return speed; }, get playerX() { return carX; }, get cars() { return cars; },
      curve, halfW, screenY, geom: { PY, W, H, PXPERM }, reduce, tex: TEX,
      spawnCar(o) { const ty = o.type || 'car', s = VEH[ty]; cars.push({ d: o.d, lane: o.lane, v: o.v != null ? o.v : rand(s.v[0], s.v[1]), w: s.w, h: s.h, type: ty, jam: !!o.jam }); },
      boost(m, s) { boostMult = m; boostT = s; },
      bust() { if (crash <= 0 && inv <= 0) doCrash('BUSTED', 18); },
      beep(f, d, v) { Audio.beep(f, d, v); },
      sfx(n) { ({ boost: () => { Audio.boost(); Audio.sparkle(); }, alert: () => Audio.alert(), sparkle: () => Audio.sparkle(), siren: () => Audio.beep(700, 0.1, 0.05), bust: () => Audio.crash() })[n]?.(); },
    };
    const RE = new RoadEvents(host);

    function reset() { dist = 0; speed = 18; cruise = 18; fuel = 100; score = 0; overtakes = 0; cars = []; slicks = []; fx = []; exhT = 0; spawnT = 0; slickT = 6; slip = 0; crash = 0; crashAng = 0; inv = 0; shake = 0; dead = ''; lowBeepT = 0; lastSec = -1; secLabel = ''; secLabelT = 0; boostT = 0; boostMult = 1; fuelFlash = 0; stealAmt = 0; sections = []; ensureSections(400); carX = curve(0); vx = 0; RE.reset(); }
    function startGame() { reset(); state = ST.play; last = performance.now(); setOver(false); Audio.jingle(); }

    const puff = (x, y) => fx.push({ x, y, r: 2, gr: 14, vx: rand(-8, 8), vy: rand(18, 34), life: rand(0.35, 0.6), k: 'p' });
    const smoke = (x, y, n) => { for (let i = 0; i < n; i++) fx.push({ x, y, r: 3, gr: 16, vx: rand(-26, 26), vy: rand(-14, 16), life: rand(0.4, 0.8), k: 'p' }); };
    const debris = (x, y) => { for (let i = 0; i < 9; i++) fx.push({ x, y, r: 2, gr: 0, vx: rand(-110, 110), vy: rand(-140, 10), life: rand(0.4, 0.9), k: 'd' }); };

    const held = { L: false, R: false, G: false };
    const addVeh = (d, lane) => { const ty = pickType(), s = VEH[ty]; cars.push({ d, lane, v: rand(s.v[0], s.v[1]), w: s.w, h: s.h, type: ty }); };
    function spawn() { const ahead = dist + 108, tp = pAt(ahead).type; const spread = tp === 'highway' ? 0.72 : tp === 'bridge' ? 0.30 : 0.62; let two = tp === 'highway' ? Math.random() < 0.4 : (dist > 900 && Math.random() < Math.min(0.2, dist / 9000)); if (tp === 'bridge') two = false; const L = [-spread, 0, spread].sort(() => Math.random() - 0.5); addVeh(ahead, L[0] * rand(0.85, 1)); if (two) addVeh(ahead + rand(14, 30), L[1] * rand(0.85, 1)); }

    let last = performance.now();
    function update(dt) {
      ensureSections(dist + 170);
      if (state !== ST.play) return;
      const cs = curSection(); if (cs.start !== lastSec) { lastSec = cs.start; secLabel = cs.type.toUpperCase(); secLabelT = 1.6; Audio.beep(660, 0.08, 0.05); } if (secLabelT > 0) secLabelT -= dt;
      if (boostT > 0) boostT -= dt; const bm = boostT > 0 ? boostMult : 1;
      cruise = 18 + Math.min(16, dist / 250); const top = cruise + 24;
      if (crash > 0) { crash -= dt; crashAng += dt * 16; speed = Math.max(6, speed - 40 * dt); if (crash <= 0) { inv = 1.0; crashAng = 0; } }
      else { const target = (held.G ? top : cruise) * bm; speed += (target - speed) * Math.min(1, dt * 1.1); }
      const cxP = curve(dist), hwP = halfW(dist), off = carX < cxP - hwP + 4 || carX > cxP + hwP - 4;
      if (off && crash <= 0) { speed *= Math.pow(0.18, dt); if (!reduce) { shake = Math.max(shake, 2.2); if (Math.random() < dt * 20) smoke(carX + rand(-6, 6), PY + PCH / 2, 1); } }
      if ((carX < cxP - hwP - 18 || carX > cxP + hwP + 18) && speed > 16 && crash <= 0 && inv <= 0) doCrash('OFF ROAD', 14);
      dist += speed * dt;
      slip -= dt; const grip = slip > 0 ? 0.08 : 1, acc = 240;
      if (crash <= 0) { if (held.L) vx -= acc * dt * grip; if (held.R) vx += acc * dt * grip; if (!held.L && !held.R) vx *= Math.pow(0.02, dt * grip); if (grip < 1) { vx += rand(-30, 30) * dt; if (Math.random() < dt * 24) smoke(carX + rand(-7, 7), PY + PCH / 2, 1); } vx = clamp(vx, -220, 220); } else vx *= Math.pow(0.1, dt);
      carX = clamp(carX + vx * dt, 14, W - 14);
      fuel -= (0.9 + speed * 0.05) * dt;
      if (RE.refueling(dist) && !off) fuel = Math.min(100, fuel + 30 * dt);
      if (fuel < 25 && state === ST.play) { lowBeepT -= dt; if (lowBeepT <= 0) { Audio.beep(1500, 0.05, 0.05); lowBeepT = 0.55; } }
      if (fuel <= 0) { fuel = 0; gameOver('OUT OF FUEL'); }
      RE.update(dt);
      if (boostT > 0 && Math.random() < dt * 9) RE.emitHearts(carX, PY, 1);
      if (crash <= 0) { exhT -= dt; if (exhT <= 0) { puff(carX + rand(-3, 3), PY + PCH / 2 + 3); exhT = held.G ? 0.045 : 0.1; } }
      for (const p of fx) { p.x += p.vx * dt; p.y += p.vy * dt; if (p.k === 'd') p.vy += 220 * dt; else { p.r += p.gr * dt; p.vy *= Math.pow(0.5, dt); } p.life -= dt; }
      if (fx.length > 80) fx.splice(0, fx.length - 80); fx = fx.filter((p) => p.life > 0);
      for (const c of cars) { c.d += c.v * dt; const sy = PY - (c.d - dist) * PXPERM, sx = curve(c.d) + c.lane * halfW(c.d); if (!c.passed && sy > PY + c.h) { c.passed = true; overtakes++; score += 5; } if (crash <= 0 && inv <= 0 && Math.abs(sx - carX) < (PCW + c.w) / 2 * 0.8 && Math.abs(sy - PY) < (PCH + c.h) / 2 * 0.78) doCrash('CRASH', 12 + Math.round(c.h * 0.1)); }
      cars = cars.filter((c) => (PY - (c.d - dist) * PXPERM) < H + c.h && (c.d - dist) < 150);
      slickT -= dt; if (slickT <= 0) { slicks.push({ d: dist + 108, lane: rand(-0.5, 0.5) }); slickT = rand(4, 8); }
      for (const s of slicks) { const sy = PY - (s.d - dist) * PXPERM, sx = curve(s.d) + s.lane * halfW(s.d); if (Math.abs(sx - carX) < 26 && Math.abs(sy - PY) < 24 && crash <= 0 && slip <= 0) slip = 0.55; }
      slicks = slicks.filter((s) => (PY - (s.d - dist) * PXPERM) < H + 30 && (s.d - dist) < 150);
      spawnT += dt; const gap = Math.max(0.78, 1.6 - dist / 6000); if (spawnT >= gap) { spawnT = 0; spawn(); }
      if (inv > 0) inv -= dt; if (shake > 0) shake = Math.max(0, shake - dt * 30); if (fuelFlash > 0) fuelFlash -= dt;
      score = Math.max(score, Math.floor(dist) + overtakes * 5);
    }
    function doCrash(r, steal) { steal = steal || 14; crash = 0.85; speed = Math.max(6, speed * 0.22); vx = 0; fuel -= steal; stealAmt = steal; fuelFlash = 0.55; if (!reduce) { shake = 10; debris(carX, PY); smoke(carX, PY - 6, 5); } Audio.crash(); if (fuel <= 0) { fuel = 0; gameOver(r); } }

    const rr = (x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
    const fillR = (x, y, w, h, r) => { rr(x, y, w, h, r); ctx.fill(); };
    function drawVehicle(cx, cy, w, h, solid, type, ang, tex) {
      ctx.save(); ctx.translate(cx, cy); if (ang) ctx.rotate(ang);
      const body = tex ? TEX.d50 : solid; ctx.fillStyle = body; fillR(-w / 2, -h / 2, w, h, 7); ctx.fillStyle = FIELD; fillR(-w / 2 + 3, -h / 2 + 4, w - 6, h - 8, 5); ctx.fillStyle = body;
      if (type !== 'tractor') { fillR(-w / 2 - 2, -h / 2 + 9, 4, 11, 2); fillR(w / 2 - 2, -h / 2 + 9, 4, 11, 2); fillR(-w / 2 - 2, h / 2 - 19, 4, 11, 2); fillR(w / 2 - 2, h / 2 - 19, 4, 11, 2); }
      if (type === 'bus') { for (let i = 0; i < 4; i++) fillR(-w / 2 + 6, -h / 2 + 9 + i * ((h - 22) / 4), w - 12, 5, 2); }
      else if (type === 'truck') { fillR(-w / 2 + 6, -h / 2 + 7, w - 12, 12, 3); ctx.fillStyle = DIM; ctx.fillRect(-w / 2 + 4, -h / 2 + 22, w - 8, 2); ctx.fillStyle = body; fillR(-w / 2 + 6, -h / 2 + 28, w - 12, h - 40, 3); }
      else if (type === 'tractor') { fillR(-w / 2 + 7, -h / 2 + 8, w - 14, 12, 3); fillR(-w / 2 - 3, h / 2 - 24, 6, 20, 2); fillR(w / 2 - 3, h / 2 - 24, 6, 20, 2); fillR(-w / 2, -h / 2 + 11, 3, 8, 1); fillR(w / 2 - 3, -h / 2 + 11, 3, 8, 1); fillR(-w / 2 + 9, -h / 2 + 1, 3, 5, 1); }
      else { fillR(-w / 2 + 6, -h / 2 + 7, w - 12, 9, 3); fillR(-w / 2 + 6, h / 2 - 15, w - 12, 8, 3); }
      if (!tex) { ctx.globalAlpha = 0.5; ctx.fillStyle = TEX.d25; fillR(-w / 2 + 3, -h / 2 + 4, (w - 6) / 2, h - 8, 5); ctx.globalAlpha = 1; }
      ctx.restore();
    }
    function drawFx() { for (const p of fx) { if (p.k === 'd') { ctx.globalAlpha = Math.min(1, p.life * 1.5); ctx.fillStyle = ON; ctx.fillRect(p.x - 1, p.y - 1, 3, 3); } else { ctx.globalAlpha = Math.min(0.8, p.life * 1.4); ctx.fillStyle = p.r > 4 ? TEX.d25 : TEX.d50; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); } } ctx.globalAlpha = 1; }
    const SEG = { 0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1], 3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1], 6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1], 9: [1, 1, 1, 1, 0, 1, 1] };
    function sevenSeg(str, rightX, y) { const dw = 13, dh = 22, tk = 3, gap = 5; let x = rightX - (dw + gap) * str.length + gap; for (const ch of str) { const s = SEG[ch] || [0, 0, 0, 0, 0, 0, 0]; const g = (on, a, b, w, h) => { ctx.fillStyle = on ? ON : DIM; ctx.globalAlpha = on ? 1 : 0.45; rr(a, b, w, h, tk / 2); ctx.fill(); ctx.globalAlpha = 1; }; g(s[0], x + tk, y, dw - 2 * tk, tk); g(s[1], x + dw - tk, y + tk, tk, dh / 2 - tk); g(s[2], x + dw - tk, y + dh / 2, tk, dh / 2 - tk); g(s[3], x + tk, y + dh - tk, dw - 2 * tk, tk); g(s[4], x, y + dh / 2, tk, dh / 2 - tk); g(s[5], x, y + tk, tk, dh / 2 - tk); g(s[6], x + tk, y + dh / 2 - tk / 2, dw - 2 * tk, tk); x += dw + gap; } }

    function render() {
      const sx = shake ? (Math.random() - 0.5) * shake : 0, sy = shake ? (Math.random() - 0.5) * shake : 0; ctx.save(); ctx.translate(sx, sy);
      ctx.fillStyle = SHOULDER; ctx.fillRect(-12, -12, W + 24, H + 24); ctx.fillStyle = TEX.grass; ctx.fillRect(-12, -12, W + 24, H + 24);
      for (const s of sections) { const yT = clamp(screenY(s.end), 0, H), yB = clamp(screenY(s.start), 0, H); if (yB <= yT) continue; if (s.type === 'bridge') { ctx.fillStyle = VOID; ctx.fillRect(0, yT, W, yB - yT); ctx.fillStyle = (Math.floor(performance.now() / 350) % 2) ? TEX.water : TEX.water2; ctx.fillRect(0, yT, W, yB - yT); } else if (s.type === 'tunnel') { ctx.fillStyle = WALL; ctx.fillRect(0, yT, W, yB - yT); ctx.fillStyle = TEX.brick; ctx.fillRect(0, yT, W, yB - yT); } }
      for (let y = 0; y < H; y += 2) { const wy = worldY(dist, y), p = pAt(wy), cx = midX + weave(wy) * p.amp, hw = p.w + 6 * Math.sin(wy * 0.02); ctx.fillStyle = ROAD; ctx.fillRect(cx - hw, y, hw * 2, 2); ctx.fillStyle = DIM; ctx.fillRect(cx - hw - 3, y, 3, 2); ctx.fillRect(cx + hw, y, 3, 2); if (((wy * PXPERM) % 34) < 17) { ctx.fillStyle = MID; ctx.fillRect(cx - 2, y, 4, 2); } }
      for (const s of sections) { const yT = clamp(screenY(s.end), 0, H), yB = clamp(screenY(s.start), 0, H); if (yB <= yT) continue; if (s.type === 'bridge') { ctx.fillStyle = MID; for (let y = yT; y < yB; y += 15) { const wy = worldY(dist, y); if (wy < s.start || wy >= s.end) continue; const cx = curve(wy), hw = halfW(wy); ctx.fillRect(cx - hw - 5, y, 4, 11); ctx.fillRect(cx + hw + 1, y, 4, 11); } } else if (s.type === 'highway') { ctx.fillStyle = MID; for (let y = yT; y < yB; y += 3) { const wy = worldY(dist, y); if (wy < s.start || wy >= s.end) continue; const cx = curve(wy), hw = halfW(wy); ctx.fillRect(cx - hw - 6, y, 2, 3); ctx.fillRect(cx + hw + 4, y, 2, 3); } } else if (s.type === 'tunnel') { const f0 = Math.ceil(s.start / 14) * 14; for (let d = f0; d < s.end; d += 14) { const y = screenY(d); if (y < yT || y > yB) continue; const cx = curve(d), hw = halfW(d); ctx.globalAlpha = 0.7; ctx.fillStyle = ON; ctx.fillRect(cx - hw, y - 1, hw * 2, 3); ctx.globalAlpha = 1; } } }
      RE.renderRoad(ctx);
      for (const s of slicks) { const yy = screenY(s.d), xx = curve(s.d) + s.lane * halfW(s.d); ctx.globalAlpha = 0.6; ctx.fillStyle = VOID; ctx.beginPath(); ctx.ellipse(xx, yy, 24, 15, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 0.5; ctx.fillStyle = TEX.d25; ctx.beginPath(); ctx.ellipse(xx, yy, 24, 15, 0, 0, 7); ctx.fill(); ctx.globalAlpha = 1; }
      if (state !== ST.menu) {
        drawFx();
        for (const c of cars) { const yy = screenY(c.d), xx = curve(c.d) + c.lane * halfW(c.d); if (yy > -c.h && yy < H + c.h) drawVehicle(xx, yy, c.w, c.h, MID, c.type, 0, true); }
        const hide = inv > 0 && Math.floor(inv * 12) % 2 === 0; if (!hide) { if (boostT > 0) { ctx.globalAlpha = 0.6; ctx.fillStyle = TEX.d50; ctx.fillRect(carX - 3, PY + PCH / 2, 6, 20 + Math.random() * 16); ctx.globalAlpha = 1; } drawVehicle(carX, PY, PCW, PCH, ON, 'car', crash > 0 ? crashAng : 0, false); }
        RE.render(ctx);
      }
      ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(0, 0, W, TOP); ctx.fillStyle = DIM; ctx.fillRect(0, TOP - 2, W, 2);
      ctx.fillStyle = fuelFlash > 0 ? ON : LOWMID; ctx.font = '700 9px ui-monospace,Menlo,monospace'; ctx.textAlign = 'left'; ctx.fillText(boostT > 0 ? 'FUEL  x2!' : 'FUEL', 12, 16);
      ctx.strokeStyle = fuelFlash > 0 ? ON : DIM; ctx.lineWidth = 1; ctx.strokeRect(12, 21, 120, 12); const flick = fuelFlash > 0 && Math.floor(performance.now() / 60) % 2; const low = fuel < 25 && Math.floor(performance.now() / 200) % 2; ctx.fillStyle = (low || flick) ? MID : ON; ctx.fillRect(13, 22, 118 * (fuel / 100), 10);
      if (fuelFlash > 0) { ctx.fillStyle = ON; ctx.font = '700 11px ui-monospace,Menlo,monospace'; ctx.fillText('-' + stealAmt, 137, 31); }
      sevenSeg(String(Math.floor(score)).padStart(5, '0'), W - 12, 12);
      ctx.fillStyle = LOWMID; ctx.font = '600 9px ui-monospace,Menlo,monospace'; ctx.textAlign = 'right'; ctx.fillText('HI ' + String(Math.max(hi, bestRef.current)).padStart(5, '0'), W - 12, 50); ctx.fillText(Math.round(speed * 3.6) + ' KM/H', 132, 31); ctx.textAlign = 'left';
      if (secLabelT > 0) { ctx.save(); ctx.globalAlpha = clamp(secLabelT, 0, 1); ctx.textAlign = 'center'; ctx.fillStyle = ON; ctx.font = '700 17px ui-monospace,Menlo,monospace'; ctx.fillText(secLabel, W / 2, TOP + 34); ctx.restore(); ctx.textAlign = 'left'; }
      ctx.restore();
      if (state === ST.menu) titleScreen();
      else if (state === ST.over) overlay(dead || 'GAME OVER', 'SCORE ' + Math.floor(score), 'TAP TO RACE AGAIN');
    }
    function titleScreen() {
      ctx.fillStyle = 'rgba(12,8,4,.72)'; ctx.fillRect(0, 0, W, H);
      const tt = performance.now(), cx = W / 2, cy = H / 2 - 70, R = 22, pop = reduce ? 1 : 1 + 0.05 * Math.sin(tt / 300);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(pop, pop);
      ctx.fillStyle = ON; ctx.beginPath(); ctx.arc(0, 0, R, 0, 6.283); ctx.fill(); ctx.fillStyle = FIELD; ctx.fillRect(-R - 1, -R * 0.12, R * 2 + 2, R * 0.24);   // seam-dot brand mark (KEPT)
      ctx.globalAlpha = 0.5; ctx.fillStyle = TEX.d25; ctx.beginPath(); ctx.arc(0, 0, R + 6 + (reduce ? 0 : Math.sin(tt / 240) * 3), 0, 6.283); ctx.arc(0, 0, R + 1, 0, 6.283, true); ctx.fill('evenodd'); ctx.globalAlpha = 1;
      ctx.restore();
      ctx.textAlign = 'center'; const p = reduce ? 1 : 0.85 + 0.15 * Math.sin(tt / 420); ctx.globalAlpha = p; ctx.fillStyle = ON; ctx.font = '700 30px ui-monospace,Menlo,monospace'; ctx.fillText('READ WARRIOR', W / 2, H / 2 - 6); ctx.globalAlpha = 1;
      ctx.fillStyle = MID; ctx.font = '600 13px ui-monospace,Menlo,monospace'; ctx.fillText('TAP TO START', W / 2, H / 2 + 26);
      ctx.fillStyle = LOWMID; ctx.font = '500 11px ui-monospace,Menlo,monospace'; ctx.fillText('steer · GAS · grab fuel', W / 2, H / 2 + 50); ctx.textAlign = 'left';
    }
    function overlay(tt, s, h) { ctx.fillStyle = 'rgba(12,8,4,.78)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; const p = reduce ? 1 : 0.82 + 0.18 * Math.sin(performance.now() / 420); ctx.globalAlpha = p; ctx.fillStyle = ON; ctx.font = '700 28px ui-monospace,Menlo,monospace'; ctx.fillText(tt, W / 2, H / 2 - 26); ctx.globalAlpha = 1; ctx.fillStyle = MID; ctx.font = '600 16px ui-monospace,Menlo,monospace'; ctx.fillText(s, W / 2, H / 2 + 6); ctx.fillStyle = LOWMID; ctx.font = '500 11px ui-monospace,Menlo,monospace'; ctx.fillText(h, W / 2, H / 2 + 38); ctx.textAlign = 'left'; }

    let raf;
    function frame(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); Audio.frame(state === ST.play && crash <= 0, speed); raf = requestAnimationFrame(frame); }
    reset(); raf = requestAnimationFrame(frame);

    // API the React shell drives.
    apiRef.current = {
      startOrAdvance: () => { Audio.ensure(); if (state !== ST.play) startGame(); },
      pressGet: () => held,
      setSound: (v) => Audio.setOn(v),
      setBest: (b) => { hi = Math.max(hi, b); },
      getState: () => (state === ST.play ? 'play' : state === ST.over ? 'over' : 'menu'),
      getScore: () => Math.floor(score),
      forceScore: (n) => { score = Math.max(0, Math.min(9999, n | 0)); },
      gameOver: () => gameOver('TEST'),
    };
    // emulator test hook
    if (window.__pbtest) window.__pbWarriorTest = { state: () => apiRef.current.getState(), forceScore: (n) => apiRef.current.forceScore(n), gameOver: () => apiRef.current.gameOver() };

    return () => { cancelAnimationFrame(raf); try { if (Audio.ctx) Audio.ctx.close(); } catch {} try { delete window.__pbWarriorTest; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // keyboard (desktop)
  useEffect(() => {
    const km = { ArrowLeft: 'L', a: 'L', A: 'L', ArrowRight: 'R', d: 'R', D: 'R', ArrowUp: 'G', w: 'G', W: 'G', ' ': 'G' };
    const down = (e) => { const k = km[e.key]; if (!k) return; e.preventDefault(); const api = apiRef.current; if (!api) return; if (api.getState() !== 'play') { api.startOrAdvance(); return; } api.pressGet()[k] = true; };
    const up = (e) => { const k = km[e.key]; if (k && apiRef.current) apiRef.current.pressGet()[k] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  const holdBtn = (key) => ({
    onPointerDown: (e) => { e.preventDefault(); const api = apiRef.current; if (!api) return; if (api.getState() !== 'play') { api.startOrAdvance(); return; } api.pressGet()[key] = true; },
    onPointerUp: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
    onPointerLeave: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
    onPointerCancel: () => { if (apiRef.current) apiRef.current.pressGet()[key] = false; },
  });

  const toggleSound = () => { const v = !soundOn; setSoundOn(v); apiRef.current?.setSound(v); };
  const bumpInitial = (idx, dir) => { setInitials((cur) => { const arr = cur.split(''); let code = arr[idx].charCodeAt(0) - 65 + dir; code = ((code % 26) + 26) % 26; arr[idx] = String.fromCharCode(65 + code); return arr.join(''); }); };
  const submitScore = async () => { if (submitted) return; setSubmitted(true); try { await ds.submitReadWarriorScore(uid, { initials, score: pbScore }); bestRef.current = Math.max(bestRef.current, pbScore); apiRef.current?.setBest(bestRef.current); } catch {} };

  const showInitials = over && pbScore > 0 && !!uid && !submitted;

  return (
    <div data-testid="read-warrior"
      style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: ON, overflow: 'hidden', ...NO_SELECT, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Chrome bar — brand mark KEPT (faithful render) + back + sound */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('read_warrior_back') || 'Back'} data-testid="read-warrior-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="15" height="15" viewBox="0 0 100 100" aria-hidden style={{ display: 'block' }}>
            <defs><radialGradient id="rwmark" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fbbf24" /><stop offset=".5" stopColor={COLORS.accent} /><stop offset=".8" stopColor="#d97706" /><stop offset="1" stopColor="#b45309" /></radialGradient></defs>
            <circle cx="50" cy="50" r="44" fill="url(#rwmark)" /><rect x="0" y="44.5" width="100" height="11" fill={COLORS.surface} />
          </svg>
          <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 700, letterSpacing: 1, color: COLORS.textDim }}>READ&nbsp;WARRIOR</span>
        </span>
        <div role="button" aria-label={t('read_warrior_sound') || 'Sound'} data-testid="read-warrior-sound" onClick={toggleSound}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: soundOn ? ON : COLORS.textMuted }}>
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </div>
      </div>

      {/* LCD (letterbox 9:16) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 380, flex: '0 1 auto', padding: `0 ${SPACE.md}px`, display: 'flex', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', maxHeight: '62vh', aspectRatio: '9 / 16', borderRadius: RADIUS.lg, overflow: 'hidden', background: FIELD, boxShadow: 'inset 0 0 0 2px #000, inset 0 0 24px rgba(0,0,0,.5)' }}>
          <canvas ref={canvasRef} data-testid="read-warrior-canvas"
            onPointerDown={(e) => { e.preventDefault(); apiRef.current?.startOrAdvance(); }}
            style={{ display: 'block', width: '100%', height: '100%', imageRendering: 'pixelated', touchAction: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 50% 35%, transparent 55%, rgba(0,0,0,.5) 100%)' }} />
          {showInitials && (
            <div data-testid="read-warrior-initials" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, background: `${COLORS.bg}e8`, padding: SPACE.lg, boxSizing: 'border-box' }}>
              <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: ON, letterSpacing: 1 }}>{t('read_warrior_enter_initials') || 'NEW BEST — ENTER INITIALS'}</div>
              <div style={{ display: 'flex', gap: SPACE.md }}>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <button type="button" aria-label={`up-${idx}`} data-testid={`read-warrior-initial-up-${idx}`} onClick={() => bumpInitial(idx, 1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                    <span style={{ fontSize: 30, fontWeight: 900, color: ON, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                    <button type="button" aria-label={`down-${idx}`} data-testid={`read-warrior-initial-down-${idx}`} onClick={() => bumpInitial(idx, -1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
                  </div>
                ))}
              </div>
              <button type="button" data-testid="read-warrior-submit" onClick={submitScore}
                style={{ marginTop: SPACE.sm, padding: '12px 28px', minHeight: TOUCH.minTarget, background: ON, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer' }}>
                {t('read_warrior_save') || 'SAVE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div style={{ width: '100%', maxWidth: 380, display: 'flex', gap: SPACE.sm, padding: SPACE.md, boxSizing: 'border-box' }}>
        <button type="button" data-testid="read-warrior-left" aria-label={t('read_warrior_left') || 'Left'} {...holdBtn('L')} style={ctrlBtn(1)}>◀</button>
        <button type="button" data-testid="read-warrior-right" aria-label={t('read_warrior_right') || 'Right'} {...holdBtn('R')} style={ctrlBtn(1)}>▶</button>
        <button type="button" data-testid="read-warrior-gas" aria-label={t('read_warrior_gas') || 'Gas'} {...holdBtn('G')} style={{ ...ctrlBtn(1.6), fontSize: FONT_SIZE.base, letterSpacing: 2 }}>{t('read_warrior_gas') || 'GAS'}</button>
      </div>
    </div>
  );
}

const ctrlBtn = (flex) => ({ ...ARCADE_BTN, flex, height: 64, fontSize: 24, fontWeight: 700 });
const iniBtn = { ...ARCADE_BTN, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, borderRadius: RADIUS.md };
