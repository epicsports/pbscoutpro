// Readbert — 7th Arcade game (Q*bert-style cube-hopper) in Reads amber-phosphor,
// ported 1:1 from docs/prototypes/readbert.html. Single <canvas> (isometric cube
// pyramid + Readbert + redballs/coily/discs + procedural audio + dither tiles +
// seven-seg). DOM chrome = back + brand title + sound + 4 diagonal tap controls.
// HUD (lives glyphs / LEVEL / score) is drawn ON the canvas. Leaderboard board
// `leaderboards/readbert` (shared {board} rule — no rules change). Lazy own chunk
// (/break/readbert). Reuses ArcadeButton style tokens.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

const W = 400, H = 600;
const AMBER = '#f59e0b', AMBER4 = '#fbbf24', DIM = '#b47708', DARK = '#0a0e17', MUTED = '#64748b';
const ROWS = 7;

export default function ReadbertPage() {
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
    try { const top = await ds.getReadbertTop(1); best = top[0]?.score || 0; } catch {}
    if (uid) { try { const mine = await ds.getReadbertMyScore(uid); best = Math.max(best, mine?.score || 0); } catch {} }
    bestRef.current = best; if (apiRef.current) apiRef.current.setBest(best);
  }, [uid]);
  useEffect(() => { loadBest(); }, [loadBest]);

  // iOS hardening: block document scroll/bounce while mounted.
  useEffect(() => { const block = (e) => e.preventDefault(); document.addEventListener('touchmove', block, { passive: false }); return () => document.removeEventListener('touchmove', block); }, []);

  // ── game setup (canvas + RAF), ported from the prototype ───────────────────
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2); cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // fixed-resolution geometry (canvas internal W/H; CSS letterboxes it)
    const cw = Math.min(Math.floor(W / 8.6), 64), ch = Math.round(cw / 2), sh = Math.round(cw * 0.5);
    const vstep = sh + ch / 2, pyH = (ROWS - 1) * vstep + ch + sh, cx = Math.round(W / 2), topY = Math.max(96, Math.round((H - pyH) / 2 - 24));

    // dither tiles (screen-anchored)
    const mkTile = (dots, r) => { const tl = document.createElement('canvas'); tl.width = tl.height = 6; const x = tl.getContext('2d'); x.fillStyle = 'rgba(245,158,11,0.55)'; dots.forEach(p => { x.beginPath(); x.arc(p[0], p[1], r, 0, 7); x.fill(); }); return tl; };
    const patDense = ctx.createPattern(mkTile([[1, 1], [4, 4], [1, 4], [4, 1], [2.5, 2.5]], 0.95), 'repeat');
    const patSparse = ctx.createPattern(mkTile([[1.5, 1.5], [4.5, 4.5]], 0.9), 'repeat');

    // ── audio (procedural) ──
    const A = { ctx: null, master: null, on: true };
    const aInit = () => { if (A.ctx) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; A.ctx = new AC(); A.master = A.ctx.createGain(); A.master.gain.value = 0.26; A.master.connect(A.ctx.destination); };
    let _unlocked = false;
    const unlockAudio = () => { aInit(); if (!A.ctx) return; if (A.ctx.state === 'suspended') A.ctx.resume(); if (!_unlocked) { try { const b = A.ctx.createBuffer(1, 1, 22050), s = A.ctx.createBufferSource(); s.buffer = b; s.connect(A.ctx.destination); s.start(0); } catch {} _unlocked = true; } };
    const blip = (f, d, type = 'square', vol = 0.4, slide) => { if (!A.on || !A.ctx) return; const c = A.ctx, tt = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, tt); if (slide) o.frequency.exponentialRampToValueAtTime(slide, tt + d); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(vol, tt + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, tt + d); o.connect(g); g.connect(A.master); o.start(tt); o.stop(tt + d + 0.03); };
    const noise = (d, vol = 0.4, lp = 1200) => { if (!A.on || !A.ctx) return; const c = A.ctx, tt = c.currentTime, n = Math.floor(c.sampleRate * d), b = c.createBuffer(1, n, c.sampleRate), dd = b.getChannelData(0); for (let i = 0; i < n; i++) dd[i] = (Math.random() * 2 - 1) * (1 - i / n); const s = c.createBufferSource(); s.buffer = b; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(A.master); s.start(tt); };
    const sHop = () => blip(420, 0.13, 'square', 0.3, 200);
    const sLight = () => blip(700, 0.09, 'square', 0.26, 920);
    const sFall = () => { blip(380, 0.5, 'sawtooth', 0.32, 60); noise(0.4, 0.25, 700); };
    const sHatch = () => blip(200, 0.18, 'square', 0.3, 520);
    const sDisc = () => { [392, 523, 659, 880].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.26), i * 70)); };
    const sCoilyDie = () => blip(700, 0.6, 'sawtooth', 0.3, 80);
    const sDeath = () => { [233, 277, 220, 330, 196].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'square', 0.34), i * 110)); noise(0.5, 0.2, 800); };
    const sLevel = () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'square', 0.3), i * 90)); };
    const mNote = (f, d, type, vol) => { if (!A.on || !A.ctx) return; const c = A.ctx, tt = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, tt); g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(vol, tt + 0.02); g.gain.exponentialRampToValueAtTime(0.0008, tt + d); o.connect(g); g.connect(A.master); o.start(tt); o.stop(tt + d + 0.03); };
    const M = { acc: 0, step: 0, dur: 0.2 }, MB = { 0: 131, 4: 165, 8: 147, 12: 165 }, ML = { 0: 523, 2: 659, 4: 784, 6: 659, 8: 587, 10: 784, 12: 880, 14: 659 };
    const mTick = (dt) => { if (!A.on || !A.ctx || state === 'over') return; M.acc += dt; if (M.acc < M.dur) return; M.acc -= M.dur; const i = M.step % 16; if (MB[i]) mNote(MB[i], 0.34, 'triangle', 0.08); if (ML[i]) mNote(ML[i], 0.16, 'square', 0.055); M.step++; };

    // ── geometry ──
    const lerp = (a, b, tt) => a + (b - a) * tt;
    const topVertex = (r, c) => ({ x: cx + (2 * c - r) * (cw / 2), y: topY + r * (sh + ch / 2) });
    const topCenter = (r, c) => { const v = topVertex(r, c); return { x: v.x, y: v.y + ch / 2 }; };
    const blobPos = (r, c) => { const p = topCenter(r, c); return { x: p.x, y: p.y - ch * 0.34 }; };

    // ── state ──
    let cubes = [], qb = null, redballs = [], coily = null, discs = [];
    let score = 0, hi = bestRef.current, lives = 3, level = 1, state = 'menu', invuln = 0, curse = 0, flash = 0;
    let rbTimer = 0, coilyTimer = 0, busy = 0;

    const initBoard = () => { cubes = []; for (let r = 0; r < ROWS; r++) { const row = []; for (let c = 0; c <= r; c++) row.push({ lit: false }); cubes.push(row); } };
    const makeDiscs = () => { discs = [{ r: 2, c: -1, alive: true, side: -1 }, { r: 2, c: 3, alive: true, side: 1 }]; };
    const newActor = (r, c) => { const p = blobPos(r, c); return { r, c, x: p.x, y: p.y, hopping: false, t: 0, dur: 0.2, from: null, to: null, arc: 0, onLand: null, fall: false }; };
    const resetGame = () => { initBoard(); makeDiscs(); qb = newActor(0, 0); redballs = []; coily = null; score = 0; lives = 3; level = 1; invuln = 1.2; curse = 0; rbTimer = 3.2; coilyTimer = 4.5; busy = 0; };

    const startHop = (a, tr, tc, dur, onLand) => { a._tr = tr; a._tc = tc; a.from = { x: a.x, y: a.y }; a.to = blobPos(tr, tc); a.t = 0; a.dur = dur; a.arc = ch * 0.7; a.onLand = onLand || null; a.hopping = true; a.fall = false; };
    const startFall = (a, dur, onLand) => { a.from = { x: a.x, y: a.y }; const dir = a._dir || 'dl'; const dx = (dir === 'ul' || dir === 'dl') ? -cw : cw; a.to = { x: a.x + dx * 0.7, y: a.y + H * 0.7 }; a.t = 0; a.dur = dur; a.arc = ch * 0.5; a.onLand = onLand || null; a.hopping = true; a.fall = true; };
    const stepActor = (a, dt) => { if (!a.hopping) return; a.t += dt / a.dur; const tt = Math.min(1, a.t); a.x = lerp(a.from.x, a.to.x, tt); a.y = lerp(a.from.y, a.to.y, tt) - a.arc * Math.sin(tt * Math.PI); if (a.t >= 1) { a.hopping = false; a.x = a.to.x; a.y = a.to.y; if (!a.fall) { a.r = a._tr; a.c = a._tc; } const cb = a.onLand; a.onLand = null; if (cb) cb(); } };

    const tryHop = (dir) => { if (state !== 'play' || qb.hopping || busy > 0 || curse > 0) return; let tr = qb.r, tc = qb.c; if (dir === 'ul') { tr--; tc--; } else if (dir === 'ur') { tr--; } else if (dir === 'dl') { tr++; } else if (dir === 'dr') { tr++; tc++; } qb._dir = dir; const disc = discs.find(d => d.alive && d.r === tr && d.c === tc); if (disc) { rideDisc(disc); return; } const valid = tr >= 0 && tr < ROWS && tc >= 0 && tc <= tr; if (valid) { startHop(qb, tr, tc, 0.2, () => landCube(tr, tc)); sHop(); } else { startFall(qb, 0.34, () => death()); sFall(); } };
    const landCube = (r, c) => { if (!cubes[r][c].lit) { cubes[r][c].lit = true; score += 25; sLight(); if (allLit()) { nextLevel(); return; } } checkHit(); };
    const allLit = () => cubes.every(row => row.every(cell => cell.lit));
    const rideDisc = (disc) => { disc.alive = false; busy = 1; sDisc(); blip(300, 0.2, 'sine', 0.2, 800); if (coily && coily.phase === 'snake') { coily = null; score += 500; sCoilyDie(); coilyTimer = 3.5; } qb.from = { x: qb.x, y: qb.y }; const p = blobPos(0, 0); qb.to = { x: p.x, y: p.y }; qb.t = 0; qb.dur = 0.6; qb.arc = ch * 1.4; qb.hopping = true; qb.fall = false; qb.onLand = () => { qb.r = 0; qb.c = 0; busy = 0; }; };

    const spawnRedball = () => { if (redballs.length >= 3) return; const rb = newActor(0, 0); rb.kind = 'rb'; rb.delay = 0.2; redballs.push(rb); };
    const updateRedball = (rb, dt) => { if (rb.hopping) { stepActor(rb, dt); return; } if (rb.dead) return; rb.delay -= dt; if (rb.delay > 0) return; const tr = rb.r + 1; if (tr >= ROWS) { rb._dir = Math.random() < 0.5 ? 'dl' : 'dr'; startFall(rb, 0.3, () => { rb.dead = true; }); return; } const goRight = Math.random() < 0.5; const tc = goRight ? rb.c + 1 : rb.c; rb._dir = goRight ? 'dr' : 'dl'; startHop(rb, tr, tc, 0.22 - level * 0.004, () => { rb.delay = Math.max(0.16, 0.42 - level * 0.02); checkHit(); }); blip(160, 0.07, 'square', 0.16, 90); };
    const spawnCoily = () => { if (coily) return; coily = newActor(0, 0); coily.phase = 'egg'; coily.hops = 0; coily.delay = 0.3; sHatch(); };
    const updateCoily = (dt) => { if (!coily) return; if (coily.hopping) { stepActor(coily, dt); return; } coily.delay -= dt; if (coily.delay > 0) return; if (coily.phase === 'egg') { const tr = coily.r + 1; if (tr >= ROWS || coily.hops >= 4) { coily.phase = 'snake'; coily.delay = 0.4; sHatch(); return; } const goRight = Math.random() < 0.5; const tc = goRight ? coily.c + 1 : coily.c; coily._dir = goRight ? 'dr' : 'dl'; coily.hops++; startHop(coily, tr, tc, 0.24, () => { coily.delay = Math.max(0.3, 0.5 - level * 0.02); checkHit(); }); blip(150, 0.08, 'square', 0.18, 90); return; } let tr = coily.r, tc = coily.c, dir; if (qb.r > coily.r) { if (qb.c > coily.c) { tr++; tc++; dir = 'dr'; } else { tr++; dir = 'dl'; } } else if (qb.r < coily.r) { if (qb.c >= coily.c) { tr--; dir = 'ur'; } else { tr--; tc--; dir = 'ul'; } } else { if (qb.c > coily.c) { tr++; tc++; dir = 'dr'; } else { tr++; dir = 'dl'; } } if (!(tr >= 0 && tr < ROWS && tc >= 0 && tc <= tr)) { if (coily.r + 1 < ROWS) { tr = coily.r + 1; tc = Math.min(coily.c, tr); dir = 'dl'; } else { tr = coily.r; tc = coily.c; } } coily._dir = dir; startHop(coily, tr, tc, Math.max(0.18, 0.4 - level * 0.02), () => { coily.delay = Math.max(0.22, 0.46 - level * 0.02); checkHit(); }); blip(240, 0.08, 'sawtooth', 0.16); };

    const checkHit = () => { if (state !== 'play' || invuln > 0 || qb.hopping) return; if (coily && !coily.hopping && coily.r === qb.r && coily.c === qb.c) { death(); return; } for (const rb of redballs) { if (!rb.dead && !rb.hopping && rb.r === qb.r && rb.c === qb.c) { death(); return; } } };
    const death = () => { lives--; curse = 1.1; sDeath(); redballs = []; coily = null; coilyTimer = 3.5; rbTimer = 2.5; if (lives <= 0) { setTimeout(gameOver, 700); } else { setTimeout(() => { qb = newActor(0, 0); invuln = 1.6; curse = 0; }, 700); } };
    const nextLevel = () => { level++; sLevel(); flash = 1.2; busy = 1.2; setTimeout(() => { initBoard(); makeDiscs(); qb = newActor(0, 0); redballs = []; coily = null; invuln = 1.4; rbTimer = 2.6; coilyTimer = 4; busy = 0; }, 900); };
    const gameOver = () => { state = 'over'; hi = Math.max(hi, score); const final = score; if (final > bestRef.current && uid) { setPbScore(final); setSubmitted(false); setInitials('AAA'); } setOver(true); };

    const update = (dt) => { if (state !== 'play') return; invuln = Math.max(0, invuln - dt); curse = Math.max(0, curse - dt); flash = Math.max(0, flash - dt); if (busy > 0) busy = Math.max(0, busy - dt); stepActor(qb, dt); rbTimer -= dt; if (rbTimer <= 0 && !busy) { spawnRedball(); rbTimer = Math.max(1.4, 3.4 - level * 0.15); } coilyTimer -= dt; if (coilyTimer <= 0 && !coily && !busy) { spawnCoily(); coilyTimer = 99; } redballs.forEach(rb => updateRedball(rb, dt)); redballs = redballs.filter(rb => !rb.dead); updateCoily(dt); };

    // ── render ──
    const cubePath = (pts) => { ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.closePath(); };
    const drawCube = (r, c) => { const v = topVertex(r, c); const T = { x: v.x, y: v.y }, R = { x: v.x + cw / 2, y: v.y + ch / 2 }, B = { x: v.x, y: v.y + ch }, L = { x: v.x - cw / 2, y: v.y + ch / 2 }; const Lb = { x: L.x, y: L.y + sh }, Bb = { x: B.x, y: B.y + sh }, Rb = { x: R.x, y: R.y + sh }; cubePath([L, B, Bb, Lb]); ctx.fillStyle = '#0c1119'; ctx.fill(); ctx.fillStyle = patDense || 'rgba(245,158,11,.25)'; ctx.fill(); ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.stroke(); cubePath([B, R, Rb, Bb]); ctx.fillStyle = '#0a0e16'; ctx.fill(); ctx.fillStyle = patSparse || 'rgba(245,158,11,.16)'; ctx.fill(); ctx.strokeStyle = DIM; ctx.lineWidth = 1; ctx.stroke(); cubePath([T, R, B, L]); if (cubes[r][c].lit) { ctx.fillStyle = AMBER; ctx.fill(); ctx.strokeStyle = AMBER4; } else { ctx.fillStyle = '#11161f'; ctx.fill(); ctx.strokeStyle = DIM; } ctx.lineWidth = 1.4; ctx.stroke(); };
    const drawDisc = (d) => { if (!d.alive) return; const p = topCenter(d.r, d.c); ctx.save(); ctx.translate(p.x, p.y); ctx.fillStyle = patSparse || 'rgba(245,158,11,.2)'; ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.42, ch * 0.5, 0, 0, 6.28); ctx.fill(); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.42, ch * 0.5, 0, 0, 6.28); ctx.stroke(); ctx.beginPath(); ctx.ellipse(0, 0, cw * 0.22, ch * 0.26, 0, 0, 6.28); ctx.stroke(); ctx.restore(); };
    const drawReadbert = () => { const blink = invuln > 0 && Math.floor(invuln * 12) % 2 === 0; if (blink) return; const x = qb.x, y = qb.y, r = cw * 0.27; ctx.save(); ctx.translate(x, y); const splay = qb.hopping ? r * 0.52 : r * 0.3, legLen = qb.hopping ? r * 0.46 : r * 0.6, ly = r * 0.5; ctx.strokeStyle = AMBER; ctx.lineWidth = Math.max(2.2, r * 0.2); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.28, ly); ctx.lineTo(-splay, ly + legLen); ctx.moveTo(r * 0.28, ly); ctx.lineTo(splay, ly + legLen); ctx.stroke(); ctx.fillStyle = AMBER; ctx.beginPath(); ctx.ellipse(-splay, ly + legLen, r * 0.2, r * 0.1, 0, 0, 6.28); ctx.ellipse(splay, ly + legLen, r * 0.2, r * 0.1, 0, 0, 6.28); ctx.fill(); ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.28); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.beginPath(); ctx.ellipse(-r * 0.36, -r * 0.4, r * 0.22, r * 0.13, -0.6, 0, 6.28); ctx.fill(); const dx = (qb._dir === 'ur' || qb._dir === 'dr') ? r * 0.12 : (qb._dir === 'ul' || qb._dir === 'dl') ? -r * 0.12 : 0; ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(-r * 0.2 + dx, -r * 0.06, r * 0.11, 0, 6.28); ctx.arc(r * 0.2 + dx, -r * 0.06, r * 0.11, 0, 6.28); ctx.fill(); ctx.restore(); };
    const drawCoily = () => { if (!coily) return; const x = coily.x, y = coily.y, rad = cw * 0.24; ctx.save(); ctx.translate(x, y); if (coily.phase === 'egg') { ctx.fillStyle = AMBER4; ctx.beginPath(); ctx.ellipse(0, 0, rad * 0.7, rad, 0, 0, 6.28); ctx.fill(); ctx.strokeStyle = DARK; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-rad * 0.5, 0); ctx.lineTo(rad * 0.5, 0); ctx.stroke(); } else { ctx.fillStyle = AMBER4; ctx.beginPath(); ctx.arc(0, rad * 0.5, rad * 0.8, 0, 6.28); ctx.fill(); ctx.beginPath(); ctx.arc(0, -rad * 0.4, rad * 0.7, 0, 6.28); ctx.fill(); ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(-rad * 0.25, -rad * 0.5, rad * 0.14, 0, 6.28); ctx.arc(rad * 0.25, -rad * 0.5, rad * 0.14, 0, 6.28); ctx.fill(); ctx.strokeStyle = AMBER4; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, -rad * 0.9); ctx.lineTo(0, -rad * 1.3); ctx.stroke(); } ctx.restore(); };
    const drawBall = (rb) => { if (rb.dead) return; const rad = cw * 0.2; ctx.save(); ctx.translate(rb.x, rb.y); ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(0, 0, rad, 0, 6.28); ctx.fill(); ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(rad * 0.3, -rad * 0.3, rad * 0.28, 0, 6.28); ctx.fill(); ctx.restore(); };

    const SEG = { 0: [1, 1, 1, 1, 1, 1, 0], 1: [0, 1, 1, 0, 0, 0, 0], 2: [1, 1, 0, 1, 1, 0, 1], 3: [1, 1, 1, 1, 0, 0, 1], 4: [0, 1, 1, 0, 0, 1, 1], 5: [1, 0, 1, 1, 0, 1, 1], 6: [1, 0, 1, 1, 1, 1, 1], 7: [1, 1, 1, 0, 0, 0, 0], 8: [1, 1, 1, 1, 1, 1, 1], 9: [1, 1, 1, 1, 0, 1, 1] };
    const drawDigit = (x, y, w, h, s) => { const tk = Math.max(1.6, w * 0.16), on = AMBER, off = 'rgba(245,158,11,0.07)'; const sg = (i, a, b, c, d) => { ctx.fillStyle = s[i] ? on : off; ctx.fillRect(a, b, c, d); }; sg(0, x + tk, y, w - 2 * tk, tk); sg(1, x + w - tk, y + tk, tk, h / 2 - tk); sg(2, x + w - tk, y + h / 2, tk, h / 2 - tk); sg(3, x + tk, y + h - tk, w - 2 * tk, tk); sg(4, x, y + h / 2, tk, h / 2 - tk); sg(5, x, y + tk, tk, h / 2 - tk); sg(6, x + tk, y + h / 2 - tk / 2, w - 2 * tk, tk); };
    const drawScore = () => { const str = String(score).padStart(6, '0'), dw = 14, dh = 22, gap = 4, tot = str.length * (dw + gap) - gap; let x = W / 2 - tot / 2, y = 12; for (const c of str) { drawDigit(x, y, dw, dh, SEG[c] || SEG[0]); x += dw + gap; } };
    const drawHud = () => {
      for (let i = 0; i < Math.max(0, lives); i++) { const lx = 16 + i * 16, ly = 18; ctx.fillStyle = AMBER; ctx.beginPath(); ctx.arc(lx, ly, 5, 0, 6.28); ctx.fill(); ctx.strokeStyle = AMBER; ctx.lineWidth = 1.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(lx - 2, ly + 4); ctx.lineTo(lx - 3, ly + 9); ctx.moveTo(lx + 2, ly + 4); ctx.lineTo(lx + 3, ly + 9); ctx.stroke(); ctx.fillStyle = DARK; ctx.beginPath(); ctx.arc(lx - 1.6, ly - 1, 1.2, 0, 6.28); ctx.arc(lx + 1.6, ly - 1, 1.2, 0, 6.28); ctx.fill(); }
      ctx.textAlign = 'right'; ctx.fillStyle = MUTED; ctx.font = '800 10px Inter,sans-serif'; ctx.fillText('LEVEL', W - 14, 13); ctx.fillStyle = DIM; ctx.font = '800 13px Inter,sans-serif'; ctx.fillText(String(level), W - 14, 28); ctx.textAlign = 'left';
    };
    const titleScreen = () => { ctx.fillStyle = 'rgba(10,14,23,.8)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = '900 30px Inter,sans-serif'; ctx.fillText('READBERT', W / 2, H / 2 - 18); ctx.fillStyle = MUTED; ctx.font = '800 11px Inter,sans-serif'; ctx.fillText('READS · TAKE A BREAK', W / 2, H / 2 + 2); ctx.fillStyle = DIM; ctx.font = '700 12px Inter,sans-serif'; ctx.fillText('TAP TO START', W / 2, H / 2 + 30); ctx.textAlign = 'left'; };
    const overScreen = () => { ctx.fillStyle = 'rgba(10,14,23,.82)'; ctx.fillRect(0, 0, W, H); ctx.textAlign = 'center'; ctx.fillStyle = AMBER; ctx.font = '900 28px Inter,sans-serif'; ctx.fillText('GAME OVER', W / 2, H / 2 - 26); ctx.fillStyle = '#e2e8f0'; ctx.font = '700 14px Inter,sans-serif'; ctx.fillText('SCORE ' + score, W / 2, H / 2 + 4); ctx.fillStyle = MUTED; ctx.font = '700 11px Inter,sans-serif'; ctx.fillText('BEST ' + Math.max(hi, bestRef.current), W / 2, H / 2 + 28); ctx.fillStyle = DIM; ctx.font = '700 12px Inter,sans-serif'; ctx.fillText('TAP TO RETRY', W / 2, H / 2 + 52); ctx.textAlign = 'left'; };

    const render = () => { ctx.fillStyle = DARK; ctx.fillRect(0, 0, W, H); if (flash > 0) { ctx.fillStyle = 'rgba(245,158,11,' + (0.08 * flash) + ')'; ctx.fillRect(0, 0, W, H); } for (let r = 0; r < ROWS; r++) for (let c = 0; c <= r; c++) drawCube(r, c); discs.forEach(drawDisc); const acts = []; redballs.forEach(rb => { if (!rb.dead) acts.push({ y: rb.y, fn: () => drawBall(rb) }); }); if (coily) acts.push({ y: coily.y, fn: drawCoily }); if (qb) acts.push({ y: qb.y, fn: drawReadbert }); acts.sort((a, b) => a.y - b.y).forEach(a => a.fn()); if (curse > 0 && qb) { ctx.save(); ctx.translate(qb.x + cw * 0.3, qb.y - cw * 0.5); ctx.fillStyle = AMBER; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-4, -16, 52, 22, 5); else ctx.rect(-4, -16, 52, 22); ctx.fill(); ctx.fillStyle = DARK; ctx.font = '900 13px Inter,sans-serif'; ctx.fillText('@!#?@!', 0, 0); ctx.restore(); } drawScore(); drawHud(); if (state === 'menu') titleScreen(); else if (state === 'over') overScreen(); };

    const startGame = () => { resetGame(); state = 'play'; setOver(false); };

    let last = performance.now(), raf;
    const frame = (now) => { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); render(); mTick(dt); raf = requestAnimationFrame(frame); };
    // Seed the board (+ a parked actor) BEFORE the first render — the menu-state
    // render() draws the cube pyramid, and drawCube reads cubes[r][c]; without this
    // the first frame hit an empty `cubes` → crash (initBoard only ran on start).
    initBoard(); makeDiscs(); qb = newActor(0, 0);
    render(); raf = requestAnimationFrame(frame);

    apiRef.current = {
      startOrAdvance: () => { unlockAudio(); if (state !== 'play') startGame(); },
      tap: (dir) => { unlockAudio(); if (state !== 'play') { startGame(); return; } tryHop(dir); },
      setSound: (v) => { A.on = v; },
      setBest: (b) => { hi = Math.max(hi, b); },
      getState: () => state,
      getScore: () => score,
      forceScore: (n) => { score = Math.max(0, Math.min(9999, n | 0)); },
      gameOver: () => gameOver(),
    };
    if (window.__pbtest) window.__pbReadbertTest = { state: () => state, forceScore: (n) => apiRef.current.forceScore(n), gameOver: () => gameOver() };

    return () => { cancelAnimationFrame(raf); try { if (A.ctx) A.ctx.close(); } catch {} try { delete window.__pbReadbertTest; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  // keyboard (desktop)
  useEffect(() => {
    const km = { ArrowUp: 'ur', ArrowRight: 'dr', ArrowDown: 'dl', ArrowLeft: 'ul', q: 'ul', e: 'ur', z: 'dl', c: 'dr', Q: 'ul', E: 'ur', Z: 'dl', C: 'dr' };
    const down = (e) => { const d = km[e.key]; if (!d) return; e.preventDefault(); apiRef.current?.tap(d); };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, []);

  const tapBtn = (dir) => ({ onPointerDown: (e) => { e.preventDefault(); apiRef.current?.tap(dir); } });
  const toggleSound = () => { const v = !soundOn; setSoundOn(v); apiRef.current?.setSound(v); };
  const bumpInitial = (idx, dir) => { setInitials((cur) => { const arr = cur.split(''); let code = arr[idx].charCodeAt(0) - 65 + dir; code = ((code % 26) + 26) % 26; arr[idx] = String.fromCharCode(65 + code); return arr.join(''); }); };
  const submitScore = async () => { if (submitted) return; setSubmitted(true); try { await ds.submitReadbertScore(uid, { initials, score: pbScore }); bestRef.current = Math.max(bestRef.current, pbScore); apiRef.current?.setBest(bestRef.current); } catch {} };

  const showInitials = over && pbScore > 0 && !!uid && !submitted;

  return (
    <div data-testid="readbert"
      style={{ position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: FONT, color: AMBER, overflow: 'hidden', ...NO_SELECT, paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Chrome bar — brand mark + back + sound */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('readbert_back') || 'Back'} data-testid="readbert-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <span style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 7 }}>
          <svg width="15" height="15" viewBox="0 0 100 100" aria-hidden style={{ display: 'block' }}>
            <defs><radialGradient id="rbmark" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#fbbf24" /><stop offset=".5" stopColor={COLORS.accent} /><stop offset=".8" stopColor="#d97706" /><stop offset="1" stopColor="#b45309" /></radialGradient></defs>
            <circle cx="50" cy="50" r="44" fill="url(#rbmark)" /><rect x="0" y="44.5" width="100" height="11" fill={COLORS.surface} />
          </svg>
          <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 700, letterSpacing: 1, color: COLORS.textDim }}>READBERT</span>
        </span>
        <div role="button" aria-label={t('readbert_sound') || 'Sound'} data-testid="readbert-sound" onClick={toggleSound}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: soundOn ? AMBER : COLORS.textMuted }}>
          {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </div>
      </div>

      {/* Board (letterbox 2:3) */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 420, flex: 1, minHeight: 0, padding: `0 ${SPACE.md}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
        <div style={{ position: 'relative', maxHeight: '100%', maxWidth: '100%', height: '100%', aspectRatio: '2 / 3', borderRadius: RADIUS.lg, overflow: 'hidden', background: DARK, boxShadow: 'inset 0 0 0 2px #000, inset 0 0 24px rgba(0,0,0,.5)' }}>
          <canvas ref={canvasRef} data-testid="readbert-canvas"
            onPointerDown={(e) => { e.preventDefault(); apiRef.current?.startOrAdvance(); }}
            style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none' }} />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', mixBlendMode: 'overlay', background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px), radial-gradient(120% 80% at 50% 35%, transparent 55%, rgba(0,0,0,.5) 100%)' }} />
          {showInitials && (
            <div data-testid="readbert-initials" style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: SPACE.sm, background: `${COLORS.bg}e8`, padding: SPACE.lg, boxSizing: 'border-box' }}>
              <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: AMBER, letterSpacing: 1 }}>{t('readbert_enter_initials') || 'NEW BEST — ENTER INITIALS'}</div>
              <div style={{ display: 'flex', gap: SPACE.md }}>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                    <button type="button" aria-label={`up-${idx}`} data-testid={`readbert-initial-up-${idx}`} onClick={() => bumpInitial(idx, 1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                    <span style={{ fontSize: 30, fontWeight: 900, color: AMBER, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                    <button type="button" aria-label={`down-${idx}`} data-testid={`readbert-initial-down-${idx}`} onClick={() => bumpInitial(idx, -1)} style={iniBtn}><ChevronLeft size={18} style={{ transform: 'rotate(-90deg)' }} /></button>
                  </div>
                ))}
              </div>
              <button type="button" data-testid="readbert-submit" onClick={submitScore}
                style={{ marginTop: SPACE.sm, padding: '12px 28px', minHeight: TOUCH.minTarget, background: AMBER, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer' }}>
                {t('readbert_save') || 'SAVE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Diagonal tap controls (↖ ↗ / ↙ ↘) */}
      <div style={{ width: '100%', maxWidth: 420, display: 'flex', justifyContent: 'center', padding: SPACE.md, boxSizing: 'border-box' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 72px', gridTemplateRows: '72px 72px', gap: SPACE.sm }}>
          <button type="button" data-testid="readbert-ul" aria-label={t('readbert_up_left') || 'Up-left'} {...tapBtn('ul')} style={padBtn}>↖</button>
          <button type="button" data-testid="readbert-ur" aria-label={t('readbert_up_right') || 'Up-right'} {...tapBtn('ur')} style={padBtn}>↗</button>
          <button type="button" data-testid="readbert-dl" aria-label={t('readbert_down_left') || 'Down-left'} {...tapBtn('dl')} style={padBtn}>↙</button>
          <button type="button" data-testid="readbert-dr" aria-label={t('readbert_down_right') || 'Down-right'} {...tapBtn('dr')} style={padBtn}>↘</button>
        </div>
      </div>
    </div>
  );
}

const padBtn = { ...ARCADE_BTN, width: 72, height: 72, fontSize: 30, fontWeight: 700, borderRadius: RADIUS.lg };
const iniBtn = { ...ARCADE_BTN, minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, borderRadius: RADIUS.md };
