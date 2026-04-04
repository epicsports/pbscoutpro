# CC SPEC: Match Scouting Redesign
**Priority:** HIGH — this is the core feature of PbScoutPro
**Scope:** MatchPage.jsx (major rewrite), FieldCanvas.jsx (viewport + toolbar + loupe fix), new components
**Rules:** Inline JSX only. COLORS/FONT/TOUCH from theme.js. English UI. Mobile-first 44px targets.
**Run `npm run precommit` before every commit.**

---

## OVERVIEW

Complete redesign of the match scouting experience. Key changes:
1. Compact header with flip/side info merged in
2. Half-field 60% auto-zoom viewport
3. Inline toolbar (single tap on player) replaces ActionBar
4. Pre-breakout roster grid (fill-toggle chips)
5. Shot drawer (full-height, slides from opposite side)
6. Bump-as-drag (distance threshold)
7. Flip side vs Switch team (two separate controls)
8. Match state: open (LIVE) vs closed (FINAL)
9. Loupe fix (fallback below finger at top edge)
10. Shot icon 📷 → 🔫

---

## PART 1: Header Redesign

### Current
PageHeader + separate team selector bar + ActionBar at bottom.

### New
Single compact header with two rows. DELETE the old team selector bar.
DELETE ActionBar import and usage — toolbar is now on canvas.

```jsx
{/* ═══ HEADER ═══ */}
<div style={{
  padding: '10px 16px',
  background: COLORS.surface,
  borderBottom: `1px solid ${COLORS.border}`,
}}>
  {/* Row 1: Back + Title + Badge */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <div onClick={() => navigate(`/tournament/${tournamentId}`)}
      style={{ fontSize: 22, color: COLORS.textDim, cursor: 'pointer', fontWeight: 300 }}>
      ‹
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{
        fontFamily: FONT, fontSize: 18, fontWeight: 700,
        color: COLORS.text, letterSpacing: '-.3px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        Scouting {scoutedTeam?.name || 'Team'}
      </div>
    </div>
    <div style={{
      padding: '2px 6px', borderRadius: 4, fontSize: 8, fontWeight: 800,
      letterSpacing: '.5px',
      background: match?.status === 'closed' ? '#22c55e18' : COLORS.accent,
      color: match?.status === 'closed' ? '#22c55e' : '#000',
      border: match?.status === 'closed' ? '1px solid #22c55e40' : 'none',
    }}>
      {match?.status === 'closed' ? 'FINAL' : 'LIVE'}
    </div>
  </div>
  {/* Row 2: Subtitle + Side + Flip */}
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8,
    marginTop: 6, paddingLeft: 30,
  }}>
    <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, flex: 1 }}>
      vs {opponentTeam?.name || '?'} · {score ? `${score.a}:${score.b}` : '0:0'} · Pt {pointNumber}
    </span>
    <span style={{
      fontFamily: FONT, fontSize: 11, fontWeight: 600,
      padding: '3px 8px', borderRadius: 5,
      background: teamColor + '18', color: teamColor,
    }}>
      {fieldSide === 'left' ? '◀ LEFT' : 'RIGHT ▶'}
    </span>
    <div onClick={flipSide} style={{
      padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      fontFamily: FONT, cursor: 'pointer',
      border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
      background: COLORS.surfaceLight,
    }}>⇄ Flip</div>
  </div>
</div>
```

### State
```javascript
const [fieldSide, setFieldSide] = useState('left');
const [activeTeam, setActiveTeam] = useState('A'); // which team we're scouting
const teamColor = activeTeam === 'A' ? '#ef4444' : '#3b82f6';
const scoutedTeam = activeTeam === 'A' ? teamA : teamB;
const opponentTeam = activeTeam === 'A' ? teamB : teamA;
const pointNumber = points.length + (editingId ? 0 : 1);

const flipSide = () => setFieldSide(prev => prev === 'left' ? 'right' : 'left');
```

