import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EmptyState, ActionSheet } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, TEAM_COLORS } from '../utils/theme';
import { computeDeathAttribution, formatKills } from '../utils/deathAttribution';

// Truncate scope-pill labels so long tournament/match names don't blow out
// the row width on phone (~358 px usable inside maxWidth 640 with 16 px pad).
const truncate = (s, n = 20) => (!s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s);

// § 61 Stage 3: hide density layer when sample size is too small (< 5 points).
// Markers still render. Mathematically the density gradient is meaningless on
// 1–4 points; UI is also visually cleaner without it on single-match / single-point scopes.
const DENSITY_MIN_POINTS = 5;

function mirrorToLeft(players, fieldSide) {
  if (!players) return [];
  return players.map(p => p && fieldSide === 'right' ? { ...p, x: 1 - p.x } : p);
}

function forceLeft(p) {
  if (!p) return null;
  return p.x > 0.5 ? { ...p, x: 1 - p.x } : p;
}

function extractData(points, mode) {
  const deaths = [], positions = [], runners = [], bumpData = [];
  points.forEach(pt => {
    const ctx = pt._ctx || {};
    const sides = [
      { data: pt.homeData || pt.teamA, side: 'A' },
      { data: pt.awayData || pt.teamB, side: 'B' },
    ].filter(s => s.data);
    sides.forEach(({ data: d, side }) => {
      if (!d.players) return;
      const fs = d.fieldSide || pt.fieldSide || 'left';
      const mirrored = mirrorToLeft(d.players, fs).map(forceLeft);
      const mirroredBumps = mirrorToLeft(d.bumpStops || [], fs).map(forceLeft);
      const rn = d.runners || [];
      const elims = d.eliminations || [];
      mirrored.forEach((p, i) => {
        if (!p) return;
        if (elims[i]) deaths.push({ ...p, _ctx: ctx, side, playerIdx: i });
        positions.push(p);
        if (rn[i]) runners.push(p);
        if (mirroredBumps[i]) bumpData.push({ from: p, to: mirroredBumps[i] });
      });
    });
  });
  return { deaths, positions, runners, bumpData };
}

const MODES = {
  deaths: { title: 'Deaths heatmap', icon: '💀', emptyText: 'No elimination data yet', loadingText: 'Loading elimination data...' },
  breaks: { title: 'Break positions', icon: '🎯', emptyText: 'No scouted data yet', loadingText: 'Loading break data...' },
};

