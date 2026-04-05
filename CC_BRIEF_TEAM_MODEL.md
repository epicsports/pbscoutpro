# CC BRIEF: Team Model Bugs + Practice Module
**Priority:** HIGH — core workflow broken
**Run `npm run precommit` before every commit. Push after each part.**

---

## PART 1: Fix Child Teams in Tournament Picker (20 min)

### Bug
Child teams (Ring, Rage, Rebel, Rush) don't appear in tournament team picker.

### Root cause
`TournamentPage.jsx` line filtering `available` teams checks `leagues` but child teams may not have correct leagues set. Also no parent/child grouping in picker.

### Fix

**1a. TeamsPage.jsx — auto-inherit parent leagues on child creation:**
In `handleAdd`, when `parentTeamId` is set:
```javascript
const handleAdd = async () => {
  if (!name.trim()) return;
  let teamLeagues = leagues;
  if (parentTeamId) {
    const parent = teams.find(t => t.id === parentTeamId);
    if (parent && JSON.stringify(leagues) === JSON.stringify(['NXL'])) {
      teamLeagues = parent.leagues || ['NXL'];
    }
  }
  await ds.addTeam({ name: name.trim(), leagues: teamLeagues, parentTeamId: parentTeamId || null });
  modal.close();
};
```

**1b. TournamentPage.jsx — group parent/child in picker:**
Replace `available` computation:
```javascript
const available = teams.filter(t => {
  if (alreadyIds.includes(t.id)) return false;
  if (!(t.leagues || []).includes(tournament.league)) return false;
  return true;
});

const sortedAvailable = (() => {
  const parents = available.filter(t => !t.parentTeamId);
  const children = available.filter(t => !!t.parentTeamId);
  const result = [];
  parents.forEach(p => {
    result.push(p);
    children.filter(c => c.parentTeamId === p.id).forEach(c => {
      result.push({ ...c, _isChild: true });
    });
  });
  children.filter(c => !parents.find(p => p.id === c.parentTeamId)).forEach(c => {
    result.push({ ...c, _isChild: true });
  });
  return result;
})();
```

**1c. Picker UI — indent child teams:**
```jsx
{sortedAvailable.slice(0, 20).map(t => (
  <Btn key={t.id} variant="default" size="sm"
    onClick={() => handleAddScouted(t.id)}
    style={t._isChild ? { marginLeft: 16, fontSize: TOUCH.fontXs, borderStyle: 'dashed' } : {}}>
    <Icons.Plus /> {t._isChild ? '↳ ' : ''}{t.name}
  </Btn>
))}
```

---

## PART 2: Division Enforcement (30 min)

### Bug
Team assigned to NXL D3 in profile can be added to any division in tournament.

### Fix

**2a. handleAddScouted — use team's profile division:**
```javascript
const handleAddScouted = async (teamId) => {
  const team = teams.find(t => t.id === teamId);
  const teamRoster = players.filter(p => p.teamId === teamId).map(p => p.id);
  const teamDivision = team?.divisions?.[tournament.league] || null;
  const division = teamDivision || (activeDivision !== 'all' ? activeDivision : null);
  await ds.addScoutedTeam(tournamentId, { teamId, roster: teamRoster, division });
};
```

**2b. Show division in picker:**
```jsx
{sortedAvailable.map(t => {
  const teamDiv = t.divisions?.[tournament.league];
  return (
    <Btn key={t.id} variant="default" size="sm" onClick={() => handleAddScouted(t.id)}
      style={t._isChild ? { marginLeft: 16, fontSize: TOUCH.fontXs, borderStyle: 'dashed' } : {}}>
      <Icons.Plus /> {t._isChild ? '↳ ' : ''}{t.name}
      {teamDiv && <span style={{ fontSize: 9, color: COLORS.textDim, marginLeft: 4 }}>({teamDiv})</span>}
    </Btn>
  );
})}
```

**2c. Filter by active division:**
```javascript
const filteredAvailable = activeDivision === 'all'
  ? sortedAvailable
  : sortedAvailable.filter(t => {
      const teamDiv = t.divisions?.[tournament.league];
      return !teamDiv || teamDiv === activeDivision;
    });
```
Use `filteredAvailable` in picker UI.

**2d. Mismatch warning in scouted teams list:**
Add to Card subtitle:
```javascript
const profileDiv = gt.divisions?.[tournament.league];
const mismatch = profileDiv && st.division && profileDiv !== st.division;
// In subtitle:
subtitle={[(st.roster||[]).length + ' players', st.division, mismatch && '⚠️ profile: ' + profileDiv].filter(Boolean).join(' · ')}
```

---

## PART 3: Practice/Training Module (30 min)

### Concept
Special tournament type for training — pick players from any team, no league/division constraints.

**3a. dataService.js — add type field:**
In `addTournament`, field already accepts arbitrary data. Just pass `type: 'practice'`.

**3b. HomePage.jsx — add "New Practice" button:**
```jsx
<Btn variant="ghost" size="sm" onClick={() => {
  setName('Practice ' + new Date().toLocaleDateString());
  setLeague('NXL'); setYear(new Date().getFullYear());
  // Set a flag to create as practice
  setPracticeMode(true);
  modal.open('create');
}}>🏋️ New Practice</Btn>
```

On save: `await ds.addTournament({ ...data, type: practiceMode ? 'practice' : 'tournament' });`

**3c. HomePage — separate practice list:**
```javascript
const practices = tournaments.filter(t => t.type === 'practice');
const regularTournaments = tournaments.filter(t => t.type !== 'practice');
```
Show practices in separate section with 🏋️ icon.

**3d. TournamentPage — practice mode adjustments:**
```javascript
const isPractice = tournament.type === 'practice';
```
- Header: show "🏋️ Practice" badge instead of league
- Team picker: skip league filter if `isPractice`
- Division tabs: hide if `isPractice`
- Roster: include all players from team + children if `isPractice`:
```javascript
if (isPractice) {
  const childIds = teams.filter(t => t.parentTeamId === teamId).map(t => t.id);
  teamRoster = players.filter(p => [teamId, ...childIds].includes(p.teamId)).map(p => p.id);
}
```

---

## EXECUTION ORDER
1. Part 1 — Child teams → push
2. Part 2 — Division enforcement → push
3. Part 3 — Practice module → push

## TESTING CHECKLIST
- [ ] Child teams appear in tournament picker with ↳ indent
- [ ] Child teams inherit parent leagues on creation
- [ ] Team's profile division auto-fills in tournament
- [ ] Active division filter narrows team picker
- [ ] Division mismatch warning shows on team card
- [ ] "New Practice" creates practice-type tournament
- [ ] Practice: all teams visible (no league filter)
- [ ] Practice: no division tabs
- [ ] Practice: roster includes team + children players
- [ ] Practice sessions shown separately on HomePage
- [ ] npm run precommit green
