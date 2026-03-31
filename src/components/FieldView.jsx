/**
 * FieldView — centralna warstwa wyświetlania boiska
 *
 * Zastępuje bezpośrednie użycie FieldCanvas/HeatmapCanvas w stronach.
 * Każda strona montuje <FieldView> z odpowiednim mode i layers.
 *
 * TRYBY (mode):
 *   'strategy'  — nazwy przeszkód, linie disco/zeeker, strefy danger/sajgon (LayoutsPage)
 *   'scouting'  — edycja rozbiegu i strzałów graczy (MatchPage editor, TacticPage)
 *   'heatmap'   — heatmapa pozycji/strzałów/przycup (MatchPage heatmap, ScoutedTeamPage)
 *   'view'      — widok tylko do odczytu (TournamentPage preview)
 *
 * WARSTWY (layers) — które elementy strategiczne pokazać:
 *   'bunkers'   — etykiety przeszkód
 *   'zones'     — strefy danger/sajgon
 *   'lines'     — linie disco/zeeker
 *
 * PRYMITYW DANYCH:
 *   field = { fieldImage, discoLine, zeekerLine, bunkers, dangerZone, sajgonZone, layout }
 *   — zwracany przez resolveFieldFull() z helpers.js
 */

import React, { useState } from 'react';
import FieldCanvas from './FieldCanvas';
import HeatmapCanvas from './HeatmapCanvas';
import { Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function FieldView({
  // ── Dane pola ──
  field = {},                    // { fieldImage, discoLine, zeekerLine, bunkers, dangerZone, sajgonZone }

  // ── Tryb i warstwy ──
  mode = 'view',                 // 'strategy' | 'scouting' | 'heatmap' | 'view'
  layers = ['lines'],            // which strategy layers to overlay

  // ── Scouting props (mode='scouting') ──
  players, shots, bumpStops, eliminations, eliminationPositions,
  onPlacePlayer, onMovePlayer, onPlaceShot, onDeleteShot,
  onBumpStop, onSelectPlayer,
  selectedPlayer, scoutingMode = 'place',
  playerAssignments, rosterPlayers,
  opponentPlayers, opponentEliminations,
  opponentAssignments, opponentRosterPlayers,
  showOpponentLayer, opponentColor,
  pendingBump,

  // ── Heatmap props (mode='heatmap') ──
  heatmapPoints = [],
  heatmapMode = 'positions',     // 'positions' | 'shooting'
  heatmapRosterPlayers = [],

  // ── Strategy edit props (mode='strategy') ──
  layoutEditMode = null,         // 'bunker' | 'danger' | 'sajgon'
  editDangerPoints = [],
  editSajgonPoints = [],
  onBunkerPlace, onBunkerMove, onBunkerDelete,
  onBunkerLabelNudge, onBunkerLabelOffset,
  onZonePoint, onZoneUndo, onZoneClose,

  // ── Layer toggles (external control) ──
  showBunkers: showBunkersProp,
  showZones: showZonesProp,
  showLines: showLinesProp,

  // ── UI controls visibility ──
  showLayerControls = false,     // show toggle buttons for layers
  showHeatmapControls = false,   // show heatmap type buttons
  onHeatmapModeChange,

  // ── Style ──
  style,
  className,
}) {
  const device = useDevice();
  const R = responsive(device.type);

  // Internal layer state (if not controlled externally)
  const [internalBunkers, setInternalBunkers] = useState(layers.includes('bunkers'));
  const [internalZones, setInternalZones] = useState(layers.includes('zones'));
  const [internalLines, setInternalLines] = useState(layers.includes('lines'));

  const showBunkers = showBunkersProp !== undefined ? showBunkersProp : internalBunkers;
  const showZones   = showZonesProp   !== undefined ? showZonesProp   : internalZones;
  const showLines   = showLinesProp   !== undefined ? showLinesProp   : internalLines;

  const hasBunkers  = (field.bunkers?.length || 0) > 0;
  const hasZones    = !!(field.dangerZone || field.sajgonZone);

  const discoLine  = showLines ? (field.discoLine  || 0) : 0;
  const zeekerLine = showLines ? (field.zeekerLine || 0) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }} className={className}>

      {/* ── Layer toggle controls ── */}
      {showLayerControls && (
        <div style={{ display: 'flex', gap: 6, padding: `4px 0`, flexWrap: 'wrap' }}>
          {hasBunkers && (
            <Btn variant={showBunkers ? 'accent' : 'default'} size="sm"
              onClick={() => setInternalBunkers(v => !v)}>
              🏷️ Bunkers
            </Btn>
          )}
          {hasZones && (
            <Btn variant={showZones ? 'accent' : 'default'} size="sm"
              onClick={() => setInternalZones(v => !v)}>
              ⚠️ Zones
            </Btn>
          )}
          <Btn variant={showLines ? 'accent' : 'default'} size="sm"
            onClick={() => setInternalLines(v => !v)}>
            〰️ Lines
          </Btn>
        </div>
      )}

      {/* ── Heatmap type controls ── */}
      {showHeatmapControls && mode === 'heatmap' && (
        <div style={{ display: 'flex', gap: 6, padding: `4px 0`, flexWrap: 'wrap' }}>
          <Btn variant={heatmapMode === 'positions' ? 'accent' : 'default'} size="sm"
            onClick={() => onHeatmapModeChange?.('positions')}>
            <Icons.Heat /> Positions
          </Btn>
          <Btn variant={heatmapMode === 'shooting' ? 'accent' : 'default'} size="sm"
            onClick={() => onHeatmapModeChange?.('shooting')}>
            <Icons.Target /> Shots
          </Btn>
        </div>
      )}

      {/* ── Canvas ── */}
      {mode === 'heatmap' ? (
        <HeatmapCanvas
          fieldImage={field.fieldImage}
          points={heatmapPoints}
          mode={heatmapMode}
          rosterPlayers={heatmapRosterPlayers}
          bunkers={field.bunkers || []}
          showBunkers={showBunkers}
          dangerZone={field.dangerZone}
          sajgonZone={field.sajgonZone}
          showZones={showZones}
        />
      ) : (
        <FieldCanvas
          fieldImage={field.fieldImage}
          discoLine={discoLine}
          zeekerLine={zeekerLine}
          bunkers={field.bunkers || []}
          showBunkers={showBunkers}
          dangerZone={field.dangerZone}
          sajgonZone={field.sajgonZone}
          showZones={showZones}

          // Scouting
          players={players || []}
          shots={shots || []}
          bumpStops={bumpStops || []}
          eliminations={eliminations || []}
          eliminationPositions={eliminationPositions || []}
          editable={mode === 'scouting'}
          selectedPlayer={selectedPlayer}
          mode={scoutingMode}
          playerAssignments={playerAssignments || []}
          rosterPlayers={rosterPlayers || []}
          opponentPlayers={opponentPlayers}
          opponentEliminations={opponentEliminations || []}
          opponentAssignments={opponentAssignments || []}
          opponentRosterPlayers={opponentRosterPlayers || []}
          showOpponentLayer={showOpponentLayer || false}
          opponentColor={opponentColor || '#60a5fa'}
          onPlacePlayer={onPlacePlayer}
          onMovePlayer={onMovePlayer}
          onPlaceShot={onPlaceShot}
          onDeleteShot={onDeleteShot}
          onBumpStop={onBumpStop}
          onSelectPlayer={onSelectPlayer}

          // Strategy edit
          layoutEditMode={layoutEditMode}
          editDangerPoints={editDangerPoints}
          editSajgonPoints={editSajgonPoints}
          onBunkerPlace={onBunkerPlace}
          onBunkerMove={onBunkerMove}
          onBunkerDelete={onBunkerDelete}
          onBunkerLabelNudge={onBunkerLabelNudge}
          onBunkerLabelOffset={onBunkerLabelOffset}
          onZonePoint={onZonePoint}
          onZoneUndo={onZoneUndo}
          onZoneClose={onZoneClose}
        />
      )}
    </div>
  );
}
