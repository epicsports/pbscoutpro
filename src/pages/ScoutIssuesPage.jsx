/**
 * ScoutIssuesPage — "my scouting TODO".
 * DESIGN_DECISIONS § 33.
 *
 * Lists points the current user scouted that are missing data, grouped by
 * type and by match. Tapping an item opens the match page focused on that
 * point (via ?point= query param).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Loading, EmptyState } from '../components/ui';
import { useTournaments } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, SPACE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { computeScoutIssues } from '../utils/scoutStats';

const TYPES = [
  { key: 'shots',        label: 'Missing shots',              labelKey: 'scout_issues_type_shots',        icon: '🎯' },
  { key: 'assignments',  label: 'Missing player assignments',  labelKey: 'scout_issues_type_assignments',  icon: '👥' },
  { key: 'runners',      label: 'No runners flagged',          labelKey: 'scout_issues_type_runners',      icon: '🏃' },
  { key: 'eliminations', label: 'No eliminations marked',      labelKey: 'scout_issues_type_eliminations', icon: '💀' },
];

export default function ScoutIssuesPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const uid = user?.uid;
  const { tournaments } = useTournaments();
  const [points, setPoints] = useState([]);
  const [matchMeta, setMatchMeta] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!uid || !tournaments.length) {
      setPoints([]); setMatchMeta({}); setLoading(false); return;
    }
    (async () => {
      setLoading(true);
      const all = [];
      const meta = {};
      for (const t of tournaments) {
        try {
          const matchList = await ds.fetchMatches(t.id);
          if (!matchList.length) continue;
          const scoutedList = await ds.fetchScoutedTeams(t.id);
          matchList.forEach(m => {
            meta[`${t.id}::${m.id}`] = {
              tournamentName: t.name,
              tournamentId: t.id,
              matchName: m.name || resolveMatchName(m, scoutedList) || 'Match',
            };
          });
          const mids = matchList.map(m => m.id);
          const pts = await ds.fetchPointsForMatches(t.id, mids);
          pts.forEach(p => all.push({ ...p, tournamentId: t.id }));
        } catch (e) { /* skip */ }
        if (cancelled) return;
      }
      if (cancelled) return;
      setPoints(all);
      setMatchMeta(meta);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [uid, tournaments]);

  const issues = useMemo(() => computeScoutIssues(points, uid), [points, uid]);
  const totalIssues =
    (issues.shots?.length || 0) + (issues.assignments?.length || 0)
    + (issues.runners?.length || 0) + (issues.eliminations?.length || 0);

  if (!uid) {
    return (
      <Screen archetype="detail" padBottom={false} header={<PageHeader back={{ to: '/' }} title={t('scout_issues_title')} />}>
        <EmptyState icon="🔒" text={t('scout_issues_sign_in')} />
      </Screen>
    );
  }

  return (
    <Screen archetype="detail" header={<PageHeader back={{ to: '/' }} title={t('scout_issues_title')} subtitle={t('scout_issues_subtitle')} />}>
      {loading ? (
        <Loading text={t('loading')} />
      ) : totalIssues === 0 ? (
        <EmptyState icon="✓" text={t('scout_issues_all_caught_up')} subtitle="No missing data in the points you scouted." />
      ) : (
        <div style={{ padding: SPACE.lg, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          {TYPES.map(type => {
            const list = issues[type.key] || [];
            if (!list.length) return null;
            const groupedByMatch = groupByMatch(list);
            return (
              <div key={type.key}>
                <SectionHeader icon={type.icon} label={t(type.labelKey)} count={list.length} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {groupedByMatch.map(({ key, items }) => {
                    const info = matchMeta[key] || {};
                    return (
                      <MatchGroup
                        key={key}
                        tournamentName={info.tournamentName}
                        matchName={info.matchName}
                        items={items}
                        t={t}
                        onJump={(item) => navigate(
                          `/tournament/${item.tournamentId}/match/${item.matchId}?point=${item.pointId}`
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}

function resolveMatchName(match, scoutedList) {
  const aName = scoutedList.find(s => s.id === match.teamA)?.name;
  const bName = scoutedList.find(s => s.id === match.teamB)?.name;
  if (aName && bName) return `${aName} vs ${bName}`;
  return null;
}

function groupByMatch(list) {
  const map = new Map();
  list.forEach(item => {
    const key = `${item.tournamentId}::${item.matchId}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  });
  return [...map.entries()].map(([key, items]) => ({ key, items }));
}

function SectionHeader({ icon, label, count }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 4px 8px',
    }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted,
        letterSpacing: 0.5, textTransform: 'uppercase',
      }}>{label}</span>
      <span style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.accent,
      }}>{count}</span>
    </div>
  );
}

function MatchGroup({ tournamentName, matchName, items, onJump, t }) {
  // Collapse multiple issues for the same point into a single chip.
  const byPoint = new Map();
  items.forEach(it => {
    if (!byPoint.has(it.pointId)) byPoint.set(it.pointId, it);
  });
  const uniquePointItems = [...byPoint.values()];
  return (
    <div style={{
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
      borderRadius: 10, padding: '12px 14px',
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.text,
      }}>{matchName}</div>
      {tournamentName && (
        <div style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textMuted, marginTop: 2,
        }}>{tournamentName}</div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {uniquePointItems.map((it, idx) => (
          <button
            key={it.pointId + '-' + idx}
            type="button"
            onClick={() => onJump(it)}
            style={{
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              borderRadius: 999, padding: '6px 10px',
              fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.accent,
              cursor: 'pointer', minHeight: 44,
            }}>
            {t('scout_issues_point_n', idx + 1)}
          </button>
        ))}
      </div>
    </div>
  );
}
