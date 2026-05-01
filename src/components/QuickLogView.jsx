import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import { MoreBtn, ActionSheet } from './ui';
import LivePointTracker from './training/LivePointTracker';
import PlayerAvatar from './PlayerAvatar';
import { COLORS, FONT, FONT_SIZE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * QuickLogView — fast point logging without canvas.
 * Two labeled squad sections → pick players → tap winner → next.
 *
 * If no players are selected, both squads auto-fill from their full rosters
 * (same as the old direct-tap-to-score behavior).
 */
// Synthetic position coordinates for zone-derived player positions.
// D=dorito top, C=center, S=snake bottom — all x=0.15 (near base).
const ZONE_POS = {
  D: { x: 0.30, y: 0.20 },
  C: { x: 0.30, y: 0.50 },
  S: { x: 0.30, y: 0.80 },
};

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
  const [menuOpen, setMenuOpen] = useState(false);
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
  const [step, setStep] = useState('pick'); // 'pick' | 'zone' | 'win'
  const [saving, setSaving] = useState(false);

  const scoreA = points.filter(p => p.outcome === 'win_a').length;
  const scoreB = points.filter(p => p.outcome === 'win_b').length;
  const ptNum = points.length + 1;

  const allRoster = useMemo(() => [...homeRoster, ...awayRoster], [homeRoster, awayRoster]);

  const toggle = (pid) => {
    setSelected(prev => {
      if (prev.includes(pid)) return prev.filter(p => p !== pid);
      if (prev.length >= 5) return prev; // NXL 5v5 — max 5 on field
      return [...prev, pid];
    });
  };

  // Bug B: shared payload builder used by both 'Kto wygrał?' (handleWin) and
  // 'Zaawansowany scouting' (handleAdvancedScouting). outcome may be null
  // for the canvas-handoff path — caller decides; § 57 W3 syntheticZone
  // tags are emitted in either case.
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
      if (onSavePoint) {
        await onSavePoint(buildPayload(outcome));
      }
    } catch (e) {
      console.error('Quick log save failed:', e);
      alert('Save failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setSaving(false);
      setStep('pick');
    }
  };

  // Bug B: 'Zaawansowany scouting' from stage 'zone' — saves point with
  // assignments + synthetic positions + null outcome, then hands off to
  // canvas via onSwitchToScout(pointId). Parent appends &point=<pid> to
  // the URL so MatchPage's existing pointParamId loader auto-edits the
  // freshly-saved point. If the parent's onSavePoint doesn't return a
  // docRef, fall back to the old non-prefill handoff (mode=new).
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

  // ── Live tracking takes over the whole view ──
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
          teamAColor={teamA?.color || COLORS.success}
          teamBColor={teamB?.color || COLORS.danger}
          onCancel={() => setStep('pick')}
          onSave={async ({
            outcome, eliminations, eliminationTimes,
            eliminationStages, eliminationReasons, eliminationReasonTexts,
            pointDuration,
          }) => {
            const assignments = Array(5).fill(null);
            const players = Array(5).fill(null);
            pickedPlayers.forEach((p, i) => {
              assignments[i] = p.id;
              players[i] = null; // no positions in live tracking mode
            });
            if (onSavePoint) {
              await onSavePoint({
                assignments, players, outcome,
                // § 54 schema (D1.A): pass new stage + reason arrays through.
                // Legacy `eliminationCauses` field no longer written by the
                // tracker; downstream readers use deathTaxonomy normalize.
                eliminations, eliminationTimes,
                eliminationStages, eliminationReasons, eliminationReasonTexts,
                pointDuration,
              });
            }
            setStep('pick');
            setSelected([]);
            setZones({});
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      <PageHeader
        back={{ to: onBack }}
        title={t('quicklog_title')}
        subtitle={sideLabel ? sideLabel : `${myTeam?.name || '?'} vs ${oppTeam?.name || '?'}`}
        action={<MoreBtn onClick={() => setMenuOpen(true)} />}
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

        {step === 'pick' && (
          <>
            {pickHomeRoster.length > 0 && (
              <SquadSection
                label={`${teamA?.name || 'Home'} — wybierz graczy`}
                color={homeColor}
                roster={pickHomeRoster}
                selected={selected}
                onToggle={toggle}
              />
            )}
            {pickAwayRoster.length > 0 && (
              <SquadSection
                label={`${teamB?.name || 'Away'} — wybierz graczy`}
                color={awayColor}
                roster={pickAwayRoster}
                selected={selected}
                onToggle={toggle}
              />
            )}
            {selected.length > 0 && (
              <div style={{ padding: '8px 16px 4px' }}>
                {/* Bug C: 'Przypisz pozycje' is now the primary advance CTA —
                    zone toggles + outcome split into explicit stages 2 & 3. */}
                <div onClick={() => setStep('zone')} style={{
                  background: COLORS.accent, borderRadius: 10, minHeight: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  opacity: selected.length < 5 ? 0.75 : 1,
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#000' }}>
                    {t('quicklog_assign')} ({selected.length}/5) →
                  </span>
                </div>
                {/* LivePointTracker is preserved as a secondary affordance —
                    not in the stage flow but still reachable for users who
                    want full live elimination tracking. */}
                <div onClick={() => setStep('tracking')} style={{
                  marginTop: 6,
                  background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, minHeight: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>
                  <span style={{ fontSize: 12, color: COLORS.textDim }}>▶</span>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLORS.textDim }}>
                    Start punktu (live tracking)
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        {step === 'zone' && (
          <div style={{ padding: '0 16px' }}>
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
              return (
                <div key={pid} style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8,
                }}>
                  <PlayerAvatar player={p} size={32} />
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: squadColor, flexShrink: 0 }} />
                  {p?.number && (
                    <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.accent, letterSpacing: '-0.2px' }}>
                      #{p.number}
                    </span>
                  )}
                  <span style={{
                    fontFamily: FONT, fontSize: 13, fontWeight: 600,
                    color: COLORS.text, flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p?.nickname || p?.name || '?'}
                  </span>
                  {[
                    { key: 'D', label: t('zone_dorito'), color: COLORS.bump },
                    { key: 'C', label: t('zone_center'), color: COLORS.textDim },
                    { key: 'S', label: t('zone_snake'), color: COLORS.zeeker },
                  ].map(z => (
                    <div key={z.key}
                      onClick={() => setZones(prev => ({ ...prev, [pid]: z.key }))}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 10,
                        border: `2px solid ${zone === z.key ? z.color : COLORS.surfaceLight}`,
                        background: zone === z.key ? `${z.color}20` : COLORS.surfaceDark,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      }}>
                      <span style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 800,
                        color: zone === z.key ? z.color : COLORS.textMuted,
                      }}>{z.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div onClick={() => setStep('pick')} style={{
                flex: 1, minHeight: 44, borderRadius: 10,
                border: '1px solid #1e293b', background: COLORS.surfaceDark,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.textMuted }}>
                  {t('quicklog_back')}
                </span>
              </div>
              <div onClick={() => setStep('win')} style={{
                flex: 2, minHeight: 44, borderRadius: 10, background: COLORS.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#000' }}>
                  {t('quicklog_who_won')} →
                </span>
              </div>
            </div>
            {/* Bug B/C: 'Zaawansowany scouting' lives only in stage 2 now —
                scout commits to 5 players + zones first, then chooses
                between Kto wygrał (above) and the canvas path (below).
                handleAdvancedScouting saves the point with outcome=null,
                then hands off to canvas with ?point=<pid> for live edit. */}
            {onSwitchToScout && (
              <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
                <button type="button" onClick={handleAdvancedScouting} disabled={saving}
                  style={{
                    background: 'transparent', border: 'none',
                    color: saving ? COLORS.textMuted : COLORS.accent,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                    cursor: saving ? 'default' : 'pointer',
                    padding: '10px 12px', minHeight: 44,
                  }}>
                  {t('quicklog_advanced')} →
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'win' && (
          <>
            {/* Outcome buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: COLORS.textMuted }}>
                {t('quicklog_who_won')}
              </span>
              <span onClick={() => setStep(selected.length > 0 ? 'zone' : 'pick')} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
                cursor: 'pointer',
              }}>{t('quicklog_back')}</span>
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
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        // 'Advanced scouting' moved to stage 'zone' (Bug B/C) — entry removed
        // here so the menu doesn't expose it before zones are picked.
        ...(onEndMatch ? [{ label: 'End match (mark as FINAL)', onPress: () => { setMenuOpen(false); onEndMatch(); } }] : []),
        ...(onDeleteMatch ? [{ label: 'Delete match', danger: true, onPress: () => { setMenuOpen(false); onDeleteMatch(); } }] : []),
      ]} />
    </div>
  );
}

function SquadSection({ label, color, roster, selected, onToggle }) {
  return (
    <div style={{ padding: '8px 16px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{
          fontFamily: FONT, fontSize: 10, fontWeight: 700,
          letterSpacing: '.5px', textTransform: 'uppercase', color,
        }}>{label}</span>
      </div>
      {roster.length === 0 ? (
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: COLORS.textMuted, padding: '6px 2px' }}>
          No players in this squad
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roster.map(p => {
            const on = selected.includes(p.id);
            return (
              <div key={p.id} onClick={() => onToggle(p.id)} style={{
                height: 44, padding: '4px 12px 4px 4px', borderRadius: 22,
                border: `1.5px solid ${on ? color + '90' : COLORS.surfaceLight}`,
                background: on ? `${color}15` : COLORS.surfaceDark,
                display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', transition: 'all .1s',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <PlayerAvatar player={p} size={34} />
                {p.number && (
                  <span style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 800,
                    color: on ? color : COLORS.textDim,
                    letterSpacing: '-0.2px',
                  }}>#{p.number}</span>
                )}
                <span style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 600,
                  color: on ? color : COLORS.text,
                }}>{p.nickname || p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
