# CC Brief 3: Lineup Analytics — Pairs, Trios, Win Rates

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Depends on: CC_BRIEF_LAYOUT_SCOPE.md (layout scope filtering works).

---

## Overview

Add `computeLineupStats()` to `generateInsights.js` and surface results in `PlayerStatsPage.jsx` and a new `LineupStatsSection` component.

Goal: answer "which player combinations win most on this layout?"

---

## 1. Algorithm: `computeLineupStats()` in `generateInsights.js`

### Zone classification per slot

For each point, classify each ASSIGNED player by their break position:
- If `players[i]` exists: use Y coordinate vs disco/zeeker lines
- Fallback (no position data): slot 0,1 = dorito; slot 2 = center; slot 3,4 = snake

```js
function classifySlot(pos, slotIndex, field) {
  if (pos) {
    const disco = field?.discoLine ?? 0.30;
    const zeeker = field?.zeekerLine ?? 0.80;
    const dSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
    const isD = dSide === 'top' ? pos.y < disco : pos.y > (1 - disco);
    const isS = dSide === 'top' ? pos.y > zeeker : pos.y < (1 - zeeker);
    return isD ? 'dorito' : isS ? 'snake' : 'center';
  }
  // Fallback by slot index
  if (slotIndex <= 1) return 'dorito';
  if (slotIndex === 2) return 'center';
  return 'snake';
}
```

### Pair and trio key generation

```js
// For each point:
const zonePlayers = { dorito: [], snake: [], center: [] };
assignments.forEach((pid, i) => {
  if (!pid) return;
  const zone = classifySlot(players[i], i, field);
  zonePlayers[zone].push(pid);
});

// Pair key: sorted player IDs joined, with side prefix
// D pair: 'D|pid1|pid2'
// S pair: 'S|pid1|pid2'
const dPairKey = zonePlayers.dorito.length >= 2
  ? 'D|' + [...zonePlayers.dorito].sort().slice(0,2).join('|')
  : null;
const sPairKey = zonePlayers.snake.length >= 2
  ? 'S|' + [...zonePlayers.snake].sort().slice(0,2).join('|')
  : null;
const centerPid = zonePlayers.center[0] || null;

// Trio key: pair + center
const dTrioKey = dPairKey && centerPid ? dPairKey + '|C|' + centerPid : null;
const sTrioKey = sPairKey && centerPid ? sPairKey + '|C|' + centerPid : null;
```

### Accumulate stats

```js
const combos = {}; // key → { played, wins, pids: string[], side, type, centerPid }
// For each key (dPairKey, sPairKey, dTrioKey, sTrioKey):
//   combos[key].played++
//   if isWin: combos[key].wins++
```

### Return structure

```js
export function computeLineupStats(points, field, allPlayers) {
  // ... algorithm above ...
  return Object.entries(combos)
    .filter(([, c]) => c.played >= 3) // min sample
    .map(([key, c]) => ({
      key,
      type: c.type,   // 'pair' | 'trio'
      side: c.side,   // 'dorito' | 'snake'
      pids: c.pids,
      centerPid: c.centerPid || null,
      names: c.pids.map(pid => {
        const p = allPlayers?.find(pl => pl.id === pid);
        return p?.nickname || p?.name?.split(' ')[0] || '?';
      }),
      centerName: c.centerPid ? (() => {
        const p = allPlayers?.find(pl => pl.id === c.centerPid);
        return p?.nickname || p?.name?.split(' ')[0] || '?';
      })() : null,
      played: c.played,
      wins: c.wins,
      winRate: Math.round((c.wins / c.played) * 100),
    }))
    .sort((a, b) => b.winRate - a.winRate || b.played - a.played);
}
```

---

## 2. `PlayerStatsPage.jsx` — show lineup stats when in layout scope

Add to imports:
```js
import { computeLineupStats } from '../utils/generateInsights';
```

Compute when scope is layout or global (not match):
```js
const lineupStats = useMemo(() => {
  if (scopeParam === 'match') return null;
  return computeLineupStats(raw.playerPoints.map(pp => ({
    players: pp.teamData?.players || [],
    assignments: pp.teamData?.assignments || [],
    outcome: pp.isWin ? 'win' : 'loss',
  })), /* field= */ null, players);
}, [raw.playerPoints, players, scopeParam]);
```

Note: field=null means fallback classification by slot index. This is acceptable — exact zone classification requires position data which may not always be available in playerPoints.

