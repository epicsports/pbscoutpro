import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainings, useLayouts } from '../hooks/useFirestore';
import { useDevice } from '../hooks/useDevice';
import { useLanguage } from '../hooks/useLanguage';
import { captureException } from '../services/sentry';
import * as ds from '../services/dataService';
import CanvasRailLayout from '../components/canvas/CanvasRailLayout';
import HitabilityCanvas from '../components/hitability/HitabilityCanvas';
import HitBreakdownList from '../components/hitability/HitBreakdownList';
import { ActionSheet, ConfirmModal } from '../components/ui';
import { Settings, Crosshair, BarChart3 } from 'lucide-react';
import { COLORS, FONT, FONT_SIZE, COLORS_ZONE_PALETTE } from '../utils/theme';

const MODES = ['config', 'track', 'sum'];
// One icon language across the rail tab row AND the §116 collapsed strip (Lucide,
// currentColor so they inherit the active/inactive colour from their container).
const MODE_ICON = { config: Settings, track: Crosshair, sum: BarChart3 };
const clamp = (v) => Math.max(0.03, Math.min(0.97, v));
const genId = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const letter = (i) => String.fromCharCode(65 + (i % 26));
const EMPTY = { players: [], targets: [], links: [] };
const hasAny = (c) => !!(c && ((c.players && c.players.length) || (c.targets && c.targets.length) || (c.links && c.links.length)));

/**
 * HitabilityPage — § 112 module (STAGE 1 config + STAGE 2 tracking).
 * Entry = the single card in the training COACH tab → /training/:id/hitability.
 * RESPONSIVE Canvas/Tool archetype (§ 27 / DESIGN_DECISIONS responsive-canvas):
 * works in BOTH orientations — portrait = field stacked over the controls, rotate
 * to landscape = field MAXIMIZED + controls collapsed to an edge rail (via the
 * reusable CanvasRailLayout primitive). NOT portrait-locked; no rotate gate.
 * The § 81 rotate=maximize is the canvas-primary case § 81 itself reserves (the
 * "no auto-promote" boundary is for scroll-dashboards, not canvas pages). config +
 * hits both persist in COACH-writable subcollections under the base-id-keyed layout
 * overlay (no rules deploy). Built to the prototype.
 */
