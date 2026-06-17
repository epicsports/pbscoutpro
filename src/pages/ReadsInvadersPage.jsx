// Reads Invaders — 3rd Arcade game (§120). Space-invaders-style shooter ported
// from the approved prototype `docs/prototypes/reads_invaders.html`. Render split
// (Architecture B): the play-field is a single <canvas> (24 marching sprites +
// bullets + auto-fire churn too many SVG nodes), all chrome/HUD/overlays are
// DOM+SVG byte-for-byte the Reads Mini/Snake treatment. Leaderboard §120
// (`leaderboards/readsInvaders`, shared {board} rule — no rules change). SFX +
// 1-bit music. Lazy own chunk (App.jsx /break/invaders).
//
// HARD RULE (Jacek): NO Reads dot+seam brand mark anywhere IN-GAME — it distorts
// when pixelated. Text wordmark only ("READS INVADERS" / "Invaders"). The menu
// tile glyph (TakeABreakPage) is chrome and exempt.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Music } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

// ── LCD palette — named constants from theme (no scattered hex) ─────────────
const AMBER = COLORS.accent;          // #f59e0b
const AMBER_DIM = COLORS.accentDim;   // #b47708 — paint-drip bombs
const LCD_GLASS = COLORS.surfaceBar;  // #0d1117 — the warm LCD glass field
const GHOST = `${COLORS.accent}14`;   // ~8% — faint home-cell rings
const SEG_DIM = `${COLORS.accent}1f`; // ~12% — ghost 7-seg
const AMBER_RGB = '245, 158, 11';     // COLORS.accent channels — for canvas strokes needing a live alpha
const amberA = (a) => `rgba(${AMBER_RGB}, ${a})`;

// ── play-field geometry + tuning (prototype constants ARE the spec) ─────────
const W = 240, H = 220, COLS = 6, ROWS = 4, PX = 2;
const POINTS = [30, 20, 20, 10];
const PLAYER_Y = H - 18;
const AUTOFIRE_MS = 360, STEER_GAIN = 1.35, CAP = 9999;
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── sprites (amber pixels; '#' lit, '=' cut, '-' empty; 2-frame march) ──────
const MASK = [[
  '--#######--', '-#########-', '##-------##', '#=========#',
  '#=========#', '-#-#-#-#-#-', '#-#-----#-#',
], [
  '--#######--', '-#########-', '##-------##', '#=========#',
  '#=========#', '-#-#-#-#-#-', '-#-#---#-#-',
]];
const HOPPER = [[
  '---#####---', '--#######--', '-#-#####-#-', '#=========#',
  '#=#######=#', '-#########-', '#-#-----#-#',
], [
  '---#####---', '--#######--', '-#-#####-#-', '#=========#',
  '#=#######=#', '-#########-', '-#-#---#-#-',
]];
const BLOB = [[
  '--#-----#--', '---#---#---', '--#######--', '-##=###=##-',
  '-#########-', '--##-#-##--', '-#-#---#-#-',
], [
  '--#-----#--', '#--#---#--#', '#-#######-#', '###=###=###',
  '###########', '--##-#-##--', '--#-#-#-#--',
]];
const PLAYER = [
  '-----#-----', '----###----', '---#####---', '--#######--',
  '-#########-', '###########', '##-#####-##', '#---------#',
];
const MARKER = [
  '--#####-----', '-#######--#-', '############', '-#-#-#-#-#--',
];
const ROW_SPRITE = [MASK, HOPPER, HOPPER, BLOB];

const spriteW = (s) => (s[0] ? s[0].length : 0) * PX;
const spriteH = (s) => s.length * PX;
function drawSprite(ctx, s, x, y, color) {
  ctx.fillStyle = color;
  for (let r = 0; r < s.length; r++) {
    const row = s[r];
    for (let c = 0; c < row.length; c++) if (row[c] === '#') ctx.fillRect(x + c * PX, y + r * PX, PX, PX);
  }
}

