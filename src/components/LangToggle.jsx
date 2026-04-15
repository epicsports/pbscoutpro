import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FONT } from '../utils/theme';

export default function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {['pl', 'en'].map(l => (
        <div key={l} onClick={() => setLang(l)} style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          color: lang === l ? '#f59e0b' : '#475569',
          padding: '4px 7px', borderRadius: 6, cursor: 'pointer',
          background: lang === l ? '#f59e0b15' : 'transparent',
          border: `1px solid ${lang === l ? '#f59e0b40' : 'transparent'}`,
          minHeight: 28, display: 'flex', alignItems: 'center',
          WebkitTapHighlightColor: 'transparent',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {l === 'pl' ? '🇵🇱 PL' : '🇬🇧 EN'}
        </div>
      ))}
    </div>
  );
}
