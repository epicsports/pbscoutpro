import React from 'react';
import { COLORS, ELEV, FONT, TRACKING } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import WorkspaceLogo from './settings/WorkspaceLogo';
import WorkspaceSwitcher from './settings/WorkspaceSwitcher';
import RdIcon from './RdIcon';

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
    isAdmin ? t('role_admin') : null,
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
          background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(2px)',
          zIndex: 80, animation: 'rdFade .18s ease',
        }}
      />
      <div
        data-testid="nav-drawer"
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0,
          width: 'min(392px, 87vw)', zIndex: 81,
          background: ELEV.bg,
          borderRight: `1px solid ${ELEV.hairlineStrong}`,
          boxShadow: ELEV.shadow3,
          display: 'flex', flexDirection: 'column', minHeight: 0,
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        {/* Premium identity header — workspace crest + name + roles + close */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 13,
          padding: '18px 12px 15px 16px',
          borderBottom: `1px solid ${ELEV.hairline}`,
          flexShrink: 0,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, flexShrink: 0, overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: ELEV.innerTop,
          }}>
            <WorkspaceLogo url={workspace?.logoUrl} size={46} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: 19, fontWeight: 800,
              color: COLORS.text, letterSpacing: TRACKING.tight,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{workspace?.name || workspace?.slug || ''}</div>
            {roleLine && (
              <div style={{
                fontFamily: FONT, fontSize: 12, color: COLORS.textDim,
                marginTop: 2,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{roleLine}</div>
            )}
          </div>
          <div
            role="button"
            aria-label={t('close')}
            data-testid="nav-drawer-close"
            onClick={onClose}
            style={{
              width: 44, height: 44, minWidth: 44, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            {/* 34px visual tile inside a 44px hit area (§27) */}
            <span style={{
              width: 34, height: 34, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: COLORS.textDim, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
            }}><RdIcon name="close" size={16} /></span>
          </div>
        </div>

        {/* Workspace switcher — renders ONLY at >1 membership (§92 reuse) */}
        <WorkspaceSwitcher variant="drawer" />

        {/* Settings content BY REFERENCE (MoreTabContent / TrainingMoreTab) */}
        <div className="rd-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          {children}
        </div>

        {/* Brand footer — non-interactive, muted (never amber per §27) */}
        <div style={{
          padding: '13px 18px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderTop: `1px solid ${ELEV.hairline}`,
          flexShrink: 0,
        }}>
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800, color: COLORS.textMuted, letterSpacing: '.5px' }}>{`${t('app_name')} · v${APP_VERSION}`}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: COLORS.textMuted }} />
          <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, letterSpacing: '1px' }}>{t('brand_tagline')}</span>
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
      aria-label={t('nav_menu_label')}
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
