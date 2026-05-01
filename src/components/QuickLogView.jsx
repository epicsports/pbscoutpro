import React, { useState, useMemo, useEffect } from 'react';
import { Heart, Clock } from 'lucide-react';
import PageHeader from './PageHeader';
import { MoreBtn, ActionSheet } from './ui';
import LivePointTracker from './training/LivePointTracker';
import PlayerAvatar from './PlayerAvatar';
import { COLORS, FONT, FONT_SIZE } from '../utils/theme';
import { ZONES } from '../utils/zones';
import { winRateColor } from '../utils/colorScale';
import { useLanguage } from '../hooks/useLanguage';
import { useQuickLogSetter } from '../contexts/QuickLogContext';

/**
 * QuickLogView — fast point logging without canvas.
 * Two labeled squad sections → pick players → tap winner → next.
 *
 * If no players are selected, both squads auto-fill from their full rosters
 * (same as the old direct-tap-to-score behavior).
 *
 * § 58 visual redesign (2026-05-01): KIOSK-style player tiles with
 *   metrics on Stage 1; emoji + theme ZONE_COLORS toggles on Stage 2;
 *   ⋮ menu houses Zaawansowany scouting / Pomiń pozycje / Anuluj punkt;
 *   tablet (≥768px) gets 3-col grid with bigger avatars.
 */
// Synthetic position coordinates for zone-derived player positions.
// D=dorito top, C=center, S=snake bottom — all x=0.30 (near base).
const ZONE_POS = {
  D: { x: 0.30, y: 0.20 },
  C: { x: 0.30, y: 0.50 },
  S: { x: 0.30, y: 0.80 },
};

// Tablet breakpoint — § 58.2 (avatars 64px, 3-col grid, bigger zone tiles).
const TABLET_MIN_WIDTH = 768;

