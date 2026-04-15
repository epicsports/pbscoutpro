import React, { useState, useMemo } from 'react';
import PageHeader from './PageHeader';
import { Btn, MoreBtn, ActionSheet } from './ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';
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
  D: { x: 0.15, y: 0.20 },
  C: { x: 0.15, y: 0.50 },
  S: { x: 0.15, y: 0.80 },
};

export default function QuickLogView({
  teamA, teamB,
  homeRoster, awayRoster,
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

  const [selected, setSelected] = useState(new Set());
  const [zones, setZones] = useState({}); // { [pid]: 'D' | 'C' | 'S' }
  const [step, setStep] = useState('pick'); // 'pick' | 'zone' | 'win'
  const [saving, setSaving] = useState(false);

  const scoreA = points.filter(p => p.outcome === 'win_a').length;
  const scoreB = points.filter(p => p.outcome === 'win_b').length;
  const ptNum = points.length + 1;

  const allRoster = useMemo(() => [...homeRoster, ...awayRoster], [homeRoster, awayRoster]);

  const toggle = (pid) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const handleWin = async (winner) => {
    if (saving) return;
    setSaving(true);
    try {
      // Build assignments + synthetic player positions from zones.
      const pids = selected.size > 0
        ? Array.from(selected)
        : [...homeRoster.map(p => p.id), ...awayRoster.map(p => p.id)].slice(0, 5);
      const assignments = Array(5).fill(null);
      const players = Array(5).fill(null);
      pids.forEach((pid, i) => {
        if (i >= 5) return;
        assignments[i] = pid;
        const z = zones[pid];
        players[i] = z ? ZONE_POS[z] : null;
      });
      const outcome = winner === 'A' ? 'win_a' : 'win_b';
      if (onSavePoint) {
        await onSavePoint({ assignments, players, outcome });
      }
    } catch (e) {
      console.error('Quick log save failed:', e);
      alert('Save failed: ' + (e?.message || 'Unknown error'));
    } finally {
      setSaving(false);
      // Reset step for next point; keep selected + zones so lineup persists.
      setStep('pick');
    }
  };

  const history = useMemo(() =>
    [...points].reverse().map((pt, ri) => {
      const num = points.length - ri;
      const data = pt.homeData || pt.teamA || pt.awayData || pt.teamB || {};
      const names = (data.assignments || []).filter(Boolean).map(pid => {
        const p = allRoster.find(r => r.id === pid);
        return p?.nickname || p?.name?.split(' ').pop() || '?';
      });
      const isWin = (activeTeam === 'A' && pt.outcome === 'win_a') || (activeTeam === 'B' && pt.outcome === 'win_b');
      const isLoss = (activeTeam === 'A' && pt.outcome === 'win_b') || (activeTeam === 'B' && pt.outcome === 'win_a');
      return { num, names: names.join(', ') || '—', isWin, isLoss };
    }),
  [points, allRoster, activeTeam]);

  const myTeam = activeTeam === 'A' ? teamA : teamB;
  const oppTeam = activeTeam === 'A' ? teamB : teamA;
  const sideLabel = activeSide === 'home' ? teamA?.name
    : activeSide === 'away' ? teamB?.name
    : null;

  const homeColor = teamA?.color || '#22c55e';
  const awayColor = teamB?.color || '#ef4444';

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
        <span style={{ fontFamily: FONT, fontSize: 24, fontWeight: 800, color: '#334155' }}>:</span>
        <div style={{ fontFamily: FONT, fontSize: 36, fontWeight: 800, color: COLORS.text, minWidth: 40, textAlign: 'center' }}>{scoreB}</div>
        <div style={{ flex: 1, textAlign: 'center', fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{teamB?.name}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 16px 4px' }}>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
            {t('quicklog_point', ptNum)}
          </span>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: selected.size > 0 ? '#22c55e' : '#475569' }}>
            {t('quicklog_picked', selected.size)}
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
            {selected.size > 0 && (
              <div style={{ padding: '8px 16px 4px' }}>
                <div onClick={() => setStep('zone')} style={{
                  background: COLORS.accent, borderRadius: 10, minHeight: 48,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#000' }}>
                    {t('quicklog_assign')}
                  </span>
                </div>
                <div style={{ textAlign: 'center', padding: '6px 0 0' }}>
                  <span onClick={() => setStep('win')} style={{
                    fontFamily: FONT, fontSize: 11, color: '#334155',
                    cursor: 'pointer', textDecoration: 'underline',
                  }}>{t('quicklog_skip')}</span>
                </div>
              </div>
            )}
          </>
        )}

        {step === 'zone' && (
          <div style={{ padding: '0 16px' }}>
            <div style={{
              fontFamily: FONT, fontSize: 10, fontWeight: 600,
              letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569',
              padding: '12px 0 8px',
            }}>
              {t('quicklog_zones')}
            </div>
            {Array.from(selected).map(pid => {
              const isHome = homeRoster.some(r => r.id === pid);
              const p = [...homeRoster, ...awayRoster].find(r => r.id === pid);
              const squadColor = isHome ? (teamA?.color || '#22c55e') : (teamB?.color || '#ef4444');
              const zone = zones[pid] || null;
              return (
                <div key={pid} style={{
                  display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: squadColor, flexShrink: 0 }} />
                  <span style={{
                    fontFamily: FONT, fontSize: 13, fontWeight: 600,
                    color: COLORS.text, flex: 1, minWidth: 0,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {p?.nickname || p?.name || '?'}
                  </span>
                  {[
                    { key: 'D', label: t('zone_dorito'), color: '#fb923c' },
                    { key: 'C', label: t('zone_center'), color: '#94a3b8' },
                    { key: 'S', label: t('zone_snake'), color: '#22d3ee' },
                  ].map(z => (
                    <div key={z.key}
                      onClick={() => setZones(prev => ({ ...prev, [pid]: z.key }))}
                      style={{
                        flex: 1, minHeight: 44, borderRadius: 10,
                        border: `2px solid ${zone === z.key ? z.color : '#1e293b'}`,
                        background: zone === z.key ? `${z.color}20` : '#0f172a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                      }}>
                      <span style={{
                        fontFamily: FONT, fontSize: 12, fontWeight: 800,
                        color: zone === z.key ? z.color : '#475569',
                      }}>{z.label}</span>
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <div onClick={() => setStep('pick')} style={{
                flex: 1, minHeight: 44, borderRadius: 10,
                border: '1px solid #1e293b', background: '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#475569' }}>
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
            <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
              <span onClick={() => setStep('win')} style={{
                fontFamily: FONT, fontSize: 11, color: '#334155',
                cursor: 'pointer', textDecoration: 'underline',
              }}>{t('quicklog_skip')}</span>
            </div>
          </div>
        )}

        {step === 'win' && (
          <>
            {/* Outcome buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px 4px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>
                {t('quicklog_who_won')}
              </span>
              <span onClick={() => setStep(selected.size > 0 ? 'zone' : 'pick')} style={{
                fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#475569',
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
                <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: homeColor, opacity: 0.6 }}>{t('quicklog_tap')}</span>
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
                <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: awayColor, opacity: 0.6 }}>{t('quicklog_tap')}</span>
              </div>
            </div>
          </>
        )}

        {/* Advanced scouting link — always visible */}
        {onSwitchToScout && (
          <div style={{ padding: '0 16px 16px', display: 'flex', justifyContent: 'center' }}>
            <button type="button" onClick={onSwitchToScout}
              style={{
                background: 'transparent', border: 'none', color: COLORS.accent,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                cursor: 'pointer', padding: '10px 12px', minHeight: 44,
              }}>
              {t('quicklog_advanced')}
            </button>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <>
            <div style={{ padding: '8px 16px 6px' }}>
              <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569' }}>{t('quicklog_history')}</span>
            </div>
            <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {history.map(h => (
                <div key={h.num} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', background: '#0f172a',
                  border: '1px solid #1a2234', borderRadius: 8,
                }}>
                  <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#334155', minWidth: 24 }}>#{h.num}</span>
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: 12, fontWeight: 500, color: '#8b95a5', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{h.names}</span>
                  <span style={{
                    fontFamily: FONT, fontSize: 12, fontWeight: 700, minWidth: 20, textAlign: 'center',
                    color: h.isWin ? '#22c55e' : h.isLoss ? '#ef4444' : '#475569',
                  }}>{h.isWin ? 'W' : h.isLoss ? 'L' : '—'}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        ...(onSwitchToScout ? [{ label: 'Advanced scouting', onPress: () => { setMenuOpen(false); onSwitchToScout(); } }] : []),
        ...(onEndMatch ? [{ separator: true }, { label: 'End match (mark as FINAL)', onPress: () => { setMenuOpen(false); onEndMatch(); } }] : []),
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
        <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 500, color: '#475569', padding: '6px 2px' }}>
          No players in this squad
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {roster.map(p => {
            const on = selected.has(p.id);
            return (
              <div key={p.id} onClick={() => onToggle(p.id)} style={{
                height: 44, padding: '0 14px', borderRadius: 10,
                border: `1.5px solid ${on ? color + '90' : '#1e293b'}`,
                background: on ? `${color}15` : '#0f172a',
                display: 'flex', alignItems: 'center', gap: 5,
                cursor: 'pointer', transition: 'all .1s',
                WebkitTapHighlightColor: 'transparent',
              }}>
                <span style={{
                  fontFamily: FONT, fontSize: 13, fontWeight: 700,
                  color: on ? color : '#475569',
                }}>{p.nickname || p.name}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
