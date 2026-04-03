# CC BRIEF: Shared Components & UI Unification
**Priority:** HIGH — do as next session after LayoutDetailPage fixes
**Rules:** Inline JSX only (COLORS/FONT/TOUCH from theme.js). English UI. Mobile-first 44px targets.

---

## OVERVIEW

This brief defines 6 reusable components to replace 6 ad-hoc patterns repeated across screens.
Each section: current state → target spec → usage per screen → implementation.

---

## COMPONENT 1: `<PageHeader>`
**File:** `src/components/PageHeader.jsx` (NEW)

### Current state (repeated in all 11 screens)
Every page copy-pastes a sticky header div with minor variations:
- Padding: `8px 16px` (LayoutDetail, MatchEditor) vs `10px 16px` (everywhere else)
- Back label: sometimes shows parent name text, sometimes just arrow
- Title font: `TOUCH.fontBase` (Tournament) vs `TOUCH.fontSm` (Layout, Match)
- Subtitle: LeagueBadge+YearBadge+"· N bunkers" (Layout) vs LeagueBadge+YearBadge (Tournament) vs nothing
- Right actions: Edit button on some, nothing on others
- LayoutDetail has thumbnail in header (only screen that does this)

### Target spec
```
TAB PAGES (Home, Layouts, Teams, Players):
┌──────────────────────────────────────┐
│ Title                          [act] │
└──────────────────────────────────────┘

DETAIL PAGES:
┌──────────────────────────────────────┐
│ ← Parent   Title  [NXL][2026] [✏️]  │
└──────────────────────────────────────┘
```

### Props
```jsx
<PageHeader
  back={{ label: 'Tournament', to: '/tournament/xyz' }}  // omit for tab pages
  title="Tampa"
  badges={<><LeagueBadge league="NXL" /> <YearBadge year={2026} /></>}
  subtitle="Pt 3"  // optional small text below title
  right={<Btn variant="ghost" size="sm" onClick={edit}><Icons.Edit /></Btn>}
/>
```

### Implementation
```jsx
export function PageHeader({ back, title, badges, subtitle, right }) {
  const navigate = useNavigate();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
      background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
    }}>
      {back && (
        <div onClick={() => typeof back.to === 'function' ? back.to() : navigate(back.to)}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
            color: COLORS.accent, flexShrink: 0 }}>
          <Icons.Back />
          {back.label && (
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>
              {back.label}
            </span>
          )}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {badges}
        </div>
        {subtitle && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
```

### Usage per screen
| Screen | back | title | badges | subtitle | right |
|--------|------|-------|--------|----------|-------|
| HomePage | — | Logo (custom, keep as-is) | — | — | Theme + Logout |
| LayoutsPage | — | "Layouts" | — | — | — |
| TeamsPage | — | "Teams" | — | — | — |
| PlayersPage | — | "Players" | — | — | — |
| LayoutDetailPage | `← Layouts` → `/layouts` | Layout name | League+Year | — | ✏️ Edit |
| TournamentPage | `← Home` → `/` | Tournament name | League+Year+Division | — | ✏️ Edit |
| ScoutedTeamPage | `← TournamentName` → `/tournament/{id}` | Team name | — | — | — |
| TacticPage | `← Layout`/`← TournamentName` | Tactic name | — | — | — |
| MatchPage (heatmap) | `← TournamentName` → `/tournament/{id}` | Match name | — | — | — |
| MatchPage (editor) | `←` → `/tournament/{id}` | Match name | — | "Pt N" | — |
| TeamDetailPage | `← Teams` → `/teams` | Team name | — | — | ✏️ Edit |

**NOTE:** HomePage keeps its custom header with logo image — don't use PageHeader there.

---

## COMPONENT 2: `<ModeTabBar>`
**File:** `src/components/ModeTabBar.jsx` (NEW)

### Current state (3 screens, all different)
- **LayoutDetailPage:** `flex: '0 0 auto'`, overflowX auto, NOT sticky, `minWidth: 56`
- **TacticPage:** `flex: '0 0 auto'`, overflowX auto, NOT sticky, `minWidth: 52`
- **MatchPage (editor):** Action bar with `flex: 1` buttons, NOT sticky

### Target spec
Sticky at bottom, tabs fill full width equally, consistent styling.
```
┌─────┬─────┬─────┬─────┬─────┐
│ 👁  │ 🏷  │ 📏  │ 📐  │ ⚔️  │
│Prev │Bnkr │Lines│Cal. │Tact │
└─────┴─────┴─────┴─────┴─────┘
```

