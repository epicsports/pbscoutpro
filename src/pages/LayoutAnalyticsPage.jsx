import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { EmptyState, ActionSheet } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { useDevice } from '../hooks/useDevice';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, responsive } from '../utils/theme';
import { computeDeathAttribution } from '../utils/deathAttribution';
import AnalyticsCanvas from '../components/canvas/AnalyticsCanvas';
import HitabilityAnalyticsSection from '../components/hitability/HitabilityAnalyticsSection';

// Truncate scope-pill labels so long tournament/match names don't blow out
// the row width on phone (~358 px usable inside maxWidth 640 with 16 px pad).
const truncate = (s, n = 20) => (!s ? '' : s.length > n ? s.slice(0, n - 1) + '…' : s);

// § 61 Stage 3: hide density layer when sample size is too small (< 5 points).
// Markers still render. Mathematically the density gradient is meaningless on
// 1–4 points; UI is also visually cleaner without it on single-match / single-point scopes.
const DENSITY_MIN_POINTS = 5;

// § 61 hotfix 2026-05-12 Bug 3: shooter cluster bucket size. Shooters at the
// same normalized coord round into the same bucket and aggregate into a
// single marker. Was implicitly 0.01 (= 1% of field) via `Math.round(x*100)`;
// real data showed markers visually splintering. 0.02 = 2% bucket gives ~2×
// the cluster radius. Tunable here if iterations show it's still too dense
// (or too coarse). Skulls use a separate 0.04 distance-based cluster that
// already looks fine — left alone.
const SHOOTER_CLUSTER_BUCKET = 0.02;

function mirrorToLeft(players, fieldSide) {
  if (!players) return [];
  return players.map(p => p && fieldSide === 'right' ? { ...p, x: 1 - p.x } : p);
}

function forceLeft(p) {
  if (!p) return null;
  return p.x > 0.5 ? { ...p, x: 1 - p.x } : p;
}

// Mirror of forceLeft for shooter coords (§ 61 hotfix 2026-05-12). Skulls
// (defender positions) collapse to the LEFT half via forceLeft so the
// heatmap shows everyone on one side. Shooter glyphs need the OPPOSITE
// half — they were aiming AT defenders from the other base. Brief B
// Stage 5 spec incorrectly called for "same forceLeft as skulls", which
// stacked shooters on top of skulls. This helper enforces the correct
// right-half placement so skulls and shooters render on opposite halves.
const forceRightX = (x) => (x <= 0.5 ? 1 - x : x);

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
  // § 112 STAGE 3 — Hitability cumulative section. Self-contained render path
  // (own data fetch); the points pipeline below is skipped for this mode.
  trafialnosc: { title: 'Hitability', icon: '🎯', emptyText: 'No hits captured yet', loadingText: 'Loading hits...' },
};

