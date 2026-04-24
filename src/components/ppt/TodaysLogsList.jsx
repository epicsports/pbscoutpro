import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Cloud, Plus } from 'lucide-react';
import PageHeader from '../PageHeader';
import { Btn, SideTag } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { usePPTSyncPending } from '../../hooks/usePPTSyncPending';
import {
  getTodaysSelfReports,
  getTodaysPendingSelfReports,
} from '../../services/playerPerformanceTrackerService';
import { getPending } from '../../services/pptPendingQueue';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';

/**
 * TodaysLogsList — post-save today's-logs view at `/player/log`.
 * See DESIGN_DECISIONS § 48.9.
 *
 * Renders:
 *   - PageHeader with title + refresh icon (manual flush trigger)
 *   - Optional pending-sync banner (count from localStorage queue)
 *   - Success / offline toast (reads location.state.toast; self-clears)
 *   - List: server rows + pending rows merged, ordinal numbered
 *     descending (newest at top, #1 = latest). Pending rows get a
 *     subtle cloud icon indicator.
 *   - Sticky amber "+ Nowy punkt" CTA — delegates to parent via
 *     onNewPoint so the page can route to wizard (1 LIVE) vs picker
 *     (ambiguous) via URL-level state.
 */

const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];

function outcomeChipLabel(slug, t) {
  if (!slug) return '';
  return t(`ppt_outcome_chip_${slug}`) || slug;
}

function variantLabel(variant, t) {
  if (!variant) return '';
  const key = `ppt_variant_${variant.replace(/-/g, '_')}`;
  return t(key) || variant;
}

function detailShort(slug, t) {
  if (!slug) return '';
  const key = `ppt_detail_${slug.replace(/-/g, '_')}`;
  return t(key) || slug;
}

function LogRow({ row, ordinal, isPending }) {
  const { t } = useLanguage();
  const breakout = row.breakout || {};
  const outcome = row.outcome;
  const outcomeColor = outcome === 'alive' ? COLORS.success : COLORS.danger;
  const shotsText = row.shots === null
    ? t('ppt_shots_skipped', variantLabel(breakout.variant, t))
    : (row.shots || []).length === 0
      ? t('ppt_shots_none')
      : row.shots.map(s => s.bunker).join(' → ');

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', marginBottom: 8,
      background: COLORS.surfaceDark,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.lg,
      opacity: isPending ? 0.85 : 1,
    }}>
      <div style={{
        width: 28, textAlign: 'right',
        fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
        color: COLORS.textMuted, flexShrink: 0,
      }}>
        #{ordinal}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
          color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {breakout.side && <SideTag side={breakout.side} />}
          <span>{breakout.bunker || '—'}</span>
          <span style={{ color: COLORS.textMuted }}> · </span>
          <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>
            {variantLabel(breakout.variant, t)}
          </span>
        </div>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
          color: COLORS.textMuted, marginTop: 2,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {shotsText}
          {row.outcomeDetail && ` · ${detailShort(row.outcomeDetail, t)}`}
        </div>
      </div>
      {isPending && (
        <Cloud size={14} strokeWidth={2} color={COLORS.accent} style={{ flexShrink: 0 }} />
      )}
      {outcome && (
        <span style={{
          padding: '3px 8px', borderRadius: RADIUS.sm,
          background: `${outcomeColor}18`,
          border: `1px solid ${outcomeColor}40`,
          color: outcomeColor,
          fontFamily: FONT, fontSize: 10, fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: 0.4,
          flexShrink: 0,
        }}>
          {outcomeChipLabel(outcome, t)}
        </span>
      )}
    </div>
  );
}

function Toast({ message, onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const tm = setTimeout(onDismiss, 3500);
    return () => clearTimeout(tm);
  }, [message, onDismiss]);
  if (!message) return null;
  return (
    <div style={{
      position: 'fixed',
      left: '50%', transform: 'translateX(-50%)',
      bottom: 'calc(100px + env(safe-area-inset-bottom, 0px))',
      maxWidth: 360, width: 'calc(100% - 32px)',
      padding: '12px 16px',
      background: COLORS.surface,
      border: `1px solid ${COLORS.accent}60`,
      borderRadius: RADIUS.lg,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
      color: COLORS.text,
      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
      textAlign: 'center',
      zIndex: 50,
      pointerEvents: 'none',
    }}>{message}</div>
  );
}

