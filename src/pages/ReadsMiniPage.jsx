// Reads Mini — "Take a Break" (§117). A Game&Watch-style catch game shipped
// into the app, with a global arcade leaderboard. Pure DOM/CSS + SVG — no
// canvas, no game engine, no new dep. Mechanics per §117.A; audio per §117.C;
// leaderboard per §117.B. Lazy own chunk (App.jsx /break). Art is split into
// swappable layer components (GhostGrid / Conveyors / Feeders / Catcher / Ball /
// Splat) so hand-drawn art can replace a layer later without touching mechanics.
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, Music, Play } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { NO_SELECT, ARCADE_BTN } from '../components/arcade/ArcadeButton';

// ─── Play-field geometry (§117.A) ──────────────────────────────────────────
const VB_W = 320, VB_H = 200;
const LANE = [53, 124, 196, 267];
const STEP_Y = [50, 75, 100, 125, 150];
const STEPS = 5, CATCH = 4;              // catch row = step index 4 (y=150)
const CATCHER_Y = 160, SPLAT_Y = 174;
const CONVEYOR_Y = 34;
const SPLAT_LIFE = 380;                  // ms

// Difficulty (§117.A): fallInterval = max(fm, f0 - score*fk); spawn likewise.
const DIFF = {
  A: { f0: 520, fm: 205, fk: 4, s0: 1150, sm: 540, sk: 5 },
  B: { f0: 400, fm: 175, fk: 4, s0: 830, sm: 440, sk: 5 },
};

const SEG_LIT = COLORS.accent;
const SEG_DIM = `${COLORS.accent}1f`;    // ~12% — the "ghost" segment aesthetic
const reducedMotion = typeof window !== 'undefined'
  && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ─── Game model (mutable, lives in a ref; rAF mutates, React renders) ───────
function freshGame(mode) {
  return {
    phase: 'playing', mode, balls: [], score: 0, misses: 0, catcher: 1,
    splats: [], flash: 0, fallAcc: 0, spawnAcc: 0, ballId: 0, splatId: 0,
  };
}
function activeLanes(G) {
  if (G.mode === 'A') {
    const inactive = Math.min(G.misses, 3);   // §117.A inactiveLane()
    return [0, 1, 2, 3].filter((l) => l !== inactive);
  }
  return [0, 1, 2, 3];
}
function spawnTick(G) {
  const lanes = activeLanes(G).filter((l) => !G.balls.some((b) => b.lane === l && b.step <= 1));
  if (!lanes.length) return;
  const lane = lanes[Math.floor(Math.random() * lanes.length)];
  G.balls.push({ id: G.ballId++, lane, step: 0 });
}
function fallTick(G, sfx) {
  const survivors = [];
  for (const b of G.balls) {
    const ns = b.step + 1;
    if (ns > CATCH) doMiss(G, b.lane, sfx);    // step>CATCH → miss + remove
    else survivors.push({ ...b, step: ns });
  }
  G.balls = survivors;
  tryCatch(G, sfx);
}
function tryCatch(G, sfx) {
  const remaining = [];
  let caught = false;
  for (const b of G.balls) {
    if (b.step === CATCH && b.lane === G.catcher) { caught = true; G.score = Math.min(9999, G.score + 1); afterScore(G); }
    else remaining.push(b);
  }
  if (caught) { G.balls = remaining; sfx.catch(); }
}
function afterScore(G) {
  if (G.score % 100 === 0) G.flash = 8;
  if (G.score === 200 || G.score === 500) G.misses = 0;   // §117.A misses reset
}
function doMiss(G, lane, sfx) {
  G.splats.push({ id: G.splatId++, lane, t: SPLAT_LIFE });
  G.misses += 1;
  sfx.miss();
  if (G.misses >= 3) { G.phase = 'over'; sfx.over(); }
}
function moveCatcher(G, dir, sfx) {
  const next = Math.max(0, Math.min(3, G.catcher + dir));
  if (next === G.catcher) return;
  G.catcher = next;
  tryCatch(G, sfx);                          // tryCatch also fires on every move
}
function snapCatcher(G, lane, sfx) {
  const next = Math.max(0, Math.min(3, lane));
  if (next === G.catcher) return;
  G.catcher = next;
  tryCatch(G, sfx);
}

