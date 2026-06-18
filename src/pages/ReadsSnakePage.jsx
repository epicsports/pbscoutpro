// Reads Snake — 2nd "Take a Break" mini-game (§119). Classic Snake on a 24×15
// amber-LCD grid. Pure DOM/CSS + SVG — no canvas, no engine, no new dep. Play
// spec §119.A; leaderboard §119.B (board "readsSnake", same infra as Reads Mini,
// SFX only — no music). Lazy own chunk (App.jsx /break/snake). Clones the Reads
// Mini scaffolding (chrome, 7-seg, arcade attract/initials, dt-loop). Food = the
// Reads amber dot + seam (brand callback).
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronUp, ChevronDown, ChevronRight, Volume2, VolumeX, Play } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

// ─── Grid geometry (§119.A) ─────────────────────────────────────────────────
const COLS = 24, ROWS = 15, CELL = 10;
const VB_W = COLS * CELL, VB_H = ROWS * CELL;     // 240 × 150
const SPEED_0 = 140, SPEED_MIN = 70, SPEED_STEP = 3;

const SEG_LIT = COLORS.accent;
const SEG_DIM = `${COLORS.accent}1f`;
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Game model (mutable ref; rAF mutates, React renders) ───────────────────
function rnd(n) { return Math.floor(Math.random() * n); }
function placeFood(snake) {
  const occ = new Set(snake.map((s) => `${s.x},${s.y}`));
  let c;
  do { c = { x: rnd(COLS), y: rnd(ROWS) }; } while (occ.has(`${c.x},${c.y}`));
  return c;
}
function freshGame() {
  const snake = [{ x: 7, y: 7 }, { x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
  return {
    phase: 'playing', snake, dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
    food: placeFood(snake), score: 0, speed: SPEED_0, acc: 0, flash: 0,
  };
}
// One step. Returns 'die' | 'eat' | 'move'.
function step(G, sfx) {
  G.dir = G.nextDir;
  const head = { x: G.snake[0].x + G.dir.x, y: G.snake[0].y + G.dir.y };
  if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) { die(G, sfx); return 'die'; }
  const grow = head.x === G.food.x && head.y === G.food.y;
  const body = grow ? G.snake : G.snake.slice(0, -1);   // tail vacates unless growing
  if (body.some((s) => s.x === head.x && s.y === head.y)) { die(G, sfx); return 'die'; }
  G.snake.unshift(head);
  if (grow) {
    G.score = Math.min(9999, G.score + 10);
    G.food = placeFood(G.snake);
    G.speed = Math.max(SPEED_MIN, G.speed - SPEED_STEP);
    if (G.score % 100 === 0) G.flash = 8;
    sfx.eat();
    return 'eat';
  }
  G.snake.pop();
  return 'move';
}
function die(G, sfx) { G.phase = 'over'; sfx.die(); setTimeout(() => sfx.over(), 180); }
function setDir(G, x, y) {
  if (G.phase !== 'playing') return;
  if (x === -G.dir.x && y === -G.dir.y) return;   // ignore 180° reversal
  G.nextDir = { x, y };
}

// ─── Audio (SFX ported verbatim + procedural music loop, night-mode beautify) ──
// Bouncy A-minor-pentatonic loop, one square channel, low gain under the SFX.
// Gated by the same sound toggle as the SFX (sfxMuted stops both).
const MUSIC_PAT = [330, 0, 392, 440, 392, 0, 330, 0, 294, 0, 330, 392, 440, 392, 294, 0];
const MUSIC_STEP_MS = 160;
function makeAudio() {
  let ctx = null, sfxMuted = false, unlocked = false, musicTimer = null, mstep = 0;
  const ensureCtx = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    // iOS WebAudio unlock: play one silent buffer inside the first gesture so
    // subsequent SFX actually sound (a resumed-but-never-kicked ctx stays mute).
    if (ctx && !unlocked) { unlocked = true; try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch {} }
    return ctx;
  };
  const tone = (steps, type = 'square') => {
    if (sfxMuted) return;
    const c = ensureCtx(); if (!c) return;
    const t0 = c.currentTime;
    steps.forEach(([freq, at, dur]) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0 + at);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.16, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    });
  };
  // One square-wave music note (under the SFX), gated by the same mute.
  const mnote = (freq) => {
    if (sfxMuted || !ctx || !freq) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = freq; g.gain.value = 0.0001;
    const t = ctx.currentTime;
    g.gain.exponentialRampToValueAtTime(0.05, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 0.17);
  };
  return {
    start() { ensureCtx(); },
    eat() { tone([[700, 0, 0.05], [1040, 0.045, 0.06]]); },
    die() { tone([[140, 0, 0.28]], 'sawtooth'); },
    over() { tone([[440, 0, 0.16], [330, 0.16, 0.16], [247, 0.32, 0.16], [196, 0.48, 0.26]]); },
    blip() { tone([[660, 0, 0.05]]); },
    musicStart() { if (musicTimer || sfxMuted) return; ensureCtx(); if (!ctx) return; mstep = 0; musicTimer = setInterval(() => { mnote(MUSIC_PAT[mstep % MUSIC_PAT.length]); mstep++; }, MUSIC_STEP_MS); },
    musicStop() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } },
    setSfxMuted(m) { sfxMuted = m; if (m) this.musicStop(); },
    dispose() { this.musicStop(); try { if (ctx) ctx.close(); } catch {} },
  };
}

