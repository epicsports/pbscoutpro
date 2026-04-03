# NEXT TASKS — Read this, work top to bottom
## For Claude Code — push after each task

---

## PHASE 1: Home Dashboard + Bottom Nav Fix

### Task 1.1: Home page → Dashboard
**File:** `src/pages/HomePage.jsx`

Replace current layout with dashboard. Remove duplicated navigation
(Players/Teams/Import CSV sections duplicate bottom nav).

New structure:
```
┌─ PbScoutPro ──────── {workspace} ─┐
│                                    │
│ ⚡ Ostatnie punkty (3)            │
│  horizontal scroll cards:          │
│  [W 5:3 RNG vs PP] [L 2:4 ...]   │
│                                    │
│ 🎯 Ostatnie mecze (3)             │
│  list cards with score + date      │
│  tap → navigate to match           │
│                                    │
│ 🏆 Aktywny turniej (1)            │
│  big card with tournament name,    │
│  league badge, division, layout    │
│  thumbnail. Tap → TournamentPage   │
│                                    │
│ [+ Nowy turniej]                   │
│                                    │
│ Footer: v0.5 · Jacek Parczewski   │
└────────────────────────────────────┘
  🏠 Home  🗺️ Layouts  👥 Teams  📋 Players
```

**Data sources:**
- "Ostatnie punkty": query all matches, collect last 3 points across all
  tournaments. Show: match name, outcome (W/L), score.
- "Ostatnie mecze": last 3 matches by date from any tournament.
  Show: home vs away, score, date.
- "Aktywny turniej": most recently accessed tournament (by lastAccess 
  timestamp, or most recent match date).

**Remove from Home:** Players section, Teams section, Import CSV, 
Layouts & tactics section. These are all in bottom nav already.

Keep: Tournaments section with filters, but only show if no "active" 
tournament detected. Otherwise show the dashboard above.

### Task 1.2: Fix bottom nav overlap
**File:** `src/components/BottomNav.jsx`

The bottom nav overlaps page content. Add padding-bottom to page containers:

```jsx
// In App.jsx or each page, add:
style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom, 0px))' }}
```

Or in global.css:
```css
body { padding-bottom: 64px; }
```

### Task 1.3: Remove Import CSV from Home
Move "Import CSV" functionality to Players page (as a button at top).
It's a rarely used feature that clutters the dashboard.

---

## PHASE 2: Tournament Divisions

### Task 1.5: BunkerCard wizard + position fine-tuning
**File:** `src/components/BunkerCard.jsx`

Current BunkerCard is cramped. Redesign as step-by-step wizard:

**Step 1: Name + Position**
```
┌── + Nowy bunkier ────────────────┐
│                                   │
│  Nazwa: [SNAKE_______]  auto-focus│
│                                   │
│  Pozycja X: ━━━●━━━━━━  0.35     │
│  Pozycja Y: ━━━━━━●━━━  0.52     │
│                                   │
│  ☑ Mirror (lustrzany)             │
│                                   │
│         [Dalej →]                 │
└───────────────────────────────────┘
```

X/Y sliders let user fine-tune position after initial tap placement.
Range: 0.0 to 1.0, step 0.01. Live preview — bunker moves on canvas as
slider changes. Mirror checkbox auto-creates partner at (1-x, y).

**Step 2: Type**
```
┌── Typ przeszkody ────────────────┐
│                                   │
│  Niskie ≤0.9m                     │
│  [SB] [SD] [Tr]                  │
│                                   │
│  Średnie 1.0-1.2m                 │
│  [MD] [Ck] [Br●] [C] [MW]       │  ← auto-selected by guessType
│                                   │
│  Wysokie ≥1.4m                    │
│  [Wg] [GP] [T] [GB] [TCK] ...   │
│                                   │
│  [← Wstecz]        [✓ Zapisz]   │
└───────────────────────────────────┘
```

Type auto-guessed from name (guessType()). User can override.
Save → close card, ready for next bunker (canvas stays in add mode).

**For existing bunkers (tap to edit):**
Show both steps in single view (no wizard), fields editable.
Add [🗑️ Usuń] button.

**Drag behavior hint:**
When BunkerCard opens for existing bunker, show:
"💡 Przeciągnij żółtą kropkę na polu aby przesunąć"

### Task 2.1: Firestore model update
**File:** `src/services/dataService.js`

Add to tournament document:
```javascript
{
  // existing fields...
  divisions: ['Div.1', 'Div.2'],  // array of division names
}
```

