/**
 * ScoutRankingPage — leaderboard of scouts by data quality × volume.
 * DESIGN_DECISIONS § 33.
 *
 * Card: rank + initial avatar + name + points count + composite % + stars.
 * Tap → /scouts/:uid (detail).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import RdIcon from '../components/RdIcon';
import { Btn, EmptyState, Select } from '../components/ui';
import Preloader from '../components/Preloader';
import { useScreenLoader } from '../hooks/useScreenLoader';
import { useTournaments, useLayouts } from '../hooks/useFirestore';
import { useUserNames, fallbackScoutLabel } from '../hooks/useUserNames';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, ELEV, TRACKING, TNUM } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';
import { useWorkspace } from '../hooks/useWorkspace';
import { computeScoutStats, scoutStars, compositeColor } from '../utils/scoutStats';
import { useLanguage } from '../hooks/useLanguage';
import { leagueDisplayName } from '../hooks/useLeagues';

export default function ScoutRankingPage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { tournaments } = useTournaments();
  const { layouts } = useLayouts();
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('global'); // 'global' | 'layout' | 'tournament'
  const [selectedTournamentId, setSelectedTournamentId] = useState('');
  const [selectedLayoutId, setSelectedLayoutId] = useState('');
  const [selectedUid, setSelectedUid] = useState(null); // wide master-detail selection
  const device = useDevice();
  const wide = device.width >= 720;
  const { user } = useWorkspace();
  const myUid = user?.uid || null;

  useEffect(() => {
    let cancelled = false;
    if (!tournaments.length) { setPoints([]); setLoading(false); return; }
    (async () => {
      setLoading(true);
      const all = [];
      for (const t of tournaments) {
        try {
          const matches = await ds.fetchMatches(t.id);
          if (!matches.length) continue;
          const mids = matches.map(m => m.id);
          const pts = await ds.fetchPointsForMatches(t.id, mids);
          pts.forEach(p => all.push({ ...p, tournamentId: t.id }));
        } catch (e) { /* skip tournament on error */ }
        if (cancelled) return;
      }
      if (cancelled) return;
      setPoints(all);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [tournaments]);

  // Default the picker the first time we flip into each scope.
  useEffect(() => {
    if (scope === 'tournament' && !selectedTournamentId && tournaments.length) {
      setSelectedTournamentId(tournaments[0].id);
    }
    if (scope === 'layout' && !selectedLayoutId && layouts.length) {
      setSelectedLayoutId(layouts[0].id);
    }
  }, [scope, selectedTournamentId, selectedLayoutId, tournaments, layouts]);

  const filteredPoints = useMemo(() => {
    if (scope === 'tournament' && selectedTournamentId)
      return points.filter(p => p.tournamentId === selectedTournamentId);
    if (scope === 'layout' && selectedLayoutId) {
      const tids = new Set(
        tournaments.filter(t => t.layoutId === selectedLayoutId).map(t => t.id)
      );
      return points.filter(p => tids.has(p.tournamentId));
    }
    return points;
  }, [points, scope, selectedTournamentId, selectedLayoutId, tournaments]);

  const stats = useMemo(() => computeScoutStats(filteredPoints), [filteredPoints]);
  const uids = useMemo(() => stats.map(s => s.uid), [stats]);
  const names = useUserNames(uids);

  // Premium determinate loader (creep-and-snap on the single `loading` boolean).
  const { shown: loaderShown, progress: loaderP, close: closeLoader } = useScreenLoader(loading);
  const maxPts = useMemo(() => Math.max(...stats.map(s => s.points), 1), [stats]);
  // Wide master-detail: nothing is auto-picked — the right pane shows an
  // empty-state prompt until the user selects a scout from the leaderboard.
  const selected = selectedUid ? (stats.find(s => s.uid === selectedUid) || null) : null;

  return (
    // §arc-B — LIST tier (960 desktop cap): the premium redesign uses the wide
    // width for the ≥720 master-detail (leaderboard + selected-scout ring pane).
    <Screen archetype="list" header={<PageHeader back={{ to: '/' }} title={t('scout_ranking')} subtitle={t('scout_ranking_sub')} />}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: SPACE.sm,
        padding: `${SPACE.md}px ${SPACE.lg}px 0`, flexWrap: 'wrap',
      }}>
        <Btn variant="default" size="sm" active={scope === 'global'}
          onClick={() => setScope('global')}>{t('scope_global')}</Btn>
        <Btn variant="default" size="sm" active={scope === 'layout'}
          onClick={() => setScope('layout')}>{t('scope_layout')}</Btn>
        <Btn variant="default" size="sm" active={scope === 'tournament'}
          onClick={() => setScope('tournament')}>{t('scope_tournament')}</Btn>
        {scope === 'tournament' && (
          <Select value={selectedTournamentId} onChange={setSelectedTournamentId}
            style={{ flex: 1, minWidth: 140 }}>
            {tournaments.length === 0 && <option value="">— no tournaments —</option>}
            {tournaments.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}{t.year ? ` · ${t.year}` : ''}
              </option>
            ))}
          </Select>
        )}
        {scope === 'layout' && (
          <Select value={selectedLayoutId} onChange={setSelectedLayoutId}
            style={{ flex: 1, minWidth: 140 }}>
            {layouts.length === 0 && <option value="">— brak layoutów —</option>}
            {layouts.map(l => (
              <option key={l.id} value={l.id}>
                {l.name}{l.league ? ` · ${leagueDisplayName(l.league)}` : ''}{l.year ? ` ${l.year}` : ''}
              </option>
            ))}
          </Select>
        )}
      </div>

      {loaderShown ? (
        <div style={{ position: 'relative', minHeight: '60vh' }}>
          <Preloader
            progress={loaderP}
            phases={[{ label: t('preloader_phase_fetch_points'), to: 60 }, { label: t('preloader_phase_compute_ranking'), to: 100 }]}
            caption="reads · ranking scoutów"
            onDone={closeLoader}
          />
        </div>
      ) : loading ? (
        <div style={{ minHeight: '60vh' }} />
      ) : stats.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center' }}>
          <EmptyState icon="👤" text={t('scout_empty')} subtitle={t('scout_empty_sub')} />
        </div>
      ) : (
        <div style={{
          padding: SPACE.lg, alignItems: 'start',
          display: wide ? 'grid' : 'flex', flexDirection: wide ? undefined : 'column',
          gridTemplateColumns: wide ? 'minmax(0, 1fr) minmax(0, 380px)' : undefined,
          gap: wide ? 20 : 10,
        }}>
          {/* leaderboard (master) */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stats.map((s, idx) => {
              const name = names[s.uid] || fallbackScoutLabel(s.uid);
              return (
                <ScoutCard
                  key={s.uid}
                  rank={idx + 1}
                  name={name}
                  points={s.points}
                  composite={s.composite}
                  stars={scoutStars(s.composite)}
                  maxPts={maxPts}
                  me={s.uid === myUid}
                  active={wide && selected?.uid === s.uid}
                  // Phone: tap → full detail. Wide: tap → select the right-hand pane.
                  onClick={() => (wide ? setSelectedUid(s.uid) : navigate(`/scouts/${s.uid}`))}
                  t={t}
                />
              );
            })}
          </div>
          {/* selected-scout detail (wide only) — empty-state until one is picked */}
          {wide && (
            <div style={{ position: 'sticky', top: 12, zIndex: 1, minWidth: 0 }}>
              {selected ? (
                <ScoutDetailPane
                  scout={selected}
                  name={names[selected.uid] || fallbackScoutLabel(selected.uid)}
                  rank={stats.findIndex(s => s.uid === selected.uid) + 1}
                  stars={scoutStars(selected.composite)}
                  onOpen={() => navigate(`/scouts/${selected.uid}`)}
                  t={t}
                />
              ) : (
                <ScoutDetailEmpty t={t} />
              )}
            </div>
          )}
        </div>
      )}
    </Screen>
  );
}

