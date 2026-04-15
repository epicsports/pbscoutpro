# CC Brief: Navigation Fixes + Match Options

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Implement all 5 fixes in one commit. Build after each part.

---

## Problem summary

1. TrainingResultsPage shows BottomNav (inconsistent — training flow is a separate context)
2. PlayerStatsPage: switching to Layout/Global scope loses the "This tournament" pill
3. Navigation inconsistencies: training sub-pages all have `navigate(-1)` or wrong back targets
4. ScoutTabContent: "+ Add" match button is tiny text in section header, not sticky bottom CTA
5. MatchCard: dot menu only has Delete. Needs more options. Options should live inside the match detail page, not on the card.

---

## Fix 1 — TrainingResultsPage: hide BottomNav

BottomNav is rendered globally in App.jsx after `<Routes>`. It appears on every route.
For training sub-pages the BottomNav is wrong — they are a contained flow.

**Solution:** Add `paddingBottom: 0` override + suppress BottomNav on training routes.

In `src/App.jsx`, the `<BottomNav />` is rendered unconditionally. Wrap it with a route check:

```jsx
import { useLocation } from 'react-router-dom';

function ConditionalBottomNav() {
  const { pathname } = useLocation();
  // Hide BottomNav on training sub-routes (they have their own navigation)
  const hideOnTraining = /^\/training\//.test(pathname);
  if (hideOnTraining) return null;
  return <BottomNav />;
}
```

Replace `<BottomNav />` with `<ConditionalBottomNav />` in App.jsx.