---

## PART 2: Half-Field Viewport

### FieldCanvas.jsx — new prop: `viewportSide`

```javascript
// New prop
viewportSide = null, // null | 'left' | 'right'
```

When `viewportSide` is set, auto-zoom canvas to show 60% from that side:

```javascript
// In the ResizeObserver / sizing effect:
useEffect(() => {
  if (viewportSide && imgObj) {
    // Auto-zoom to 60% from base side
    const targetZoom = 1 / 0.65; // ~1.54x
    const panX = viewportSide === 'left' ? 0 : -(canvasSize.w * (targetZoom - 1));
    setZoom(targetZoom);
    setPan({ x: panX, y: 0 });
  }
}, [viewportSide, canvasSize.w, imgObj]);
```

Add fade gradient on the far side (draw AFTER everything except loupe):
```javascript
// In draw useEffect, after all content but before loupe:
if (viewportSide) {
  const fadeW = w * 0.25;
  const grd = ctx.createLinearGradient(
    viewportSide === 'left' ? w - fadeW : 0, 0,
    viewportSide === 'left' ? w : fadeW, 0
  );
  grd.addColorStop(0, 'rgba(10,14,23,0)');
  grd.addColorStop(1, 'rgba(10,14,23,0.7)');
  ctx.fillStyle = grd;
  ctx.fillRect(
    viewportSide === 'left' ? w - fadeW : 0, 0, fadeW, h
  );
}
```

**IMPORTANT:** Coordinates stay 0-1 on the full field. The viewport zoom is display-only.
Pinch-to-zoom still works — user can zoom out to see full field if needed.

### Usage in MatchPage
```jsx
<FieldCanvas
  viewportSide={fieldSide}
  ...otherProps
/>
```

---

## PART 3: Inline Toolbar (replaces ActionBar)

### DELETE ActionBar from MatchPage
Remove `import ActionBar` and the `<ActionBar>` component at the bottom.

### New: Toolbar rendered on FieldCanvas
Add new props to FieldCanvas:
```javascript
// Toolbar props
toolbarPlayer = null,     // index of player whose toolbar is showing (null = hidden)
toolbarItems = [],        // [{icon, label, color, action}]
onToolbarAction,          // (action, playerIndex) => void
```

### Toolbar rendering (in draw useEffect, after players, before loupe):
```javascript
if (toolbarPlayer !== null && players[toolbarPlayer]) {
  const pl = players[toolbarPlayer];
  const px = pl.x * w, py = pl.y * h;
  const items = toolbarItems;
  const btnW = 48, btnH = 44, gap = 5;
  const totalW = items.length * (btnW + gap) - gap;
  const pr = Math.max(17, w * 0.044); // player radius

  // Position: above player, clamped to edges
  let tx = px - totalW / 2;
  let ty = py - pr - btnH - 18;
  if (tx < 6) tx = 6;
  if (tx + totalW > w - 6) tx = w - 6 - totalW;
  let below = false;
  if (ty < 6) { ty = py + pr + 18; below = true; }

  // Background pill
  ctx.fillStyle = '#111827f2';
  roundRect(ctx, tx - 8, ty - 6, totalW + 16, btnH + 12, 14);
  ctx.fill();
  ctx.strokeStyle = COLORS.border + '80';
  ctx.lineWidth = 1;
  roundRect(ctx, tx - 8, ty - 6, totalW + 16, btnH + 12, 14);
  ctx.stroke();

  // Pointer triangle
  const ptx = Math.max(tx + 12, Math.min(tx + totalW - 12, px));
  ctx.fillStyle = '#111827f2';
  ctx.beginPath();
  if (!below) {
    ctx.moveTo(ptx - 7, ty + btnH + 6);
    ctx.lineTo(ptx, ty + btnH + 14);
    ctx.lineTo(ptx + 7, ty + btnH + 6);
  } else {
    ctx.moveTo(ptx - 7, ty - 6);
    ctx.lineTo(ptx, ty - 14);
    ctx.lineTo(ptx + 7, ty - 6);
  }
  ctx.fill();

  // Buttons
  items.forEach((item, idx) => {
    const bx = tx + idx * (btnW + gap);
    // Store hit area for touch handling
    item._hitArea = { x: bx, y: ty, w: btnW, h: btnH };

    ctx.fillStyle = (item.color || '#94a3b8') + '12';
    roundRect(ctx, bx, ty, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = (item.color || '#94a3b8') + '35';
    ctx.lineWidth = 0.5;
    roundRect(ctx, bx, ty, btnW, btnH, 10);
    ctx.stroke();

    // Icon
    ctx.fillStyle = item.color || '#94a3b8';
    ctx.font = '18px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.icon, bx + btnW / 2, ty + btnH / 2 - 5);

    // Label
    ctx.font = `600 8px ${FONT}`;
    ctx.fillStyle = (item.color || '#94a3b8') + 'bb';
    ctx.fillText(item.label, bx + btnW / 2, ty + btnH - 4);
  });
}
```

