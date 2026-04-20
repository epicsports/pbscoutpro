# CC Brief: Data Confidence Banner — Per-Metric Quality Pills

## File to change
`src/pages/ScoutedTeamPage.jsx` — only this file.

## What to change
Replace the data confidence banner logic inside the `{heatmapPoints.length > 0 && (() => { ... })()}` IIFE (renders at the top of the scrollable area, just below PageHeader).

## Current behavior
Computes `avgPct = Math.round((c.breakPct + c.shotPct + c.assignPct) / 3)` and uses one number to pick between 3 banner states (green ≥80, amber ≥50, red <50). Single number shown in banner text.

## New behavior
Evaluate each metric independently with its own thresholds. Render colored pills for all 4 metrics inside every banner state. Banner level driven by breaks (most critical metric).

---

## Implementation

### 1. Metric levels
Use a helper defined inside the IIFE:
```js
const metricLevel = (pct, goodAt, warnAt) =>
  pct >= goodAt ? 'good' : pct >= warnAt ? 'warn' : 'bad';

const breakLevel  = metricLevel(c.breakPct,    85, 60); // most critical
const shotLevel   = metricLevel(c.shotPct,     75, 40);
const killLevel   = c.totalOppElims > 0 ? metricLevel(c.killAttrPct, 60, 30) : null; // optional
const assignLevel = metricLevel(c.assignPct,   75, 40);

const levelColor = { good: '#22c55e', warn: '#f59e0b', bad: '#ef4444' };
```

### 2. MetricPill component (inline inside IIFE)
Small pill: label (9px, `#64748b`) + percentage (10px, level color).
```js
const MetricPill = ({ label, pct, level }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 3,
    background: `${levelColor[level]}18`,
    border: `1px solid ${levelColor[level]}30`,
    borderRadius: 5, padding: '1px 6px',
  }}>
    <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600, color: '#64748b' }}>{label}</span>
    <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: levelColor[level] }}>{pct}%</span>
  </span>
);
```

### 3. Pills row
```js
const pills = (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
    <MetricPill label="Breaks"  pct={c.breakPct}    level={breakLevel} />
    <MetricPill label="Shots"   pct={c.shotPct}     level={shotLevel} />
    {killLevel && <MetricPill label="Kills" pct={c.killAttrPct} level={killLevel} />}
    <MetricPill label="Players" pct={c.assignPct}   level={assignLevel} />
  </div>
);
```

### 4. Overall confidence level
```js
const secondaryBadCount  = [shotLevel, killLevel, assignLevel].filter(l => l != null && l === 'bad').length;
const secondaryWarnCount = [shotLevel, killLevel, assignLevel].filter(l => l != null && l !== 'good').length;

let confidence;
if (breakLevel === 'good' && secondaryWarnCount <= 1) confidence = 'high';
else if (breakLevel === 'bad' || (breakLevel === 'warn' && secondaryBadCount >= 2)) confidence = 'low';
else confidence = 'medium';
```

### 5. Weak metric text (for medium/low banners)
```js
const weakLabels = [
  breakLevel  !== 'good' && 'breaks',
  shotLevel   !== 'good' && 'shots',
  killLevel   && killLevel !== 'good' && 'kills',
  assignLevel !== 'good' && 'player assignments',
].filter(Boolean);
const weakText = weakLabels.length ? `Incomplete: ${weakLabels.join(', ')}.` : '';
```

### 6. Banner states
Keep same background/border colors as before. Add `{pills}` below the text in all 3 states.

**high** (green dot, subtle):
```
Based on {X} points · {N} match(es){scoutSuffix}
[pills]
```

**medium** (amber box):
```
{X} points · some gaps — insights may be incomplete. {weakText}{scoutSuffix}
[pills]
```

**low** (red box):
```
Low data quality — {X} points. {weakText} Scout more to improve accuracy.{scoutSuffix}
[pills]
```

---

## What NOT to change
- `computeCompleteness()` function — leave untouched
- `CompletenessBar` component — leave untouched (unused, harmless)
- Everything else in the file

## Commit message
```
feat: replace avgPct banner with per-metric quality pills

Banner now evaluates 4 metrics independently (Breaks/Shots/Kills/Players)
with separate thresholds instead of a single averaged percentage.
Confidence level driven primarily by break quality (most critical).
Weak metrics named explicitly in banner text.
```