// ── audio: procedural SFX + 1-bit music (no assets), iOS-safe ───────────────
function makeAudio() {
  let ctx = null;
  let sfxOn = true;
  const ensure = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    // iOS WebAudio unlock — one silent buffer inside the first gesture.
    if (ctx && !ctx.__pbUnlocked) { ctx.__pbUnlocked = true; try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch {} }
    return ctx;
  };
  const beep = (freq, dur, type = 'square', gain = 0.05) => {
    if (!sfxOn) return; const a = ensure(); if (!a) return;
    const o = a.createOscillator(); const g = a.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
  };
  const noise = (dur, gain = 0.08) => {
    if (!sfxOn) return; const a = ensure(); if (!a) return;
    const n = a.sampleRate * dur; const buf = a.createBuffer(1, n, a.sampleRate); const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource(); const g = a.createGain(); src.buffer = buf; g.gain.value = gain;
    src.connect(g).connect(a.destination); src.start();
  };
  // 1-bit music: ONE square channel, arpeggiated Am-F-G-E.
  const PAT = [110, 220, 262, 330, 87, 220, 262, 349, 98, 247, 294, 392, 82, 208, 247, 330];
  const STEP = 150; let timer = null; let mi = 0;
  const mtick = () => {
    const a = ensure(); if (!a) return; const f = PAT[mi++ % PAT.length]; if (!f) return;
    const o = a.createOscillator(); const g = a.createGain(); o.type = 'square'; o.frequency.value = f;
    g.gain.value = 0.03; g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + STEP / 1000 * 0.9);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + STEP / 1000);
  };
  return {
    ensure,
    sfx: {
      shoot: () => beep(880, 0.05, 'square', 0.04),
      hit: () => beep(520, 0.07, 'square', 0.05),
      boom: () => noise(0.18, 0.07),
      ufo: () => beep(1200, 0.10, 'sawtooth', 0.05),
      step: (lo) => beep(lo ? 70 : 96, 0.06, 'square', 0.05),
    },
    setSfx(on) { sfxOn = on; },
    musicStart() { if (timer) return; mi = 0; ensure(); mtick(); timer = setInterval(mtick, STEP); },
    musicStop() { if (timer) { clearInterval(timer); timer = null; } },
    dispose() { try { if (timer) clearInterval(timer); } catch {} try { if (ctx) ctx.close(); } catch {} },
  };
}

// ── 7-seg (same renderer as Reads Mini/Snake §117.A) ────────────────────────
const SEG = { a: [4, 0, 12, 4], b: [16, 4, 4, 12], c: [16, 20, 4, 12], d: [4, 32, 12, 4], e: [0, 20, 4, 12], f: [0, 4, 4, 12], g: [4, 16, 12, 4] };
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgcde', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function Digit({ n }) {
  const on = SEG7[n] || '';
  return (
    <svg width="20" height="36" viewBox="0 0 20 36" style={{ display: 'block' }} aria-hidden>
      {Object.entries(SEG).map(([k, [x, y, w, h]]) => (
        <rect key={k} x={x} y={y} width={w} height={h} rx={1.4} fill={on.includes(k) ? AMBER : SEG_DIM} />
      ))}
    </svg>
  );
}
function SevenSeg({ value, digits = 4 }) {
  const str = String(Math.max(0, value)).padStart(digits, '0').slice(-digits);
  return <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>{str.split('').map((d, i) => <Digit key={i} n={Number(d)} />)}</div>;
}