function useIsTablet() {
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`).matches
  );
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const mq = window.matchMedia(`(min-width: ${TABLET_MIN_WIDTH}px)`);
    const handler = (e) => setIsTablet(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isTablet;
}

// Per-player session metrics (played + winRate + survivalRate). Lightweight
// alternative to playerStats.computePlayerStats — avoids dragging field-aware
// dependencies into a UI surface that only needs three numbers per tile.
function computeMetrics(playerId, points) {
  let played = 0;
  let wins = 0;
  let survived = 0;
  for (const pt of points || []) {
    const homeAssign = pt.homeData?.assignments || [];
    const awayAssign = pt.awayData?.assignments || [];
    const hi = homeAssign.indexOf(playerId);
    const ai = awayAssign.indexOf(playerId);
    let side = null;
    let slot = -1;
    if (hi >= 0) { side = pt.homeData; slot = hi; }
    else if (ai >= 0) { side = pt.awayData; slot = ai; }
    else continue;
    played += 1;
    const myWin = (hi >= 0 && pt.outcome === 'win_a') || (ai >= 0 && pt.outcome === 'win_b');
    if (myWin) wins += 1;
    const elims = side?.eliminations || [];
    if (!elims[slot]) survived += 1;
  }
  return {
    played,
    winRate: played > 0 ? Math.round((wins / played) * 100) : null,
    survivalRate: played > 0 ? Math.round((survived / played) * 100) : null,
  };
}

export default function QuickLogView({
  teamA, teamB,
  homeRoster, awayRoster,
  allPlayers,
  roster, // legacy: single flat roster — treated as the active team's squad
  points, activeTeam = 'A',
  activeSide = 'both', // 'home' | 'away' | 'both'
  onSavePoint, onBack, onSwitchToScout,
  onEndMatch, onDeleteMatch,
}) {
  const { t } = useLanguage();
  const isTablet = useIsTablet();
  const [menuOpen, setMenuOpen] = useState(false);
  // § 58.7 (hotfix v2): tell AppShell to hide the tournament context bar
  // for the duration of QuickLog. The bar otherwise duplicates the
  // PageHeader and pushes Stage 1 CTA below the fold on desktop landscape.
  const setQuickLogActive = useQuickLogSetter();
  useEffect(() => {
    setQuickLogActive(true);
    return () => setQuickLogActive(false);
  }, [setQuickLogActive]);
  // Back-compat: MatchPage still passes a flat `roster` for tournament quick
  // logging. Map it onto the active side so the single-section flow keeps
  // working with the new split-squad UI.
  if (!homeRoster && !awayRoster && roster) {
    if (activeTeam === 'B') { awayRoster = roster; homeRoster = []; }
    else { homeRoster = roster; awayRoster = []; }
  }
  homeRoster = homeRoster || [];
  awayRoster = awayRoster || [];

  // Single-side mode: only show the relevant roster for picking
  const pickHomeRoster = activeSide === 'away' ? [] : homeRoster;
  const pickAwayRoster = activeSide === 'home' ? [] : awayRoster;

  // Bug B: selection is an Array (not Set) so tap order maps directly to
  // slot indices on canvas prefill — assignments[0]=first tapped, [4]=fifth.
  // Order persists across stage navigation (state lives at parent level).
  const [selected, setSelected] = useState([]);
  const [zones, setZones] = useState({}); // { [pid]: 'D' | 'C' | 'S' }
  const [step, setStep] = useState('pick'); // 'pick' | 'zone' | 'tracking' | 'win'
  const [saving, setSaving] = useState(false);
  // § 58.x Bug 5 (hotfix v3): captured live-tracking payload (eliminations,
  // outcome, stages, reasons, durations) gets stored here when Stage 3
  // LivePointTracker emits onSave, so Stage 4 outcome handler can merge
  // it into the final point write. null when the user skipped Stage 3.
  const [liveTrackingData, setLiveTrackingData] = useState(null);

  const scoreA = points.filter(p => p.outcome === 'win_a').length;
  const scoreB = points.filter(p => p.outcome === 'win_b').length;
  const ptNum = points.length + 1;

  const allRoster = useMemo(() => [...homeRoster, ...awayRoster], [homeRoster, awayRoster]);

  // Per-player metrics (played + winRate + survivalRate) over the current
  // session's points. Memoized so 28 players × N points doesn't re-run on
  // every re-render (tap, hover, etc).
  const metricsByPlayer = useMemo(() => {
    const m = {};
    allRoster.forEach(p => { m[p.id] = computeMetrics(p.id, points); });
    return m;
  }, [allRoster, points]);

  const toggle = (pid) => {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(p => p !== pid);
      if (prev.length >= 5) return prev; // NXL 5v5 — max 5 on field
      return [...prev, pid];
    });
  };

  // Bug B: shared payload builder used by both 'Rozpocznij punkt' (handleWin)
  // and 'Zaawansowany scouting' (handleAdvancedScouting). outcome may be null
  // for the canvas-handoff path — caller decides; § 57 W3 syntheticZone tags
  // are emitted in either case.
  const buildPayload = (outcome) => {
    const pids = selected.length > 0
      ? selected
      : [...homeRoster.map(p => p.id), ...awayRoster.map(p => p.id)].slice(0, 5);
    const assignments = Array(5).fill(null);
    const players = Array(5).fill(null);
    const syntheticZones = Array(5).fill(null);
    pids.forEach((pid, i) => {
      if (i >= 5) return;
      assignments[i] = pid;
      const z = zones[pid];
      players[i] = z ? ZONE_POS[z] : null;
      syntheticZones[i] = z || null;
    });
    return { assignments, players, outcome, syntheticZones };
  };

  const handleWin = async (winner) => {
    if (saving) return;
    setSaving(true);
    try {
      const outcome = winner === 'A' ? 'win_a' : 'win_b';
      const payload = buildPayload(outcome);
      // § 58.x Bug 5 (hotfix v3): if user came through Stage 3 live
      // tracking, merge captured eliminations + stages + reasons +
      // duration into the final write. User-picked winner here OVERRIDES
      // the live-tracker outcome (intentional — Stage 4 is the explicit
      // confirmation step per § 58.1 four-stage flow).
      if (liveTrackingData) {
        if (liveTrackingData.eliminations) payload.eliminations = liveTrackingData.eliminations;
        if (liveTrackingData.eliminationTimes) payload.eliminationTimes = liveTrackingData.eliminationTimes;
        if (liveTrackingData.eliminationStages) payload.eliminationStages = liveTrackingData.eliminationStages;
        if (liveTrackingData.eliminationReasons) payload.eliminationReasons = liveTrackingData.eliminationReasons;
        if (liveTrackingData.eliminationReasonTexts) payload.eliminationReasonTexts = liveTrackingData.eliminationReasonTexts;
        if (liveTrackingData.pointDuration != null) payload.pointDuration = liveTrackingData.pointDuration;
      }
      if (onSavePoint) {
        await onSavePoint(payload);
      }
    } catch (e) {
      console.error('Quick log save failed:', e);
      alert('Save failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setSaving(false);
      // Reset only the stage — selected + zones intentionally persist so a
      // scout running consecutive points with the same 5-player lineup can
      // re-tap "Przypisz pozycje (5/5) →" → "Rozpocznij punkt" without
      // re-picking the squad. "Anuluj punkt" in the ⋮ menu clears state.
      setStep('pick');
      setLiveTrackingData(null);
    }
  };

  // Bug B: 'Zaawansowany scouting' from stage 'zone' menu — saves point with
  // assignments + synthetic positions + null outcome, then hands off to canvas
  // via onSwitchToScout(pointId). Parent appends &point=<pid> to the URL so
  // MatchPage's existing pointParamId loader auto-edits the freshly-saved
  // point. If onSavePoint doesn't return a docRef, fall back to non-prefill.
  const handleAdvancedScouting = async () => {
    if (saving) return;
    setSaving(true);
    let pointId = null;
    try {
      if (onSavePoint) {
        const ref = await onSavePoint(buildPayload(null));
        pointId = ref?.id || null;
      }
    } catch (e) {
      console.error('Advanced scouting handoff failed:', e);
      alert('Save failed: ' + (e?.message || 'Unknown error'));
      setSaving(false);
      return;
    }
    if (onSwitchToScout) onSwitchToScout(pointId);
    // No setSaving(false) on success — parent navigates and unmounts.
  };

  const handleCancelPoint = () => {
    setSelected([]);
    setZones({});
    setLiveTrackingData(null);
    setStep('pick');
  };

  const history = useMemo(() =>
    [...points].reverse().map((pt, ri) => {
      const num = points.length - ri;
      const home = pt.homeData || pt.teamA || {};
      const away = pt.awayData || pt.teamB || {};
      // Pick the side with actual gameplay (players array has non-null entries).
      // If only one side was scouted, the other has pre-populated roster IDs in
      // assignments but no positions — skip it.
      const homePlayed = (home.players || []).some(Boolean);
      const awayPlayed = (away.players || []).some(Boolean);
      let assignments = [];
      if (homePlayed && awayPlayed) {
        assignments = [...(home.assignments || []), ...(away.assignments || [])];
      } else if (homePlayed) {
        assignments = home.assignments || [];
      } else if (awayPlayed) {
        assignments = away.assignments || [];
      } else {
        // Neither side has positions — fall back to whichever has assignments
        assignments = (home.assignments || []).filter(Boolean).length
          ? home.assignments
          : (away.assignments || []);
      }
      // Lookup: prefer allPlayers (global workspace pool), fall back to allRoster.
      const lookupPool = (allPlayers && allPlayers.length) ? allPlayers : allRoster;
      const names = assignments.filter(Boolean).map(pid => {
        const p = lookupPool.find(r => r.id === pid);
        return p?.nickname || p?.name?.split(' ').pop() || '?';
      });
      const isWin = (activeTeam === 'A' && pt.outcome === 'win_a') || (activeTeam === 'B' && pt.outcome === 'win_b');
      const isLoss = (activeTeam === 'A' && pt.outcome === 'win_b') || (activeTeam === 'B' && pt.outcome === 'win_a');
      return { num, names: names.join(', ') || '—', isWin, isLoss };
    }),
  [points, allRoster, allPlayers, activeTeam]);

  const myTeam = activeTeam === 'A' ? teamA : teamB;
  const oppTeam = activeTeam === 'A' ? teamB : teamA;
  const sideLabel = activeSide === 'home' ? teamA?.name
    : activeSide === 'away' ? teamB?.name
    : null;

  const homeColor = teamA?.color || COLORS.success;
  const awayColor = teamB?.color || COLORS.danger;

  // ── Stage 3 — Live tracking takes over the whole view ──
  // § 58.x Bug 5 (hotfix v3): LivePointTracker now CAPTURES the elim +
  // outcome payload into local `liveTrackingData` and advances to Stage 4
  // (outcome confirmation). It no longer auto-saves + resets — that
  // collapsed the four-stage flow into three. Stage 4's handleWin merges
  // liveTrackingData into the final write. onCancel now goes back to
  // Stage 2 (zone) so the user keeps their zone selections.
  if (step === 'tracking') {
    const pickedIds = selected.length > 0
      ? selected
      : [...homeRoster.map(p => p.id), ...awayRoster.map(p => p.id)].slice(0, 5);
    const pickedPlayers = pickedIds
      .map(pid => allRoster.find(r => r.id === pid) || (allPlayers || []).find(r => r.id === pid))
      .filter(Boolean)
      .slice(0, 5);
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <LivePointTracker
          pickedPlayers={pickedPlayers}
          pointNumber={ptNum}
          teamALabel={teamA?.name || 'A'}
          teamBLabel={teamB?.name || 'B'}
          onCancel={() => setStep('zone')}
          onSave={async (data) => {
            // Capture only — real save fires from Stage 4 handleWin so
            // the user can confirm/override the outcome on the next
            // screen. § 54 schema (D1.A) pass-through preserved by
            // handleWin's spread of liveTrackingData fields.
            setLiveTrackingData(data);
            setStep('win');
          }}
        />
      </div>
    );
  }

  // ⋮ menu actions — dynamic per stage. Stage 'zone' adds Advanced scouting +
  // Skip positions + Cancel point on top of the per-match End/Delete entries.
  const menuActions = [];
  if (step === 'zone') {
    if (onSwitchToScout) {
      menuActions.push({
        label: `${t('quicklog_advanced')} →`,
        accent: true,
        onPress: () => { setMenuOpen(false); handleAdvancedScouting(); },
      });
    }
    // § 58.x Bug 5 (hotfix v3): "Pomiń live tracking" — bypass Stage 3 and
    // jump straight to Stage 4 outcome buttons. Listed FIRST in the Stage 2
    // menu (after Zaawansowany scouting) per brief STEP 4d so scouts who
    // prefer the minimal flow can opt out without scrolling.
    menuActions.push({
      label: t('quicklog_skip_tracking'),
      onPress: () => { setMenuOpen(false); setStep('win'); },
    });
    menuActions.push({
      label: t('quicklog_skip_positions'),
      onPress: () => { setMenuOpen(false); setStep('win'); },
    });
    menuActions.push({
      label: t('quicklog_cancel_point'),
      onPress: () => { setMenuOpen(false); handleCancelPoint(); },
    });
    if (onEndMatch || onDeleteMatch) menuActions.push({ separator: true });
  }
  if (onEndMatch) menuActions.push({
    label: 'End match (mark as FINAL)',
    onPress: () => { setMenuOpen(false); onEndMatch(); },
  });
  if (onDeleteMatch) menuActions.push({
    label: 'Delete match', danger: true,
    onPress: () => { setMenuOpen(false); onDeleteMatch(); },
  });

  return (
    // § 58.7 (hotfix v2 Bug 2): use `height: 100%` instead of
    // `minHeight: 100dvh` so QuickLogView fits exactly inside AppShell's
    // flex content slot. Without this, the outer scrollContainer grows
    // past viewport and AppShell's overflow-auto wraps it — Stage 1 CTA
    // ends up below the fold on desktop landscape because the AppShell
    // wrapper scrolls instead of QuickLogView's inner area. The internal
    // `flex: 1; overflow-y: auto` below + sticky-bottom CTA give us the
    // KIOSK pattern: list scrolls, footer pinned.
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: onBack }}
        // § 58.x (hotfix v3 Bug 7): stage-aware title so the user knows
        // which step they're on. Subtitle (team name) stays constant.
        title={
          step === 'zone' ? t('quicklog_step_2_title')
            : step === 'tracking' ? t('quicklog_step_3_title')
            : step === 'win' ? t('quicklog_step_4_title')
            : t('quicklog_title')
        }
        subtitle={sideLabel ? sideLabel : `${myTeam?.name || '?'} vs ${oppTeam?.name || '?'}`}
        action={menuActions.length > 0 ? <MoreBtn onClick={() => setMenuOpen(true)} /> : null}
      />

      {/* Score bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '10px 16px',
        background: '#0d1117', borderBottom: '1px solid #1a2234', gap: 4,
      }}>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamA?.name}</div>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>{scoreA}</div>
        <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: COLORS.borderLight }}>:</span>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>{scoreB}</div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamB?.name}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px 4px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>
            {t('quicklog_point', ptNum)}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: selected.length > 0 ? COLORS.success : COLORS.textMuted }}>
            {t('quicklog_picked', selected.length)}
          </span>
        </div>

        {/* ── STAGE 1: Wybór graczy ── */}
        {step === 'pick' && (
          <>
            {pickHomeRoster.length > 0 && (
              <PlayerTileGrid
                label={`${teamA?.name || 'Home'}`}
                color={homeColor}
                roster={pickHomeRoster}
                selected={selected}
                onToggle={toggle}
                metricsByPlayer={metricsByPlayer}
                isTablet={isTablet}
              />
            )}
            {pickAwayRoster.length > 0 && (
              <PlayerTileGrid
                label={`${teamB?.name || 'Away'}`}
                color={awayColor}
                roster={pickAwayRoster}
                selected={selected}
                onToggle={toggle}
                metricsByPlayer={metricsByPlayer}
                isTablet={isTablet}
              />
            )}
            {/* Sticky-bottom CTA — § 58.7 single primary CTA per Stage 1.
                Live-tracking ghost button removed (Bug 3 hotfix v2): Stage 1
                is exclusively player-pick; tracking lives in Stage 3 and is
                reached via Stage 2 → "Rozpocznij punkt", not as a Stage 1
                shortcut. position: sticky keeps the CTA pinned to the bottom
                of the scroll container regardless of player-list length. */}
            <div style={{
              position: 'sticky', bottom: 0, zIndex: 5,
              background: COLORS.bg,
              padding: isTablet ? '12px 24px 16px' : '10px 16px 12px',
              borderTop: `1px solid ${COLORS.surfaceLight}`,
              marginTop: 'auto',
              flexShrink: 0,
            }}>
              <div onClick={selected.length === 5 ? () => setStep('zone') : undefined}
                style={{
                  background: selected.length === 5 ? COLORS.accent : COLORS.surfaceDark,
                  border: selected.length === 5 ? 'none' : `1px solid ${COLORS.surfaceLight}`,
                  borderRadius: 12, minHeight: isTablet ? 56 : 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: selected.length === 5 ? 'pointer' : 'default',
                  WebkitTapHighlightColor: 'transparent',
                  transition: 'all .15s',
                }}>
                <span style={{
                  fontFamily: FONT, fontSize: isTablet ? 16 : 14, fontWeight: 700,
                  color: selected.length === 5 ? '#000' : COLORS.textMuted,
                }}>
                  {selected.length === 5
                    ? `${t('quicklog_assign_positions')} (5/5) →`
                    : t('quicklog_pick_n_players', 5 - selected.length)
                  }
                </span>
              </div>
            </div>
          </>
        )}

        {/* ── STAGE 2: Pozycje ── */}
        {step === 'zone' && (
          <div style={{ padding: isTablet ? '0 24px' : '0 16px' }}>
            <div style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 600,
              letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted,
              padding: '12px 0 8px',
            }}>
              {t('quicklog_zones')}
            </div>
            {selected.map(pid => {
              const isHome = homeRoster.some(r => r.id === pid);
              const p = [...homeRoster, ...awayRoster].find(r => r.id === pid);
              const squadColor = isHome ? (teamA?.color || COLORS.success) : (teamB?.color || COLORS.danger);
              const zone = zones[pid] || null;
              const avatarSize = isTablet ? 64 : 48;
              const tileGap = isTablet ? 12 : 5;
              const iconSize = isTablet ? 40 : 22;
              return (
                <div key={pid} style={{
                  display: 'flex', alignItems: 'center',
                  gap: isTablet ? 16 : 10,
                  marginBottom: isTablet ? 14 : 10,
                }}>
                  <PlayerAvatar player={p} size={avatarSize} />
                  <div style={{
                    minWidth: isTablet ? 220 : 92,
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    {p?.number && (
                      <span style={{
                        fontFamily: FONT, fontSize: isTablet ? 12 : 11,
                        fontWeight: 800, color: COLORS.accent, letterSpacing: '-0.2px',
                      }}>
                        #{p.number}
                      </span>
                    )}
                    <span style={{
                      fontFamily: FONT, fontSize: isTablet ? 16 : 14, fontWeight: 600,
                      color: COLORS.text, minWidth: 0,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {p?.nickname || p?.name || '?'}
                    </span>
                    {/* squad color dot — small, decorative, paired with name */}
                    <span style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: squadColor, marginTop: 2,
                    }} />
                  </div>
                  {/* Bug 4 hotfix v2: cap zone-tile width on tablet/desktop
                      landscape. Without the cap, parent flex row stretches
                      tiles to ~500px each on 1920px-wide screens and the
                      emoji gets lost in dead space. Mobile keeps `flex: 1`
                      so tiles fill the remaining row width after avatar+name. */}
                  <div style={{
                    flex: 1, display: 'flex', gap: tileGap,
                    maxWidth: isTablet ? 480 : undefined,
                    marginLeft: isTablet ? 'auto' : undefined,
                  }}>
                    {ZONES.map(z => {
                      const active = zone === z.short;
                      return (
                        <div key={z.short}
                          onClick={() => setZones(prev => ({ ...prev, [pid]: z.short }))}
                          style={{
                            flex: 1, aspectRatio: '1',
                            minHeight: isTablet ? 64 : 48,
                            maxWidth: isTablet ? 140 : undefined,
                            borderRadius: isTablet ? 12 : 10,
                            border: `${active ? 2 : 1}px solid ${active ? z.color : '#1a2234'}`,
                            background: active ? `${z.color}15` : '#0f172a',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                            transition: 'all .12s',
                          }}>
                          <span style={{
                            fontSize: iconSize, lineHeight: 1,
                            // Emoji renders in OS-native color; we don't tint
                            // (per Option A, emoji aren't filter-able). Inactive
                            // state dims via parent border + bg only.
                            opacity: active ? 1 : 0.55,
                          }}>{z.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Mobile-only legend pill — first-time hint mapping emoji → name */}
            {!isTablet && (
              <div style={{
                background: '#0d1117', border: '1px solid #1a2234',
                borderRadius: 8, padding: '8px 12px',
                display: 'flex', justifyContent: 'center', gap: 14,
                marginTop: 10,
                fontFamily: FONT, fontSize: 9, fontWeight: 600,
                color: COLORS.textMuted,
              }}>
                {ZONES.map(z => (
                  <span key={z.short} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 11 }}>{z.icon}</span> {z.label}
                  </span>
                ))}
              </div>
            )}

            {/* Footer: ← Wróć | ▶ Rozpocznij punkt. Sticky-bottom (Bug 2
                hotfix v2) so on long zone lists / desktop landscape the
                CTAs stay pinned to the bottom of the scroll container.
                Single primary CTA per § 27; Zaawansowany scouting +
                Pomiń pozycje + Anuluj punkt live in ⋮ menu. */}
            <div style={{
              position: 'sticky', bottom: 0, zIndex: 5,
              background: COLORS.bg,
              padding: isTablet ? '12px 0 16px' : '10px 0 12px',
              borderTop: `1px solid ${COLORS.surfaceLight}`,
              marginTop: isTablet ? 20 : 12,
              display: 'flex', gap: 8,
            }}>
              <div onClick={() => setStep('pick')} style={{
                flex: 1,
                minHeight: isTablet ? 52 : 44,
                borderRadius: 10,
                border: '1px solid #1e293b', background: COLORS.surfaceDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: isTablet ? 14 : 13,
                  fontWeight: 600, color: COLORS.textMuted,
                }}>
                  ← {isTablet ? t('quicklog_back_to_players') : t('quicklog_back')}
                </span>
              </div>
              <div onClick={() => setStep('tracking')} style={{
                flex: 2,
                minHeight: isTablet ? 52 : 44,
                borderRadius: 10, background: COLORS.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontSize: isTablet ? 16 : 14, color: '#000' }}>▶</span>
                <span style={{
                  fontFamily: FONT, fontSize: isTablet ? 16 : 14,
                  fontWeight: 700, color: '#000',
                }}>
                  {t('quicklog_start_point') || 'Rozpocznij punkt'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── STAGE 4: Kto wygrał? (outcome) ── */}
        {step === 'win' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>
                {t('quicklog_who_won')}
              </span>
              <span onClick={() => setStep(selected.length > 0 ? 'zone' : 'pick')} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
                cursor: 'pointer',
              }}>← {t('quicklog_back')}</span>
            </div>
            <div style={{ display: 'flex', gap: 12, padding: '0 16px 12px' }}>
              <div onClick={() => handleWin('A')} style={{
                flex: 1, minHeight: 80, borderRadius: 16,
                border: `2px solid ${homeColor}55`, background: `${homeColor}0d`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.4 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: homeColor }}>{t('quicklog_won', teamA?.name || '?')}</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: homeColor, opacity: 0.6 }}>{t('quicklog_tap')}</span>
              </div>
              <div onClick={() => handleWin('B')} style={{
                flex: 1, minHeight: 80, borderRadius: 16,
                border: `2px solid ${awayColor}55`, background: `${awayColor}0d`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.4 : 1,
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 800, color: awayColor }}>{t('quicklog_won', teamB?.name || '?')}</span>
                <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: awayColor, opacity: 0.6 }}>{t('quicklog_tap')}</span>
              </div>
            </div>
          </>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <div style={{ padding: '8px 16px 6px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>{t('quicklog_history')}</span>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {history.map(h => (
                <div key={h.num} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: COLORS.surfaceDark,
                  border: '1px solid #1a2234', borderRadius: 8,
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.borderLight, minWidth: 24 }}>#{h.num}</span>
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: '#8b95a5', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.names}</span>
                  <span style={{
                    fontFamily: FONT, fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center',
                    color: h.isWin ? COLORS.success : h.isLoss ? COLORS.danger : COLORS.textMuted,
                  }}>{h.isWin ? 'W' : h.isLoss ? 'L' : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={menuActions} />
    </div>
  );
}

/**
 * PlayerTileGrid — § 58.2 KIOSK-style player tiles.
 *
 * Mobile: 1-column list.
 * Tablet (≥768px): 3-column grid, bigger avatars.
 *
 * Each tile: [Avatar] [#number / name / metrics row] [win% + WIN] [checkbox].
 * Tap toggles selection — same `selected.includes(p.id)` array contract as
 * the parent Set→Array migration in Bug B.
 */
function PlayerTileGrid({ label, color, roster, selected, onToggle, metricsByPlayer, isTablet }) {
  if (roster.length === 0) {
    return (
      <div style={{ padding: isTablet ? '0 24px 4px' : '0 16px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, paddingTop: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 700,
            letterSpacing: '.5px', textTransform: 'uppercase', color,
          }}>{label}</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.textMuted, padding: '6px 2px' }}>
          No players in this squad
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: isTablet ? '0 24px 4px' : '0 16px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, paddingTop: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          letterSpacing: '.5px', textTransform: 'uppercase', color,
        }}>{label}</span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : '1fr',
        gap: isTablet ? 12 : 8,
      }}>
        {roster.map(p => {
          const on = selected.includes(p.id);
          const m = metricsByPlayer[p.id] || { played: 0, winRate: null, survivalRate: null };
          const winColor = winRateColor(m.winRate);
          const survColor = winRateColor(m.survivalRate);
          const avatarSize = isTablet ? 64 : 48;
          const orderIndex = on ? selected.indexOf(p.id) : -1;
          return (
            <div key={p.id} onClick={() => onToggle(p.id)} style={{
              display: 'flex', alignItems: 'center', gap: isTablet ? 14 : 10,
              padding: isTablet ? '12px 14px' : '10px 12px',
              minHeight: isTablet ? 84 : 64,
              borderRadius: 12,
              border: `${on ? (isTablet ? 2 : 1.5) : 1}px solid ${on ? COLORS.accent : '#1a2234'}`,
              background: on ? `${COLORS.accent}08` : '#0f172a',
              cursor: 'pointer', transition: 'all .12s',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <PlayerAvatar player={p} size={avatarSize} />
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  {p.number && (
                    <span style={{
                      fontFamily: FONT, fontSize: isTablet ? 12 : 11,
                      fontWeight: 700, color: COLORS.accent, letterSpacing: '-0.2px',
                    }}>#{p.number}</span>
                  )}
                  <span style={{
                    fontFamily: FONT, fontSize: isTablet ? 17 : 14, fontWeight: 600,
                    color: COLORS.text,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                    {p.nickname || p.name || '?'}
                  </span>
                </div>
                {/* Metrics row: ♥ survival · ⏱ punkty */}
                <div style={{ display: 'flex', alignItems: 'center', gap: isTablet ? 12 : 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontFamily: FONT, fontSize: isTablet ? 12 : 10, fontWeight: 700,
                    color: survColor,
                  }}>
                    <Heart fill={survColor} stroke="none" size={isTablet ? 13 : 12} />
                    {m.survivalRate != null ? m.survivalRate : '—'}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    fontFamily: FONT, fontSize: isTablet ? 12 : 10, fontWeight: 600,
                    color: COLORS.textDim,
                  }}>
                    <Clock stroke={COLORS.textMuted} strokeWidth={2.5} size={isTablet ? 13 : 12} />
                    {m.played}
                  </span>
                </div>
              </div>
              {/* Win rate + WIN label */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                <span style={{
                  fontFamily: FONT, fontSize: isTablet ? 22 : 19, fontWeight: 800,
                  color: winColor, lineHeight: 1,
                }}>
                  {m.winRate != null ? `${m.winRate}%` : '—'}
                </span>
                <span style={{
                  fontFamily: FONT, fontSize: 8, fontWeight: 600,
                  color: '#475569', letterSpacing: '0.5px',
                }}>WIN</span>
              </div>
              {/* Checkbox circle */}
              <div style={{
                width: isTablet ? 28 : 26, height: isTablet ? 28 : 26,
                borderRadius: '50%',
                border: on ? 'none' : `2px solid #475569`,
                background: on ? COLORS.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                fontFamily: FONT, fontSize: isTablet ? 16 : 14, fontWeight: 800,
                color: '#0a0e17',
              }}>
                {on ? (orderIndex >= 0 ? orderIndex + 1 : '✓') : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