### Props
```jsx
<ModeTabBar
  tabs={[
    { id: 'preview', icon: '👁', label: 'Preview' },
    { id: 'bunkers', icon: '🏷', label: 'Bunkers' },
  ]}
  active="preview"
  onChange={(id) => setActiveMode(id)}
/>
```

### Implementation
```jsx
export function ModeTabBar({ tabs, active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      borderTop: `1px solid ${COLORS.border}`,
      background: COLORS.surface,
      position: 'sticky', bottom: 0, zIndex: 20,
      paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    }}>
      {tabs.map(t => (
        <div key={t.id} onClick={() => onChange(t.id)}
          style={{
            flex: 1,
            padding: '10px 4px',
            cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            borderTop: active === t.id ? `2px solid ${COLORS.accent}` : '2px solid transparent',
            color: active === t.id ? COLORS.accent : COLORS.textMuted,
          }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: active === t.id ? 700 : 400 }}>
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

### Usage per screen
| Screen | Tabs |
|--------|------|
| LayoutDetailPage | Preview, Bunkers, Lines, Calib, Tactics |
| TacticPage | Place, Shots, Draw, Counter, Save |
| MatchPage (editor) | Place, Hit, Shot, ↩ Undo, ✓ OK |

---

## COMPONENT 3: `<ActionBar>`
**File:** `src/components/ActionBar.jsx` (NEW)

### Current state
MatchPage has a bottom action bar (Place/Hit/Shot/OK) that is styled differently from mode tabs. It uses `flex: 1` per button but isn't sticky, has different padding, and uses `Btn` components instead of icon+label columns.

### Target spec
Horizontal button row, sticky bottom, for screens with contextual actions (not navigation tabs).
```
┌──────────┬──────────┬──────────┬──────────┐
│ 📍 Place │ 💀 Hit   │ 📷 Shot  │ ✓ OK     │
└──────────┴──────────┴──────────┴──────────┘
```

### Props
```jsx
<ActionBar
  actions={[
    { id: 'place', icon: '📍', label: 'Place', active: mode === 'place', onClick: ... },
    { id: 'hit', icon: '💀', label: 'Hit', variant: 'danger', onClick: ... },
    { id: 'shot', icon: '📷', label: 'Shot', active: mode === 'shoot', onClick: ... },
    { id: 'ok', icon: '✓', label: 'OK', variant: 'accent', onClick: ... },
  ]}
  extra={undoStack.canUndo && <Btn variant="ghost" size="sm" onClick={handleUndo}>↩</Btn>}
