import React from 'react';
import { COLORS, FONT, FONT_SIZE } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import WorkspaceLogo from './settings/WorkspaceLogo';
import WorkspaceSwitcher from './settings/WorkspaceSwitcher';

// Build-time define (vite.config.js) — package.json version. Guarded so the
// component also renders in tooling contexts where the define is absent.
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

/**
 * NavDrawer — §C nav restructure (mockup-7, gated 2026-06-11/12).
 *
 * Left overlay drawer + scrim, same transient-overlay rules as the §116 rail
 * overlay (CanvasRailLayout): tap-scrim closes, explicit × close affordance,
 * NEVER auto-opens (state lives in the page; only the ReadsBallButton opens it).
 *
 * Contents:
 *   - workspace identity header (logo + name + role line)
 *   - workspace switcher row — rendered ONLY at >1 membership
 *     (WorkspaceSwitcher variant="drawer", §92 switcher reused)
 *   - `children` = today's settings content BY REFERENCE (MoreTabContent /
 *     TrainingMoreTab) — chrome restructure, NOT content redesign
 *   - footer: reads · v{appVersion} · PAINTBALL INTELLIGENCE (brand line,
 *     muted — §27: no amber on non-interactive elements)
 *
 * z-index: scrim 80 / panel 81 — below Modal (90/91) so modals opened FROM
 * drawer rows (workspace picker, confirm dialogs) stack above the drawer.
 */
export default function NavDrawer({ open, onClose, children }) {
  const { t } = useLanguage();
  const { workspace, roles, isAdmin } = useWorkspace();
  if (!open) return null;

  const roleLine = [
    isAdmin ? (t('role_admin') || 'Admin') : null,
    ...(roles || []).filter(r => r !== 'admin').map(r => t(`role_${r}`) || r),
  ].filter(Boolean).join(' · ');

  return (
    <>
      {/* Scrim — tap closes (§116 transient-overlay convention). */}
      <div
        data-testid="nav-drawer-scrim"
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(5,8,15,.45)', backdropFilter: 'blur(1px)',
          zIndex: 80,
        }}
      />
      <div
        data-testid="nav-drawer"
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0,
          width: 'min(300px, 84vw)', zIndex: 81,
          background: COLORS.surfaceBar,
          borderRight: `1px solid ${COLORS.border}`,
          boxShadow: '8px 0 40px rgba(0,0,0,.5)',
          display: 'flex', flexDirection: 'column', minHeight: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Workspace identity header + explicit close affordance */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 6px 10px 14px',
          borderBottom: `1px solid ${COLORS.surfaceLight}`,
          flexShrink: 0,
        }}>
          <WorkspaceLogo url={workspace?.logoUrl} size={38} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800,
              color: COLORS.text, letterSpacing: '-.1px',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{workspace?.name || workspace?.slug || ''}</div>
            {roleLine && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted,
                marginTop: 1,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{roleLine}</div>
            )}
          </div>
          <div
            role="button"
            aria-label={t('close') || 'Close'}
            data-testid="nav-drawer-close"
            onClick={onClose}
            style={{
              minWidth: 44, minHeight: 44,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.textMuted, fontSize: 20, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', flexShrink: 0,
            }}
          >×</div>
        </div>

        {/* Workspace switcher — renders ONLY at >1 membership (§92 reuse) */}
        <WorkspaceSwitcher variant="drawer" />

        {/* Settings content BY REFERENCE (MoreTabContent / TrainingMoreTab) */}
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {children}
        </div>

        {/* Brand footer — non-interactive, muted (never amber per §27) */}
        <div style={{
          padding: '12px 14px',
          fontFamily: FONT, fontSize: 9, fontWeight: 600,
          color: COLORS.textMuted, letterSpacing: '.5px',
          borderTop: `1px solid ${COLORS.surfaceLight}`,
          flexShrink: 0,
        }}>
          {`reads · v${APP_VERSION} · PAINTBALL INTELLIGENCE`}
        </div>
      </div>
    </>
  );
}

/**
 * ReadsBallButton — the drawer trigger (§C1). FLAT small rendition of the
 * "reads ball" per the brand rule: amber circle + 2px horizontal seam in the
 * bar's bg color (mockup-7 inline SVG reproduced with COLORS tokens). Amber
 * is allowed here because the element is tappable (§27 color discipline).
 * Hit area 44×44; the visual chip is 34px inside it.
 */
export function ReadsBallButton({ onClick }) {
  const { t } = useLanguage();
  return (
    <div
      role="button"
      aria-label={t('nav_menu_label') || 'Menu'}
      data-testid="nav-ball"
      onClick={onClick}
      style={{
        width: 44, height: 44, minWidth: 44, minHeight: 44,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        flexShrink: 0,
      }}
    >
      <span style={{
        width: 34, height: 34, borderRadius: '50%',
        background: COLORS.surface,
        border: `1px solid ${COLORS.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
          <circle cx="12" cy="12" r="8" fill={COLORS.accent} />
          <rect x="2" y="11" width="20" height="2" fill={COLORS.surfaceBar} />
        </svg>
      </span>
    </div>
  );
}
