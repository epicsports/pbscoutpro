import React, { useMemo } from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { useKioskCompatible } from '../../utils/kioskViewport';
import { useTrainings, useMatchups, useTrainingPoints, usePlayers, useLayouts } from '../../hooks/useFirestore';
import { useLanguage } from '../../hooks/useLanguage';
import { useWorkspace } from '../../hooks/useWorkspace';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { SQUAD_MAP } from '../../utils/squads';
import HotSheet from '../selflog/HotSheet';
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
 */
export default function KioskLobbyOverlay() {
  const kiosk = useKiosk();
  const compatible = useKioskCompatible();
  const { t } = useLanguage();
  const { workspace } = useWorkspace();
  const { trainings } = useTrainings();
  const { matchups } = useMatchups(kiosk?.lobbyOpen ? kiosk.trainingId : null);
  const { points: matchupPoints } = useTrainingPoints(
    kiosk?.lobbyOpen ? kiosk.trainingId : null,
    kiosk?.lobbyOpen ? kiosk.matchupId : null,
  );
  const { players } = usePlayers();
  const { layouts } = useLayouts();

  // Hard guards: not visible unless lobby open + viewport compatible
  if (!kiosk || !kiosk.lobbyOpen || !compatible) return null;

  const training = trainings.find(t => t.id === kiosk.trainingId);
  const matchup = matchups.find(m => m.id === kiosk.matchupId);
  const point = matchupPoints.find(p => p.id === kiosk.pointId);
  const layout = layouts.find(l => l.id === training?.layoutId);

  if (!training || !matchup || !point) {
    // Data still loading or missing — show neutral overlay placeholder.
    return <LobbyShell onBack={kiosk.exitLobby} title={t('kiosk_lobby_loading')} />;
  }

  // § 55.2 filter: lobby shows ONLY players who played this point on
  // coach's scouted side. squadKey = matchup's home/away squad on that side.
  const sideKey = kiosk.scoutingSide === 'away' ? 'awayData' : 'homeData';
  const sideData = point[sideKey] || {};
  const playerIds = (sideData.players || []).filter(Boolean);
  const squadKey = kiosk.scoutingSide === 'away' ? matchup.awaySquad : matchup.homeSquad;
  const squadMeta = SQUAD_MAP[squadKey] || { name: squadKey, color: COLORS.textMuted };

  // Resolve player documents from IDs (slot-array indexing — homeData.players
  // is an array of player IDs per slot 0-4 per § 32 + § 55.2).
  const tilePlayers = playerIds
    .map(pid => players.find(p => p.id === pid))
    .filter(Boolean);

  // Filled set: players who already wrote a self-log doc on this point.
  // § 55.3 says HotSheet writes selfLog to point + shot docs to subcollection.
  // Detect via point.selfLogs[playerId] existence (set by ds.setPlayerSelfLogTraining).
  const filledMap = point.selfLogs || {};

  const filledCount = tilePlayers.filter(p => !!filledMap[p.id]).length;
  const totalCount = tilePlayers.length;

  // Older points: those before this matchup point with at least one player
  // missing a self-log. Lightweight client-side filter.
  const olderPoints = useMemo(() => {
    const currentOrder = point.order || Infinity;
    return matchupPoints
      .filter(p => (p.order || 0) < currentOrder)
      .map(p => {
        const sideD = p[sideKey] || {};
        const playerIdsP = (sideD.players || []).filter(Boolean);
        const sl = p.selfLogs || {};
        const missing = playerIdsP.filter(pid => !sl[pid]).length;
        return missing > 0
          ? {
              id: p.id,
              pointNumber: p.pointNumber || '',
              scoreLine: '',
              missingCount: missing,
            }
          : null;
      })
      .filter(Boolean);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchupPoints, sideKey, point.order]);

  const headerTitle = `${t('kiosk_lobby_header_prefix')} #${point.pointNumber || ''} — ${t('kiosk_lobby_header_action')}`;
  const headerSub = `${totalCount} ${t('kiosk_lobby_header_sub')(squadMeta.name)}`;

  // Active player object for HotSheet identity override
  const activePlayer = kiosk.activePlayerId
    ? players.find(p => p.id === kiosk.activePlayerId)
    : null;
  const activeTeamId = activePlayer?.teamId || null;

  // Save handler when HotSheet "Zapisz" is tapped — KIOSK identity override
  // means selfPlayerId comes from kiosk.activePlayerId, NOT linkedPlayer.
  // Logic mirrors MatchPage handleSelfLogSave but anchored to known pointId.
  async function handleKioskSelfLogSave({ breakout, breakoutVariant, outcome, shots: shotMap, variants: availableVariants }) {
    if (!kiosk.activePlayerId || !kiosk.pointId) return;
    const pid = kiosk.pointId;
    const uid = activePlayer?.linkedUid || null; // best-guess attribution

    // 1. Self-log on the point
    await ds.setPlayerSelfLogTraining(kiosk.trainingId, kiosk.matchupId, pid, kiosk.activePlayerId, {
      breakout, breakoutVariant, outcome,
    });

    // 2. Shot documents with synthetic coords (bunker center)
    const bunkers = layout?.bunkers || [];
    const layoutIdForShot = layout?.id || null;
    for (const [targetBunker, result] of Object.entries(shotMap || {})) {
      const b = bunkers.find(bb => (bb.positionName || bb.name) === targetBunker);
      const shotDoc = {
        playerId: kiosk.activePlayerId,
        scoutedBy: uid,
        breakout, breakoutVariant,
        targetBunker, result,
        x: b?.x ?? 0.5,
        y: b?.y ?? 0.5,
        layoutId: layoutIdForShot,
        tournamentId: kiosk.trainingId,
      };
      await ds.addSelfLogShotTraining(kiosk.trainingId, kiosk.matchupId, pid, shotDoc);
    }

    // 3. Increment team variant usage (best-effort)
    if (breakoutVariant && activeTeamId) {
      const v = (availableVariants || []).find(vv => vv.variantName === breakoutVariant);
      if (v) await ds.incrementVariantUsage(activeTeamId, v.id).catch(() => {});
    }
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

      {/* HotSheet wizard — opens when activePlayerId set; uses overridden
          identity. § 55.3 lifecycle: wizard close → clear active player →
          lobby snapshot updates ✓ on the tile. */}
      <HotSheet
        open={!!kiosk.activePlayerId}
        onClose={() => kiosk.clearActivePlayer()}
        layout={layout}
        playerId={kiosk.activePlayerId}
        teamId={activeTeamId}
        points={matchupPoints}
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