Same logic for `<SessionContextBar />` — it should still show on training routes
(it's a useful LIVE indicator), so leave that unchanged.

Also fix `paddingBottom` in TrainingResultsPage — remove the large bottom padding
since BottomNav is no longer shown:

In `TrainingResultsPage.jsx`, find the scrollable container and set:
```jsx
paddingBottom: 24,  // was 80 or similar
```

---

## Fix 2 — PlayerStatsPage: preserve "This tournament" pill when switching scope

**Problem:** When user taps "Layout" or "Global", the URL loses `tid=` param,
so `scopedTournament` becomes null and "This tournament" pill disappears.

**Solution:** Always carry `tid` forward when navigating between scopes.

```jsx
// Current (loses tid):
onClick={() => navigate(`/player/${playerId}/stats?scope=layout&lid=${...}`)}
onClick={() => navigate(`/player/${playerId}/stats?scope=global`)}

// Fixed (preserves tid):
const baseTid = tidParam ? `&tid=${tidParam}` : '';

// In scope pill clicks:
onClick={() => navigate(`/player/${playerId}/stats?scope=layout&lid=${lidParam || layouts[0]?.id || ''}${baseTid}`)}
onClick={() => navigate(`/player/${playerId}/stats?scope=global${baseTid}`)}
```

The "This tournament" pill logic already reads `tidParam` — it just needs to survive
scope changes. Add `baseTid` to ALL scope pill navigation calls:

```jsx
// All scope pill navigations:
`/player/${playerId}/stats?scope=tournament&tid=${tidParam}`  // unchanged
`/player/${playerId}/stats?scope=global${baseTid}`            // add baseTid
`/player/${playerId}/stats?scope=layout&lid=${lid}${baseTid}` // add baseTid
`/player/${playerId}/stats?scope=match&mid=${midParam}${baseTid}` // unchanged
```

---

## Fix 3 — Training sub-page back buttons

All training sub-pages should navigate within the training flow consistently:

| Page | Back destination |
|---|---|
| `TrainingSetupPage` | `/` (home — user came from main page) |
| `TrainingSquadsPage` | `/training/${trainingId}/setup` |
| `TrainingPage` | `/` (already fixed) |
| `TrainingResultsPage` | `/training/${trainingId}` (already correct) |
| `MatchPage` (training matchup) | `/training/${trainingId}` |

Check each page's `PageHeader back=` prop and fix if wrong.

For `TrainingSetupPage.jsx`:
```jsx
// Current: back={{ to: '/' }} — correct, leave it
```

For `TrainingSquadsPage.jsx`:
```jsx
// Check and fix if needed:
back={{ to: `/training/${trainingId}/setup` }}
```

For `MatchPage.jsx` when `isTraining`:
```jsx
// The back button in training matchup mode should go to /training/:trainingId
// Find the back prop logic and ensure isTraining routes to training page
back={{ to: isTraining ? `/training/${trainingId}` : navigate(-1) }}
```

---

## Fix 4 — ScoutTabContent: sticky "+ Add match" button

**Problem:** "+ Add" is a tiny tappable text in the section header. Easy to miss,
inconsistent with app pattern where primary actions are sticky at bottom.

**Solution:** Remove the inline "+ Add" from section header. Add sticky footer
inside ScoutTabContent (not in the whole page — just the tab content scroll area).

```jsx
// In ScoutTabContent return, wrap content in position:relative container
// and add sticky footer at bottom:

return (
  <div style={{ position: 'relative', minHeight: '100%' }}>
    <div style={{
      padding: SPACE.lg,
      paddingBottom: (!isClosed && !isViewer && scouted[0]) ? 88 : 24,
      display: 'flex', flexDirection: 'column', gap: SPACE.md,
    }}>
      {/* ... all existing content ... */}
      {/* Remove the inline "+ Add" from SectionTitle right= prop */}
      <SectionTitle>Matches ({filtered.length})</SectionTitle>
    </div>

    {/* Sticky Add Match button — only when active tournament + has scouted team */}
    {!isClosed && !isViewer && scouted[0] && (
      <div style={{
        position: 'sticky',
        bottom: 0,
        padding: `${SPACE.sm}px ${SPACE.lg}px`,
        background: COLORS.bg,
        borderTop: `1px solid ${COLORS.border}`,
      }}>
        <Btn
          variant="accent"
          onClick={() => setAddMatchModal(true)}
          style={{ width: '100%', minHeight: 52, fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700 }}
        >
          + Add match
        </Btn>
      </div>
    )}
  </div>
);
```

**Also:** In the empty state when no matches exist, keep the "Import schedule" button
as a secondary option but don't remove it — some users import from schedule.

---

## Fix 5 — Match options: move from card to match detail page

**Problem:** MatchCard has no dot menu (it was removed). Options like delete, reopen,
close match need to exist somewhere — but not on the card (clutters the list).

**Solution:**
- Remove any remaining dot menu from MatchCard entirely
- Tapping the score/center area opens the match detail (MatchPage) — already works
- Match options live in MatchPage's header action (⋮ button)

### In `MatchPage.jsx` — add options menu to PageHeader action:

```jsx
// Add state:
const [showOptions, setShowOptions] = useState(false);

// PageHeader action:
action={
  <MoreBtn onClick={() => setShowOptions(true)} />
}

// ActionSheet with match options:
<ActionSheet
  open={showOptions}
  onClose={() => setShowOptions(false)}
  title="Match options"
  items={[
    // Reopen closed match
    ...(match?.status === 'closed' ? [{
      label: 'Reopen match',
      icon: '🔓',
      onPress: async () => {
        await ds.updateMatch(tournamentId, matchId, { status: 'open', scoreA: 0, scoreB: 0 });
        setShowOptions(false);
      },
    }] : []),
    // Close/finalize active match
    ...(match?.status !== 'closed' && ((match?.scoreA || 0) > 0 || (match?.scoreB || 0) > 0) ? [{
      label: 'Mark as final',
      icon: '🏁',
      onPress: async () => {
        await ds.updateMatch(tournamentId, matchId, { status: 'closed' });
        setShowOptions(false);
      },
    }] : []),
    // Delete match (danger)
    {
      label: 'Delete match',
      icon: '🗑',
      danger: true,
      onPress: () => {
        setShowOptions(false);
        setDeleteConfirm(true);
      },
    },
  ]}
/>

<ConfirmModal
  open={deleteConfirm}
  onClose={() => setDeleteConfirm(false)}
  title="Delete match?"
  message="All scouted points will be permanently lost."
  confirmLabel="Delete"
  danger
  onConfirm={async () => {
    await ds.deleteMatch(tournamentId, matchId);
    setDeleteConfirm(false);
    navigate(-1);
  }}
/>
```

Import `ActionSheet`, `MoreBtn`, `ConfirmModal` from `../components/ui` — these already exist.
Add `deleteConfirm` state.

### In `ScoutTabContent.jsx` — clean up MatchCard:

MatchCard currently has no dot menu (already removed from earlier changes).
Verify there's no stray delete button or dot menu and leave the card clean.
The card already navigates to MatchPage on tap — that's where options live now.

Keep MatchCard taps:
- Left zone (team A) → scout team A
- Right zone (team B) → scout team B  
- Center (score) → review / match detail

No dot menu on the card at all.

---

## Build & commit

`npx vite build` must pass.

```
fix: navigation consistency + match options overhaul

Fix 1: Hide BottomNav on /training/* routes (ConditionalBottomNav)
Fix 2: PlayerStatsPage scope pills preserve tid= param on scope switch
Fix 3: Training sub-page back buttons point to correct destinations
Fix 4: "+ Add match" moved from inline text to sticky accent button at bottom
Fix 5: Match options (reopen, close, delete) moved from card dot menu
       into MatchPage header ActionSheet — cards stay clean
```
