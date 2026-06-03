import React from 'react';
import { Input } from './ui';
import { COLORS, FONT, FONT_SIZE, TOUCH } from '../utils/theme';

/**
 * SearchField — shared search input with a clear (✕) affordance. Wraps the
 * `ui.jsx` Input; `onChange(value)` (string). Part of the search/filter kit.
 */
export default function SearchField({ value = '', onChange, placeholder = 'Search…', style }) {
  return (
    <div style={{ position: 'relative', ...style }}>
      <Input value={value} onChange={onChange} placeholder={placeholder} style={value ? { paddingRight: 34 } : undefined} />
      {value ? (
        <div
          role="button" aria-label="Clear search"
          onClick={() => onChange('')}
          style={{
            position: 'absolute', right: 2, top: 0, bottom: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: TOUCH.minTarget, cursor: 'pointer',
            color: COLORS.textMuted, fontFamily: FONT, fontSize: FONT_SIZE.sm,
          }}>✕</div>
      ) : null}
    </div>
  );
}
