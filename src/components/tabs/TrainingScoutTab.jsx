import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLogView from '../QuickLogView';
import AttendeesEditor from '../training/AttendeesEditor';
import SquadEditor from '../training/SquadEditor';
import { Btn, SectionTitle, SectionLabel, EmptyState, Modal, Select, ConfirmModal } from '../ui';
import { useMatchups, usePlayers, useTrainingPoints } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

const SQUAD_META = {
  red:    { name: 'R1', color: '#ef4444' },
  blue:   { name: 'R2', color: '#3b82f6' },
  green:  { name: 'R3', color: '#22c55e' },
  yellow: { name: 'R4', color: '#eab308' },
};

// ─── Collapsible Section ───
function CollapsibleSection({ title, count, defaultOpen = true, autoClose = false, children, right }) {
  const [open, setOpen] = useState(defaultOpen);
  // Auto-close when autoClose becomes true (e.g. matchups appear)
  const prevAutoClose = useRef(autoClose);
  useEffect(() => {
    if (autoClose && !prevAutoClose.current) setOpen(false);
    prevAutoClose.current = autoClose;
  }, [autoClose]);
  return (
    <div style={{ marginBottom: SPACE.md }}>
      <div onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: `${SPACE.sm}px 0`, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
          <path d="M4 2l4 4-4 4" stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span style={{
          fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800,
          color: COLORS.text, letterSpacing: '-0.03em',
        }}>{title}</span>
        {count != null && (
          <span style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
            color: COLORS.textMuted,
          }}>({count})</span>
        )}
        {right && <div style={{ marginLeft: 'auto' }}>{right}</div>}
      </div>
      {open && children}
    </div>
  );
}

