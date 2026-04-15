import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../utils/theme';
import LangToggle from './LangToggle';

/**
 * AppShell — bottom-tab navigation wrapper (DESIGN_DECISIONS § 31).
 *
 * Layout: [context bar] [content (scroll)] [tab bar]
 * Tabs: Scout | Coach | More
 */
const TABS = [
  { key: 'scout', icon: '🎯', label: 'Scout' },
  { key: 'coach', icon: '📊', label: 'Coach' },
  { key: 'more',  icon: '⚙',  label: 'More'  },
];

export default function AppShell({
  children,
  activeTab,
  onTabChange,
  tournament,
  tournamentSubtitle,
  onChangeTournament,
}) {
  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: COLORS.bg,
    }}>
      {/* Context bar — visible only when a tournament is selected */}
      {tournament && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '10px 16px',
          background: '#0d1117',
          borderBottom: '1px solid #1a2234',
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: tournament.status === 'live' ? '#22c55e' : COLORS.textMuted,
            boxShadow: tournament.status === 'live' ? '0 0 6px #22c55e80' : 'none',
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT,
              fontSize: 14,
              fontWeight: 600,
              color: COLORS.text,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-.1px',
            }}>
              {tournament.name}
              {tournament._isTraining && (
                <span style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 700,
                  color: COLORS.textMuted, background: COLORS.surfaceLight,
                  border: `1px solid ${COLORS.border}`, borderRadius: 3,
                  padding: '1px 5px', marginLeft: 4,
                  verticalAlign: 'middle', letterSpacing: '.3px',
                }}>TRENING</span>
              )}
              {tournament.isTest && (
                <span style={{
                  fontFamily: FONT, fontSize: 10, fontWeight: 700,
                  color: '#64748b', background: '#1e293b',
                  border: '1px solid #334155', borderRadius: 3,
                  padding: '1px 4px', marginLeft: 4,
                  verticalAlign: 'middle',
                }}>TEST</span>
              )}
            </div>
            {tournamentSubtitle && (
              <div style={{
                fontFamily: FONT,
                fontSize: 10,
                color: '#475569',
                marginTop: 1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {tournamentSubtitle}
              </div>
            )}
          </div>
          <LangToggle />
          <div onClick={onChangeTournament}
            style={{
              fontFamily: FONT,
              fontSize: 11,
              fontWeight: 600,
              color: COLORS.accent,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${COLORS.accent}20`,
              background: `${COLORS.accent}08`,
              cursor: 'pointer',
              minHeight: 44,
              display: 'flex',
              alignItems: 'center',
              WebkitTapHighlightColor: 'transparent',
            }}>
            Change
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {children}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex',
        background: '#0d1117',
        borderTop: '1px solid #1a2234',
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {TABS.map(tab => {
          const active = activeTab === tab.key;
          return (
            <div key={tab.key}
              onClick={() => onTabChange(tab.key)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                padding: '10px 0 8px',
                cursor: 'pointer',
                minHeight: 48,
                WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{ fontSize: 18, opacity: active ? 1 : 0.4 }}>
                {tab.icon}
              </span>
              <span style={{
                fontFamily: FONT,
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '.3px',
                color: active ? COLORS.accent : '#475569',
              }}>
                {tab.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