export default function LayoutAnalyticsPage() {
  const { layoutId, mode } = useParams();
  const cfg = MODES[mode] || MODES.deaths;
  const { layouts } = useLayouts();
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const layout = layouts.find(l => l.id === layoutId);
  const [loading, setLoading] = useState(true);
  // allPoints: raw point docs from fetchLayoutDeaths (with _ctx ids). Derived
  // `data` lives in a useMemo below so Stage 3 scope filter can rebuild it.
  const [allPoints, setAllPoints] = useState([]);

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
    if (!layoutId || mode === 'trafialnosc') return; // Hitability has its own fetch
    setLoading(true);
    ds.fetchLayoutDeaths(layoutId).then(points => {
      setAllPoints(points || []);
      setLoading(false);
    }).catch(() => { setAllPoints([]); setLoading(false); });
  }, [layoutId, mode]);

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
            // § 61 hotfix 2026-05-12: shooter coords mirror to the RIGHT
            // half (forceRightX) — opposite of skulls (which use forceLeft
            // via extractData) — so the two sets render on opposite halves
            // of the heatmap. Brief B Stage 5 spec said "same forceLeft as
            // skulls"; that stacked shooters on top of skulls in production.
            const sx = forceRightX(att.shooterPos.x);
            const sy = att.shooterPos.y;
            const team = sideAsDef === 'home' ? 'B' : 'A';
            // Stable id reused by Stage 6 cross-filter link map. Bucket size
            // SHOOTER_CLUSTER_BUCKET (§ 61 hotfix 2026-05-12 Bug 3).
            const bx = Math.round(sx / SHOOTER_CLUSTER_BUCKET);
            const by = Math.round(sy / SHOOTER_CLUSTER_BUCKET);
            const id = `shooter-${team}-${bx}-${by}`;
            const prev = shooterAgg.get(id) || {
              id, x: sx, y: sy, team,
              shooterBunker: att.shooterBunker,
              credit: 0,
            };
            prev.credit += elim.shareEach;
            shooterAgg.set(id, prev);
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

  // § 61 Stage 6: hoist skull-cluster computation out of the draw effect so
  // we can reference cluster IDs from the click handler + link map + status
  // pill. Each cluster carries:
  //   - id: stable string `skull-{round(x*100)}-{round(y*100)}`
  //   - x, y: cluster centroid (already forceLeft-normalized via extractData)
  //   - count: number of deaths in the cluster
  //   - deaths: underlying death objects (used to look up attributors)
  //   - bunker: representative defender bunker name for the status pill
  const skullClusters = useMemo(() => {
    if (mode !== 'deaths' || !data.deaths.length) return [];
    const CLUSTER_DIST = 0.04;
    const used = new Set();
    const out = [];
    data.deaths.forEach((d, i) => {
      if (used.has(i)) return;
      const cluster = [d]; used.add(i);
      data.deaths.forEach((d2, j) => {
        if (used.has(j)) return;
        if (Math.sqrt((d.x - d2.x) ** 2 + (d.y - d2.y) ** 2) < CLUSTER_DIST) {
          cluster.push(d2); used.add(j);
        }
      });
      const cx = cluster.reduce((s, c) => s + c.x, 0) / cluster.length;
      const cy = cluster.reduce((s, c) => s + c.y, 0) / cluster.length;
      // Representative bunker = first death's bunker that has a name
      // (cluster members are within 4% so they almost always agree).
      let bunkerName = null;
      for (const dd of cluster) {
        const key = `${dd._ctx?.pointId}|${dd.side}|${dd.playerIdx}`;
        const entry = attributionData.perDeath.find(e =>
          `${e.pointId}|${e.defenderSide}|${e.defenderSlot}` === key
        );
        if (entry?.defenderBunker?.positionName) { bunkerName = entry.defenderBunker.positionName; break; }
      }
      out.push({
        id: `skull-${Math.round(cx * 100)}-${Math.round(cy * 100)}`,
        x: cx, y: cy, count: cluster.length, deaths: cluster, bunkerName,
      });
    });
    return out;
  }, [mode, data.deaths, attributionData]);

  // § 61 Stage 6: bidirectional link map for cross-filter. skullId ↔ shooterId
  // sets are precomputed here so the draw effect and click handler only do
  // O(1) Set lookups during interaction.
  const linkMap = useMemo(() => {
    const skullToShooters = new Map();
    const shooterToSkulls = new Map();
    // death key → skullId
    const deathToSkull = new Map();
    skullClusters.forEach(cluster => {
      cluster.deaths.forEach(d => {
        const dkey = `${d._ctx?.pointId}|${d.side}|${d.playerIdx}`;
        deathToSkull.set(dkey, cluster.id);
      });
    });
    attributionData.perDeath.forEach(entry => {
      const dkey = `${entry.pointId}|${entry.defenderSide}|${entry.defenderSlot}`;
      const skullId = deathToSkull.get(dkey);
      if (!skullId) return;
      // Ensure the skull has an entry even if zero attributors — keeps the
      // "unattributed skull" edge case representable (filter highlights only
      // the skull and fades all shooters).
      if (!skullToShooters.has(skullId)) skullToShooters.set(skullId, new Set());
      entry.attributors.forEach(att => {
        // Must use same forceRightX + SHOOTER_CLUSTER_BUCKET as
        // attributionData useMemo above so shooterId keys match between the
        // marker aggregation and the link map. Cross-filter relies on this
        // id alignment.
        const sx = forceRightX(att.shooterPos.x);
        const sy = att.shooterPos.y;
        const team = entry.defenderSide === 'A' ? 'B' : 'A';
        const bx = Math.round(sx / SHOOTER_CLUSTER_BUCKET);
        const by = Math.round(sy / SHOOTER_CLUSTER_BUCKET);
        const shooterId = `shooter-${team}-${bx}-${by}`;
        skullToShooters.get(skullId).add(shooterId);
        if (!shooterToSkulls.has(shooterId)) shooterToSkulls.set(shooterId, new Set());
        shooterToSkulls.get(shooterId).add(skullId);
      });
    });
    return { skullToShooters, shooterToSkulls };
  }, [attributionData, skullClusters]);

  // § 61 Stage 6: cross-filter state.
  // mode null = default (everything 100% opacity).
  // mode 'skull' + id = a skull is tapped; that skull + its attributing
  // shooters stay 100%, rest fade.
  // mode 'shooter' + id = symmetric.
  const [filter, setFilter] = useState({ mode: null, id: null });

  // Clear filter whenever scope or mode changes — otherwise a previously
  // selected skull id stops matching anything and the page stays in
  // "everything is faded" state silently.
  useEffect(() => { setFilter({ mode: null, id: null }); }, [scope, mode]);


  // Status pill label derived from filter state.
  const filterPillLabel = useMemo(() => {
    if (!filter.mode) return null;
    if (filter.mode === 'skull') {
      const cluster = skullClusters.find(c => c.id === filter.id);
      const bunker = cluster?.bunkerName || '?';
      const attCount = linkMap.skullToShooters.get(filter.id)?.size || 0;
      return attCount > 0
        ? t('deaths_filter_skull_label', bunker, attCount)
        : t('deaths_filter_skull_no_attr', bunker);
    }
    const marker = attributionData.shooterMarkers.find(m => m.id === filter.id);
    const bunker = marker?.shooterBunker?.positionName || '?';
    const hits = linkMap.shooterToSkulls.get(filter.id)?.size || 0;
    return t('deaths_filter_shooter_label', bunker, hits);
  }, [filter, skullClusters, attributionData, linkMap, t]);

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


  // § 61 Stage 6: canvas tap dispatch — shooter markers hit-tested first
  // (they sit on top z-order), then skulls, then empty-area = clear filter.
  // 22 px effective hit radius converted to normalized space so the target
  // stays a circle across portrait / landscape canvas sizes (per § 27 ≥44 px
  // tap-target rule).
  // Fed the normalized tap pos + canvas size by AnalyticsCanvas (BaseCanvas owns
  // the screen→normalized conversion now). Deaths-only — breaks passes no onTap.
  const handleCanvasTap = useCallback((pos, cs) => {
    const { w, h } = cs;
    if (w <= 0 || h <= 0) return;
    const nx = pos.x;
    const ny = pos.y;
    const HIT_R = 22 / Math.min(w, h);

    // Shooter markers first (top z-order, so a tap that lands on both
    // resolves to shooter — matches the brief's visual hierarchy).
    for (const m of attributionData.shooterMarkers) {
      if (!m || m.credit <= 0) continue;
      const dx = m.x - nx;
      const dy = m.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
        setFilter({ mode: 'shooter', id: m.id });
        return;
      }
    }
    // Skull clusters
    for (const c of skullClusters) {
      const dx = c.x - nx;
      const dy = c.y - ny;
      if (Math.sqrt(dx * dx + dy * dy) < HIT_R) {
        setFilter({ mode: 'skull', id: c.id });
        return;
      }
    }
    // Empty area → reset filter.
    setFilter({ mode: null, id: null });
  }, [attributionData, skullClusters]);

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

  // § 112 STAGE 3 — Hitability is a self-contained section (own fetch + canvas);
  // branch out of the points-centric deaths/breaks render entirely.
  if (mode === 'trafialnosc') {
    return <HitabilityAnalyticsSection layoutId={layoutId} layout={layout} />;
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
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
                background: active ? COLORS.accentA08 : 'transparent',
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
          {/* § 61 Stage 6: status pill — visible when cross-filter active.
              Shows target name + linked count + ✕ to clear. Tap empty area
              of canvas to clear is handled in handleCanvasClick. */}
          {mode === 'deaths' && filter.mode && filterPillLabel && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px',
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg,
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
              color: COLORS.text,
            }}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {filterPillLabel}
              </span>
              <div
                onClick={() => setFilter({ mode: null, id: null })}
                style={{
                  minWidth: 44, minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: COLORS.textMuted, fontSize: 16,
                }}
              >✕</div>
            </div>
          )}
          <AnalyticsCanvas
            mode={mode}
            fieldImage={layout?.fieldImage}
            data={data}
            densityEnabled={densityEnabled}
            attributionData={attributionData}
            skullClusters={skullClusters}
            filter={filter}
            linkMap={linkMap}
            onTap={mode === 'deaths' ? handleCanvasTap : undefined}
          />
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