export default function TodaysLogsList({ playerId, uid, onNewPoint }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  // PPT 2026-04-24 unlinked-mode: when no playerId, fall back to uid path.
  const scopeId = playerId || uid;
  const isLinked = !!playerId;
  const mode = isLinked ? 'player' : 'uid';
  const { pendingCount, flush } = usePPTSyncPending(scopeId, { mode });
  const [rows, setRows] = useState([]);
  const [pendingRows, setPendingRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(() => {
    const t0 = location.state?.toast;
    if (t0?.type === 'saved') return { msg: 'ppt_toast_saved', n: t0.n };
    if (t0?.type === 'offline') return { msg: 'ppt_toast_saved_offline' };
    return null;
  });

  const loadRows = useCallback(async () => {
    if (!scopeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = isLinked
        ? await getTodaysSelfReports(scopeId)
        : await getTodaysPendingSelfReports(scopeId);
      setRows(data);
    } catch (e) {
      /* network error — keep previous rows, show nothing new */
    }
    setPendingRows(getPending(scopeId, mode).map(p => ({ ...p.payload, _queuedAt: p.queuedAt })));
    setLoading(false);
  }, [scopeId, isLinked, mode]);

  useEffect(() => { loadRows(); }, [loadRows, pendingCount]);

  // Clear toast state from location history after first render so refresh
  // doesn't re-fire the same toast.
  useEffect(() => {
    if (location.state?.toast) {
      navigate(location.pathname, { replace: true, state: {} });
    }
    // Deliberately one-shot — don't re-trigger on toast/navigate changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = useCallback(async () => {
    await flush();
    await loadRows();
  }, [flush, loadRows]);

  // Render order: newest at top (getTodaysSelfReports already sorts desc).
  // Pending rows (not yet persisted) go above server rows — they're the
  // most recently saved in user intent, even if the write hasn't landed.
  const combined = useMemo(() => {
    // Deduplicate by queuedAt vs Firestore createdAt — if flush happened
    // between reads, both lists may reference the same payload. Simple
    // heuristic: dedupe by (trainingId + breakout.bunker + variant +
    // outcome) which is unique-enough per-second for the single-player
    // stream.
    const signature = (r) => [
      r.trainingId || '', r.breakout?.bunker || '',
      r.breakout?.variant || '', r.outcome || '',
    ].join('|');
    const serverSigs = new Set(rows.map(signature));
    const uniquePending = pendingRows.filter(p => !serverSigs.has(signature(p)));
    return [
      ...uniquePending.map(p => ({ ...p, _isPending: true, id: `pending_${p._queuedAt}` })),
      ...rows.map(r => ({ ...r, _isPending: false })),
    ];
  }, [rows, pendingRows]);

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title={t('ppt_logs_title')}
        action={
          <div
            onClick={handleRefresh}
            role="button"
            style={{
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: COLORS.accent,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <RefreshCw size={20} strokeWidth={2.5} />
          </div>
        }
      />

      <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, paddingBottom: 120 }}>
        {/* Unlinked banner — same affordance as the wizard's. Lets the
            user link from the list view too without going via wizard. */}
        {!isLinked && (
          <div
            onClick={() => navigate('/profile')}
            role="button"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', marginBottom: SPACE.md,
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.25)',
              borderRadius: RADIUS.md,
              cursor: 'pointer', minHeight: 44,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span aria-hidden style={{ fontSize: 14, flexShrink: 0 }}>🧩</span>
            <span style={{
              flex: 1,
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
              color: COLORS.text, lineHeight: 1.4,
            }}>
              {t('ppt_unlinked_banner') || 'Logujesz bez profilu — punkty trafią do gracza po połączeniu.'}
            </span>
            <span style={{
              color: COLORS.accent, fontSize: 11, fontWeight: 800,
              letterSpacing: 0.3, textTransform: 'uppercase', flexShrink: 0,
            }}>
              {t('ppt_unlinked_banner_cta') || 'Połącz'}
            </span>
          </div>
        )}

        {pendingCount > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 12px', marginBottom: SPACE.md,
            background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: RADIUS.md,
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
            color: COLORS.accent,
          }}>
            <Cloud size={14} strokeWidth={2} />
            {t('ppt_logs_pending', pendingCount)}
          </div>
        )}

        {loading && combined.length === 0 && (
          <div style={{
            padding: SPACE.xl, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            {t('loading')}
          </div>
        )}

        {!loading && combined.length === 0 && (
          <div style={{
            padding: SPACE.xl, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
            fontStyle: 'italic',
          }}>
            {t('ppt_logs_empty')}
          </div>
        )}

        {combined.map((row, idx) => (
          <LogRow
            key={row.id || `row_${idx}`}
            row={row}
            ordinal={combined.length - idx}
            isPending={row._isPending}
          />
        ))}
      </div>

      {/* Sticky + Nowy punkt — routes via parent (picker vs wizard decision). */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        paddingBottom: `calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: `linear-gradient(180deg, rgba(8,12,20,0) 0%, ${COLORS.bg} 30%)`,
      }}>
        <Btn variant="accent" onClick={onNewPoint}
          style={{ width: '100%', minHeight: 64, fontSize: 17, fontWeight: 800, gap: 8 }}>
          <Plus size={20} strokeWidth={2.8} /> {t('ppt_logs_new_point')}
        </Btn>
      </div>

      <Toast
        message={
          toast?.msg === 'ppt_toast_saved' ? t('ppt_toast_saved', toast.n)
            : toast?.msg === 'ppt_toast_saved_offline' ? t('ppt_toast_saved_offline')
            : null
        }
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