export default function HitabilityPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();
  // Orientation is decided inside CanvasRailLayout by viewport geometry (landscape
  // on ANY device incl. desktop). The old useLandscapeMode gated on !isDesktop, so
  // the shell never activated on desktop-wide landscape (§113 fix).
  const device = useDevice();

  const training = trainings.find(tr => tr.id === trainingId);
  const layoutId = training?.layoutId || null;
  const layout = layouts.find(l => l.id === layoutId) || null;

  const [mode, setMode] = useState('config');
  const [config, setConfig] = useState(null);
  const [linking, setLinking] = useState(null);
  const [chooser, setChooser] = useState(null);
  const [hits, setHits] = useState([]);
  const [saveError, setSaveError] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null); // { kind:'p'|'t', id, label, count } | null
  const configRef = useRef(null);
  const inited = useRef(false);
  const migrating = useRef(false);
  // layoutId/trainingId load async (useTrainings). Memoised callbacks (trackTap,
  // configTap) capture helpers from an early render where these were still null
  // → a hit write with a null path segment ("null is not an object" in the
  // Firestore SDK). Refs always hold the CURRENT value, so the write helpers
  // never use a stale null. (§112 counting bug, 2026-06-09.)
  const layoutIdRef = useRef(null); layoutIdRef.current = layoutId;
  const trainingIdRef = useRef(null); trainingIdRef.current = trainingId;

  const seed = (norm) => { configRef.current = norm; setConfig(norm); inited.current = true; };

  const saveConfig = useCallback((next) => {
    const lid = layoutIdRef.current;
    if (!lid) return;
    ds.updateHitabilityConfig(lid, next)
      .then(() => setSaveError(false))
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'config' } }); });
  }, []);

  // Config: read-direct from the coach-writable subdoc; migrate-on-read once from
  // the legacy STAGE-1 admin-write doc-field if the new doc is still empty.
  useEffect(() => {
    inited.current = false; migrating.current = false;
    if (!layoutId) return undefined;
    const unsub = ds.subscribeHitabilityConfig(layoutId, async (cfg) => {
      if (inited.current || migrating.current) return;
      if (hasAny(cfg)) { seed({ players: cfg.players || [], targets: cfg.targets || [], links: cfg.links || [] }); return; }
      migrating.current = true;
      const legacy = await ds.getLegacyHitabilityConfig(layoutId);
      migrating.current = false;
      if (inited.current) return;
      if (hasAny(legacy)) {
        const norm = { players: legacy.players || [], targets: legacy.targets || [], links: legacy.links || [] };
        seed(norm); saveConfig(norm); // adopt into the new coach-writable doc
      } else seed(EMPTY);
    });
    return () => { if (unsub) unsub(); };
  }, [layoutId, saveConfig]);

  // Hits for THIS training (live). trainingId equality — single-field auto index.
  useEffect(() => {
    if (!layoutId || !trainingId) { setHits([]); return undefined; }
    const unsub = ds.subscribeHitabilityHits(layoutId, trainingId, setHits);
    return () => { if (unsub) unsub(); };
  }, [layoutId, trainingId]);

  const applyConfig = useCallback((next, { persist = true } = {}) => {
    configRef.current = next; setConfig(next);
    if (persist) saveConfig(next);
  }, [saveConfig]);
  const persistNow = () => saveConfig(configRef.current);

  // ── Config mutations ──
  const addPlayer = (nx, ny) => {
    const cfg = configRef.current;
    const num = cfg.players.reduce((m, p) => Math.max(m, parseInt(p.label, 10) || 0), 0) + 1;
    const used = new Set(cfg.players.map(p => p.color));
    const color = COLORS_ZONE_PALETTE.find(c => !used.has(c)) || COLORS_ZONE_PALETTE[cfg.players.length % COLORS_ZONE_PALETTE.length];
    applyConfig({ ...cfg, players: [...cfg.players, { id: genId('p'), x: clamp(nx), y: clamp(ny), color, label: String(num) }] });
  };
  const addTarget = (nx, ny) => {
    const cfg = configRef.current;
    const idx = cfg.targets.reduce((m, tg) => Math.max(m, (tg.label ? tg.label.charCodeAt(0) - 65 : -1)), -1) + 1;
    applyConfig({ ...cfg, targets: [...cfg.targets, { id: genId('t'), x: clamp(nx), y: clamp(ny), label: letter(idx) }] });
  };
  const moveMarker = (kind, id, nx, ny) => {
    const cfg = configRef.current;
    const x = clamp(nx), y = clamp(ny);
    const next = kind === 'p'
      ? { ...cfg, players: cfg.players.map(p => (p.id === id ? { ...p, x, y } : p)) }
      : { ...cfg, targets: cfg.targets.map(tg => (tg.id === id ? { ...tg, x, y } : tg)) };
    applyConfig(next, { persist: false });
  };
  const doLink = (pid, tid) => {
    const cfg = configRef.current;
    if (!cfg.links.some(l => l.playerId === pid && l.targetId === tid)) {
      applyConfig({ ...cfg, links: [...cfg.links, { playerId: pid, targetId: tid }] });
    }
    setLinking(null);
  };
  const doDelConn = (c) => {
    const cfg = configRef.current;
    applyConfig({ ...cfg, links: cfg.links.filter(l => !(l.playerId === c.p && l.targetId === c.t)) });
  };

  // ── Tracking — RECORD-THEN-ATTRIBUTE (§112): a target tap commits + persists a
  // hit IMMEDIATELY (count == taps, always); attribution is a non-blocking
  // follow-up that edits the already-written hit. No modal is ever in the
  // critical path. Returns the hit docRef so the 0-connection ask can attribute it.
  const commitHit = (targetId, playerId) => {
    const lid = layoutIdRef.current;
    if (!lid) return Promise.resolve(null);
    return ds.addHitabilityHit(lid, { playerId: playerId || null, targetId, trainingId: trainingIdRef.current })
      .then((ref) => { setSaveError(false); return ref; })
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'hit' } }); return null; });
  };
  // Attribute an already-committed hit to a position + form the connection so
  // subsequent taps on this target auto-attribute (0-conn → becomes 1-conn).
  const attributeHit = (ref, tid, pid) => {
    if (!ref) return;
    const cfg = configRef.current;
    if (cfg && !cfg.links.some(l => l.playerId === pid && l.targetId === tid)) {
      applyConfig({ ...cfg, links: [...cfg.links, { playerId: pid, targetId: tid }] });
    }
    ds.updateHitabilityHit(layoutIdRef.current, ref.id, { playerId: pid })
      .then(() => setSaveError(false))
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'hit-attr' } }); });
  };
  const delHit = (hitId) => {
    if (!layoutIdRef.current) return;
    ds.deleteHitabilityHit(layoutIdRef.current, hitId)
      .then(() => setSaveError(false))
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'hit-del' } }); });
  };
  const ownersOf = (tid) => (configRef.current?.links || []).filter(l => l.targetId === tid).map(l => l.playerId);
  const hitsByTarget = useMemo(() => {
    const m = {};
    for (const h of hits) m[h.targetId] = (m[h.targetId] || 0) + 1;
    return m;
  }, [hits]);

  // ── Labels for the ActionSheet chooser / hit-list ──
  const dot = (color) => <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />;
  const rowLabel = (node) => <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{node}</span>;
  const pColor = (pid) => configRef.current?.players.find(p => p.id === pid)?.color;
  const pLabel = (pid) => configRef.current?.players.find(p => p.id === pid)?.label || '?';
  const tLabel = (tid) => configRef.current?.targets.find(x => x.id === tid)?.label || '?';
  const playerNode = (pid) => rowLabel(<>{dot(pColor(pid))}{t('hitability_player_n', pLabel(pid))}</>);
  const targetNode = (tid) => {
    const owner = ownersOf(tid)[0];
    return rowLabel(<>{dot(owner ? pColor(owner) : COLORS.textMuted)}{t('hitability_target_n', tLabel(tid))}</>);
  };
  const connNode = (c) => rowLabel(<>{dot(pColor(c.p))}{`${t('hitability_player_n', pLabel(c.p))} → ${t('hitability_target_n', tLabel(c.t))}`}</>);

  // ── Marker delete (positions + targets) — §C, Jacek 2026-06-11. Cascade:
  // removing a marker ALWAYS drops its connections; if recorded hits reference it,
  // confirm first and the confirm deletes those hits too. Zero-hit deletes skip
  // the modal. Delete lives in the rail (the existing connection-delete × idiom);
  // no new canvas gesture is invented.
  const hitsForPlayer = (pid) => hits.filter(h => h.playerId === pid);
  const hitsForTarget = (tid) => hits.filter(h => h.targetId === tid);
  const doDelPlayer = (pid) => {
    hitsForPlayer(pid).forEach(h => delHit(h.id));
    const cfg = configRef.current;
    applyConfig({ ...cfg, players: cfg.players.filter(p => p.id !== pid), links: cfg.links.filter(l => l.playerId !== pid) });
  };
  const doDelTarget = (tid) => {
    hitsForTarget(tid).forEach(h => delHit(h.id));
    const cfg = configRef.current;
    applyConfig({ ...cfg, targets: cfg.targets.filter(x => x.id !== tid), links: cfg.links.filter(l => l.targetId !== tid) });
  };
  const requestDelPlayer = (pid) => {
    const count = hitsForPlayer(pid).length;
    if (count === 0) { doDelPlayer(pid); return; }
    setConfirmDel({ kind: 'p', id: pid, label: pLabel(pid), count });
  };
  const requestDelTarget = (tid) => {
    const count = hitsForTarget(tid).length;
    if (count === 0) { doDelTarget(tid); return; }
    setConfirmDel({ kind: 't', id: tid, label: tLabel(tid), count });
  };
  const runConfirmDel = () => {
    if (!confirmDel) return;
    if (confirmDel.kind === 'p') doDelPlayer(confirmDel.id); else doDelTarget(confirmDel.id);
    setConfirmDel(null);
  };

  const configTap = useCallback((nx, ny, h) => {
    if (linking) {
      if (h.targets.length === 1) doLink(linking, h.targets[0]);
      else if (h.targets.length > 1) setChooser({ title: t('hitability_choose_target'), options: h.targets.map(tid => ({ label: targetNode(tid), onPick: () => doLink(linking, tid) })) });
      else setLinking(null);
      return;
    }
    if (h.players.length === 1) setLinking(h.players[0]);
    else if (h.players.length > 1) setChooser({ title: t('hitability_choose_player'), options: h.players.map(pid => ({ label: playerNode(pid), onPick: () => setLinking(pid) })) });
    else if (h.conns.length === 1) doDelConn(h.conns[0]);
    else if (h.conns.length > 1) setChooser({ title: t('hitability_choose_conn'), options: h.conns.map(c => ({ label: connNode(c), onPick: () => doDelConn(c) })) });
    else if (h.targets.length) { /* tapped a target, not linking → no-op */ }
    else if (nx < 0.5) addPlayer(nx, ny);
    else addTarget(nx, ny);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linking, t]);

  const trackTap = useCallback((nx, ny, h) => {
    if (!h.targets.length) return; // positions are non-interactive — only target taps count
    const tid = h.targets[0];
    const owners = ownersOf(tid); // connected positions
    // 1) COMMIT the hit immediately — 1 connection → auto-attribute; multiple OR
    //    zero → positionId=null (the count stands on the target regardless). NEVER
    //    default to "position 1"; NEVER block on a modal.
    const positionId = owners.length === 1 ? owners[0] : null;
    const p = commitHit(tid, positionId);
    // 2) Attribute (non-blocking, AFTER the count) only for the 0-connection case:
    //    ask which position, then edit the already-recorded hit + form the
    //    connection. Multiple connections → no ask (precise pick = the deferred
    //    line-tap UX). Dismiss → the hit stays counted (positionId=null).
    if (owners.length === 0) {
      const positions = configRef.current?.players || [];
      if (positions.length) {
        setChooser({
          title: t('hitability_whose_shot'),
          options: positions.map(pos => ({ label: playerNode(pos.id), onPick: () => p.then(ref => attributeHit(ref, tid, pos.id)) })),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // ── Render gates — NO orientation gate: responsive in both (rotate = maximize). ──
  const back = () => navigate(-1);
  if (training && !layoutId) return <CenterMsg msg={t('hitability_no_layout')} onBack={back} />;
  if (!training || config === null) return <CenterMsg msg={t('loading')} onBack={back} />;

  // The field is the HERO: its BOX governs size (landscape = 100%-height aspect box;
  // portrait = the 46vh box), so the canvas cap stays out of the way — a large value
  // lets the box drive. railMin = the usable floor the residual rail never drops below.
  const maxH = 4000;
  const railMin = device.isDesktop ? 280 : device.isTablet ? 240 : 200;
  const sortedHits = [...hits].sort((a, b) => (msOf(b.ts) - msOf(a.ts)));

  const canvasEl = (onTap) => (
    <HitabilityCanvas
      fieldImage={layout?.fieldImage}
      bunkers={layout?.bunkers || []}
      players={config.players}
      targets={config.targets}
      links={config.links}
      linking={mode === 'config' ? linking : null}
      mode={mode}
      hitsByTarget={mode === 'config' ? {} : hitsByTarget}
      weightTargets={mode === 'sum'}
      onTap={onTap}
      onDragMarker={moveMarker}
      onDragEnd={persistNow}
      maxHeight={maxH}
    />
  );

  // Compact nav row — full-bleed top bar in portrait; pinned to the rail top in
  // landscape (so the field gets 100dvh). Same markup either way.
  const headerEl = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
      <div data-testid="hit-back" onClick={back} role="button" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>‹</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{t('hitability_card_title')}</div>
        {layout?.name && <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{layout.name}</div>}
      </div>
      {saveError && (
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.danger,
          background: 'rgba(239,68,68,0.1)', border: `1px solid rgba(239,68,68,0.3)`,
          padding: '5px 9px', borderRadius: 8, flexShrink: 0,
        }}>{t('hitability_save_error')}</div>
      )}
    </div>
  );

  // Hint — full-bleed bottom in portrait; pinned to the rail bottom in landscape.
  const hintEl = (
    <div style={{ padding: '8px 14px calc(10px + env(safe-area-inset-bottom, 0px))', flexShrink: 0, fontFamily: FONT, fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
      {mode === 'config'
        ? (linking ? t('hitability_hint_linking', t('hitability_player_n', config.players.find(p => p.id === linking)?.label || '')) : t('hitability_hint_config'))
        : mode === 'track' ? t('hitability_hint_track') : ''}
    </div>
  );

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '100dvh', zIndex: 120, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* The field is the HERO; the rail (header + mode switcher + per-mode content +
          hint) is RESIDUAL and holds ALL chrome. Portrait: header on top, field over
          rail, hint at the bottom. Landscape (any device, geometry-decided): field at
          100dvh (native aspect → width), the rail takes the leftover width down to
          railMin with the header/hint inside it — nothing above/below the field. The
          canvas self-measures (RO on its own wrapper) so the tap transform stays
          correct across the reflow. */}
      <CanvasRailLayout
        aspect={16 / 10}
        railMin={railMin}
        header={headerEl}
        hint={hintEl}
        artifact={canvasEl(mode === 'config' ? configTap : mode === 'track' ? trackTap : undefined)}
        rail={(
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 6 }}>
            {/* Mode switcher — icon-segment pattern (Jacek 2026-06-11): INACTIVE tabs
                are icon-only (compact, ≥44px), the ACTIVE tab grows to icon + label.
                Width animates via flex-basis + the label's max-width/opacity (one
                accent on the active tab only — §27 amber-is-interactive). Lives at the
                rail top in landscape / above the per-mode content in portrait, and
                renders identically inside the §116 overlay panel (same `rail`). */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginBottom: 8 }} role="group" aria-label={t('hitability_card_title')}>
              {MODES.map(m => {
                const active = mode === m;
                const Icon = MODE_ICON[m];
                const label = t(`hitability_mode_${m}`);
                return (
                  <div key={m} data-testid={`hit-mode-${m}`} onClick={() => { setMode(m); setLinking(null); setChooser(null); }} role="button" aria-pressed={active} aria-label={label} title={label} style={{
                    flex: active ? '1 1 0' : '0 0 48px', minWidth: 48, minHeight: 44,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    borderRadius: 12, cursor: 'pointer', overflow: 'hidden',
                    transition: 'flex-grow .22s ease, flex-basis .22s ease, background .15s ease, border-color .15s ease',
                    WebkitTapHighlightColor: 'transparent', fontFamily: FONT, fontSize: 13, fontWeight: 700,
                    background: active ? COLORS.surfaceLight || COLORS.surface : COLORS.surface,
                    color: active ? COLORS.accent : COLORS.textDim,
                    border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                  }}>
                    <Icon size={18} strokeWidth={active ? 2.4 : 2} style={{ flexShrink: 0 }} aria-hidden="true" />
                    <span data-testid={`hit-mode-label-${m}`} style={{
                      whiteSpace: 'nowrap', overflow: 'hidden',
                      maxWidth: active ? 120 : 0, opacity: active ? 1 : 0,
                      transition: 'max-width .22s ease, opacity .18s ease',
                    }}>{label}</span>
                  </div>
                );
              })}
            </div>
            {mode === 'config' && (
              <ConfigRail config={config} pColor={pColor} pLabel={pLabel} tLabel={tLabel}
                onDelConn={(l) => doDelConn({ p: l.playerId, t: l.targetId })}
                onDelPlayer={requestDelPlayer} onDelTarget={requestDelTarget} t={t} />
            )}
            {mode === 'track' && (
              <HitList hits={sortedHits} pColor={pColor} pLabel={pLabel} tLabel={tLabel} onDelete={delHit} t={t} />
            )}
            {mode === 'sum' && (
              <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                  {t('hitability_sum_pairs')}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                  <HitBreakdownList hits={hits} pColor={pColor} pLabel={pLabel} tLabel={tLabel} t={t} emptyText={t('hitability_sum_empty')} />
                </div>
                <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, paddingTop: 8 }}>
                  {t('hitability_sum_total', hits.length)}
                </div>
              </div>
            )}
          </div>
        )}
        collapsed={{
          // §116: declarative strip data only — the shell owns all collapse logic.
          // Strip icons mirror the rail's mode switcher (config/track/sum); tapping
          // one switches the mode AND opens the transient overlay (the full rail).
          tabs: MODES.map(m => {
            const Icon = MODE_ICON[m];
            return {
              key: m,
              icon: <Icon size={20} aria-hidden="true" />, // same Lucide set as the rail tab row
              label: t(`hitability_mode_${m}`),
              active: mode === m,
              onSelect: () => { setMode(m); setLinking(null); setChooser(null); },
            };
          }),
          count: { value: hits.length, label: t('hitability_hits_short') },
          onBack: back,
        }}
      />

      <ActionSheet open={!!chooser} title={chooser?.title} onClose={() => setChooser(null)} actions={(chooser?.options || []).map(o => ({ label: o.label, onPress: o.onPick }))} />

      <ConfirmModal
        open={!!confirmDel}
        onClose={() => setConfirmDel(null)}
        title={t('hitability_del_title')}
        message={confirmDel && (confirmDel.kind === 'p'
          ? t('hitability_del_pos_msg', confirmDel.label, confirmDel.count)
          : t('hitability_del_target_msg', confirmDel.label, confirmDel.count))}
        onConfirm={runConfirmDel}
        confirmLabel={t('hitability_del_confirm')}
        danger
      />
    </div>
  );
}