Add `division` field to scouted team:
```javascript
// addScoutedTeam:
{ teamId, division: data.division || null, ... }
```

Add `division` field to match:
```javascript
// addMatch:
{ homeTeamId, awayTeamId, division: data.division || null, ... }
```

### Task 2.2: Tournament page — division tabs
**File:** `src/pages/TournamentPage.jsx`

Add horizontal tab bar below tournament header:

```jsx
const divisions = tournament.divisions || [];
const [activeDivision, setActiveDivision] = useState('all');

// Tab bar
<div style={{ display: 'flex', gap: 4, overflowX: 'auto', padding: '8px 12px' }}>
  <Btn size="sm" variant={activeDivision === 'all' ? 'accent' : 'default'}
    onClick={() => setActiveDivision('all')}>Wszystko</Btn>
  {divisions.map(d => (
    <Btn key={d} size="sm" variant={activeDivision === d ? 'accent' : 'default'}
      onClick={() => setActiveDivision(d)}>{d}</Btn>
  ))}
</div>

// Filter teams and matches by division
const filteredTeams = activeDivision === 'all' 
  ? scouted 
  : scouted.filter(s => s.division === activeDivision);
const filteredMatches = activeDivision === 'all'
  ? matches
  : matches.filter(m => m.division === activeDivision);
```

### Task 2.3: Add division to scouted team & match creation
When adding a scouted team to a tournament, show division picker.
When creating a match, auto-inherit division from home team.

### Task 2.4: Tournament edit — manage divisions
In tournament edit modal, add:
```
Dywizje: [Div.1 ×] [Div.2 ×] [+ Dodaj]
```
Chip-style tags. Tap × to remove. + to add (text input).

---

## PHASE 3: Concurrent Scouting (Split Sides)

### Task 3.1: Data model — split home/away
**File:** `src/services/dataService.js`

Each match point gets split data:
```javascript
// Instead of:
{ players: [...], shots: [...], bumps: [...] }

// Now:
{
  homeData: { players, shots, bumps, eliminations, scoutedBy, lastUpdate },
  awayData: { players, shots, bumps, eliminations, scoutedBy, lastUpdate },
  outcome: 'win',  // from home team perspective
}
```

**Migration helper:** existing points use old format. Add adapter:
```javascript
function migratePoint(point) {
  if (point.homeData) return point; // already new format
  // Old format → put everything in homeData
  return {
    ...point,
    homeData: { players: point.players, shots: point.shots, 
                bumps: point.bumps, eliminations: point.eliminations },
    awayData: { players: [null,null,null,null,null], shots: [[],[],[],[],[]], 
                bumps: [null,null,null,null,null], eliminations: [] },
  };
}
```

### Task 3.2: Side claim UI
**File:** `src/pages/MatchPage.jsx`

When entering a match, before scouting, show side selector:
```
┌─────────────────────────────────┐
│ Wybierz stronę do scoutowania:  │
│                                  │
│ [🔴 HOME: RANGER]  [Claim]     │
│  Scouted by: —                   │
│                                  │
│ [🔵 AWAY: PPARENA] [Claim]     │  
│  Scouted by: —                   │
│                                  │
│ [👀 Obserwuj oba] (read-only)   │
└─────────────────────────────────┘
```

After claiming:
- Write `homeData.scoutedBy = auth.currentUser.uid` (or awayData)
- Lock that side to this user (show green indicator)
- Other coach sees the lock and claims other side

### Task 3.3: Dual-write in MatchPage
When coach is scouting HOME side:
- All player placements write to `homeData.players`
- Using Firestore dot notation: `updateDoc(ref, { 'points.0.homeData.players': [...] })`
- This does NOT touch `awayData` → no conflict

Canvas renders BOTH:
- homeData.players in COLORS.playerColors (red, blue, green...)
- awayData.players in opponentColor (gray/muted)
- Real-time: `onSnapshot` on match doc → both coaches see live updates

### Task 3.4: Merge view
After both sides are scouted, a "merge view" shows:
- All 10 players on field (5 home + 5 away)
- All shots from both sides
- Eliminations from both perspectives
- "Full picture" of the point

---

## Implementation notes

- Work through PHASE 1 first, push, then PHASE 2, then PHASE 3
- Each task = separate commit with descriptive message
- Test on mobile (375px viewport) after each phase
- Don't modify `src/workers/ballisticsEngine.js` — that's Opus territory
- Use inline JSX styles with COLORS/FONT/TOUCH from theme.js
- Polish labels in Polish (Dywizje, Strona, Obserwuj)