// ─── 7-segment digit (same renderer as Reads Mini §117.A) ───────────────────
const SEG = { a: [4, 0, 12, 4], b: [16, 4, 4, 12], c: [16, 20, 4, 12], d: [4, 32, 12, 4], e: [0, 20, 4, 12], f: [0, 4, 4, 12], g: [4, 16, 12, 4] };
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgcde', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function Digit({ n }) {
  const on = SEG7[n] || '';
  return (
    <svg width="20" height="36" viewBox="0 0 20 36" style={{ display: 'block' }} aria-hidden>
      {Object.entries(SEG).map(([k, [x, y, w, h]]) => (
        <rect key={k} x={x} y={y} width={w} height={h} rx={1.4} fill={on.includes(k) ? SEG_LIT : SEG_DIM} />
      ))}
    </svg>
  );
}
function SevenSeg({ value, digits = 4 }) {
  const str = String(Math.max(0, value)).padStart(digits, '0').slice(-digits);
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      {str.split('').map((d, i) => <Digit key={i} n={Number(d)} />)}
    </div>
  );
}

// ─── Brand mark (amber dot + seam) ──────────────────────────────────────────
function ReadsIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden>
      <circle cx="12" cy="12" r="8" fill={COLORS.accent} />
      <rect x="2" y="11" width="20" height="2" fill={COLORS.bg} />
    </svg>
  );
}

