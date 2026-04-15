import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLogView from '../QuickLogView';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select, ConfirmModal } from '../ui';
import { useMatchups, usePlayers, useTrainingPoints } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';

const SQUAD_META = {
  red:    { name: 'R1', color: '#ef4444' },
  blue:   { name: 'R2', color: '#3b82f6' },
  green:  { name: 'R3', color: '#22c55e' },
  yellow: { name: 'R4', color: '#eab308' },
};

export default function TrainingScoutTab({ trainingId, training }) {
  const navigate = useNavigate();
  const { matchups, loading } = useMatchups(trainingId);
  const { players } = usePlayers();

  const [newMatchupOpen, setNewMatchupOpen] = useState(false);
  const [newHomeSquad, setNewHomeSquad] = useState('');
  const [newAwaySquad, setNewAwaySquad] = useState('');
  const [deleteMatchup, setDeleteMatchup] = useState(null);
  const [quickLogMatchupId, setQuickLogMatchupId] = useState(null);
  const [quickLogSide, setQuickLogSide] = useState('both');
  const [expandedSquad, setExpandedSquad] = useState(null);
  const { points: qlPoints } = useTrainingPoints(trainingId, quickLogMatchupId);

  const squadKeys = useMemo(() => {
    if (!training?.squads) return [];
    return Object.keys(training.squads).filter(k => SQUAD_META[k]);
  }, [training]);

  const squadRoster = (key) =>
    (training?.squads?.[key] || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  const handleCreateMatchup = async () => {
    if (!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad) return;
    await ds.addMatchup(trainingId, {
      homeSquad: newHomeSquad, awaySquad: newAwaySquad,
      homeRoster: training.squads[newHomeSquad] || [],
      awayRoster: training.squads[newAwaySquad] || [],
    });
    setNewMatchupOpen(false);
    setNewHomeSquad(''); setNewAwaySquad('');
  };

  const openNewMatchup = () => {
    if (squadKeys.length === 2) {
      const [a, b] = squadKeys;
      ds.addMatchup(trainingId, {
        homeSquad: a, awaySquad: b,
        homeRoster: training.squads[a] || [],
        awayRoster: training.squads[b] || [],
      });
      return;
    }
    setNewHomeSquad(squadKeys[0] || '');
    setNewAwaySquad(squadKeys[1] || '');
    setNewMatchupOpen(true);
  };

  // ─── QuickLog overlay ───
  const qlMatchup = quickLogMatchupId ? matchups.find(m => m.id === quickLogMatchupId) : null;
  if (qlMatchup) {
    const homeMeta = SQUAD_META[qlMatchup.homeSquad] || { name: qlMatchup.homeSquad, color: COLORS.textMuted };
    const awayMeta = SQUAD_META[qlMatchup.awaySquad] || { name: qlMatchup.awaySquad, color: COLORS.textMuted };
    const homeRoster = squadRoster(qlMatchup.homeSquad);
    const awayRoster = squadRoster(qlMatchup.awaySquad);

    const emptyData = (rosterArr, side) => {
      const a = Array(5).fill(null);
      rosterArr.forEach((p, i) => { if (i < 5) a[i] = p.id; });
      return {
        players: Array(5).fill(null), assignments: a,
        shots: Array(5).fill([]), eliminations: Array(5).fill(false),
        eliminationPositions: Array(5).fill(null), quickShots: {}, obstacleShots: {},
        bumpStops: Array(5).fill(null), runners: Array(5).fill(false),
        fieldSide: side,
      };
    };

    return (
      <QuickLogView
        teamA={{ name: homeMeta.name, id: qlMatchup.homeSquad, color: homeMeta.color }}
        teamB={{ name: awayMeta.name, id: qlMatchup.awaySquad, color: awayMeta.color }}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        points={qlPoints}
        activeTeam="A"
        activeSide={quickLogSide}
        onSavePoint={async ({ assignments, players: zonePlayers, outcome }) => {
          const makeData = (rosterArr, side) => {
            const a = Array(5).fill(null);
            const positions = Array(5).fill(null);
            const squadIds = new Set(rosterArr.map(p => p.id));
            const selectedIds = assignments.filter(id => id && squadIds.has(id));
            const pidsForSquad = selectedIds.length ? selectedIds : rosterArr.map(p => p.id);
            pidsForSquad.forEach((id, i) => {
              if (i >= 5) return;
              a[i] = id;
              if (zonePlayers) {
                const origIdx = assignments.indexOf(id);
                if (origIdx >= 0) positions[i] = zonePlayers[origIdx] || null;
              }
            });
            return {
              players: positions, assignments: a,
              shots: Array(5).fill([]), eliminations: Array(5).fill(false),
              eliminationPositions: Array(5).fill(null), quickShots: {}, obstacleShots: {},
              bumpStops: Array(5).fill(null), runners: Array(5).fill(false),
              fieldSide: side,
            };
          };
          let homeData, awayData;
          if (quickLogSide === 'home') {
            homeData = makeData(homeRoster, 'left');
            awayData = emptyData(awayRoster, 'right');
          } else if (quickLogSide === 'away') {
            homeData = emptyData(homeRoster, 'left');
            awayData = makeData(awayRoster, 'right');
          } else {
            homeData = makeData(homeRoster, 'left');
            awayData = makeData(awayRoster, 'right');
          }
          await ds.addTrainingPoint(trainingId, quickLogMatchupId, {
            homeData, awayData, outcome, status: 'scouted', fieldSide: 'left',
          });
          const newA = qlPoints.filter(p => p.outcome === 'win_a').length + (outcome === 'win_a' ? 1 : 0);
          const newB = qlPoints.filter(p => p.outcome === 'win_b').length + (outcome === 'win_b' ? 1 : 0);
          await ds.updateMatchup(trainingId, quickLogMatchupId, { scoreA: newA, scoreB: newB });
        }}
        onBack={() => { setQuickLogMatchupId(null); setQuickLogSide('both'); }}
        onSwitchToScout={() => {
          const mid = quickLogMatchupId;
          setQuickLogMatchupId(null);
          navigate(`/training/${trainingId}/matchup/${mid}?scout=${qlMatchup.homeSquad}`);
        }}
      />
    );
  }

  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

  const current = matchups.filter(m => m.status !== 'closed');
  const completed = matchups.filter(m => m.status === 'closed');

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 100 }}>
      {/* Tappable squad strip */}
      <div style={{ display: 'flex', gap: 6, marginBottom: SPACE.lg, alignItems: 'center', flexWrap: 'wrap' }}>
        {squadKeys.map(key => {
          const sq = SQUAD_META[key];
          const count = (training.squads[key] || []).length;
          const isOpen = expandedSquad === key;
          return (
            <div key={key} onClick={() => setExpandedSquad(isOpen ? null : key)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 10px', borderRadius: 8,
              background: isOpen ? `${sq.color}18` : COLORS.surfaceDark,
              border: `1px solid ${isOpen ? `${sq.color}50` : COLORS.border}`,
              cursor: 'pointer', minHeight: 32,
              WebkitTapHighlightColor: 'transparent',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: sq.color }} />
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: isOpen ? sq.color : COLORS.text }}>{sq.name}</span>
              <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>{count}</span>
            </div>
          );
        })}
        <div onClick={() => navigate(`/training/${trainingId}/setup`)} style={{
          width: 30, height: 30, borderRadius: 8,
          border: `1px dashed ${COLORS.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: COLORS.textMuted, fontSize: 16, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
        }}>+</div>
        <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted }}>
          {(training.attendees || []).length} players
        </span>
      </div>

      {/* Expanded squad roster */}
      {expandedSquad && (
        <div style={{
          marginBottom: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.md,
          background: COLORS.surfaceDark,
          border: `1px solid ${SQUAD_META[expandedSquad]?.color || COLORS.border}30`,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACE.sm }}>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: SQUAD_META[expandedSquad]?.color }}>
              {SQUAD_META[expandedSquad]?.name}
            </span>
            <span onClick={() => navigate(`/training/${trainingId}/squads`)} style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.accent, cursor: 'pointer',
            }}>Edit squad →</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {squadRoster(expandedSquad).map(p => (
              <span key={p.id} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.text,
                padding: '4px 8px', borderRadius: 6,
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              }}>{p.nickname || p.name}</span>
            ))}
          </div>
        </div>
      )}

      {/* Playing */}
      {current.length > 0 && (
        <>
          <SectionTitle>Playing ({current.length})</SectionTitle>
          {current.map(m => (
            <MatchupCard key={m.id} matchup={m} squadRoster={squadRoster}
              onOpenHome={() => { setQuickLogMatchupId(m.id); setQuickLogSide('home'); }}
              onOpenAway={() => { setQuickLogMatchupId(m.id); setQuickLogSide('away'); }}
              onOpenBoth={() => { setQuickLogMatchupId(m.id); setQuickLogSide('both'); }}
              onDelete={() => setDeleteMatchup({ id: m.id })}
              active
            />
          ))}
        </>
      )}

      {/* New matchup */}
      {squadKeys.length >= 2 && training.status !== 'closed' && (
        <Btn variant="accent" onClick={openNewMatchup} style={{
          width: '100%', minHeight: 52, marginTop: SPACE.sm, marginBottom: SPACE.xl,
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
        }}>
          + New matchup
        </Btn>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <>
          <SectionLabel>Completed ({completed.length})</SectionLabel>
          {completed.map(m => (
            <MatchupCard key={m.id} matchup={m} squadRoster={squadRoster}
              onOpen={() => navigate(`/training/${trainingId}/matchup/${m.id}`)}
              onDelete={() => setDeleteMatchup({ id: m.id })}
              active={false}
            />
          ))}
        </>
      )}

      {matchups.length === 0 && squadKeys.length < 2 && (
        <EmptyState icon="👥" text="Form at least 2 squads to start matchups"
          action={<Btn variant="accent" onClick={() => navigate(`/training/${trainingId}/squads`)}>Set up squads</Btn>}
        />
      )}

      {/* Modals */}
      <Modal open={newMatchupOpen} onClose={() => setNewMatchupOpen(false)} title="New matchup"
        footer={<>
          <Btn variant="default" onClick={() => setNewMatchupOpen(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleCreateMatchup}
            disabled={!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad}>Create</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Home squad</div>
            <Select value={newHomeSquad} onChange={setNewHomeSquad}>
              <option value="">— select —</option>
              {squadKeys.map(k => <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Away squad</div>
            <Select value={newAwaySquad} onChange={setNewAwaySquad}>
              <option value="">— select —</option>
              {squadKeys.filter(k => k !== newHomeSquad).map(k => <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>)}
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteMatchup} onClose={() => setDeleteMatchup(null)}
        title="Delete matchup?" message="All points scouted in this matchup will be permanently lost."
        confirmLabel="Delete" danger
        onConfirm={async () => { await ds.deleteMatchup(trainingId, deleteMatchup.id); setDeleteMatchup(null); }}
      />
    </div>
  );
}

function MatchupCard({ matchup, squadRoster, onOpen, onOpenHome, onOpenAway, onOpenBoth, onDelete, active }) {
  const home = SQUAD_META[matchup.homeSquad] || { name: matchup.homeSquad, color: COLORS.textMuted };
  const away = SQUAD_META[matchup.awaySquad] || { name: matchup.awaySquad, color: COLORS.textMuted };
  const homeCount = (matchup.homeRoster || []).length || squadRoster(matchup.homeSquad).length;
  const awayCount = (matchup.awayRoster || []).length || squadRoster(matchup.awaySquad).length;
  const sA = matchup.scoreA || 0;
  const sB = matchup.scoreB || 0;
  const handleLeft = (e) => { e.stopPropagation(); active ? onOpenHome?.() : onOpen?.(); };
  const handleRight = (e) => { e.stopPropagation(); active ? onOpenAway?.() : onOpen?.(); };
  const handleCenter = (e) => { e.stopPropagation(); active ? onOpenBoth?.() : onOpen?.(); };

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch', marginBottom: SPACE.xs,
      background: COLORS.surfaceDark, border: `1px solid ${active ? `${COLORS.accent}25` : COLORS.border}`,
      borderRadius: RADIUS.lg, overflow: 'hidden', opacity: active ? 1 : 0.7, minHeight: 62,
    }}>
      <div onClick={handleLeft} style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '12px 14px', WebkitTapHighlightColor: 'transparent', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: home.color, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{home.name}</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>({homeCount})</span>
        </div>
        {active && <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, marginTop: 3, marginLeft: 16 }}>tap to log</div>}
      </div>
      <div onClick={handleCenter} style={{
        flex: '0 0 auto', minWidth: 70, padding: '10px 8px', background: '#0d1117',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent', cursor: 'pointer',
      }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
          {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 8, fontWeight: 700, marginTop: 4, letterSpacing: '.4px',
          color: active ? COLORS.accent : COLORS.success,
        }}>{active ? 'SCOUT' : 'FINAL'}</div>
      </div>
      <div onClick={handleRight} style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
        padding: '12px 14px', WebkitTapHighlightColor: 'transparent', cursor: 'pointer',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>({awayCount})</span>
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{away.name}</span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: away.color, flexShrink: 0 }} />
        </div>
        {active && <div style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted, marginTop: 3, marginRight: 16 }}>tap to log</div>}
      </div>
      {onDelete && (
        <div onClick={e => { e.stopPropagation(); onDelete(); }} style={{
          width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: COLORS.textMuted, fontSize: 18, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        }}>⋮</div>
      )}
    </div>
  );
}
