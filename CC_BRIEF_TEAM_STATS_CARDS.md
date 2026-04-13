# CC_BRIEF_TEAM_STATS_CARDS.md
## Tournament Team Cards — Coach Stats

**Priority:** HIGH — quick win from user feedback
**Context:** Coaches need stats at a glance on tournament page. "Tylko wchodzi na drużynę i widzi. Nie szuka, nie klika." Currently team cards show only name + player count.

---

## Part 1: Compute team stats from matches

### New utility: `src/utils/teamStats.js`

```javascript
/**
 * Compute W-L record and point differential for each scouted team
 * from match data (already loaded, zero additional queries).
 *
 * @param {Array} matches - all matches in tournament
 * @param {Array} scouted - scouted team entries
 * @returns {Object} { [scoutedTeamId]: { wins, losses, ptsFor, ptsAgainst, played, winRate } }
 */
export function computeTeamRecords(matches, scouted) {
  const records = {};
  scouted.forEach(st => {
    records[st.id] = { wins: 0, losses: 0, ptsFor: 0, ptsAgainst: 0, played: 0 };
  });

  matches.forEach(m => {
    const sA = m.scoreA || 0;
    const sB = m.scoreB || 0;
    // Only count matches with at least one score (not empty scheduled matches)
    if (sA === 0 && sB === 0) return;
    
    if (records[m.teamA] !== undefined) {
      records[m.teamA].played++;
      records[m.teamA].ptsFor += sA;
      records[m.teamA].ptsAgainst += sB;
      if (sA > sB) records[m.teamA].wins++;
      else if (sB > sA) records[m.teamA].losses++;
    }
    if (records[m.teamB] !== undefined) {
      records[m.teamB].played++;
      records[m.teamB].ptsFor += sB;
      records[m.teamB].ptsAgainst += sA;
      if (sB > sA) records[m.teamB].wins++;
      else if (sA > sB) records[m.teamB].losses++;
    }
  });

  // Add computed fields
  Object.values(records).forEach(r => {
    r.diff = r.ptsFor - r.ptsAgainst;
    r.winRate = r.played > 0 ? Math.round((r.wins / r.played) * 100) : null;
  });

  return records;
}
```

No new Firestore queries needed — uses `matches` already loaded by `useMatches(tournamentId)`.

---

## Part 2: Scouted points count

### Lightweight point count per team

Add to `dataService.js`:
```javascript
/**
 * Fetch point counts for all matches in a tournament, grouped by scouted team.
 * Returns { [scoutedTeamId]: numberOfScoutedPoints }
 */
export async function fetchScoutedPointCounts(tournamentId, matches, scouted) {
  // Batch fetch all points for tournament matches
  const matchIds = matches.filter(m => (m.scoreA || 0) > 0 || (m.scoreB || 0) > 0).map(m => m.id);
  if (!matchIds.length) return {};
  
  const allPoints = await fetchPointsForMatches(tournamentId, matchIds);
  const counts = {};
  scouted.forEach(st => { counts[st.id] = 0; });
  
  allPoints.forEach(pt => {
    const match = matches.find(m => m.id === pt.matchId);
    if (!match) return;
    // Count point for both teams in the match
    const homeData = pt.homeData || pt.teamA || {};
    const awayData = pt.awayData || pt.teamB || {};
    if (homeData.players?.some(Boolean) && counts[match.teamA] !== undefined) counts[match.teamA]++;
    if (awayData.players?.some(Boolean) && counts[match.teamB] !== undefined) counts[match.teamB]++;
  });
  
  return counts;
}
```

### In TournamentPage, call once:
```javascript
const [pointCounts, setPointCounts] = useState({});
useEffect(() => {
  if (!matches.length || !scouted.length) return;
  ds.fetchScoutedPointCounts(tournamentId, matches, scouted)
    .then(setPointCounts)
    .catch(() => {});
}, [matches.length, scouted.length, tournamentId]);
```

---

## Part 3: Enhanced team card UI

### Replace current Card rendering in TournamentPage

