import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { SectionTitle, SectionLabel, EmptyState, SkeletonList, SideTag, Btn } from '../components/ui';
import { useTrainings, useMatchups, usePlayers, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { getEventShotFrequencies, getTrainingSelfReports } from '../services/playerPerformanceTrackerService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { SQUAD_MAP as SQUAD_META, getSquadName } from '../utils/squads';
import { useField } from '../hooks/useField';
import { mirrorPointToLeft } from '../utils/helpers';
import { bunkerToPosition } from '../utils/bunkerToPosition';
import HeatmapCanvas from '../components/HeatmapCanvas';
import { useWorkspace } from '../hooks/useWorkspace';
import { getRolesForUser, hasAnyRole } from '../utils/roleUtils';
import { locatePlayerInPoint, alignSequence } from '../utils/selfReportMatcher';
import { LogRow } from '../components/ppt/TodaysLogsList';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

/**
 * TrainingResultsPage — player leaderboard for a training session (§ 32 step 4).
 *
 * Route: /training/:trainingId/results
 */

// § 70.8 D1 — map a slot's _meta.source to a filter-pill group.
const SOURCE_GROUP = { scout: 'scout', coach: 'coach', self: 'player', kiosk: 'player' };
// Labels resolved at render time via t() — keys map to i18n role/tab keys.
const SOURCE_PILL_KEYS = [
  { key: 'all', i18nKey: 'all_label' },
  { key: 'scout', i18nKey: 'tab_scout' },
  { key: 'coach', i18nKey: 'tab_coach' },
  { key: 'player', i18nKey: 'tab_player' },
];

// § 70.10 — D1 player self-log dot placement. A player slot's stored coord is
// a synthetic bunker-derived point (propagator: bunker.x ± 0.02, bunker.y) —
// it is bunker-ABSOLUTE, so mirrorPointToLeft must NOT touch it (mirroring
// would relocate it to the mirror-image bunker). Reverse-look-up the bunker
// the synth came from and re-place it conventional LEFT (player gave no start
// side). Scout reads position→bunker; the self-log path is the inverse.
const SELF_SOURCES = new Set(['self', 'kiosk']);

function resolveSelfLogDot(synth, bunkers) {
  if (!synth || typeof synth.x !== 'number') return synth;
  let b1 = null, d1 = Infinity, d2 = Infinity;
  for (const b of (bunkers || [])) {
    if (typeof b?.x !== 'number' || typeof b?.y !== 'number') continue;
    const d = Math.hypot(b.x - synth.x, b.y - synth.y);
    if (d < d1) { d2 = d1; d1 = d; b1 = b; }
    else if (d < d2) { d2 = d; }
  }
  // Confident only when the nearest bunker is plausibly the synth's own
  // (~0.02 off) AND clearly beats the runner-up — guards a layout with
  // near-duplicate bunkers (the 2026 sample layout has a 0.003-apart pair).
  if (b1 && d1 <= 0.04 && d2 >= d1 + 0.012) {
    return bunkerToPosition(b1, 'left'); // conventional LEFT — start side unknown
  }
  return synth; // fallback — un-mirrored synth: right bunker, offset as-stored
}

export default function TrainingResultsPage() {
  const { trainingId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { trainings, loading: tLoading } = useTrainings();
  const { matchups, loading: mLoading } = useMatchups(trainingId);
  const { players, playersById } = usePlayers();
  const { layouts } = useLayouts();
  const [sourceFilter, setSourceFilter] = useState('all'); // all | scout | coach | player
  const [reviewVersion, setReviewVersion] = useState(0);   // § 70.11 — bump to refetch after an override
  const { workspace, user, isAdmin } = useWorkspace();
  const canReview = isAdmin || hasAnyRole(getRolesForUser(workspace, user?.uid), 'coach');

  const training = trainings.find(t => t.id === trainingId);
  const field = useField(training, layouts, true);

  // §H3 no-eternal-loading — 12s ceiling on the training subscription.
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (training) { setLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [training]);

  // Fetch all points across all matchups for the leaderboard.
  const [allPoints, setAllPoints] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!trainingId) return;
    ds.fetchAllTrainingPoints(trainingId)
      .then(pts => { if (!cancelled) setAllPoints(pts); })
      .catch(e => { console.error('Fetch training points failed:', e); if (!cancelled) setAllPoints([]); });
    return () => { cancelled = true; };
  }, [trainingId, matchups.length, reviewVersion]);

  // § 70.8 D2 — event-scoped per-bunker self-log aggregation. Index-dependent;
  // a failure (index not yet live) degrades to no data, never crashes the page.
  const [bunkerStats, setBunkerStats] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!trainingId) return undefined;
    getEventShotFrequencies(trainingId)
      .then(rows => { if (!cancelled) setBunkerStats(rows); })
      .catch(e => { console.error('Event shot frequencies failed:', e); if (!cancelled) setBunkerStats([]); });
    return () => { cancelled = true; };
  }, [trainingId, matchups.length]);

  // § 70.11 Stage 4 — all selfReports for the training (every player), for the
  // manual-override review queue. Refetched after each override (reviewVersion).
  const [trainingSelfReports, setTrainingSelfReports] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!trainingId) return undefined;
    getTrainingSelfReports(trainingId)
      .then(rows => { if (!cancelled) setTrainingSelfReports(rows); })
      .catch(e => { console.error('Training self-reports fetch failed:', e); if (!cancelled) setTrainingSelfReports([]); });
    return () => { cancelled = true; };
  }, [trainingId, reviewVersion]);

  const leaderboard = useMemo(() => {
    if (!training || !allPoints) return [];
    const stats = {}; // { playerId: { played, wins, losses, draws } }
    const ensure = (pid) => {
      if (!stats[pid]) stats[pid] = { played: 0, wins: 0, losses: 0, draws: 0 };
      return stats[pid];
    };

    allPoints.forEach(pt => {
      // Each point has matchup-level metadata + homeData/awayData.
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      const outcome = pt.outcome;

      const homePlayers = (home.assignments || home.players || []).filter(Boolean);
      const awayPlayers = (away.assignments || away.players || []).filter(Boolean);

      const record = (pid, won, lost) => {
        const s = ensure(pid);
        s.played++;
        if (won) s.wins++;
        else if (lost) s.losses++;
        else s.draws++;
      };

      homePlayers.forEach(pid => {
        const w = outcome === 'win_a';
        const l = outcome === 'win_b';
        record(pid, w, l);
      });
      awayPlayers.forEach(pid => {
        const w = outcome === 'win_b';
        const l = outcome === 'win_a';
        record(pid, w, l);
      });
    });

    const attendees = training.attendees || [];
    const rows = attendees
      .map(pid => {
        const player = playersById[pid];
        if (!player) return null;
        const s = stats[pid] || { played: 0, wins: 0, losses: 0, draws: 0 };
        // § 70 free-play: winRate over DECIDED points only (wins+losses) —
        // a free-play point (outcome=null) counts as a draw, excluded here.
        const decided = s.wins + s.losses;
        const winRate = decided > 0 ? Math.round((s.wins / decided) * 100) : null;
        const diff = s.wins - s.losses;
        return {
          playerId: pid,
          name: player.nickname || player.name || '?',
          number: player.number,
          played: s.played,
          wins: s.wins,
          losses: s.losses,
          diff,
          winRate,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Played desc → win rate desc → diff desc
        if (a.played !== b.played) return b.played - a.played;
        if ((a.winRate ?? -1) !== (b.winRate ?? -1)) return (b.winRate ?? -1) - (a.winRate ?? -1);
        return b.diff - a.diff;
      });

    return rows;
  }, [training, allPoints, players]);

  // § 70.8 D1 — per-side heatmap points (free-play homeData-only → one point).
  // playersMeta/shotsMeta ride mirrorPointToLeft index-aligned for the filter.
  // § 70.10 — player self-log dots are re-placed (see resolveSelfLogDot).
  const heatmapPoints = useMemo(() => {
    if (!allPoints) return [];
    const bunkers = field?.bunkers || [];
    const out = [];
    allPoints.forEach(pt => {
      [['homeData', 'A'], ['awayData', 'B']].forEach(([key, side]) => {
        const sd = pt[key];
        if (!sd || !Array.isArray(sd.assignments) || !sd.assignments.some(Boolean)) return;
        const m = mirrorPointToLeft(sd, sd.fieldSide || pt.fieldSide || 'left');
        const meta = sd.playersMeta || [];
        // Scout/coach dots are real team-relative coords → keep the mirrored
        // coord. Player self-log dots are bunker-derived (absolute) → must NOT
        // be mirrored; reverse-look-up the bunker, re-place conventional LEFT.
        const players = (m.players || []).map((mp, i) => (
          SELF_SOURCES.has(meta[i]?.source)
            ? resolveSelfLogDot(sd.players?.[i], bunkers)
            : mp
        ));
        const shots = Array.isArray(m.shots)
          ? m.shots
          : (m.shots ? [0, 1, 2, 3, 4].map(i => m.shots[String(i)] || []) : []);
        out.push({
          side,
          players,
          shots,
          assignments: sd.assignments || [],
          eliminations: sd.eliminations || [],
          runners: sd.runners || [],
          playersMeta: meta,
          shotsMeta: sd.shotsMeta || [],
        });
      });
    });
    return out;
  }, [allPoints, field]);

  // § 70.8 D1 — mask slots by _meta.source for the active pill. null-_meta
  // slots are unattributable → shown only under "All".
  const filteredHeatmapPoints = useMemo(() => {
    if (sourceFilter === 'all') return heatmapPoints;
    const ok = (meta) => SOURCE_GROUP[meta && meta.source] === sourceFilter;
    return heatmapPoints.map(pt => ({
      ...pt,
      players: pt.players.map((p, i) => (ok(pt.playersMeta[i]) ? p : null)),
      shots: pt.shots.map((arr, i) => (ok(pt.shotsMeta[i]) ? arr : [])),
    }));
  }, [heatmapPoints, sourceFilter]);

  // § 70.11 Stage 4 — flagged-report review queue. Per flagged selfReport,
  // re-run the matcher (locate + alignSequence over the player's FULL set) to
  // resolve the candidate point/slot + the player's other located points.
  const reviewQueue = useMemo(() => {
    if (!allPoints || !trainingSelfReports) return [];
    const byPlayer = {};
    trainingSelfReports.forEach(r => { (byPlayer[r.playerId] ||= []).push(r); });
    const out = [];
    Object.entries(byPlayer).forEach(([playerId, reports]) => {
      const flagged = reports.filter(
        r => r.needsReview && !r.propagatedAt && !r.reviewDismissedAt,
      );
      if (flagged.length === 0) return;
      const located = allPoints.filter(pt => locatePlayerInPoint(pt, playerId));
      const pairs = alignSequence(reports, located);
      flagged.forEach(fr => {
        const pair = pairs.find(p => p.selfReport.id === fr.id);
        if (!pair) return;
        const candLoc = locatePlayerInPoint(pair.point, playerId);
        if (!candLoc) return;
        out.push({
          selfReport: fr,
          playerId,
          candidate: { point: pair.point, ...candLoc },
          reassignOptions: located
            .filter(pt => pt.id !== pair.point.id)
            .map(pt => ({ point: pt, ...locatePlayerInPoint(pt, playerId) })),
        });
      });
    });
    return out;
  }, [allPoints, trainingSelfReports]);

  // Accept (candidate) / Reassign (a chosen located point) — same write path.
  const runOverride = async (item, loc) => {
    await ds.applySelfReportOverride({
      trainingId,
      matchupId: loc.point.matchupId,
      pointId: loc.point.id,
      sideKey: loc.sideKey,
      slot: loc.slot,
      playerId: item.playerId,
      selfReportId: item.selfReport.id,
    });
    setReviewVersion(v => v + 1);
  };
  const handleDismiss = async (item) => {
    await ds.dismissSelfReportFlag({ playerId: item.playerId, selfReportId: item.selfReport.id });
    setReviewVersion(v => v + 1);
  };

  if ((tLoading || mLoading || allPoints === null) && !loadTimedOut) {
    return <div style={{ padding: SPACE.lg }}><SkeletonList count={5} /></div>;
  }
  if (!training) {
    return (
      <div data-testid="training-load-error">
        <EmptyState
          icon="⚠️"
          text={t('training_load_error')}
          subtitle={t('training_load_error_sub')}
        />
        <div style={{ textAlign: 'center', marginTop: 4 }}>
          <Btn variant="accent" onClick={() => { setLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
        </div>
      </div>
    );
  }

  const totalPoints = allPoints.length;
  const attendees = (training.attendees || []).map(pid => playersById[pid]).filter(Boolean);
  const heroPlayerIds = players.filter(p => p.hero).map(p => p.id);
  const matchupCount = matchups.length;

  return (
    <Screen archetype="list" padBottom={false} style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: () => navigate(`/training/${trainingId}`) }}
        title={t('results')}
        subtitle={training.date || t('training_practice_fallback')}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: SPACE.lg, paddingBottom: 80 }}>
        {/* Info line */}
        <div style={{
          fontFamily: FONT,
          fontSize: FONT_SIZE.xs,
          color: COLORS.textMuted,
          padding: `${SPACE.xs}px ${SPACE.sm}px`,
          marginBottom: SPACE.md,
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          display: 'inline-block',
        }}>
          {t('results_info_line', totalPoints, totalPoints === 1 ? 'point' : 'points', matchupCount, matchupCount === 1 ? 'matchup' : 'matchups')}
        </div>

        {/* Player leaderboard */}
        <SectionTitle>{t('players_title')}</SectionTitle>
        {leaderboard.length === 0 ? (
          <EmptyState icon="🏴" text={t('results_no_scouted_data')} />
        ) : (
          leaderboard.map((row, i) => (
            <PlayerRow key={row.playerId} row={row} rank={i + 1}
              onClick={() => navigate(`/player/${row.playerId}/stats?scope=training&tid=${trainingId}`)}
            />
          ))
        )}

        {/* § 70.11 Stage 4 — manual-override review queue (coach / admin only) */}
        {canReview && reviewQueue.length > 0 && (
          <div style={{ marginTop: SPACE.xl }}>
            <SectionLabel>{t('results_needs_review', reviewQueue.length)}</SectionLabel>
            {reviewQueue.map((item, i) => (
              <ReviewItem key={item.selfReport.id} item={item} ordinal={i + 1}
                playersById={playersById}
                onAccept={() => runOverride(item, item.candidate)}
                onReassign={(opt) => runOverride(item, opt)}
                onDismiss={() => handleDismiss(item)}
              />
            ))}
          </div>
        )}

        {/* Break-bunker breakdown — § 70.8 D2 (event-scoped self-log aggregation) */}
        {bunkerStats && bunkerStats.length > 0 && (
          <div style={{ marginTop: SPACE.xl }}>
            <SectionLabel>{t('results_break_bunkers')}</SectionLabel>
            {bunkerStats.map(b => <BunkerRow key={b.bunker} b={b} />)}
          </div>
        )}

        {/* Source-filtered training heatmap — § 70.8 D1 */}
        {heatmapPoints.length > 0 && field?.fieldImage && (
          <div style={{ marginTop: SPACE.xl }}>
            <SectionLabel>{t('section_heatmap')}</SectionLabel>
            <div style={{ display: 'flex', gap: SPACE.xs, marginBottom: SPACE.sm, flexWrap: 'wrap' }}>
              {SOURCE_PILL_KEYS.map(p => {
                const active = sourceFilter === p.key;
                return (
                  <div key={p.key} role="button" onClick={() => setSourceFilter(p.key)}
                    style={{
                      minHeight: 44, padding: '0 14px', borderRadius: 10,
                      display: 'flex', alignItems: 'center',
                      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      border: `1px solid ${active ? COLORS.accent : COLORS.border}`,
                      background: active ? `${COLORS.accent}1f` : COLORS.surfaceDark,
                      color: active ? COLORS.accent : COLORS.textDim,
                    }}>
                    {t(p.i18nKey)}
                  </div>
                );
              })}
            </div>
            <div style={{ borderRadius: RADIUS.lg, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              <HeatmapCanvas
                fieldImage={field.fieldImage}
                points={filteredHeatmapPoints}
                rosterPlayers={attendees}
                bunkers={field.bunkers || []}
                dangerZone={field.dangerZone}
                sajgonZone={field.sajgonZone}
                showPositions
                showShots
                heroPlayerIds={heroPlayerIds}
              />
            </div>
          </div>
        )}

        {/* Matchup history */}
        {matchups.length > 0 && (
          <div style={{ marginTop: SPACE.xl }}>
            <SectionLabel>{t('matches_title')}</SectionLabel>
            {matchups.map(m => {
              // § 53: name via getSquadName (training-aware), color from SQUAD_META.
              const home = { name: getSquadName(training, m.homeSquad), color: SQUAD_META[m.homeSquad]?.color || COLORS.textMuted };
              const away = { name: getSquadName(training, m.awaySquad), color: SQUAD_META[m.awaySquad]?.color || COLORS.textMuted };
              const sA = m.scoreA || 0, sB = m.scoreB || 0;
              return (
                <div key={m.id}
                  onClick={() => navigate(`/training/${trainingId}/matchup/${m.id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.md,
                    padding: '12px 14px', marginBottom: SPACE.xs,
                    background: COLORS.surfaceDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.lg,
                    cursor: 'pointer', minHeight: 52,
                  }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    color: home.color,
                  }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: home.color }} />
                    {home.name}
                  </span>
                  <span style={{
                    flex: 1, textAlign: 'center',
                    fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 800, color: COLORS.text,
                  }}>
                    {sA}<span style={{ color: COLORS.textMuted }}>:</span>{sB}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    color: away.color,
                  }}>
                    {away.name}
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: away.color }} />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Screen>
  );
}

function PlayerRow({ row, rank, onClick }) {
  const wrColor = row.winRate == null
    ? COLORS.textMuted
    : row.winRate >= 60 ? COLORS.success : row.winRate >= 40 ? COLORS.accent : COLORS.danger;
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: SPACE.md,
        padding: '12px 14px', marginBottom: SPACE.xs,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
        cursor: 'pointer',
        minHeight: 52,
      }}>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 800,
        color: COLORS.borderLight, width: 22, textAlign: 'right',
      }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {row.number ? `#${row.number} ` : ''}{row.name}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 2,
        }}>
          {row.played} pts · {row.wins}W-{row.losses}L{row.diff !== 0 ? ` (${row.diff > 0 ? '+' : ''}${row.diff})` : ''}
        </div>
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 15, fontWeight: 800, color: wrColor,
        minWidth: 44, textAlign: 'right',
      }}>
        {row.winRate == null ? '—' : `${row.winRate}%`}
      </span>
    </div>
  );
}

// § 70.11 Stage 4 — one flagged self-report in the manual-override queue.
function ReviewItem({ item, ordinal, playersById, onAccept, onReassign, onDismiss }) {
  const [busy, setBusy] = useState(false);
  const { t } = useLanguage();
  const player = playersById[item.playerId];
  const name = player ? (player.nickname || player.name || '?') : '?';
  const candOrder = (item.candidate.point.order ?? 0) + 1;
  const run = (fn) => async () => {
    if (busy) return;
    setBusy(true);
    try { await fn(); } catch (e) { console.error('Override failed:', e); setBusy(false); }
  };
  return (
    <div style={{
      marginBottom: SPACE.sm, padding: SPACE.sm,
      background: COLORS.surfaceDark,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.lg,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
        color: COLORS.text, marginBottom: 6,
      }}>
        {name}
        <span style={{ color: COLORS.textMuted, fontWeight: 500 }}>
          {t('results_proposed_point', candOrder)}
        </span>
      </div>
      <LogRow row={item.selfReport} ordinal={ordinal} isPending={false} />
      <div style={{ display: 'flex', gap: SPACE.xs, flexWrap: 'wrap', marginTop: 6 }}>
        <Btn variant="accent" size="sm" disabled={busy} onClick={run(onAccept)}>
          <Check size={14} strokeWidth={2.5} /> {t('results_accept', candOrder)}
        </Btn>
        <Btn variant="default" size="sm" disabled={busy} onClick={run(onDismiss)}>
          <X size={14} strokeWidth={2.5} /> {t('results_dismiss')}
        </Btn>
      </div>
      {item.reassignOptions.length > 0 && (
        <div style={{ display: 'flex', gap: SPACE.xs, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
          <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            {t('results_reassign_to')}
          </span>
          {item.reassignOptions.map(opt => (
            <Btn key={opt.point.id} variant="default" size="sm" disabled={busy}
              onClick={run(() => onReassign(opt))}>
              #{(opt.point.order ?? 0) + 1}
            </Btn>
          ))}
        </div>
      )}
    </div>
  );
}

// § 70.8 D2 — one break-bunker's event-scoped self-log stats.
function BunkerRow({ b }) {
  const { t } = useLanguage();
  // Higher hit rate = more dangerous bunker → red (mirrors PlayerRow wrColor).
  const hitColor = b.hitRate == null ? COLORS.textMuted
    : b.hitRate >= 50 ? COLORS.danger : b.hitRate >= 25 ? COLORS.accent : COLORS.success;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: '12px 14px', marginBottom: SPACE.xs,
      background: COLORS.surfaceDark,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.lg,
      minHeight: 52,
    }}>
      <SideTag side={b.side} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: 14, fontWeight: 600, color: COLORS.text,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {b.bunker}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 2,
        }}>
          {t('results_bunker_stats', b.count, b.shots)}
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: 48 }}>
        <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: hitColor }}>
          {b.hitRate == null ? '—' : `${b.hitRate}%`}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '.3px',
        }}>
          {t('results_hit_label')}
        </div>
      </div>
    </div>
  );
}
