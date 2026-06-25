import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QuickLogView from '../QuickLogView';
import AttendeesEditor from '../training/AttendeesEditor';
import SquadEditor from '../training/SquadEditor';
import { Btn, SectionLabel, EmptyState, Modal, Select, ConfirmModal } from '../ui';
import { useMatchups, usePlayers, useTrainingPoints } from '../../hooks/useFirestore';
import * as ds from '../../services/dataService';
import { auth } from '../../services/firebase';
import { COLORS, FONT, FONT_SIZE, SPACE, TOUCH, TNUM } from '../../utils/theme';
import { SQUAD_MAP as SQUAD_META, getSquadName } from '../../utils/squads';
import Crest from '../Crest';
import LiveMatchTile from '../LiveMatchTile';
import { createEmptyPointData, createPointData } from '../../utils/pointFactory';
import { makeMeta } from '../../utils/observationMeta';
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
  const { players, playersById } = usePlayers();

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
    (training?.squads?.[key] || []).map(pid => playersById[pid]).filter(Boolean);

  const attendees = useMemo(() => {
    return (training?.attendees || []).map(pid => playersById[pid]).filter(Boolean);
  }, [training, playersById]);

  // Hotfix (2026-04-29): live matchup scores hook + its derived id list
  // MUST run before the conditional returns below (`if (qlMatchup) return`
  // on line ~109 and `if (!training) return` on line ~191), or hook count
  // changes between renders → React #300 infinite-loop crash. Same anti-
  // pattern that hit KioskLobbyOverlay (split outer/inner) and
  // ScoutTabContent (commit bbad249). Computing `current` here is safe —
  // it depends only on `matchups` (already loaded) and is harmless when
  // training/qlMatchup short-circuits later.
  const current = useMemo(() => matchups.filter(m => m.status !== 'closed' && !m.isFreePlay), [matchups]);
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

  // § 70 Stage 1b — open the training's free-play matchup (created on demand
  // by the dormant Stage 1 helper) in QuickLogView's squad-less free-play mode.
  const openFreePlay = async () => {
    const ref = await ds.getOrCreateFreePlayMatchup(trainingId);
    setQuickLogMatchupId(ref.id);
    setQuickLogSide('home');
  };

  // ─── QuickLog overlay ───
  const qlMatchup = quickLogMatchupId ? matchups.find(m => m.id === quickLogMatchupId) : null;
  if (qlMatchup) {
    // § 70 Stage 1b — free-play matchup: squad-less QuickLogView mode.
    if (qlMatchup.isFreePlay) {
      return (
        <QuickLogView
          freePlay
          teamA={{ name: t('free_play'), color: COLORS.accent }}
          teamB={{ name: '', color: COLORS.textMuted }}
          homeRoster={attendees}
          awayRoster={[]}
          allPlayers={players}
          points={qlPoints}
          activeTeam="A"
          activeSide="home"
          onSavePoint={async ({ assignments, players: zonePlayers, eliminations }) => {
            const uidNow = auth.currentUser?.uid || null;
            const homeData = createPointData(attendees, assignments, zonePlayers, 'left');
            // § 70 — coach quick-log: tag every assigned slot source:'coach'.
            homeData.playersMeta = (homeData.assignments || []).map(
              a => (a ? makeMeta('coach', uidNow) : null),
            );
            if (Array.isArray(eliminations)) {
              homeData.eliminations = eliminations;
              homeData.eliminationsMeta = eliminations.map(
                e => (e === true ? makeMeta('coach', uidNow) : null),
              );
            }
            // outcome:null — free play has no team winner (§ 70.4.4 / 70.5).
            return ds.addTrainingPoint(trainingId, quickLogMatchupId, {
              homeData, awayData: {}, outcome: null,
              status: 'scouted', fieldSide: 'left',
            });
          }}
          onBack={() => { setQuickLogMatchupId(null); setQuickLogSide('both'); }}
        />
      );
    }
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
          assignments, players: zonePlayers, outcome, syntheticZones,
          eliminations, eliminationTimes,
          eliminationStages, eliminationReasons, eliminationReasonTexts,
          pointDuration,
        }) => {
          const uidNow = auth.currentUser?.uid || null;
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
          // § 57 W3 + § 70: QuickLog is the COACH quick-log path — overlay
          // playersMeta on the side(s) where players were placed.
          // createPointData already produced slotIds + null _meta arrays via
          // baseSide. Here we mark each occupied slot source:'coach'
          // (canvas/proper scouting stays 'scout') and tag syntheticZone
          // when QuickLog's zone picker was used (D/C/S → dorito/center/snake).
          const zoneMap = { D: 'dorito', C: 'center', S: 'snake' };
          const buildPlayersMeta = (playersArr) => playersArr.map((p, i) => {
            if (!p) return null;
            const zoneKey = (syntheticZones && syntheticZones[i]) || null;
            const meta = makeMeta('coach', uidNow);
            return zoneKey ? { ...meta, syntheticZone: zoneMap[zoneKey] || zoneKey } : meta;
          });
          if (homeData.players?.some(Boolean)) {
            homeData.playersMeta = buildPlayersMeta(homeData.players);
          }
          if (awayData.players?.some(Boolean)) {
            awayData.playersMeta = buildPlayersMeta(awayData.players);
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
            // § 57 W3 + § 70: live-tracker eliminations are part of the
            // coach quick-log path → coach-recorded.
            target.eliminationsMeta = eliminations.map(
              e => e === true ? makeMeta('coach', uidNow) : null
            );
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
          // § kiosk (2026-06-07) — `force` so the post-save summary (the OPEN
          // KIOSK / NEXT POINT choice = "Przekaż graczom" / "Następny punkt")
          // ALWAYS shows after the winner pick, even in portrait. The summary is
          // portrait-responsive; only the 5-tile LOBBY keeps the §27 landscape
          // floor (rotate prompt). Was a silent no-op on phone/portrait, which
          // is why the coach saw no KIOSK option and went straight to the next
          // point.
          kiosk?.enterPostSave?.({
            pointId: pointRef?.id,
            trainingId,
            matchupId: quickLogMatchupId,
            scoutingSide: kioskSide,
          }, { force: true });
          // Bug B: return docRef so QuickLogView's handleAdvancedScouting
          // can capture the new point id and pass it to onSwitchToScout
          // for canvas prefill via ?point=<pid>.
          return pointRef;
        }}
        onBack={() => { setQuickLogMatchupId(null); setQuickLogSide('both'); }}
        onSwitchToScout={(pointId) => {
          const mid = quickLogMatchupId;
          // Bug A: scout the squad the user actually opened QuickLog for. The
          // 'both' default falls through to homeSquad so the previous
          // behavior is preserved when the picker covers both sides.
          const targetSquad = quickLogSide === 'away' ? qlMatchup.awaySquad : qlMatchup.homeSquad;
          setQuickLogMatchupId(null);
          // Bug B: when QuickLog handed off a saved point, route with
          // &point=<pid> so MatchPage's existing pointParamId loader
          // (MatchPage L586-598) auto-edits it on mount. No pointId →
          // legacy behavior (mode=new) preserved.
          if (pointId) {
            navigate(`/training/${trainingId}/matchup/${mid}?scout=${targetSquad}&point=${pointId}`);
          } else {
            navigate(`/training/${trainingId}/matchup/${mid}?scout=${targetSquad}&mode=new`);
          }
        }}
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
  const completed = matchups.filter(m => m.status === 'closed' && !m.isFreePlay);
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

        {/* § 70 Stage 1b — free-play entry: log points with no squad-vs-squad
            matchup. Attendee-gated (free play needs attendees, not 2 squads). */}
        {(training.attendees || []).length >= 1 && !isClosed && (
          <div onClick={openFreePlay} style={{
            padding: '16px', borderRadius: 12, marginTop: SPACE.xs,
            border: `1px dashed ${COLORS.accent}50`,
            background: `${COLORS.accent}08`,
            color: COLORS.accent,
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
            textAlign: 'center', cursor: 'pointer',
            minHeight: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
            WebkitTapHighlightColor: 'transparent',
          }}>
            {t('free_play_cta')}
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

// ─── Match card — the canonical split-tap live tile (shared LiveMatchTile) ───
// Renders through the SAME LiveMatchTile primitive as the tournament MatchCard,
// so the scout's training "Mecze" tiles match the tournament tiles exactly.
// Squad sides carry a Crest (squad color + name initials) instead of a team
// logo; the tap routing stays the training matchup-scout callbacks (home/away/
// both → setQuickLogMatchupId in the parent), NOT tournament `?scout=` nav.
function MatchupCard({ matchup, training, squadRoster, liveScore, onOpen, onOpenHome, onOpenAway, onOpenBoth, active }) {
  const { t } = useLanguage();
  // § 53: name via getSquadName (training-aware), color via squadColor (fixed per key).
  const homeName = getSquadName(training, matchup.homeSquad);
  const awayName = getSquadName(training, matchup.awaySquad);
  // Crest takes { color, short } — color = squad identity color (never amber),
  // short = 2-letter initials derived from the (custom-aware) squad name.
  // Scrimmage squads are assembled ad-hoc from players of different teams → no team
  // identity → render a NEUTRAL crest (textMuted), never a squad/team color (CD brief #3,
  // 2026-06-25). Squads are distinguished by NAME, not color.
  const homeTeam = { color: COLORS.textMuted, short: homeName.slice(0, 2).toUpperCase() };
  const awayTeam = { color: COLORS.textMuted, short: awayName.slice(0, 2).toUpperCase() };
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

  const SquadZone = ({ name, team, align }) => (
    <div style={{ textAlign: align }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 7, minWidth: 0,
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
      }}>
        {align !== 'right' && <Crest team={team} size={22} />}
        <span style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name}</span>
        {align === 'right' && <Crest team={team} size={22} />}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 3 }}>
        {active ? t('tap_to_scout') : ''}
      </div>
    </div>
  );

  return (
    <LiveMatchTile
      live={active}
      dimmed={!active}
      onLeft={handleLeft}
      onCenter={handleCenter}
      onRight={handleRight}
      left={<SquadZone name={homeName} team={homeTeam} align="left" />}
      right={<SquadZone name={awayName} team={awayTeam} align="right" />}
      center={(
        <>
          {hasScore ? (
            <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.text, lineHeight: 1, ...TNUM }}>
              {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
            </div>
          ) : (
            <div style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: COLORS.borderLight, lineHeight: 1, ...TNUM }}>
              —<span style={{ color: COLORS.textMuted }}>:</span>—
            </div>
          )}
          <div style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 700, marginTop: 4, letterSpacing: '.5px',
            color: active ? COLORS.accent : COLORS.textMuted,
          }}>
            {active ? 'LIVE' : 'FINAL'}
          </div>
        </>
      )}
    />
  );
}
