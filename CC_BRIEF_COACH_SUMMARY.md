# CC_BRIEF_COACH_SUMMARY.md
## Coach Team Summary — ScoutedTeamPage Redesign

**Priority:** HIGH — core coach experience
**Context:** Coaches need stats-first view, not heatmap-first. "Trener wchodzi na drużynę i widzi. Nie szuka, nie klika." Current ScoutedTeamPage shows heatmap on top. New design: insights → stats → heatmap → players.
**Design specs:** DESIGN_DECISIONS.md section 28

---

## Part 1: Page restructure

### Replace current ScoutedTeamPage layout

Current order: heatmap → coaching stats → matches list
New order: sample badge → insights → break tendencies → performance → heatmap (mini) → players

### Keep existing data fetching
`fetchPointsForMatches` + `computeCoachingStats` already work. Add new computations on top.

---

## Part 2: Insight generation engine

### New utility: `src/utils/generateInsights.js`

```javascript
/**
 * Generate text insights from coaching stats + point data.
 * Returns array of { type: 'aggressive'|'pattern'|'strength'|'weakness', text, detail }
 */
export function generateInsights(stats, points, field, roster) {
  const insights = [];
  
  // 1. Aggressive fifty
  const fiftyPct = computeFiftyReached(points);
  if (fiftyPct > 60) {
    insights.push({
      type: 'aggressive',
      text: `Aggressive ${fiftyPct > 70 ? 'dorito' : 'snake'} 50 — reached in ${fiftyPct}% of points`,
      detail: 'League avg ~35%.',
    });
  }
  
  // 2. Break runner count
  const avgRunners = computeAvgRunners(points);
  if (avgRunners < 2.5) {
    insights.push({
      type: 'pattern',
      text: `Only ${Math.round(avgRunners)} players break on average — ${5 - Math.round(avgRunners)} delay`,
      detail: 'Most teams send 3.',
    });
  }
  
  // 3. Position-specific kill rate
  const positionKills = computePositionKills(points, field);
  positionKills.forEach(pk => {
    if (pk.killRate > 50) {
      insights.push({
        type: 'strength',
        text: `${pk.killRate}% kill rate from ${pk.position} — exceptional`,
        detail: pk.topPlayer ? `#${pk.topPlayer.number} drives ${pk.topPlayerPct}% of kills.` : '',
      });
    }
  });
  
  // 4. Side vulnerability
  const sideVuln = computeSideVulnerability(points, stats);
  if (sideVuln) {
    insights.push({
      type: 'weakness',
      text: `${sideVuln.pct}% of losses come from ${sideVuln.side} push`,
      detail: `Win rate drops to ${sideVuln.winRateAgainst}% vs ${sideVuln.side} push teams.`,
    });
  }
  
  return insights.slice(0, 5); // max 5 insights
}
```

### Insight type → icon color mapping
```javascript
const INSIGHT_COLORS = {
  aggressive: '#fb923c',  // orange
  pattern: '#22d3ee',     // cyan
  strength: '#22c55e',    // green
  weakness: '#ef4444',    // red
};
```

### Helper functions needed
- `computeFiftyReached(points)` — % of points where any player position x > 0.5
- `computeAvgRunners(points)` — average number of players with runner flag per point
- `computePositionKills(points, field)` — group eliminations by zone, find high kill rate positions
- `computeSideVulnerability(points, stats)` — correlate losses with opponent break side

These build on existing `computeCoachingStats` but add new cross-point analysis.

---

## Part 3: Player summary cards

### Compute player-level stats

```javascript
/**
 * Compute per-player stats for the roster.
 * @returns Array of { playerId, name, number, position, ptsPlayed, kills, winRate }
 */
export function computePlayerSummaries(points, roster, players) {
  return roster.map(playerId => {
    const player = players.find(p => p.id === playerId);
    if (!player) return null;
    
    let played = 0, wins = 0, kills = 0;
    let positionCounts = {};
    
    points.forEach(pt => {
      const idx = (pt.assignments || []).indexOf(playerId);
      if (idx === -1) return;
      played++;
      if (pt.outcome === 'win_a' || pt.outcome === 'win_b') {
        // determine if this team won
        // ... (check if point's team matches)
        wins++;
      }
      // Count kills from eliminations on opponent side
      // Count positions for preferred position
    });
    
    const winRate = played > 0 ? Math.round((wins / played) * 100) : null;
    const preferredPos = Object.entries(positionCounts)
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    
    return { playerId, name: player.nickname || player.name, number: player.number,
             position: preferredPos, ptsPlayed: played, kills, winRate };
  }).filter(Boolean).sort((a, b) => (b.winRate ?? 0) - (a.winRate ?? 0));
}
```

### Player card rendering
See DESIGN_DECISIONS.md section 28 for exact styling.
Single row: avatar (32px, playerColor) + name + subtitle + win rate.
Tap → navigate to `/player/${playerId}/stats?scope=tournament&tid=${tid}`

---

## Part 4: Heatmap as mini preview

### Shrink existing HeatmapCanvas
- Height: 110px (was full-bleed)
- Border-radius: 12px
- Background: `#0a1410`, border `#162016`
- Show all points, both teams
- "Tap to expand heatmap" label at bottom
- Tap → expand to full-screen heatmap (existing view, maybe modal or new route)

---

## Part 5: Stat rows

### Reuse existing `computeCoachingStats` data for break tendencies
```jsx
{stats.dorito != null && (
  <StatRow label="Dorito side" value={stats.dorito} color="#fb923c" />
)}
{stats.snake != null && (
  <StatRow label="Snake side" value={stats.snake} color="#22d3ee" />
)}
// etc.
```

### StatRow component (inline, not new file)
```jsx
const StatRow = ({ label, value, color }) => (
  <div style={{
    margin: '0 16px 3px', background: COLORS.surfaceDark,
    border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
  }}>
    <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.textDim, flex: 1 }}>{label}</span>
    <div style={{ width: 56, height: 4, borderRadius: 2, background: '#111827', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 2 }} />
    </div>
    <span style={{ fontSize: FONT_SIZE.sm, fontWeight: 700, color, minWidth: 34, textAlign: 'right' }}>{value}%</span>
  </div>
);
```

---

## Verification checklist

- [ ] Sample badge shows correct point count + match count
- [ ] Insights generate correctly from data (at least 2-3 insights with real data)
- [ ] Insight icons colored by type (orange/cyan/green/red)
- [ ] Break tendencies show dorito/snake/center %
- [ ] Performance shows win rate, break survival, fifty reached
- [ ] Mini heatmap renders at 110px with both teams
- [ ] Tap heatmap expands to full view
- [ ] Player cards show: avatar, name, position, pts, kills, win rate
- [ ] Player cards sorted by win rate desc
- [ ] HERO players have amber glow + dot
- [ ] Tap player card navigates to Player Stats Page
- [ ] Page scrolls smoothly with all sections
- [ ] Build passes + precommit passes
