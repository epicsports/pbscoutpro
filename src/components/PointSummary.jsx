import { COLORS, FONT } from '../utils/theme';

/**
 * PointSummary — live scout verification bar during point scouting.
 * Shows what's been captured for the active draft so scouts can
 * sanity-check their work before saving.
 *
 * Design spec: DESIGN_DECISIONS.md § 23 (Point Scouting, Point summary).
 *
 * Props:
 *   pointNumber: number (1-indexed) shown in the title
 *   draft: active draft object (draftA or draftB) — reads players, bumps,
 *          shots, quickShots, elim
 */
export default function PointSummary({ pointNumber, draft }) {
  if (!draft) return null;

  const players = draft.players || [];
  const shotsByPlayer = draft.shots || [];
  const quickShots = draft.quickShots || [];
  const elim = draft.elim || [];
  const bumps = draft.bumps || [];

  const placed = players.filter(Boolean).length;
  const preciseShots = shotsByPlayer.reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
  const zoneCounts = { dorito: 0, center: 0, snake: 0 };
  quickShots.forEach(zones => {
    (zones || []).forEach(z => {
      if (zoneCounts[z] != null) zoneCounts[z] += 1;
    });
  });
  const eliminated = elim.filter(Boolean).length;
  const bumped = bumps.filter(Boolean).length;

  const chip = (dotColor, label) => (
    <div key={label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '4px 9px', borderRadius: 8,
      background: COLORS.surfaceDark, border: `1px solid ${COLORS.surfaceLight}`,
      fontFamily: FONT, fontSize: 10, fontWeight: 500, color: COLORS.textSubtle,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
      {label}
    </div>
  );

  const chips = [];
  chips.push(chip(COLORS.text, `${placed}/5 placed`));
  if (zoneCounts.dorito > 0) chips.push(chip(COLORS.accent, `${zoneCounts.dorito} dorito`));
  if (zoneCounts.center > 0) chips.push(chip(COLORS.textSubtle, `${zoneCounts.center} center`));
  if (zoneCounts.snake > 0) chips.push(chip(COLORS.zeeker, `${zoneCounts.snake} snake`));
  if (preciseShots > 0) chips.push(chip(COLORS.danger, `${preciseShots} shots`));
  if (eliminated > 0) chips.push(chip(COLORS.danger, `${eliminated} elim`));
  if (bumped > 0) chips.push(chip(COLORS.textSubtle, `${bumped} bump`));

  return (
    <div style={{
      background: COLORS.surfaceBar,
      borderTop: `1px solid ${COLORS.surfaceLight}`,
      padding: '10px 14px',
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 10, fontWeight: 600,
        color: COLORS.borderLight, textTransform: 'uppercase', letterSpacing: '.6px',
        marginBottom: 6,
      }}>
        Point #{pointNumber} summary
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
        {chips}
      </div>
    </div>
  );
}
