import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLogView from '../QuickLogView';
import AttendeesEditor from '../training/AttendeesEditor';
import SquadEditor from '../training/SquadEditor';
import { Btn, SectionLabel, EmptyState, Modal, Select, ConfirmModal } from '../ui';
import { useMatchups, usePlayers, useTrainingPoints } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, TOUCH } from '../../utils/theme';
import { SQUAD_MAP as SQUAD_META, getSquadName } from '../../utils/squads';
import { createEmptyPointData, createPointData } from '../../utils/pointFactory';
import { useLanguage } from '../../hooks/useLanguage';
import { useKiosk } from '../../contexts/KioskContext';
import { useLiveMatchScores } from '../../hooks/useLiveMatchScores';


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
  const kiosk = useKiosk();
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

  // Hotfix (2026-04-29): live matchup scores hook + its derived id list
  // MUST run before the conditional returns below (`if (qlMatchup) return`
  // on line ~109 and `if (!training) return` on line ~191), or hook count
  // changes between renders → React #300 infinite-loop crash. Same anti-
  // pattern that hit KioskLobbyOverlay (split outer/inner) and
  // ScoutTabContent (commit bbad249). Computing `current` here is safe —
  // it depends only on `matchups` (already loaded) and is harmless when
  // training/qlMatchup short-circuits later.
  const current = useMemo(() => matchups.filter(m => m.status !== 'closed'), [matchups]);
  const liveMatchupIds = useMemo(() => current.map(m => m.id), [current]);
  const liveScores = useLiveMatchScores(trainingId, liveMatchupIds, ds.subscribeTrainingPoints);

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
    // § 53: name resolved via getSquadName so custom squadNames flow through;
    // color stays from SQUAD_META (color identity is fixed per squad key).
    const homeMeta = SQUAD_META[qlMatchup.homeSquad] || { color: COLORS.textMuted };
    const awayMeta = SQUAD_META[qlMatchup.awaySquad] || { color: COLORS.textMuted };
    const homeName = getSquadName(training, qlMatchup.homeSquad);
    const awayName = getSquadName(training, qlMatchup.awaySquad);
    const homeRoster = squadRoster(qlMatchup.homeSquad);
    const awayRoster = squadRoster(qlMatchup.awaySquad);
    return (
      <QuickLogView
        teamA={{ name: homeName, id: qlMatchup.homeSquad, color: homeMeta.color }}
        teamB={{ name: awayName, id: qlMatchup.awaySquad, color: awayMeta.color }}
        homeRoster={homeRoster} awayRoster={awayRoster}
        allPlayers={players}
        points={qlPoints}
        activeTeam="A" activeSide={quickLogSide}
        onSavePoint={async ({
          assignments, players: zonePlayers, outcome,
          eliminations, eliminationTimes,
          eliminationStages, eliminationReasons, eliminationReasonTexts,
          pointDuration,
        }) => {
          let homeData, awayData;
          if (quickLogSide === 'home') {
            homeData = createPointData(homeRoster, assignments, zonePlayers, 'left');
            awayData = createEmptyPointData(awayRoster, 'right');
          } else if (quickLogSide === 'away') {
            homeData = createEmptyPointData(homeRoster, 'left');
            awayData = createPointData(awayRoster, assignments, zonePlayers, 'right');
          } else {
            homeData = createPointData(homeRoster, assignments, zonePlayers, 'left');
            awayData = createPointData(awayRoster, assignments, zonePlayers, 'right');
          }
          // § 54 schema (D1.A): attach new stage + reason arrays alongside
          // the existing eliminations/eliminationTimes. Legacy
          // eliminationCauses field is NOT written for new points — readers
          // use deathTaxonomy.readNormalizedEliminations to handle both
          // shapes (D2.no-migrate).
          if (eliminations) {
            const target = quickLogSide === 'away' ? awayData : homeData;
            target.eliminations = eliminations;
            target.eliminationTimes = eliminationTimes;
            target.eliminationStages = eliminationStages;
            target.eliminationReasons = eliminationReasons;
            target.eliminationReasonTexts = eliminationReasonTexts;
          }
          const extra = pointDuration != null ? { duration: pointDuration } : {};
          const pointRef = await ds.addTrainingPoint(trainingId, quickLogMatchupId, { homeData, awayData, outcome, status: 'scouted', fieldSide: 'left', ...extra });
          // Brief 9 Bug 2 (Option A): matchup.scoreA/B authoritative write
          // deferred to endMatchupAndMerge. Schema symmetric with tournament.
          // Training is solo per matchup so the race isn't real here, but
          // staying consistent avoids "two schemas" confusion.

          // § 55.1 KIOSK post-save trigger (E4 — training only, E6 viewport-gated).
          // enterPostSave is a no-op on phone/portrait per kioskViewport;
          // when active, it opens the full-screen post-save summary overlay
          // → Przekaż graczom → KioskLobbyOverlay. quickLogSide='both' (rare
          // dual-side path) defaults to 'home' for the lobby filter.
          const kioskSide = quickLogSide === 'away' ? 'away' : 'home';
          kiosk?.enterPostSave?.({
            pointId: pointRef?.id,
            trainingId,
            matchupId: quickLogMatchupId,
            scoutingSide: kioskSide,
          });
        }}
        onBack={() => { setQuickLogMatchupId(null); setQuickLogSide('both'); }}
        onSwitchToScout={() => { const mid = quickLogMatchupId; setQuickLogMatchupId(null); navigate(`/training/${trainingId}/matchup/${mid}?scout=${qlMatchup.homeSquad}&mode=new`); }}
        onEndMatch={async () => {
          await ds.updateMatchup(trainingId, quickLogMatchupId, { status: 'closed' });
          setQuickLogMatchupId(null); setQuickLogSide('both');
        }}
        onDeleteMatch={async () => {
          if (!window.confirm(`Usunąć mecz ${homeName} vs ${awayName}? Punkty (${qlPoints.length}) też przepadną.`)) return;
          await ds.deleteMatchup(trainingId, quickLogMatchupId);
          setQuickLogMatchupId(null); setQuickLogSide('both');
        }}
      />
    );
  }

  if (!training) return <EmptyState icon="⏳" text={'Training not found'} />;
  const completed = matchups.filter(m => m.status === 'closed');
  const isClosed = training.status === 'closed';
  // `current` + liveMatchupIds + liveScores computed above (hooks must
  // precede conditional returns — see Hotfix 2026-04-29 comment).

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
            <SectionLabel color={isClosed ? COLORS.textMuted : COLORS.accent}>{t('training_playing', current.length)}</SectionLabel>
            {current.map(m => (
              <MatchupCard key={m.id} matchup={m} training={training} squadRoster={squadRoster}
                liveScore={liveScores[m.id]?.score}
                onOpen={isClosed ? () => navigate(`/training/${trainingId}/matchup/${m.id}`) : undefined}
                onOpenHome={isClosed ? undefined : () => { setQuickLogMatchupId(m.id); setQuickLogSide('home'); }}
                onOpenAway={isClosed ? undefined : () => { setQuickLogMatchupId(m.id); setQuickLogSide('away'); }}
                onOpenBoth={isClosed ? undefined : () => { setQuickLogMatchupId(m.id); setQuickLogSide('both'); }}
                active={!isClosed}
              />
            ))}
          </div>
        )}

        {completed.length > 0 && (
          <div style={{ marginBottom: SPACE.sm }}>
            <SectionLabel>{t('training_completed', completed.length)}</SectionLabel>
            {completed.map(m => (
              <MatchupCard key={m.id} matchup={m} training={training} squadRoster={squadRoster}
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
              {squadKeys.map(k => <option key={k} value={k}>{getSquadName(training, k)}</option>)}
            </Select>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{t('away_squad')}</div>
            <Select value={newAwaySquad} onChange={setNewAwaySquad}>
              <option value="">{t('select_ph')}</option>
              {squadKeys.filter(k => k !== newHomeSquad).map(k => <option key={k} value={k}>{getSquadName(training, k)}</option>)}
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
function MatchupCard({ matchup, training, squadRoster, liveScore, onOpen, onOpenHome, onOpenAway, onOpenBoth, active }) {
  const { t } = useLanguage();
  // § 53: name via getSquadName (training-aware), color via SQUAD_META (fixed per key).
  const home = { name: getSquadName(training, matchup.homeSquad), color: SQUAD_META[matchup.homeSquad]?.color || COLORS.textMuted };
  const away = { name: getSquadName(training, matchup.awaySquad), color: SQUAD_META[matchup.awaySquad]?.color || COLORS.textMuted };
  // Hotfix #6 Bug 1: prefer live score (computed via useLiveMatchScores in
  // parent) over stored matchup.scoreA/B which is 0:0 during LIVE play
  // per Brief 9 Bug 2 Option A. Closed matchups skip liveScore in parent
  // (listener count optimization) → fall through to stored fields where
  // mergeMatchPoints wrote authoritative values at end-of-match.
  const sA = liveScore ? liveScore.a : (matchup.scoreA || 0);
  const sB = liveScore ? liveScore.b : (matchup.scoreB || 0);
  const hasScore = sA > 0 || sB > 0;
  const handleLeft = (e) => { e.stopPropagation(); active ? onOpenHome?.() : onOpen?.(); };
  const handleRight = (e) => { e.stopPropagation(); active ? onOpenAway?.() : onOpen?.(); };
  const handleCenter = (e) => { e.stopPropagation(); active ? onOpenBoth?.() : onOpen?.(); };

  return (
    <div style={{
      display: 'flex', marginBottom: SPACE.xs,
      background: COLORS.surfaceDark,
      border: `1px solid ${active ? `${COLORS.accent}15` : COLORS.surfaceLight}`,
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
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{home.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 3 }}>
          {active ? t('tap_to_scout') : ''}
        </div>
      </div>
      <div style={{ width: 1, background: COLORS.surfaceLight }} />
      {/* Score center */}
      <div onClick={handleCenter} style={{
        flex: '0 0 auto', minWidth: 82, padding: '10px 12px',
        background: COLORS.surfaceDark, cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
      }}>
        {hasScore ? (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1 }}>
            {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
          </div>
        ) : (
          <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.borderLight, lineHeight: 1 }}>
            —<span style={{ color: COLORS.textMuted }}>:</span>—
          </div>
        )}
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700, marginTop: 4, letterSpacing: '.5px',
          color: active ? COLORS.accent : COLORS.textMuted,
        }}>
          {active ? 'LIVE' : 'FINAL'}
        </div>
      </div>
      <div style={{ width: 1, background: COLORS.surfaceLight }} />
      {/* Away */}
      <div onClick={handleRight} style={{
        flex: 1, minWidth: 0, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{away.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 3 }}>
          {active ? t('tap_to_scout') : ''}
        </div>
      </div>
    </div>
  );
}