// ── sim (mutable game object; framework-agnostic, ported verbatim) ──────────
function spawnWave() {
  const inv = []; const ox = 20, oy = 18, gx = 33, gy = 20;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) inv.push({ cx: ox + c * gx, cy: oy + r * gy, row: r, col: c, alive: true });
  return inv;
}
function fresh(m) {
  return {
    phase: 'playing', mode: m, score: 0, lives: 3, wave: 1,
    inv: spawnWave(), dir: 1, stepAcc: 0, frame: 0,
    px: W / 2, bullets: [], bombs: [], splats: [], fireTimer: 0, bombCd: 700,
    marker: null, markerCd: 6000, flash: 0, invuln: 0, stepLo: false,
    final: 0, isPB: false,
  };
}
function aliveBounds(G) { let l = 1e9, r = -1e9, b = -1e9; for (const v of G.inv) if (v.alive) { l = Math.min(l, v.cx); r = Math.max(r, v.cx); b = Math.max(b, v.cy); } return { l, r, b }; }
function endGame(G, best) {
  if (G.phase === 'over') return;
  G.phase = 'over';
  const final = Math.min(CAP, G.score);
  G.final = final; G.isPB = final > best && final > 0; G.initials = 'AAA'; G.submitted = false;
}
function update(G, dt, sfx, input, best) {
  if (G.phase !== 'playing') return;
  G.bombCd = Math.max(0, G.bombCd - dt); G.markerCd = Math.max(0, G.markerCd - dt);
  G.flash = Math.max(0, G.flash - dt); G.invuln = Math.max(0, G.invuln - dt);

  G.fireTimer -= dt;
  if (G.fireTimer <= 0 && G.bullets.length < 2) { G.bullets.push({ x: G.px, y: PLAYER_Y - 10 }); G.fireTimer = AUTOFIRE_MS; sfx.shoot(); }

  const spd = 0.14 * dt;
  if (input.left) G.px -= spd; if (input.right) G.px += spd;
  G.px = Math.max(14, Math.min(W - 14, G.px));

  for (const b of G.bullets) b.y -= 0.34 * dt;
  G.bullets = G.bullets.filter((b) => b.y > -6);

  const total = COLS * ROWS; const alive = G.inv.filter((v) => v.alive).length;
  if (alive === 0) { G.wave++; G.inv = spawnWave(); G.dir = 1; G.stepAcc = 0; sfx.hit(); return; }
  const frac = alive / total; const fast = G.mode === 'B';
  const stepMs = Math.max(80, (fast ? 95 : 130) + (fast ? 360 : 470) * frac - (G.wave - 1) * 42);
  G.stepAcc += dt;
  if (G.stepAcc >= stepMs) {
    G.stepAcc -= stepMs; G.frame ^= 1; G.stepLo = !G.stepLo; sfx.step(G.stepLo);
    const { l, r } = aliveBounds(G); const dx = 8 * G.dir; const halfW = spriteW(MASK[0]) / 2;
    if (r + dx > W - halfW - 2 || l + dx < halfW + 2) { G.dir *= -1; for (const v of G.inv) if (v.alive) v.cy += 12; }
    else for (const v of G.inv) if (v.alive) v.cx += dx;
    const bombFreq = fast ? 420 : 650;
    if (G.bombCd <= 0 && Math.random() < (fast ? 0.7 : 0.5)) {
      const front = G.inv.filter((v) => v.alive); const s = front[(Math.random() * front.length) | 0];
      if (s) { G.bombs.push({ x: s.cx, y: s.cy + 8 }); G.bombCd = bombFreq; }
    }
    if (aliveBounds(G).b >= PLAYER_Y - 16) { sfx.boom(); endGame(G, best); return; }
  }

  if (!G.marker && G.markerCd <= 0) { G.marker = { x: -14, dir: 1, pts: [50, 100, 150][(Math.random() * 3) | 0] }; G.markerCd = 9000; sfx.ufo(); }
  if (G.marker) { G.marker.x += 0.06 * dt; if (G.marker.x > W + 14) G.marker = null; }

  for (const bo of G.bombs) bo.y += 0.17 * dt;
  G.bombs = G.bombs.filter((bo) => {
    if (bo.y > H + 6) return false;
    if (G.invuln <= 0 && Math.abs(bo.x - G.px) < 11 && bo.y > PLAYER_Y - 8) {
      G.lives--; G.invuln = 900; G.splats.push({ x: G.px, y: PLAYER_Y, t: 0 }); sfx.boom();
      if (G.lives <= 0) { endGame(G, best); }
      return false;
    }
    return true;
  });

  for (const b of G.bullets) {
    if (G.marker && Math.abs(b.x - G.marker.x) < 12 && b.y < 24) {
      G.score = Math.min(CAP, G.score + G.marker.pts); G.splats.push({ x: G.marker.x, y: 14, t: 0 }); G.marker = null; b.y = -99; sfx.ufo(); continue;
    }
    for (const v of G.inv) {
      if (!v.alive) continue;
      const hw = spriteW(MASK[0]) / 2, hh = spriteH(MASK[0]) / 2;
      if (Math.abs(b.x - v.cx) < hw && Math.abs(b.y - v.cy) < hh + 2) {
        v.alive = false; b.y = -99; G.score = Math.min(CAP, G.score + POINTS[v.row]);
        G.splats.push({ x: v.cx, y: v.cy, t: 0 }); if (G.score % 100 < POINTS[v.row]) G.flash = 120; sfx.hit(); break;
      }
    }
  }
  G.bullets = G.bullets.filter((b) => b.y > -6);
  for (const s of G.splats) s.t += dt;
  G.splats = G.splats.filter((s) => s.t < 300);
}
function drawField(ctx, G) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = LCD_GLASS; ctx.fillRect(0, 0, W, H);
  if (G) { ctx.fillStyle = GHOST; for (const v of G.inv) { ctx.beginPath(); ctx.arc(v.cx, v.cy, 8, 0, 7); ctx.fill(); } }
  if (G && G.phase !== 'attract') {
    for (const v of G.inv) { if (!v.alive) continue; const s = ROW_SPRITE[v.row][G.frame]; drawSprite(ctx, s, v.cx - spriteW(s) / 2, v.cy - spriteH(s) / 2, AMBER); }
    if (G.marker) drawSprite(ctx, MARKER, G.marker.x - spriteW(MARKER) / 2, 8, AMBER);
    ctx.fillStyle = AMBER_DIM; for (const bo of G.bombs) ctx.fillRect(bo.x - 1.5, bo.y - 4, 3, 8);
    ctx.fillStyle = AMBER; for (const b of G.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2.4, 0, 7); ctx.fill(); }
    if (!(G.invuln > 0 && ((G.invuln / 120 | 0) % 2))) drawSprite(ctx, PLAYER, G.px - spriteW(PLAYER) / 2, PLAYER_Y - spriteH(PLAYER), AMBER);
    for (const s of G.splats) { const a = 1 - s.t / 300; ctx.strokeStyle = amberA(a); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 3 + s.t / 16, 0, 7); ctx.stroke(); }
    if (G.flash > 0) { ctx.fillStyle = amberA(0.10 * G.flash / 120); ctx.fillRect(0, 0, W, H); }
  }
  if (!reducedMotion) { ctx.fillStyle = 'rgba(0,0,0,0.10)'; for (let y = 0; y < H; y += 3) ctx.fillRect(0, y, W, 1); }
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function ReadsInvadersPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const gameRef = useRef(fresh('A'));
  gameRef.current.phase = gameRef.current.phase || 'attract';
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio();
  const canvasRef = useRef(null);
  const inputRef = useRef({ left: false, right: false });
  const lastRef = useRef(null);
  const phaseRef = useRef('attract');
  const bestRef = useRef(0);
  const dragRef = useRef({ id: null, x: 0 });

  const [, setFrame] = useState(0);
  const [phase, setPhase] = useState('attract');
  const [attractTab, setAttractTab] = useState('title');   // title ↔ scores (static, no auto-cycle)
  const [board, setBoard] = useState([]);
  const [myBest, setMyBest] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const musicMutedRef = useRef(false);
  useEffect(() => { musicMutedRef.current = musicMuted; }, [musicMuted]);

  const loadBoard = useCallback(async () => {
    try { setBoard(await ds.getReadsInvadersTop(25)); } catch { /* degrade local-only */ }
    if (uid) { try { const mine = await ds.getReadsInvadersMyScore(uid); const b = mine?.score || 0; setMyBest(b); bestRef.current = b; } catch {} }
  }, [uid]);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Boot at attract (fresh() seeds 'playing' for gameplay; the ref must start in
  // attract so the loop doesn't mirror straight into a running game on mount).
  useEffect(() => { gameRef.current = { ...fresh('A'), phase: 'attract' }; phaseRef.current = 'attract'; }, []);

  // Canvas sizing (DPR-aware).
  useEffect(() => {
    const cv = canvasRef.current; if (!cv) return;
    const size = () => { const dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = W * dpr; cv.height = H * dpr; const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size(); window.addEventListener('resize', size);
    return () => window.removeEventListener('resize', size);
  }, []);

  // iOS hardening: block document scroll/bounce while the game is mounted.
  useEffect(() => {
    const block = (e) => e.preventDefault();
    document.addEventListener('touchmove', block, { passive: false });
    return () => document.removeEventListener('touchmove', block);
  }, []);

  // Game loop.
  useEffect(() => {
    let raf;
    const loop = (now) => {
      const G = gameRef.current; const A = audioRef.current;
      if (lastRef.current == null) lastRef.current = now;
      let dt = now - lastRef.current; lastRef.current = now; if (dt > 48) dt = 48;
      update(G, dt, A.sfx, inputRef.current, bestRef.current);
      const cv = canvasRef.current; if (cv) drawField(cv.getContext('2d'), G);
      if (G.phase !== phaseRef.current) {
        phaseRef.current = G.phase;
        if (G.phase === 'over') {
          if (G.final > bestRef.current) bestRef.current = G.final;
          setLastScore(G.final); setSubmitted(false); setInitials('AAA');
          A.musicStop();
        }
        setPhase(G.phase);
        if (G.phase === 'attract') { A.musicStop(); loadBoard(); }
      }
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((m) => {
    audioRef.current.ensure();
    gameRef.current = fresh(m);
    phaseRef.current = 'playing';
    lastRef.current = null;
    setPhase('playing');
    if (!musicMutedRef.current) audioRef.current.musicStart();
  }, []);

  const toAttract = useCallback(() => {
    gameRef.current = { ...fresh('A'), phase: 'attract' };
    phaseRef.current = 'attract';
    audioRef.current.musicStop();
    setAttractTab('title');
    setPhase('attract');
    loadBoard();
  }, [loadBoard]);

  // Keyboard.
  useEffect(() => {
    const down = (e) => {
      const G = gameRef.current; const inp = inputRef.current;
      if (G.phase === 'playing') {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') inp.left = true;
        else if (e.code === 'ArrowRight' || e.code === 'KeyD') inp.right = true;
        else if (e.code === 'Space') { e.preventDefault(); if (G.bullets.length < 2) { G.bullets.push({ x: G.px, y: PLAYER_Y - 10 }); audioRef.current.sfx.shoot(); } }
      } else if (G.phase === 'attract' && (e.code === 'Enter' || e.code === 'Space')) { e.preventDefault(); startGame('A'); }
    };
    const up = (e) => { const inp = inputRef.current; if (e.code === 'ArrowLeft' || e.code === 'KeyA') inp.left = false; else if (e.code === 'ArrowRight' || e.code === 'KeyD') inp.right = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [startGame]);

  // Drag-to-steer on the canvas (relative; finger never occludes the ship).
  const onCvDown = (e) => {
    audioRef.current.ensure();
    const G = gameRef.current; if (G.phase !== 'playing') return;
    dragRef.current = { id: e.pointerId, x: e.clientX };
    try { canvasRef.current.setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  };
  const onCvMove = (e) => {
    const d = dragRef.current; const G = gameRef.current;
    if (d.id !== e.pointerId || G.phase !== 'playing') return;
    const cv = canvasRef.current; const ratio = W / (cv.clientWidth || W);
    G.px = Math.max(14, Math.min(W - 14, G.px + (e.clientX - d.x) * ratio * STEER_GAIN));
    d.x = e.clientX; e.preventDefault();
  };
  const onCvUp = (e) => { if (dragRef.current.id === e.pointerId) dragRef.current.id = null; };

  const toggleMusic = () => {
    const m = !musicMuted; setMusicMuted(m);
    if (m) audioRef.current.musicStop();
    else if (gameRef.current.phase === 'playing') audioRef.current.musicStart();
  };
  const toggleSfx = () => { const m = !sfxMuted; setSfxMuted(m); audioRef.current.setSfx(!m); };

  const bumpInitial = (idx, dir) => {
    setInitials((cur) => { const arr = cur.split(''); let code = arr[idx].charCodeAt(0) - 65 + dir; code = ((code % 26) + 26) % 26; arr[idx] = String.fromCharCode(65 + code); return arr.join(''); });
  };
  const submitScore = async () => {
    if (submitted || !uid) { toAttract(); return; }
    setSubmitted(true);
    try { await ds.submitReadsInvadersScore(uid, { initials, score: lastScore, mode: gameRef.current.mode }); } catch {}
    toAttract();
  };

  // Emulator-only test hook (inert in prod — window.__pbtest undefined there).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__pbtest) return;
    window.__pbInvadersTest = {
      start: (m) => startGame(m || 'A'),
      state: () => ({ score: gameRef.current.score, lives: gameRef.current.lives, phase: gameRef.current.phase }),
      forceScore: (n) => { gameRef.current.score = Math.max(0, Math.min(CAP, n | 0)); },
      gameOver: () => { endGame(gameRef.current, bestRef.current); },
    };
    return () => { try { delete window.__pbInvadersTest; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame]);

  useEffect(() => () => { try { audioRef.current?.dispose(); } catch {} }, []);

  const G = gameRef.current;
  const isPB = lastScore > 0 && lastScore > myBest;
  const hiVal = Math.max(myBest, board[0]?.score || 0);

  return (
    <div data-testid="reads-invaders"
      style={{
        position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, ...NO_SELECT,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: FONT, color: COLORS.text, overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      {/* Chrome bar — text wordmark only (NO brand mark in-game) */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('reads_invaders_back') || 'Back'} data-testid="reads-invaders-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <span style={{ flex: 1, fontSize: FONT_SIZE.sm, fontWeight: 800, letterSpacing: 1, color: COLORS.textDim }}>READS&nbsp;INVADERS</span>
        <div role="button" aria-label={t('reads_invaders_music') || 'Music'} data-testid="reads-invaders-music" onClick={toggleMusic}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: musicMuted ? COLORS.textMuted : COLORS.accent }}>
          <Music size={20} style={{ opacity: musicMuted ? 0.4 : 1 }} />
        </div>
        <div role="button" aria-label={t('reads_invaders_sfx') || 'Sound effects'} data-testid="reads-invaders-sfx" onClick={toggleSfx}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: sfxMuted ? COLORS.textMuted : COLORS.accent }}>
          {sfxMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
      </div>

      {/* HUD */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SPACE.lg}px ${SPACE.sm}px`, boxSizing: 'border-box' }}>
        <div data-testid="reads-invaders-score" style={{ filter: G.flash > 0 ? 'brightness(1.8)' : 'none', transition: 'filter 80ms' }}>
          <SevenSeg value={phase === 'playing' ? G.score : (phase === 'attract' ? myBest : lastScore)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', gap: 5 }} data-testid="reads-invaders-lives">
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: i < (phase === 'playing' ? G.lives : 3) ? COLORS.accent : `${COLORS.accent}26` }} />)}
          </div>
          <div style={{ fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.textMuted, letterSpacing: 1 }}>
            HI&nbsp;{String(hiVal).padStart(4, '0')} · {G.mode}
          </div>
        </div>
      </div>

      {/* Play field (canvas) + overlays */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, flex: '0 1 auto', padding: `0 ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <canvas ref={canvasRef} data-testid="reads-invaders-canvas"
          onPointerDown={onCvDown} onPointerMove={onCvMove} onPointerUp={onCvUp} onPointerCancel={onCvUp}
          style={{ display: 'block', width: '100%', maxHeight: '56vh', background: LCD_GLASS, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, touchAction: 'none' }} />
        {phase === 'attract' && (
          <AttractOverlay tab={attractTab} setTab={setAttractTab} board={board} hi={hiVal} onStart={startGame} t={t} />
        )}
        {phase === 'over' && (
          <OverOverlay score={lastScore} isPB={isPB} initials={initials} submitted={submitted} hasUid={!!uid}
            onBump={bumpInitial} onSubmit={submitScore} onRestart={() => startGame(G.mode)} onAttract={toAttract} t={t} />
        )}
      </div>

      {phase === 'playing' && (
        <>
          <div style={{ width: '100%', maxWidth: 480, textAlign: 'center', fontSize: FONT_SIZE.xxs, letterSpacing: 1, color: COLORS.textMuted, padding: `0 ${SPACE.lg}px 2px` }}>
            {t('reads_invaders_steer_hint') || 'DRAG THE FIELD TO STEER · AUTO-FIRE'}
          </div>
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', gap: SPACE.md, padding: SPACE.lg, boxSizing: 'border-box' }}>
            <HoldBtn testId="reads-invaders-left" ariaLabel={t('reads_invaders_left') || 'Left'} onDown={() => { inputRef.current.left = true; }} onUp={() => { inputRef.current.left = false; }}><ChevronLeft size={32} /></HoldBtn>
            <HoldBtn testId="reads-invaders-right" ariaLabel={t('reads_invaders_right') || 'Right'} onDown={() => { inputRef.current.right = true; }} onUp={() => { inputRef.current.right = false; }}><ChevronRight size={32} /></HoldBtn>
          </div>
        </>
      )}
    </div>
  );
}

function HoldBtn({ children, onDown, onUp, testId, ariaLabel }) {
  return (
    <button type="button" data-testid={testId} aria-label={ariaLabel}
      onPointerDown={(e) => { e.preventDefault(); onDown(); }}
      onPointerUp={onUp} onPointerLeave={onUp} onPointerCancel={onUp} onContextMenu={(e) => e.preventDefault()}
      style={{ ...ARCADE_BTN, flex: 1, minHeight: 72 }}>
      {children}
    </button>
  );
}

function AttractOverlay({ tab, setTab, board, hi, onStart, t }) {
  return (
    <div style={overlayStyle} data-testid="reads-invaders-attract">
      {tab === 'scores' ? (
        <>
          <ScoresTable board={board} t={t} />
          <button type="button" data-testid="reads-invaders-scores-back" onClick={() => setTab('title')} style={linkBtnStyle}>‹ {t('reads_invaders_back') || 'BACK'}</button>
        </>
      ) : (
        <>
          <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1 }}>{t('reads_invaders_title') || 'Invaders'}</div>
          <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 4 }}>{t('reads_invaders_tagline') || 'Make the read.'}</div>
          <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.lg }}>
            <StartBtn testId="reads-invaders-start-a" onClick={() => onStart('A')} label={t('reads_invaders_game_a') || 'Game A'} sub={t('reads_invaders_game_a_sub') || 'classic'} />
            <StartBtn testId="reads-invaders-start-b" onClick={() => onStart('B')} label={t('reads_invaders_game_b') || 'Game B'} sub={t('reads_invaders_game_b_sub') || 'fast'} />
          </div>
          <div style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: SPACE.md, letterSpacing: 1 }}>
            {(t('reads_invaders_press') || 'DRAG TO STEER · AUTO-FIRE')} · HI {String(hi).padStart(4, '0')}
          </div>
          <button type="button" data-testid="reads-invaders-highscores" onClick={() => setTab('scores')} style={linkBtnStyle}>{t('reads_invaders_high_scores') || 'HIGH SCORES'} ›</button>
        </>
      )}
    </div>
  );
}

