import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTrainings, useLayouts } from '../hooks/useFirestore';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import { useDevice } from '../hooks/useDevice';
import { useLanguage } from '../hooks/useLanguage';
import * as ds from '../services/dataService';
import KioskRotatePrompt from '../components/kiosk/KioskRotatePrompt';
import HitabilityCanvas from '../components/hitability/HitabilityCanvas';
import { ActionSheet } from '../components/ui';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, COLORS_ZONE_PALETTE } from '../utils/theme';

const MODES = ['config', 'track', 'sum'];
const clamp = (v) => Math.max(0.03, Math.min(0.97, v));
const genId = (p) => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const letter = (i) => String.fromCharCode(65 + (i % 26));
const EMPTY = { players: [], targets: [], links: [] };

/**
 * HitabilityPage — § Hitability module (STAGE 1: shell + Konfiguracja).
 * Entry = the single card in the training COACH tab → /training/:id/hitability.
 * Landscape-maximized (reuses useLandscapeMode + KioskRotatePrompt nudge — NOT
 * the kiosk ≥1024 gate). Config persists on the layout overlay (read-direct).
 * Built to outputs/killability_prototype.html. Tracking/Summary land in STAGE 2/3.
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
  const configRef = useRef(null);
  const inited = useRef(false);

  // Seed config ONCE from the overlay (read-direct); local is authoritative after.
  useEffect(() => {
    inited.current = false;
    if (!layoutId) return undefined;
    const unsub = ds.subscribeLayoutOverlay(layoutId, (ov) => {
      if (inited.current) return;
      const c = ov?.hitabilityConfig || EMPTY;
      const norm = { players: c.players || [], targets: c.targets || [], links: c.links || [] };
      configRef.current = norm; setConfig(norm); inited.current = true;
    });
    return () => { if (unsub) unsub(); };
  }, [layoutId]);

  const applyConfig = useCallback((next, { persist = true } = {}) => {
    configRef.current = next;
    setConfig(next);
    if (persist && layoutId) ds.updateHitabilityConfig(layoutId, next).catch(() => { /* refresh shows state */ });
  }, [layoutId]);

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
  const persistNow = () => { if (layoutId) ds.updateHitabilityConfig(layoutId, configRef.current).catch(() => {}); };
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

  const dot = (color) => (
    <span style={{ width: 12, height: 12, borderRadius: '50%', background: color, flexShrink: 0, display: 'inline-block' }} />
  );
  const rowLabel = (node) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{node}</span>
  );
  const playerNode = (pid) => {
    const p = configRef.current?.players.find(x => x.id === pid);
    return rowLabel(<>{dot(p?.color)}{t('hitability_player_n', p?.label || '?')}</>);
  };
  const targetNode = (tid) => {
    const tg = configRef.current?.targets.find(x => x.id === tid);
    const owner = configRef.current?.links.find(l => l.targetId === tid);
    const oc = owner ? configRef.current?.players.find(p => p.id === owner.playerId)?.color : COLORS.textMuted;
    return rowLabel(<>{dot(oc)}{t('hitability_target_n', tg?.label || '?')}</>);
  };
  const connNode = (c) => {
    const p = configRef.current?.players.find(x => x.id === c.p);
    const tg = configRef.current?.targets.find(x => x.id === c.t);
    return rowLabel(<>{dot(p?.color)}{`${t('hitability_player_n', p?.label || '?')} → ${t('hitability_target_n', tg?.label || '?')}`}</>);
  };

  const configTap = useCallback((nx, ny, hits) => {
    if (linking) {
      if (hits.targets.length === 1) doLink(linking, hits.targets[0]);
      else if (hits.targets.length > 1) {
        setChooser({ title: t('hitability_choose_target'), options: hits.targets.map(tid => ({ label: targetNode(tid), onPick: () => doLink(linking, tid) })) });
      } else setLinking(null);
      return;
    }
    if (hits.players.length === 1) setLinking(hits.players[0]);
    else if (hits.players.length > 1) {
      setChooser({ title: t('hitability_choose_player'), options: hits.players.map(pid => ({ label: playerNode(pid), onPick: () => setLinking(pid) })) });
    } else if (hits.conns.length === 1) doDelConn(hits.conns[0]);
    else if (hits.conns.length > 1) {
      setChooser({ title: t('hitability_choose_conn'), options: hits.conns.map(c => ({ label: connNode(c), onPick: () => doDelConn(c) })) });
    } else if (hits.targets.length) { /* tapped a target, not linking → no-op */ }
    else if (nx < 0.5) addPlayer(nx, ny);
    else addTarget(nx, ny);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linking, t]);

  // ── Render gates ──
  const back = () => navigate(-1);
  if (training && !layoutId) {
    return <CenterMsg msg={t('hitability_no_layout')} onBack={back} />;
  }
  // Portrait phone/tablet → rotate nudge (NOT the kiosk ≥1024 gate). Desktop never prompts.
  if (!isLandscape && !device.isDesktop) {
    return <KioskRotatePrompt onBack={back} title={t('hitability_rotate_title')} msg={t('hitability_rotate_msg')} />;
  }
  if (!training || config === null) {
    return <CenterMsg msg={t('loading')} onBack={back} />;
  }

  const maxH = canvasMaxHeight(178, 178) || 480;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 120, background: COLORS.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0,
      }}>
        <div onClick={back} role="button" style={{
          minWidth: 44, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: COLORS.accent, fontSize: 22, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>‹</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>
            {t('hitability_card_title')}
          </div>
          {layout?.name && (
            <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {layout.name}
            </div>
          )}
        </div>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: 6, padding: '10px 14px 6px', flexShrink: 0 }}>
        {MODES.map(m => {
          const active = mode === m;
          return (
            <div key={m} onClick={() => { setMode(m); setLinking(null); setChooser(null); }}
              role="button" aria-pressed={active} style={{
                flex: 1, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                fontFamily: FONT, fontSize: 14, fontWeight: 600,
                background: active ? COLORS.surfaceLight || COLORS.surface : COLORS.surface,
                color: active ? COLORS.accent : COLORS.textDim,
                border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
              }}>
              {t(`hitability_mode_${m}`)}
            </div>
          );
        })}
      </div>

      {/* Body */}
      {mode === 'config' ? (
        <HitabilityCanvas
          fieldImage={layout?.fieldImage}
          bunkers={layout?.bunkers || []}
          players={config.players}
          targets={config.targets}
          links={config.links}
          linking={linking}
          mode="config"
          onTap={configTap}
          onDragMarker={moveMarker}
          onDragEnd={persistNow}
          maxHeight={maxH}
        />
      ) : (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontStyle: 'italic',
        }}>
          {t('hitability_soon')}
        </div>
      )}

      {/* Hint */}
      <div style={{
        padding: '8px 14px calc(10px + env(safe-area-inset-bottom, 0px))', flexShrink: 0,
        fontFamily: FONT, fontSize: 12, color: COLORS.textDim, lineHeight: 1.5,
      }}>
        {mode === 'config'
          ? (linking ? t('hitability_hint_linking', t('hitability_player_n', config.players.find(p => p.id === linking)?.label || '')) : t('hitability_hint_config'))
          : ''}
      </div>

      <ActionSheet
        open={!!chooser}
        title={chooser?.title}
        onClose={() => setChooser(null)}
        actions={(chooser?.options || []).map(o => ({ label: o.label, onPress: o.onPick }))}
      />
    </div>
  );
}

function CenterMsg({ msg, onBack }) {
  const { t } = useLanguage();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 120, background: COLORS.bg,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24,
    }}>
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, textAlign: 'center' }}>{msg}</div>
      {onBack && (
        <div onClick={onBack} role="button" style={{
          minHeight: 44, padding: '0 20px', display: 'flex', alignItems: 'center',
          color: COLORS.accent, fontFamily: FONT, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>{t('kiosk_rotate_back')}</div>
      )}
    </div>
  );
}