// ─── Field render (per §119.A) ──────────────────────────────────────────────
const GHOST = (() => {
  const dots = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) dots.push([x * CELL + CELL / 2, y * CELL + CELL / 2]);
  return dots;
})();
function Field({ G, phase }) {
  const playing = phase === 'playing';
  const n = G.snake.length;
  const head = G.snake[0];
  const hx = head.x * CELL + CELL / 2, hy = head.y * CELL + CELL / 2;
  const ex = hx + G.dir.x * 1.7, ey = hy + G.dir.y * 1.7;
  const px = -G.dir.y * 1.6, py = G.dir.x * 1.6;   // perpendicular offset for eyes
  const fx = G.food.x * CELL + CELL / 2, fy = G.food.y * CELL + CELL / 2;
  // pulsing brand-dot food (recomputed each frame; the page re-renders via rAF)
  const pulse = reducedMotion ? 3.6 : (3.5 + Math.sin((typeof performance !== 'undefined' ? performance.now() : 0) / 1000 * 4) * 0.45);
  const A = COLORS.accent;
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%"
      style={{ display: 'block', maxHeight: '52vh', background: COLORS.surfaceBar, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, touchAction: 'none' }}
      data-testid="reads-snake-field">
      <defs>
        {/* graded halftone tiles — dark dot punched out of amber (head→tail density) */}
        <pattern id="snk-ht1" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill={A} /><circle cx="1.5" cy="1.5" r="0.5" fill={COLORS.surfaceBar} /></pattern>
        <pattern id="snk-ht2" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill={A} /><circle cx="1.5" cy="1.5" r="0.86" fill={COLORS.surfaceBar} /></pattern>
        <pattern id="snk-ht3" width="3" height="3" patternUnits="userSpaceOnUse"><rect width="3" height="3" fill={A} /><circle cx="1.5" cy="1.5" r="1.16" fill={COLORS.surfaceBar} /></pattern>
        <pattern id="snk-glow" width="3" height="3" patternUnits="userSpaceOnUse"><circle cx="1.5" cy="1.5" r="0.5" fill={A} /></pattern>
        <pattern id="snk-scan" width="3" height="3" patternUnits="userSpaceOnUse"><rect x="0" y="2" width="3" height="1" fill="rgba(0,0,0,0.14)" /></pattern>
      </defs>
      {/* ghost dot-matrix (drawn once, faint) */}
      <g aria-hidden opacity={0.13}>
        {GHOST.map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={0.8} fill={A} />)}
      </g>
      {/* food = Reads dot + dither glow halo + seam */}
      <circle cx={fx} cy={fy} r={6.4} fill="url(#snk-glow)" opacity={0.5} />
      <circle cx={fx} cy={fy} r={pulse} fill={A} />
      <rect x={fx - 3.6} y={fy - 0.6} width={7.2} height={1.2} rx={0.6} fill={COLORS.bg} />
      {/* snake body (tail → head so head paints on top); graded halftone */}
      {G.snake.slice().reverse().map((c, ri) => {
        const i = n - 1 - ri;
        const frac = n > 1 ? i / (n - 1) : 0;
        const fill = i === 0 ? A : (frac < 0.34 ? 'url(#snk-ht1)' : frac < 0.67 ? 'url(#snk-ht2)' : 'url(#snk-ht3)');
        return <rect key={`${c.x}-${c.y}-${i}`} x={c.x * CELL + 1.2} y={c.y * CELL + 1.2} width={7.6} height={7.6} rx={2.2} fill={fill} />;
      })}
      {/* head eyes, oriented to travel */}
      {playing && (
        <g aria-hidden>
          <circle cx={ex + px} cy={ey + py} r={0.9} fill={COLORS.bg} />
          <circle cx={ex - px} cy={ey - py} r={0.9} fill={COLORS.bg} />
        </g>
      )}
      {/* scanlines (1-bit LCD) */}
      {!reducedMotion && <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#snk-scan)" pointerEvents="none" />}
    </svg>
  );
}

