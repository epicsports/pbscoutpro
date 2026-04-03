# Layout Detail — UX Redesign v2
## "Map editing" pattern: tap on canvas → card slides in

### Delete FIX_ONE_CANVAS.md and CRITICAL_UI_FIXES.md — this replaces both.

---

## Core concept

Layout detail page has ONE mode: **you're looking at the field**.
Everything happens ON or AROUND the canvas.

```
┌─ ← Layouts > Tampa ──────────────┐
│ ┌──────┐                          │
│ │thumb │ Tampa · PXL · 2026  [✏️] │  ← small thumbnail + info inline
│ └──────┘                          │
│                                   │
│ ☑Labels ☑Lines ☐Zones [🔍 Zoom]  │  ← toggle row
│ ┌───────────────────────────────┐ │
│ │                               │ │
│ │       CANVAS (full width)     │ │  ← THE canvas, always visible
│ │                               │ │
│ │    tap bunker → card slides   │ │
│ │                               │ │
│ └───────────────────────────────┘ │
│                                   │
│ [⚙️ Setup] [⚔️ Taktyki (2)]     │  ← action buttons at bottom
└───────────────────────────────────┘
```

### When user taps a bunker on canvas:

**Bottom sheet slides up** (30-40% of screen height):

```
┌───────────────────────────────────┐
│         CANVAS (visible above)    │
│                                   │
├─── drag handle ───────────────────┤
│ 🏷️ D1                            │
│ Nazwa: [D1          ]            │
│ Typ:   [SD Small Dorito · 0.85m] │
│ Mirror: D1 (prawa strona)        │
│ [🗑️ Usuń]           [✓ Zapisz]  │
└───────────────────────────────────┘
```

- Slide up from bottom (CSS transform, 200ms)
- Drag handle to resize (30% → 50% → dismiss)
- Canvas above is still visible — user sees WHICH bunker they're editing
- Tap outside card or swipe down → dismiss
- Type selector: tap type field → shows grouped list inline (not separate screen)

### When user taps empty space on canvas (in add mode):

Same bottom sheet but for NEW bunker:
```
├─── drag handle ───────────────────┤
│ + Nowy bunkier                    │
│ Nazwa: [np. SNAKE, D1]          │  ← auto-focus, keyboard opens
│ Typ:   [auto: Br Brick · 1.15m] │  ← auto-guessed from name
│ [Anuluj]              [✓ Dodaj] │
│ ☑ Mirror (dodaj lustrzany)       │
└───────────────────────────────────┘
```

---

## Page structure (simplified)

### Top bar: thumbnail + info
```jsx
<div style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'center' }}>
  <img src={layout.fieldImage} style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6 }} />
  <div>
    <div style={{ fontWeight: 700 }}>{layout.name}</div>
    <div style={{ fontSize: 12, color: COLORS.textDim }}>
      <LeagueBadge league={layout.league} /> {layout.year} · {bunkers.length} bunkrów
    </div>
  </div>
  <Btn size="sm" onClick={() => setShowInfoModal(true)}>✏️</Btn>
</div>
```

Tap ✏️ → modal for editing name, league, year, image upload. NOT a whole section.

### Canvas area (always visible, takes most of screen)
```jsx
<div style={{ flex: 1 }}>
  {/* Toggle row */}
  <div style={{ display: 'flex', gap: 8, padding: '4px 12px' }}>
    <Checkbox label="Nazwy" checked={showBunkers} onChange={setShowBunkers} />
    <Checkbox label="Linie" checked={showLines} onChange={setShowLines} />
    <Checkbox label="Strefy" checked={showZones} onChange={setShowZones} />
    <div style={{ marginLeft: 'auto' }}><ZoomBtn /></div>
  </div>
  
  {/* THE canvas */}
  <FieldCanvas
    fieldImage={layout.fieldImage}
    bunkers={layout.bunkers}
    showBunkers={showBunkers}
    // ... all props
    onBunkerTap={(bunkerId) => openBunkerCard(bunkerId)}
    onEmptyTap={(pos) => openNewBunkerCard(pos)}
  />
</div>
```

### Bottom action buttons (below canvas, sticky or fixed)
```jsx
<div style={{ display: 'flex', gap: 8, padding: 12 }}>
  <Btn onClick={() => setSetupMode(true)}>⚙️ Setup</Btn>
  <Btn onClick={() => openTactics()}>⚔️ Taktyki ({tactics.length})</Btn>
</div>
```

**⚙️ Setup** → opens full-screen modal or bottom sheet with:
- Disco/Zeeker sliders
- Kalibracja (drag markers on mini canvas)
- Danger/Sajgon zone editor (polygon tool)

**⚔️ Taktyki** → opens bottom sheet with tactic list + "Nowa taktyka" button.
Tap tactic → navigates to TacticPage.

---

## BunkerCard component (bottom sheet)

New shared component: `src/components/BunkerCard.jsx`

```jsx
export default function BunkerCard({ bunker, isNew, onSave, onDelete, onClose }) {
  // Slides up from bottom
  // Fields: name, type (selector), height (auto from type)
  // Type selector: grouped pills (Low/Med/Tall) inline
  // Save: calls onSave with updated bunker data
  // Delete: confirms then calls onDelete
  // Close: swipe down or tap backdrop
}
```

### Type selector inside BunkerCard:
NOT a separate screen. Inline expandable:
```
Typ: [SD Small Dorito · 0.85m  ▼]
     ┌─────────────────────────┐
     │ Niskie ≤0.9m            │
     │ [SB 0.76] [SD 0.85] [Tr]│
     │ Średnie 1.0-1.2m        │
     │ [MD 1m] [Ck] [Br] [C]  │
     │ Wysokie ≥1.4m           │
     │ [Wg] [GP] [T] [GB]...  │
     └─────────────────────────┘
```
Small chips, 2-column. Tap one → collapses, shows selected.

---

## Bugs to fix in same PR

### Blank screen (Image 1)
Lazy loading without proper Suspense fallback on LayoutDetailPage.
Add: `const LayoutDetailPage = lazy(() => import('./pages/LayoutDetailPage'));`
And ensure `<Suspense fallback={<Loading />}>` wraps routes.

### Tactics not loading
Check if `useLayoutTactics(layoutId)` returns data. Likely:
- layoutId is undefined (route param issue)
- Or Firestore subcollection path is wrong after security changes

Debug: add `console.log('layoutId:', layoutId, 'tactics:', tactics)` in LayoutDetailPage.

---

## Implementation order

1. Fix blank screen + tactics loading (bugs, 10 min)
2. Restructure page: thumbnail+info top, canvas full width, action buttons bottom
3. Build BunkerCard bottom sheet component
4. Wire tap interactions: tap bunker → card, tap empty → new card
5. Move setup (disco/zeeker/calibration/zones) to ⚙️ Setup modal
6. Move tactics list to ⚔️ Taktyki bottom sheet
7. Delete old accordion sections
