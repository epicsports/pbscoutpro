# CC_BRIEF_TEAM_STATS_CARDS.md
## Tournament Page — Scout/Coach Toggle + Team Cards

**Priority:** HIGH — fundamental UX improvement
**Context:** Scout and coach have different needs on tournament page. Toggle swaps content priority. Team cards simplified to Apple HIG standards.
**Design specs:** DESIGN_DECISIONS.md sections 20, 26

**NOTE:** This brief SUPERSEDES the earlier version. Team cards are now MINIMAL (name + W-L only). Detailed stats moved to ScoutedTeamPage drill-down.

---

## Part 1: Scout/Coach mode toggle

### Add toggle bar below tournament header

```jsx
const [mode, setMode] = useState(() => {
  return localStorage.getItem('tournamentMode_' + tournamentId) || 'scout';
});
const toggleMode = (m) => {
  setMode(m);
  localStorage.setItem('tournamentMode_' + tournamentId, m);
};
```

### Toggle UI
Render below PageHeader, above content:
```jsx
<div style={{
  display: 'flex', margin: '12px 16px 0',
  background: COLORS.surfaceDark, borderRadius: RADIUS.md,
  padding: 3, border: `1px solid ${COLORS.border}`
}}>
  <div onClick={() => toggleMode('scout')} style={{
    flex: 1, padding: '8px 0', textAlign: 'center',
    fontSize: FONT_SIZE.xs, fontWeight: 600, letterSpacing: '.2px',
    borderRadius: RADIUS.sm, cursor: 'pointer',
    background: mode === 'scout' ? COLORS.surface : 'transparent',
    color: mode === 'scout' ? COLORS.text : COLORS.textMuted,
    boxShadow: mode === 'scout' ? '0 1px 4px #00000025' : 'none',
    transition: 'all .2s',
  }}>Scout</div>
  <div onClick={() => toggleMode('coach')} style={{
    // same pattern, swap 'coach'
  }}>Coach</div>
</div>
```

### Content order based on mode
```jsx
{mode === 'scout' ? (
  <>
    {/* Matches section (Live → Scheduled → Completed) */}
    {renderMatches()}
    {/* Collapsed: Teams · Settings · Layout */}
    {renderCollapsedTeamsSection()}
  </>
) : (
  <>
    {/* Teams section with W-L cards */}
    {renderTeamCards()}
    {/* Matches section */}
    {renderMatches()}
    {/* Collapsed: Settings · Layout */}
    {renderCollapsedSettingsSection()}
  </>
)}
```

---

## Part 2: Compute team W-L records

### Utility: `src/utils/teamStats.js`

If `computeTeamRecords` already exists from earlier implementation, keep it.
It should return `{ [scoutedTeamId]: { wins, losses, played } }`.

Only `wins` and `losses` are needed for the card display now.

---

## Part 3: Minimal team card (coach mode)

### Replace current team card rendering in coach mode

Each team card shows ONLY: team name + W-L record.
Whole card is one touch target → navigate to ScoutedTeamPage.

```jsx
{sortedTeams.map(st => {
  const gt = teams.find(g => g.id === st.teamId);
  if (!gt) return null;
  const rec = records[st.id] || { wins: 0, losses: 0 };
  return (
    <div key={st.id}
      onClick={() => navigate('/tournament/' + tournamentId + '/team/' + st.id)}
      style={{
        margin: '0 16px 4px', background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg,
        cursor: 'pointer', transition: 'background .12s',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '14px 16px', gap: 12,
      }}>
        <span style={{
          fontSize: FONT_SIZE.base, fontWeight: 600,
          color: COLORS.text, flex: 1, letterSpacing: '-.1px',
        }}>{gt.name}</span>
        {rec.played > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: COLORS.success }}>{rec.wins}W</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span style={{ color: COLORS.danger }}>{rec.losses}L</span>
          </span>
        )}
      </div>
    </div>
  );
})}
```

### Sort teams by wins desc, then losses asc
```javascript
const sortedTeams = [...filteredScouted].sort((a, b) => {
  const rA = records[a.id] || { wins: 0, losses: 0, played: 0 };
  const rB = records[b.id] || { wins: 0, losses: 0, played: 0 };
  if (rA.played !== rB.played) return rB.played - rA.played;
  if (rA.wins !== rB.wins) return rB.wins - rA.wins;
  return rA.losses - rB.losses;
});
```

### Teams with no matches played
Show card with name only, no W-L.

---

## Part 4: Collapsed sections

### Scout mode collapsed section
Below matches, add collapsible "Teams · Settings · Layout":
```jsx
const [extraCollapsed, setExtraCollapsed] = useState(true);

<div onClick={() => setExtraCollapsed(!extraCollapsed)}
  style={{
    margin: '8px 16px', paddingTop: 12,
    borderTop: `1px solid ${COLORS.border}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    cursor: 'pointer',
  }}>
  <span style={{ fontSize: 11, color: COLORS.textMuted, fontWeight: 500 }}>
    Teams · Settings · Layout {extraCollapsed ? '▾' : '▴'}
  </span>
</div>
{!extraCollapsed && (
  // render existing teams section + layout link + settings
)}
```

### Coach mode collapsed section
Same pattern but just "Settings · Layout" (teams are already visible above).

---

## Verification checklist

- [ ] Toggle renders below header
- [ ] Toggle persists in localStorage per tournament
- [ ] Scout mode: matches on top, teams collapsed at bottom
- [ ] Coach mode: teams on top, matches below, settings collapsed
- [ ] Team cards show name + W-L only (no chevron, no logo, no extra stats)
- [ ] Teams with no matches show name only
- [ ] Teams sorted by wins desc
- [ ] Tap team card → navigates to ScoutedTeamPage
- [ ] Division filter still works in both modes
- [ ] Build passes: `npx vite build 2>&1 | tail -3`
- [ ] Precommit passes: `npm run precommit`
