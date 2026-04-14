# CC_BRIEF_TAB_NAVIGATION.md
## App Shell — Bottom Tab Navigation

**Priority:** HIGH — fundamental navigation restructure
**Context:** Replace HomePage + TournamentPage with 3-tab bottom nav (Scout/Coach/More). Apple HIG compliant.
**Design specs:** DESIGN_DECISIONS.md section 31

**WARNING:** This is a large refactor. Read section 31 FULLY before starting. Commit after EACH part.

---

## Part 1: AppShell component

### New file: `src/components/AppShell.jsx`

This is the main layout wrapper. It renders:
1. Context bar (top) — active tournament name + Change button
2. Tab content (middle) — switches based on active tab
3. Tab bar (bottom) — Scout | Coach | More

```jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../utils/theme';

export default function AppShell({ children, activeTab, onTabChange, tournament, onChangeTournament }) {
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: COLORS.bg }}>
      {/* Context bar */}
      {tournament && (
        <div style={{
          display: 'flex', alignItems: 'center', padding: '10px 16px',
          background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}`,
          gap: 10, flexShrink: 0,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {tournament.name}
            </div>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>
              {tournament.league || ''} · {tournament.matchCount || 0} matches
            </div>
          </div>
          <div onClick={onChangeTournament} style={{
            fontSize: 11, fontWeight: 600, color: '#f59e0b',
            padding: '6px 12px', borderRadius: 8,
            border: '1px solid #f59e0b20', background: '#f59e0b08',
            cursor: 'pointer',
          }}>Change</div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        flexShrink: 0,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}>
        {[
          { key: 'scout', icon: '🎯', label: 'Scout' },
          { key: 'coach', icon: '📊', label: 'Coach' },
          { key: 'more', icon: '⚙', label: 'More' },
        ].map(tab => (
          <div key={tab.key} onClick={() => onTabChange(tab.key)} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 3, padding: '8px 0 6px',
            cursor: 'pointer',
          }}>
            <span style={{ fontSize: 18, opacity: activeTab === tab.key ? 1 : 0.4 }}>{tab.icon}</span>
            <span style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '.3px',
              color: activeTab === tab.key ? '#f59e0b' : '#475569',
            }}>{tab.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Part 2: MainPage — replaces HomePage + TournamentPage

### New file: `src/pages/MainPage.jsx`

This is the root page that uses AppShell. It manages:
- Active tab state (persisted in localStorage)
- Active tournament state (persisted in localStorage)
- Tournament picker modal
- Renders tab content based on activeTab

```jsx
export default function MainPage() {
  const [activeTab, setActiveTab] = useState(() =>
    localStorage.getItem('pbscoutpro_activeTab') || 'scout'
  );
  const [tournamentId, setTournamentId] = useState(() =>
    localStorage.getItem('pbscoutpro_activeTournament') || null
  );
  const [showPicker, setShowPicker] = useState(false);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    localStorage.setItem('pbscoutpro_activeTab', tab);
  };

  const handleSelectTournament = (id) => {
    setTournamentId(id);
    localStorage.setItem('pbscoutpro_activeTournament', id);
    setShowPicker(false);
  };

  // ... render AppShell with tab content
}
```

### Tab content:
- `activeTab === 'scout'` → render ScoutTabContent (match list from current TournamentPage scout mode)
- `activeTab === 'coach'` → render CoachTabContent (teams + matches from current TournamentPage coach mode)
- `activeTab === 'more'` → render MoreTabContent (links to Layouts, Teams, Players, Settings)

### No tournament selected:
All tabs show EmptyState: "Select a tournament or training to start scouting" + "Choose tournament" button.

---

## Part 3: Extract ScoutTabContent

### Extract from current TournamentPage

Move the scout mode content (match list with sections Live/Scheduled/Completed) into a reusable component:

```jsx
function ScoutTabContent({ tournamentId }) {
  // Fetch matches, scouted teams, etc.
  // Render match cards with split-tap and "tap to scout" hints
  // Same as current TournamentPage scout mode content
}
```

Keep all existing match card rendering, add match button, division filters.

---

## Part 4: Extract CoachTabContent

### Extract from current TournamentPage

Move coach mode content (team cards + match list) into:

```jsx
function CoachTabContent({ tournamentId }) {
  // Fetch scouted teams, compute W-L records
  // Render minimal team cards (name + W-L)
  // Below: compact match list
}
```

---

## Part 5: MoreTabContent

### New component with grouped list items

```jsx
function MoreTabContent({ tournamentId, onSwitchTournament, onLogout }) {
  const navigate = useNavigate();
  return (
    <>
      <SectionHeader>Tournament</SectionHeader>
      <MoreItem icon="📋" label="Matches" onClick={() => { /* scroll to matches or navigate */ }} />
      <MoreItem icon="👥" label="Teams in tournament" onClick={() => { /* navigate to team mgmt */ }} />
      <MoreItem icon="🔄" label="Switch tournament" onClick={onSwitchTournament} />

      <SectionHeader>Setup</SectionHeader>
      <MoreItem icon="🗺" label="Layouts" onClick={() => navigate('/layouts')} />
      <MoreItem icon="🏢" label="Teams" onClick={() => navigate('/teams')} />
      <MoreItem icon="🎽" label="Players" onClick={() => navigate('/players')} />

      <SectionHeader>Workspace</SectionHeader>
      <MoreItem icon="⚙" label="Settings" onClick={() => { /* settings modal */ }} />
      <MoreItem icon="🚪" label="Leave workspace" danger onClick={onLogout} />
    </>
  );
}
```

---

## Part 6: Tournament picker (ActionSheet/Modal)

### Bottom sheet with tournament list

```jsx
function TournamentPicker({ open, onClose, onSelect, activeTournamentId }) {
  const { tournaments } = useTournaments();
  // Sort: active first, then open, then closed
  // Render: green dot (active), gray dot (inactive), badges (league/Training/Closed)
  // Dashed card: "+ New tournament or training"
  // Tap → onSelect(id)
}
```

---

## Part 7: Update App.jsx routes

### Replace HomePage route with MainPage

```jsx
// OLD:
<Route path="/" element={<HomePage />} />
<Route path="/tournament/:tournamentId" element={<TournamentPage />} />

// NEW:
<Route path="/" element={<MainPage />} />
// TournamentPage route REMOVED — its content is now in Scout/Coach tabs
// Keep match, team detail, player stats routes as full-screen overlays
```

### Keep these full-screen routes (no tab bar):
- `/tournament/:tid/match/:mid` → MatchPage
- `/tournament/:tid/team/:sid` → ScoutedTeamPage
- `/player/:pid/stats` → PlayerStatsPage
- `/layout/*` → Layout pages
- `/team/:id` → TeamDetailPage

---

## Part 8: Cleanup

- Delete `src/pages/HomePage.jsx` (content moved to MainPage)
- Delete `src/pages/TournamentPage.jsx` (content split into Scout/Coach/More tabs)
- Remove `AppFooter` component usage (replaced by tab bar in AppShell)
- Remove scout/coach toggle from extracted tab content (tabs replace it)
- Remove auto-redirect logic (MainPage handles it natively)
- Update any `navigate('/')` calls to work with new routing

---

## Verification checklist

- [ ] App opens → if tournament active, shows Scout tab with matches
- [ ] App opens → if no tournament, shows empty state with "Choose tournament"
- [ ] Scout tab: match list with split-tap, "tap to scout" → opens MatchPage
- [ ] Coach tab: team cards with W-L, tap → ScoutedTeamPage
- [ ] More tab: all links work (Layouts, Teams, Players, Settings)
- [ ] Change button → picker opens
- [ ] Picker: select tournament → updates context bar + tab content
- [ ] Picker: "+ New" → create tournament flow
- [ ] Tab state persisted across page reloads
- [ ] Tournament state persisted across page reloads
- [ ] Full-screen pages (match, team, player) have no tab bar
- [ ] Back from full-screen → returns to correct tab
- [ ] Build passes + precommit passes
- [ ] All existing functionality preserved (no regressions)
