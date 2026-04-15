/**
 * PlayerStatsPage — per-player performance stats.
 * DESIGN_DECISIONS.md § 24.
 *
 * Route: /player/:playerId/stats?scope=tournament&tid=xxx
 * URL params:
 *   - scope: 'tournament' | 'global' | 'match' (default 'global')
 *   - tid: tournament id (required for scope=tournament|match)
 *   - mid: match id (required for scope=match)
 *
 * Layout (top to bottom):
 *   1. Profile header — avatar + name + team + HERO badge
 *   2. Scope pills — [This tournament] [Global] (and [This match] when scoped)
 *   3. 2×2 metric grid — Win rate, Points played, Break survival, Break kill rate
 *   4. Preferred position — zone breakdown bars
 *   5. Match history — per-match rows with W/L and point counts
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Loading, EmptyState, SectionLabel, Select } from '../components/ui';
import LineupStatsSection from '../components/LineupStatsSection';
import { computeLineupStats } from '../utils/generateInsights';
import { usePlayers, useTeams, useTournaments, useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, TOUCH, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
import { resolveField } from '../utils/helpers';
import {
  computePlayerStats,
  buildPlayerPointsFromMatch,
} from '../utils/playerStats';
import { useLanguage } from '../hooks/useLanguage';

// ─── Zone color (matches design § 24 — cyan snake, orange dorito, gray center) ───
function zoneColor(zone) {
  if (zone.startsWith('Snake')) return '#22d3ee';
  if (zone.startsWith('Dorito')) return '#fb923c';
  return '#64748b';
}

// ─── Win-rate color tier (§ 24) ───
function winRateColor(pct) {
  if (pct == null) return COLORS.textMuted;
  if (pct >= 70) return '#22c55e';
  if (pct >= 40) return '#f59e0b';
  return '#ef4444';
}

// ─── Avatar — 64px circle with number in accent color ───
function Avatar({ player, isHero }) {
  const color = player?.color || COLORS.accent;
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: 64, height: 64, borderRadius: '50%',
        background: '#0f172a', border: `2px solid ${color}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: FONT, fontWeight: 800, fontSize: 26, color,
      }}>
        #{player?.number || '?'}
      </div>
      {isHero && (
        <div style={{
          position: 'absolute', top: -2, right: -2,
          width: 20, height: 20, borderRadius: '50%',
          background: '#f59e0b', border: '2px solid #080c14',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, color: '#000', fontWeight: 800,
        }}>★</div>
      )}
    </div>
  );
}

// ─── Metric card — one cell of the 2×2 grid ───
function MetricCard({ label, value, suffix, barPct, barColor }) {
  return (
    <div style={{
      background: '#0f172a', border: `1px solid #1a2234`,
      borderRadius: 12, padding: '14px 14px 12px',
      display: 'flex', flexDirection: 'column', gap: 6,
      minHeight: 88,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 500,
        color: '#475569', letterSpacing: '0.4px',
        textTransform: 'uppercase',
      }}>{label}</div>
      <div style={{
        fontFamily: FONT, fontSize: 24, fontWeight: 800,
        color: barColor || COLORS.text, letterSpacing: '-0.02em',
        lineHeight: 1,
      }}>
        {value ?? '—'}
        {value != null && suffix && (
          <span style={{ fontSize: 14, fontWeight: 700, marginLeft: 2 }}>{suffix}</span>
        )}
      </div>
      {barPct != null && (
        <div style={{
          height: 3, width: '100%',
          background: '#1a2234', borderRadius: 2,
          overflow: 'hidden', marginTop: 'auto',
        }}>
          <div style={{
            height: '100%', width: `${Math.max(0, Math.min(100, barPct))}%`,
            background: barColor || COLORS.accent,
          }} />
        </div>
      )}
    </div>
  );
}

// ─── Shot direction bar — stacked horizontal bar ───
function ShotBar({ dorito, center, snake }) {
  const zones = [
    { key: 'dorito', label: 'Dorito', pct: dorito, color: '#fb923c' },
    { key: 'center', label: 'Center', pct: center, color: '#8b95a5' },
    { key: 'snake', label: 'Snake', pct: snake, color: '#22d3ee' },
  ].filter(z => z.pct > 0);
  return (
    <div>
      <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', gap: 2, marginBottom: 8 }}>
        {zones.map(z => (
          <div key={z.key} style={{
            flex: z.pct, background: z.color + '30',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FONT, fontSize: 10, fontWeight: 700, color: z.color,
            minWidth: z.pct > 10 ? 30 : 0,
          }}>{z.pct > 10 ? `${z.pct}%` : ''}</div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        {zones.map(z => (
          <div key={z.key} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color }} />
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: z.color }}>{z.label} {z.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Scope pill — one filter chip ───
function ScopePill({ label, active, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding: '8px 14px', borderRadius: 8,
      background: active ? '#f59e0b08' : 'transparent',
      border: `1px solid ${active ? '#f59e0b' : '#1a2234'}`,
      color: active ? '#f59e0b' : COLORS.textDim,
      fontFamily: FONT, fontSize: 12, fontWeight: 600,
      cursor: 'pointer', minHeight: 36,
      display: 'flex', alignItems: 'center',
    }}>{label}</div>
  );
}

export default function PlayerStatsPage() {
  const { playerId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const device = useDevice();
  const R = responsive(device.type);
  const { t } = useLanguage();

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const scopeParam = searchParams.get('scope') || 'global';
  const tidParam = searchParams.get('tid') || null;
  const midParam = searchParams.get('mid') || null;
  const lidParam = searchParams.get('lid') || null;

  const { players } = usePlayers();
  const { teams } = useTeams();
  const { tournaments } = useTournaments();
  const { layouts } = useLayouts();

  const player = players.find(p => p.id === playerId);
  const playerTeam = teams.find(t => t.id === player?.teamId);

  // ─── Fetch all playerPoints + match metadata ──────────────
  // Strategy: walk every tournament (global) or just one (tournament/match),
  // fetch scouted teams, find ones whose roster contains this player, then
  // fetch their matches + points and normalize via buildPlayerPointsFromMatch.
  const [raw, setRaw] = useState({ playerPoints: [], matches: [], tournamentHeroTids: [] });
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return;
    let cancelled = false;

    (async () => {
      setDataLoading(true);
      const outPlayerPoints = [];
      const outMatches = []; // { id, tid, tournament, opponent, date, scoreA, scoreB, isWinA, isPlayerHome, playedCount }
      const tournamentHeroTids = [];

      // ─── Training scope ──────────────────────────────────
      // Walk trainings instead of tournaments. Training matchups share the
      // tournament point shape so buildPlayerPointsFromMatch can be reused
      // if we pass a pseudo-match object with `id` set to the matchup id.
      if (scopeParam === 'training') {
        try {
          const trainingsToScan = tidParam
            ? [{ id: tidParam }]
            : await (async () => {
                // No single-shot list helper for trainings — reuse
                // fetchAllTrainingPoints would be wasteful; instead read all
                // trainings via a snapshot equivalent. Fall back: skip global
                // training scope for now since walking every training without
                // a list API is not worth the cost. Callers always link
                // training scope with a tid from TrainingResultsPage.
                return [];
              })();

          for (const tr of trainingsToScan) {
            if (cancelled) return;
            const tid = tr.id;
            let trainingPoints = [];
            try { trainingPoints = await ds.fetchAllTrainingPoints(tid); } catch { continue; }

            // Group by matchup so buildPlayerPointsFromMatch keeps pointId context
            const byMatchup = {};
            trainingPoints.forEach(pt => {
              const mid = pt.matchupId || pt.id;
              (byMatchup[mid] ||= { matchup: pt.matchupData || {}, points: [] });
              byMatchup[mid].points.push(pt);
            });

            Object.entries(byMatchup).forEach(([mid, { matchup, points: mPoints }]) => {
              const pseudoMatch = { id: mid };
              const scoped = buildPlayerPointsFromMatch({
                points: mPoints,
                match: pseudoMatch,
                playerId,
              }).map(pp => ({ ...pp, tournamentId: tid, field: null, isTraining: true }));
              outPlayerPoints.push(...scoped);

              // Match history row — use squad names as "opponent"
              const playedCount = scoped.length;
              if (playedCount === 0) return;
              const scoreA = mPoints.filter(p => p.outcome === 'win_a').length;
              const scoreB = mPoints.filter(p => p.outcome === 'win_b').length;
              const playerInHome = mPoints.some(pt => {
                const h = pt.homeData || pt.teamA;
                return (h?.assignments || []).includes(playerId);
              });
              outMatches.push({
                id: mid,
                tid,
                tournamentName: 'Training',
                opponent: playerInHome ? (matchup.awaySquad || 'Away') : (matchup.homeSquad || 'Home'),
                date: null,
                scoreA, scoreB,
                playerIsHome: playerInHome,
                playedCount,
                isWin: playerInHome ? scoreA > scoreB : scoreB > scoreA,
                isTraining: true,
              });
            });
          }

          if (!cancelled) {
            setRaw({ playerPoints: outPlayerPoints, matches: outMatches, tournamentHeroTids });
            setDataLoading(false);
          }
          return;
        } catch (e) {
          console.error('Training scope fetch failed:', e);
        }
      }

      // Determine tournaments to scan
      let scanTids;
      if (scopeParam === 'tournament' || scopeParam === 'match') {
        scanTids = tidParam ? [tidParam] : [];
      } else if (scopeParam === 'layout' && lidParam) {
        scanTids = tournaments.filter(t => t.layoutId === lidParam).map(t => t.id);
      } else {
        scanTids = tournaments.map(t => t.id);
      }

      for (const tid of scanTids) {
        if (cancelled) return;
        const tournament = tournaments.find(t => t.id === tid);
        if (!tournament) continue;
        const field = resolveField(tournament, layouts);

        let scoutedList = [];
        try { scoutedList = await ds.fetchScoutedTeams(tid); } catch { continue; }
        const playerScouted = scoutedList.filter(st => (st.roster || []).some(r => (r.id || r) === playerId));
        if (!playerScouted.length) continue;

        // Track tournament-level HERO
        if (playerScouted.some(st => (st.heroPlayers || []).includes(playerId))) {
          tournamentHeroTids.push(tid);
        }

        const scoutedIds = new Set(playerScouted.map(st => st.id));
        let matchList = [];
        try { matchList = await ds.fetchMatches(tid); } catch { continue; }
        const relevantMatches = matchList.filter(m =>
          scoutedIds.has(m.teamA) || scoutedIds.has(m.teamB)
        );
        if (!relevantMatches.length) continue;

        const matchIds = scopeParam === 'match' && midParam
          ? relevantMatches.filter(m => m.id === midParam).map(m => m.id)
          : relevantMatches.map(m => m.id);
        if (!matchIds.length) continue;

        let rawPoints = [];
        try { rawPoints = await ds.fetchPointsForMatches(tid, matchIds); } catch { continue; }

        // Group points per match for buildPlayerPointsFromMatch
        const pointsByMatch = {};
        rawPoints.forEach(pt => {
          (pointsByMatch[pt.matchId] ||= []).push(pt);
        });

        relevantMatches.forEach(match => {
          if (!matchIds.includes(match.id)) return;
          const matchPoints = pointsByMatch[match.id] || [];
          const scoped = buildPlayerPointsFromMatch({
            points: matchPoints,
            match,
            playerId,
          }).map(pp => ({
            ...pp,
            tournamentId: tid,
            field,
            eventType: tournament.eventType || 'tournament',
          }));
          outPlayerPoints.push(...scoped);

          // Determine opponent scouted → team name
          const homeSt = scoutedList.find(st => st.id === match.teamA);
          const awaySt = scoutedList.find(st => st.id === match.teamB);
          const playerIsHome = homeSt && (homeSt.roster || []).some(r => (r.id || r) === playerId);
          const opponentSt = playerIsHome ? awaySt : homeSt;
          const opponentTeam = teams.find(t => t.id === opponentSt?.teamId);

          // Count this player's points played in this match
          const playedCount = scoped.length;
          if (playedCount === 0) return;

          // Resolve score from points
          const scoreA = matchPoints.filter(p => p.outcome === 'win_a').length;
          const scoreB = matchPoints.filter(p => p.outcome === 'win_b').length;

          outMatches.push({
            id: match.id,
            tid,
            tournamentName: tournament.name,
            opponent: opponentTeam?.name || opponentSt?.name || 'Unknown',
            date: match.date || null,
            scoreA, scoreB,
            playerIsHome,
            playedCount,
            isWin: playerIsHome ? scoreA > scoreB : scoreB > scoreA,
          });
        });
      }

      if (!cancelled) {
        setRaw({ playerPoints: outPlayerPoints, matches: outMatches, tournamentHeroTids });
        setDataLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [playerId, scopeParam, tidParam, midParam, lidParam, tournaments, layouts, teams]);

  // ─── Stats computation ──────────────────────────────────
  // Pick the field from the first playerPoint (for zone classification).
  // This is approximate when scope=global crosses multiple layouts — the
  // brief accepts this as the tradeoff for a single position breakdown.
  const statsField = raw.playerPoints[0]?.field || null;
  const stats = useMemo(() => computePlayerStats(raw.playerPoints, statsField),
    [raw.playerPoints, statsField]);

  const isHero = !!player?.hero || raw.tournamentHeroTids.length > 0;
  const scopedTournament = tidParam ? tournaments.find(t => t.id === tidParam) : null;

  // Lineup analytics — pair/trio win rates across all points the player played in.
  // Skip on match scope (sample too small) and build a flat point list where
  // `outcome` is normalized to 'win' / 'loss' from the player's perspective.
  const lineupStats = useMemo(() => {
    if (scopeParam === 'match') return null;
    const pts = raw.playerPoints.map(pp => ({
      players: pp.teamData?.players || [],
      assignments: pp.teamData?.assignments || [],
      outcome: pp.isWin ? 'win' : 'loss',
    }));
    return computeLineupStats(pts, statsField, players);
  }, [raw.playerPoints, players, scopeParam, statsField]);

  // ─── Back target ────────────────────────────────────────
  const backTo = () => {
    if (window.history.length > 1) navigate(-1);
    else if (tidParam) navigate('/');
    else navigate(`/team/${player?.teamId || ''}`);
  };

  if (!player) {
    return (
      <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto' }}>
        <PageHeader back={{ to: backTo }} title={t('player_stats')} />
        {players.length === 0
          ? <Loading text="Loading player..." />
          : <EmptyState icon="?" text="Player not found" />}
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: backTo }}
        title={player.name || 'Player'}
        subtitle={t('player_stats').toUpperCase()}
      />

      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ─── Profile header ─────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '4px 0 8px',
        }}>
          <Avatar player={player} isHero={isHero} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontWeight: 700, fontSize: 20,
              color: COLORS.text, letterSpacing: '-0.02em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{player.name}</div>
            {playerTeam && (
              <div style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 500,
                color: '#64748b', marginTop: 2,
              }}>{playerTeam.name}</div>
            )}
            {isHero && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                marginTop: 6, padding: '3px 8px', borderRadius: 6,
                background: '#f59e0b12', border: '1px solid #f59e0b20',
                fontFamily: FONT, fontSize: 10, fontWeight: 700,
                color: '#f59e0b', letterSpacing: '0.3px',
              }}>★ HERO</div>
            )}
          </div>
        </div>

        {/* ─── Scope pills ─────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {scopedTournament && (
            <ScopePill
              label={t('scope_tournament')}
              active={scopeParam === 'tournament'}
              onClick={() => navigate(`/player/${playerId}/stats?scope=tournament&tid=${scopedTournament.id}`)}
            />
          )}
          {scopeParam === 'training' && tidParam && (
            <ScopePill label={t('scope_training')} active onClick={() => {}} />
          )}
          {layouts.length > 0 && (
            <ScopePill
              label={t('scope_layout')}
              active={scopeParam === 'layout'}
              onClick={() => navigate(
                `/player/${playerId}/stats?scope=layout&lid=${lidParam || layouts[0]?.id || ''}&tid=${tidParam || ''}`
              )}
            />
          )}
          <ScopePill
            label={t('scope_global')}
            active={scopeParam === 'global'}
            onClick={() => navigate(`/player/${playerId}/stats?scope=global&tid=${tidParam || ''}`)}
          />
          {scopeParam === 'match' && midParam && (
            <ScopePill label={t('scope_match')} active onClick={() => {}} />
          )}
        </div>

        {/* Layout picker — only when scope=layout */}
        {scopeParam === 'layout' && layouts.length > 0 && (
          <div>
            <Select
              value={lidParam || ''}
              onChange={v => navigate(`/player/${playerId}/stats?scope=layout&lid=${v}`)}
              style={{ width: '100%', minHeight: 40 }}
            >
              <option value="">— select layout —</option>
              {layouts.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
              ))}
            </Select>
          </div>
        )}

        {/* Layout scope summary header */}
        {scopeParam === 'layout' && lidParam && (() => {
          const layout = layouts.find(l => l.id === lidParam);
          const layoutTs = tournaments.filter(t => t.layoutId === lidParam);
          const sparingCount = layoutTs.filter(t => t.eventType === 'sparing').length;
          const tCount = layoutTs.filter(t => (t.eventType || 'tournament') === 'tournament').length;
          return (
            <div style={{
              padding: '10px 14px', background: '#0f172a',
              border: '1px solid #1a2234', borderRadius: 10,
            }}>
              <div style={{
                fontFamily: FONT, fontSize: 13, fontWeight: 700,
                color: COLORS.text, marginBottom: 4,
              }}>
                {layout?.name || 'Layout'}
              </div>
              <div style={{ fontFamily: FONT, fontSize: 11, color: '#475569' }}>
                {[
                  sparingCount > 0 && `${sparingCount} sparing`,
                  tCount > 0 && `${tCount} tournament`,
                ].filter(Boolean).join(' · ')}
                {' · '}{raw.playerPoints.length} points
              </div>
            </div>
          );
        })()}

        {/* ─── Loading state ─────────────────────────── */}
        {dataLoading && <Loading text="Computing stats..." />}

        {!dataLoading && stats.played === 0 && (
          <EmptyState icon="?" text="No scouted points yet" subtitle="Scout matches with this player on the field to see stats." />
        )}

        {!dataLoading && stats.played > 0 && (
          <>
            {/* ─── Metric grid ──────────────────── */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 8,
            }}>
              <MetricCard
                label="Win %"
                value={stats.winRate}
                suffix="%"
                barPct={stats.winRate}
                barColor={winRateColor(stats.winRate)}
              />
              <MetricCard
                label="Points"
                value={stats.played}
              />
              <MetricCard
                label="+/−"
                value={`${stats.wins - stats.losses > 0 ? '+' : ''}${stats.wins - stats.losses}`}
              />
              <MetricCard
                label="W"
                value={stats.wins}
              />
              <MetricCard
                label="L"
                value={stats.losses}
              />
              <MetricCard
                label="Survival"
                value={stats.survivalRate}
                suffix="%"
                barPct={stats.survivalRate}
                barColor="#22c55e"
              />
              <MetricCard
                label="Kills"
                value={stats.kills}
              />
              <MetricCard
                label="K/pt"
                value={stats.killsPerPoint.toFixed(1)}
              />
            </div>

            {/* ─── Top bunker ────────────────────── */}
            {stats.bunkers.length > 0 && (
              <div>
                <SectionLabel>Break bunker</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {stats.bunkers.slice(0, 5).map(({ name, count, pct }) => (
                    <div key={name} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0',
                    }}>
                      <div style={{
                        fontFamily: FONT, fontSize: 13, fontWeight: 700,
                        color: COLORS.accent, minWidth: 60,
                      }}>{name}</div>
                      <div style={{
                        flex: 1, height: 8, background: '#1a2234',
                        borderRadius: 4, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', width: `${pct}%`,
                          background: COLORS.accent, borderRadius: 4,
                        }} />
                      </div>
                      <div style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 700,
                        color: COLORS.text, minWidth: 38, textAlign: 'right',
                      }}>{pct}%</div>
                      <div style={{
                        fontFamily: FONT, fontSize: 11, fontWeight: 500,
                        color: COLORS.textMuted, minWidth: 42, textAlign: 'right',
                      }}>{count}/{stats.played}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Break shot pattern ────────────── */}
            {stats.breakShots && (
              <div>
                <SectionLabel>Break shot direction ({stats.breakShots.total} shots)</SectionLabel>
                <ShotBar dorito={stats.breakShots.dorito} center={stats.breakShots.center} snake={stats.breakShots.snake} />
              </div>
            )}

            {/* ─── Obstacle shot pattern ─────────── */}
            {stats.obstacleShots && (
              <div>
                <SectionLabel>Obstacle shot direction ({stats.obstacleShots.total} shots)</SectionLabel>
                <ShotBar dorito={stats.obstacleShots.dorito} center={stats.obstacleShots.center} snake={stats.obstacleShots.snake} />
              </div>
            )}

            {/* ─── Lineup analytics (pair/trio win rates) ─── */}
            {lineupStats && lineupStats.length > 0 && (
              <LineupStatsSection lineupStats={lineupStats} />
            )}

            {/* ─── Position breakdown ────────────── */}
            {stats.positions.length > 0 && (
              <div>
                <SectionLabel>Preferred position</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {stats.positions.map(({ zone, count, pct }) => {
                    const color = zoneColor(zone);
                    return (
                      <div key={zone} style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 0',
                      }}>
                        <div style={{
                          fontFamily: FONT, fontSize: 12, fontWeight: 600,
                          color: COLORS.text, minWidth: 90,
                        }}>{zone}</div>
                        <div style={{
                          flex: 1, height: 8, background: '#1a2234',
                          borderRadius: 4, overflow: 'hidden',
                        }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: color,
                          }} />
                        </div>
                        <div style={{
                          fontFamily: FONT, fontSize: 12, fontWeight: 700,
                          color: COLORS.text, minWidth: 38, textAlign: 'right',
                        }}>{pct}%</div>
                        <div style={{
                          fontFamily: FONT, fontSize: 11, fontWeight: 500,
                          color: COLORS.textMuted, minWidth: 42, textAlign: 'right',
                        }}>{count}/{stats.played}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── Match history ─────────────────── */}
            {raw.matches.length > 0 && (
              <div>
                <SectionLabel>Match history</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {raw.matches.map(m => {
                    const badgeColor = m.isWin ? '#22c55e' : '#ef4444';
                    const badgeText = m.isWin ? 'W' : 'L';
                    return (
                      <div
                        key={`${m.tid}-${m.id}`}
                        onClick={() => navigate(`/tournament/${m.tid}/match/${m.id}`)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 14px', minHeight: 52,
                          background: '#0f172a',
                          border: '1px solid #1a2234',
                          borderRadius: 12, cursor: 'pointer',
                        }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: 6,
                          background: `${badgeColor}18`,
                          border: `1px solid ${badgeColor}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: FONT, fontWeight: 800, fontSize: 13,
                          color: badgeColor,
                        }}>{badgeText}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontFamily: FONT, fontSize: 13, fontWeight: 500,
                            color: COLORS.text,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>vs {m.opponent}</div>
                          {scopeParam === 'global' && (
                            <div style={{
                              fontFamily: FONT, fontSize: 10, fontWeight: 500,
                              color: COLORS.textMuted, marginTop: 1,
                            }}>{m.tournamentName}</div>
                          )}
                        </div>
                        <div style={{
                          fontFamily: FONT, fontSize: 12, fontWeight: 700,
                          color: COLORS.textDim,
                        }}>{m.scoreA}–{m.scoreB}</div>
                        <div style={{
                          fontFamily: FONT, fontSize: 10, fontWeight: 600,
                          color: COLORS.textMuted, letterSpacing: '0.3px',
                          marginLeft: 4,
                        }}>{m.playedCount}p</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
