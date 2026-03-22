import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, SectionTitle, Select, Icons, EmptyState } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT } from '../utils/theme';
import { matchScore } from '../utils/helpers';

export default function ScoutingPage() {
  const { tournamentId, scoutedId, matchId } = useParams();
  const { tournaments } = useTournaments();
  const { teams: globalTeams } = useTeams();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId, scoutedId);
  const { points, loading } = usePoints(tournamentId, scoutedId, matchId);

  const [draftPlayers, setDraftPlayers] = useState([null, null, null, null, null]);
  const [draftShots, setDraftShots] = useState([[], [], [], [], []]);
  const [draftAssignments, setDraftAssignments] = useState([null, null, null, null, null]);
  const [editingPointId, setEditingPointId] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [canvasMode, setCanvasMode] = useState('place');
  const [heatmap, setHeatmap] = useState(null);
  const [saving, setSaving] = useState(false);

  const tournament = tournaments.find((t) => t.id === tournamentId);
  const scoutedEntry = scouted.find((s) => s.id === scoutedId);
  const globalTeam = globalTeams.find((g) => g.id === scoutedEntry?.globalTeamId);
  const match = matches.find((m) => m.id === matchId);
  const rosterPlayers = globalTeam?.players || [];

  if (!tournament || !match) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const isComplete = draftPlayers.filter(Boolean).length === 5;
  const score = matchScore(points);

  const resetDraft = () => {
    setDraftPlayers([null, null, null, null, null]);
    setDraftShots([[], [], [], [], []]);
    setDraftAssignments([null, null, null, null, null]);
    setEditingPointId(null);
    setSelectedPlayer(null);
    setCanvasMode('place');
  };

  const confirmPoint = async (outcome) => {
    if (!isComplete || saving) return;
    setSaving(true);
    try {
      const data = {
        players: draftPlayers,
        shots: draftShots,
        assignments: draftAssignments,
        outcome,
        order: editingPointId ? undefined : Date.now(),
      };
      if (editingPointId) {
        await ds.updatePoint(tournamentId, scoutedId, matchId, editingPointId, data);
      } else {
        await ds.addPoint(tournamentId, scoutedId, matchId, data);
      }
      resetDraft();
    } catch (e) {
      console.error('Save point failed:', e);
    }
    setSaving(false);
  };

  const editPoint = (point) => {
    setDraftPlayers([...(point.players || [null, null, null, null, null])]);
    setDraftShots(point.shots ? point.shots.map((s) => [...s]) : [[], [], [], [], []]);
    setDraftAssignments(point.assignments ? [...point.assignments] : [null, null, null, null, null]);
    setEditingPointId(point.id);
    setSelectedPlayer(null);
    setCanvasMode('place');
  };

  const handleDeletePoint = async (pointId) => {
    await ds.deletePoint(tournamentId, scoutedId, matchId, pointId);
    if (editingPointId === pointId) resetDraft();
  };

  const handlePlacePlayer = (pos) => {
    setDraftPlayers((prev) => {
      const n = [...prev];
      const idx = n.findIndex((p) => p === null);
      if (idx >= 0) { n[idx] = pos; setSelectedPlayer(idx); }
      return n;
    });
  };

  const handleMovePlayer = (idx, pos) => {
    setDraftPlayers((prev) => { const n = [...prev]; n[idx] = pos; return n; });
  };

  const removePlayer = (idx) => {
    setDraftPlayers((prev) => { const n = [...prev]; n[idx] = null; return n; });
    setDraftShots((prev) => { const n = prev.map((s) => [...s]); n[idx] = []; return n; });
    setSelectedPlayer(null);
  };

  const handlePlaceShot = (pi, pos) => {
    setDraftShots((prev) => { const n = prev.map((s) => [...s]); n[pi].push(pos); return n; });
  };

  const clearShots = (pi) => {
    setDraftShots((prev) => { const n = prev.map((s) => [...s]); n[pi] = []; return n; });
  };

  // ─── Heatmap view ───
  if (heatmap) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={[tournament.name, globalTeam?.name, match.name, 'Heatmapa']} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={() => setHeatmap(null)}><Icons.Back /> Wróć</Btn>
          <SectionTitle>
            {heatmap.type === 'positions' ? 'Pozycje' : 'Ostrzał'} — {match.name}
          </SectionTitle>
          <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
            <Btn variant="default" size="sm" active={heatmap.type === 'positions'}
              onClick={() => setHeatmap({ type: 'positions' })}><Icons.Heat /> Pozycje</Btn>
            <Btn variant="default" size="sm" active={heatmap.type === 'shooting'}
              onClick={() => setHeatmap({ type: 'shooting' })}><Icons.Target /> Ostrzał</Btn>
          </div>
          <HeatmapCanvas fieldImage={tournament.fieldImage} points={points}
            mode={heatmap.type} rosterPlayers={rosterPlayers} />
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
            Dane z {points.length} punktów
          </div>
        </div>
      </div>
    );
  }

  // ─── Main scouting view ───
  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, globalTeam?.name, match.name]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* Canvas */}
        <div style={{ padding: '10px 14px 6px' }}>
          <FieldCanvas fieldImage={tournament.fieldImage} players={draftPlayers}
            shots={draftShots} onPlacePlayer={handlePlacePlayer}
            onMovePlayer={handleMovePlayer} onPlaceShot={handlePlaceShot}
            editable selectedPlayer={selectedPlayer} mode={canvasMode}
            playerAssignments={draftAssignments} rosterPlayers={rosterPlayers} />
        </div>

        {/* Mode toggle */}
        <div style={{ padding: '2px 14px 6px', display: 'flex', gap: 6 }}>
          <Btn variant="default" size="sm" active={canvasMode === 'place'}
            onClick={() => setCanvasMode('place')}>✋ Pozycje</Btn>
          <Btn variant="default" size="sm" active={canvasMode === 'shoot'}
            onClick={() => setCanvasMode('shoot')}><Icons.Target /> Strzały</Btn>
        </div>

        {/* Player chips */}
        <div style={{ padding: '2px 14px 6px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {draftPlayers.map((p, i) => {
            const rp = rosterPlayers.find((tp) => tp.id === draftAssignments[i]);
            return (
              <div key={i} onClick={() => p && setSelectedPlayer(selectedPlayer === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 16,
                  fontFamily: FONT, fontSize: 10, fontWeight: 700,
                  background: p ? COLORS.playerColors[i] + '20' : COLORS.surface,
                  border: `1.5px solid ${p ? COLORS.playerColors[i] + (selectedPlayer === i ? 'ff' : '60') : COLORS.border}`,
                  color: p ? COLORS.playerColors[i] : COLORS.textMuted, cursor: p ? 'pointer' : 'default',
                }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: p ? COLORS.playerColors[i] : COLORS.textMuted + '40' }} />
                {rp ? `#${rp.number} ${rp.nickname || ''}`.trim() : `P${i + 1}`}
                {draftShots[i].length > 0 && <span style={{ fontSize: 8, opacity: 0.7 }}>🎯{draftShots[i].length}</span>}
                {p && <span onClick={(e) => { e.stopPropagation(); removePlayer(i); }} style={{ cursor: 'pointer', opacity: 0.5, fontSize: 12, lineHeight: 1 }}>×</span>}
              </div>
            );
          })}
        </div>

        {/* Assignment controls */}
        {selectedPlayer !== null && draftPlayers[selectedPlayer] && (
          <div style={{ padding: '2px 14px 6px', display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 6 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>Zawodnik:</span>
            <Select value={draftAssignments[selectedPlayer] || ''}
              onChange={(v) => setDraftAssignments((prev) => { const n = [...prev]; n[selectedPlayer] = v || null; return n; })}>
              <option value="">— brak —</option>
              {rosterPlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.number} {p.nickname || p.name}
                </option>
              ))}
            </Select>
            {canvasMode === 'shoot' && (
              <>
                <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, marginLeft: 8 }}>
                  Strzały: {draftShots[selectedPlayer].length}
                </span>
                {draftShots[selectedPlayer].length > 0 && (
                  <Btn variant="ghost" size="sm" onClick={() => clearShots(selectedPlayer)}>
                    <Icons.Reset />
                  </Btn>
                )}
              </>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ padding: '4px 14px 6px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Btn variant="default" size="sm" onClick={resetDraft}><Icons.Reset /> Reset</Btn>
          {editingPointId && <Btn variant="ghost" size="sm" onClick={resetDraft}>Anuluj edycję</Btn>}
        </div>

        {/* Outcome buttons */}
        <div style={{ padding: '0 14px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, alignSelf: 'center' }}>Wynik:</span>
          <Btn variant="win" size="sm" disabled={!isComplete || saving} onClick={() => confirmPoint('win')}>
            ✅ Wygrana
          </Btn>
          <Btn variant="loss" size="sm" disabled={!isComplete || saving} onClick={() => confirmPoint('loss')}>
            ❌ Przegrana
          </Btn>
          <Btn variant="timeout" size="sm" disabled={!isComplete || saving} onClick={() => confirmPoint('timeout')}>
            ⏱ Czas
          </Btn>
        </div>

        {/* Heatmap buttons */}
        {points.length > 0 && (
          <div style={{ padding: '4px 14px 8px', display: 'flex', gap: 6, borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            <Btn variant="default" size="sm" onClick={() => setHeatmap({ type: 'positions' })}>
              <Icons.Heat /> Heatmapa pozycji
            </Btn>
            <Btn variant="default" size="sm" onClick={() => setHeatmap({ type: 'shooting' })}>
              <Icons.Target /> Heatmapa strzałów
            </Btn>
          </div>
        )}

        {/* Points list */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, flex: 1, overflowY: 'auto', padding: '8px 14px 14px' }}>
          <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            Punkty ({points.length})
            {score && (
              <span style={{ textTransform: 'none', letterSpacing: 0 }}>
                <span style={{ color: COLORS.win }}>{score.w}W</span>{' '}
                <span style={{ color: COLORS.loss }}>{score.l}L</span>{' '}
                {score.t > 0 && <span style={{ color: COLORS.timeout }}>{score.t}T</span>}
              </span>
            )}
          </div>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !points.length && (
            <div style={{ textAlign: 'center', padding: '20px 14px', color: COLORS.textMuted, fontFamily: FONT, fontSize: 11 }}>
              Rozmieść 5 graczy i zatwierdź punkt.
            </div>
          )}

          {points.map((point, idx) => {
            const oColor = point.outcome === 'win' ? COLORS.win : point.outcome === 'loss' ? COLORS.loss : COLORS.timeout;
            const oLabel = point.outcome === 'win' ? 'W' : point.outcome === 'loss' ? 'L' : 'T';
            return (
              <div key={point.id} className="fade-in" style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderRadius: 6,
                background: editingPointId === point.id ? COLORS.accent + '12' : 'transparent',
                border: `1px solid ${editingPointId === point.id ? COLORS.accent + '40' : 'transparent'}`,
                marginBottom: 3,
              }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent, width: 24 }}>
                  #{idx + 1}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 800, color: oColor,
                  background: oColor + '20', padding: '1px 6px', borderRadius: 4,
                }}>
                  {oLabel}
                </span>
                <div style={{ display: 'flex', gap: 2, flex: 1 }}>
                  {(point.players || []).map((p, pi) => (
                    <div key={pi} style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: p ? COLORS.playerColors[pi] : COLORS.textMuted + '30',
                    }} />
                  ))}
                  {point.shots?.some((s) => s?.length > 0) && (
                    <span style={{ fontSize: 8, marginLeft: 2 }}>🎯</span>
                  )}
                </div>
                <Btn variant="ghost" size="sm" onClick={() => editPoint(point)} title="Edytuj">
                  <Icons.Edit />
                </Btn>
                <Btn variant="ghost" size="sm" onClick={() => handleDeletePoint(point.id)} title="Usuń">
                  <Icons.Trash />
                </Btn>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