// ─── Main ───────────────────────────────────────────────────────────────────
export default function ReadsSnakePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const gameRef = useRef(freshGame());
  // Guard only — must NOT clobber an in-progress 'playing'/'over' on re-render
  // (the mount effect below seeds 'attract'); an unconditional set would reset
  // the game every frame.
  gameRef.current.phase = gameRef.current.phase || 'attract';
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio();
  const lastRef = useRef(null);
  const phaseRef = useRef('attract');

  const [, setFrame] = useState(0);
  const [phase, setPhase] = useState('attract');
  const [attractTab, setAttractTab] = useState('title');
  const [board, setBoard] = useState([]);
  const [myBest, setMyBest] = useState(0);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  const audioStarted = useRef(false);
  const kickAudio = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    audioRef.current.start();
  }, []);

  useEffect(() => { gameRef.current = { ...freshGame(), phase: 'attract' }; }, []);

  const loadBoard = useCallback(async () => {
    try { setBoard(await ds.getReadsSnakeTop(25)); } catch { /* degrade local-only */ }
    if (uid) { try { const mine = await ds.getReadsSnakeMyScore(uid); setMyBest(mine?.score || 0); } catch {} }
  }, [uid]);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Attract loop: cycle title ↔ HIGH SCORES.
  useEffect(() => {
    if (phase !== 'attract') return;
    const id = setInterval(() => setAttractTab((v) => (v === 'title' ? 'scores' : 'title')), 4500);
    return () => clearInterval(id);
  }, [phase]);

  // Game loop (rAF, dt-accumulator at G.speed).
  useEffect(() => {
    let raf;
    const loop = (now) => {
      const G = gameRef.current;
      const sfx = audioRef.current;
      if (lastRef.current == null) lastRef.current = now;
      let dt = now - lastRef.current;
      lastRef.current = now;
      if (dt > 250) dt = 250;
      if (G.phase === 'playing') {
        G.acc += dt;
        let guard = 0;
        while (G.acc >= G.speed && guard++ < 8) { G.acc -= G.speed; if (step(G, sfx) === 'die') break; }
        if (G.flash > 0) G.flash -= 1;
        sfx.musicStart();
      } else sfx.musicStop();
      if (G.phase !== phaseRef.current) {
        phaseRef.current = G.phase;
        if (G.phase === 'over') { setLastScore(G.score); setSubmitted(false); }
        setPhase(G.phase);
        if (G.phase === 'attract') loadBoard();
      }
      setFrame((f) => (f + 1) % 1e6);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback(() => {
    kickAudio();
    gameRef.current = freshGame();
    phaseRef.current = 'playing';
    lastRef.current = null;
    setPhase('playing');
  }, [kickAudio]);

  const toAttract = useCallback(() => {
    gameRef.current = { ...freshGame(), phase: 'attract' };
    phaseRef.current = 'attract';
    setPhase('attract');
    loadBoard();
  }, [loadBoard]);

  // Keyboard: arrows + WASD; space/enter starts from attract.
  useEffect(() => {
    const onKey = (e) => {
      kickAudio();
      const G = gameRef.current;
      const k = e.key.toLowerCase();
      if (G.phase === 'playing') {
        if (e.key === 'ArrowUp' || k === 'w') { setDir(G, 0, -1); e.preventDefault(); }
        else if (e.key === 'ArrowDown' || k === 's') { setDir(G, 0, 1); e.preventDefault(); }
        else if (e.key === 'ArrowLeft' || k === 'a') { setDir(G, -1, 0); e.preventDefault(); }
        else if (e.key === 'ArrowRight' || k === 'd') { setDir(G, 1, 0); e.preventDefault(); }
      } else if (G.phase === 'attract' && (e.key === 'Enter' || e.key === ' ')) {
        startGame(); e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame, kickAudio]);

  // Swipe + tap-to-start on the LCD.
  const swipeRef = useRef({ x: 0, y: 0 });
  const onFieldDown = (e) => { kickAudio(); swipeRef.current = { x: e.clientX, y: e.clientY }; };
  const onFieldUp = (e) => {
    const dx = e.clientX - swipeRef.current.x, dy = e.clientY - swipeRef.current.y;
    const G = gameRef.current;
    if (Math.abs(dx) < 18 && Math.abs(dy) < 18) { if (G.phase === 'attract') startGame(); return; }
    if (G.phase !== 'playing') return;
    if (Math.abs(dx) > Math.abs(dy)) setDir(G, dx > 0 ? 1 : -1, 0);
    else setDir(G, 0, dy > 0 ? 1 : -1);
  };

  const toggleSfx = () => { const m = !sfxMuted; setSfxMuted(m); audioRef.current.setSfxMuted(m); };

  const bumpInitial = (idx, dir) => {
    audioRef.current.blip();
    setInitials((cur) => {
      const arr = cur.split('');
      let code = arr[idx].charCodeAt(0) - 65 + dir;
      code = ((code % 26) + 26) % 26;
      arr[idx] = String.fromCharCode(65 + code);
      return arr.join('');
    });
  };
  const submitScore = async () => {
    if (submitted || !uid) { toAttract(); return; }
    setSubmitted(true);
    try { await ds.submitReadsSnakeScore(uid, { initials, score: lastScore }); } catch {}
    toAttract();
  };

  // Emulator-only test hook (inert in prod — window.__pbtest is undefined there).
  // Lets the e2e drive the engine deterministically (eat-next + read state).
  useEffect(() => {
    if (typeof window === 'undefined' || !window.__pbtest) return;
    window.__pbSnakeTest = {
      start: () => startGame(),
      state: () => ({ score: gameRef.current.score, length: gameRef.current.snake.length, phase: gameRef.current.phase }),
      feed: () => { const G = gameRef.current; G.food = { x: G.snake[0].x + G.dir.x, y: G.snake[0].y + G.dir.y }; },
      stepOnce: () => step(gameRef.current, audioRef.current),
    };
    return () => { try { delete window.__pbSnakeTest; } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startGame]);

  useEffect(() => () => { try { audioRef.current?.dispose(); } catch {} }, []);

  const isPB = lastScore > 0 && lastScore > myBest;
  const G = gameRef.current;

  return (
    <div data-testid="reads-snake" onPointerDown={kickAudio}
      style={{
        position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: FONT, color: COLORS.text, overflow: 'hidden', ...NO_SELECT,
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      {/* Chrome bar — back to the selector */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('reads_snake_back') || 'Back'} data-testid="reads-snake-back" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReadsIcon size={20} />
          <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, letterSpacing: 1, color: COLORS.textDim }}>{t('reads_snake_title') || 'SNAKE'}</span>
        </div>
        <div role="button" aria-label={t('reads_snake_sfx') || 'Sound effects'} data-testid="reads-snake-sfx" onClick={toggleSfx}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: sfxMuted ? COLORS.textMuted : COLORS.accent }}>
          {sfxMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
      </div>

      {/* HUD: 7-seg score + LEN + HI */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SPACE.lg}px ${SPACE.sm}px`, boxSizing: 'border-box' }}>
        <div data-testid="reads-snake-score" style={{ filter: G.flash > 0 ? 'brightness(1.8)' : 'none', transition: 'filter 80ms' }}>
          <SevenSeg value={phase === 'playing' ? G.score : (phase === 'attract' ? myBest : lastScore)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.textMuted, letterSpacing: 1 }} data-testid="reads-snake-len">
            {(t('reads_snake_len') || 'LEN')} {G.snake.length}
          </div>
          <div style={{ fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.textMuted, letterSpacing: 1 }}>
            HI&nbsp;{String(Math.max(myBest, board[0]?.score || 0)).padStart(4, '0')}
          </div>
        </div>
      </div>

      {/* Play field */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, flex: '0 1 auto', padding: `0 ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div onPointerDown={onFieldDown} onPointerUp={onFieldUp}>
          <Field G={G} phase={phase} />
        </div>
        {phase === 'attract' && <AttractOverlay tab={attractTab} board={board} myBest={myBest} onStart={startGame} t={t} />}
        {phase === 'over' && (
          <OverOverlay score={lastScore} isPB={isPB} initials={initials} submitted={submitted}
            onBump={bumpInitial} onSubmit={submitScore} onRestart={startGame} onAttract={toAttract} hasUid={!!uid} t={t} />
        )}
      </div>

      {/* D-pad (4 directions) */}
      {phase === 'playing' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gridTemplateRows: 'repeat(3, 56px)', gap: 8, padding: SPACE.lg }}>
          <span />
          <DpadBtn testId="reads-snake-up" onPress={() => setDir(gameRef.current, 0, -1)} ariaLabel={t('reads_snake_up') || 'Up'}><ChevronUp size={26} /></DpadBtn>
          <span />
          <DpadBtn testId="reads-snake-left" onPress={() => setDir(gameRef.current, -1, 0)} ariaLabel={t('reads_snake_left') || 'Left'}><ChevronLeft size={26} /></DpadBtn>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: `${COLORS.accent}80` }} />
          </span>
          <DpadBtn testId="reads-snake-right" onPress={() => setDir(gameRef.current, 1, 0)} ariaLabel={t('reads_snake_right') || 'Right'}><ChevronRight size={26} /></DpadBtn>
          <span />
          <DpadBtn testId="reads-snake-down" onPress={() => setDir(gameRef.current, 0, 1)} ariaLabel={t('reads_snake_down') || 'Down'}><ChevronDown size={26} /></DpadBtn>
          <span />
        </div>
      )}
    </div>
  );
}