### Display `LineupStatsSection` below player individual stats:

---

## 3. New component: `LineupStatsSection`

Create `src/components/LineupStatsSection.jsx`:

```jsx
/**
 * LineupStatsSection — pairs and trios win rate breakdown.
 * Shows per-side (Dorito / Snake) pair win rates, then trio win rates.
 */
export default function LineupStatsSection({ lineupStats }) {
  if (!lineupStats?.length) return null;

  const dPairs  = lineupStats.filter(l => l.type === 'pair'  && l.side === 'dorito');
  const sPairs  = lineupStats.filter(l => l.type === 'pair'  && l.side === 'snake');
  const dTrios  = lineupStats.filter(l => l.type === 'trio'  && l.side === 'dorito');
  const sTrios  = lineupStats.filter(l => l.type === 'trio'  && l.side === 'snake');

  const hasAny = dPairs.length || sPairs.length || dTrios.length || sTrios.length;
  if (!hasAny) return null;

  return (
    <>
      <SectionHeader>Lineup analytics</SectionHeader>
      {dPairs.length > 0 && <LineupGroup label="Dorito pairs" items={dPairs} color="#fb923c" />}
      {sPairs.length > 0 && <LineupGroup label="Snake pairs"  items={sPairs} color="#22d3ee" />}
      {dTrios.length > 0 && <LineupGroup label="Dorito trios" items={dTrios} color="#fb923c" showCenter />}
      {sTrios.length > 0 && <LineupGroup label="Snake trios"  items={sTrios} color="#22d3ee" showCenter />}
    </>
  );
}

function LineupGroup({ label, items, color, showCenter }) {
  return (
    <div style={{ margin: '0 16px 8px', background: '#0f172a',
      border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px 4px', borderBottom: '1px solid #111827' }}>
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 600,
          color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {label}
        </span>
      </div>
      {items.slice(0, 5).map((item, i) => {
        const barWidth = item.winRate;
        const wr = item.winRate;
        const wrColor = wr >= 60 ? '#22c55e' : wr >= 45 ? '#f59e0b' : '#ef4444';
        // Build display name
        const pairNames = item.names.join(' + ');
        const centerLabel = showCenter && item.centerName ? ` · ${item.centerName}` : '';

        return (
          <div key={item.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 44px',
            alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #111827' : 'none',
          }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: COLORS.text }}>
                {pairNames}
              </div>
              {centerLabel && (
                <div style={{ fontFamily: FONT, fontSize: 10, color: '#475569', marginTop: 1 }}>
                  + {item.centerName}
                </div>
              )}
              <div style={{ fontFamily: FONT, fontSize: 10, color: '#334155', marginTop: 1 }}>
                {item.played} pts
              </div>
            </div>
            <div style={{ height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${barWidth}%`,
                background: wrColor, borderRadius: 3 }} />
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700,
              color: wrColor, textAlign: 'right' }}>
              {wr}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

Use existing `FONT`, `COLORS`, `RADIUS` from theme — no new design tokens.
Use existing `SectionHeader` from ui.jsx if available, or inline it.

---

## 4. Wire into `PlayerStatsPage.jsx`

Import and use `LineupStatsSection` after the existing player performance stats:

```jsx
{lineupStats && lineupStats.length > 0 && (
  <LineupStatsSection lineupStats={lineupStats} />
)}
```

Only show when scope is `layout` or `global` (pairs need enough data).

---

## 5. Export from `generateInsights.js`

Make sure `computeLineupStats` is exported:
```js
export function computeLineupStats(points, field, allPlayers) { ... }
```

---

## Sample output (what coach sees)

```
LINEUP ANALYTICS

Dorito pairs          pts  win%
Jacek + Eryk           47   72%  ████████ 
Jacek + Kuba           12   58%  ██████
Eryk + Tomek            5   40%  ████

Dorito trios          pts  win%
Jacek + Eryk           28   82%  ████████
 + Kuba
Jacek + Eryk           19   53%  █████
 + Kacper

Snake pairs           pts  win%
Piotr + Damian         38   68%  ███████
...
```

---

## Notes on sample size

- `played >= 3` is minimum — show anyway with low sample warning if < 8
- If `played < 8`, dim the row (opacity 0.6) and add `(low n)` label
- This is intentional — with 30-50 total points, even 5 appearances for a trio is signal

---

## Build & commit

`npx vite build` must pass.
Commit: `feat: lineup analytics — pair/trio win rates per layout`
