# CC Brief: Tactic Page Redesign

## Context
TacticPage is being rewritten from scratch. Current page has 834 lines, 20+ state variables, multi-step system, freehand drawing, counter-play analysis, visibility heatmaps, stance selector, ModeTabBar — all of which are being REMOVED. The new page uses the **same interaction model as the scouting editor** (MatchPage): full-height canvas, floating toolbar on player tap, drag-to-bump, ShotDrawer for shots.

**Read before starting:** `DESIGN_DECISIONS.md` (especially sections 1.4, 2.2, 11), `src/pages/MatchPage.jsx` (the scouting editor view — your reference implementation), `src/components/FieldCanvas.jsx`, `src/components/ui.jsx`, `src/utils/theme.js`

**Key principle:** If MatchPage scouting editor does it one way, TacticPage does it the same way. When in doubt, copy the pattern from MatchPage.

---

## Part 1: Delete current TacticPage

### 1A. Gut the file
Delete the entire contents of `src/pages/TacticPage.jsx` and start fresh. The current implementation is not salvageable — too many tangled features.

### 1B. Remove unused imports from the codebase
After rewrite, these should no longer be imported in TacticPage:
- `FieldEditor` — not used (no Labels/Lines/Zones toggles)
- `ModeTabBar` — not used (no mode tabs)
- `useVisibility` / `useVisibilityPage` — not used (no heatmap/counter)
- `PlayerChip` — not used (no chip strip)

**Do NOT delete these components** — they're used elsewhere. Just don't import them in TacticPage.

---

## Part 2: New TacticPage — Structure

### Full-screen layout (`100dvh`, same as MatchPage editor)
```
┌─────────────────────────────────┐
│  PageHeader                     │  sticky, z-index 20
│  ‹ Layout    Tactic name    ⋮   │
├─────────────────────────────────┤
│                                 │
│                                 │
│         FieldCanvas             │  flex: 1 (fills remaining height)
│      full field, pinch-zoom     │  maxCanvasHeight like MatchPage
│         bunkers visible         │
│                                 │
│      [floating toolbar]         │  appears on player tap
│                                 │
├─────────────────────────────────┤
│  [ ████████ Save tactic ██████ ]│  amber, full-width
└─────────────────────────────────┘
```

### 2A. Page container
```jsx
<div style={{
  height: '100dvh',
  maxWidth: R.layout.maxWidth || 640,
  margin: '0 auto',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
}}>
```
Same pattern as MatchPage editor view (line ~555 of MatchPage.jsx).

### 2B. Header — use PageHeader component
```jsx
<PageHeader
  back={{ label: 'Layout', to: `/layout/${layoutId}` }}
  title={tactic?.name || 'Tactic'}
  right={<MoreBtn onClick={() => setMenuOpen(true)} />}
/>
```

### 2C. ⋮ ActionSheet
```jsx
<ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
  { label: 'Rename', onPress: () => setRenameModal(true) },
  { label: 'Print', onPress: () => window.print() },
  { separator: true },
  { label: 'Delete tactic', danger: true, onPress: () => setDeleteModal(true) },
]} />
```

### 2D. Canvas — FieldCanvas direct (NO FieldEditor wrapper)
```jsx
<div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
  <FieldCanvas
    fieldImage={field.fieldImage}
    maxCanvasHeight={typeof window !== 'undefined' ? window.innerHeight - 200 : 500}
    players={players}
    shots={shots}
    bumpStops={bumps}
    onPlacePlayer={handlePlacePlayer}
    onMovePlayer={handleMovePlayer}
    onPlaceShot={handlePlaceShot}
    onDeleteShot={handleDeleteShot}
    onBumpPlayer={handleBumpPlayer}
    onSelectPlayer={handleSelectPlayer}
    editable
    selectedPlayer={selPlayer}
    mode={shotMode !== null ? 'shoot' : 'place'}
    toolbarPlayer={toolbarPlayer}
    toolbarItems={toolbarItems}
    onToolbarAction={handleToolbarAction}
    bunkers={field.bunkers || []}
    fieldCalibration={field.fieldCalibration}
    discoLine={0}
    zeekerLine={0}
  />
</div>
```

