# CC BRIEF: Remaining Fixes (post April 6 session)
**Priority:** HIGH
**Run `npm run precommit` before every commit. Push after each fix.**

## Status: What CC already did ✅
- ✅ Layout canvas + toggles removed from tournament page
- ✅ Division pill filter added
- ✅ Match sections: Live/Scheduled/Completed
- ✅ Add match modal on tournament page
- ✅ Side picker with red/blue cards
- ✅ End match button on heatmap view + ConfirmModal in scope
- ✅ Exit point without saving (back to tournament)
- ✅ Scouting header: "Scouting TEAM_A vs TEAM_B · score"
- ✅ Division selectors on team create/edit
- ✅ Layout selection on tournament create/edit
- ✅ ⋮ three-dot menu replacing swipe-to-delete
- ✅ Heatmap renders positions + shots simultaneously
- ✅ Closed matches skip side picker

---

## What's still broken / not done:

### FIX 1: addTournament doesn't save layoutId
**File:** `src/services/dataService.js` line 96-104

`addTournament` receives `layoutId` from HomePage but doesn't persist it to Firestore.
The field is missing from the object passed to `addDoc`.

**Fix:** Add `layoutId: data.layoutId || null,` after line 100:
```javascript
export async function addTournament(data) {
  return addDoc(collection(db, bp(), 'tournaments'), {
    name: data.name, league: data.league, year: data.year || new Date().getFullYear(),
    fieldImage: data.fieldImage || null, location: data.location || null,
    division: data.division || null, divisions: data.divisions || [],
    layoutId: data.layoutId || null,
    date: data.date || null, rules: data.rules || null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
```

### FIX 2: TeamsPage — remove pencil + trash, use ⋮ dots menu
**File:** `src/pages/TeamsPage.jsx` lines 117-120

Currently team cards have pencil (edit) + trash (delete) + chevron (navigate).
Pencil and chevron duplicate — both lead to team details. 

**Replace** pencil + trash with ⋮ dots that open bottom sheet:
```jsx
actions={
  <span style={{ display: 'flex', gap: 4, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
    <Btn variant="ghost" size="sm" onClick={() => openContextMenu(t)}>⋮</Btn>
  </span>
}
```

Bottom sheet options:
- "Edit name" → opens existing edit modal (rename only)
- separator
- "Delete team" (danger) → ConfirmModal

Keep chevron (›) as the primary navigation to TeamDetailPage where roster, leagues, and divisions are managed.

### FIX 3: Match summary header — implement B3 scoreboard design
**File:** `src/pages/MatchPage.jsx` lines 400-425

Current heatmap header still uses the old layout with team name tabs (A/B/Both/All) and abbreviated names.

**Approved design (B3 stacked scoreboard):** Replace with:
```jsx
{/* Heatmap header — B3 stacked scoreboard */}
<div style={{ padding: `${SPACE.sm}px ${SPACE.lg}px`, background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }}>
  {/* Back + badge row */}
  <div style={{ display: 'flex', alignItems: 'center', marginBottom: SPACE.sm }}>
    <span onClick={() => navigate(`/tournament/${tournamentId}`)}
      style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.accent, fontWeight: 500, cursor: 'pointer' }}>
      ‹ Tournament
    </span>
    <span style={{ flex: 1 }} />
    <span style={{
      fontSize: FONT_SIZE.xxs - 1, fontWeight: 800, padding: '2px 6px', borderRadius: RADIUS.xs,
      letterSpacing: '.5px',
      background: match?.status === 'closed' ? COLORS.success + '18' : COLORS.accent,
      color: match?.status === 'closed' ? COLORS.success : '#000',
    }}>{match?.status === 'closed' ? 'FINAL' : 'LIVE'}</span>
  </div>
  {/* Scoreboard card */}
  <div style={{
    background: COLORS.surfaceDark, borderRadius: RADIUS.lg,
    border: `1px solid ${match?.status === 'closed' ? COLORS.success + '30' : COLORS.border}`,
    padding: `${SPACE.sm}px ${SPACE.md}px`,
  }}>
    {/* Team A row */}
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.xs }}>
      <span style={{
        fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, flex: 1,
        color: match?.status === 'closed' && score?.a > score?.b ? COLORS.success : TEAM_COLORS.A,
      }}>{teamA?.name || 'Team A'}</span>
      {match?.status === 'closed' && score?.a > score?.b && (
        <span style={{ fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.success, letterSpacing: '.5px' }}>WIN</span>
      )}
      <span style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800, width: 30, textAlign: 'center',
        color: match?.status === 'closed' && score?.a > score?.b ? COLORS.success : COLORS.text,
      }}>{score?.a || 0}</span>
    </div>
    {/* Team B row */}
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
      <span style={{
        fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, flex: 1,
        color: match?.status === 'closed' && score?.b > score?.a ? COLORS.success :
               match?.status === 'closed' ? COLORS.textMuted : TEAM_COLORS.B,
      }}>{teamB?.name || 'Team B'}</span>
      {match?.status === 'closed' && score?.b > score?.a && (
        <span style={{ fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.success, letterSpacing: '.5px' }}>WIN</span>
      )}
      <span style={{
        fontFamily: FONT, fontSize: FONT_SIZE.xxl, fontWeight: 800, width: 30, textAlign: 'center',
        color: match?.status === 'closed' ?
          (score?.b > score?.a ? COLORS.success : COLORS.textMuted) :
          (score?.b > 0 ? COLORS.text : COLORS.textMuted),
      }}>{score?.b || 0}</span>
    </div>
  </div>
</div>
```

**Also remove:**
- Team filter tabs (A/B/Both/All) — not needed, heatmap shows all data
- Positions/Shots toggle — already removed from heatmap, verify it's gone
- `heatmapTeam` state — no longer used if tabs are removed. Heatmap always shows 'all'.

### FIX 4: HeatmapCanvas — always pass all points
**File:** `src/pages/MatchPage.jsx` line 434

After removing team tabs, heatmap should always show all points:
```jsx
<HeatmapCanvas fieldImage={field.fieldImage} points={getHeatmapPoints('all')}
  rosterPlayers={[...rosterA, ...rosterB]}
  ...
/>
```

Remove the `heatmapTeam` conditional logic around this call.

---

## EXECUTION ORDER
1. FIX 1 — layoutId in addTournament (1 line) → push
2. FIX 2 — TeamsPage ⋮ menu → push  
3. FIX 3+4 — B3 scoreboard header + heatmap always-all → push

## TESTING
- [ ] New tournament with layout selected → layout visible when entering match
- [ ] TeamsPage: no pencil/trash, only ⋮ and ›
- [ ] ⋮ opens bottom sheet with "Edit name" + "Delete team"
- [ ] Match summary: B3 stacked scoreboard (red team / blue team / scores)
- [ ] No team tabs (A/B/Both/All)
- [ ] No Positions/Shots toggle
- [ ] Heatmap shows all positions + shots combined
- [ ] FINAL state: winner green with WIN label, loser dimmed
- [ ] Build passes (`npm run precommit`)
