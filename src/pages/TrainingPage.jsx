import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import QuickLogView from '../components/QuickLogView';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select, ConfirmModal, SkeletonList } from '../components/ui';
import { useTeams, useTrainings, useMatchups, usePlayers, useTrainingPoints } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

/**
 * TrainingPage — matchups + scouting entry point (§ 32 step 3).
 *
 * Route: /training/:trainingId
 * Above: context bar (date + team + player count + Edit squads)
 * Middle: list of matchups — current (playing) + completed (final)
 * Footer: Results button; "+ New matchup" appears inline in the list
 */
const SQUAD_META = {
  red:    { name: 'R1',    color: '#ef4444' },
  blue:   { name: 'R2',   color: '#3b82f6' },
  green:  { name: 'R3',  color: '#22c55e' },
  yellow: { name: 'R4', color: '#eab308' },
};

export default function TrainingPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { trainings, loading: tLoading } = useTrainings();
  const { matchups, loading: mLoading } = useMatchups(trainingId);
  const { teams } = useTeams();
  const { players } = usePlayers();

  const training = trainings.find(t => t.id === trainingId);
  const team = training ? teams.find(t => t.id === training.teamId) : null;

  const [newMatchupOpen, setNewMatchupOpen] = useState(false);
  const [newHomeSquad, setNewHomeSquad] = useState('');
  const [newAwaySquad, setNewAwaySquad] = useState('');
  const [endConfirm, setEndConfirm] = useState(false);
  const [deleteMatchup, setDeleteMatchup] = useState(null);
  const [quickLogMatchupId, setQuickLogMatchupId] = useState(null);
  const { points: qlPoints } = useTrainingPoints(trainingId, quickLogMatchupId);

  const squadKeys = useMemo(() => {
    if (!training?.squads) return [];
    return Object.keys(training.squads).filter(k => SQUAD_META[k]);
  }, [training]);

  const squadRoster = (key) =>
    (training?.squads?.[key] || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  const handleCreateMatchup = async () => {
    if (!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad) return;
    const homeRoster = training.squads[newHomeSquad] || [];
    const awayRoster = training.squads[newAwaySquad] || [];
    await ds.addMatchup(trainingId, {
      homeSquad: newHomeSquad,
      awaySquad: newAwaySquad,
      homeRoster,
      awayRoster,
    });
    setNewMatchupOpen(false);
    setNewHomeSquad(''); setNewAwaySquad('');
  };

  const openNewMatchup = () => {
    // 2-squad shortcut: auto-create Red vs Blue
    if (squadKeys.length === 2) {
      const [a, b] = squadKeys;
      ds.addMatchup(trainingId, {
        homeSquad: a,
        awaySquad: b,
        homeRoster: training.squads[a] || [],
        awayRoster: training.squads[b] || [],
      });
      return;
    }
    setNewHomeSquad(squadKeys[0] || '');
    setNewAwaySquad(squadKeys[1] || '');
    setNewMatchupOpen(true);
  };

  if (tLoading || mLoading) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={3} /></div>;
  }
  if (!training) return <EmptyState icon="⏳" text="Training not found" />;

  const current = matchups.filter(m => m.status !== 'closed');
  const completed = matchups.filter(m => m.status === 'closed');

  // Quick log overlay for training matchup
  const qlMatchup = quickLogMatchupId ? matchups.find(m => m.id === quickLogMatchupId) : null;
  if (qlMatchup) {
    const homeSquad = qlMatchup.homeSquad;
    const awaySquad = qlMatchup.awaySquad;
    const homeMeta = SQUAD_META[homeSquad] || { name: homeSquad, color: COLORS.textMuted };
    const awayMeta = SQUAD_META[awaySquad] || { name: awaySquad, color: COLORS.textMuted };
    const homeRoster = squadRoster(homeSquad);
    const awayRoster = squadRoster(awaySquad);
    return (
      <QuickLogView
        teamA={{ name: homeMeta.name, id: homeSquad, color: homeMeta.color }}
        teamB={{ name: awayMeta.name, id: awaySquad, color: awayMeta.color }}
        homeRoster={homeRoster}
        awayRoster={awayRoster}
        points={qlPoints}
        activeTeam="A"
        onSavePoint={async ({ assignments, outcome }) => {
          const makeData = (rosterArr) => {
            const a = Array(5).fill(null);
            // Use selected assignments if they overlap with this squad, else use squad roster
            const squadIds = new Set(rosterArr.map(p => p.id));
            const selected = assignments.filter(id => id && squadIds.has(id));
            (selected.length ? selected : rosterArr.map(p => p.id)).forEach((id, i) => { if (i < 5) a[i] = id; });
            return {
              players: Array(5).fill(null), assignments: a,
              shots: Array(5).fill([]), eliminations: Array(5).fill(false),
              eliminationPositions: Array(5).fill(null), quickShots: {}, obstacleShots: {},
              bumpStops: Array(5).fill(null), runners: Array(5).fill(false),
            };
          };
          await ds.addTrainingPoint(trainingId, quickLogMatchupId, {
            homeData: { ...makeData(homeRoster), fieldSide: 'left' },
            awayData: { ...makeData(awayRoster), fieldSide: 'right' },
            outcome, status: 'scouted', fieldSide: 'left',
          });
          const newA = qlPoints.filter(p => p.outcome === 'win_a').length + (outcome === 'win_a' ? 1 : 0);
          const newB = qlPoints.filter(p => p.outcome === 'win_b').length + (outcome === 'win_b' ? 1 : 0);
          await ds.updateMatchup(trainingId, quickLogMatchupId, { scoreA: newA, scoreB: newB });
        }}
        onBack={() => setQuickLogMatchupId(null)}
        onSwitchToScout={() => {
          setQuickLogMatchupId(null);
          navigate(`/training/${trainingId}/matchup/${quickLogMatchupId}?scout=${qlMatchup.homeSquad}`);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: () => navigate(-1) }}
        title={team?.name || 'Training'}
        subtitle={training.date || 'Practice'}
        action={
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/training/${trainingId}/results`)}
            style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.accent }}
          >
            Results
          </Btn>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 32 }}>
        {/* Context bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: SPACE.sm,
          padding: `${SPACE.sm}px ${SPACE.md}px`,
          marginBottom: SPACE.lg,
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.lg,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              color: COLORS.text,
            }}>
              {(training.attendees || []).length} players · {squadKeys.length} squads
            </div>
            <div style={{
              fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 2,
            }}>
              {squadKeys.map(k => SQUAD_META[k]?.name).join(' · ')}
            </div>
          </div>
          <Btn variant="ghost" size="sm"
            onClick={() => navigate(`/training/${trainingId}/setup`)}>
            ← Attendees
          </Btn>
          <Btn variant="ghost" size="sm"
            onClick={() => navigate(`/training/${trainingId}/squads`)}>
            Edit squads
          </Btn>
        </div>

        {/* Current matchups */}
        {current.length > 0 && (
          <div style={{ marginBottom: SPACE.lg }}>
            <SectionTitle>Playing ({current.length})</SectionTitle>
            {current.map(m => (
              <MatchupCard
                key={m.id}
                matchup={m}
                squads={training.squads}
                squadRoster={squadRoster}
                onOpen={() => setQuickLogMatchupId(m.id)}
                onDelete={() => setDeleteMatchup({ id: m.id })}
                active
              />
            ))}
          </div>
        )}

        {/* New matchup */}
        {squadKeys.length >= 2 && (
          <div
            onClick={openNewMatchup}
            style={{
              marginBottom: SPACE.lg,
              padding: '18px 16px',
              borderRadius: RADIUS.lg,
              border: `1px dashed ${COLORS.border}`,
              background: 'transparent',
              color: COLORS.accent,
              fontFamily: FONT, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              textAlign: 'center',
              cursor: 'pointer',
              minHeight: 52,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            + New matchup
          </div>
        )}

        {/* Completed matchups */}
        {completed.length > 0 && (
          <div>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchupCard
                key={m.id}
                matchup={m}
                squads={training.squads}
                squadRoster={squadRoster}
                onOpen={() => navigate(`/training/${trainingId}/matchup/${m.id}`)}
                onDelete={() => setDeleteMatchup({ id: m.id })}
                active={false}
              />
            ))}
          </div>
        )}

        {matchups.length === 0 && squadKeys.length < 2 && (
          <EmptyState icon="👥" text="Form at least 2 squads to start matchups" />
        )}
      </div>

      {/* End training footer */}
      {training.status !== 'closed' && (
        <div style={{
          padding: `${SPACE.md}px ${SPACE.lg}px calc(${SPACE.md}px + env(safe-area-inset-bottom, 0px))`,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', gap: SPACE.sm,
        }}>
          <Btn
            variant="default"
            onClick={() => setEndConfirm(true)}
            style={{ flex: 1, minHeight: 48, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600 }}
          >
            End training
          </Btn>
        </div>
      )}

      {/* Modals */}
      <Modal open={newMatchupOpen} onClose={() => setNewMatchupOpen(false)} title="New matchup"
        footer={<>
          <Btn variant="default" onClick={() => setNewMatchupOpen(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleCreateMatchup}
            disabled={!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad}>
            Create
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Home squad</div>
            <Select value={newHomeSquad} onChange={setNewHomeSquad}>
              <option value="">— select —</option>
              {squadKeys.map(k => (
                <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>
              ))}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Away squad</div>
            <Select value={newAwaySquad} onChange={setNewAwaySquad}>
              <option value="">— select —</option>
              {squadKeys.filter(k => k !== newHomeSquad).map(k => (
                <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={endConfirm}
        onClose={() => setEndConfirm(false)}
        title="End training?"
        message="Mark this training as finished? You can still view results and scouted data."
        confirmLabel="End training"
        onConfirm={async () => {
          await ds.updateTraining(trainingId, { status: 'closed' });
          setEndConfirm(false);
        }}
      />

      <ConfirmModal open={!!deleteMatchup}
        onClose={() => setDeleteMatchup(null)}
        title="Delete matchup?"
        message="All points scouted in this matchup will be permanently lost."
        confirmLabel="Delete" danger
        onConfirm={async () => {
          await ds.deleteMatchup(trainingId, deleteMatchup.id);
          setDeleteMatchup(null);
        }}
      />
    </div>
  );
}

function MatchupCard({ matchup, squadRoster, onOpen, onDelete, active }) {
  const home = SQUAD_META[matchup.homeSquad] || { name: matchup.homeSquad, color: COLORS.textMuted };
  const away = SQUAD_META[matchup.awaySquad] || { name: matchup.awaySquad, color: COLORS.textMuted };
  const homeCount = (matchup.homeRoster || squadRoster(matchup.homeSquad).map(p => p.id) || []).length;
  const awayCount = (matchup.awayRoster || squadRoster(matchup.awaySquad).map(p => p.id) || []).length;
  const sA = matchup.scoreA || 0;
  const sB = matchup.scoreB || 0;

  const openHandler = (e) => { e.stopPropagation(); onOpen?.(); };

  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      marginBottom: SPACE.xs,
      background: COLORS.surfaceDark,
      border: `1px solid ${active ? `${COLORS.accent}25` : COLORS.border}`,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      opacity: active ? 1 : 0.7,
      minHeight: 62,
      cursor: 'pointer',
    }}>
      <div onClick={openHandler}
        style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '12px 14px',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: home.color, flexShrink: 0 }} />
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{home.name}</span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>({homeCount})</span>
        </div>
      </div>
      <div onClick={openHandler}
        style={{
          flex: '0 0 auto', minWidth: 70,
          padding: '10px 8px',
          background: '#0d1117',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
          {sA}<span style={{ color: '#64748b' }}>:</span>{sB}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 8, fontWeight: 700,
          color: active ? COLORS.accent : COLORS.success,
          marginTop: 4, letterSpacing: '.4px',
        }}>
          {active ? 'SCOUT' : 'FINAL'}
        </div>
      </div>
      <div onClick={openHandler}
        style={{
          flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
          padding: '12px 14px',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted }}>({awayCount})</span>
          <span style={{ fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.text }}>{away.name}</span>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: away.color, flexShrink: 0 }} />
        </div>
      </div>
      {onDelete && (
        <div onClick={e => { e.stopPropagation(); onDelete?.(); }}
          style={{
            width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: COLORS.textMuted, fontSize: 18, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}>⋮</div>
      )}
    </div>
  );
}

function SquadZone({ meta, count, align }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      padding: '12px 14px',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      textAlign: align,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: meta.color, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: FONT, fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text,
        }}>
          {meta.name}
        </span>
      </div>
      <div style={{
        fontFamily: FONT, fontFamily: FONT, fontSize: 9, fontWeight: 500, color: COLORS.textMuted, marginTop: 3,
      }}>
        {count} player{count === 1 ? '' : 's'}
      </div>
    </div>
  );
}
