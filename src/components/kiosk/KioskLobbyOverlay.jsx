import React, { useMemo } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { useKioskCompatible } from '../../utils/kioskViewport';
import { useTrainings, useMatchups, useTrainingPoints, usePlayers, useLayouts } from '../../hooks/useFirestore';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { SQUAD_MAP } from '../../utils/squads';
import KioskWizardHost from './KioskWizardHost';
import PlayerTile from './PlayerTile';
import OlderPointsSection from './OlderPointsSection';

/**
 * KioskLobbyOverlay — § 55.2 + § 55.3 lobby UI mounted as full-screen
 * overlay at App root. Driven by KioskContext.lobbyOpen.
 *
 * Composition (per mockup v3):
 *   - Header: back chevron, "Punkt #N — kliknij swoje imię", subtitle, progress pill
 *   - Grid of 5-row PlayerTiles, filtered to point.<side>Data.players[]
 *   - Wcześniejsze punkty section (collapsed MVP)
 *   - Tap tile → set kiosk.activePlayerId → render HotSheet wizard with
 *     overridden playerId. On wizard close → clear activePlayerId, lobby
 *     refreshes via Firestore live snapshot (✓ appears on tile).
 *
 * Hotfix 2026-04-29 (post-Brief-B regression): the previous single-component
 * structure had `useMemo(olderPoints)` AFTER the lobbyOpen early-return guard,
 * which violated React Hook Rules — when lobbyOpen flipped false→true the
 * hook count changed → React #310 ("Rendered more hooks than during the
 * previous render") crashed the app on tap-Przekaż-graczom. Same anti-pattern
 * that hit ScoutTabContent in commit bbad249 (2026-04-24). Split into outer
 * (guard only, 2 hooks total — kiosk + compatible) + inner (all data hooks +
 * useMemo, only mounted when conditions are met). Hooks now consistent within
 * each component → no #310.
 */
export default function KioskLobbyOverlay() {
  const kiosk = useKiosk();
  const compatible = useKioskCompatible();
  // Outer is purely a guard — no data hooks here, no useMemo. Inner mounts
  // only when conditions are met, ensuring hook order stability in BOTH
  // components.
  if (!kiosk || !kiosk.lobbyOpen || !compatible) return null;
  return <KioskLobbyOverlayInner kiosk={kiosk} />;
}

