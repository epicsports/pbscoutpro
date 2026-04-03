# CC MASTER BRIEF: UI Unification + Loupe Fix
**Priority:** HIGHEST — do this session
**Rules:** Inline JSX only (COLORS/FONT/TOUCH from theme.js). English UI. Mobile-first 44px targets.
**Theme:** Dark mode primary. JetBrains Mono font. Amber (#f59e0b) accent.

---

## FIX 0: Loupe behavior (FieldCanvas.jsx)

### Problem A: Loupe stays visible after placing
After placing a player, the loupe stays visible until `handleEnd` sets `activeTouchPos(null)`.
But on mobile, user often taps quickly (touchStart → touchEnd in <100ms). The loupe flashes briefly — fine.
The real problem: when user drags to position, loupe stays visible covering the area they want to see.
After releasing (touchEnd), the loupe should disappear IMMEDIATELY.

**Current:** `handleEnd` already calls `setActiveTouchPos(null)`. This should work.
But `handleStart` immediately calls `onPlacePlayer(pos)` (line ~821) which triggers a re-render,
and the loupe shows during the entire drag if the user holds.

**Fix:** Loupe should only show during ACTIVE TOUCH (finger down + moving), and hide on touchEnd.
This already works. The real issue is:

### Problem B: Placing player triggers bump on hold
On mobile, user taps to place player. If they hold even slightly (>500ms), bump dial activates.
This is confusing because they just want to place, not bump.

**Fix — change the interaction model:**
```
TAP (< 300ms)     → place player at position, NO loupe needed (instant action)
HOLD (> 500ms)    → show loupe + start drag mode for fine positioning
                    → on release: place player at final position
DRAG existing     → show loupe + move player
                    → on release: confirm position, hide loupe
BUMP              → NOT triggered by hold. Instead: separate "bump mode" button
                    or double-tap on placed player
```

**Implementation in FieldCanvas.jsx handleStart (mode === 'place'):**
```javascript
// Replace lines ~810-828:
const hit = findPlayer(pos);
if (hit >= 0) {
  // Existing player — drag to move
  onSelectPlayer?.(hit);
  setDragging(hit);
  // Show loupe immediately for existing player drag
  // (activeTouchPos already set above at line ~747)
} else if (players.filter(Boolean).length < 5) {
  // New player — DON'T place immediately on touchStart
  // Wait to see if this is a tap or a hold
  const newIdx = players.findIndex(p => p === null);
  longPressPos.current = { ...pos, isNew: true, newIdx, newPos: pos };
  
  // Set a short timer: if released before 200ms = quick tap = place immediately
  // If held longer = enter drag-to-position mode with loupe
  longPressTimer.current = setTimeout(() => {
    // User is holding — enter fine-position mode
    // Player appears at touch position, user can drag to adjust
    didLongPress.current = true;
    onPlacePlayer?.(pos);
    try { navigator.vibrate?.(15); } catch(e) {}
    setDragging(newIdx); // allow drag to adjust position
  }, 200);
}
```

**In handleEnd:**
```javascript
// If the user released before the 200ms timer → quick tap → place at tap position
if (mode === 'place' && !didLongPress.current && dragging === null) {
  clearTimeout(longPressTimer.current);
  const pos = longPressPos.current;
  if (pos?.isNew && players.filter(Boolean).length < 5) {
    onPlacePlayer?.(pos);
    try { navigator.vibrate?.(15); } catch(e) {}
  } else if (pos && !pos.isNew && findPlayer(pos) < 0 && players.filter(Boolean).length < 5) {
    onPlacePlayer?.(pos);
  }
}
// ALWAYS hide loupe on release
setActiveTouchPos(null);
```

**Bump trigger change:**
Remove bump from hold timer entirely. Bump is triggered by:
- The existing bump button/action in the action bar
- Or: tapping the ⏱ icon on a placed player's chip
This is cleaner UX because bump is an advanced action that shouldn't conflict with basic placement.

### Problem C: Loupe shows during drag of existing player — keep this
When dragging an existing player, loupe SHOULD show (user needs precision).
On release, loupe hides. This already works.

---

## COMPONENT 1: `<PageHeader>`

### Visual design
```
DETAIL PAGE:                                   MOBILE 375px
┌──────────────────────────────────────────────────────────┐
│  ←  Layouts    Tampa Bay Open    NXL  2026          ✏️   │
│                                                          │
│  accent        white/text        pills              dim  │
│  12px 500      14px 700          10px 800           icon │
└──────────────────────────────────────────────────────────┘
 padding: 10px 16px
 background: COLORS.surface
 borderBottom: 1px solid COLORS.border
 sticky top: 0, zIndex: 20

TAB PAGE (Home, Layouts, Teams, Players):
┌──────────────────────────────────────────────────────────┐
│  Layouts                                                 │
│                                                          │
│  14px 700, COLORS.text                                   │
└──────────────────────────────────────────────────────────┘
 Same padding/background/border. No back arrow.
```

### Key design decisions
- **Back arrow + parent name** always together as one clickable accent-colored unit
- **Title** is the entity name (layout name, tournament name, match name) — never the parent
- **Badges** (LeagueBadge, YearBadge) sit inline with title, flex-shrink: 0
- **No thumbnails** in headers — the canvas below IS the preview
- **No metadata** (bunker count, step count) in header — that's content
- **Right actions** are icon-only ghost buttons (Edit, more)
- **One font size** for title: `TOUCH.fontBase` (14px) everywhere
- **One padding** everywhere: `10px 16px`

### Implementation
```jsx
// src/components/PageHeader.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Icons } from './ui';
import { COLORS, FONT, TOUCH } from '../utils/theme';

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
        }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          {badges}
        </div>
        {subtitle && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>{subtitle}</div>
        )}
      </div>
      {right}
    </div>
  );
}
```

---

## COMPONENT 2: `<ModeTabBar>`

### Visual design
```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│    👁     │    🏷    │    📏    │    📐    │    ⚔️    │
│ Preview  │ Bunkers  │  Lines  │  Calib.  │Tactics(2)│
└──────────┴──────────┴──────────┴──────────┴──────────┘
 ▲ active tab has 2px amber top border
 
 position: sticky, bottom: 0
 background: COLORS.surface
 borderTop: 1px solid COLORS.border
 paddingBottom: env(safe-area-inset-bottom)
 
 Each tab: flex: 1 (fills width equally)
 Icon: 18px
 Label: 10px, fontWeight 400 (700 when active)
 Active color: COLORS.accent
 Inactive color: COLORS.textMuted
 Padding: 10px 4px
 Min touch target: naturally 48px+ because of flex: 1
```

### Key design decisions
- **Always sticky bottom** — never scrolls away
- **Equal width tabs** — `flex: 1`, no overflow scroll
- **Max 6 tabs** — beyond that, consider grouping
- **Active indicator** is top border (2px amber), matching iOS tab bar pattern
- **No badge numbers in tab labels** except for dynamic counts like "Tactics (2)"
- **Consistent with BottomNav** styling (same height, same icon/label pattern)

### Implementation
```jsx
// src/components/ModeTabBar.jsx
import React from 'react';
import { COLORS, FONT } from '../utils/theme';

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
            borderTop: active === t.id
              ? `2px solid ${COLORS.accent}`
              : '2px solid transparent',
            color: active === t.id ? COLORS.accent : COLORS.textMuted,
          }}>
          <span style={{ fontSize: 18 }}>{t.icon}</span>
          <span style={{ fontFamily: FONT, fontSize: 10,
            fontWeight: active === t.id ? 700 : 400 }}>
            {t.label}
          </span>
        </div>
      ))}
    </div>
  );
}
```

---

## COMPONENT 3: `<ActionBar>`

### Visual design
```
┌────────────┬────────────┬────────────┬────┬────────────┐
│  📍 Place  │  💀 Hit    │  📷 Shot   │ ↩  │   ✓ OK     │
│  ▓▓▓▓▓▓▓▓  │            │            │    │  ▓▓▓▓▓▓▓▓  │
│  (active)  │            │            │    │  (accent)  │
└────────────┴────────────┴────────────┴────┴────────────┘
 
 position: sticky, bottom: 0
 background: COLORS.surface
 borderTop: 1px solid COLORS.border
 padding: 8px 14px + safe-area
 gap: 6px between buttons
 
 Each button: flex: 1, minHeight: 44px, centered
 Uses existing <Btn> component with variant prop
 Active button: variant='accent' (amber bg, black text)
 Inactive: variant='default' (surfaceLight bg)
 Undo: variant='ghost', flex: 0 (compact, only shows when available)
```

### Key design decisions
- **Distinct from ModeTabBar** — this is for actions, not navigation
- Uses existing `<Btn>` component for consistency
- **Undo button** is compact (no flex: 1) and only appears when undo is available
- **OK button** always accent-colored — primary call-to-action
- **Hit button** toggles to `variant='danger'` when player is eliminated

### Implementation
```jsx
// src/components/ActionBar.jsx
import React from 'react';
import { Btn } from './ui';
import { COLORS } from '../utils/theme';

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
          style={{
            flex: a.compact ? '0 0 auto' : 1,
            justifyContent: 'center',
            minHeight: 44,
            fontWeight: a.active ? 700 : 400,
          }}>
          {a.icon} {a.label}
        </Btn>
      ))}
      {extra}
    </div>
  );
}
```

---

## COMPONENT 4: `<BottomSheet>`

### Visual design
```
┌──────────────────────────────────────────────┐
│                    ───                        │  ← drag handle (36×4px, COLORS.border)
│                                              │
│  Point outcome                               │  ← title: 14px 700 COLORS.text
│                                              │
│  [content from caller]                       │
│                                              │
└──────────────────────────────────────────────┘
 
 BACKDROP: fixed inset 0, rgba(0,0,0,0.4), fadeIn 0.15s
 SHEET:
   position: fixed, bottom: 0, left: 0, right: 0
   background: COLORS.surface
   borderTop: 1px solid COLORS.border
   borderRadius: 14px 14px 0 0
   padding: 8px 16px 16px + safe-area bottom
   maxHeight: 50vh, overflowY: auto
   animation: slideUp 0.2s ease-out
   zIndex: 91 (backdrop: 90)
```

### Key design decisions
- **Consistent handle bar** at top — visual affordance for "this is a sheet"
- **Title is optional** — some sheets (BunkerCard) have complex headers
- **50vh max height** — never covers more than half the screen
- **Tap backdrop to close** — standard mobile pattern
- **Safe-area padding** at bottom for notch devices
- **Same animation** everywhere — `slideUp 0.2s ease-out`

### Implementation
```jsx
// src/components/BottomSheet.jsx
import React from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

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
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>
        {title && (
          <div style={{
            fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase,
            color: COLORS.text, marginBottom: 10,
          }}>{title}</div>
        )}
        {children}
      </div>
    </>
  );
}
```

---

## COMPONENT 5: `<HeatmapToggle>`

### Visual design
```
 [🔥 Positions]  [🎯 Shots]
  ▓▓▓▓▓▓▓▓▓▓▓▓   ░░░░░░░░░░
  (active)        (inactive)
 
 Uses existing <Btn> with active prop
 Size: sm
 Gap: 8px
```

### Implementation — add to `src/components/ui.jsx`:
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

---

## COMPONENT 6: FieldEditor canvas toolbar — UNIFY everywhere

### Visual design (already exists, just needs to be applied consistently)
```
┌──────────────────────────────────────────────────────────┐
│  [〰] [🏷] [⚠] [🔥] [🎯]                    [custom]   │
│  lines labels zones vis  counter              toolbar    │
│                                                right     │
└──────────────────────────────────────────────────────────┘
 
 padding: 4px R.layout.padding
 background: COLORS.surface
 borderBottom: 1px solid COLORS.border (40% opacity)
 
 Each toggle: <Btn> variant='accent'|'default', size='sm'
 Icon-only: padding 0 8px, minWidth 32
 Active = amber background + border
 Inactive = surfaceLight background
```

### Migration plan
| Screen | Current | Change |
|--------|---------|--------|
| LayoutDetailPage | Checkboxes in preview mode panel | Wrap canvas in `<FieldEditor>` with `hasBunkers hasZones hasLines`. Delete checkbox div. |
| TournamentPage | Checkboxes above canvas | Wrap canvas in `<FieldEditor>` with `hasBunkers hasZones hasLines`. Delete checkbox div. |
| ScoutedTeamPage | No toggles | Wrap HeatmapCanvas in `<FieldEditor>` with `hasBunkers hasLines`. |
| MatchPage | Already uses FieldEditor | ✅ no change |
| TacticPage | Already uses FieldEditor | ✅ no change |

---

## LOUPE QUICK FIX — COMPLETE SPEC

### File: `src/components/FieldCanvas.jsx`

### Current behavior
1. `handleStart` → sets `activeTouchPos` → loupe appears
2. `handleMove` → updates `activeTouchPos` → loupe follows finger
3. `handleEnd` → sets `activeTouchPos(null)` → loupe disappears

### Problems
1. When placing a new player, loupe covers the placement area during the brief touch
2. After placement (touchEnd), loupe correctly hides — BUT bump timer (500ms) means if user holds slightly too long, they get an unwanted bump dialog
3. On mobile tap-to-place, the loupe barely flashes — not useful since the action is instant

### New behavior

**Tap to place (< 200ms touch):**
- NO loupe shown (too fast to be useful)
- Player placed at tap position immediately on touchEnd
- No bump timer at all

**Hold to fine-position (> 200ms touch):**
- Loupe appears after 200ms hold
- Light vibration feedback when entering fine-position mode
- Player ghost/preview appears at position
- User can drag to adjust
- Loupe follows finger during drag
- On release: player placed at final position, loupe disappears

**Drag existing player:**
- Loupe appears immediately when drag starts (touch on existing player + move)
- Loupe follows finger during drag
- On release: player moved to final position, loupe disappears

**Bump trigger:**
- REMOVE bump from hold timer entirely
- Bump is only triggered via the dedicated bump flow (long-press on placed player chip, or future bump button)

### Implementation changes

In `handleStart` — replace the player placement block (lines ~810-828):
```javascript
const hit = findPlayer(pos);
if (hit >= 0) {
  // Existing player — select + prepare drag
  onSelectPlayer?.(hit);
  setDragging(hit);
  longPressPos.current = { ...pos, isNew: false };
} else if (players.filter(Boolean).length < 5) {
  // New player — wait for tap vs hold
  const newIdx = players.findIndex(p => p === null);
  longPressPos.current = { ...pos, isNew: true, newIdx, newPos: pos };
  // DON'T place immediately. DON'T start bump timer.
  // handleEnd will place on quick tap.
  // holdTimer activates fine-position mode.
  longPressTimer.current = setTimeout(() => {
    didLongPress.current = true;
    // Enter fine-position mode: place player, start drag
    onPlacePlayer?.(pos);
    try { navigator.vibrate?.(15); } catch(e) {}
    setDragging(newIdx);
  }, 200);
}
```

In `handleStart` — change when loupe shows. DON'T show loupe on touchStart.
Instead, show it only when entering fine-position mode or dragging existing player.
Replace lines ~742-748:
```javascript
// DON'T show loupe immediately — wait for hold or drag
// Loupe is activated by:
// 1. The 200ms hold timer (fine-position mode) — set in the timer callback
// 2. handleMove when dragging an existing player
```

Add loupe activation to the hold timer callback:
```javascript
longPressTimer.current = setTimeout(() => {
  didLongPress.current = true;
  onPlacePlayer?.(pos);
  try { navigator.vibrate?.(15); } catch(e) {}
  setDragging(newIdx);
  // NOW show loupe
  const rect = canvasRef.current.getBoundingClientRect();
  const cx = /* last known touch position */;
  setActiveTouchPos({ x: cx.x, y: cx.y });
}, 200);
```

In `handleMove` — show loupe when dragging existing player:
```javascript
// Show loupe when dragging (existing player or fine-position mode)
if (dragging !== null && (e.touches?.length === 1 || !e.touches) && (editable || layoutEditMode)) {
  const rect = canvasRef.current.getBoundingClientRect();
  const cx = e.touches ? e.touches[0].clientX : e.clientX;
  const cy = e.touches ? e.touches[0].clientY : e.clientY;
  setActiveTouchPos({ x: cx - rect.left, y: cy - rect.top });
}
```

In `handleEnd` — ALWAYS hide loupe:
```javascript
setActiveTouchPos(null); // always clear — loupe disappears on finger lift
```

### Summary of touch interaction after fix
```
PLACE MODE:
  tap (<200ms)     → place at tap position, no loupe
  hold (>200ms)    → loupe + ghost player + drag to fine-position
  release          → confirm position, hide loupe

EXISTING PLAYER:
  tap              → select player
  drag             → loupe + move player
  release          → confirm position, hide loupe

SHOOT MODE:
  tap              → place shot (no loupe needed)
  tap on shot      → delete shot

LAYOUT EDIT (bunkers):
  tap empty        → new bunker at position
  tap bunker       → open edit card
  drag anchor      → move bunker with loupe
```

---

## TRANSLATION SWEEP

| File | Polish | English |
|------|--------|---------|
| `FieldEditor.jsx` ~115 | title='Etykiety bunkrów' | title='Bunker labels' |
| `FieldEditor.jsx` ~121 | title='Strefy' | title='Zones' |
| `FieldEditor.jsx` ~127 | title='Widoczność' | title='Visibility' |
| `FieldEditor.jsx` ~211 | 'Przełącz schemat kolorów (daltonizm)' | 'Toggle colorblind mode' |
| `FieldEditor.jsx` ~212 | '👁️ Daltonizm' / '👁️ Standard' | '👁️ Colorblind' / '👁️ Standard' |
| `MatchPage.jsx` ~723 | 'Pozycja:' | 'Stance:' |
| `MatchPage.jsx` ~725 | '🧍 Stoi' | '🧍 Stand' |
| `MatchPage.jsx` ~726 | '🧎 Klęczy' | '🧎 Kneel' |
| `MatchPage.jsx` ~727 | '🐍 Leży' | '🐍 Prone' |
| `MatchPage.jsx` ~754 | 'Rysuj...' | 'Draw...' |
| `MatchPage.jsx` ~758 | 'Narysuj ścieżkę wroga na mapie' | 'Draw enemy path on map' |
| `MatchPage.jsx` ~775 | 'pozycji' | 'positions' |
| `MatchPage.jsx` ~604 | 'Strzały P${..}' | 'Shots P${..}' |
| `ScoutedTeamPage.jsx` ~117 | 'Turniej' | 'Tournament' |
| `App.jsx` ~31 | 'Sprawdzanie sesji...' | 'Checking session...' |
| `App.jsx` ~33 | 'Przygotowanie danych...' | 'Preparing data...' |
| `App.jsx` ~37 | 'Ładowanie...' | 'Loading...' |
| `App.jsx` ~74 | 'Którą ręką obsługujesz telefon?' | 'Which hand do you use?' |
| `App.jsx` ~76 | 'Dostosuje pozycję lupy na ekranie' | 'Adjusts loupe position on screen' |
| `App.jsx` ~84 | '🫲 Lewa' / '🫱 Prawa' | '🫲 Left' / '🫱 Right' |
| `ui.jsx` ~201 | Loading text='Ładowanie...' | text='Loading...' |

---

## EXECUTION ORDER

### Pass 1 — Loupe fix (30 min)
1. Fix touch interaction model in FieldCanvas.jsx per spec above
2. Remove bump from hold timer
3. Test: tap places instantly, hold shows loupe + drag, release hides loupe

### Pass 2 — Create components (30 min)
4. Create `src/components/PageHeader.jsx`
5. Create `src/components/ModeTabBar.jsx`
6. Create `src/components/ActionBar.jsx`
7. Create `src/components/BottomSheet.jsx`
8. Add `HeatmapToggle` to `src/components/ui.jsx`

### Pass 3 — Apply PageHeader (30 min)
9. LayoutDetailPage → PageHeader (remove thumbnail, bunker count)
10. TournamentPage → PageHeader
11. MatchPage (both views) → PageHeader
12. TacticPage → PageHeader
13. ScoutedTeamPage → PageHeader
14. TeamDetailPage → PageHeader
15. Tab pages (Layouts, Teams, Players) → PageHeader
16. (Skip HomePage — keep custom logo header)

### Pass 4 — Apply ModeTabBar + ActionBar (20 min)
17. LayoutDetailPage mode tabs → ModeTabBar
18. TacticPage mode tabs → ModeTabBar
19. MatchPage action bar → ActionBar

### Pass 5 — Canvas unification (30 min)
20. LayoutDetailPage: wrap canvas in FieldEditor, delete checkboxes
21. TournamentPage: wrap canvas in FieldEditor, delete checkboxes
22. ScoutedTeamPage: wrap in FieldEditor with toggle props
23. Fix FieldEditor Polish strings → English

### Pass 6 — BottomSheet + cleanup (20 min)
24. Extract MatchPage save sheet → BottomSheet
25. Refactor BunkerCard → use BottomSheet wrapper
26. Apply HeatmapToggle to MatchPage + ScoutedTeamPage
27. Translation sweep (all strings from table above)
28. Fix tab page paddingBottom for safe-area

### Pass 7 — Verify
29. Test all 11 screens on 375px mobile
30. Verify no Polish strings remain (grep -rn for Polish characters: ą,ę,ó,ś,ź,ż,ć,ń,ł)
31. Verify all bottom bars are sticky
32. Verify loupe behavior on mobile

---

## GIT COMMIT PLAN
```
fix: loupe — hide on release, remove bump-on-hold conflict
feat: PageHeader shared component
feat: ModeTabBar shared component
feat: ActionBar shared component  
feat: BottomSheet shared component
feat: HeatmapToggle shared component
refactor: apply PageHeader across all screens
refactor: apply ModeTabBar to LayoutDetail + TacticPage
refactor: apply ActionBar to MatchPage
refactor: wrap all canvases in FieldEditor (delete checkboxes)
refactor: extract BottomSheet from MatchPage + BunkerCard
fix: translate remaining Polish strings to English
```