// ─── Audio (§117.C): bg loop (graceful if asset absent) + WebAudio SFX ──────
function makeAudio() {
  let ctx = null, music = null, musicMuted = false, sfxMuted = false, started = false;
  const ensureCtx = () => {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    // iOS WebAudio unlock — one silent buffer inside the first gesture.
    if (ctx && !ctx.__pbUnlocked) { ctx.__pbUnlocked = true; try { const b = ctx.createBuffer(1, 1, 22050); const s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0); } catch {} }
    return ctx;
  };
  const tone = (steps, type = 'sine') => {
    if (sfxMuted) return;
    const c = ensureCtx(); if (!c) return;
    const t0 = c.currentTime;
    steps.forEach(([freq, at, dur], i) => {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t0 + at);
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(0.18, t0 + at + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0 + at); o.stop(t0 + at + dur + 0.02);
    });
  };
  return {
    // First in-game gesture: init ctx + start bg music (respects iOS silent switch).
    start() {
      if (started) return; started = true;
      ensureCtx();
      try {
        music = new Audio(`${import.meta.env.BASE_URL}sounds/sky-catcher-loop60.m4a`);
        music.loop = true; music.volume = 0.5;
        if (!musicMuted) music.play().catch(() => {});   // 404 / autoplay block → silent
      } catch { music = null; }
    },
    catch() { tone([[880, 0, 0.08], [1318, 0.06, 0.1]]); },
    miss() { tone([[150, 0, 0.22]], 'sawtooth'); },
    over() { tone([[440, 0, 0.16], [330, 0.16, 0.16], [247, 0.32, 0.16], [196, 0.48, 0.26]]); },
    blip() { tone([[660, 0, 0.05]], 'square'); },
    setMusicMuted(m) { musicMuted = m; if (music) { if (m) music.pause(); else music.play().catch(() => {}); } },
    setSfxMuted(m) { sfxMuted = m; },
    dispose() { try { if (music) { music.pause(); music.src = ''; } } catch {} try { if (ctx) ctx.close(); } catch {} },
  };
}