export default function LayoutAnalyticsPage() {
  const { layoutId, mode } = useParams();
  const cfg = MODES[mode] || MODES.deaths;
  const { layouts } = useLayouts();
  const { t } = useLanguage();
  const layout = layouts.find(l => l.id === layoutId);
  const [loading, setLoading] = useState(true);
  // allPoints: raw point docs from fetchLayoutDeaths (with _ctx ids). Derived
  // `data` lives in a useMemo below so Stage 3 scope filter can rebuild it.
  const [allPoints, setAllPoints] = useState([]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [imgObj, setImgObj] = useState(null);
  const [size, setSize] = useState({ w: 600, h: 400 });

  // § 61 scope filter (Stage 2) — pills + pickers. State only; Stage 3 wires
  // it to data filtering. Level 'layout' = default = all points (current
  // behavior). Deeper levels carry the selected id chain.
  const [scope, setScope] = useState({
    level: 'layout',         // 'layout' | 'tournament' | 'match' | 'point'
    tournamentId: null,
    matchId: null,
    pointId: null,
  });
  const [pickerOpen, setPickerOpen] = useState(null); // 'tournament' | 'match' | 'point' | null

  useEffect(() => {
    if (!layout?.fieldImage) { setImgObj(null); return; }
    const img = new Image();
    img.onload = () => setImgObj(img);
    img.src = layout.fieldImage;
  }, [layout?.fieldImage]);

  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const obs = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (imgObj) {
        const aspectH = Math.floor(w * (imgObj.height / imgObj.width));
        const maxH = typeof window !== 'undefined' ? window.innerHeight - 90 : 500;
        const h = Math.min(aspectH, maxH);
        setSize({ w: h === aspectH ? w : Math.floor(h * (imgObj.width / imgObj.height)), h });
      } else {
        setSize({ w, h: Math.min(w * 0.65, 400) });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [imgObj]);

  useEffect(() => {
    if (!layoutId) return;
    setLoading(true);
    ds.fetchLayoutDeaths(layoutId).then(points => {
      setAllPoints(points || []);
      setLoading(false);
    }).catch(() => { setAllPoints([]); setLoading(false); });
  }, [layoutId]);

  // § 61 Stage 3: filter raw points by scope before flattening into the
  // render-data structure. All downstream consumers (canvas density, skull
  // clusters, table, attribution memo) auto-update when scope changes.
  const filteredPoints = useMemo(() => {
    if (scope.level === 'layout') return allPoints;
    if (scope.level === 'tournament') return allPoints.filter(p => p._ctx?.tournamentId === scope.tournamentId);
    if (scope.level === 'match') return allPoints.filter(p => p._ctx?.matchId === scope.matchId);
    if (scope.level === 'point') return allPoints.filter(p => p._ctx?.pointId === scope.pointId);
    return allPoints;
  }, [allPoints, scope]);

  // Derived view data — now sourced from filtered points so heatmap + table
  // both respect the scope filter.
  const data = useMemo(() => extractData(filteredPoints, mode), [filteredPoints, mode]);

  // § 61 Stage 3 (prep for Stages 4–5): compute attribution for the filtered
  // points. Each point is evaluated twice (once per side as defender) so we
  // capture deaths on both sides. Stage 4 consumes `perDeath` to render the
  // "Pozycja strzelca" column; Stage 5 consumes `shooterMarkers` to render
  // marker glyphs with kill-credit badges.
  //
  // No rendering here — this commit only prepares the shape.
  const attributionData = useMemo(() => {
    if (!layout || !filteredPoints.length) return { perDeath: [], shooterMarkers: [] };
    const perDeath = [];
    const shooterAgg = new Map(); // cluster shooters at the same coord (rounded to 0.01)
    filteredPoints.forEach(point => {
      ['home', 'away'].forEach(sideAsDef => {
        const result = computeDeathAttribution(point, layout, sideAsDef);
        result.eliminations.forEach(elim => {
          perDeath.push({
            pointId: point._ctx?.pointId,
            pointIdx: point._ctx?.pointIdx,
            tournament: point._ctx?.tournament,
            match: point._ctx?.match,
            defenderSide: sideAsDef === 'home' ? 'A' : 'B',
            defenderSlot: elim.defenderSlot,
            defenderPos: elim.defenderPos,
            defenderBunker: elim.defenderBunker,
            defenderZone: elim.defenderZone,
            attributors: elim.attributors,
            shareEach: elim.shareEach,
          });
          elim.attributors.forEach(att => {
            // Same forceLeft normalization as skulls so shooter markers
            // overlay correctly on the left-half rendering.
            const sx = att.shooterPos.x > 0.5 ? 1 - att.shooterPos.x : att.shooterPos.x;
            const sy = att.shooterPos.y;
            const team = sideAsDef === 'home' ? 'B' : 'A';
            const key = `${team}-${Math.round(sx * 100)}-${Math.round(sy * 100)}`;
            const prev = shooterAgg.get(key) || {
              x: sx, y: sy, team,
              shooterBunker: att.shooterBunker,
              credit: 0,
            };
            prev.credit += elim.shareEach;
            shooterAgg.set(key, prev);
          });
        });
      });
    });
    return { perDeath, shooterMarkers: Array.from(shooterAgg.values()) };
  }, [filteredPoints, layout]);

  // Density gate — Stage 3 hides density when sample size too small.
  const densityEnabled = filteredPoints.length >= DENSITY_MIN_POINTS;

  // § 61 Stage 4: per-death attributor lookup keyed by `pointId|side|slot`.
  // Each table row finds its attributors here to render "Pozycja strzelca".
  const attributionByDeath = useMemo(() => {
    const map = new Map();
    attributionData.perDeath.forEach(entry => {
      const key = `${entry.pointId}|${entry.defenderSide}|${entry.defenderSlot}`;
      map.set(key, entry.attributors);
    });
    return map;
  }, [attributionData]);

  // ── Scope pickers — available entities derived from raw allPoints ──
  // Tournament list: unique {id, name} pairs across all points.
  const availableTournaments = useMemo(() => {
    const seen = new Map();
    allPoints.forEach(p => {
      const id = p._ctx?.tournamentId;
      if (!id || seen.has(id)) return;
      seen.set(id, { id, name: p._ctx.tournament || id });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPoints]);

  // Match list — filtered to the selected tournament (if any).
  const availableMatches = useMemo(() => {
    if (!scope.tournamentId) return [];
    const seen = new Map();
    allPoints.forEach(p => {
      if (p._ctx?.tournamentId !== scope.tournamentId) return;
      const id = p._ctx.matchId;
      if (!id || seen.has(id)) return;
      seen.set(id, { id, name: p._ctx.match || id });
    });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allPoints, scope.tournamentId]);

  // Point list — filtered to the selected match (if any).
  // Includes a few derived fields for the picker label (point index +
  // elim count + winner letter).
  const availablePoints = useMemo(() => {
    if (!scope.matchId) return [];
    const rows = [];
    allPoints.forEach(p => {
      if (p._ctx?.matchId !== scope.matchId) return;
      const id = p._ctx.pointId;
      if (!id) return;
      const home = p.homeData || p.teamA || {};
      const away = p.awayData || p.teamB || {};
      const elimCount = ((home.eliminations || []).filter(Boolean).length)
        + ((away.eliminations || []).filter(Boolean).length);
      const outcome = p.outcome || '';
      const winner = outcome === 'win_a' ? 'A' : outcome === 'win_b' ? 'B' : '—';
      rows.push({ id, pointIdx: p._ctx.pointIdx || 0, elimCount, winner });
    });
    return rows.sort((a, b) => a.pointIdx - b.pointIdx);
  }, [allPoints, scope.matchId]);

  // Resolved display labels for selected entities (used on the pills + ✕).
  const selectedTournamentName = useMemo(
    () => availableTournaments.find(t => t.id === scope.tournamentId)?.name || null,
    [availableTournaments, scope.tournamentId]
  );
  const selectedMatchName = useMemo(
    () => availableMatches.find(m => m.id === scope.matchId)?.name || null,
    [availableMatches, scope.matchId]
  );
  const selectedPointRow = useMemo(
    () => availablePoints.find(p => p.id === scope.pointId) || null,
    [availablePoints, scope.pointId]
  );

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas || !data) return;
    const ctx = canvas.getContext('2d');
    const { w, h } = size;
    canvas.width = w * 2; canvas.height = h * 2; ctx.scale(2, 2);

    if (imgObj) {
      ctx.drawImage(imgObj, 0, 0, w, h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = COLORS.surface; ctx.fillRect(0, 0, w, h);
    }

    const gridSize = 8;
    const cols = Math.ceil(w / gridSize), rows = Math.ceil(h / gridSize);

    const buildGrid = (pts, radius) => {
      const grid = new Float32Array(cols * rows);
      pts.forEach(pos => {
        const cx = pos.x * w, cy = pos.y * h;
        const x0 = Math.max(0, Math.floor((cx - radius) / gridSize));
        const y0 = Math.max(0, Math.floor((cy - radius) / gridSize));
        const x1 = Math.min(cols - 1, Math.ceil((cx + radius) / gridSize));
        const y1 = Math.min(rows - 1, Math.ceil((cy + radius) / gridSize));
        for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) {
          const dx = gx * gridSize + gridSize / 2 - cx, dy = gy * gridSize + gridSize / 2 - cy;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < radius) { const wt = 1 - d / radius; grid[gy * cols + gx] += wt * wt; }
        }
      });
      let max = 0; for (let i = 0; i < grid.length; i++) if (grid[i] > max) max = grid[i];
      return { grid, max };
    };

    const renderGrid = (grid, max, colorFn) => {
      if (max <= 0) return;
      for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
        const v = grid[gy * cols + gx]; if (v < 0.005) continue;
        ctx.fillStyle = colorFn(Math.min(1, v / max));
        ctx.fillRect(gx * gridSize, gy * gridSize, gridSize, gridSize);
      }
    };

    if (mode === 'deaths') {
      // Red heatmap — density layer gated by densityEnabled (§ 61 Stage 3).
      // Skull clusters still render below regardless of density flag.
      if (data.deaths.length && densityEnabled) {
        const { grid, max } = buildGrid(data.deaths, 22);
        renderGrid(grid, max, t => {
          const r = Math.round(239 + (220 - 239) * t);
          const g = Math.round(68 + (38 - 68) * t);
          const b = Math.round(68 + (38 - 68) * t);
          return `rgba(${r},${g},${b},${Math.min(0.85, t * 0.85 + 0.12)})`;
        });
      }
      if (data.deaths.length) {
        // Skull clusters
        const CLUSTER_DIST = 0.04, used = new Set(), clusters = [];
        data.deaths.forEach((d, i) => {
          if (used.has(i)) return;
          const cluster = [d]; used.add(i);
          data.deaths.forEach((d2, j) => {
            if (used.has(j)) return;
            if (Math.sqrt((d.x - d2.x) ** 2 + (d.y - d2.y) ** 2) < CLUSTER_DIST) { cluster.push(d2); used.add(j); }
          });
          clusters.push({ x: cluster.reduce((s, c) => s + c.x, 0) / cluster.length, y: cluster.reduce((s, c) => s + c.y, 0) / cluster.length, count: cluster.length });
        });
        clusters.forEach(cl => {
          ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('💀', cl.x * w, cl.y * h);
          if (cl.count > 1) {
            const bx = cl.x * w + 9, by = cl.y * h - 9;
            ctx.fillStyle = COLORS.danger; ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${cl.count > 9 ? 8 : 9}px sans-serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(cl.count), bx, by);
          }
        });
      }

      // § 61 Stage 5: shooter markers — last z-order so they sit on top of
      // skulls. Each unique shooter standing position (cluster-aggregated at
      // 0.01 resolution in attributionData) renders as a filled circle in the
      // shooter's team color + a 14 px badge with formatKills(credit).
      // Zero-kill markers (shooter placed but no defender match) are NOT
      // rendered in v1 — decision per CLAUDE.md "smaller-scope option":
      // they add visual noise without information. If checkpoint feedback
      // disagrees, fold them in next iteration.
      attributionData.shooterMarkers.forEach(m => {
        if (!m || m.credit <= 0) return;
        const mx = m.x * w, my = m.y * h;
        const team = TEAM_COLORS[m.team] || TEAM_COLORS.A;
        // Marker glyph: 10 px diameter filled circle with white 1.5 px ring
        ctx.beginPath();
        ctx.arc(mx, my, 5, 0, Math.PI * 2);
        ctx.fillStyle = team;
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
        // Credit badge — 14 px diameter, offset NE of the marker so it sits
        // alongside but never collides with a skull on the same coordinate
        const label = formatKills(m.credit);
        const bx = mx + 8, by = my - 8;
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fillStyle = team;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${label.length > 2 ? 7 : 8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, bx, by);
      });
    } else {
      // Amber heatmap
      if (data.positions.length) {
        const { grid, max } = buildGrid(data.positions, 20);
        renderGrid(grid, max, t => {
          const r = Math.round(250 + (239 - 250) * t);
          const g = Math.round(204 + (68 - 204) * t);
          const b = Math.round(21 + (68 - 21) * t);
          return `rgba(${r},${g},${b},${Math.min(0.88, t * 0.85 + 0.12)})`;
        });
        // Bump arrows
        data.bumpData.forEach(({ from, to }) => {
          ctx.strokeStyle = COLORS.bumpStop + '40'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 2]);
          ctx.beginPath(); ctx.moveTo(from.x * w, from.y * h); ctx.lineTo(to.x * w, to.y * h); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(to.x * w, to.y * h, 3, 0, Math.PI * 2); ctx.fillStyle = COLORS.bumpStop + '60'; ctx.fill();
        });
        // Dots + triangles
        const runSet = new Set(data.runners.map(r => `${r.x},${r.y}`));
        data.positions.forEach(p => {
          if (runSet.has(`${p.x},${p.y}`)) return;
          ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fill();
        });
        data.runners.forEach(p => {
          const tx = p.x * w, ty = p.y * h, s = 4;
          ctx.beginPath(); ctx.moveTo(tx, ty - s); ctx.lineTo(tx + s, ty + s * 0.7); ctx.lineTo(tx - s, ty + s * 0.7); ctx.closePath();
          ctx.fillStyle = 'rgba(34,197,94,0.55)'; ctx.fill();
        });
      }
    }
  }, [size, imgObj, data, mode, densityEnabled, attributionData]);

  // § 61 Stage 5: canvas tap detection for markers. Stub for now —
  // Stage 6 wires real cross-filter behavior (skull tap, shooter tap,
  // empty-area reset). Hit radius normalized so the effective tap target
  // is ~44 px regardless of canvas size (per § 27 touch-target rule).
  const handleCanvasClick = useCallback((e) => {
    if (mode !== 'deaths') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const { w, h } = size;
    if (w <= 0 || h <= 0) return;
    const nx = px / w;
    const ny = py / h;
    // 22 px hit radius converted to normalized space (using the smaller axis
    // so the target stays a circle on portrait/landscape).
    const HIT_R = 22 / Math.min(w, h);
    for (const m of attributionData.shooterMarkers) {
      const dx = m.x - nx;
      const dy = m.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
        // Stage 6 replaces this with setFilter({ mode: 'shooter', id: ... }).
        return;
      }
    }
    // Stage 6 will add skull hit-test + empty-area reset here.
  }, [mode, size, attributionData]);

  const hasData = data && (mode === 'deaths' ? data.deaths.length : data.positions.length);
  // § 61 Stage 3: distinguish "no data globally" (preserves the original
  // empty state) from "filter excluded everything" (keep pills visible so
  // the user can rescope without leaving the page).
  const noDataGlobal = !loading && allPoints.length === 0;
  const noDataInScope = !loading && allPoints.length > 0 && filteredPoints.length === 0;

  // Count-line label reflects the active scope so it's not stuck on
  // "across all tournaments" after filtering down.
  const scopeCountLabel = (() => {
    if (scope.level === 'tournament') return ` · ${selectedTournamentName || '?'}`;
    if (scope.level === 'match') return ` · ${selectedMatchName || '?'}`;
    if (scope.level === 'point') return ` · ${selectedTournamentName || '?'} · ${t('deaths_point_short', selectedPointRow?.pointIdx || '?')}`;
    return ' across all tournaments';
  })();

  return (
    <div style={{ height: '100dvh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: `/layout/${layoutId}` }} title={cfg.title} subtitle={layout?.name || 'Layout'} />
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', paddingBottom: 80 }}>
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '40px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.accent, animation: 'spin 1s linear infinite' }} />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted }}>{cfg.loadingText}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {noDataGlobal && <EmptyState icon={cfg.icon} text={cfg.emptyText} />}
        {!loading && !noDataGlobal && (<>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            {mode === 'deaths'
              ? <span>{data.deaths.length} eliminations{scopeCountLabel}</span>
              : <>
                  <span>● {data.positions.length} positions</span>
                  <span style={{ color: COLORS.success }}>▲ {data.runners.length} runners</span>
                  <span style={{ color: COLORS.bumpStop }}>◇ {data.bumpData.length} bumps</span>
                </>
            }
          </div>

          {/* § 61 scope filter — Stage 2 (state + pills + pickers only; */}
          {/* Stage 3 will wire `scope` to filter data above this point).  */}
          {mode === 'deaths' && allPoints.length > 0 && (() => {
            const Pill = ({ active, label, onClick, hasClear, onClear }) => (
              <div onClick={onClick} style={{
                padding: '6px 12px', borderRadius: 8,
                background: active ? '#f59e0b08' : 'transparent',
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                color: active ? COLORS.accent : COLORS.textDim,
                fontFamily: FONT, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', minHeight: 44,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span>{label}</span>
                {hasClear && (
                  <span
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    style={{ fontSize: 12, opacity: 0.75, padding: '4px 6px', marginLeft: 2, cursor: 'pointer', lineHeight: 1 }}
                  >✕</span>
                )}
              </div>
            );

            const resetScope = () => setScope({ level: 'layout', tournamentId: null, matchId: null, pointId: null });
            const clearTournament = () => setScope({ level: 'layout', tournamentId: null, matchId: null, pointId: null });
            const clearMatch = () => setScope(s => ({ level: 'tournament', tournamentId: s.tournamentId, matchId: null, pointId: null }));
            const clearPoint = () => setScope(s => ({ level: 'match', tournamentId: s.tournamentId, matchId: s.matchId, pointId: null }));

            return (
              <div style={{ display: 'flex', gap: 8, padding: '4px 0 0', flexWrap: 'wrap' }}>
                <Pill
                  active={scope.level === 'layout'}
                  label={t('deaths_scope_all_layout')}
                  onClick={resetScope}
                />
                {scope.tournamentId && (
                  <Pill
                    active={scope.level === 'tournament'}
                    label={truncate(selectedTournamentName)}
                    onClick={() => setPickerOpen('tournament')}
                    hasClear={scope.level === 'tournament'}
                    onClear={clearTournament}
                  />
                )}
                {scope.matchId && (
                  <Pill
                    active={scope.level === 'match'}
                    label={truncate(selectedMatchName)}
                    onClick={() => setPickerOpen('match')}
                    hasClear={scope.level === 'match'}
                    onClear={clearMatch}
                  />
                )}
                {scope.pointId && (
                  <Pill
                    active={scope.level === 'point'}
                    label={t('deaths_point_short', selectedPointRow?.pointIdx || '?')}
                    onClick={() => setPickerOpen('point')}
                    hasClear={scope.level === 'point'}
                    onClear={clearPoint}
                  />
                )}
                {scope.level === 'layout' && availableTournaments.length > 0 && (
                  <Pill label={t('deaths_scope_tournament_picker')} onClick={() => setPickerOpen('tournament')} />
                )}
                {scope.level === 'tournament' && availableMatches.length > 0 && (
                  <Pill label={t('deaths_scope_match_picker')} onClick={() => setPickerOpen('match')} />
                )}
                {scope.level === 'match' && availablePoints.length > 0 && (
                  <Pill label={t('deaths_scope_point_picker')} onClick={() => setPickerOpen('point')} />
                )}
              </div>
            );
          })()}

          {noDataInScope && (
            <EmptyState icon="🔍" text={t('deaths_empty_filtered')} />
          )}

          {!noDataInScope && (<>
          <div ref={containerRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
            <canvas
              ref={canvasRef}
              onClick={handleCanvasClick}
              style={{ width: size.w, height: size.h, borderRadius: RADIUS.lg, display: 'block', border: `1px solid ${COLORS.border}`, cursor: mode === 'deaths' ? 'pointer' : 'default' }}
            />
          </div>
          {mode === 'deaths' && data.deaths.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: RADIUS.md, border: `1px solid ${COLORS.border}`, marginTop: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT, fontSize: FONT_SIZE.xxs }}>
                <thead>
                  <tr style={{ position: 'sticky', top: 0, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>Tournament</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>Match</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>Pt</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>Side</th>
                    <th style={{ padding: '6px 8px', textAlign: 'center', color: COLORS.textMuted, fontWeight: 600 }}>P#</th>
                    <th style={{ padding: '6px 8px', textAlign: 'left', color: COLORS.textMuted, fontWeight: 600 }}>{t('deaths_col_shooter_pos')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.deaths.map((d, i) => {
                    const key = `${d._ctx?.pointId}|${d.side}|${d.playerIdx}`;
                    const attributors = attributionByDeath.get(key) || [];
                    const shooterLabel = attributors.length
                      ? attributors.map(a => a.shooterBunker?.positionName || '?').join(' · ')
                      : null;
                    return (
                      <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
                        <td style={{ padding: '4px 8px', color: COLORS.textDim }}>{i + 1}</td>
                        <td style={{ padding: '4px 8px', color: COLORS.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d._ctx?.tournament || '?'}</td>
                        <td style={{ padding: '4px 8px', color: COLORS.text, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d._ctx?.match || '?'}</td>
                        <td style={{ padding: '4px 8px', color: COLORS.accent, textAlign: 'center' }}>{d._ctx?.pointIdx || '?'}</td>
                        <td style={{ padding: '4px 8px', color: d.side === 'A' ? COLORS.danger : COLORS.info, textAlign: 'center' }}>{d.side || '?'}</td>
                        <td style={{ padding: '4px 8px', color: COLORS.textDim, textAlign: 'center' }}>P{(d.playerIdx || 0) + 1}</td>
                        <td style={{ padding: '4px 8px', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: shooterLabel ? COLORS.text : COLORS.textDim, fontStyle: shooterLabel ? 'normal' : 'italic' }}>{shooterLabel || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </>)}
        </>)}
      </div>

      {/* § 61 scope filter — picker bottom sheets (Stage 2). Render at root
          of page so they overlay everything. ActionSheet is the canonical
          bottom-sheet primitive from ui.jsx; row labels are flat strings
          because ActionSheet doesn't support subtitle rows. */}
      <ActionSheet
        open={pickerOpen === 'tournament'}
        onClose={() => setPickerOpen(null)}
        title={t('deaths_pick_tournament')}
        actions={availableTournaments.map(tt => ({
          label: tt.name,
          onPress: () => setScope({ level: 'tournament', tournamentId: tt.id, matchId: null, pointId: null }),
        }))}
      />
      <ActionSheet
        open={pickerOpen === 'match'}
        onClose={() => setPickerOpen(null)}
        title={t('deaths_pick_match')}
        actions={availableMatches.map(m => ({
          label: m.name,
          onPress: () => setScope(s => ({ level: 'match', tournamentId: s.tournamentId, matchId: m.id, pointId: null })),
        }))}
      />
      <ActionSheet
        open={pickerOpen === 'point'}
        onClose={() => setPickerOpen(null)}
        title={t('deaths_pick_point')}
        actions={availablePoints.map(p => ({
          label: `${t('deaths_point_short', p.pointIdx)} · ${p.winner} · ${p.elimCount} elim`,
          onPress: () => setScope(s => ({ level: 'point', tournamentId: s.tournamentId, matchId: s.matchId, pointId: p.id })),
        }))}
      />
    </div>
  );
}