function KioskLobbyOverlayInner({ kiosk }) {
  const { t } = useLanguage();
  const { workspace } = useWorkspace();
  const { trainings } = useTrainings();
  const { matchups } = useMatchups(kiosk.trainingId);
  const { points: matchupPoints } = useTrainingPoints(kiosk.trainingId, kiosk.matchupId);
  const { players } = usePlayers();
  const { layouts } = useLayouts();

  const training = trainings.find(t => t.id === kiosk.trainingId);
  const matchup = matchups.find(m => m.id === kiosk.matchupId);
  const point = matchupPoints.find(p => p.id === kiosk.pointId);
  const layout = layouts.find(l => l.id === training?.layoutId);

  // § 55.6 Older points memo — runs UNCONDITIONALLY (hook order stability).
  // When `point` is missing (still loading), returns []. Computed before
  // any conditional return below.
  const sideKey = kiosk.scoutingSide === 'away' ? 'awayData' : 'homeData';
  const olderPoints = useMemo(() => {
    if (!point) return [];
    const currentOrder = point.order || Infinity;
    // Sorted index for pointNumber display (Hotfix #3 — point doc has no
    // pointNumber field; derive from sorted-by-order position).
    const sorted = [...matchupPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
    return matchupPoints
      .filter(p => (p.order || 0) < currentOrder)
      .map(p => {
        const sideD = p[sideKey] || {};
        // Hotfix #3: IDs in assignments[], not players[]
        const playerIdsP = (sideD.assignments || []).filter(Boolean);
        const sl = p.selfLogs || {};
        const missing = playerIdsP.filter(pid => !sl[pid]).length;
        const num = sorted.findIndex(sp => sp.id === p.id) + 1;
        return missing > 0
          ? { id: p.id, pointNumber: num, scoreLine: '', missingCount: missing }
          : null;
      })
      .filter(Boolean);
  }, [matchupPoints, sideKey, point]);

  if (!training || !matchup || !point) {
    return <LobbyShell onBack={kiosk.exitLobby} title={t('kiosk_lobby_loading')} />;
  }

  // § 55.2 filter: lobby shows ONLY players who played this point on
  // coach's scouted side. squadKey = matchup's home/away squad on that side.
  // (sideKey already computed above for the olderPoints memo — reuse.)
  const sideData = point[sideKey] || {};

  // Hotfix #3 (2026-04-29): IDs are in `assignments[]`, NOT `players[]`.
  // pointFactory.baseSide:
  //   players: Array(5).fill(null)       — POSITION objects {x,y}
  //   assignments: Array(5).fill(null)   — PLAYER IDS
  // § 55.2 spec text incorrectly said "point.homeData.players[]" — actual
  // training schema (per pointFactory.js + QuickLogView L110-114) puts IDs
  // in assignments and positions in players. Reading from assignments now.
  const playerIds = (sideData.assignments || []).filter(Boolean);
  const squadKey = kiosk.scoutingSide === 'away' ? matchup.awaySquad : matchup.homeSquad;
  const squadMeta = SQUAD_MAP[squadKey] || { name: squadKey, color: COLORS.textMuted };

  // Resolve player documents from IDs (slot-array indexing — assignments[i]
  // is the player ID for slot 0-4 per § 32 + Hotfix #3 schema correction).
  const tilePlayers = playerIds
    .map(pid => players.find(p => p.id === pid))
    .filter(Boolean);

  // Filled set: players who already wrote a self-log doc on this point.
  // § 55.3 says HotSheet writes selfLog to point + shot docs to subcollection.
  // Detect via point.selfLogs[playerId] existence (set by ds.setPlayerSelfLogTraining).
  const filledMap = point.selfLogs || {};

  const filledCount = tilePlayers.filter(p => !!filledMap[p.id]).length;
  const totalCount = tilePlayers.length;

  // Hotfix #3 (2026-04-29): point.pointNumber doesn't exist as a stored
  // field — derive from sorted matchupPoints index (matches QuickLogView
  // L102-104 pattern).
  const sortedPointsForNumber = [...matchupPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
  const pointNumber = sortedPointsForNumber.findIndex(p => p.id === point.id) + 1;

  const headerTitle = `${t('kiosk_lobby_header_prefix')} #${pointNumber || ''} — ${t('kiosk_lobby_header_action')}`;
  const headerSub = `${totalCount} ${t('kiosk_lobby_header_sub', squadMeta.name)}`;

  // Active player object for HotSheet identity override
  const activePlayer = kiosk.activePlayerId
    ? players.find(p => p.id === kiosk.activePlayerId)
    : null;
  const activeTeamId = activePlayer?.teamId || null;

  // Save handler called when KioskWizardHost Step 5 confirms.
  // Receives PPT-shaped state object (Path 2 / Hotfix #4 — § 54-aligned wizard).
  // Adapts to point-anchored storage:
  //   - point.selfLogs[playerId] = {breakout, breakoutVariant, outcome,
  //     deathReason, deathReasonText} — per-point summary keyed by player
  //   - point/{pid}/shots/ subcollection — one doc per logged shot
  // Distinct from PPT createSelfReport which writes to
  // players/{pid}/selfReports/ (orphan-friendly, matched post-hoc).
  // KIOSK has known point context (kiosk.pointId), no need for orphan path.
  async function handleKioskSelfLogSave(wizardState) {
    if (!kiosk.activePlayerId || !kiosk.pointId) return;
    const pid = kiosk.pointId;
    const uid = activePlayer?.linkedUid || null;
    const {
      breakout,           // { side, bunker } from Step1
      variant,            // 'late-break' | 'na-wslizgu' | ... | null
      shots,              // [{bunker, result?}, ...] from Step3
      outcome,            // 'alive' | 'elim_break' | 'elim_midgame' | 'elim_endgame'
      outcomeDetail,      // canonical reason key from Step4b ('gunfight'|'przejscie'|...)
      outcomeDetailText,  // free text for 'inne' reason
    } = wizardState;

    // 1. Per-point selfLog summary. Extra fields (deathReason*) are
    // accepted by setPlayerSelfLogTraining via spread — schema is
    // map-update with arbitrary keys.
    await ds.setPlayerSelfLogTraining(kiosk.trainingId, kiosk.matchupId, pid, kiosk.activePlayerId, {
      breakout: breakout?.bunker || null,
      breakoutSide: breakout?.side || null,
      breakoutVariant: variant || null,
      outcome,
      // § 54.5 schema fields on selfLog (parallel to point.eliminations[]
      // for coach-side data, not strictly the same record but same
      // canonical taxonomy)
      deathReason: outcomeDetail || null,
      deathReasonText: outcomeDetailText || null,
    });

    // 2. Shot documents — one Firestore doc per shot in the wizard's array.
    // Synthetic xy comes from bunker center (per § 35.3 self-log honesty —
    // self-reported targets, not on-canvas taps).
    const bunkers = layout?.bunkers || [];
    const layoutIdForShot = layout?.id || null;
    const shotsArr = Array.isArray(shots) ? shots : [];
    for (const s of shotsArr) {
      if (!s?.bunker) continue;
      const b = bunkers.find(bb => (bb.positionName || bb.name) === s.bunker);
      const shotDoc = {
        playerId: kiosk.activePlayerId,
        scoutedBy: uid,
        breakout: breakout?.bunker || null,
        breakoutVariant: variant || null,
        targetBunker: s.bunker,
        result: s.result || 'unknown',
        x: b?.x ?? 0.5,
        y: b?.y ?? 0.5,
        layoutId: layoutIdForShot,
        tournamentId: kiosk.trainingId,
      };
      await ds.addSelfLogShotTraining(kiosk.trainingId, kiosk.matchupId, pid, shotDoc);
    }

    // 3. Clear active player → unmount wizard → lobby ✓ updates via snapshot
    kiosk.clearActivePlayer();
  }

  return (
    <LobbyShell onBack={kiosk.exitLobby} title={headerTitle} subtitle={headerSub} progress={`${filledCount} / ${totalCount} ✓`}>
      {/* Player grid — § 55.2 single-grid, no per-squad section headers */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: SPACE.lg,
        display: 'grid',
        gridTemplateColumns: `repeat(${Math.min(5, Math.max(1, totalCount))}, 1fr)`,
        gap: SPACE.md,
        minHeight: 0,
      }}>
        {tilePlayers.map(p => (
          <PlayerTile
            key={p.id}
            player={p}
            squadKey={squadKey}
            squadColor={squadMeta.color}
            squadLegacyLabel={squadMeta.name}
            training={training}
            filled={!!filledMap[p.id]}
            suggested={false /* MVP: no auto-suggestion logic */}
            onTap={() => kiosk.setActivePlayer(p.id)}
          />
        ))}
      </div>

      {olderPoints.length > 0 && (
        <div style={{ padding: `0 ${SPACE.lg}px ${SPACE.lg}px` }}>
          <OlderPointsSection
            olderPoints={olderPoints}
            onTapPoint={null /* MVP: not wired; § 55.6 follow-up */}
            t={t}
          />
        </div>
      )}

      {/* KioskWizardHost — § 55.3 lifecycle. PPT-style 5-step wizard
          (Hotfix #4 / Path 2 — replaces HotSheet per E2 amendment).
          Step components shared with PPT route; save adapter writes to
          point context instead of selfReports. Wizard close → clear
          active player → lobby snapshot updates ✓ on the tile. */}
      <KioskWizardHost
        open={!!kiosk.activePlayerId}
        onClose={() => kiosk.clearActivePlayer()}
        layout={layout}
        playerId={kiosk.activePlayerId}
        onSave={handleKioskSelfLogSave}
      />
    </LobbyShell>
  );
}

/**
 * LobbyShell — common chrome (back chevron, title, progress pill).
 * Extracted so loading + error states share styling with the populated case.
 */
function LobbyShell({ onBack, title, subtitle, progress, children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: COLORS.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: '#0d1117',
        borderBottom: `1px solid ${COLORS.border}`,
        padding: `14px 18px`,
        display: 'flex', alignItems: 'center', gap: 14,
        minHeight: 56, flexShrink: 0,
      }}>
        <div onClick={onBack} style={{
          color: COLORS.accent, fontSize: 22, fontWeight: 500,
          cursor: 'pointer', padding: '4px 8px',
          WebkitTapHighlightColor: 'transparent',
          minWidth: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>‹</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 600,
            color: COLORS.text, lineHeight: 1.2,
          }}>{title}</div>
          {subtitle && <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2,
          }}>{subtitle}</div>}
        </div>
        {progress && <div style={{
          fontFamily: FONT, fontSize: 14, fontWeight: 800,
          color: COLORS.success,
          background: 'rgba(34, 197, 94, 0.1)',
          border: `1px solid rgba(34, 197, 94, 0.25)`,
          padding: '6px 10px', borderRadius: 8,
        }}>{progress}</div>}
      </div>
      {children}
    </div>
  );
}