function HitList({ hits, pColor, pLabel, tLabel, onDelete, t }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 4 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
        {t('hitability_hits_title', hits.length)}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {hits.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>{t('hitability_hits_empty')}</div>
        )}
        {hits.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: (h.playerId ? pColor(h.playerId) : null) || COLORS.textMuted, flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {(h.playerId ? t('hitability_player_n', pLabel(h.playerId)) : '—')} → {t('hitability_target_n', tLabel(h.targetId))}
            </span>
            <div onClick={() => onDelete(h.id)} role="button" aria-label="delete" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>×</div>
          </div>
        ))}
      </div>
    </div>
  );
}


// Config rail — connections (deletable) + a legend of positions & targets. The
// spatial editing still happens on the canvas; the rail mirrors + manages the links.
function ConfigRail({ config, pColor, pLabel, tLabel, onDelConn, onDelPlayer, onDelTarget, t }) {
  const links = config.links || [];
  const dot = (c, sz = 10) => <span style={{ width: sz, height: sz, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />;
  const ROW = { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 };
  const ROW_LABEL = { flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };
  const DEL_BTN = { minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' };
  const subhead = { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, margin: '12px 0 6px' };
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
        {t('hitability_connections_title', links.length)}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {links.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 12 }}>{t('hitability_connections_empty')}</div>
        )}
        {links.map((l, i) => (
          <div key={`${l.playerId}_${l.targetId}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            {dot(pColor(l.playerId) || COLORS.textMuted)}
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('hitability_player_n', pLabel(l.playerId))} → {t('hitability_target_n', tLabel(l.targetId))}
            </span>
            <div onClick={() => onDelConn(l)} role="button" aria-label="delete" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>×</div>
          </div>
        ))}
        {/* Positions — deletable rows (§C). Same × idiom as the connection rows;
            delete cascades through the parent (drops links, confirms if hits). */}
        <div style={subhead}>{t('hitability_legend_positions')}</div>
        {(config.players || []).length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic', marginBottom: 6 }}>{t('hitability_hint_config')}</div>
        )}
        {(config.players || []).map(p => (
          <div key={p.id} style={ROW}>
            {dot(p.color || COLORS.textMuted)}
            <span style={ROW_LABEL}>{t('hitability_player_n', p.label)}</span>
            <div onClick={() => onDelPlayer && onDelPlayer(p.id)} role="button" data-testid={`hit-del-pos-${p.id}`} aria-label={t('hitability_del_pos', p.label)} style={DEL_BTN}>×</div>
          </div>
        ))}
        {/* Targets — deletable rows (§C). */}
        <div style={subhead}>{t('hitability_legend_targets')}</div>
        {(config.targets || []).map(tg => (
          <div key={tg.id} style={ROW}>
            {dot(COLORS.textMuted)}
            <span style={ROW_LABEL}>{t('hitability_target_n', tg.label)}</span>
            <div onClick={() => onDelTarget && onDelTarget(tg.id)} role="button" data-testid={`hit-del-target-${tg.id}`} aria-label={t('hitability_del_target', tg.label)} style={DEL_BTN}>×</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CenterMsg({ msg, onBack }) {
  const { t } = useLanguage();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: COLORS.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' }}>{msg}</div>
      {onBack && (
        <div onClick={onBack} role="button" style={{ minHeight: 44, padding: '0 20px', display: 'flex', alignItems: 'center', color: COLORS.accent, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{t('kiosk_rotate_back')}</div>
      )}
    </div>
  );
}

function msOf(ts) {
  if (!ts) return Infinity; // pending (just-added) sorts to the top
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return typeof ts === 'number' ? ts : 0;
}
