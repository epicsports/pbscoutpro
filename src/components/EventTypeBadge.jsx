import React from 'react';
import { Trophy, Swords, Dumbbell } from 'lucide-react';
import { COLORS, FONT, RADIUS } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

/**
 * EventTypeBadge — distinguishes an event's TYPE (Turniej / Sparing / Trening)
 * in mixed cross-type lists (PPT cross-type picker, §63). ADDITIVE — it sits
 * alongside the status badge (live/upcoming/ended), it does not replace it.
 *
 * Neutral chip (surface + border + textDim, never amber — §27 color discipline,
 * this is non-interactive identity) distinguished by a Lucide icon + the §63
 * Polish label. No emoji.
 *
 * @param {'tournament'|'sparing'|'training'} type
 */
// label resolved at RENDER via t() (keys reused: tournament / sparing /
// tab_training) — not at module-eval, so it follows the active language.
const TYPES = {
  tournament: { Icon: Trophy, labelKey: 'tournament' },
  sparing: { Icon: Swords, labelKey: 'sparing' },
  training: { Icon: Dumbbell, labelKey: 'tab_training' },
};

export default function EventTypeBadge({ type }) {
  const { t } = useLanguage();
  const { Icon, labelKey } = TYPES[type] || TYPES.tournament;
  const label = t(labelKey);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: RADIUS.sm,
      background: COLORS.surface, color: COLORS.textDim,
      border: `1px solid ${COLORS.border}`,
      fontFamily: FONT, fontSize: 10, fontWeight: 800,
      letterSpacing: 0.4, textTransform: 'uppercase', flexShrink: 0,
    }}>
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </span>
  );
}