### Touch handling for toolbar
In FieldCanvas `handleEnd` (pointerup/touchend), BEFORE player hit detection:
```javascript
// Check toolbar tap
if (toolbarPlayer !== null && toolbarItems.length) {
  const pos = getCanvasPos(e); // canvas pixel coords
  for (const item of toolbarItems) {
    if (!item._hitArea) continue;
    const h = item._hitArea;
    if (pos.x >= h.x && pos.x <= h.x + h.w && pos.y >= h.y && pos.y <= h.y + h.h) {
      onToolbarAction?.(item.action, toolbarPlayer);
      return; // consumed
    }
  }
  // Tap outside toolbar = close
  onToolbarAction?.('close', toolbarPlayer);
  return;
}
```

### MatchPage toolbar state + actions
```javascript
const [toolbarPlayer, setToolbarPlayer] = useState(null);

const toolbarItems = useMemo(() => {
  if (toolbarPlayer === null) return [];
  const isElim = draft.elim[toolbarPlayer];
  return [
    { icon: '👤', label: 'Assign', color: '#60a5fa', action: 'assign' },
    { icon: isElim ? '❤️' : '💀', label: isElim ? 'Alive' : 'Hit',
      color: isElim ? '#22c55e' : '#ef4444', action: 'hit' },
    { icon: '🔫', label: 'Shot', color: '#f97316', action: 'shoot' },
    { icon: '🗑', label: 'Del', color: '#64748b', action: 'remove' },
  ];
}, [toolbarPlayer, draft.elim]);

const handleToolbarAction = (action, idx) => {
  if (action === 'close') { setToolbarPlayer(null); return; }
  if (action === 'hit') {
    pushUndo(); toggleElim(idx); setToolbarPlayer(null);
  }
  if (action === 'shoot') {
    setShotMode(idx); setToolbarPlayer(null);
  }
  if (action === 'remove') {
    setPendingDelete(idx); setToolbarPlayer(null);
  }
  if (action === 'assign') {
    setAssignTarget(idx); setToolbarPlayer(null);
  }
};
```

### Player tap = open toolbar
In FieldCanvas, modify player tap handling:
```javascript
// In handleEnd, after checking toolbar tap:
// Single tap on player = call onSelectPlayer
const hitPlayer = findPlayerAt(pos);
if (hitPlayer >= 0) {
  onSelectPlayer?.(hitPlayer);
  return;
}
```

In MatchPage:
```javascript
const handleSelectPlayer = (idx) => {
  if (toolbarPlayer === idx) {
    setToolbarPlayer(null); // toggle off
  } else {
    setToolbarPlayer(idx); // show toolbar
  }
};
```

---

## PART 4: Bump as Drag

### FieldCanvas changes
Track drag start position. On drag end, compute distance:

```javascript
const dragStartRef = useRef(null);

// In handleStart:
if (hitPlayer >= 0) {
  dragStartRef.current = { x: players[hitPlayer].x, y: players[hitPlayer].y };
  setDragging(hitPlayer);
}

// In handleEnd after drag:
if (dragging !== null && dragStartRef.current) {
  const start = dragStartRef.current;
  const end = { x: players[dragging].x, y: players[dragging].y };
  const dist = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);

  if (dist > 0.08) {
    // Bump — notify parent with start position
    onBumpPlayer?.(dragging, start);
  } else {
    // Just a position correction — notify parent
    onMovePlayer?.(dragging, end);
  }
  dragStartRef.current = null;
}
```

### New prop on FieldCanvas
```javascript
onBumpPlayer,  // (playerIndex, fromPosition) => void
```

### MatchPage handler
```javascript
const handleBump = (idx, fromPos) => {
  pushUndo();
  setDraft(prev => {
    const n = { ...prev, bumps: [...prev.bumps] };
    n.bumps[idx] = { x: fromPos.x, y: fromPos.y };
    return n;
  });
};
```

### Bump trail rendering in FieldCanvas
After drawing players, before toolbar:
```javascript
// Draw bump arrows
if (bumpStops) {
  bumpStops.forEach((bump, i) => {
    if (!bump || !players[i]) return;
    const fx = bump.x * w, fy = bump.y * h;
    const tx = players[i].x * w, ty = players[i].y * h;

    // Dashed line
    ctx.strokeStyle = '#fbbf2440';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.setLineDash([]);

    // Origin dot
    ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf2430'; ctx.fill();
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1; ctx.stroke();

    // Arrow head at destination
    const angle = Math.atan2(ty - fy, tx - fx);
    const ax = tx - Math.cos(angle) * 18, ay = ty - Math.sin(angle) * 18;
    ctx.fillStyle = '#fbbf2470';
    ctx.beginPath(); ctx.moveTo(tx, ty);
    ctx.lineTo(ax - Math.cos(angle - 0.5) * 8, ay - Math.sin(angle - 0.5) * 8);
    ctx.lineTo(ax - Math.cos(angle + 0.5) * 8, ay - Math.sin(angle + 0.5) * 8);
    ctx.fill();
  });
}
```

---

## PART 5: Pre-Breakout Roster Grid

### New component: `RosterGrid`
Create `src/components/RosterGrid.jsx`:

```jsx
import React from 'react';
import { COLORS, FONT, TOUCH } from '../utils/theme';

export default function RosterGrid({ roster, selected, onToggle, max = 5 }) {
  const count = selected.length;
  return (
    <div style={{
      padding: '8px 12px 10px',
      background: COLORS.bg,
      borderTop: `1px solid ${COLORS.border}`,
    }}>
      <div style={{
        fontFamily: FONT, fontSize: 11, fontWeight: 600,
        color: COLORS.textDim, marginBottom: 6,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
        Playing this point: {count}/{max}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 4,
      }}>
        {roster.map(player => {
          const isOn = selected.includes(player.id);
          return (
            <div key={player.id} onClick={() => onToggle(player.id)}
              style={{
                padding: '8px 4px',
                borderRadius: 8,
                fontFamily: FONT, fontSize: 11, fontWeight: 600,
                textAlign: 'center',
                cursor: 'pointer',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                background: isOn ? COLORS.accent + '15' : COLORS.surface,
                color: isOn ? COLORS.accent : COLORS.textMuted,
                border: `1.5px solid ${isOn ? COLORS.accent : COLORS.border}`,
              }}>
              #{player.number}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### Usage in MatchPage
```jsx
const [onFieldRoster, setOnFieldRoster] = useState([]);
const [rosterGridVisible, setRosterGridVisible] = useState(true);

