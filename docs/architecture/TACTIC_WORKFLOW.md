# Tactic Page — Mode-Based Redesign + Scout-to-Counter Pipeline

## Problem
TacticPage bottom half is overloaded. 12+ elements fight for attention.
User can't focus on one task because everything is always visible.
Counter-play needs a clean separate flow.

## Solution: Mode-based bottom panel (same pattern as LayoutDetailPage)

```
┌─ ← Layout / Tournament ──────────┐
│ 1. Breakout  [+ Step]             │
│                                    │
│ ┌────────────────────────────────┐ │
│ │     CANVAS (60% screen)       │ │
│ │     with loupe + pinch-zoom    │ │
│ └────────────────────────────────┘ │
│                                    │
│ [📍] [🎯] [✏️] [🎯C] [💾]       │ ← mode tabs
│ ┌── contextual panel ───────────┐ │
│ │  (mode-specific controls)     │ │
│ └───────────────────────────────┘ │
└────────────────────────────────────┘
```

### Modes:
**📍 Pozycje (default):**
- Player strip: P1 P2 P3 P4 P5 (tap to select)
- Tap canvas = place selected player
- Drag player = move
- Long press player = bump dial

**🎯 Strzały:**
- Player strip (same as Pozycje, shows shot count per player)
- Tap canvas = place shot for selected player
- Tap shot marker = delete (or long press)
- Player controls disabled (can't accidentally move players)

**✏️ Rysuj (Freehand):**
- Color picker + line width
- Canvas enters freehand draw mode
- Player/shot interaction DISABLED
- Undo last stroke button

**🎯C Counter-play:**
- Own dedicated panel (see below)
- All other interactions disabled
- Canvas shows counter analysis overlay

**💾 Zapisz:**
- Step description field
- [Zapisz] button
- No canvas interaction

### Counter-play mode — detailed:
```
┌── Counter-play ──────────────────┐
│                                   │
│ 1. Narysuj ścieżkę przeciwnika  │
│    [🖊 Rysuj]  (draw on canvas)  │
│                                   │
│ 2. Uruchom analizę               │
│    [▶ Analizuj]                  │
│                                   │
│ 3. Wyniki:                        │
│    #1 🟢 HAMMER 68% — safe shot  │
│    #2 🟠 RING 52% — lob          │
│    #3 🔵 COBRA 31% — exposed     │
│                                   │
│ [Wyczyść] [Zapisz jako kontrę]   │
└───────────────────────────────────┘
```

---

## Scout → Save Tactic → Counter Pipeline

### Step 1: Scouting (MatchPage)
Coach sees opponent run a breakout pattern. Scouting records:
- Player positions (where each player ran)
- Shots (where they shot from/to)

### Step 2: Save scouted tactic to layout
After scouting a point, user can tap **"📋 Zapisz jako taktykę"**.
This creates a tactic entry on the LAYOUT (not just the match):

```javascript
// New tactic from scouted point
{
  name: "RANGER Breakout #1",
  source: {
    type: 'scouted',
    matchId: 'xxx',
    pointNumber: 3,
    team: 'RANGER Warsaw',
    opponent: 'PPARENA Pisen',
    outcome: 'win',       // how the point ended
    date: '2026-03-31',
  },
  steps: [{
    players: [...],     // copied from scouted point
    shots: [...],       // copied from scouted point
    description: 'Breakout — RANGER push dorito',
  }],
}
```

### Step 3: Browse tactics on layout
Layout tactics page shows two sections:
```
⚔️ Taktyki (4)

📝 Moje taktyki (2)
  Push dorito · 1 kroków         >
  Snake push · 2 kroków          >

🔍 Ze scoutingu (2)
  RANGER Breakout #1 · RNG vs PP · W  >
  RANGER Breakout #2 · RNG vs RG · L  >
```

"Ze scoutingu" tactics show: team name, opponent, outcome badge.

### Step 4: Counter analysis
User opens a scouted tactic → taps Counter mode → system:
1. Takes the opponent's breakout positions as enemy path
2. Runs counter analysis (existing ballistics engine)
3. Recommends: best 5 positions for YOUR team + shooting lanes
4. User can tweak and save as "Counter to RANGER Breakout #1"

---

## Firestore model changes

### Layout tactic — add `source` field:
```javascript
{
  name: 'RANGER Breakout #1',
  source: {                    // NEW — null for manual tactics
    type: 'scouted',          // 'scouted' | 'counter' | null
    matchId: 'abc',
    pointNumber: 3,
    teamName: 'RANGER Warsaw',
    opponentName: 'PPARENA Pisen',
    outcome: 'win',
    date: '2026-03-31',
  },
  counterOf: null,             // NEW — tacticId this is a counter to
  steps: [...],
  createdAt: Timestamp,
}
```

### Match point — add "save as tactic" action:
In MatchPage, after saving a point, show:
```
Punkt zapisany ✓
[📋 Zapisz jako taktykę do layoutu]
```

This copies point data → creates layout tactic with source metadata.

---

## Implementation for Claude Code

### Priority order:
1. TacticPage mode tabs (replace bottom clutter)
2. "Save as tactic" button on MatchPage points
3. Layout tactic list: separate "Moje" vs "Ze scoutingu"
4. Counter mode as dedicated panel
5. "Counter to" tactic creation from counter results