function DpadBtn({ children, onPress, testId, ariaLabel }) {
  return (
    <button type="button" data-testid={testId} aria-label={ariaLabel}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }} onContextMenu={(e) => e.preventDefault()}
      style={{ ...ARCADE_BTN, width: 56, height: 56 }}>
      {children}
    </button>
  );
}

function AttractOverlay({ tab, board, myBest, onStart, t }) {
  return (
    <div style={overlayStyle} data-testid="reads-snake-attract">
      {tab === 'title' ? (
        <>
          <ReadsIcon size={48} />
          <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1, marginTop: SPACE.sm }}>{t('reads_snake_name') || 'side is the best!'}</div>
          <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 4 }}>{t('reads_snake_tagline') || 'Classic snake.'}</div>
          <button type="button" data-testid="reads-snake-start" onClick={onStart}
            style={{ marginTop: SPACE.lg, minWidth: 120, minHeight: TOUCH.minTarget, padding: '12px 24px', background: COLORS.accent, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer' }}>
            {t('reads_snake_start') || 'START'}
          </button>
          <div style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: SPACE.md, letterSpacing: 1 }}>
            HI {String(Math.max(myBest, board[0]?.score || 0)).padStart(4, '0')}
          </div>
        </>
      ) : (
        <ScoresTable board={board} t={t} />
      )}
    </div>
  );
}