**Important props NOT passed** (vs MatchPage):
- No `viewportSide` — full field, not half
- No `eliminations` / `eliminationPositions` — no hit tracking
- No `playerAssignments` / `rosterPlayers` — no roster binding
- No `opponentPlayers` / `showOpponentLayer` — no opponent

### 2E. Bottom bar
```jsx
<div style={{
  padding: '10px 12px',
  background: COLORS.surface,
  borderTop: `1px solid ${COLORS.border}`,
  paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
}}>
  <Btn variant="accent"
    style={{ width: '100%', padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700 }}
    onClick={handleSave}
    disabled={!isDirty || saving}>
    {saving ? 'Saving...' : 'Save tactic'}
  </Btn>
</div>
```

---

## Part 3: Player Interaction

### 3A. Toolbar items — only 2 actions (NOT 4 like scouting)
```jsx
const toolbarItems = useMemo(() => {
  if (toolbarPlayer === null) return [];
  return [
    { icon: '🎯', label: 'Shot', color: COLORS.textDim, action: 'shoot' },
    { icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' },
  ];
}, [toolbarPlayer]);
```

**No Assign** — no roster on tactic level.
**No Hit/Alive** — irrelevant for pre-game planning.
**No Bump** — bump is a drag side-effect, never a menu action.

### 3B. Toolbar action handler
```jsx
const handleToolbarAction = (action, idx) => {
  if (action === 'close') { setToolbarPlayer(null); return; }
  if (action === 'shoot') { setShotMode(idx); setToolbarPlayer(null); }
  if (action === 'remove') { removePlayer(idx); setToolbarPlayer(null); }
};

const handleSelectPlayer = (idx) => {
  setToolbarPlayer(toolbarPlayer === idx ? null : idx);
};
```

### 3C. Place / Move / Bump handlers — copy from MatchPage pattern
```jsx
const handlePlacePlayer = (pos) => {
  setPlayers(prev => {
    const next = [...prev];
    const idx = next.findIndex(p => p === null);
    if (idx >= 0) { next[idx] = pos; setSelPlayer(idx); }
    return next;
  });
};

const handleMovePlayer = (idx, pos) => {
  setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
};

const handleBumpPlayer = (idx, fromPos) => {
  setBumps(prev => { const n = [...prev]; n[idx] = { x: fromPos.x, y: fromPos.y }; return n; });
};

const removePlayer = (idx) => {
  setPlayers(prev => prev.map((p, i) => i === idx ? null : p));
  setShots(prev => prev.map((s, i) => i === idx ? [] : s));
  setBumps(prev => prev.map((b, i) => i === idx ? null : b));
  setSelPlayer(null);
};
```

### 3D. Shot handlers + ShotDrawer
```jsx
const handlePlaceShot = (pi, pos) => {
  setShots(prev => { const n = prev.map(a => [...a]); n[pi].push(pos); return n; });
};

const handleDeleteShot = (pi, si) => {
  setShots(prev => { const n = prev.map(a => [...a]); n[pi].splice(si, 1); return n; });
};
```

ShotDrawer — same as MatchPage:
```jsx
<ShotDrawer
  open={shotMode !== null}
  onClose={() => setShotMode(null)}
  playerIndex={shotMode}
  playerLabel={shotMode !== null ? `P${shotMode + 1}` : ''}
  playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
  fieldSide="left"
  fieldImage={field.fieldImage}
  bunkers={field.bunkers || []}
  shots={shotMode !== null ? (shots[shotMode] || []) : []}
  onAddShot={pos => { if (shotMode !== null) handlePlaceShot(shotMode, pos); }}
  onUndoShot={() => {
    if (shotMode !== null && shots[shotMode]?.length) {
      handleDeleteShot(shotMode, shots[shotMode].length - 1);
    }
  }}
/>
```

Note: `fieldSide="left"` — in tactics the "home" side is always left (no side flip).

---

## Part 4: State Management

