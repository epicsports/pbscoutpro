import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { Btn, SectionTitle, Select, Icons, EmptyState, ScoreBadge } from '../components/ui';
import { useTournaments, useTeams, useScoutedTeams, useMatches, usePoints, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, POINT_OUTCOMES } from '../utils/theme';
import { matchScore, mirrorX } from '../utils/helpers';

const E5 = () => [null, null, null, null, null];
const E5A = () => [[], [], [], [], []];
const E5B = () => [false, false, false, false, false];

function emptyTeamDraft() {
  return { players: E5(), shots: E5A(), assign: E5(), bumps: E5(), elim: E5B(), elimPos: E5() };
}

export default function ScoutingPage() {
  const { tournamentId, scoutedId, matchId } = useParams();
  const { tournaments } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const { scouted } = useScoutedTeams(tournamentId);
  const { matches } = useMatches(tournamentId, scoutedId);
  const { points, loading } = usePoints(tournamentId, scoutedId, matchId);

  // Dual-team draft: 'A' = this team, 'B' = opponent
  const [activeTeam, setActiveTeam] = useState('A');
  const [draftA, setDraftA] = useState(emptyTeamDraft());
  const [draftB, setDraftB] = useState(emptyTeamDraft());
  const [editingId, setEditingId] = useState(null);
  const [selPlayer, setSelPlayer] = useState(null);
  const [mode, setMode] = useState('place');
  const [heatmap, setHeatmap] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showOpponent, setShowOpponent] = useState(false);
  const [opponentTeamId, setOpponentTeamId] = useState('');
  const [pendingBump, setPendingBump] = useState(null); // which scouted team is opponent

  const tournament = tournaments.find(t => t.id === tournamentId);
  const scoutedEntry = scouted.find(s => s.id === scoutedId);
  const team = teams.find(t => t.id === scoutedEntry?.teamId);
  const match = matches.find(m => m.id === matchId);
  const rosterA = (scoutedEntry?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Auto-set opponent from match data if not already set
  const effectiveOpponentId = opponentTeamId || match?.opponentScoutedId || '';

  // Opponent roster
  const opponentScouted = scouted.find(s => s.id === effectiveOpponentId);
  const opponentTeam = teams.find(t => t.id === opponentScouted?.teamId);
  const rosterB = (opponentScouted?.roster || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  // Other scouted teams in this tournament for opponent picker
  const otherScouted = scouted.filter(s => s.id !== scoutedId);

  const draft = activeTeam === 'A' ? draftA : draftB;
  const setDraft = activeTeam === 'A' ? setDraftA : setDraftB;
  const roster = activeTeam === 'A' ? rosterA : rosterB;

  // Opponent players for mirror overlay (from the other draft) — must be before any early return
  const mirroredOpponent = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.players.map(p => p ? mirrorX(p) : null);
  }, [activeTeam, draftA.players, draftB.players]);

  const mirroredOpponentElim = useMemo(() => {
    const src = activeTeam === 'A' ? draftB : draftA;
    return src.elim || [false, false, false, false, false];
  }, [activeTeam, draftA.elim, draftB.elim]);

  if (!tournament || !match) return <EmptyState icon="⏳" text="Ładowanie..." />;

  const isComplete = draft.players.filter(Boolean).length === 5;
  const score = matchScore(points);

  const resetDraft = () => {
    setDraftA(emptyTeamDraft()); setDraftB(emptyTeamDraft());
    setEditingId(null); setSelPlayer(null); setMode('place'); setActiveTeam('A');
    setPendingBump(null);
  };

  // Switch team — auto-saves feel (data persists in state)
  const switchTeam = (t) => { setActiveTeam(t); setSelPlayer(null); setMode('place'); };

  // ─── Firestore helpers ───
  // Firestore doesn't support nested arrays. Convert shots[][] to {0:[],1:[],...}
  const shotsToFirestore = (shots) => {
    const obj = {};
    shots.forEach((arr, i) => { obj[String(i)] = arr || []; });
    return obj;
  };
  const shotsFromFirestore = (obj) => {
    if (Array.isArray(obj)) return obj; // legacy format
    if (!obj) return [[], [], [], [], []];
    return [0, 1, 2, 3, 4].map(i => obj[String(i)] || []);
  };

  // ─── Point CRUD ───
  const confirmPoint = async (outcome) => {
    if (!draftA.players.some(Boolean) || saving) return;
    setSaving(true);
    try {
      const data = {
        players: draftA.players,
        shots: shotsToFirestore(draftA.shots),
        assignments: draftA.assign,
        bumpStops: draftA.bumps,
        eliminations: draftA.elim,
        eliminationPositions: draftA.elimPos,
        outcome,
        opponentData: draftB.players.some(Boolean) ? {
          players: draftB.players,
          shots: shotsToFirestore(draftB.shots),
          assignments: draftB.assign,
          bumpStops: draftB.bumps,
          eliminations: draftB.elim,
          eliminationPositions: draftB.elimPos,
          teamId: effectiveOpponentId || null,
        } : null,
      };
      if (editingId) {
        await ds.updatePoint(tournamentId, scoutedId, matchId, editingId, data);
      } else {
        await ds.addPoint(tournamentId, scoutedId, matchId, data);
      }
      resetDraft();
    } catch (e) { console.error('Save failed:', e); }
    setSaving(false);
  };

  const editPoint = (pt) => {
    setDraftA({
      players: [...(pt.players || E5())],
      shots: shotsFromFirestore(pt.shots).map(s => [...(s || [])]),
      assign: [...(pt.assignments || E5())], bumps: [...(pt.bumpStops || E5())],
      elim: [...(pt.eliminations || E5B())], elimPos: [...(pt.eliminationPositions || E5())],
    });
    if (pt.opponentData) {
      setDraftB({
        players: [...(pt.opponentData.players || E5())],
        shots: shotsFromFirestore(pt.opponentData.shots).map(s => [...(s || [])]),
        assign: [...(pt.opponentData.assignments || E5())],
        bumps: [...(pt.opponentData.bumpStops || E5())],
        elim: [...(pt.opponentData.eliminations || E5B())],
        elimPos: [...(pt.opponentData.eliminationPositions || E5())],
      });
      if (pt.opponentData.teamId) setOpponentTeamId(pt.opponentData.teamId);
    } else {
      setDraftB(emptyTeamDraft());
    }
    setEditingId(pt.id); setSelPlayer(null); setMode('place'); setActiveTeam('A');
  };

  const handleDeletePoint = async (pid) => {
    await ds.deletePoint(tournamentId, scoutedId, matchId, pid);
    if (editingId === pid) resetDraft();
  };

  // ─── Canvas handlers (operate on active draft) ───
  // Pending bump: when user long-presses empty space, we store the bump
  // and the NEXT player placed will get this bump assigned

  const handlePlacePlayer = (pos) => {
    setDraft(prev => {
      const n = { ...prev, players: [...prev.players], bumps: [...prev.bumps] };
      const idx = n.players.findIndex(p => p === null);
      if (idx >= 0) {
        n.players[idx] = pos;
        // If there's a pending bump, assign it to this player
        if (pendingBump) {
          n.bumps[idx] = pendingBump;
        }
        setSelPlayer(idx);
      }
      return n;
    });
    setPendingBump(null);
  };

  const handleSelectPlayer = (idx) => {
    setSelPlayer(selPlayer === idx ? null : idx);
  };

  const handleMovePlayer = (idx, pos) => {
    setDraft(prev => { const n = { ...prev, players: [...prev.players] }; n.players[idx] = pos; return n; });
  };

  const removePlayer = (idx) => {
    setDraft(prev => ({
      ...prev,
      players: prev.players.map((p, i) => i === idx ? null : p),
      shots: prev.shots.map((s, i) => i === idx ? [] : [...s]),
      bumps: prev.bumps.map((b, i) => i === idx ? null : b),
      elim: prev.elim.map((e, i) => i === idx ? false : e),
      elimPos: prev.elimPos.map((e, i) => i === idx ? null : e),
      assign: prev.assign.map((a, i) => i === idx ? null : a),
    }));
    setSelPlayer(null);
  };

  const handlePlaceShot = (pi, pos) => {
    setDraft(prev => {
      const n = { ...prev, shots: prev.shots.map(s => [...s]) };
      n.shots[pi].push(pos);
      return n;
    });
  };

  const handleDeleteShot = (pi, si) => {
    setDraft(prev => {
      const n = { ...prev, shots: prev.shots.map(s => [...s]) };
      n.shots[pi].splice(si, 1);
      return n;
    });
  };

  // BumpStop from canvas: {x, y, duration} — store as pending, next player gets it
  const handleBumpStop = (bumpData) => {
    setPendingBump(bumpData);
  };

  const toggleElim = (idx) => {
    setDraft(prev => { const n = { ...prev, elim: [...prev.elim] }; n.elim[idx] = !n.elim[idx]; return n; });
  };

  const clearBump = (idx) => {
    setDraft(prev => { const n = { ...prev, bumps: [...prev.bumps] }; n.bumps[idx] = null; return n; });
  };

  // #3 fix: unique player assignment — filter out already-assigned players from dropdown
  const getAvailableRoster = (slotIdx) => {
    const usedIds = draft.assign.filter((a, i) => a && i !== slotIdx);
    return roster.filter(p => !usedIds.includes(p.id));
  };

  // ─── Heatmap ───
  if (heatmap) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
        <Header breadcrumbs={[tournament.name, team?.name, match.name, 'Heatmapa']} />
        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Btn variant="ghost" onClick={() => setHeatmap(null)}><Icons.Back /> Wróć</Btn>
          <SectionTitle>{heatmap.type === 'positions' ? 'Pozycje' : 'Ostrzał'}</SectionTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="default" active={heatmap.type === 'positions'} onClick={() => setHeatmap({ type: 'positions' })}><Icons.Heat /> Pozycje</Btn>
            <Btn variant="default" active={heatmap.type === 'shooting'} onClick={() => setHeatmap({ type: 'shooting' })}><Icons.Target /> Ostrzał</Btn>
          </div>
          <HeatmapCanvas fieldImage={tournament.fieldImage} points={points} mode={heatmap.type} rosterPlayers={rosterA} />
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>{points.length} punktów</div>
        </div>
      </div>
    );
  }

  // ─── Main view ───
  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[tournament.name, team?.name, match.name]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        {/* Team A/B tabs */}
        <div style={{ padding: '8px 16px 4px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <Btn variant={activeTeam === 'A' ? 'accent' : 'default'} onClick={() => switchTeam('A')}
            style={{ flex: 1, justifyContent: 'center', fontWeight: 800 }}>
            🏴 {team?.name || 'Drużyna A'}
          </Btn>
          <Btn variant={activeTeam === 'B' ? 'accent' : 'default'} onClick={() => switchTeam('B')}
            style={{ flex: 1, justifyContent: 'center', fontWeight: 800 }}>
            <Icons.Swap /> {opponentTeam?.name || 'Przeciwnik'}
          </Btn>
        </div>

        {/* Opponent picker (when on team B and no opponent set) */}
        {activeTeam === 'B' && !opponentTeamId && otherScouted.length > 0 && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>Wybierz przeciwnika:</span>
            {otherScouted.map(s => {
              const t = teams.find(x => x.id === s.teamId);
              return t ? <Btn key={s.id} variant="default" size="sm" onClick={() => setOpponentTeamId(s.id)}>{t.name}</Btn> : null;
            })}
          </div>
        )}

        {/* Canvas */}
        <div style={{ padding: '4px 16px 8px' }}>
          <FieldCanvas fieldImage={tournament.fieldImage}
            players={draft.players} shots={draft.shots}
            bumpStops={draft.bumps} eliminations={draft.elim} eliminationPositions={draft.elimPos}
            onPlacePlayer={handlePlacePlayer} onMovePlayer={handleMovePlayer}
            onPlaceShot={handlePlaceShot} onDeleteShot={handleDeleteShot}
            onBumpStop={handleBumpStop} onSelectPlayer={handleSelectPlayer}
            editable selectedPlayer={selPlayer} mode={mode}
            playerAssignments={draft.assign} rosterPlayers={roster}
            opponentPlayers={showOpponent ? mirroredOpponent : undefined}
            opponentEliminations={showOpponent ? mirroredOpponentElim : []}
            showOpponentLayer={showOpponent}
            opponentColor={activeTeam === 'A' ? '#60a5fa' : '#f87171'} />
        </div>

        {/* Mode controls */}
        <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="default" active={mode === 'place'} onClick={() => setMode('place')}>✋ Pozycje</Btn>
          <Btn variant="default" active={mode === 'shoot'} onClick={() => setMode('shoot')}><Icons.Target /> Strzały</Btn>
          <div style={{ flex: 1 }} />
          <Btn variant={showOpponent ? 'accent' : 'default'} size="sm" onClick={() => setShowOpponent(!showOpponent)}>
            <Icons.Swap /> Warstwa
          </Btn>
        </div>

        {/* Pending bump indicator */}
        {pendingBump && (
          <div style={{ padding: '4px 16px 4px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.bumpStop, fontWeight: 700 }}>
              ⏱ Przycupa {pendingBump.duration}s — kliknij docelową pozycję gracza
            </span>
            <Btn variant="ghost" size="sm" onClick={() => setPendingBump(null)} style={{ color: COLORS.textMuted }}>✕</Btn>
          </div>
        )}

        {/* Player chips */}
        <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {draft.players.map((p, i) => {
            const rp = roster.find(tp => tp.id === draft.assign[i]);
            const isElim = draft.elim[i];
            const hasBump = !!draft.bumps[i];
            const teamColor = activeTeam === 'A' ? COLORS.playerColors[i] : '#60a5fa';
            return (
              <div key={i} onClick={() => p && setSelPlayer(selPlayer === i ? null : i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 20, minHeight: TOUCH.chipHeight,
                  fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700,
                  background: p ? (isElim ? COLORS.eliminatedOverlay + '30' : teamColor + '20') : COLORS.surface,
                  border: `2px solid ${p ? teamColor + (selPlayer === i ? 'ff' : '60') : COLORS.border}`,
                  color: p ? (isElim ? COLORS.textMuted : teamColor) : COLORS.textMuted,
                  cursor: p ? 'pointer' : 'default', opacity: isElim ? 0.6 : 1,
                  textDecoration: isElim ? 'line-through' : 'none',
                }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: p ? teamColor : COLORS.textMuted + '40' }} />
                {rp ? `#${rp.number} ${rp.nickname || ''}`.trim() : `P${i + 1}`}
                {isElim && <span>💀</span>}
                {hasBump && <span style={{ fontSize: 9, color: COLORS.bumpStop }}>⏱{draft.bumps[i].duration}s</span>}
                {draft.shots[i].length > 0 && <span style={{ fontSize: 9, opacity: 0.7 }}>🎯{draft.shots[i].length}</span>}
                {p && <span onClick={e => { e.stopPropagation(); removePlayer(i); }} style={{ cursor: 'pointer', opacity: 0.5, fontSize: 14, lineHeight: 1, marginLeft: 2 }}>×</span>}
              </div>
            );
          })}
        </div>

        {/* Selected player controls */}
        {selPlayer !== null && draft.players[selPlayer] && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', borderTop: `1px solid ${COLORS.border}30`, paddingTop: 8 }}>
            <Select value={draft.assign[selPlayer] || ''}
              onChange={v => setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[selPlayer] = v || null; return n; })}
              style={{ flex: 1, minWidth: 120 }}>
              <option value="">— Zawodnik —</option>
              {getAvailableRoster(selPlayer).map(p => <option key={p.id} value={p.id}>#{p.number} {p.nickname || p.name}</option>)}
            </Select>
            <Btn variant={draft.elim[selPlayer] ? 'danger' : 'default'} size="sm" onClick={() => toggleElim(selPlayer)}>
              <Icons.Skull /> {draft.elim[selPlayer] ? 'Żywy' : 'Trafiony'}
            </Btn>
            {draft.bumps[selPlayer] && <Btn variant="ghost" size="sm" onClick={() => clearBump(selPlayer)}><Icons.Reset /> Bump</Btn>}
            {mode === 'shoot' && draft.shots[selPlayer].length > 0 && (
              <Btn variant="ghost" size="sm" onClick={() => setDraft(prev => {
                const n = { ...prev, shots: prev.shots.map(s => [...s]) }; n.shots[selPlayer] = []; return n;
              })}><Icons.Reset /> Strzały</Btn>
            )}
          </div>
        )}

        {/* Actions */}
        <div style={{ padding: '4px 16px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="default" size="sm" onClick={resetDraft}><Icons.Reset /> Reset</Btn>
          {editingId && <Btn variant="ghost" size="sm" onClick={resetDraft}>Anuluj</Btn>}
        </div>

        {/* Outcome buttons — Wygrana/Przegrana/Czas save AND set outcome */}
        <div style={{ padding: '8px 16px 8px', display: 'flex', flexDirection: 'column', gap: 6, borderTop: `1px solid ${COLORS.border}30`, marginTop: 4 }}>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.textDim }}>
            Zapisz punkt z wynikiem ({team?.name}):
          </span>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {POINT_OUTCOMES.map(o => (
              <Btn key={o.key} variant={o.key} disabled={!draftA.players.some(Boolean) || saving}
                onClick={() => confirmPoint(o.key)} style={{ flex: 1, justifyContent: 'center' }}>
                {o.emoji} {o.label}
              </Btn>
            ))}
          </div>
        </div>

        {/* Heatmaps */}
        {points.length > 0 && (
          <div style={{ padding: '4px 16px 8px', display: 'flex', gap: 8 }}>
            <Btn variant="default" size="sm" onClick={() => setHeatmap({ type: 'positions' })}><Icons.Heat /> Heatmapa</Btn>
            <Btn variant="default" size="sm" onClick={() => setHeatmap({ type: 'shooting' })}><Icons.Target /> Strzały</Btn>
          </div>
        )}

        {/* Points list */}
        <div style={{ borderTop: `1px solid ${COLORS.border}`, flex: 1, overflowY: 'auto', padding: '10px 16px 16px' }}>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: COLORS.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
            Punkty ({points.length}) {score && <ScoreBadge points={points} />}
          </div>

          {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!loading && !points.length && (
            <div style={{ textAlign: 'center', padding: '24px 16px', color: COLORS.textMuted, fontFamily: FONT, fontSize: TOUCH.fontBase }}>
              Rozmieść graczy → zapisz punkt
            </div>
          )}

          {points.map((pt, idx) => {
            const oColor = pt.outcome === 'win' ? COLORS.win : pt.outcome === 'loss' ? COLORS.loss : pt.outcome === 'timeout' ? COLORS.timeout : COLORS.textMuted;
            const oLabel = pt.outcome === 'win' ? 'W' : pt.outcome === 'loss' ? 'L' : pt.outcome === 'timeout' ? 'T' : '—';
            const elimCount = (pt.eliminations || []).filter(Boolean).length;
            const hasOpp = !!pt.opponentData?.players?.some(Boolean);
            return (
              <div key={pt.id} className="fade-in" style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8,
                background: editingId === pt.id ? COLORS.accent + '12' : 'transparent',
                border: `1px solid ${editingId === pt.id ? COLORS.accent + '40' : 'transparent'}`,
                marginBottom: 4, minHeight: TOUCH.minTarget,
              }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, fontWeight: 800, color: COLORS.accent, width: 28 }}>#{idx + 1}</span>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800, color: oColor, background: oColor + '20', padding: '2px 8px', borderRadius: 5 }}>{oLabel}</span>
                <div style={{ display: 'flex', gap: 3, flex: 1, alignItems: 'center' }}>
                  {(pt.players || []).map((p, pi) => (
                    <div key={pi} style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: p ? (pt.eliminations?.[pi] ? COLORS.eliminatedOverlay : COLORS.playerColors[pi]) : COLORS.textMuted + '30',
                    }} />
                  ))}
                  {(() => { const s = shotsFromFirestore(pt.shots); return s.some(a => a?.length > 0); })() && <span style={{ fontSize: 9, marginLeft: 3 }}>🎯</span>}
                  {elimCount > 0 && <span style={{ fontSize: 9, marginLeft: 2 }}>💀{elimCount}</span>}
                  {hasOpp && <span style={{ fontSize: 9, marginLeft: 2, color: '#60a5fa' }}>⇄</span>}
                </div>
                <Btn variant="ghost" size="sm" onClick={() => editPoint(pt)} title="Edytuj"><Icons.Edit /></Btn>
                <Btn variant="ghost" size="sm" onClick={() => handleDeletePoint(pt.id)} title="Usuń"><Icons.Trash /></Btn>
              </div>
            );
          })}
        </div>

        {/* ═══ ZAPISZ PUNKT — sticky at bottom ═══ */}
        <div style={{
          padding: '12px 16px', borderTop: `2px solid ${COLORS.accent}40`,
          background: COLORS.surface, flexShrink: 0,
        }}>
          <Btn variant="accent"
            disabled={!draftA.players.some(Boolean) || saving}
            onClick={() => {
              const existingPoint = editingId ? points.find(p => p.id === editingId) : null;
              confirmPoint(existingPoint?.outcome || 'pending');
            }}
            style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: TOUCH.fontLg, fontWeight: 800 }}>
            <Icons.Check /> {saving ? 'Zapisywanie...' : editingId ? 'ZAPISZ ZMIANY' : 'ZAPISZ PUNKT'}
          </Btn>
        </div>
      </div>
    </div>
  );
}
