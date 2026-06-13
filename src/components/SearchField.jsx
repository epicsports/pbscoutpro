import React from 'react';
import { Input } from './ui';
import { COLORS, FONT, FONT_SIZE, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * SearchField — shared search input with a clear (✕) affordance. Wraps the
 * `ui.jsx` Input; `onChange(value)` (string). Part of the search/filter kit.
 */
export default function SearchField({ value = '', onChange, placeholder, style }) {
  const { t } = useLanguage();
  const effectivePlaceholder = placeholder !== undefined ? placeholder : t('search');
  return (
    <div style={{ position: 'relative', ...style }}>
      <Input value={value} onChange={onChange} placeholder={effectivePlaceholder} style={value ? { paddingRight: 34 } : undefined} />
      {value ? (
        <div
          role="button" aria-label={t('search_clear')}
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