### 4A. State — flat, simple
```jsx
const [players, setPlayers] = useState([null, null, null, null, null]);
const [shots, setShots] = useState([[], [], [], [], []]);
const [bumps, setBumps] = useState([null, null, null, null, null]);

const [selPlayer, setSelPlayer] = useState(null);
const [toolbarPlayer, setToolbarPlayer] = useState(null);
const [shotMode, setShotMode] = useState(null);
const [menuOpen, setMenuOpen] = useState(false);
const [renameModal, setRenameModal] = useState(false);
const [deleteModal, setDeleteModal] = useState(false);
const [saving, setSaving] = useState(false);
```

**No `localSteps`**, no `currentStep`, no `visibleSteps`, no `freehandStrokes`, no `counterMode`, no `showVisibility`, no `stanceOverride`. 12 state vars total vs current 20+.

### 4B. Load from Firestore
```jsx
const tactic = tactics.find(t => t.id === tacticId);

useEffect(() => {
  if (!tactic) return;
  setPlayers(tactic.players || [null, null, null, null, null]);
  setShots((tactic.shots || [[], [], [], [], []]).map(s =>
    Array.isArray(s) ? s : Object.values(s)
  ));
  setBumps(tactic.bumps || [null, null, null, null, null]);
}, [tactic?.id]);
```

Handle Firestore object-vs-array for shots (same crash fix as elsewhere).

### 4C. Save to Firestore
```jsx
const isDirty = /* compare players/shots/bumps to tactic doc */;

const handleSave = async () => {
  setSaving(true);
  try {
    await ds.updateLayoutTactic(layoutId, tacticId, {
      players,
      shots: ds.shotsToFirestore(shots),
      bumps,
    });
  } catch (e) {
    console.error('Save error:', e);
  } finally {
    setSaving(false);
  }
};
```

### 4D. Field data — from layout
```jsx
const { layouts } = useLayouts();
const layout = layouts.find(l => l.id === layoutId);

const field = {
  fieldImage: layout?.fieldImage,
  bunkers: layout?.bunkers || [],
  fieldCalibration: layout?.fieldCalibration || null,
};
```

No tournament lookup needed — tactic is always layout-scoped.

---

## Part 5: Rename & Delete modals

### 5A. Rename modal
```jsx
<Modal open={renameModal} onClose={() => setRenameModal(false)} title="Rename tactic"
  footer={<>
    <Btn variant="default" onClick={() => setRenameModal(false)}>Cancel</Btn>
    <Btn variant="accent" onClick={handleRename}><Icons.Check /> Save</Btn>
  </>}>
  <Input value={newName} onChange={setNewName} placeholder="Tactic name" />
</Modal>
```

### 5B. Delete — ConfirmModal
```jsx
<ConfirmModal
  open={deleteModal}
  onClose={() => setDeleteModal(false)}
  onConfirm={async () => {
    await ds.deleteLayoutTactic(layoutId, tacticId);
    navigate(`/layout/${layoutId}`);
  }}
  title="Delete tactic"
  message="This tactic and all its data will be permanently lost."
  confirmLabel="Delete"
  danger
/>
```

---

## Part 6: Print support

### 6A. Print CSS — add to `src/styles/index.css` or inline
```css
@media print {
  body { background: white !important; }
  /* Hide everything except the tactic canvas */
  .no-print { display: none !important; }
  /* Canvas container fills the page */
  .print-area {
    width: 100% !important;
    height: auto !important;
  }
  /* Tactic name as print header */
  .print-title {
    display: block !important;
    font-size: 24px;
    font-weight: 700;
    text-align: center;
    margin-bottom: 16px;
    color: #000;
  }
}
```

### 6B. Print elements in JSX
Add a hidden print title that shows only when printing:
```jsx
<div className="print-title" style={{ display: 'none' }}>
  {tactic?.name}
</div>
```

Mark non-printable elements:
- PageHeader → add `className="no-print"`
- Bottom bar → add `className="no-print"`
- ActionSheet, Modals → already hidden when closed

---

## Part 7: LayoutDetailPage — add Print to tactic ActionSheet

### 7A. Update tactic ⋮ menu
In `src/pages/LayoutDetailPage.jsx`, find the tactic ActionSheet (~line 321) and add Print:

