import React from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { ROLES } from '../../utils/roleUtils';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Multi-select chip row for workspace roles. Tap toggles a role in the
 * `selected` set. Controlled component — parent owns state.
 *
 * @param {string[]} selected - array subset of ROLES
 * @param {(next: string[]) => void} onChange
 * @param {string | null} disabledRole - optional chip to render non-interactive
 *   (used for admin self-protection: admin cannot demote themselves from
 *   'admin' until they transfer; chip shows tooltip and ignores taps)
 * @param {string | null} disabledReason - tooltip string when `disabledRole`
 *   chip is tapped
 * @param {boolean} readOnly - render chips as visual-only pills (no toggles)
 */
export default function RoleChips({ selected = [], onChange, disabledRole = null, disabledReason = null, readOnly = false }) {
  const { t } = useLanguage();

  function toggle(role) {
    if (readOnly) return;
    if (role === disabledRole) return;
    const has = selected.includes(role);
    const next = has ? selected.filter(r => r !== role) : [...selected, role];
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
      {ROLES.map(role => {
        const isSelected = selected.includes(role);
        const isDisabled = role === disabledRole;
        const label = t(`role_${role}`) || role;
        return (
          <button
            key={role}
            onClick={() => toggle(role)}
            disabled={readOnly || isDisabled}
            title={isDisabled && disabledReason ? disabledReason : undefined}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              minHeight: TOUCH.minTarget,
              padding: `${SPACE.xs}px ${SPACE.md}px`,
              borderRadius: RADIUS.full,
              background: isSelected ? `${COLORS.accent}20` : COLORS.surfaceLight,
              border: `1px solid ${isSelected ? COLORS.accent : COLORS.border}`,
              color: isSelected ? COLORS.accent : COLORS.textDim,
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
              cursor: (readOnly || isDisabled) ? 'default' : 'pointer',
              opacity: isDisabled ? 0.45 : 1,
              transition: 'all 0.15s',
            }}
          >{label}</button>
        );
      })}
    </div>
  );
}
