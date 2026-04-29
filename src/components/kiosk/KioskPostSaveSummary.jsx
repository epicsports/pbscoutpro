import React from 'react';
import { useKiosk } from '../../contexts/KioskContext';
import { useKioskCompatible } from '../../utils/kioskViewport';
import { useTrainings, useMatchups, useTrainingPoints, usePlayers } from '../../hooks/useFirestore';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { SQUAD_MAP } from '../../utils/squads';
import { readNormalizedEliminations } from '../../utils/deathTaxonomy';
import { matchScore } from '../../utils/helpers';

/**
 * KioskPostSaveSummary — § 55.1 post-save decision screen, full overlay.
 *
 * Mockup v3 Screen 1: scoreboard (Ranger 0:1 Ring) + elim list ("Co
 * zarejestrowałeś" with 2-3 rows: each elim player + reason summary,
 * plus aggregate "N graczy dotrwało" row) + stats grid (Czas / Eliminacje)
 * + 2 CTAs:
 *   PRIMARY 88px "Przekaż graczom" — amber gradient, glow, sub-label
 *     "N graczy R1 uzupełni swoje dane". Tap → kiosk.enterLobby().
 *   SECONDARY 56px "Następny punkt →" — surface bg. Tap → kiosk.exitPostSave().
 *
 * Original § 55.1 spec was a simple toast/banner with 2 buttons. Mockup v3
 * upgraded to this full-screen summary (E5 default chosen 2026-04-29).
 *
 * Reads:
 *   - point.eliminations* via deathTaxonomy.readNormalizedEliminations →
 *     per-player {eliminated, deathStage, deathReason, eliminationTime, ...}
 *   - point.outcome → maps win_a/win_b to scoreboard winner/loser styling
 *   - point.duration → "Czas" stat
 */
