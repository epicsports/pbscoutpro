# NEXT TASKS — Read this, work top to bottom
## For Claude Code — push after each task

**Last updated:** 2026-04-03 by Opus
**Context:** CLAUDE.md has project setup. theme.js has color/sizing tokens.
All styles are inline JSX using COLORS/FONT/TOUCH from theme.js.

---

## 🔥 PRIORITY 0: Bugs & Consistency (do first)

### Task 0.1: Unify headers — iOS-style back on ALL detail pages
**Problem:** ScoutedTeamPage has iOS-style "← Tournament name" back button.
All other pages still use breadcrumbs via Header component. Inconsistent.

**Fix pattern:**
```jsx
// Detail pages: show back arrow + parent page name (tappable, amber)
<div style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
  background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
}}>
  <div onClick={() => navigate(backPath)}
    style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
    <Icons.Back />
    <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm }}>{parentName}</span>
  </div>
</div>
```

Pages to fix (back label → path):
- `MatchPage.jsx` → "← {tournament.name}" → `/tournament/{id}`
- `TacticPage.jsx` → "← {layout or tournament name}" → back
- `TournamentPage.jsx` → "← Start" → `/`
- `TeamDetailPage.jsx` → "← Drużyny" → `/teams`  
- `LayoutDetailPage.jsx` → "← Layouty" → `/layouts`

Tab destination pages (Home, Layouts, Teams, Players): NO back arrow.
Just show page title. They use bottom nav for navigation.

### Task 0.2: Polish labels — translate to Polish
- Bottom nav: Home→Start, Layouts→Layouty, Teams→Drużyny, Players→Zawodnicy
- "Layouts & Tactics" → "Layouty"
- "Players" (page title) → "Zawodnicy"
- "Teams" (page title) → "Drużyny"
- "Positions" → "Pozycje", "Shots" → "Strzały"
- "Roster" → "Skład", "Matches" → "Mecze"
- "Add team" → "Dodaj drużynę", "Add match" → "Dodaj mecz"
- "Import schedule" → "Import harmonogramu"
- "From layout" → "Z layoutu", "Hidden" → "Ukryte"

### Task 0.3: Bottom nav padding
Content hides behind fixed bottom nav. Fix:
Add `paddingBottom: 64` to main container on tab pages
(HomePage, LayoutsPage, TeamsPage, PlayersPage).

### Task 0.4: Move Import CSV from Home to Players page
Remove from HomePage. Add as secondary button on PlayersPage header area.

---

## PHASE 1: Home Dashboard

### Task 1.1: Home page → Dashboard
**File:** `src/pages/HomePage.jsx`

Replace current layout with dashboard. Remove sections that duplicate bottom nav.

Structure:
- ⚡ Ostatnie punkty (3) — horizontal scroll cards with outcome + score
- 🎯 Ostatnie mecze (3) — list cards with teams, score, date
- 🏆 Aktywny turniej (1) — big card, tap → TournamentPage  
- [+ Nowy turniej] button
- 🏆 Turnieje — filterable list (existing, keep)
- Footer: v0.5 · Jacek Parczewski

Data: scan matches/points across tournaments for recents.

---

## PHASE 1.5: BunkerCard Wizard

### Task 1.5: BunkerCard wizard + position fine-tuning
**File:** `src/components/BunkerCard.jsx`

New bunkers → 2-step wizard:
- Step 1: Name (auto-focus) + X/Y position sliders (0-1, step 0.01, live preview) + Mirror checkbox → [Dalej]
- Step 2: Type chips grouped (Niskie/Średnie/Wysokie), auto-guessed from name → [Zapisz]

Existing bunkers → single view (all fields editable) + [Usuń] + drag hint.

After save → card closes, canvas stays in add mode.

---

## PHASE 2: Tournament Divisions

### Task 2.1: Firestore model — `division` field
- Tournament: `divisions: ['Div.1', 'Div.2']`
- Scouted team: `division: 'Div.1'`
- Match: `division: 'Div.1'`

### Task 2.2: Division tabs in TournamentPage
Tab bar: [Wszystko] [Div.1] [Div.2]
Filter teams + matches by active tab.

### Task 2.3: Division picker on add team/match
### Task 2.4: Tournament edit — manage divisions (chip tags)

---

## PHASE 3: Concurrent Scouting (Split Sides)

### Task 3.1: homeData/awayData per point
Split point data into two independent objects. Migration helper for old format.

### Task 3.2: Side claim UI
"Wybierz stronę" screen → claim with uid → lock indicator.

### Task 3.3: Dual-write with Firestore dot notation
Each coach writes only their side. onSnapshot for live sync.

### Task 3.4: Merge view (both sides combined)

---

## PHASE 4: Features

### Task 4.1: OCR bunker detection (FEATURE_OCR_LANDSCAPE.md)
Claude Vision API reads bunker names from layout image.

### Task 4.2: Landscape editing mode (FEATURE_OCR_LANDSCAPE.md)
Canvas fullscreen in landscape. BunkerCard slides from right.

---

## PHASE 5: Polish (POLISH_SPRINT.md remaining items)
- [ ] PWA manifest + service worker + offline
- [ ] App icon/favicon
- [ ] Empty states with illustrations
- [ ] WCAG contrast audit
- [ ] OffscreenCanvas heatmap optimization
- [ ] Export tactic as image

---

## SECURITY (SECURITY.md)
- [ ] Phase 3: Replace `isAdmin` localStorage with `adminUid` in Firestore

---

## Rules
- Inline JSX styles with COLORS/FONT/TOUCH from theme.js — no CSS modules
- Labels in Polish
- Mobile-first (test 375px)
- Don't modify `src/workers/ballisticsEngine.js` — Opus territory
- Push after each task, descriptive commit
- Git: `user.name="Claude Code"`, `user.email="code@pbscoutpro.dev"`