/>
```

### Implementation
```jsx
export function ActionBar({ actions, extra }) {
  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 14px',
      background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
      position: 'sticky', bottom: 0, zIndex: 20,
      paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
    }}>
      {actions.map(a => (
        <Btn key={a.id}
          variant={a.variant || (a.active ? 'accent' : 'default')}
          size="sm"
          onClick={a.onClick}
          style={{ flex: 1, justifyContent: 'center', minHeight: 44, fontWeight: a.active ? 700 : 400 }}>
          {a.icon} {a.label}
        </Btn>
      ))}
      {extra}
    </div>
  );
}
```

### Usage per screen
| Screen | Actions |
|--------|---------|
| MatchPage (editor) | Place, Hit, Shot, ↩, OK |

---

## COMPONENT 4: `<CanvasToolbar>` (= refactored FieldEditor toolbar)
**File:** `src/components/FieldEditor.jsx` (EXISTING — already handles this)

### Current state
- **FieldEditor** already has icon toggle buttons for Lines, Labels, Zones, Visibility, Counter, Draw
- Used in: MatchPage (both views), TacticPage
- NOT used in: LayoutDetailPage (native checkboxes), TournamentPage (native checkboxes), ScoutedTeamPage (no toggles)

### Target spec
FieldEditor becomes THE standard canvas wrapper everywhere. Every screen with a canvas uses it.

### Migration
| Screen | Current | Target |
|--------|---------|--------|
| **LayoutDetailPage** | FieldCanvas direct + checkboxes | Wrap in FieldEditor. Preview mode shows toolbar. Edit modes (bunkers/lines/calib) handled by mode panel below, toolbar still shows read toggles. |
| **TournamentPage** | FieldCanvas direct + checkboxes | Wrap in FieldEditor with `hasBunkers`, `hasZones`, `hasLines`. DELETE checkbox div. |
| **ScoutedTeamPage** | FieldView → HeatmapCanvas | Wrap HeatmapCanvas in FieldEditor. Add `hasBunkers`, `hasLines` toggles. |
| **MatchPage (heatmap)** | Already uses FieldEditor | ✅ Keep as-is |
| **MatchPage (editor)** | Already uses FieldEditor | ✅ Keep as-is |
| **TacticPage** | Already uses FieldEditor | ✅ Keep as-is |

### FieldEditor fixes needed
1. Polish tooltip strings → English: `'Etykiety bunkrów'` → `'Bunker labels'`, `'Strefy'` → `'Zones'`, `'Widoczność'` → `'Visibility'`
2. Heatmap legend text: `'Daltonizm'` → `'Colorblind'`, `'Standard'` → `'Standard'` (OK), `'Przełącz schemat kolorów (daltonizm)'` → `'Toggle colorblind mode'`

---

## COMPONENT 5: `<HeatmapToggle>`
**File:** `src/components/ui.jsx` (add to existing)

### Current state
Two screens show Positions/Shots toggle buttons for heatmap view — code is copy-pasted:
- **MatchPage** lines ~491-494
- **ScoutedTeamPage** lines ~132-133

### Target spec
```
[🔥 Positions] [🎯 Shots]
```

### Props
```jsx
<HeatmapToggle value={heatmapType} onChange={setHeatmapType} />
```

### Implementation
```jsx
export function HeatmapToggle({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Btn variant="default" active={value === 'positions'} size="sm"
        onClick={() => onChange('positions')}>
        <Icons.Heat /> Positions
      </Btn>
      <Btn variant="default" active={value === 'shooting'} size="sm"
        onClick={() => onChange('shooting')}>
        <Icons.Target /> Shots
      </Btn>
    </div>
  );
}
```

### Usage
| Screen | Location |
|--------|----------|
| MatchPage (heatmap) | Above canvas, in controls row |
| ScoutedTeamPage | Above heatmap canvas |

---

## COMPONENT 6: `<BottomSheet>`
**File:** `src/components/BottomSheet.jsx` (NEW)

### Current state
3 screens implement bottom sheets from scratch with slightly different animation/styling:
- **MatchPage** save sheet (lines ~872-950): backdrop + sliding panel
- **BunkerCard** (component): similar pattern
- **OCRBunkerDetect** (component): similar pattern

### Target spec
Reusable bottom sheet with backdrop, slide-up animation, handle bar, safe-area padding.

### Props
```jsx
<BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)} title="Point outcome">
  {/* content */}