**Current:**
```jsx
<ActionSheet open={!!tacticMenu} onClose={() => setTacticMenu(null)} actions={[
  { label: 'Edit', onPress: () => navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}`) },
  { label: 'Duplicate', onPress: () => duplicateTactic(tacticMenu) },
  { separator: true },
  { label: 'Delete tactic', onPress: () => setDeleteTacticModal(tacticMenu), danger: true },
]} />
```

**New:**
```jsx
<ActionSheet open={!!tacticMenu} onClose={() => setTacticMenu(null)} actions={[
  { label: 'Edit', onPress: () => navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}`) },
  { label: 'Duplicate', onPress: () => duplicateTactic(tacticMenu) },
  { label: 'Print', onPress: () => {
    setTacticMenu(null);
    navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}?print=1`);
  }},
  { separator: true },
  { label: 'Delete tactic', onPress: () => setDeleteTacticModal(tacticMenu), danger: true },
]} />
```

### 7B. Auto-print on TacticPage when `?print=1`
In TacticPage, check for print query param on mount:
```jsx
useEffect(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('print') === '1' && tactic) {
    // Wait for canvas to render, then print
    setTimeout(() => window.print(), 500);
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname);
  }
}, [tactic?.id]);
```

### 7C. Update tactic card subtitle on LayoutDetailPage
Current subtitle shows step count (`${t.steps?.length || 0} steps`) which no longer applies.

**Change to:**
```jsx
subtitle={`${(t.players || []).filter(Boolean).length}/5 players`}
```

---

## Part 8: Data migration

### 8A. Flatten steps → single state
Current Firestore tactic doc:
```js
{
  name: 'Snake push',
  steps: [{
    players: [...],
    shots: [...],
    assignments: [...],
    bumps: [...],
    description: '...',
  }],
  freehandStrokes: [...],
}
```

New doc shape:
```js
{
  name: 'Snake push',
  players: [...],      // from steps[0].players
  shots: [...],        // from steps[0].shots
  bumps: [...],        // from steps[0].bumps
  // NO steps[], assignments[], freehandStrokes, description
}
```

### 8B. Migration on read (backward compat)
In TacticPage load effect, handle both old and new format:
```jsx
useEffect(() => {
  if (!tactic) return;
  // New format: flat players/shots/bumps
  if (tactic.players) {
    setPlayers(tactic.players);
    setShots(/* ... */);
    setBumps(tactic.bumps || [null,null,null,null,null]);
  }
  // Old format: steps[0]
  else if (tactic.steps?.[0]) {
    const s = tactic.steps[0];
    setPlayers(Array.isArray(s.players) ? s.players : Object.values(s.players || {}));
    setShots(/* handle array/object ... */);
    setBumps(Array.isArray(s.bumps) ? s.bumps : [null,null,null,null,null]);
  }
}, [tactic?.id]);
```

On save, always write the new flat format. Old `steps` field will be overwritten.

---

## Checklist before commit

- [ ] TacticPage renders with PageHeader (‹ Layout, title, ⋮)
- [ ] Canvas fills remaining height (flex:1, maxCanvasHeight)
- [ ] Tap canvas → place player (P1–P5, numbered circles, no names)
- [ ] Tap placed player → floating toolbar with Shot + Del only
- [ ] Drag player > 8% → bump stop created at start position
- [ ] Shot → ShotDrawer opens (side panel)
- [ ] Del → player removed
- [ ] Save button works (amber, disabled when clean)
- [ ] ⋮ → Rename works (Modal + Input)
- [ ] ⋮ → Print works (window.print with @media print CSS)
- [ ] ⋮ → Delete works (ConfirmModal → navigate to layout)
- [ ] LayoutDetailPage tactic ActionSheet has Print option
- [ ] LayoutDetailPage tactic card subtitle shows player count (not step count)
- [ ] Old tactic data (steps[0] format) loads correctly
- [ ] New tactic data saves in flat format
- [ ] No imports of: FieldEditor, ModeTabBar, useVisibility, PlayerChip
- [ ] `npm run precommit` passes
- [ ] English UI labels only
