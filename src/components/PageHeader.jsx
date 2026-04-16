import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE } from '../utils/theme';
import LangToggle from './LangToggle';

/**
 * PageHeader — unified header for ALL screens.
 * Anatomy: [back 28×28] [title + subtitle, flex:1] [badges] [action 28×28]
 *
 * Props:
 * - title: string
 * - subtitle: string (uppercase, small)
 * - titleColor: override title color (for FINAL states)
 * - subtitleColor: override subtitle color
 * - back: { to: string|function } or null (absent on tab roots)
 * - badges: React node for inline badges
 * - action: React node for right action (⋮ dots, edit icon)
 * - children: optional second row (e.g. side pill on scouting editor)
 */
export default function PageHeader({ back, title, subtitle, titleColor, subtitleColor, badges, action, children }) {
  const navigate = useNavigate();
  return (
    <div style={{
      background: COLORS.surface,
      borderBottom: `1px solid ${COLORS.border}`,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '12px 16px',
      }}>
        {/* Back button — 28×28 chevron */}
        {back && (
          <div
            onClick={() => typeof back.to === 'function' ? back.to() : navigate(back.to)}
            style={{
              color: COLORS.accent,
              width: 44, height: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: -4, cursor: 'pointer',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}

        {/* Title block — flex:1 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: FONT, fontWeight: 800, fontSize: FONT_SIZE.lg,
            color: titleColor || COLORS.text,
            letterSpacing: '-0.03em',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{title}</div>
          {subtitle && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xxs,
              color: subtitleColor || COLORS.textMuted,
              fontWeight: 600, letterSpacing: '0.5px', marginTop: 1,
            }}>{subtitle}</div>
          )}
        </div>

        {/* Badges — flex-shrink:0 */}
        {badges && (
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
            {badges}
          </div>
        )}

        {/* Right cluster: language toggle + action button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <LangToggle />
          {action}
        </div>
      </div>

      {/* Optional second row (e.g. side pill) */}
      {children}
    </div>
  );
}