function ScoresTable({ board, t }) {
  const rows = board.slice(0, 8);
  return (
    <div data-testid="reads-snake-scores" style={{ width: '100%', maxWidth: 280 }}>
      <div style={{ textAlign: 'center', fontSize: FONT_SIZE.lg, fontWeight: 900, letterSpacing: 2, color: COLORS.accent, marginBottom: SPACE.md }}>{t('reads_snake_high_scores') || 'HIGH SCORES'}</div>
      {rows.length === 0 && <div style={{ textAlign: 'center', fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{t('reads_snake_no_scores') || 'Be the first.'}</div>}
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

function OverOverlay({ score, isPB, initials, submitted, onBump, onSubmit, onRestart, onAttract, hasUid, t }) {
  return (
    <div style={overlayStyle} data-testid="reads-snake-over">
      <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1, color: COLORS.danger }}>{t('reads_snake_game_over') || 'GAME OVER'}</div>
      <div style={{ marginTop: SPACE.sm }}><SevenSeg value={score} /></div>
      {isPB && hasUid ? (
        <div data-testid="reads-snake-initials" style={{ marginTop: SPACE.md, textAlign: 'center' }}>
          <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: COLORS.accent, letterSpacing: 1 }}>{t('reads_snake_new_best') || 'NEW BEST — ENTER INITIALS'}</div>
          <div style={{ display: 'flex', gap: SPACE.md, justifyContent: 'center', marginTop: SPACE.sm }}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button type="button" aria-label={`up-${idx}`} data-testid={`reads-snake-initial-up-${idx}`} onClick={() => onBump(idx, 1)} style={initBtnStyle}><ChevronUp size={18} /></button>
                <span style={{ fontSize: 30, fontWeight: 900, color: COLORS.accent, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                <button type="button" aria-label={`down-${idx}`} data-testid={`reads-snake-initial-down-${idx}`} onClick={() => onBump(idx, -1)} style={initBtnStyle}><ChevronDown size={18} /></button>
              </div>
            ))}
          </div>
          <button type="button" data-testid="reads-snake-submit" disabled={submitted} onClick={onSubmit}
            style={{ marginTop: SPACE.md, padding: '12px 28px', minHeight: TOUCH.minTarget, background: COLORS.accent, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer', opacity: submitted ? 0.5 : 1 }}>
            {t('reads_snake_save') || 'SAVE'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.lg }}>
          <StartBtn testId="reads-snake-retry" onClick={onRestart} label={t('reads_snake_retry') || 'Retry'} sub={<Play size={14} />} />
          <StartBtn testId="reads-snake-home" onClick={onAttract} label={t('reads_snake_menu') || 'Menu'} sub="↩" />
        </div>
      )}
    </div>
  );
}

function StartBtn({ label, sub, onClick, testId }) {
  return (
    <button type="button" data-testid={testId} onClick={onClick}
      style={{
        minWidth: 96, minHeight: TOUCH.minTarget, padding: '10px 16px',
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
const initBtnStyle = {
  minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: COLORS.surface, color: COLORS.accent, border: `1px solid ${COLORS.border}`,
  borderRadius: RADIUS.md, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
};