export default function TrainingScoutTab({ trainingId, training }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { matchups } = useMatchups(trainingId);
  const { players } = usePlayers();

  const [newMatchupOpen, setNewMatchupOpen] = useState(false);
  const [newHomeSquad, setNewHomeSquad] = useState('');
  const [newAwaySquad, setNewAwaySquad] = useState('');
  const [deleteMatchup, setDeleteMatchup] = useState(null);
  const [quickLogMatchupId, setQuickLogMatchupId] = useState(null);
  const [quickLogSide, setQuickLogSide] = useState('both');
  const { points: qlPoints } = useTrainingPoints(trainingId, quickLogMatchupId);

  const squadKeys = useMemo(() => {
    if (!training?.squads) return [];
    return Object.keys(training.squads).filter(k => SQUAD_META[k]);
  }, [training]);

  const squadRoster = (key) =>
    (training?.squads?.[key] || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);

  const attendees = useMemo(() => {
    return (training?.attendees || []).map(pid => players.find(p => p.id === pid)).filter(Boolean);
  }, [training, players]);

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
      return { players: Array(5).fill(null), assignments: a, shots: {}, eliminations: Array(5).fill(false), eliminationPositions: Array(5).fill(null), quickShots: {}, obstacleShots: {}, bumpStops: Array(5).fill(null), runners: Array(5).fill(false), fieldSide: side };
    };
    return (
      <QuickLogView
        teamA={{ name: homeMeta.name, id: qlMatchup.homeSquad, color: homeMeta.color }}
        teamB={{ name: awayMeta.name, id: qlMatchup.awaySquad, color: awayMeta.color }}
        homeRoster={homeRoster} awayRoster={awayRoster} points={qlPoints}
        activeTeam="A" activeSide={quickLogSide}
        onSavePoint={async ({ assignments, players: zonePlayers, outcome }) => {
          const makeData = (rosterArr, side) => {
            const a = Array(5).fill(null); const positions = Array(5).fill(null);
            const squadIds = new Set(rosterArr.map(p => p.id));
            const selectedIds = assignments.filter(id => id && squadIds.has(id));
            const pidsForSquad = selectedIds.length ? selectedIds : rosterArr.map(p => p.id);
            pidsForSquad.forEach((id, i) => { if (i >= 5) return; a[i] = id; if (zonePlayers) { const origIdx = assignments.indexOf(id); if (origIdx >= 0) positions[i] = zonePlayers[origIdx] || null; } });
            return { players: positions, assignments: a, shots: {}, eliminations: Array(5).fill(false), eliminationPositions: Array(5).fill(null), quickShots: {}, obstacleShots: {}, bumpStops: Array(5).fill(null), runners: Array(5).fill(false), fieldSide: side };
          };
          let homeData, awayData;
          if (quickLogSide === 'home') { homeData = makeData(homeRoster, 'left'); awayData = emptyData(awayRoster, 'right'); }
          else if (quickLogSide === 'away') { homeData = emptyData(homeRoster, 'left'); awayData = makeData(awayRoster, 'right'); }
          else { homeData = makeData(homeRoster, 'left'); awayData = makeData(awayRoster, 'right'); }
          await ds.addTrainingPoint(trainingId, quickLogMatchupId, { homeData, awayData, outcome, status: 'scouted', fieldSide: 'left' });
          const newA = qlPoints.filter(p => p.outcome === 'win_a').length + (outcome === 'win_a' ? 1 : 0);
          const newB = qlPoints.filter(p => p.outcome === 'win_b').length + (outcome === 'win_b' ? 1 : 0);
          await ds.updateMatchup(trainingId, quickLogMatchupId, { scoreA: newA, scoreB: newB });
        }}
        onBack={() => { setQuickLogMatchupId(null); setQuickLogSide('both'); }}
        onSwitchToScout={() => { const mid = quickLogMatchupId; setQuickLogMatchupId(null); navigate(`/training/${trainingId}/matchup/${mid}?scout=${qlMatchup.homeSquad}`); }}
      />
    );
  }

  if (!training) return <EmptyState icon="⏳" text={'Training not found'} />;
  const current = matchups.filter(m => m.status !== 'closed');
  const completed = matchups.filter(m => m.status === 'closed');
  const isClosed = training.status === 'closed';

  return (
    <div style={{ padding: SPACE.lg, paddingBottom: 24, display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>

      {/* ─── Section 1: Attendees (collapsible) ─── */}
      <CollapsibleSection title={t('attendees_title')} count={(training.attendees || []).length}
        defaultOpen={matchups.length === 0} autoClose={matchups.length > 0}>
        <AttendeesEditor trainingId={trainingId} training={training} />
      </CollapsibleSection>

      {/* ─── Section 2: Squads (collapsible) ─── */}
      <CollapsibleSection title={t('squads_title')} count={squadKeys.length}
        defaultOpen={matchups.length === 0 && (training.attendees || []).length > 0} autoClose={matchups.length > 0}>
        <SquadEditor trainingId={trainingId} training={training} />
      </CollapsibleSection>

      {/* ─── Section 3: Matches ─── */}
      <CollapsibleSection title={t('matches_title')} count={matchups.length} defaultOpen={true}
        right={
          squadKeys.length >= 2 && !isClosed ? (
            <span onClick={(e) => { e.stopPropagation(); openNewMatchup(); }}
              style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.accent, cursor: 'pointer' }}>
              + Add
            </span>
          ) : null
        }>

        {current.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel color={COLORS.accent}>Live ({current.length})</SectionLabel>
            {current.map(m => (
              <MatchupCard key={m.id} matchup={m} squadRoster={squadRoster}
                onOpenHome={() => { setQuickLogMatchupId(m.id); setQuickLogSide('home'); }}
                onOpenAway={() => { setQuickLogMatchupId(m.id); setQuickLogSide('away'); }}
                onOpenBoth={() => { setQuickLogMatchupId(m.id); setQuickLogSide('both'); }}
                active
              />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>Completed ({completed.length})</SectionLabel>
            {completed.map(m => (
              <MatchupCard key={m.id} matchup={m} squadRoster={squadRoster}
                onOpen={() => navigate(`/training/${trainingId}/matchup/${m.id}`)}
                active={false}
              />
            ))}
          </div>
        )}

        {matchups.length === 0 && squadKeys.length >= 2 && (
          <div style={{ textAlign: 'center', padding: SPACE.xl }}>
            <EmptyState icon="⚔️" text={t('no_matches')} />
          </div>
        )}

        {matchups.length === 0 && squadKeys.length < 2 && (
          <div style={{ textAlign: 'center', padding: SPACE.xl }}>
            <EmptyState icon="👥" text={t('empty_no_squads')}
              action={<Btn variant="accent" onClick={() => navigate(`/training/${trainingId}/squads`)}>{t('set_up_squads')}</Btn>} />
          </div>
        )}

        {/* Add match — dashed card, same style as tournament */}
        {squadKeys.length >= 2 && !isClosed && (
          <div onClick={openNewMatchup} style={{
            padding: '16px', borderRadius: 12,
            border: `1px dashed ${COLORS.accent}50`,
            background: `${COLORS.accent}08`,
            color: COLORS.accent,
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
            textAlign: 'center', cursor: 'pointer',
            minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}>
            + Add match
          </div>
        )}
      </CollapsibleSection>

      {/* Modals */}
      <Modal open={newMatchupOpen} onClose={() => setNewMatchupOpen(false)} title={t('new_matchup')}
        footer={<>
          <Btn variant="default" onClick={() => setNewMatchupOpen(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={handleCreateMatchup}
            disabled={!newHomeSquad || !newAwaySquad || newHomeSquad === newAwaySquad}>{t('create')}</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('home_squad')}</div>
            <Select value={newHomeSquad} onChange={setNewHomeSquad}>
              <option value="">{t('select_ph')}</option>
              {squadKeys.map(k => <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('away_squad')}</div>
            <Select value={newAwaySquad} onChange={setNewAwaySquad}>
              <option value="">{t('select_ph')}</option>
              {squadKeys.filter(k => k !== newHomeSquad).map(k => <option key={k} value={k}>{SQUAD_META[k]?.name || k}</option>)}
            </Select>
          </div>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteMatchup} onClose={() => setDeleteMatchup(null)}
        title={t('delete_matchup')} message={t('delete_matchup_msg')}
        confirmLabel={t('delete')} danger
        onConfirm={async () => { await ds.deleteMatchup(trainingId, deleteMatchup.id); setDeleteMatchup(null); }}
      />
    </div>
  );
}

// ─── Match card — same visual language as tournament MatchCard ───
function MatchupCard({ matchup, squadRoster, onOpen, onOpenHome, onOpenAway, onOpenBoth, active }) {
  const { t } = useLanguage();
  const home = SQUAD_META[matchup.homeSquad] || { name: matchup.homeSquad, color: COLORS.textMuted };
  const away = SQUAD_META[matchup.awaySquad] || { name: matchup.awaySquad, color: COLORS.textMuted };
  const sA = matchup.scoreA || 0;
  const sB = matchup.scoreB || 0;
  const hasScore = sA > 0 || sB > 0;
  const handleLeft = (e) => { e.stopPropagation(); active ? onOpenHome?.() : onOpen?.(); };
  const handleRight = (e) => { e.stopPropagation(); active ? onOpenAway?.() : onOpen?.(); };
  const handleCenter = (e) => { e.stopPropagation(); active ? onOpenBoth?.() : onOpen?.(); };

  return (
    <div style={{
      display: 'flex', marginBottom: SPACE.xs,
      background: '#0f172a',
      border: `1px solid ${active ? `${COLORS.accent}15` : '#1a2234'}`,
      borderRadius: 12, overflow: 'hidden',
      opacity: active ? 1 : 0.5, minHeight: 62,
    }}>
      {/* Home */}
      <div onClick={handleLeft} style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{home.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#475569', marginTop: 3 }}>
          {active ? t('tap_to_scout') : ''}
        </div>
      </div>
      <div style={{ width: 1, background: '#1e293b' }} />
      {/* Score center */}
      <div onClick={handleCenter} style={{
        flex: '0 0 auto', minWidth: 82, padding: '10px 12px',
        background: '#0b1120', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>
        {hasScore ? (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#e2e8f0', lineHeight: 1 }}>
            {sA}<span style={{ color: '#64748b' }}>:</span>{sB}
          </div>
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: '#334155', lineHeight: 1 }}>
            —<span style={{ color: '#64748b' }}>:</span>—
          </div>
        )}
        <div style={{
          fontFamily: FONT, fontSize: 8, fontWeight: 700, marginTop: 4, letterSpacing: '.5px',
          color: active ? COLORS.accent : '#64748b',
        }}>
          {active ? 'LIVE' : 'FINAL'}
        </div>
      </div>
      <div style={{ width: 1, background: '#1e293b' }} />
      {/* Away */}
      <div onClick={handleRight} style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: '#e2e8f0',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{away.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 9, fontWeight: 500, color: '#475569', marginTop: 3 }}>
          {active ? t('tap_to_scout') : ''}
        </div>
      </div>
    </div>
  );
}