// ─── 7-segment digit (§117.A 7-seg) ─────────────────────────────────────────
const SEG = { a: [4, 0, 12, 4], b: [16, 4, 4, 12], c: [16, 20, 4, 12], d: [4, 32, 12, 4], e: [0, 20, 4, 12], f: [0, 4, 4, 12], g: [4, 16, 12, 4] };
const SEG7 = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgcde', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
function Digit({ n }) {
  const on = SEG7[n] || '';
  return (
    <svg width="20" height="36" viewBox="0 0 20 36" style={{ display: 'block' }} aria-hidden>
      {Object.entries(SEG).map(([k, [x, y, w, h]]) => (
        <rect key={k} x={x} y={y} width={w} height={h} rx={1.4}
          fill={on.includes(k) ? SEG_LIT : SEG_DIM} />
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

// ─── Art-slot layers (swappable) ────────────────────────────────────────────
function GhostGrid() {
  return (
    <g aria-hidden>
      {LANE.map((x, li) => STEP_Y.map((y, si) => (
        <circle key={`${li}-${si}`} cx={x} cy={y} r={7} fill="none" stroke={`${COLORS.accent}14`} strokeWidth={1.5} />
      )))}
    </g>
  );
}
function Conveyors({ t }) {
  const dash = reducedMotion ? 0 : (t / 40) % 16;
  return (
    <g aria-hidden>
      {[[LANE[0] - 18, LANE[1] + 18], [LANE[2] - 18, LANE[3] + 18]].map(([x1, x2], i) => (
        <line key={i} x1={x1} y1={CONVEYOR_Y} x2={x2} y2={CONVEYOR_Y}
          stroke={`${COLORS.accent}40`} strokeWidth={3} strokeLinecap="round"
          strokeDasharray="6 10" strokeDashoffset={-dash} />
      ))}
    </g>
  );
}
function Feeders() {
  return (
    <g aria-hidden>
      {[LANE[0], LANE[3]].map((x, i) => (
        <rect key={i} x={x - 10} y={CONVEYOR_Y - 12} width={20} height={9} rx={2}
          fill={COLORS.surface} stroke={`${COLORS.accent}55`} strokeWidth={1} />
      ))}
    </g>
  );
}
function Ball({ x, y }) {
  return (
    <g aria-hidden>
      <circle cx={x} cy={y} r={8} fill={COLORS.accent} />
      <rect x={x - 8} y={y - 1} width={16} height={2} fill={COLORS.surfaceBar} />
    </g>
  );
}
function Splat({ x }) {
  return (
    <g aria-hidden opacity={0.85}>
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const r = 7, rad = (deg * Math.PI) / 180;
        return <circle key={deg} cx={x + Math.cos(rad) * r} cy={SPLAT_Y + Math.sin(rad) * r} r={2.4} fill={`${COLORS.accent}99`} />;
      })}
      <circle cx={x} cy={SPLAT_Y} r={3.4} fill={COLORS.accent} />
    </g>
  );
}
function Catcher({ lane }) {
  const x = LANE[lane];
  return (
    <g aria-hidden>
      <path d={`M ${x - 16} ${CATCHER_Y - 8} L ${x - 12} ${CATCHER_Y + 6} L ${x + 12} ${CATCHER_Y + 6} L ${x + 16} ${CATCHER_Y - 8}`}
        fill="none" stroke={COLORS.accent} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      <line x1={x - 16} y1={CATCHER_Y - 8} x2={x + 16} y2={CATCHER_Y - 8} stroke={`${COLORS.accent}66`} strokeWidth={2} />
    </g>
  );
}

// ─── Brand mark (amber dot + seam) — matches NavDrawer ReadsBallButton ───────
function ReadsIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'block' }} aria-hidden>
      <circle cx="12" cy="12" r="8" fill={COLORS.accent} />
      <rect x="2" y="11" width="20" height="2" fill={COLORS.bg} />
    </svg>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────
