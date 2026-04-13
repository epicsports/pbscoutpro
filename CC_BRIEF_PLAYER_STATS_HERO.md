# CC_BRIEF_PLAYER_STATS_HERO.md
## Player Stats Page + HERO Rank System

**Priority:** MEDIUM — coach analytics + player identification
**Context:** Coaches need per-player win rates and performance stats at multiple granularity levels. HERO rank identifies key players visually on canvas/heatmap.
**Design specs:** DESIGN_DECISIONS.md sections 24, 25

---

## Part 1: HERO data model

### Player doc (global hero)
Add `hero` boolean field to player documents:
```javascript
// In dataService.js
export async function setPlayerHero(playerId, isHero) {
  await updatePlayer(playerId, { hero: isHero });
}
```

### Scouted team doc (tournament hero)
Add `heroPlayers` array to scouted team documents:
```javascript
export async function setTournamentHero(tournamentId, scoutedTeamId, heroPlayers) {
  await updateScoutedTeam(tournamentId, scoutedTeamId, { heroPlayers });
}
```

### No migration needed — missing `hero` field = false, missing `heroPlayers` = [].

---

## Part 2: HERO toggle UI

### On TeamDetailPage — global hero
In player list/card, add HERO toggle button:
- Reads `player.hero` from Firestore
- Tap toggles and saves immediately
- Active: amber star + "HERO" text, amber tinted bg
- Inactive: gray star, transparent bg
- Style: see DESIGN_DECISIONS.md section 25

### On ScoutedTeamPage — tournament hero
In roster section, add HERO toggle per player:
- Reads from `scoutedTeam.heroPlayers` array
- Tap adds/removes playerId from array, saves to Firestore
- Same visual style as global toggle

---

## Part 3: HERO visual indicators

### FieldCanvas.jsx — scouting canvas
In `drawPlayers.js`, when rendering a player circle:
```javascript
// Check if this player is HERO
const playerId = assignments[playerIndex];
const isHero = heroPlayerIds.includes(playerId);
if (isHero) {
  // Draw amber glow ring behind player circle
  ctx.beginPath();
  ctx.arc(px, py, radius + 4, 0, Math.PI * 2);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2.5;
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 12;
  ctx.stroke();
  ctx.shadowBlur = 0;
}
```

**Props:** Pass `heroPlayerIds` array to FieldCanvas:
- In MatchPage: derive from scouted team's `heroPlayers` + player's global `hero`
- Merge both: `const heroIds = [...(scoutedTeam?.heroPlayers || []), ...players.filter(p => p.hero).map(p => p.id)]`

### HeatmapCanvas.jsx — heatmap dots
When rendering heatmap position dots, if the assigned player is HERO:
```javascript
if (isHero) {
  ctx.beginPath();
  ctx.arc(px, py, dotRadius + 3, 0, Math.PI * 2);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 1.5;
  ctx.globalAlpha = 0.6;
  ctx.stroke();
  ctx.globalAlpha = 1;
}
```

### RosterGrid.jsx — roster pills
Before player name, if HERO:
```jsx
{isHero && <span style={{
  width: 6, height: 6, borderRadius: '50%',
  background: COLORS.accent, flexShrink: 0
}} />}
```

---

## Part 4: Player Stats Page

### New file: `src/pages/PlayerStatsPage.jsx`

### Route: Add to App.jsx
```javascript
<Route path="/player/:playerId/stats" element={<PlayerStatsPage />} />
```

### URL params
- `:playerId` — player ID
- `?scope=tournament&tid=xxx` — scope filter
- `?scope=global` — all data
- `?scope=match&tid=xxx&mid=yyy` — single match

### Data fetching
```javascript
// Fetch all points where this player was assigned
// 1. Find all scouted teams containing this player in roster
// 2. For each, fetch matches + points
// 3. Filter points where player appears in assignments array
// 4. Compute stats from filtered points
```

