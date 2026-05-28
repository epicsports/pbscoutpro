import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { useUserWorkspaces } from '../../hooks/useUserWorkspaces';
import { useLanguage } from '../../hooks/useLanguage';
import { MoreItem } from '../tabs/MoreShell';
import { Modal } from '../ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';

/**
 * WorkspaceSwitcher — § 92 OPERATION switcher (replaces the static "Mój
 * workspace" row). Lists the workspaces the current user belongs to
 * (useUserWorkspaces) and switches active context on tap (code-free via
 * useWorkspace.setActiveWorkspace → persists + reloads).
 *
 * Single-workspace users see the row as before (no picker, no chevron).
 * Distinct from the § 91 super_admin MANAGEMENT surface (/admin/workspaces),
 * which acts on workspaces WITHOUT switching context.
 */
export default function WorkspaceSwitcher() {
  const { t } = useLanguage();
  const { workspace, setActiveWorkspace } = useWorkspace();
  const { workspaces, loading } = useUserWorkspaces();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const activeSlug = workspace?.slug;
  const list = Array.isArray(workspaces) ? workspaces : [];
  const multi = list.length > 1;

  async function handlePick(slug) {
    if (switching) return;
    if (slug === activeSlug) { setOpen(false); return; }
    setSwitching(true);
    const ok = await setActiveWorkspace(slug); // reloads the page on success
    if (!ok) { setSwitching(false); setOpen(false); } // only reached on failure
  }

  return (
    <>
      <MoreItem
        icon="🏠"
        label={t('my_workspace')}
        sub={activeSlug || undefined}
        onClick={multi ? () => setOpen(true) : undefined}
      />

      {multi && (
        <Modal
          open={open}
          onClose={() => !switching && setOpen(false)}
          title={t('change_workspace')}
        >
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
                    background: isActive ? `${COLORS.accent}15` : COLORS.surfaceLight,
                    border: `1px solid ${isActive ? `${COLORS.accent}55` : COLORS.border}`,
                    cursor: switching ? 'default' : 'pointer',
                    opacity: switching && !isActive ? 0.6 : 1,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'opacity .15s',
                  }}
                >
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
                    <span style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 800,
                      color: COLORS.accent, flexShrink: 0,
                    }}>✓</span>
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