const toggleRosterPlayer = (playerId) => {
  setOnFieldRoster(prev => {
    if (prev.includes(playerId)) return prev.filter(id => id !== playerId);
    if (prev.length >= 5) return prev;
    return [...prev, playerId];
  });
};

// Hide grid after first player placed
useEffect(() => {
  if (draft.players.some(Boolean) && rosterGridVisible) {
    setRosterGridVisible(false);
  }
}, [draft.players]);

// In render:
{rosterGridVisible && (
  <RosterGrid
    roster={rosterPlayers}
    selected={onFieldRoster}
    onToggle={toggleRosterPlayer}
  />
)}
```

### Assign sheet filtering
When opening assign bottom sheet, show pre-selected players first:
```javascript
const getAssignRoster = (playerIdx) => {
  const used = draft.assign.filter((a, i) => a !== null && i !== playerIdx);
  const preSelected = onFieldRoster.length
    ? rosterPlayers.filter(r => onFieldRoster.includes(r.id))
    : rosterPlayers;
  const others = onFieldRoster.length
    ? rosterPlayers.filter(r => !onFieldRoster.includes(r.id))
    : [];
  return { preSelected, others, used };
};
```

---

## PART 6: Shot Drawer

### New component: `ShotDrawer`
Create `src/components/ShotDrawer.jsx`:

Full-height panel that slides from the opposite side of the field.
Shows the opponent half of the field with bunkers.
Tap to place numbered shot targets.

**Key props:**
```javascript
{
  open: boolean,
  onClose: () => void,
  playerIndex: number,
  playerLabel: string,
  playerColor: string,
  fieldSide: 'left' | 'right',  // scouted team's side
  fieldImage: string,
  bunkers: array,
  fieldCalibration: object,
  shots: array,  // existing shots for this player
  onAddShot: (position) => void,
  onUndoShot: () => void,
}
```

**Slide direction:** If `fieldSide === 'left'`, drawer slides from RIGHT (opponent is right).
If `fieldSide === 'right'`, drawer slides from LEFT.

**Field rendering:** Show the opponent 65% of the field (x: 0.35-1.0 for left side, 0-0.65 for right side).

**Shot placement:** Tap → convert to full-field coordinates → call `onAddShot`.

---

## PART 7: Switch Team

### Bottom of MatchPage editor
Replace ActionBar with:
```jsx
<div style={{
  display: 'flex', flexDirection: 'column', gap: 8,
  padding: '10px 12px',
  background: COLORS.surface,
  borderTop: `1px solid ${COLORS.border}`,
}}>
  <div style={{ display: 'flex', gap: 8 }}>
    <Btn variant="ghost" size="sm" onClick={handleUndo}
      style={{ flex: '0 0 auto', padding: '14px 18px', opacity: undoStack.canUndo ? 1 : 0.3 }}>
      ↩
    </Btn>
    <Btn variant="accent" style={{ flex: 1, padding: '14px 0', fontSize: 14, fontWeight: 700 }}
      onClick={() => setSaveSheetOpen(true)}>
      ✓ Save point
    </Btn>
  </div>
  <div onClick={() => switchTeam()} style={{
    width: '100%', padding: '14px 0', textAlign: 'center',
    fontSize: 14, fontWeight: 600, borderRadius: 12, cursor: 'pointer',
    border: `1px solid ${oppColor}30`,
    background: oppColor + '10', color: oppColor,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  }}>
    <div style={{ width: 8, height: 8, borderRadius: '50%', background: oppColor }} />
    Scout {opponentTeam?.name || 'Other team'}
  </div>