</BottomSheet>
```

### Implementation
```jsx
export function BottomSheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 90, animation: 'fadeIn 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        borderRadius: '14px 14px 0 0', padding: '8px 16px 16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '50vh', overflowY: 'auto',
      }}>
        {/* Handle bar */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>
        {title && (
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase,
            color: COLORS.text, marginBottom: 10 }}>
            {title}
          </div>
        )}
        {children}
      </div>
    </>
  );
}
```

### Usage
| Screen | Content |
|--------|---------|
| MatchPage | Save point sheet (outcome buttons, penalties, comment, save) |
| LayoutDetailPage | BunkerCard (refactor to use BottomSheet) |
| LayoutDetailPage | OCR panel (refactor to use BottomSheet) |

---

## ADDITIONAL FIXES

### A. BottomNav scope
**File:** `src/components/BottomNav.jsx`
**Current:** Hidden on `/layout/*`, `/team/*`, `/tournament/*` via regex patterns.
**Issue:** Already correct — detail pages hide it. Verify it works on all routes.

### B. Content padding for tab pages
**Files:** HomePage, LayoutsPage, TeamsPage, PlayersPage
**Current:** `paddingBottom: 64` (hardcoded for BottomNav clearance)
**Target:** `paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))'` — accounts for notch devices.

### C. Translation sweep (remaining Polish strings)
**File locations and strings:**

| File | Line(s) | Polish | English |
|------|---------|--------|---------|
| `FieldEditor.jsx` | ~115 | `'Etykiety bunkrów'` (title attr) | `'Bunker labels'` |
| `FieldEditor.jsx` | ~121 | `'Strefy'` (title attr) | `'Zones'` |
| `FieldEditor.jsx` | ~127 | `'Widoczność'` (title attr) | `'Visibility'` |
| `FieldEditor.jsx` | ~211 | `'Przełącz schemat kolorów (daltonizm)'` | `'Toggle colorblind mode'` |
| `FieldEditor.jsx` | ~212 | `'👁️ Daltonizm'` / `'👁️ Standard'` | `'👁️ Colorblind'` / `'👁️ Standard'` |
| `MatchPage.jsx` | ~723 | `'Pozycja:'` | `'Stance:'` |
| `MatchPage.jsx` | ~725-728 | `'🧍 Stoi'`, `'🧎 Klęczy'`, `'🐍 Leży'` | `'🧍 Stand'`, `'🧎 Kneel'`, `'🐍 Prone'` |
| `MatchPage.jsx` | ~754 | `'Rysuj...'` | `'Draw...'` |
| `MatchPage.jsx` | ~758 | `'Narysuj ścieżkę wroga na mapie'` | `'Draw enemy path on the map'` |
| `MatchPage.jsx` | ~775 | `'pozycji'` | `'positions'` |
| `ScoutedTeamPage.jsx` | ~117 | `'Turniej'` | `'Tournament'` |
| `App.jsx` | ~31 | `'Sprawdzanie sesji...'` | `'Checking session...'` |
| `App.jsx` | ~33 | `'Przygotowanie danych...'` | `'Preparing data...'` |
| `App.jsx` | ~37 | `'Ładowanie...'` | `'Loading...'` |
| `App.jsx` | ~74 | `'Którą ręką obsługujesz telefon?'` | `'Which hand do you use?'` |
| `App.jsx` | ~76 | `'Dostosuje pozycję lupy na ekranie'` | `'Adjusts loupe position on screen'` |
| `App.jsx` | ~84 | `'🫲 Lewa'` / `'🫱 Prawa'` | `'🫲 Left'` / `'🫱 Right'` |
| `ui.jsx` | ~201 | `Loading({ text = 'Ładowanie...' })` | `Loading({ text = 'Loading...' })` |

---

## EXECUTION ORDER

### Phase 1 — Create components (1 session)
1. Create `PageHeader` in `src/components/PageHeader.jsx`
2. Create `ModeTabBar` in `src/components/ModeTabBar.jsx`
3. Create `ActionBar` in `src/components/ActionBar.jsx`
4. Create `BottomSheet` in `src/components/BottomSheet.jsx`
5. Add `HeatmapToggle` to `src/components/ui.jsx`
6. Translation sweep (all Polish strings from table above)

### Phase 2 — Apply PageHeader (1 session)
7. Replace header in LayoutDetailPage → PageHeader
8. Replace header in TournamentPage → PageHeader
9. Replace header in ScoutedTeamPage → PageHeader
10. Replace header in TacticPage → PageHeader
11. Replace header in MatchPage (both views) → PageHeader
12. Replace header in TeamDetailPage → PageHeader
13. Replace header in tab pages (Layouts, Teams, Players) → PageHeader
14. (Skip HomePage — keep custom logo header)

### Phase 3 — Apply ModeTabBar + ActionBar (1 session)
15. Replace LayoutDetailPage mode tabs → ModeTabBar
16. Replace TacticPage mode tabs → ModeTabBar
17. Replace MatchPage action bar → ActionBar

### Phase 4 — Canvas wrapper unification (1 session)
18. Wrap LayoutDetailPage canvas in FieldEditor (delete checkboxes)
19. Wrap TournamentPage canvas in FieldEditor (delete checkboxes)
20. Wrap ScoutedTeamPage heatmap in FieldEditor
21. Fix FieldEditor Polish strings

### Phase 5 — Bottom sheet + cleanup
22. Extract BottomSheet, refactor MatchPage save sheet
23. Refactor BunkerCard to use BottomSheet
24. Apply HeatmapToggle to MatchPage + ScoutedTeamPage
25. Fix tab page bottom padding for safe area

---

## TESTING CHECKLIST
- [ ] All 11 screens have consistent header (font, padding, back pattern)
- [ ] All canvas screens use FieldEditor with icon toggle buttons (no checkboxes)
- [ ] Mode tabs on Layout/Tactic: fill full width, sticky at bottom, safe-area padding
- [ ] Action bar on Match editor: sticky at bottom, safe-area padding
- [ ] All UI text in English (no Polish strings remain)
- [ ] Tab pages (Home/Layouts/Teams/Players): BottomNav visible, `paddingBottom` includes safe-area
- [ ] Detail pages: BottomNav hidden, page has own bottom bar
- [ ] Heatmap views: consistent Positions/Shots toggle component
- [ ] Bottom sheets: consistent animation, handle bar, safe-area
- [ ] Test on 375px mobile width
- [ ] Test on landscape orientation
