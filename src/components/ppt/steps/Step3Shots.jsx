import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../../../utils/theme';
import { getBunkerSide } from '../../../utils/helpers';
import { getLayoutShotFrequencies } from '../../../services/playerPerformanceTrackerService';
import BunkerPickerGrid from '../BunkerPickerGrid';

/**
 * Step 3 — shots picker, multi-select. See DESIGN_DECISIONS § 48.3 Step 3
 * and § 48.6 adaptive thresholds.
 *
 * Cells come from layout crowdsource via getLayoutShotFrequencies
 * (layoutId, breakout.bunker) — all players' selfReports matching this
 * layout + breakout, aggregated by shot target. Bootstrap (< 20 total
 * shots) shows all bunkers sorted snake → center → dorito; mature
 * (≥ 20) shows top 6 by count + "Inne bunkry" chip for the rest.
 *
 * Toggle semantics: first tap adds to shots with next order (1, 2, 3…);
 * second tap removes and re-numbers remaining. Toggling runs through
 * `patch` (merge-without-advance) so the step stays put — the explicit
 * sticky "Dalej →" CTA fires `advance` and routes to Step 4. Bypass
 * skip link ("Nic nie strzelałem →") clears shots and advances
 * immediately.
 */

const SIDE_ORDER = { snake: 0, center: 1, dorito: 2 };

// Build the master-bunker list for Step 3 with a defensive dedupe by
// positionName. Some layouts carry duplicate entries per bunker name —
// legacy docs without a `role` field, BunkerEditorPage's persisted
// master+mirror pairs that share `positionName`, etc. The shots picker
// keys badges by `positionName`, so two cells with the same name would
// both light up on a single tap (2026-04-24 hotfix iPhone validation).
// First-write-wins keeps the master entry (mirrors are filtered first).
function bunkerListFromLayout(layout) {
  if (!layout?.bunkers) return [];
  const doritoSide = layout.doritoSide || 'top';
  const seen = new Map();
  for (const b of layout.bunkers) {
    if (b.role === 'mirror') continue;
    if (!b.positionName) continue;
    if (seen.has(b.positionName)) continue;
    seen.set(b.positionName, { ...b, side: getBunkerSide(b.x, b.y, doritoSide) });
  }
  return Array.from(seen.values());
}

export default function Step3Shots({ state, advance, patch, layout }) {
  const { t } = useLanguage();
  const [innerOpen, setInnerOpen] = useState(false);
  const [freq, setFreq] = useState({ mature: false, total: 0, top: [] });

  const breakoutBunker = state.breakout?.bunker || null;
  const layoutId = layout?.id || null;

  useEffect(() => {
    let cancelled = false;
    if (!layoutId || !breakoutBunker) return;
    getLayoutShotFrequencies(layoutId, breakoutBunker)
      .then(r => { if (!cancelled) setFreq(r); })
      .catch(() => { /* bootstrap fallback per § 48.6 */ });
    return () => { cancelled = true; };
  }, [layoutId, breakoutBunker]);

  const allBunkers = useMemo(() => bunkerListFromLayout(layout), [layout]);
  const sortedBunkers = useMemo(() =>
    [...allBunkers].sort((a, b) => {
      const ra = SIDE_ORDER[a.side] ?? 99;
      const rb = SIDE_ORDER[b.side] ?? 99;
      if (ra !== rb) return ra - rb;
      return (a.positionName || '').localeCompare(b.positionName || '');
    }),
  [allBunkers]);

  const top6 = useMemo(() => {
    if (!freq.mature) return [];
    const byName = new Map(allBunkers.map(b => [b.positionName, b]));
    return freq.top
      .map(f => byName.get(f.bunker))
      .filter(Boolean)
      .slice(0, 6);
  }, [freq, allBunkers]);

  const selectedNames = useMemo(
    () => new Set((state.shots || []).map(s => s.bunker)),
    [state.shots],
  );

  // In multi-select mode, selected cells always stay visible in the main
  // grid. If the user picked something from "Inne bunkry", append that to
  // the top 6 so they see their pick on the main screen after the sheet
  // closes — otherwise the shot appears to disappear.
  const cells = useMemo(() => {
    const base = freq.mature ? top6 : sortedBunkers;
    if (!freq.mature) return base;
    const topNames = new Set(base.map(b => b.positionName));
    const missing = sortedBunkers.filter(b =>
      selectedNames.has(b.positionName) && !topNames.has(b.positionName)
    );
    return [...base, ...missing];
  }, [freq.mature, top6, sortedBunkers, selectedNames]);

  // "Inne bunkry" bottom sheet — per § 48.3 excludes top 6 AND already-
  // selected shots (which are already visible on the main grid above).
  const innerBunkers = useMemo(() => {
    if (!freq.mature) return [];
    const visible = new Set(cells.map(b => b.positionName));
    return sortedBunkers.filter(b => !visible.has(b.positionName));
  }, [freq.mature, cells, sortedBunkers]);

  const selectedOrders = useMemo(() => {
    const m = new Map();
    (state.shots || []).forEach((s, i) => m.set(s.bunker, i + 1));
    return m;
  }, [state.shots]);

  const toggleShot = (bunker) => {
    setInnerOpen(false);
    const current = state.shots || [];
    const existingIdx = current.findIndex(s => s.bunker === bunker.positionName);
    let next;
    if (existingIdx !== -1) {
      next = current.filter((_, i) => i !== existingIdx)
        .map((s, i) => ({ ...s, order: i + 1 }));
    } else {
      next = [...current, {
        side: bunker.side,
        bunker: bunker.positionName,
        order: current.length + 1,
      }];
    }
    patch({ shots: next });
  };

  const handleNext = () => {
    advance({ shots: state.shots || [] });
  };
  const handleSkip = () => {
    advance({ shots: [] });
  };

  const hintText = t('ppt_step3_hint', (state.shots || []).length);
  const canAdvance = (state.shots || []).length > 0;

  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800,
        color: COLORS.text, letterSpacing: '-0.6px', marginBottom: 6,
      }}>
        {t('ppt_step3_question')}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, marginBottom: 20,
      }}>
        {hintText}
      </div>

      {cells.length === 0 ? (
        <div style={{
          padding: SPACE.xl, textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          fontStyle: 'italic',
        }}>
          {t('ppt_step1_no_bunkers')}
        </div>
      ) : (
        <BunkerPickerGrid
          cells={cells}
          selectedOrders={selectedOrders}
          onTap={toggleShot}
          showInneChip={freq.mature && innerBunkers.length > 0}
          onInneTap={() => setInnerOpen(true)}
        />
      )}

      <div
        onClick={handleSkip}
        role="button"
        style={{
          marginTop: SPACE.sm, padding: 14,
          textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
          color: COLORS.textMuted,
          cursor: 'pointer', minHeight: 44,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {t('ppt_step3_skip')}
      </div>

      <div style={{ marginTop: SPACE.lg }}>
        <Btn variant="accent" onClick={handleNext} disabled={!canAdvance}
          style={{ width: '100%', minHeight: 64, fontSize: 17, fontWeight: 800 }}>
          {t('ppt_step3_next')}
        </Btn>
      </div>

      <Modal open={innerOpen} onClose={() => setInnerOpen(false)} title={t('ppt_inne_bunkers')}>
        {innerBunkers.length === 0 ? (
          <div style={{
            padding: SPACE.md, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>—</div>
        ) : (
          <BunkerPickerGrid
            cells={innerBunkers}
            selectedOrders={selectedOrders}
            onTap={toggleShot}
          />
        )}
      </Modal>
    </div>
  );
}