Current (line ~239):
```jsx
<Card key={st.id} icon="🏴" title={gt.name}
  subtitle={[(st.roster||[]).length + ' players', st.division, ...].join(' · ')}
  onClick={...} actions={...} />
```

New: custom card with stats row. **Do NOT use the generic Card component** — build inline to accommodate the stats layout.

### Layout structure:
```
┌─────────────────────────────────────────┐
│ 🏴  Team Name         5W-1L  83%  👁 ⋮ │
│ 5 players · Div.1                       │
│─────────────────────────────────────────│
│ +12          32:20          n=26 pts    │
│ point diff   for:against                │
└─────────────────────────────────────────┘
```

### Styling:

**Top row:**
- Team name: `FONT_SIZE.base`, weight 600, `COLORS.text`
- W-L: wins in `COLORS.success` (#22c55e) weight 700, losses in `COLORS.danger` (#ef4444) weight 700, separator `-` in `COLORS.border`, font size `FONT_SIZE.sm` (13px)
- Win rate badge: `FONT_SIZE.xxs` (10px), weight 600, padded pill
  - >60%: bg `#22c55e18`, color `COLORS.success`
  - 40-60%: bg `#f59e0b18`, color `COLORS.accent`
  - <40%: bg `#ef444418`, color `COLORS.danger`
  - null (no matches): don't show

**Subtitle row:**
- Same as current: player count + division, `FONT_SIZE.xs`, `COLORS.textMuted`

**Stats row** (only show if team has played at least 1 match):
- Border top: `1px solid #1e293b`
- Padding top: 8px, margin top: 8px
- Three items in flex row:
  1. Point diff: value in `FONT_SIZE.sm` weight 600, label "point diff" in `FONT_SIZE.xxs` `COLORS.textMuted`. Positive = `COLORS.text`, negative = `COLORS.danger`
  2. Pts for:against: value `FONT_SIZE.sm` weight 600, label "pts for:against" in `FONT_SIZE.xxs`
  3. Scouted points badge (right-aligned, `margin-left: auto`):
    - `n=X scouted pts` in pill: bg `COLORS.surfaceLight`, `FONT_SIZE.xxs`, `COLORS.textMuted`
    - If X < 5: add ⚠ prefix, color `COLORS.accent` (amber warning)

### Card container styling:
- bg: `COLORS.surfaceDark` (#0f172a)
- border: `1px solid ${COLORS.border}`
- borderRadius: `RADIUS.lg` (10px)
- padding: `14px 16px`
- marginBottom: `SPACE.xs` (4px)
- cursor: pointer
- onClick: navigate to ScoutedTeamPage

### Teams with NO matches played:
Show card without stats row — just name + subtitle + 👁 + ⋮ (like current).

---

## Part 4: Sort teams by win rate

Teams should be sorted by performance (best first) to give coach instant ranking:

```javascript
const sortedTeams = filteredScouted.sort((a, b) => {
  const rA = records[a.id], rB = records[b.id];
  // Teams with matches first
  if ((rA?.played || 0) !== (rB?.played || 0)) return (rB?.played || 0) - (rA?.played || 0);
  // Then by win rate
  if ((rA?.winRate ?? -1) !== (rB?.winRate ?? -1)) return (rB?.winRate ?? -1) - (rA?.winRate ?? -1);
  // Then by point diff
  return (rB?.diff || 0) - (rA?.diff || 0);
});
```

---

## Verification checklist

- [ ] W-L record computed correctly (check: team as teamA AND teamB in matches)
- [ ] Win rate % rounds to integer, colors correctly (green/amber/red)
- [ ] Point diff shows + prefix for positive, no prefix for negative
- [ ] Pts for:against matches sum of scoreA/scoreB across matches
- [ ] n=X scouted points count shows correctly
- [ ] ⚠ warning when n < 5
- [ ] Teams with no matches show simplified card (no stats row)
- [ ] Teams sorted by win rate (best first)
- [ ] Tap card still navigates to ScoutedTeamPage
- [ ] 👁 observe and ⋮ menu still work
- [ ] Division filter still works
- [ ] Hidden teams still work
- [ ] Build passes: `npx vite build 2>&1 | tail -3`
- [ ] Precommit passes: `npm run precommit`
