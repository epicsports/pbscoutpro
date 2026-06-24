import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useUserWorkspaces } from '../../hooks/useUserWorkspaces';
import { useLanguage } from '../../hooks/useLanguage';
import { useDevice } from '../../hooks/useDevice';
import { MoreItem } from '../tabs/MoreShell';
import { Modal } from '../ui';
import RdIcon from '../RdIcon';
import WorkspaceLogo from './WorkspaceLogo';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ELEV, TRACKING } from '../../utils/theme';

/**
 * WorkspaceSwitcher — § 92 OPERATION switcher (replaces the static "Mój
 * workspace" row). Lists the workspaces the current user belongs to
 * (useUserWorkspaces) and switches active context on tap (code-free via
 * useWorkspace.setActiveWorkspace → persists + reloads).
 *
 * Single-workspace users see the row as before (no picker, no chevron).
 * Distinct from the § 91 super_admin MANAGEMENT surface (/admin/workspaces),
 * which acts on workspaces WITHOUT switching context.
 *
 * `variant`:
 *   - 'item' (default) — the settings MoreItem row, always rendered.
 *   - 'drawer' (§C nav drawer, mockup-7) — a dashed "Zmień workspace" row
 *     rendered ONLY when the user has >1 membership; same picker modal.
 */
export default function WorkspaceSwitcher({ variant = 'item' }) {
  const { t } = useLanguage();
  const { workspace, setActiveWorkspace } = useWorkspace();
  const { workspaces, loading } = useUserWorkspaces();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const isWide = useDevice().width >= 720;

  const activeSlug = workspace?.slug;
  // Show only workspaces where the user has an ASSIGNED role (super_admin
  // granted access). Pending self-joins carry `userRoles[uid] = []` — they
  // appear in useUserWorkspaces (`[] != null`) but the user has no real access
  // yet (they'd land on the pending-approval screen), so filter them out. The
  // active workspace is always kept (the user is operating in it).
  const all = Array.isArray(workspaces) ? workspaces : [];
  const list = all.filter(w =>
    w.slug === activeSlug || (Array.isArray(w.role) && w.role.length > 0)
  );
  const multi = list.length > 1;

  async function handlePick(slug) {
    if (switching) return;
    if (slug === activeSlug) { setOpen(false); return; }
    setSwitching(true);
    const ok = await setActiveWorkspace(slug); // reloads the page on success
    if (!ok) { setSwitching(false); setOpen(false); } // only reached on failure
  }

  // §C drawer variant — render NOTHING for single-membership users (the rare
  // power-user affordance only appears when there is something to switch to).
  if (variant === 'drawer' && !multi) return null;

  return (
    <>
      {variant === 'drawer' ? (
        <div
          role="button"
          data-testid="ws-switcher-row"
          onClick={() => setOpen(true)}
          style={{
            margin: '10px 12px 2px',
            border: `1px dashed ${ELEV.hairlineStrong}`,
            borderRadius: RADIUS.md,
            padding: '0 12px', minHeight: TOUCH.minTarget,
            display: 'flex', alignItems: 'center', gap: 8,
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, letterSpacing: TRACKING.label,
            color: COLORS.textDim, cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent', flexShrink: 0,
          }}
        >
          <RdIcon name="swap" size={14} /> {t('change_workspace')}
          <span style={{
            marginLeft: 'auto', fontFamily: FONT, fontSize: FONT_SIZE.xxs,
            fontWeight: 600, color: COLORS.textMuted,
          }}>{t('drawer_available', list.length)}</span>
        </div>
      ) : (
        <MoreItem
          icon={workspace?.logoUrl ? <WorkspaceLogo url={workspace.logoUrl} size={20} /> : <RdIcon name="home" size={18} />}
          label={t('my_workspace')}
          sub={activeSlug || undefined}
          onClick={multi ? () => setOpen(true) : undefined}
        />
      )}

      {multi && (
        <Modal
          open={open}
          onClose={() => !switching && setOpen(false)}
        >
          {/* Phone = bottom-sheet grabber affordance (the shared Modal is a sheet on
              phone / centered modal on wide — so this is the responsive split). */}
          {!isWide && <div style={{ width: 38, height: 4, borderRadius: 2, background: ELEV.hairlineStrong, margin: '2px auto 14px' }} />}
          {/* Premium header — swap-tile + title + count (replaces the plain Modal title). */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: SPACE.md }}>
            <span style={{ width: 38, height: 38, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${COLORS.accent}12`, border: `1px solid ${COLORS.accent}40`, color: COLORS.accent }}><RdIcon name="swap" size={18} /></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xl, fontWeight: 800, color: COLORS.text, letterSpacing: TRACKING.tight }}>{t('change_workspace')}</div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600, color: COLORS.textMuted, marginTop: 1 }}>{t('drawer_available', list.length)}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
            {loading && list.length === 0 && (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: SPACE.sm }}>
                …
              </div>
            )}
            {list.map(w => {
              const isActive = w.slug === activeSlug;
              return (
                <button
                  key={w.slug}
                  type="button"
                  onClick={() => handlePick(w.slug)}
                  disabled={switching}
                  style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.md,
                    width: '100%', textAlign: 'left',
                    minHeight: TOUCH.targetLg,
                    padding: `${SPACE.sm}px ${SPACE.md}px`,
                    borderRadius: RADIUS.md,
                    // § 27: active = subtle background change (not a border swap).
                    background: isActive ? `${COLORS.accent}15` : ELEV.surface,
                    border: `1px solid ${isActive ? `${COLORS.accent}55` : ELEV.hairline}`,
                    boxShadow: ELEV.shadow1,
                    cursor: switching ? 'default' : 'pointer',
                    opacity: switching && !isActive ? 0.6 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'opacity .15s',
                  }}
                >
                  <WorkspaceLogo url={w.logoUrl} size={28} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
                      color: COLORS.text,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{w.name || w.slug}</div>
                    <div style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
                      marginTop: 2,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{w.slug}</div>
                  </div>
                  {isActive && (
                    <span style={{ color: COLORS.accent, flexShrink: 0, display: 'flex' }}>
                      <RdIcon name="check" size={17} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </Modal>
      )}
    </>
  );
}
