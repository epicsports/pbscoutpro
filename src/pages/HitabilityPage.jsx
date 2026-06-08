import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainings, useLayouts } from '../hooks/useFirestore';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import { useDevice } from '../hooks/useDevice';
import { useLanguage } from '../hooks/useLanguage';
import { captureException } from '../services/sentry';
import * as ds from '../services/dataService';
import KioskRotatePrompt from '../components/kiosk/KioskRotatePrompt';
import HitabilityCanvas from '../components/hitability/HitabilityCanvas';
import { ActionSheet } from '../components/ui';
import { COLORS, FONT, FONT_SIZE, COLORS_ZONE_PALETTE } from '../utils/theme';

const MODES = ['config', 'track', 'sum'];
const clamp = (v) => Math.max(0.03, Math.min(0.97, v));
const genId = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const letter = (i) => String.fromCharCode(65 + (i % 26));
const EMPTY = { players: [], targets: [], links: [] };
const hasAny = (c) => !!(c && ((c.players && c.players.length) || (c.targets && c.targets.length) || (c.links && c.links.length)));

/**
 * HitabilityPage — § 112 module (STAGE 1 config + STAGE 2 tracking).
 * Entry = the single card in the training COACH tab → /training/:id/hitability.
 * Landscape-maximized (useLandscapeMode + KioskRotatePrompt nudge; NOT the kiosk
 * ≥1024 gate). config + hits both persist in COACH-writable subcollections under
 * the base-id-keyed layout overlay (no rules deploy). Built to the prototype.
 */