### New utility: `src/utils/playerStats.js`
```javascript
/**
 * Compute player performance stats from points data.
 * @param {Array} points - points with team data where player was assigned
 * @param {string} playerId - the player's ID
 * @param {Object} field - layout field info (for zone classification)
 * @returns {Object} stats
 */
export function computePlayerStats(points, playerId, field) {
  let played = 0, wins = 0, survived = 0, gotKill = 0;
  const positionCounts = {}; // { 'Snake 1': 5, 'Dorito 1': 3, ... }

  points.forEach(pt => {
    const { teamData, isWin, playerIndex } = pt;
    if (playerIndex === -1) return;
    played++;
    if (isWin) wins++;

    // Survival: not eliminated
    if (!teamData.eliminations?.[playerIndex]) survived++;

    // Kill: player has elimination flag set
    // (simplified — full kill attribution is future feature)

    // Position classification
    const pos = teamData.players?.[playerIndex];
    if (pos) {
      const zone = classifyPosition(pos, field);
      positionCounts[zone] = (positionCounts[zone] || 0) + 1;
    }
  });

  return {
    played,
    winRate: played > 0 ? Math.round((wins / played) * 100) : null,
    survivalRate: played > 0 ? Math.round((survived / played) * 100) : null,
    killRate: played > 0 ? Math.round((gotKill / played) * 100) : null,
    positions: Object.entries(positionCounts)
      .map(([zone, count]) => ({ zone, count, pct: Math.round((count / played) * 100) }))
      .sort((a, b) => b.count - a.count),
  };
}

/**
 * Classify a position into zone name based on field lines.
 * Uses disco/zeeker Y values from layout.
 */
function classifyPosition(pos, field) {
  const disco = field?.discoLine ?? 0.3;
  const zeeker = field?.zeekerLine ?? 0.7;
  const doritoSide = field?.doritoSide ?? 'top';

  const isDorito = doritoSide === 'top' ? pos.y < disco : pos.y > zeeker;
  const isSnake = doritoSide === 'top' ? pos.y > zeeker : pos.y < disco;

  // Depth classification
  const depth = pos.x > 0.5 ? 'deep' : pos.x > 0.3 ? 'mid' : 'base';

  if (isDorito) {
    if (depth === 'deep') return 'Dorito 50';
    if (depth === 'mid') return 'Dorito 1';
    return 'Dorito base';
  }
  if (isSnake) {
    if (depth === 'deep') return 'Snake 50';
    if (depth === 'mid') return 'Snake 1';
    return 'Snake base';
  }
  return 'Center';
}
```

### Page layout
See DESIGN_DECISIONS.md section 24 for exact styling.

Components (top to bottom):
1. Profile header with avatar + HERO badge
2. Scope pills (filter)
3. 2×2 metric cards
4. Position breakdown bars
5. Match history list

### Scope filtering
```javascript
const scope = searchParams.get('scope') || 'tournament';
const tid = searchParams.get('tid');
const mid = searchParams.get('mid');

// Filter points based on scope
const filteredPoints = useMemo(() => {
  if (scope === 'match') return allPoints.filter(p => p.matchId === mid);
  if (scope === 'tournament') return allPoints.filter(p => p.tournamentId === tid);
  return allPoints; // global
}, [scope, tid, mid, allPoints]);
```

### Navigation entries
Add "View stats" to player interactions:
- TeamDetailPage: player card tap → navigate to stats with scope=global
- ScoutedTeamPage roster: player pill long-press or ⋮ → "View stats" with scope=tournament
- Match heatmap (future): tap player dot → stats with scope=match

---

## Part 5: Connect to existing pages

### ScoutedTeamPage — roster pills
Add HERO dot indicator to roster pills.
Add navigation: tap roster pill → PlayerStatsPage.

### TeamDetailPage — player cards
Add HERO toggle button on each player card.
Add navigation: tap player → PlayerStatsPage.

### MatchPage — pass heroPlayerIds to FieldCanvas
```javascript
const heroIds = useMemo(() => {
  const scoutedTeam = scouted.find(s => s.id === (scoutingSide === 'home' ? match?.teamA : match?.teamB));
  const tournamentHeroes = scoutedTeam?.heroPlayers || [];
  const globalHeroes = players.filter(p => p.hero).map(p => p.id);
  return [...new Set([...tournamentHeroes, ...globalHeroes])];
}, [scouted, match, scoutingSide, players]);

<FieldCanvas heroPlayerIds={heroIds} ... />
```

---

## Verification checklist

### HERO system
- [ ] Global hero toggle works on TeamDetailPage
- [ ] Tournament hero toggle works on ScoutedTeamPage
- [ ] Hero persists in Firestore (player.hero / scoutedTeam.heroPlayers)
- [ ] Amber glow ring renders on scouting canvas for HERO players
- [ ] Amber ring renders on heatmap dots for HERO positions
- [ ] Amber dot renders before name in roster pills
- [ ] HERO badge renders on player profile header

### Player Stats Page
- [ ] Route /player/:playerId/stats works
- [ ] Scope pills filter correctly (tournament/all/global)
- [ ] Win rate computed correctly from assignments + outcomes
- [ ] Break survival computed from eliminations
- [ ] Position breakdown shows correct zone percentages
- [ ] Match history lists all matches with W/L and points played
- [ ] Navigation from ScoutedTeamPage roster → stats works
- [ ] Navigation from TeamDetailPage → stats works

### General
- [ ] Build passes: `npx vite build 2>&1 | tail -3`
- [ ] Precommit passes: `npm run precommit`
