import React from 'react';
import { Select } from './ui';
import { COLORS, FONT, FONT_SIZE, SPACE } from '../utils/theme';

/**
 * FilterBar — row of dropdown filters in the canonical order the caller passes
 * (Liga → Dywizja → extras). Each filter: { key, label, value, onChange,
 * options:[{value,label}], allLabel? }. Reuses the `ui.jsx` Select
 * (`onChange(value)`). Part of the search/filter kit; consumed by
 * SearchFilterPanel.
 */
export default function FilterBar({ filters = [], style }) {
  if (!filters.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm, ...style }}>
      {filters.map(f => (
        <div key={f.key} style={{ flex: '1 1 120px', minWidth: 110 }}>
          {f.label ? (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
              color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.4,
              marginBottom: 3,
            }}>{f.label}</div>
          ) : null}
          <Select value={f.value ?? ''} onChange={f.onChange} style={{ width: '100%' }}>
            <option value="">{f.allLabel || 'All'}</option>
            {(f.options || []).map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      ))}
    </div>
  );
}
