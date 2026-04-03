# URGENT FIXES — From User Testing 2026-04-03 evening
## Do these BEFORE continuing with Session 4.2

---

## Fix A: Loupe should NOT show the element being placed
**File:** `src/components/FieldCanvas.jsx`

**Problem:** When placing a player (big green circle #86), the loupe shows the
magnified circle ON TOP of the field — making it impossible to see where exactly
you're placing it. The marker covers the precise spot.

**Fix:** Take a snapshot of the canvas AFTER background layers but BEFORE
interactive elements. Use that snapshot as loupe source instead of final canvas.

Implementation:
```javascript
// In the main draw useEffect, after drawing background layers
// (image, disco/zeeker, heatmaps, zones, bunker labels) but
// BEFORE drawing players/shots/bumps/eliminations:

// 1. Create an offscreen canvas (once, via ref):
const loupeSourceRef = useRef(null);

// 2. After background layers are drawn, save snapshot:
// (right before "// Shot lines" or "// Opponent overlay")
if (activeTouchPos) {
  if (!loupeSourceRef.current) {
    loupeSourceRef.current = document.createElement('canvas');
  }
  const lc = loupeSourceRef.current;
  lc.width = canvas.width;
  lc.height = canvas.height;
  lc.getContext('2d').drawImage(canvas, 0, 0);
}

// 3. In the loupe drawing section, use loupeSourceRef instead of canvas:
ctx.drawImage(loupeSourceRef.current || canvas,  // fallback to canvas
  Math.max(0, srcCx - srcR), Math.max(0, srcCy - srcR), srcR * 2, srcR * 2,
  lx - loupeR, ly - loupeR, loupeR * 2, loupeR * 2
);
```

This way the loupe shows: field image + lines + zones + bunker labels + heatmap,
but NOT: players, shots, bumps, eliminations, crosshairs, targets.

---

## Fix B: Loupe position — ALWAYS on top
**File:** `src/components/FieldCanvas.jsx`

**Problem:** Loupe tries to be "smart" about positioning (above→side→below).
User wants it ALWAYS on top. It CAN overflow above the canvas bounds.

**Fix:** Replace the smart positioning with simple top positioning:
```javascript
// OLD (delete this):
let lx = tx, ly = ty - loupeR - gap;
if (ly - loupeR < 0) { ly = ty; lx = tx + oppositeX * (loupeR + gap); }
if (lx - loupeR < 0 || lx + loupeR > w) { lx = tx; ly = ty + loupeR + gap; }
if (ly + loupeR > h) { ly = ty; lx = tx - oppositeX * (loupeR + gap); }

// NEW:
const hand = typeof localStorage !== 'undefined'
  ? localStorage.getItem('pbscoutpro-handedness') || 'right' : 'right';
const offsetX = hand === 'right' ? -30 : 30;  // slightly toward opposite side
let lx = tx + offsetX;
let ly = ty - loupeR - gap;  // ALWAYS above, even if negative (overflows)

// Clamp horizontally only (don't go off screen sides)
if (lx - loupeR < 0) lx = loupeR;
if (lx + loupeR > w) lx = w - loupeR;
// Do NOT clamp vertically — let it overflow above canvas
```

**Also:** The loupe should render OUTSIDE the ctx.save/restore transform block
(after `ctx.restore()` on line ~470). It already does this, but make sure the
loupe coordinates are in screen-space, not in zoom-transformed space.

If the loupe goes above canvas (negative ly), the canvas container needs
`overflow: visible` instead of `overflow: hidden`. Add to the canvas wrapper:
```jsx
<div style={{ position: 'relative', overflow: 'visible' }}>
  <canvas ref={canvasRef} ... />
</div>
```

---

## Fix C: Remove duplicate score display in MatchPage
**File:** `src/pages/MatchPage.jsx`

**Problem:** Score shown 3 times on scouting screen:
1. ❌ Small "1:0 · Pt 2" under match name in sticky header (line ~596)
2. ❌ Big "1:0" on right side of sticky header (lines ~599-603)
3. ✅ KEEP: "1:0" between team names in team selector bar (lines ~616-619)

Also: 🔄 refresh button (lines ~626-638) is confusing — user doesn't know
what it does. Remove it.

**Changes:**

1. **Sticky header subtitle** — remove score, keep only point number:
```jsx
// Line ~596, change from:
{score ? `${score.a}:${score.b}` : '0:0'} · Pt {points.length + (editingId ? 0 : 1)}
// To:
Pt {points.length + (editingId ? 0 : 1)}
```

2. **Big score on right** — DELETE entirely (lines ~599-603):
```jsx
// DELETE this block:
<div style={{
  fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 800,
  color: score && score.a > score.b ? COLORS.win : ...
}}>
  {score ? `${score.a}:${score.b}` : '–:–'}
</div>
```

3. **🔄 button** — DELETE entirely (lines ~626-638):
```jsx
// DELETE the <Btn variant="ghost" onClick={...}> 🔄 </Btn> block
```

4. **Team selector score** — KEEP as is. This is the ONE place score shows.
   It's between the team name buttons and looks good.

**Result:** Clean header with just match name + point number.
Score visible only in the team selector bar (centered between team names).
No refresh button.

---

## Fix D: Compact player pills (replace big cards)
**File:** `src/pages/MatchPage.jsx`

**Problem:** Player chips are big cards (#333 Dziedziczak 2s) that take too much
space. You have to scroll horizontally to see all 5. The bump timer (2s), color
dot at the start, and X button make them bloated.

**Fix:** Compact single-line pills, stacked vertically (or 2-column grid).
Each pill = player color background + number + mini action icons.

```
┌──────────────────────────────────────┐
│ P1  #333 Dziedziczak  [👤][💀][🗑]  │  ← red bg tint
│ P2  #66  Koe          [👤][💀][🗑]  │  ← blue bg tint
│ P3  #86  Kusmierczyk  [👤][💀][🗑]  │  ← green bg tint
│ P4  —                 [👤]      [🗑]  │  ← gray, not placed
│ P5  —                 [👤]      [🗑]  │  ← gray, not placed
└──────────────────────────────────────┘
```

**Each pill:**
```jsx
<div style={{
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '6px 10px', borderRadius: 8,
  background: player ? `${COLORS.playerColors[i]}15` : COLORS.surface,
  border: `1.5px solid ${selectedPlayer === i ? COLORS.accent : (player ? COLORS.playerColors[i] + '40' : COLORS.border)}`,
  cursor: 'pointer',
}} onClick={() => selectAndPlace(i)}>
  
  {/* Color indicator + number */}
  <span style={{
    fontFamily: FONT, fontSize: 13, fontWeight: 700,
    color: COLORS.playerColors[i],
    minWidth: 24,
  }}>P{i+1}</span>
  
  {/* Name (from roster assignment) */}
  <span style={{
    flex: 1, fontFamily: FONT, fontSize: 12, color: COLORS.text,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  }}>
    {assigned ? `#${assigned.number} ${assigned.name}` : '—'}
  </span>
  
  {/* Action icons — small, inline */}
  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
    {/* Assign: pick which roster player this is */}
    <div onClick={e => { e.stopPropagation(); openAssignPicker(i); }}
      style={{ width: 24, height: 24, borderRadius: 4,
        background: COLORS.surfaceLight, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 12, color: COLORS.textDim }}>
      👤
    </div>
    
    {/* Hit: mark as eliminated (only if placed) */}
    {player && (
      <div onClick={e => { e.stopPropagation(); toggleHit(i); }}
        style={{ width: 24, height: 24, borderRadius: 4,
          background: isEliminated ? COLORS.dangerDim : COLORS.surfaceLight,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: isEliminated ? COLORS.danger : COLORS.textDim }}>
        💀
      </div>
    )}
    
    {/* Remove from field */}
    {player && (
      <div onClick={e => { e.stopPropagation(); removePlayer(i); }}
        style={{ width: 24, height: 24, borderRadius: 4,
          background: COLORS.surfaceLight, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 12, color: COLORS.textDim }}>
        ✕
      </div>
    )}
  </div>
</div>
```

**Layout:** Stacked vertically, full width. No horizontal scroll needed.
All 5 players visible at once without scrolling.

**Remove:**
- The big card layout with color dot at start
- Bump timer (2s/3s) from pills — bump info shows on canvas only
- The separate `# Mateusz Krotoschak [Hit]` bar below pills
- The `Counter-play` button between canvas and pills (move to FAB)

**Behavior:**
- Tap pill = select that player for placement (canvas enters place mode)
- 👤 icon = open roster picker dropdown for that slot
- 💀 icon = toggle elimination (shows skull on canvas)
- ✕ icon = remove player from field (clear position)
