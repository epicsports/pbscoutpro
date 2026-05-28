import React, { useEffect, useState } from 'react';
import { COLORS, RADIUS } from '../../utils/theme';

/**
 * WorkspaceLogo — small workspace badge (§ 93). Renders the external logo
 * image when `url` is set and loads cleanly; otherwise a neutral fallback
 * (the 🏠 glyph by default). Never shows a broken-image icon — onError flips
 * to the fallback. Pure presentational, reusable across the switcher row,
 * the picker, and the context bar.
 */
export default function WorkspaceLogo({ url, size = 24, fallback = '🏠', radius = RADIUS.sm }) {
  const [errored, setErrored] = useState(false);
  // Reset the error flag if the URL changes (same instance, new workspace).
  useEffect(() => { setErrored(false); }, [url]);

  const showImg = !!url && !errored;
  return (
    <span style={{
      width: size, height: size, flexShrink: 0,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: radius, overflow: 'hidden',
      background: showImg ? COLORS.surfaceLight : 'transparent',
      fontSize: Math.round(size * 0.7), lineHeight: 1,
    }}>
      {showImg ? (
        <img
          src={url}
          alt=""
          onError={() => setErrored(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <span style={{ opacity: 0.85 }}>{fallback}</span>
      )}
    </span>
  );
}