</div>
```

### Switch team handler
```javascript
const switchTeam = () => {
  // Save current team's draft
  if (activeTeam === 'A') {
    setDraftA(draft); // current draft goes to A
  } else {
    setDraftB(draft); // current draft goes to B
  }
  // Switch
  const newTeam = activeTeam === 'A' ? 'B' : 'A';
  setActiveTeam(newTeam);
  setFieldSide(prev => prev === 'left' ? 'right' : 'left');
  setToolbarPlayer(null);
  setShotMode(null);
  // Load other team's draft
  // (draftA/draftB already hold the state)
};
```

---

## PART 8: Match State (open/closed)

### Firestore
Add `status` field to match document: `'open'` (default) | `'closed'`.

```javascript
// In dataService.js — updateMatch already exists, use it:
await ds.updateMatch(tournamentId, matchId, { status: 'closed' });
```

### Closed match view
When `match.status === 'closed'`, show results-only view:
- FINAL badge in header
- Large centered score
- Aggregated heatmap (all points collapsed to one side using mirrorX)
- Points list (read-only, no delete/edit buttons)
- No "Add point" button
- No editor mode
- "Reopen" option in overflow menu (⋯)

### Close match action
Add to save BottomSheet:
```jsx
{!editingId && (
  <Btn variant="ghost" size="sm"
    onClick={() => confirmCloseMatch()}
    style={{ color: COLORS.textDim, marginTop: 8 }}>
    Close match (mark as final)
  </Btn>
)}
```

---

## PART 9: Save Point Flow

### After saving, ask about side change:
```jsx
// In save handler, after successful save:
const shouldFlip = await confirmSideChange.ask();
if (shouldFlip) {
  setFieldSide(prev => prev === 'left' ? 'right' : 'left');
}
resetDraft();
```

### Side change confirmation in BottomSheet:
Add to point outcome BottomSheet, after outcome selection:
```jsx
<div style={{ marginTop: 12 }}>
  <div style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, marginBottom: 6 }}>
    Side change next point?
  </div>
  <div style={{ display: 'flex', gap: 8 }}>
    <Btn variant={sideChange ? 'accent' : 'default'} size="sm" style={{ flex: 1 }}
      onClick={() => setSideChange(true)}>Yes, swap</Btn>
    <Btn variant={!sideChange ? 'accent' : 'default'} size="sm" style={{ flex: 1 }}
      onClick={() => setSideChange(false)}>No, same</Btn>
  </div>
</div>
```

### Point data — add fieldSide
```javascript
const data = {
  ...existingData,
  fieldSide: fieldSide, // 'left' | 'right' — which side scouted team started from
};
```

---

## PART 10: Loupe Fix

### FieldCanvas.jsx — loupe positioning
Find the loupe drawing code (~line 618-670). After calculating `ly`:

```javascript
// Current:
let ly = ty - loupeR - gap;

// Add fallback:
if (ly - loupeR < 0) {
  ly = ty + loupeR + gap; // below finger if near top
}
```

---

## PART 11: Delete Confirmation

### Already exists as ConfirmModal
Use existing `useConfirm()` hook:
```javascript
const deleteConfirm = useConfirm();

// In toolbar action handler:
if (action === 'remove') {
  const ok = await deleteConfirm.ask();
  if (ok) {
    pushUndo();
    removePlayer(idx);
  }
}

// In render:
<ConfirmModal {...deleteConfirm.modalProps()}
  title="Remove player"
  message={`Remove ${getFullLabel(idx)}?`}
  confirmLabel="Remove"
  variant="danger"
