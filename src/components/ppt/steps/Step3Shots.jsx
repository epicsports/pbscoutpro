import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Btn } from '../../ui';
import { useLanguage } from '../../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, ELEV } from '../../../utils/theme';
import { getBunkerSide } from '../../../utils/helpers';
import { getLayoutShotFrequencies } from '../../../services/playerPerformanceTrackerService';
import { resolveZones } from '../../../utils/layoutZones';
import BunkerPickerGrid from '../BunkerPickerGrid';
import ZoneShotDrawer from '../ZoneShotDrawer';
import ShotDrawer from '../../ShotDrawer';

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

  // § zone-shot capture (Pattern B) — when the layout has drawable callout
  // zones, the shot step is a field-tap zone picker (ZoneShotDrawer) instead of
  // the bunker-NAME grid. Bunker-NAME grid stays as the fallback for layouts
  // with no zones (data layer dual-reads either shape, STAGE 0). Orientation is
  // a fixed right-half in the drawer (zones authored on the right; self-log).
  const zones = useMemo(
    () => resolveZones(layout).filter(z => Array.isArray(z?.polygon) && z.polygon.length >= 3),
    [layout],
  );
  const useZoneCapture = zones.length > 0;
  const [zoneDrawerOpen, setZoneDrawerOpen] = useState(false);

  // § Part B — precision self-log shot (reuses the scouting ShotDrawer; tap an
  // exact {x,y}). Available whenever the layout has a field image. Coexists with
  // the zone + bunker pickers (third disjoint subset of state.shots, by {x,y}).
  const usePrecision = !!layout?.fieldImage;
  const [precisionOpen, setPrecisionOpen] = useState(false);

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

  // § zone-shot — bunker-shots ({bunker}) and zone-shots ({zoneId}) coexist in
  // one `state.shots` array (the data layer dual-reads both shapes). The two
  // pickers operate on DISJOINT subsets and merge back, so a player can record
  // bunker targets AND zones in the same point.
  const bunkerSelectedShots = useMemo(() => (state.shots || []).filter(s => s?.bunker), [state.shots]);
  const zoneSelectedShots = useMemo(() => (state.shots || []).filter(s => s?.zoneId), [state.shots]);
  const precisionSelectedShots = useMemo(
    () => (state.shots || []).filter(s => typeof s?.x === 'number' && typeof s?.y === 'number'),
    [state.shots],
  );

  const selectedNames = useMemo(
    () => new Set(bunkerSelectedShots.map(s => s.bunker)),
    [bunkerSelectedShots],
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
    bunkerSelectedShots.forEach((s, i) => m.set(s.bunker, i + 1));
    return m;
  }, [bunkerSelectedShots]);

  const toggleShot = (bunker) => {
    setInnerOpen(false);
    const existingIdx = bunkerSelectedShots.findIndex(s => s.bunker === bunker.positionName);
    let nextBunker;
    if (existingIdx !== -1) {
      nextBunker = bunkerSelectedShots.filter((_, i) => i !== existingIdx)
        .map((s, i) => ({ ...s, order: i + 1 }));
    } else {
      nextBunker = [...bunkerSelectedShots, {
        side: bunker.side,
        bunker: bunker.positionName,
        order: bunkerSelectedShots.length + 1,
      }];
    }
    // Preserve zone + precision shots — the pickers own disjoint subsets.
    patch({ shots: [...nextBunker, ...zoneSelectedShots, ...precisionSelectedShots] });
  };

  // § Part B — precision shot handlers (merge with the other subsets). The
  // ShotDrawer indexes into the precision subset; rebuild on every mutation.
  const setPrecision = (list) =>
    patch({ shots: [...bunkerSelectedShots, ...zoneSelectedShots, ...list] });
  const addPrecisionShot = ({ x, y, isKill }) =>
    setPrecision([...precisionSelectedShots, { x, y, kill: !!isKill }]);
  const deletePrecisionShot = (i) =>
    setPrecision(precisionSelectedShots.filter((_, idx) => idx !== i));
  const togglePrecisionKill = (i) =>
    setPrecision(precisionSelectedShots.map((s, idx) => (idx === i ? { ...s, kill: !s.kill } : s)));
  const undoPrecisionShot = () => setPrecision(precisionSelectedShots.slice(0, -1));

  const handleNext = () => {
    advance({ shots: state.shots || [] });
  };
  const handleSkip = () => {
    advance({ shots: [] });
  };

  const shotCount = (state.shots || []).length;
  const hintText = t('ppt_step3_hint', shotCount);
  const canAdvance = shotCount > 0;

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

      {/* § zone-shot — zone-capture tile (when the layout has callout zones),
          shown ALONGSIDE the bunker grid: a player records bunker targets AND
          zones at the same time (disjoint subsets of state.shots). Tap →
          maximized drawer. §27: amber border only when zones are picked. */}
      {useZoneCapture && (
        <div
          onClick={() => setZoneDrawerOpen(true)}
          role="button"
          style={{
            minHeight: 72, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 18px', marginBottom: SPACE.md,
            background: ELEV.surface, boxShadow: ELEV.shadow1,
            border: `2px solid ${zoneSelectedShots.length > 0 ? COLORS.accent : ELEV.hairline}`,
            borderRadius: RADIUS.xl, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{
            fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700, color: COLORS.text,
          }}>
            {t('ppt_zone_tile')}
          </span>
          <span style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
            color: zoneSelectedShots.length > 0 ? COLORS.accent : COLORS.textMuted,
          }}>
            {zoneSelectedShots.length > 0 ? t('ppt_zone_tile_count', zoneSelectedShots.length) : '→'}
          </span>
        </div>
      )}

      {/* § Part B — precision-shot tile (when the layout has a field image),
          alongside the zone + bunker pickers. Tap → ShotDrawer (scouting
          precision idiom: tap exact {x,y} + kill-toggle). §27: amber border only
          when shots are placed. */}
      {usePrecision && (
        <div
          onClick={() => setPrecisionOpen(true)}
          role="button"
          style={{
            minHeight: 64, display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', padding: '0 18px', marginBottom: SPACE.md,
            background: ELEV.surface, boxShadow: ELEV.shadow1,
            border: `2px solid ${precisionSelectedShots.length > 0 ? COLORS.accent : ELEV.hairline}`,
            borderRadius: RADIUS.xl, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 700, color: COLORS.text }}>
            {t('ppt_precision_tile')}
          </span>
          <span style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
            color: precisionSelectedShots.length > 0 ? COLORS.accent : COLORS.textMuted,
          }}>
            {precisionSelectedShots.length > 0 ? t('ppt_precision_count', precisionSelectedShots.length) : '→'}
          </span>
        </div>
      )}

      {/* Bunker-NAME grid — pick bunker targets. Shown whenever the layout has
          bunkers; coexists with the zone tile above. Empty-state only when there
          are neither bunkers NOR zones. */}
      {cells.length > 0 ? (
        <BunkerPickerGrid
          cells={cells}
          selectedOrders={selectedOrders}
          onTap={toggleShot}
          showInneChip={freq.mature && innerBunkers.length > 0}
          onInneTap={() => setInnerOpen(true)}
        />
      ) : !useZoneCapture ? (
        <div style={{
          padding: SPACE.xl, textAlign: 'center',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          fontStyle: 'italic',
        }}>
          {t('ppt_step1_no_bunkers')}
        </div>
      ) : null}

      {/* § zone-shot — maximized capture drawer (mounted only while open so a
          fresh open re-seeds from the zone subset). Writes zone-shots, merged
          back with the bunker-shots so both targets persist. */}
      {zoneDrawerOpen && (
        <ZoneShotDrawer
          open
          layout={layout}
          fieldImage={layout?.fieldImage}
          initial={zoneSelectedShots}
          onSave={(zoneShots) => {
            patch({ shots: [...bunkerSelectedShots, ...zoneShots, ...precisionSelectedShots] });
            setZoneDrawerOpen(false);
          }}
          onClose={() => setZoneDrawerOpen(false)}
        />
      )}

      {/* § Part B — precision shot capture (reuses the scouting ShotDrawer).
          fieldSide='left' → viewportSide='right' (self-log fixed-right framing,
          matching the zone drawer). Writes {x,y,kill} into the precision subset;
          flows through the propagator → pt.shots[slot] → Step 1 precision. */}
      {precisionOpen && (
        <ShotDrawer
          open
          onClose={() => setPrecisionOpen(false)}
          playerIndex={0}
          playerLabel={t('ppt_precision_tile')}
          playerColor={COLORS.accent}
          fieldSide="left"
          fieldImage={layout?.fieldImage}
          fieldCalibration={layout?.fieldCalibration || null}
          bunkers={layout?.bunkers || []}
          shots={precisionSelectedShots.map(s => ({ x: s.x, y: s.y, isKill: !!s.kill }))}
          onAddShot={addPrecisionShot}
          onUndoShot={undoPrecisionShot}
          onDeleteShotIdx={deletePrecisionShot}
          onToggleKillShotIdx={togglePrecisionKill}
        />
      )}

      <div
        onClick={handleSkip}
        role="button"
        data-testid="ppt-shots-skip"
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

      {/* Spacer reserves room under the fixed footer so the last grid row
          isn't hidden when scrolled to the bottom. Footer height ≈ 64px CTA
          + 16px top + 16px bottom + safe-area inset. */}
      <div aria-hidden style={{ height: 120 }} />

      {/* Sticky "Dalej →" CTA — pinned to viewport bottom per § 48.3 spec
          so it stays visible while the user picks multiple shot targets
          (2026-04-24 follow-up fix). Mirrors the TodaysLogsList "+ Nowy
          punkt" pattern: position:fixed + safe-area inset + gradient
          fade-in to soften the floating-bar edge. */}
      <div style={{
        position: 'fixed',
        left: 0, right: 0, bottom: 0,
        padding: `${SPACE.md}px ${SPACE.lg}px`,
        paddingBottom: `calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
        background: `linear-gradient(180deg, rgba(8,12,20,0) 0%, ${COLORS.bg} 30%)`,
        zIndex: 20,
      }}>
        <Btn variant="accent" onClick={handleNext} disabled={!canAdvance} testId="ppt-shots-next"
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
