// Premium UX state — network-error panel with retry (ported from
// prototype/states.jsx, app tokens). Danger-toned icon tile, RdIcon line-icons,
// no emoji. (The app-root offline banner lives in App.jsx, §27 red/green.)
import React from 'react';
import { COLORS, FONT, ELEV, TRACKING, TNUM } from '../../utils/theme';
import RdIcon from '../RdIcon';
import { useLanguage } from '../../hooks/useLanguage';

// Full danger panel with a Retry CTA — for a data/network error branch.
export function NetworkErrorState({ onRetry, retrying = false, title, message }) {
  const { t } = useLanguage();
  const tone = COLORS.danger;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '44px 28px', minHeight: 280, fontFamily: FONT, animation: 'rdFade .3s ease-out',
    }}>
      <div style={{ width: 62, height: 62, borderRadius: 20, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${tone}14`, border: `1px solid ${tone}33`, color: tone, boxShadow: ELEV.innerTop }}>
        <RdIcon name="wifioff" size={28} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 800, color: tone, letterSpacing: TRACKING.label, textTransform: 'uppercase', marginTop: 18 }}>{t('neterror_eyebrow') || 'Błąd sieci'}</div>
      <div style={{ fontSize: 19, fontWeight: 800, color: COLORS.text, marginTop: 7, letterSpacing: '-.2px' }}>{title || t('neterror_title') || 'Nie udało się załadować'}</div>
      <div style={{ fontSize: 14, color: COLORS.textDim, marginTop: 8, maxWidth: 320, lineHeight: 1.5 }}>{message || t('neterror_msg') || 'Sprawdź połączenie z internetem i spróbuj ponownie.'}</div>
      {onRetry && (
        <div className="rd-press" onClick={retrying ? undefined : onRetry} style={{
          display: 'flex', alignItems: 'center', gap: 8, marginTop: 22, cursor: retrying ? 'default' : 'pointer', minHeight: 44,
          padding: '11px 20px', borderRadius: 11, background: COLORS.accent, color: '#1a1206',
          fontSize: 14, fontWeight: 800, letterSpacing: '.2px', boxShadow: `0 4px 14px ${COLORS.accent}3d`, opacity: retrying ? 0.75 : 1, ...TNUM,
        }}>
          <RdIcon name="refresh" size={15} />{retrying ? (t('neterror_retrying') || 'Łączenie…') : (t('neterror_retry') || 'Ponów próbę')}
        </div>
      )}
    </div>
  );
}