// Premium 5-star row — filled accent / hairline outline (no glyph/emoji).
function Stars({ n, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} width={size} height={size} viewBox="0 0 16 16" style={{ display: 'block' }}>
          <path d="M8 1.6l1.9 4 4.4.5-3.3 3 .9 4.3L8 11.3 4.1 13.4l.9-4.3-3.3-3 4.4-.5z"
            fill={i <= n ? COLORS.accent : 'none'}
            stroke={i <= n ? COLORS.accent : ELEV.hairlineStrong} strokeWidth="1.1" strokeLinejoin="round" />
        </svg>
      ))}
    </div>
  );
}

// Premium leaderboard row — rank + initial tile + name + points bar + quality% + stars.
// `me` = the current user's row (accent border); `active` = selected in the wide pane.
function ScoutCard({ rank, name, points, composite, stars, maxPts, me, active, onClick, t }) {
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <div
      onClick={onClick}
      style={{
        background: active ? COLORS.accentA12 : ELEV.surface,
        border: `1px solid ${active || me ? COLORS.accentA40 : ELEV.hairline}`,
        boxShadow: active ? ELEV.shadow2 : ELEV.shadow1,
        borderRadius: 14, padding: '14px 14px',
        display: 'flex', alignItems: 'center', gap: 14,
        cursor: 'pointer', minHeight: 60, WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: rank <= 3 ? COLORS.accent : COLORS.textMuted, minWidth: 22, textAlign: 'center', flexShrink: 0, ...TNUM }}>{rank}</span>
      <div style={{ width: 44, height: 44, borderRadius: 13, background: ELEV.sunken, border: `1px solid ${ELEV.hairlineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 800, fontSize: 17, color: COLORS.textDim, flexShrink: 0 }}>{initial}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <div style={{ flex: 1, maxWidth: 130, height: 5, borderRadius: 3, background: ELEV.sunken, overflow: 'hidden' }}>
            <div style={{ width: `${Math.round((points / maxPts) * 100)}%`, height: '100%', background: COLORS.accent }} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textMuted, ...TNUM }}>{t('scout_points', points)} · {t('scout_quality', composite)}</span>
        </div>
      </div>
      <Stars n={stars} />
    </div>
  );
}

// Wide selected-scout detail — conic quality ring (color by composite, NEVER green
// at 0 — `compositeColor` is the survival-style 0→red/mid→amber/high→green scale).
function ScoutDetailPane({ scout, name, rank, stars, onOpen, t }) {
  const color = compositeColor(scout.composite);
  const initial = (name || '?').charAt(0).toUpperCase();
  return (
    <>
      <div style={{ background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1, borderRadius: 18, padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 58, height: 58, borderRadius: 16, background: ELEV.sunken, border: `1px solid ${ELEV.hairlineStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontSize: 24, fontWeight: 800, color: COLORS.textDim, flexShrink: 0 }}>{initial}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: COLORS.text, letterSpacing: TRACKING.tight, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
            <div style={{ marginTop: 7 }}><Stars n={stars} size={16} /></div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '22px 0 4px' }}>
          <div style={{ position: 'relative', width: 112, height: 112, flexShrink: 0, borderRadius: '50%', background: `conic-gradient(${color} ${scout.composite}%, ${ELEV.sunken} 0)` }}>
            <div style={{ position: 'absolute', inset: 9, borderRadius: '50%', background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color, lineHeight: 1, ...TNUM }}>{scout.composite}<span style={{ fontSize: 14 }}>%</span></span>
              <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800, color: COLORS.textMuted, letterSpacing: TRACKING.label, marginTop: 3 }}>{t('scout_quality_label')}</span>
            </div>
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[[t('scout_position'), `#${rank}`, rank <= 3 ? COLORS.accent : COLORS.text], [t('scout_scouted'), `${scout.points}`, COLORS.text], [t('scout_rating'), `${stars}/5`, COLORS.accent]].map(([lab, val, col]) => (
              <div key={lab} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 9, borderBottom: `1px solid ${ELEV.hairline}` }}>
                <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim }}>{lab}</span>
                <span style={{ fontFamily: FONT, fontSize: 19, fontWeight: 800, color: col, ...TNUM }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
        <div onClick={onOpen} style={{ marginTop: 16, minHeight: 48, textAlign: 'center', padding: '13px', borderRadius: 12, background: COLORS.accent, color: '#1a1206', fontFamily: FONT, fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: `0 4px 14px ${COLORS.accent}40`, WebkitTapHighlightColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {t('scout_open_profile')}
        </div>
      </div>
    </>
  );
}

// Wide right-pane empty state — shown until a scout is selected from the
// leaderboard. textMuted + RdIcon (NOT blank); no amber, no glow.
function ScoutDetailEmpty({ t }) {
  return (
    <div style={{
      background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
      borderRadius: 18, padding: '48px 28px', textAlign: 'center',
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: ELEV.sunken,
        border: `1px solid ${ELEV.hairlineStrong}`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted,
      }}>
        <RdIcon name="user" size={26} />
      </div>
      <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.textDim }}>{t('scout_select_prompt')}</div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, maxWidth: 240, lineHeight: 1.5 }}>{t('scout_select_sub')}</div>
    </div>
  );
}
