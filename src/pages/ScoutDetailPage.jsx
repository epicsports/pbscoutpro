/**
 * ScoutDetailPage — per-scout breakdown.
 * DESIGN_DECISIONS § 33.
 *
 * Sections:
 *   A) Summary — total points, matches, tournaments, composite %.
 *   B) Match progression — chronological completeness bars per match.
 *   C) Per-section breakdown — breaks / shots / assignments / runners / eliminations.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import { Loading } from '../components/ui';
import { useTournaments } from '../hooks/useFirestore';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import {
  computeScoutRow, computeMatchCompleteness, compositeColor, scoutStars,
} from '../utils/scoutStats';

export default function ScoutDetailPage() {
  const { uid } = useParams();
  const { tournaments } = useTournaments();
  const [points, setPoints] = useState([]);
  const [matchesByTid, setMatchesByTid] = useState({});
  const [scoutedByTid, setScoutedByTid] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!tournaments.length) { setPoints([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const all = [];
      const matchMap = {};
      const scoutedMap = {};
      for (const t of tournaments) {
        try {
          const [matchList, scoutedList] = await Promise.all([
            ds.fetchMatches(t.id),
            ds.fetchScoutedTeams(t.id),
          ]);
          matchMap[t.id] = matchList;
          scoutedMap[t.id] = scoutedList;
          if (!matchList.length) continue;
          const mids = matchList.map(m => m.id);
          const pts = await ds.fetchPointsForMatches(t.id, mids);
          pts.forEach(p => all.push({ ...p, tournamentId: t.id }));
        } catch (e) { /* skip on error */ }
        if (cancelled) return;
      }
      if (cancelled) return;
      setPoints(all);
      setMatchesByTid(matchMap);
      setScoutedByTid(scoutedMap);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tournaments]);

  const row = useMemo(() => computeScoutRow(points, uid), [points, uid]);
  const names = useUserNames([uid]);
  const name = names[uid] || fallbackScoutLabel(uid);

  // Build chronological list of matches scouted by this user.
  const matchProgression = useMemo(() => {
    if (!points.length) return [];
    const pointsByMatch = new Map();
    points.forEach(pt => {
      const touchedByUser =
        (pt.homeData?.scoutedBy === uid) || (pt.awayData?.scoutedBy === uid);
      if (!touchedByUser) return;
      const key = `${pt.tournamentId}::${pt.matchId}`;
      if (!pointsByMatch.has(key)) pointsByMatch.set(key, []);
      pointsByMatch.get(key).push(pt);
    });
    const rows = [];
    pointsByMatch.forEach((pts, key) => {
      const [tid, mid] = key.split('::');
      const match = (matchesByTid[tid] || []).find(m => m.id === mid);
      if (!match) return;
      const scouted = scoutedByTid[tid] || [];
      const opponentId = findOpponentScoutedId(match, pts, uid) || null;
      const opponentEntry = scouted.find(s => s.id === opponentId);
      const opponentLabel = opponentEntry?.name
        || opponentEntry?.teamName
        || match.name
        || 'Match';
      const firstTs = Math.min(...pts.map(p => p.order || p.createdAt?.seconds || 0));
      const onlyUserPoints = pts.map(pt => {
        const next = { ...pt };
        if (pt.homeData?.scoutedBy !== uid) next.homeData = null;
        if (pt.awayData?.scoutedBy !== uid) next.awayData = null;
        return next;
      });
      rows.push({
        key,
        label: opponentLabel,
        pct: computeMatchCompleteness(onlyUserPoints),
        when: firstTs,
        count: pts.length,
      });
    });
    return rows.sort((a, b) => a.when - b.when);
  }, [points, uid, matchesByTid, scoutedByTid]);

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', paddingBottom: 80 }}>
      <PageHeader back={{ to: '/scouts' }} title={name} subtitle="SCOUT PROFILE" />

      {loading ? (
        <Loading text="Loading scouted points..." />
      ) : (
        <div style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          <SummaryCard row={row} stars={scoutStars(row.composite)} />
          {matchProgression.length > 0 && (
            <Section title="Match progression">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {matchProgression.map(m => (
                  <ProgressRow key={m.key} label={m.label} pct={m.pct} />
                ))}
              </div>
            </Section>
          )}
          {row.points > 0 && (
            <Section title="Per-section breakdown">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <MicroBar label="Breaks" pct={row.breakPct} />
                <MicroBar label="Shots" pct={row.shotPct} />
                <MicroBar label="Assignments" pct={row.assignPct} />
                <MicroBar label="Runners flagged" pct={row.runnerPct} />
                <MicroBar label="Eliminations" pct={row.elimPct} />
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function findOpponentScoutedId(match, pts, uid) {
  // If user only scouted home, the "away" scoutedId is what they faced (and vice versa).
  let sawHome = false;
  let sawAway = false;
  pts.forEach(pt => {
    if (pt.homeData?.scoutedBy === uid) sawHome = true;
    if (pt.awayData?.scoutedBy === uid) sawAway = true;
  });
  if (sawHome && !sawAway) return match.teamB;
  if (sawAway && !sawHome) return match.teamA;
  return null;
}

function SummaryCard({ row, stars }) {
  const color = compositeColor(row.composite);
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '16px 18px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted,
          letterSpacing: 0.4, textTransform: 'uppercase',
        }}>Volume</div>
        <div style={{
          fontFamily: FONT, fontSize: 22, fontWeight: 800, color: COLORS.text,
          letterSpacing: '-0.02em', marginTop: 2,
        }}>
          {row.points}<span style={{ fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}> pts</span>
        </div>
        <div style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.textMuted, marginTop: 2,
        }}>
          {row.matches} match{row.matches === 1 ? '' : 'es'} · {row.tournaments} tournament{row.tournaments === 1 ? '' : 's'}
        </div>
      </div>
      <div style={{
        textAlign: 'right', paddingLeft: 12,
        borderLeft: `1px solid ${COLORS.border}`,
      }}>
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 600, color: COLORS.textMuted,
          letterSpacing: 0.4, textTransform: 'uppercase',
        }}>Quality</div>
        <div style={{
          fontFamily: FONT, fontSize: 22, fontWeight: 800, color,
          letterSpacing: '-0.02em', marginTop: 2,
        }}>
          {row.composite}<span style={{ fontSize: 13, fontWeight: 600 }}>%</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color, marginTop: 2 }}>
          {'★'.repeat(stars)}<span style={{ color: COLORS.borderLight }}>{'★'.repeat(5 - stars)}</span>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8,
      }}>{title}</div>
      {children}
    </div>
  );
}

function ProgressRow({ label, pct }) {
  const color = compositeColor(pct);
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#8b95a5',
        flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</span>
      <div style={{
        flex: 1, height: 6, background: COLORS.surface, borderRadius: 3,
        overflow: 'hidden', maxWidth: 180,
      }}>
        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: color }} />
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 700, color,
        minWidth: 36, textAlign: 'right',
      }}>{pct}%</span>
    </div>
  );
}

function MicroBar({ label, pct }) {
  const color = compositeColor(pct);
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: '12px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 500, color: '#8b95a5', flex: 1,
      }}>{label}</span>
      <div style={{ width: 80, height: 4, borderRadius: 2, background: COLORS.surface, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2 }} />
      </div>
      <span style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700, color, minWidth: 36, textAlign: 'right',
      }}>{pct}%</span>
    </div>
  );
}