export default function HitabilityPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainings } = useTrainings();
  const { layouts } = useLayouts();
  const { isLandscape, canvasMaxHeight } = useLandscapeMode();
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
  const configRef = useRef(null);
  const inited = useRef(false);
  const migrating = useRef(false);

  const seed = (norm) => { configRef.current = norm; setConfig(norm); inited.current = true; };

  const saveConfig = useCallback((next) => {
    if (!layoutId) return;
    ds.updateHitabilityConfig(layoutId, next)
      .then(() => setSaveError(false))
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'config' } }); });
  }, [layoutId]);

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

  // ── Tracking mutations (per-tap persist to hitabilityHits) ──
  const addHit = (targetId, playerId) => {
    if (!layoutId) return;
    ds.addHitabilityHit(layoutId, { playerId, targetId, trainingId })
      .then(() => setSaveError(false))
      .catch((e) => { setSaveError(true); captureException(e, { tags: { feat: 'hitability', op: 'hit' } }); });
  };
  const delHit = (hitId) => {
    if (!layoutId) return;
    ds.deleteHitabilityHit(layoutId, hitId)
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

  // Record a hit + auto-create the (player→target) pair if it doesn't exist yet,
  // so the count shows in the badge/list AND the summary/analytics (which key off
  // config.links). Lets tracking work even when the coach didn't pre-draw links.
  const recordHit = (tid, pid) => {
    const cfg = configRef.current;
    if (cfg && !cfg.links.some(l => l.playerId === pid && l.targetId === tid)) {
      applyConfig({ ...cfg, links: [...cfg.links, { playerId: pid, targetId: tid }] });
    }
    addHit(tid, pid);
  };

  const trackTap = useCallback((nx, ny, h) => {
    if (h.targets.length) {
      const tid = h.targets[0];
      const owners = ownersOf(tid);
      // Owners if linked; otherwise ALL configured players (so a target tap is
      // never a dead end — pick whose shot it was).
      const candidates = owners.length ? owners : (configRef.current?.players || []).map(p => p.id);
      if (!candidates.length) return; // no players configured at all
      if (candidates.length === 1) recordHit(tid, candidates[0]);
      else setChooser({ title: t('hitability_whose_shot'), options: candidates.map(pid => ({ label: playerNode(pid), onPick: () => recordHit(tid, pid) })) });
      return;
    }
    // Positions are non-interactive in Tracking (hits-only model) — only target
    // taps record. Tapping a position is a no-op.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // ── Render gates ──
  const back = () => navigate(-1);
  if (training && !layoutId) return <CenterMsg msg={t('hitability_no_layout')} onBack={back} />;
  if (!isLandscape && !device.isDesktop) {
    return <KioskRotatePrompt onBack={back} title={t('hitability_rotate_title')} msg={t('hitability_rotate_msg')} />;
  }
  if (!training || config === null) return <CenterMsg msg={t('loading')} onBack={back} />;

  const maxH = canvasMaxHeight(178, 178) || 480;
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
      hitsByTarget={mode === 'track' ? hitsByTarget : {}}
      onTap={onTap}
      onDragMarker={moveMarker}
      onDragEnd={persistNow}
      maxHeight={maxH}
    />
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
        <div onClick={back} role="button" style={{ minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.accent, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>‹</div>
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

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 6px', flexShrink: 0 }}>
        {MODES.map(m => {
          const active = mode === m;
          return (
            <div key={m} onClick={() => { setMode(m); setLinking(null); setChooser(null); }} role="button" aria-pressed={active} style={{
              flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', fontFamily: FONT, fontSize: 14, fontWeight: 600,
              background: active ? COLORS.surfaceLight || COLORS.surface : COLORS.surface,
              color: active ? COLORS.accent : COLORS.textDim,
              border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
            }}>{t(`hitability_mode_${m}`)}</div>
          );
        })}
      </div>

      {/* Body */}
      {mode === 'config' && canvasEl(configTap)}
      {mode === 'track' && (
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'row', gap: 8, padding: '0 8px' }}>
          {canvasEl(trackTap)}
          <HitList hits={sortedHits} pColor={pColor} pLabel={pLabel} tLabel={tLabel} onDelete={delHit} t={t} />
        </div>
      )}
      {mode === 'sum' && (
        <SummaryPanel
          pairs={config.links.map(l => ({ p: l.playerId, t: l.targetId, count: hits.filter(h => h.playerId === l.playerId && h.targetId === l.targetId).length }))}
          totalHits={hits.length}
          pColor={pColor} pLabel={pLabel} tLabel={tLabel} t={t}
        />
      )}

      {/* Hint */}
      <div style={{ padding: '8px 14px calc(10px + env(safe-area-inset-bottom, 0px))', flexShrink: 0, fontFamily: FONT, fontSize: 12, color: COLORS.textDim, lineHeight: 1.5 }}>
        {mode === 'config'
          ? (linking ? t('hitability_hint_linking', t('hitability_player_n', config.players.find(p => p.id === linking)?.label || '')) : t('hitability_hint_config'))
          : mode === 'track' ? t('hitability_hint_track') : ''}
      </div>

      <ActionSheet open={!!chooser} title={chooser?.title} onClose={() => setChooser(null)} actions={(chooser?.options || []).map(o => ({ label: o.label, onPress: o.onPick }))} />
    </div>
  );
}

function HitList({ hits, pColor, pLabel, tLabel, onDelete, t }) {
  return (
    <div style={{ width: 210, flexShrink: 0, display: 'flex', flexDirection: 'column', minHeight: 0, paddingTop: 4 }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 }}>
        {t('hitability_hits_title', hits.length)}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {hits.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, fontStyle: 'italic' }}>{t('hitability_hits_empty')}</div>
        )}
        {hits.map(h => (
          <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: pColor(h.playerId), flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('hitability_player_n', pLabel(h.playerId))} → {t('hitability_target_n', tLabel(h.targetId))}
            </span>
            <div onClick={() => onDelete(h.id)} role="button" aria-label="delete" style={{ minWidth: 28, minHeight: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted, fontSize: 18, cursor: 'pointer', flexShrink: 0, WebkitTapHighlightColor: 'transparent' }}>×</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// In-module Podsumowanie — CURRENT session connections (position→target) + hit
// counts. Hits-only (relative frequency, no rate/ratio; no "grał" marker).
function SummaryPanel({ pairs, totalHits, pColor, pLabel, tLabel, t }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '4px 14px' }}>
      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
        {t('hitability_sum_pairs')}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {pairs.length === 0 && (
          <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, fontStyle: 'italic' }}>{t('hitability_sum_empty')}</div>
        )}
        {pairs.map((pr, i) => (
          <div key={`${pr.p}_${pr.t}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', marginBottom: 6, background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10 }}>
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: pColor(pr.p), flexShrink: 0 }} />
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 13, color: COLORS.text, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t('hitability_player_n', pLabel(pr.p))} → {t('hitability_target_n', tLabel(pr.t))}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: COLORS.accent, flexShrink: 0 }}>{pr.count}</span>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, paddingTop: 8 }}>
        {t('hitability_sum_total', totalHits)}
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