export default function ReadsMiniPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  const gameRef = useRef(freshGame('A'));
  gameRef.current.phase = gameRef.current.phase || 'attract';
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = makeAudio();
  const lastRef = useRef(null);
  const tRef = useRef(0);
  const phaseRef = useRef('attract');

  const [, setFrame] = useState(0);
  const [phase, setPhase] = useState('attract');
  const [attractTab, setAttractTab] = useState('title');   // title ↔ scores
  const [board, setBoard] = useState([]);
  const [myBest, setMyBest] = useState(0);
  const [musicMuted, setMusicMuted] = useState(false);
  const [sfxMuted, setSfxMuted] = useState(false);
  const [initials, setInitials] = useState('AAA');
  const [submitted, setSubmitted] = useState(false);
  const [lastScore, setLastScore] = useState(0);

  // First-gesture audio init.
  const audioStarted = useRef(false);
  const kickAudio = useCallback(() => {
    if (audioStarted.current) return;
    audioStarted.current = true;
    audioRef.current.start();
  }, []);

  // Phase boot: model starts at attract.
  useEffect(() => { gameRef.current = { ...freshGame('A'), phase: 'attract' }; }, []);

  // Load the leaderboard (mount + whenever we return to attract/over).
  const loadBoard = useCallback(async () => {
    try {
      const rows = await ds.getReadsMiniTop(25);
      setBoard(rows);
    } catch { /* board unavailable → arcade plays local-only */ }
    if (uid) { try { const mine = await ds.getReadsMiniMyScore(uid); setMyBest(mine?.score || 0); } catch {} }
  }, [uid]);
  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Attract loop: cycle title ↔ HIGH SCORES.
  useEffect(() => {
    if (phase !== 'attract') return;
    const id = setInterval(() => setAttractTab((v) => (v === 'title' ? 'scores' : 'title')), 4200);
    return () => clearInterval(id);
  }, [phase]);

  // The game loop (rAF, dt-accumulator).
  useEffect(() => {
    let raf;
    const loop = (now) => {
      const G = gameRef.current;
      const sfx = audioRef.current;
      if (lastRef.current == null) lastRef.current = now;
      let dt = now - lastRef.current;
      lastRef.current = now;
      if (dt > 250) dt = 250;                  // tab-switch clamp
      tRef.current += dt;
      if (G.phase === 'playing') {
        const d = DIFF[G.mode];
        const fallInterval = Math.max(d.fm, d.f0 - G.score * d.fk);
        const spawnInterval = Math.max(d.sm, d.s0 - G.score * d.sk);
        G.fallAcc += dt; G.spawnAcc += dt;
        let guard = 0;
        while (G.fallAcc >= fallInterval && guard++ < 12) { G.fallAcc -= fallInterval; fallTick(G, sfx); }
        guard = 0;
        while (G.spawnAcc >= spawnInterval && guard++ < 12) { G.spawnAcc -= spawnInterval; spawnTick(G); }
        if (G.flash > 0) G.flash -= 1;
        if (G.splats.length) G.splats = G.splats.map((s) => ({ ...s, t: s.t - dt })).filter((s) => s.t > 0);
      }
      // Mirror model phase → React (drives the over / initials transition).
      if (G.phase !== phaseRef.current) {
        phaseRef.current = G.phase;
        if (G.phase === 'over') {
          setLastScore(G.score);
          setSubmitted(false);
        }
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

  // Keyboard.
  useEffect(() => {
    const onKey = (e) => {
      kickAudio();
      const G = gameRef.current;
      if (G.phase === 'playing') {
        if (e.key === 'ArrowLeft') { moveCatcher(G, -1, audioRef.current); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { moveCatcher(G, 1, audioRef.current); e.preventDefault(); }
      } else if (G.phase === 'attract' && (e.key === 'Enter' || e.key === ' ')) {
        startGame('A'); e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startGame = useCallback((mode) => {
    kickAudio();
    gameRef.current = freshGame(mode);
    phaseRef.current = 'playing';
    lastRef.current = null;
    setPhase('playing');
  }, [kickAudio]);

  const toAttract = useCallback(() => {
    gameRef.current = { ...freshGame('A'), phase: 'attract' };
    phaseRef.current = 'attract';
    setPhase('attract');
    loadBoard();
  }, [loadBoard]);

  const toggleMusic = () => { const m = !musicMuted; setMusicMuted(m); audioRef.current.setMusicMuted(m); };
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
    try { await ds.submitReadsMiniScore(uid, { initials, score: lastScore, mode: gameRef.current.mode }); } catch {}
    toAttract();
  };

  const isPB = lastScore > 0 && lastScore > myBest;
  const G = gameRef.current;

  // dispose audio on unmount
  useEffect(() => () => { try { audioRef.current?.dispose(); } catch {} }, []);

  return (
    <div data-testid="reads-mini" onPointerDown={kickAudio}
      style={{
        position: 'fixed', inset: 0, height: '100dvh', background: COLORS.bg, zIndex: 60, ...NO_SELECT,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        fontFamily: FONT, color: COLORS.text, overflow: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
      {/* Chrome bar */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', gap: SPACE.sm, padding: `${SPACE.sm}px ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <div role="button" aria-label={t('reads_mini_back') || 'Back'} data-testid="reads-mini-close" onClick={() => navigate('/break')}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}>
          <ChevronLeft size={24} />
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <ReadsIcon size={20} />
          <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, letterSpacing: 1, color: COLORS.textDim }}>READS&nbsp;MINI</span>
        </div>
        <div role="button" aria-label={t('reads_mini_music') || 'Music'} data-testid="reads-mini-music" onClick={toggleMusic}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: musicMuted ? COLORS.textMuted : COLORS.accent }}>
          <Music size={20} style={{ opacity: musicMuted ? 0.4 : 1 }} />
        </div>
        <div role="button" aria-label={t('reads_mini_sfx') || 'Sound effects'} data-testid="reads-mini-sfx" onClick={toggleSfx}
          style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: sfxMuted ? COLORS.textMuted : COLORS.accent }}>
          {sfxMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </div>
      </div>

      {/* HUD: 7-seg score + lives + HI */}
      <div style={{ width: '100%', maxWidth: 480, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${SPACE.lg}px ${SPACE.sm}px`, boxSizing: 'border-box' }}>
        <div data-testid="reads-mini-score" style={{ filter: G.flash > 0 ? 'brightness(1.8)' : 'none', transition: 'filter 80ms' }}>
          <SevenSeg value={phase === 'playing' ? G.score : (phase === 'attract' ? myBest : lastScore)} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <div style={{ display: 'flex', gap: 5 }} data-testid="reads-mini-lives">
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: i < (3 - G.misses) ? COLORS.accent : `${COLORS.accent}26` }} />
            ))}
          </div>
          <div style={{ fontSize: FONT_SIZE.xxs, fontWeight: 800, color: COLORS.textMuted, letterSpacing: 1 }}>
            HI&nbsp;{String(Math.max(myBest, board[0]?.score || 0)).padStart(4, '0')} · {G.mode}
          </div>
        </div>
      </div>

      {/* Play field */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, flex: '0 1 auto', padding: `0 ${SPACE.md}px`, boxSizing: 'border-box' }}>
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ display: 'block', maxHeight: '52vh', background: COLORS.surfaceBar, borderRadius: RADIUS.lg, border: `1px solid ${COLORS.border}`, touchAction: 'manipulation' }}>
          <GhostGrid />
          <Conveyors t={tRef.current} />
          <Feeders />
          {/* lane tap zones */}
          {LANE.map((x, li) => (
            <rect key={li} x={x - 35} y={0} width={70} height={VB_H} fill="transparent"
              data-testid={`reads-mini-lane-${li}`} style={{ cursor: 'pointer' }}
              onPointerDown={() => { kickAudio(); if (gameRef.current.phase === 'playing') snapCatcher(gameRef.current, li, audioRef.current); }} />
          ))}
          {G.balls.map((b) => <Ball key={b.id} x={LANE[b.lane]} y={STEP_Y[b.step] || STEP_Y[CATCH]} />)}
          {G.splats.map((s) => <Splat key={s.id} x={LANE[s.lane]} />)}
          {phase === 'playing' && <Catcher lane={G.catcher} />}
        </svg>

        {/* Overlays */}
        {phase === 'attract' && <AttractOverlay tab={attractTab} board={board} myBest={myBest} onStart={startGame} t={t} />}
        {phase === 'over' && (
          <OverOverlay score={lastScore} isPB={isPB} initials={initials} submitted={submitted}
            onBump={bumpInitial} onSubmit={submitScore} onRestart={() => startGame(G.mode)} onAttract={toAttract} hasUid={!!uid} t={t} />
        )}
      </div>

      {/* D-pad */}
      {phase === 'playing' && (
        <div style={{ width: '100%', maxWidth: 480, display: 'flex', gap: SPACE.md, padding: SPACE.lg, boxSizing: 'border-box' }}>
          <DpadBtn testId="reads-mini-left" onPress={() => moveCatcher(gameRef.current, -1, audioRef.current)} ariaLabel={t('reads_mini_left') || 'Left'}><ChevronLeft size={32} /></DpadBtn>
          <DpadBtn testId="reads-mini-right" onPress={() => moveCatcher(gameRef.current, 1, audioRef.current)} ariaLabel={t('reads_mini_right') || 'Right'}><ChevronRight size={32} /></DpadBtn>
        </div>
      )}
    </div>
  );
}

function DpadBtn({ children, onPress, testId, ariaLabel }) {
  return (
    <button type="button" data-testid={testId} aria-label={ariaLabel}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }} onContextMenu={(e) => e.preventDefault()}
      style={{ ...ARCADE_BTN, flex: 1, minHeight: 64 }}>
      {children}
    </button>
  );
}

function AttractOverlay({ tab, board, myBest, onStart, t }) {
  return (
    <div style={overlayStyle} data-testid="reads-mini-attract">
      {tab === 'title' ? (
        <>
          <ReadsIcon size={48} />
          <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1, marginTop: SPACE.sm }}>{t('reads_mini_title') || 'Take a Break'}</div>
          <div style={{ fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 4 }}>{t('reads_mini_tagline') || 'Make the read.'}</div>
          <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.lg }}>
            <StartBtn testId="reads-mini-start-a" onClick={() => onStart('A')} label={t('reads_mini_game_a') || 'Game A'} sub={t('reads_mini_game_a_sub') || '3 lanes'} />
            <StartBtn testId="reads-mini-start-b" onClick={() => onStart('B')} label={t('reads_mini_game_b') || 'Game B'} sub={t('reads_mini_game_b_sub') || '4 · fast'} />
          </div>
          <div style={{ fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: SPACE.md, letterSpacing: 1 }}>
            {(t('reads_mini_press_start') || 'PRESS START')} · HI {String(Math.max(myBest, board[0]?.score || 0)).padStart(4, '0')}
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
    <div data-testid="reads-mini-scores" style={{ width: '100%', maxWidth: 280 }}>
      <div style={{ textAlign: 'center', fontSize: FONT_SIZE.lg, fontWeight: 900, letterSpacing: 2, color: COLORS.accent, marginBottom: SPACE.md }}>{t('reads_mini_high_scores') || 'HIGH SCORES'}</div>
      {rows.length === 0 && <div style={{ textAlign: 'center', fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{t('reads_mini_no_scores') || 'Be the first.'}</div>}
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
    <div style={overlayStyle} data-testid="reads-mini-over">
      <div style={{ fontSize: FONT_SIZE.xl, fontWeight: 900, letterSpacing: 1 }}>{t('reads_mini_game_over') || 'GAME OVER'}</div>
      <div style={{ marginTop: SPACE.sm }}><SevenSeg value={score} /></div>
      {isPB && hasUid ? (
        <div data-testid="reads-mini-initials" style={{ marginTop: SPACE.md, textAlign: 'center' }}>
          <div style={{ fontSize: FONT_SIZE.sm, fontWeight: 800, color: COLORS.accent, letterSpacing: 1 }}>{t('reads_mini_new_best') || 'NEW BEST — ENTER INITIALS'}</div>
          <div style={{ display: 'flex', gap: SPACE.md, justifyContent: 'center', marginTop: SPACE.sm }}>
            {[0, 1, 2].map((idx) => (
              <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <button type="button" aria-label={`up-${idx}`} data-testid={`reads-mini-initial-up-${idx}`} onClick={() => onBump(idx, 1)} style={initBtnStyle}><ChevronLeft size={18} style={{ transform: 'rotate(90deg)' }} /></button>
                <span style={{ fontSize: 30, fontWeight: 900, color: COLORS.accent, width: 26, textAlign: 'center' }}>{initials[idx]}</span>
                <button type="button" aria-label={`down-${idx}`} data-testid={`reads-mini-initial-down-${idx}`} onClick={() => onBump(idx, -1)} style={initBtnStyle}><ChevronRight size={18} style={{ transform: 'rotate(90deg)' }} /></button>
              </div>
            ))}
          </div>
          <button type="button" data-testid="reads-mini-submit" disabled={submitted} onClick={onSubmit}
            style={{ marginTop: SPACE.md, padding: '12px 28px', minHeight: TOUCH.minTarget, background: COLORS.accent, color: COLORS.black, border: 'none', borderRadius: RADIUS.lg, fontWeight: 900, fontSize: FONT_SIZE.base, letterSpacing: 1, cursor: 'pointer', opacity: submitted ? 0.5 : 1 }}>
            {t('reads_mini_save') || 'SAVE'}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: SPACE.md, marginTop: SPACE.lg }}>
          <StartBtn testId="reads-mini-retry" onClick={onRestart} label={t('reads_mini_retry') || 'Retry'} sub={<Play size={14} />} />
          <StartBtn testId="reads-mini-home" onClick={onAttract} label={t('reads_mini_menu') || 'Menu'} sub="↩" />
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
