import React from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';
import { Icons } from './ui';

export default function PageHeader({ back, title, badges, subtitle, right }) {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.sm,
      padding: `10px ${SPACE.lg}px`, borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
    }}>
      {back && (
        <div onClick={() => typeof back.to === 'function' ? back.to() : navigate(back.to)}
          style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs, cursor: 'pointer',
            color: COLORS.accent, flexShrink: 0 }}>
          <Icons.Back />
          {back.label && (
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>
              {back.label}
            </span>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {badges}
        </div>
        {subtitle && (
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