/>
```

---

## EXECUTION ORDER

1. **Loupe fix** (Part 10) — 5 min, standalone
2. **Header redesign** (Part 1) — delete old team bar + ActionBar, new compact header
3. **Half-field viewport** (Part 2) — FieldCanvas `viewportSide` prop
4. **Inline toolbar** (Part 3) — FieldCanvas drawing + touch handling + MatchPage state
5. **Bump as drag** (Part 4) — FieldCanvas drag tracking + MatchPage handler
6. **Pre-breakout roster** (Part 5) — new RosterGrid component + MatchPage integration
7. **Shot drawer** (Part 6) — new ShotDrawer component
8. **Switch team** (Part 7) — bottom bar + state management
9. **Match state** (Part 8) — Firestore field + closed view
10. **Save point flow** (Part 9) — side change prompt + fieldSide in point data
11. **Delete confirmation** (Part 11) — wire up existing useConfirm

Push after each part. Run `npm run precommit` before each commit.

---

## TESTING CHECKLIST
- [ ] Header shows "Scouting {team}" with side + flip
- [ ] LIVE badge small, FINAL badge green
- [ ] Field auto-zooms to 60% from base side
- [ ] Fade on far side of field
- [ ] Pinch-out still works to see full field
- [ ] Tap empty = place player
- [ ] Single tap on player = inline toolbar appears
- [ ] Toolbar edge-clamped (never goes off screen)
- [ ] Toolbar below player when near top edge
- [ ] 👤 opens assign bottom sheet
- [ ] 💀 toggles elimination
- [ ] 🔫 opens shot drawer from opposite side
- [ ] 🗑 shows delete confirmation
- [ ] Drag player short = move
- [ ] Drag player far (>8%) = bump with arrow trail
- [ ] Pre-breakout grid shows 2×4 roster with fill-toggle
- [ ] Grid disappears after first player placed
- [ ] Assign sheet shows pre-selected on top
- [ ] Shot drawer shows opponent half with bunkers
- [ ] Tap in shot drawer = numbered shot target
- [ ] ⇄ Flip changes field side (same team)
- [ ] "Scout VIKINGS" switches to other team context
- [ ] Side change prompt after saving point
- [ ] fieldSide saved with point data
- [ ] Loupe falls below finger when near top of canvas
- [ ] match.status: 'closed' shows FINAL view
- [ ] No ActionBar component used
- [ ] Shot icon is 🔫 everywhere (not 📷)
- [ ] All on 375px mobile
- [ ] `npm run precommit` green

---

## PART 12: Side Picker (Entry Overlay)

### Current
Overlay with HOME (red), AWAY (blue), Observe — three options.

### New
Simplified — two buttons with team names, no observe option.
Observe mode only appears when concurrent scouting blocks a team (see Part 14).

```jsx
if (!scoutingSide) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: `/tournament/${tournamentId}` }} title={match.name || 'Match'} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
        <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 20, color: COLORS.text, textAlign: 'center' }}>
          Which team are you scouting?
        </div>
        {[
          { side: 'home', team: teamA, color: '#ef4444' },
          { side: 'away', team: teamB, color: '#3b82f6' },
        ].map(({ side, team, color }) => (
          <div key={side} onClick={() => claimSide(side)} style={{
            width: '100%', maxWidth: 320, padding: '18px 24px', borderRadius: 14,
            background: color + '10', border: `2px solid ${color}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: color }} />
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 16, color: COLORS.text }}>
              {team?.name || side.toUpperCase()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## PART 13: Match Card Badges (TournamentPage)

### Add status badge to match cards in TournamentPage match list

Match states: `'upcoming'` (default/no points), `'live'` (has points, not closed), `'closed'` (final).

Derive status:
```javascript
const getMatchStatus = (match, points) => {
  if (match.status === 'closed') return 'ended';
  if (points?.length > 0) return 'live';
  return 'upcoming';
};
```

Badge styles:
```javascript
const STATUS_BADGE = {
  upcoming: { label: 'Upcoming', bg: COLORS.border + '40', color: COLORS.textDim },
  live: { label: 'Live', bg: '#f59e0b', color: '#000' },
  ended: { label: 'Ended', bg: '#22c55e18', color: '#22c55e' },
};
```

Add badge to match card in TournamentPage (next to match name or score).

---

## PART 14: Concurrent Scouting Block

### When switching to a team that someone else is scouting

Check Firestore: if `point.homeData.scoutedBy` or `point.awayData.scoutedBy` is set
and is NOT the current user's uid → that team is blocked.

```jsx
const switchTeam = () => {
  const targetTeam = activeTeam === 'A' ? 'B' : 'A';
  const targetField = targetTeam === 'A' ? 'homeData' : 'awayData';
  const currentPoint = points[points.length - 1]; // or current editing point
  const scoutedBy = currentPoint?.[targetField]?.scoutedBy;
  const myUid = auth.currentUser?.uid;

  if (scoutedBy && scoutedBy !== myUid) {
    // Show blocker
    setBlockedTeam(targetTeam);
    return;
  }
  // Proceed with switch
  doSwitch(targetTeam);
};
```

Blocker overlay:
```jsx
{blockedTeam && (
  <div style={{
    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 80,
  }}>
    <div style={{
      background: COLORS.surface, borderRadius: 16, padding: 24,
      textAlign: 'center', maxWidth: 280,
    }}>
      <div style={{ fontSize: 14, fontWeight: 600, color: COLORS.text, marginBottom: 8 }}>
        Another coach is scouting {blockedTeamName}
      </div>
      <div style={{ fontSize: 12, color: COLORS.textDim, marginBottom: 16 }}>
        You can continue scouting your team.
      </div>
      <Btn variant="default" onClick={() => setBlockedTeam(null)}>
        ← Back to {scoutedTeam?.name}
      </Btn>
    </div>
  </div>
)}
```

---

## PART 15: Heatmap Aggregation (FINAL view)

### Mirror points to LEFT side for aggregation

```javascript
const getAggregatedHeatmapPoints = (points, teamKey) => {
  return points.flatMap(pt => {
    const data = teamKey === 'A' ? (pt.homeData || pt.teamA) : (pt.awayData || pt.teamB);
    if (!data?.players) return [];
    const side = pt.fieldSide || 'left';
    return data.players.filter(Boolean).map(p => {
      // Mirror to left if point was from right side
      if (side === 'right') return { ...p, x: 1 - p.x };
      return p;
    });
  });
};
```

---

## PART 16: FieldEditor vs FieldCanvas in MatchPage

### MatchPage must use FieldCanvas directly, NOT FieldEditor.
FieldEditor wraps FieldCanvas with toggle checkboxes (bunkers/zones/lines/visibility).
During scouting, coach does not toggle these — field is shown as-is with bunkers visible.

Replace in MatchPage:
```
// DELETE:
import FieldEditor from '../components/FieldEditor';
// KEEP:
import FieldCanvas from '../components/FieldCanvas';
```

Pass bunkers/zones/lines directly to FieldCanvas without toggle controls.
FieldEditor stays for LayoutDetailPage and TacticPage only.

---

## PART 17: Roster Grid Lifecycle

### Grid returns automatically on new point

```javascript
const startNewPoint = () => {
  resetDraft();
  setRosterGridVisible(true); // ← show grid again
  setOnFieldRoster([]);       // ← clear pre-selection
  // ... rest of reset
};
```

### Grid hides after first player placed

```javascript
useEffect(() => {
  if (draft.players.some(Boolean) && rosterGridVisible) {
    setRosterGridVisible(false);
  }
}, [draft.players]);
```

---

## UPDATED TESTING CHECKLIST (additions)
- [ ] Entry overlay shows two team buttons (no observe)
- [ ] TournamentPage match cards show Upcoming/Live/Ended badge
- [ ] Switching to blocked team shows blocker with back button
- [ ] FINAL view heatmap aggregates all points to LEFT side
- [ ] MatchPage uses FieldCanvas directly (no FieldEditor)
- [ ] Roster grid returns on new point
- [ ] Roster grid hides after first player placed

---

## BACKLOG (do NOT implement now)
- Auto-assign based on player position history (priorytet: mecz → turniej → profil)
- Bunker zone naming system (Dorito 1/D1, Snake front, etc.)
- Bunker-to-zone mapping
- Name suggestions when assigning bunkers
- Point timeline / replay (record full sequence of movements, eliminations)
- Point playback animation
- Assign suggestions based on history
- Reusable half-field viewport for TacticPage
