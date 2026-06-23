import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RefreshCw, Cloud, Plus, Calendar } from 'lucide-react';
import PageHeader from '../PageHeader';
import RdIcon from '../RdIcon';
import { Btn, SideTag, MoreBtn, ActionSheet, ConfirmModal } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { useConfirm } from '../../hooks/useConfirm';
import { usePPTSyncPending } from '../../hooks/usePPTSyncPending';
import {
  getTodaysSelfReports,
  getTodaysPendingSelfReports,
  deleteSelfReport,
  deletePendingSelfReport,
} from '../../services/playerPerformanceTrackerService';
import { getPending } from '../../services/pptPendingQueue';
import { useTabBarVisible } from '../TabBar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, ELEV, TNUM } from '../../utils/theme';
import { useDevice } from '../../hooks/useDevice';

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

// Exported for reuse — § 70.9 "Samoocena" section on PlayerStatsPage renders
// the same selfReport row. Keep the row UI single-sourced here.
//
// B10 (2026-05-27): added optional `eventLabel` eyebrow + Rozbieg/Strzały
// label gutter. `eventLabel` is TRI-STATE:
//   - undefined  → hide eyebrow entirely (TodaysLogsList own mount /
//                  TrainingResultsPage caller — they don't need it)
//   - string     → "Trening · {string}" eyebrow with Calendar icon
//   - null       → orphan "Bez treningu" eyebrow (dim italic, no icon
//                  swap — keeps glanceable consistency, no fake training
//                  name)
// The new label gutter ("Rozbieg" / "Strzały") replaces the implicit
// "you-have-to-know-the-layout-convention" stacked render with a 2-col
// grid: labels left (uppercase 8px), values right. `shotsText` helper at
// L57-61 untouched — null→skip and []→none paths still self-describe.
export function LogRow({ row, ordinal, isPending, eventLabel, onMenu }) {
  const { t } = useLanguage();
  const breakout = row.breakout || {};
  const outcome = row.outcome;
  const outcomeColor = outcome === 'alive' ? COLORS.success : COLORS.danger;
  const shotsText = row.shots === null
    ? t('ppt_shots_skipped', variantLabel(breakout.variant, t))
    : (row.shots || []).length === 0
      ? t('ppt_shots_none')
      : row.shots.map(s => s.bunker).join(' → ');
  const showEyebrow = eventLabel !== undefined;
  const isOrphanEvent = eventLabel === null;

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
        {showEyebrow && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            marginBottom: 7,
            fontFamily: FONT,
            // Non-orphan: uppercase eyebrow per § 27 secondary-label spec.
            // Orphan: italic body-case (no uppercase) so it reads as a
            // status statement, not a label — matches Apple HIG "empty
            // state should not look like a styled tag".
            ...(isOrphanEvent
              ? { fontSize: 10, fontWeight: 600, fontStyle: 'italic',
                  color: '#475569', letterSpacing: 0, textTransform: 'none' }
              : { fontSize: 9, fontWeight: 700, letterSpacing: 0.4,
                  color: COLORS.textMuted, textTransform: 'uppercase' }),
          }}>
            <Calendar size={11} strokeWidth={2}
              color={isOrphanEvent ? '#475569' : COLORS.textMuted}
              style={{ flexShrink: 0 }} />
            {isOrphanEvent ? (
              <span>{t('logrow_no_event')}</span>
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {t('logrow_event_prefix')}
                <span style={{ color: COLORS.textMuted }}> · </span>
                <span style={{ color: COLORS.text, fontWeight: 600, textTransform: 'none', letterSpacing: 0 }}>{eventLabel}</span>
              </span>
            )}
          </div>
        )}
        <div style={{
          display: 'grid', gridTemplateColumns: 'auto 1fr',
          columnGap: 10, rowGap: 4, alignItems: 'center',
          minWidth: 0,
        }}>
          {/* Row 1 — Rozbieg label + breakout content (verbatim from pre-B10). */}
          <div style={{
            fontFamily: FONT, fontSize: 8, fontWeight: 700,
            letterSpacing: 0.5, textTransform: 'uppercase',
            color: COLORS.textMuted, whiteSpace: 'nowrap',
          }}>
            {t('logrow_breakout')}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
            color: COLORS.text, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {breakout.side && <SideTag side={breakout.side} />}
            <span>{breakout.bunker || '—'}</span>
            <span style={{ color: COLORS.textMuted }}> · </span>
            <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>
              {variantLabel(breakout.variant, t)}
            </span>
          </div>
          {/* Row 2 — Strzały label + shotsText + outcomeDetail (verbatim from pre-B10). */}
          <div style={{
            fontFamily: FONT, fontSize: 8, fontWeight: 700,
            letterSpacing: 0.5, textTransform: 'uppercase',
            color: COLORS.textMuted, whiteSpace: 'nowrap',
          }}>
            {t('logrow_shots')}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
            color: COLORS.textMuted, minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shotsText}
            {row.outcomeDetail && ` · ${detailShort(row.outcomeDetail, t)}`}
          </div>
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
      {/* § self-log point delete — §7 ⋮ idiom. Rendered only for deletable rows
          (gated by the parent: linked + persisted + NOT propagated). */}
      {onMenu && (
        <MoreBtn onClick={(e) => { e.stopPropagation(); onMenu(); }} />
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

// Premium today's-points card (prototype TodayPointsPremium / TodayPointsWide).
// Single-sourced HERE for this view; the exported LogRow stays intact for the
// PlayerStatsPage "Samoocena" section (different context). Same row data
// (breakout / shots / outcome / delete-⋮ / pending), premium ELEV chrome.
const PLLABEL = { fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '1px', textTransform: 'uppercase', flexShrink: 0 };
function PremiumLogCard({ row, ordinal, isPending, onMenu, t, wide }) {
  const breakout = row.breakout || {};
  const outcome = row.outcome;
  const oc = outcome === 'alive' ? COLORS.success : COLORS.danger;
  const shotsText = row.shots === null
    ? t('ppt_shots_skipped', variantLabel(breakout.variant, t))
    : (row.shots || []).length === 0
      ? t('ppt_shots_none')
      : row.shots.map(s => s.bunker).join(' → ');
  return (
    <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 15, boxShadow: ELEV.shadow1, padding: wide ? '17px 18px' : '15px 14px', display: 'flex', alignItems: 'center', gap: wide ? 16 : 12, opacity: isPending ? 0.85 : 1, marginBottom: 11 }}>
      <span style={{ fontFamily: FONT, fontSize: wide ? 17 : 15, fontWeight: 800, color: COLORS.textMuted, minWidth: wide ? 30 : 26, flexShrink: 0, textAlign: 'right', ...TNUM }}>#{ordinal}</span>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: wide ? 9 : 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: wide ? 10 : 8, minWidth: 0 }}>
          <span style={{ ...PLLABEL, minWidth: wide ? 58 : 54 }}>{t('logrow_breakout')}</span>
          {breakout.side && <SideTag side={breakout.side} />}
          <b style={{ fontFamily: FONT, fontSize: wide ? 17 : 16, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{breakout.bunker || '—'}</b>
          {breakout.variant && <span style={{ fontFamily: FONT, fontSize: wide ? 14 : 13.5, color: COLORS.textMuted, whiteSpace: 'nowrap' }}>· {variantLabel(breakout.variant, t)}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: wide ? 10 : 8, minWidth: 0 }}>
          <span style={{ ...PLLABEL, minWidth: wide ? 58 : 54 }}>{t('logrow_shots')}</span>
          <span style={{ fontFamily: FONT, fontSize: wide ? 15 : 14, color: COLORS.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{shotsText}{row.outcomeDetail && ` · ${detailShort(row.outcomeDetail, t)}`}</span>
        </div>
      </div>
      {isPending && <Cloud size={14} strokeWidth={2} color={COLORS.accent} style={{ flexShrink: 0 }} />}
      {outcome && <span style={{ fontFamily: FONT, fontSize: wide ? 12.5 : 12, fontWeight: 800, color: oc, border: `1px solid ${oc}66`, background: `${oc}16`, borderRadius: wide ? 9 : 8, padding: wide ? '7px 13px' : '6px 11px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: 0.4 }}>{outcomeChipLabel(outcome, t)}</span>}
      {onMenu && <MoreBtn onClick={(e) => { e.stopPropagation(); onMenu(); }} />}
    </div>
  );
}

// Wide (≥720) day-summary stat cell (prototype TodayPointsWide) — derived, never invented.
function DayStat({ label, value, color }) {
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }}>
      <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 800, color: color || COLORS.text, ...TNUM }}>{value}</div>
      <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.6px', marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function TodaysLogsList({ playerId, uid, onNewPoint }) {
  const { t } = useLanguage();
  const device = useDevice();
  const wide = device.width >= 720;
  const navigate = useNavigate();
  const location = useLocation();
  // §C3 — the shared TabBar only renders at ≥2 content tabs; pure players get
  // full-bleed content, so the sticky CTA hugs the bottom instead of floating
  // above a bar that isn't there.
  const tabBarVisible = useTabBarVisible();
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
  // § self-log point delete (§7 ⋮ → ActionSheet → ConfirmModal). Only offered
  // for LINKED + persisted + NOT-propagated rows (see canDelete below).
  const [menuRow, setMenuRow] = useState(null);
  const deleteConfirm = useConfirm();

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

      <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, paddingBottom: 'calc(176px + env(safe-area-inset-bottom, 0px))', width: '100%', boxSizing: 'border-box', maxWidth: wide ? 760 : undefined, margin: wide ? '0 auto' : undefined }}>
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
            <span aria-hidden style={{ flexShrink: 0, display: 'inline-flex' }}><RdIcon name="user" size={14} /></span>
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

        {wide && combined.length > 0 && (() => {
          const aliveN = combined.filter(r => r.outcome === 'alive').length;
          const lostN = combined.length - aliveN;
          return (
            <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 14, boxShadow: ELEV.shadow1, padding: 6, display: 'flex', alignItems: 'stretch', marginBottom: 18 }}>
              <DayStat label="PUNKTY" value={combined.length} />
              <div style={{ width: 1, background: ELEV.hairline, margin: '10px 0' }} />
              <DayStat label="PRZEŻYTE" value={aliveN} color={COLORS.success} />
              <div style={{ width: 1, background: ELEV.hairline, margin: '10px 0' }} />
              <DayStat label="STRACONE" value={lostN} color={lostN > 0 ? COLORS.danger : COLORS.textMuted} />
            </div>
          );
        })()}

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

        {combined.map((row, idx) => {
          // Deletable, two cases — both persisted (has id, not a local-queue
          // pending row):
          //   • LINKED /selfReports/ — only when NOT propagated (§110).
          //   • UNLINKED /pendingSelfReports/ — always safe (§110 Part b): an
          //     unlinked draft is never propagated → no point/rollup contribution.
          const canDelete = !row._isPending && !!row.id
            && (isLinked ? !row.propagatedAt : true);
          // PROPAGATED linked row (§110.1 Part a — block-while-propagated): its
          // observation is merged into a W4 point's slot-level consensus (§70,
          // sources-immutable); standalone delete is rejected (mixed-source, no
          // per-entry provenance). Still opens the ⋮ — but to an HONEST
          // explanatory state, never a dead/absent control. Correction is Stage 4
          // reassign territory (queued).
          const isPropagatedRow = isLinked && !row._isPending && !!row.id && !!row.propagatedAt;
          return (
            <PremiumLogCard
              key={row.id || `row_${idx}`}
              row={row}
              ordinal={combined.length - idx}
              isPending={row._isPending}
              onMenu={(canDelete || isPropagatedRow) ? () => setMenuRow(row) : undefined}
              t={t}
              wide={wide}
            />
          );
        })}

        {/* Brief E Gap 3 — "Zobacz statystyki dnia" footer link. Visible
            only when (a) player is linked (anonymous PPT logs not yet
            mapped to a stats page) and (b) at least one log exists today.
            Ghost variant by design — the sticky "+ Nowy punkt" amber CTA
            below stays the screen's primary action (§ 27 anti-pattern:
            multiple CTAs competing on same surface). */}
        {playerId && combined.length > 0 && (
          <div style={{ marginTop: SPACE.lg, textAlign: 'center' }}>
            <Btn variant="ghost"
              onClick={() => navigate(`/player/${playerId}/stats`)}
              style={{ minHeight: 44, color: COLORS.accent, fontWeight: 700 }}>
              {t('ppt_logs_view_stats_link') || 'Zobacz statystyki dnia →'}
            </Btn>
          </div>
        )}
      </div>

      {/* Sticky + Nowy punkt — routes via parent (picker vs wizard decision). */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0,
        // § Gracz fix — sits ABOVE the shared TabBar (height 56 + safe-area)
        // when it renders; §C3 single-role users have no bar → hug the bottom.
        bottom: tabBarVisible
          ? 'calc(56px + env(safe-area-inset-bottom, 0px))'
          : 'env(safe-area-inset-bottom, 0px)',
        padding: `${SPACE.md}px ${SPACE.lg}px`,
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

      {/* § self-log point delete — §7 ⋮ → ActionSheet → ConfirmModal (reuses the
          exact components scouted points use, MatchPage). Only un-propagated
          /selfReports/ (linked) or /pendingSelfReports/ (unlinked) rows reach
          here (gated above). Delete = bare deleteDoc on the right collection
          (neither has anything downstream); refresh on confirm. */}
      <ActionSheet
        open={!!menuRow}
        onClose={() => setMenuRow(null)}
        actions={
          menuRow?.propagatedAt
            // Propagated (§110.1) — honest non-deletable state, not a delete action.
            ? [{ label: t('ppt_delete_propagated_note'), disabled: true, onPress: () => {} }]
            : [{ label: t('ppt_delete_point'), danger: true, onPress: () => { deleteConfirm.ask(menuRow); setMenuRow(null); } }]
        }
      />
      <ConfirmModal {...deleteConfirm.modalProps(
        async (rowToDelete) => {
          if (rowToDelete?.id) {
            // Linked rows are /selfReports/; unlinked rows are /pendingSelfReports/.
            try {
              if (isLinked) await deleteSelfReport(rowToDelete.id);
              else await deletePendingSelfReport(rowToDelete.id);
            } catch { /* refresh shows current state */ }
          }
          await loadRows();
        },
        {
          title: t('ppt_delete_point'),
          message: t('ppt_delete_confirm_msg'),
          confirmLabel: t('ppt_delete_confirm_btn'),
          danger: true,
        },
      )} />
    </div>
  );
}