export default function KioskPostSaveSummary() {
  const kiosk = useKiosk();
  const compatible = useKioskCompatible();
  const { t } = useLanguage();
  const { trainings } = useTrainings();
  const { matchups } = useMatchups(kiosk?.postSaveOpen ? kiosk.trainingId : null);
  const { points: matchupPoints } = useTrainingPoints(
    kiosk?.postSaveOpen ? kiosk.trainingId : null,
    kiosk?.postSaveOpen ? kiosk.matchupId : null,
  );
  const { players } = usePlayers();

  if (!kiosk || !kiosk.postSaveOpen || !compatible) return null;

  const training = trainings.find(t => t.id === kiosk.trainingId);
  const matchup = matchups.find(m => m.id === kiosk.matchupId);
  const point = matchupPoints.find(p => p.id === kiosk.pointId);

  if (!training || !matchup || !point) {
    return <Shell onBack={kiosk.exitPostSave} title={t('kiosk_postsave_loading')} />;
  }

  const sideKey = kiosk.scoutingSide === 'away' ? 'awayData' : 'homeData';
  const sideData = point[sideKey] || {};
  const sideMeta = SQUAD_MAP[kiosk.scoutingSide === 'away' ? matchup.awaySquad : matchup.homeSquad]
    || { name: kiosk.scoutingSide === 'away' ? matchup.awaySquad : matchup.homeSquad, color: COLORS.textMuted };
  const otherMeta = SQUAD_MAP[kiosk.scoutingSide === 'away' ? matchup.homeSquad : matchup.awaySquad]
    || { name: kiosk.scoutingSide === 'away' ? matchup.homeSquad : matchup.awaySquad, color: COLORS.textMuted };

  // Hotfix #3 (2026-04-29): scoreboard shows MATCHUP-level running total,
  // not per-point binary. matchScore(matchupPoints) is canonical helper from
  // utils/helpers.js — same source of truth as MatchPage detail header,
  // ScoutTabContent / CoachTabContent card lists, and end-of-match merged
  // match.scoreA/B. {a, b} = wins per side derived from outcome enum.
  const score = matchScore(matchupPoints) || { a: 0, b: 0 };
  const myScore = kiosk.scoutingSide === 'away' ? score.b : score.a;
  const otherScore = kiosk.scoutingSide === 'away' ? score.a : score.b;
  // myWon (this point) still useful for color tinting current-point winner
  const myWon =
    (kiosk.scoutingSide === 'home' && point.outcome === 'win_a') ||
    (kiosk.scoutingSide === 'away' && point.outcome === 'win_b');

  // Hotfix #3 (2026-04-29): point document doesn't carry a `pointNumber`
  // field — derive from sorted matchupPoints position. order field exists
  // (set by addTrainingPoint), so sort by it. +1 for 1-indexed display
  // matching QuickLogView pattern (helpers.js + QuickLogView L102-104).
  const sortedPoints = [...matchupPoints].sort((a, b) => (a.order || 0) - (b.order || 0));
  const pointNumber = sortedPoints.findIndex(p => p.id === point.id) + 1;

  // Hotfix #3 (2026-04-29): IDs live in `assignments[]`, not `players[]`.
  // pointFactory.baseSide schema:
  //   players: Array(5).fill(null)        — POSITION objects {x,y}
  //   assignments: Array(5).fill(null)    — PLAYER IDS
  // QuickLogView Live Tracking save sets assignments=[id,...], players=[null,...]
  // (no positions captured). § 55.2 spec text "point.homeData.players[]" was
  // wrong about which field holds IDs — corrected here.
  const elims = readNormalizedEliminations(sideData);
  const playerIds = (sideData.assignments || []).filter(Boolean);
  const elimRows = elims
    .map((e, i) => (e ? { idx: i, ...e, playerId: playerIds[i] } : null))
    .filter(Boolean);
  const aliveCount = playerIds.length - elimRows.length;
  const elimCount = elimRows.length;
  const duration = point.duration || 0;
  const durFmt = `${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}`;

  const stageLabelKey = (stage) => {
    if (!stage) return null;
    return `death_stage_${stage}`;
  };
  const stageShort = (stage) => {
    if (!stage) return '?';
    if (stage === 'break') return t('kiosk_stage_short_break');
    if (stage === 'inplay') return t('kiosk_stage_short_inplay');
    if (stage === 'endgame') return t('kiosk_stage_short_endgame');
    return stage;
  };

  return (
    <Shell
      onBack={kiosk.exitPostSave}
      title={t('kiosk_postsave_header_title', pointNumber || '?')}
      subtitle={t('kiosk_postsave_header_sub', training.date || '', sideMeta.name)}
      saved
    >
      <div style={{
        flex: 1, padding: SPACE.xl,
        display: 'flex', gap: SPACE.xl, minHeight: 0,
      }}>
        {/* Left panel: scoreboard + elim list */}
        <div style={{
          flex: 1.3, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0,
        }}>
          {/* Scoreboard */}
          <div style={{
            background: '#111827',
            borderRadius: 14, padding: '18px 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: sideMeta.color }} />
              <span style={{
                fontFamily: FONT, fontSize: 17, fontWeight: 700,
                color: myWon ? COLORS.success : COLORS.textMuted,
              }}>{sideMeta.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{
                fontFamily: FONT, fontSize: 38, fontWeight: 900,
                letterSpacing: -1, minWidth: 36, textAlign: 'center',
                color: myWon ? COLORS.success : COLORS.textDim,
              }}>{myScore}</span>
              <span style={{
                fontFamily: FONT, fontSize: 28, color: COLORS.borderLight, margin: '0 12px',
              }}>:</span>
              <span style={{
                fontFamily: FONT, fontSize: 38, fontWeight: 900,
                letterSpacing: -1, minWidth: 36, textAlign: 'center',
                color: myWon ? COLORS.textDim : COLORS.success,
              }}>{otherScore}</span>
            </div>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end',
            }}>
              <span style={{
                fontFamily: FONT, fontSize: 17, fontWeight: 700,
                color: myWon ? COLORS.textMuted : COLORS.success,
              }}>{otherMeta.name}</span>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: otherMeta.color }} />
            </div>
          </div>

          {/* Elim list — "Co zarejestrowałeś" */}
          <div style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 14,
            overflow: 'hidden',
            flex: 1, minHeight: 0,
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '10px 14px',
              background: '#111827',
              borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{
                fontFamily: FONT, fontSize: 12, fontWeight: 700,
                color: COLORS.textMuted, letterSpacing: 0.5, textTransform: 'uppercase',
              }}>{t('kiosk_postsave_elim_title')}</span>
              <span style={{
                fontFamily: FONT, fontSize: 11, color: COLORS.textDim,
              }}>{t('kiosk_postsave_elim_hint')}</span>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {elimRows.map(row => {
                const player = players.find(pp => pp.id === row.playerId);
                const nick = player?.nickname || player?.name || `#${(player?.number) || row.idx}`;
                return (
                  <div key={row.playerId || row.idx} style={{
                    padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: `1px solid ${COLORS.border}`,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.12)',
                      color: COLORS.danger,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, flexShrink: 0,
                      fontFamily: FONT,
                    }}>✕</div>
                    <div style={{ flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600, color: COLORS.text }}>
                      {nick}
                      <span style={{
                        fontFamily: FONT, fontSize: 9, color: COLORS.danger, fontWeight: 700, marginLeft: 6,
                        letterSpacing: 0.4, textTransform: 'uppercase',
                      }}>{(sideMeta.name || '').toUpperCase()}</span>
                    </div>
                    <span style={{
                      fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted,
                    }}>{stageShort(row.deathStage)}</span>
                  </div>
                );
              })}
              {aliveCount > 0 && (
                <div style={{
                  padding: '10px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  borderBottom: `1px solid ${COLORS.border}`,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'rgba(34, 197, 94, 0.12)',
                    color: COLORS.success,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, flexShrink: 0,
                    fontFamily: FONT,
                  }}>✓</div>
                  <div style={{
                    flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.textMuted,
                  }}>{t('kiosk_postsave_alive_summary', aliveCount, sideMeta.name)}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right panel: stats + CTA stack */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: SPACE.md, minHeight: 0,
        }}>
          {/* Stats grid */}
          <div style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            padding: 14,
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: FONT, fontSize: 9, color: COLORS.textDim, fontWeight: 700,
                letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
              }}>{t('kiosk_postsave_stat_time')}</div>
              <div style={{
                fontFamily: FONT, fontSize: 22, fontWeight: 800, color: COLORS.text,
              }}>{durFmt}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: FONT, fontSize: 9, color: COLORS.textDim, fontWeight: 700,
                letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4,
              }}>{t('kiosk_postsave_stat_elim')}</div>
              <div style={{
                fontFamily: FONT, fontSize: 22, fontWeight: 800, color: COLORS.text,
              }}>{elimCount}</div>
            </div>
          </div>

          {/* CTA stack — primary 88px gloves-friendly, secondary 56px */}
          <div style={{
            marginTop: 'auto',
            display: 'flex', flexDirection: 'column', gap: SPACE.md,
          }}>
            <button
              onClick={() => kiosk.enterLobby()}
              style={{
                height: 88, borderRadius: 16,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#0a0e17', border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245, 158, 11, 0.25)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '0 16px',
                fontFamily: FONT,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{t('kiosk_postsave_cta_primary')}</span>
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7 }}>
                {t('kiosk_postsave_cta_primary_sub', playerIds.length, sideMeta.name)}
              </span>
            </button>
            <button
              onClick={() => kiosk.exitPostSave()}
              style={{
                height: 56, borderRadius: 12,
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontFamily: FONT, fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}>
              {t('kiosk_postsave_cta_secondary')}
            </button>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ onBack, title, subtitle, saved, children }) {
  const { t } = useLanguage();
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: COLORS.bg,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        background: '#0d1117',
        borderBottom: `1px solid ${COLORS.border}`,
        padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
        minHeight: 56, flexShrink: 0,
      }}>
        <div onClick={onBack} style={{
          color: COLORS.accent, fontSize: 22, fontWeight: 500,
          cursor: 'pointer', padding: '4px 8px',
          minWidth: 44, minHeight: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          WebkitTapHighlightColor: 'transparent',
        }}>‹</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT, fontSize: 15, fontWeight: 600,
            color: COLORS.text, lineHeight: 1.2,
          }}>{title}</div>
          {subtitle && <div style={{
            fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2,
          }}>{subtitle}</div>}
        </div>
        {saved && (
          <div style={{
            fontFamily: FONT, fontSize: 14, fontWeight: 800,
            color: COLORS.success,
            background: 'rgba(34, 197, 94, 0.1)',
            border: `1px solid rgba(34, 197, 94, 0.25)`,
            padding: '6px 10px', borderRadius: 8,
          }}>{t('kiosk_postsave_saved_pill')}</div>
        )}
      </div>
      {children}
    </div>
  );
}
