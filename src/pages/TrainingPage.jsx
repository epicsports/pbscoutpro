import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import QuickLogView from '../components/QuickLogView';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select, ConfirmModal, SkeletonList } from '../components/ui';
import { useTeams, useTrainings, useMatchups, usePlayers, useTrainingPoints } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * TrainingPage — matchups + scouting entry point (§ 32 step 3).
 *
 * Route: /training/:trainingId
 * Above: context bar (date + team + player count + Edit squads)
 * Middle: list of matchups — current (playing) + completed (final)
 * Footer: Results button; "+ New matchup" appears inline in the list
 */
const SQUAD_META = {
  red:    { name: 'R1',    color: COLORS.danger },
  blue:   { name: 'R2',   color: COLORS.info },
  green:  { name: 'R3',  color: COLORS.success },
  yellow: { name: 'R4', color: '#eab308' },
};

export default function TrainingPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  const [quickLogSide, setQuickLogSide] = useState('both'); // 'home' | 'away' | 'both'
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

  const qlMatchup = quickLogMatchupId ? matchups.find(m => m.id === quickLogMatchupId) : null;
  if (qlMatchup) {
    const homeSquad = qlMatchup.homeSquad;
    const awaySquad = qlMatchup.awaySquad;
    const homeMeta = SQUAD_META[homeSquad] || { name: homeSquad, color: COLORS.textMuted };
    const awayMeta = SQUAD_META[awaySquad] || { name: awaySquad, color: COLORS.textMuted };
    const homeRoster = squadRoster(homeSquad);
    const awayRoster = squadRoster(awaySquad);

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
        teamA={{ name: homeMeta.name, id: homeSquad, color: homeMeta.color }}
        teamB={{ name: awayMeta.name, id: awaySquad, color: awayMeta.color }}
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
          setQuickLogMatchupId(null);
          navigate(`/training/${trainingId}/matchup/${quickLogMatchupId}?scout=${qlMatchup.homeSquad}`);
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: '/' }}
        title={team?.name || 'Training'}
        subtitle={training.date || 'Practice'}
        action={
          <Btn
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/training/${trainingId}/results`)}
            style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.accent }}
          >
            {t('results')}
          </Btn>
        }
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 140 }}>
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
            ← {t('training_attendees')}
          </Btn>
          <Btn variant="ghost" size="sm"
            onClick={() => navigate(`/training/${trainingId}/squads`)}>
            {t('training_edit_squads')}
          </Btn>
        </div>

        {/* Current matchups */}
        {current.length > 0 && (
          <div style={{ marginBottom: SPACE.lg }}>
            <SectionTitle>{t('training_playing', current.length)}</SectionTitle>
            {current.map(m => (
              <MatchupCard
                key={m.id}
                matchup={m}
                squads={training.squads}
                squadRoster={squadRoster}
                onOpenHome={() => { setQuickLogMatchupId(m.id); setQuickLogSide('home'); }}
                onOpenAway={() => { setQuickLogMatchupId(m.id); setQuickLogSide('away'); }}
                onOpenBoth={() => { setQuickLogMatchupId(m.id); setQuickLogSide('both'); }}
                onDelete={() => setDeleteMatchup({ id: m.id })}
                active
              />
            ))}
          </div>
        )}

        {/* Completed matchups */}
        {completed.length > 0 && (
          <div>
            <SectionLabel>{t('training_completed', completed.length)}</SectionLabel>
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
          <EmptyState icon="👥" text={t('empty_no_squads')} />
        )}
      </div>

      {/* Sticky footer — primary: New matchup, secondary: LIVE + End */}
      {training.status !== 'closed' && (
        <div style={{
          padding: `${SPACE.sm}px ${SPACE.lg}px calc(${SPACE.sm}px + env(safe-area-inset-bottom, 0px))`,
          background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', flexDirection: 'column', gap: SPACE.xs,
        }}>
          {/* Primary action */}
          {squadKeys.length >= 2 && (
            <Btn
              variant="accent"
              onClick={openNewMatchup}
              style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
            >
              {t('training_new_matchup')}
            </Btn>
          )}
          {/* Secondary actions */}
          <div style={{ display: 'flex', gap: SPACE.sm }}>
            {training.status !== 'live' ? (
              <Btn
                variant="default"
                onClick={() => ds.updateTraining(trainingId, { status: 'live' })}
                style={{ flex: 1, minHeight: 44, fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600 }}
              >
                {t('set_live')}
              </Btn>
            ) : (
              <Btn
                variant="default"
                onClick={() => ds.updateTraining(trainingId, { status: 'open' })}
                style={{
                  flex: 1, minHeight: 44,
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                  borderColor: '#ef444440', color: COLORS.danger,
                }}
              >
                {t('end_live')}
              </Btn>
            )}
            <Btn
              variant="default"
              onClick={() => setEndConfirm(true)}
              style={{ flex: 1, minHeight: 44, fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600 }}
            >
              {t('training_end')}
            </Btn>
          </div>
        </div>
      )}

      {/* Modals */}
      <Modal open={newMatchupOpen} onClose={() => setNewMatchupOpen(false)} title={t('training_new_matchup').replace(/^\+\s*/, '')}
        footer={<>
          <Btn variant="default" onClick={() => setNewMatchupOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleCreateMatchup}
            disabled={!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad}>
            {t('create')}
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
        title={t('training_end_confirm')}
        message={t('training_end_msg')}
        confirmLabel={t('training_end')}
        onConfirm={async () => {
          await ds.updateTraining(trainingId, { status: 'closed' });
          setEndConfirm(false);
        }}
      />

      <ConfirmModal open={!!deleteMatchup}
        onClose={() => setDeleteMatchup(null)}
        title={t('delete_matchup')}
        message={t('delete_matchup_msg')}
        confirmLabel={t('delete')} danger
        onConfirm={async () => {
          await ds.deleteMatchup(trainingId, deleteMatchup.id);
          setDeleteMatchup(null);
        }}
      />
    </div>
  );
}

function MatchupCard({ matchup, squadRoster, onOpen, onOpenHome, onOpenAway, onOpenBoth, onDelete, active }) {
  const home = SQUAD_META[matchup.homeSquad] || { name: matchup.homeSquad, color: COLORS.textMuted };
  const away = SQUAD_META[matchup.awaySquad] || { name: matchup.awaySquad, color: COLORS.textMuted };
  const homeCount = (matchup.homeRoster || squadRoster(matchup.homeSquad).map(p => p.id) || []).length;
  const awayCount = (matchup.awayRoster || squadRoster(matchup.awaySquad).map(p => p.id) || []).length;
  const sA = matchup.scoreA || 0;
  const sB = matchup.scoreB || 0;

  // Active card: left→home side log, center→both, right→away side log
  // Inactive (completed): all taps → onOpen (review)
  const handleLeft  = (e) => { e.stopPropagation(); active ? onOpenHome?.() : onOpen?.(); };
  const handleRight = (e) => { e.stopPropagation(); active ? onOpenAway?.() : onOpen?.(); };
  const handleCenter= (e) => { e.stopPropagation(); active ? onOpenBoth?.() : onOpen?.(); };

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
      {/* Home squad */}
      <div onClick={handleLeft}
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
        {active && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 3, marginLeft: 16 }}>
            tap to log
          </div>
        )}
      </div>
      {/* Center — score + both */}
      <div onClick={handleCenter}
        style={{
          flex: '0 0 auto', minWidth: 70,
          padding: '10px 8px',
          background: '#0d1117',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
          {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          color: active ? COLORS.accent : COLORS.success,
          marginTop: 4, letterSpacing: '.4px',
        }}>
          {active ? 'SCOUT' : 'FINAL'}
        </div>
      </div>
      {/* Away squad */}
      <div onClick={handleRight}
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
        {active && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 3, marginRight: 16 }}>
            tap to log
          </div>
        )}
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
          fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text,
        }}>
          {meta.name}
        </span>
      </div>
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 3,
      }}>
        {count} player{count === 1 ? '' : 's'}
      </div>
    </div>
  );
}