function ScoresTable({ board, t }) {
  const rows = board.slice(0, 8);
  return (
    <div data-testid="reads-invaders-scores" style={{ width: '100%', maxWidth: 280 }}>
      <div style={{ textAlign: 'center', fontSize: FONT_SIZE.lg, fontWeight: 900, letterSpacing: 2, color: COLORS.accent, marginBottom: SPACE.md }}>{t('reads_invaders_high_scores') || 'HIGH SCORES'}</div>
      {rows.length === 0 && <div style={{ textAlign: 'center', fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{t('reads_invaders_no_scores') || 'Be the first.'}</div>}
      {rows.map((r, i) => (
        <div key={r.uid} style={{ display: 'flex', alignItems: 'center', fontSize: FONT_SIZE.base, fontWeight: 700, padding: '3px 0', color: i === 0 ? COLORS.accent : COLORS.text }}>
          <span style={{ width: 28, color: COLORS.textMuted }}>{i + 1}.</span>
          <span style={{ flex: 1, letterSpacing: 2 }}>{r.initials || '???'}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{String(r.score || 0).padStart(4, '0')}</span>
        </div>
      ))}
    </div>
  );
}

function OverOverlay({ score, isPB, initials, submitted, hasUid, onBump, onSubmit, onRestart, onAttract, t }) {
  return (
    <div style={overlayStyle} data-testid="reads-invaders-over">
      <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1, color: COLORS.danger }}>{t('reads_invaders_game_over') || 'GAME OVER'}</div>
      <div style={{ marginTop: SPACE.sm }}><SevenSeg value={score} /></div>
      {isPB && hasUid ? (
        <div data-testid="reads-invaders-initials" style={{ marginTop: SPACE.md, textAlign: 'center' }}>
          <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: COLORS.accent, letterSpacing: 1 }}>{t('reads_invaders_new_best') || 'NEW BEST — ENTER INITIALS'}</div>
          <div style={{ display: 'flex', gap: SPACE.md, justifyContent: 'center', marginTop: SPACE.sm }}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button type="button" aria-label={`up-${idx}`} data-testid={`reads-invaders-initial-up-${idx}`} onClick={() => onBump(idx, 1)} style={initBtnStyle}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                <span style={{ fontSize: 30, fontWeight: 900, color: COLORS.accent, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                <button type="button" aria-label={`down-${idx}`} data-testid={`reads-invaders-initial-down-${idx}`} onClick={() => onBump(idx, -1)} style={initBtnStyle}><ChevronRight size={18} style={{ transform: 'rotate(90deg)' }} /></button>
              </div>
            ))}
          </div>
          <button type="button" data-testid="reads-invaders-submit" disabled={submitted} onClick={onSubmit}
            style={{ marginTop: SPACE.md, padding: '12px 28px', minHeight: TOUCH.minTarget, background: COLORS.accent, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer', opacity: submitted ? 0.5 : 1 }}>
            {t('reads_invaders_save') || 'SAVE'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.lg }}>
          <StartBtn testId="reads-invaders-retry" onClick={onRestart} label={t('reads_invaders_retry') || 'Retry'} sub="▶" />
          <StartBtn testId="reads-invaders-home" onClick={onAttract} label={t('reads_invaders_menu') || 'Menu'} sub="↩" />
        </div>
      )}
    </div>
  );
}

function StartBtn({ label, sub, onClick, testId }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick}
      style={{
        minWidth: 120, minHeight: 56, padding: '12px 20px',
        background: COLORS.surface, color: COLORS.text, border: `1px solid ${COLORS.accent}55`,
        borderRadius: RADIUS.lg, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
      }}>
      <span style={{ fontSize: FONT_SIZE.base, fontWeight: 900, color: COLORS.accent, letterSpacing: 1 }}>{label}</span>
      <span style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>{sub}</span>
    </button>
  );
}

const overlayStyle = {
  position: 'absolute', inset: `0 ${SPACE.md}px`, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
  background: `${COLORS.bg}e8`, borderRadius: RADIUS.lg, padding: SPACE.lg, boxSizing: 'border-box',
};
const linkBtnStyle = {
  marginTop: SPACE.md, minHeight: TOUCH.minTarget, padding: '0 16px', background: 'none', border: 'none',
  cursor: 'pointer', fontSize: FONT_SIZE.xs, fontWeight: 800, letterSpacing: 2, color: COLORS.textDim,
};
const initBtnStyle = {
  minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: COLORS.surface, color: COLORS.accent, border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.md, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
};
