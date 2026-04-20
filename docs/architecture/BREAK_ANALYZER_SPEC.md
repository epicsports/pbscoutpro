# PbScoutPro — BreakAnalyzer Module
## Technical Specification v1.0

---

## 1. Overview

BreakAnalyzer is a tactical simulation module for PbScoutPro that provides:

- **Visibility Analysis** — line-of-sight and shooting lanes between any two points on the field
- **Ballistic Modeling** — parabolic trajectory with drag, accounting for bunker heights
- **Break Optimization** — recommended 5-player breakout paths minimizing exposure
- **Counter-Analysis** — given an enemy path, find optimal defensive positions
- **Crossfire Zones** — identify positions where multiple shooters converge

The module runs entirely client-side using Web Workers for computation, renders as canvas overlays on existing layout views, and stores data in the existing Firestore layout-centric model.

---

## 2. Physics Model

### 2.1 Paintball Ballistics

Constants:
```
BALL_MASS         = 3.2g (0.0032 kg)
BALL_DIAMETER     = 17.3mm (0.0173 m)
BALL_AREA         = π * (0.00865)² ≈ 0.000235 m²
AIR_DENSITY       = 1.225 kg/m³
DRAG_COEFFICIENT  = 0.47 (sphere)
GRAVITY           = 9.81 m/s²
MUZZLE_VELOCITY   = 85 m/s (≈280 fps, tournament cap)
```

Drag deceleration:
```
F_drag = 0.5 * Cd * ρ * A * v²
a_drag = F_drag / m ≈ 0.5 * 0.47 * 1.225 * 0.000235 * v² / 0.0032
a_drag ≈ 0.0213 * v²
```

At muzzle: a_drag ≈ 154 m/s² (roughly 15g — massive deceleration).
This means numerical integration is needed, not simple kinematic equations.

### 2.2 Trajectory Solver

We solve in 2D vertical plane (distance along ground, height):

```
Input:
  - distance: horizontal distance to target (m)
  - barrel_height: 0.9m (kneeling) / 1.5m (standing) / 1.7m (high stance)
  - elevation_angle: 0° to 15° (user-adjustable per position)
  - target_height_band: [min_h, max_h] — e.g., [0.3, 1.8] for full body

Output:
  - t_flight: time of flight (s)
  - arrival_height: height at target distance (m)
  - hit: boolean — does arrival_height fall within target_height_band?
  - v_arrival: velocity at impact (m/s) — useful for "is it still lethal?"
```

Solver uses **Euler integration with dt=0.001s** (1ms steps). For a 40m shot that's ~600 steps — trivial per pair, but we pre-compute in bulk.

### 2.3 Height Model

Bunker heights (approximate tournament standards):
```
HEIGHT_MAP = {
  snake_segment: 0.6,    // ~60cm — low, can shoot over with arc
  doritos:       0.9,     // ~90cm — medium-low, crouch height
  can:           1.1,     // ~110cm — medium
  brick:         1.2,     // ~120cm — medium
  temple:        1.5,     // ~150cm — tall
  standup:       1.8,     // ~180cm — full height, blocks almost all
  tower:         2.0,     // ~200cm — tallest, complete block
}
```

Player model:
```
PLAYER_HEIGHT_STANDING  = 1.75m
PLAYER_HEIGHT_CROUCHING = 1.10m
PLAYER_HEIGHT_RUNNING   = 1.65m  // slightly hunched sprint
PLAYER_CENTER_MASS      = 1.00m  // primary target zone running
PLAYER_WIDTH            = 0.45m  // shoulder width for hit probability
PLAYER_SPRINT_SPEED     = 6.5 m/s  // average tournament player
PLAYER_JOG_SPEED        = 4.0 m/s
```

### 2.4 Hit Probability Model

Rather than binary hit/miss, we model probability:

```
P(hit) = P(visible) × P(reach) × P(accuracy) × P(timing)

P(visible)  = 1 if line-of-sight exists, 0 otherwise (from visibility grid)
P(reach)    = 1 if ball arrives within target height band, 0 otherwise
P(accuracy) = accuracy_curve(distance) — empirical falloff
P(timing)   = min(1, exposure_time / reaction_time)
```

Accuracy curve (approximate empirical data):
```
distance (m) | P(accuracy) single ball
0-5          | 0.95
5-10         | 0.85
10-15        | 0.70
15-20        | 0.50
20-25        | 0.35
25-30        | 0.20
30-35        | 0.12
35-40        | 0.06
40+          | 0.02
```

Sustained fire multiplier: `P(hit_in_window) = 1 - (1 - P_single)^(rof * exposure_time)`
where `rof ≈ 8 balls/sec` (reasonable semi-auto tournament rate).

---

## 3. Computational Engine (Web Worker)

### 3.1 Architecture

```
Main Thread                          Web Worker
─────────────                        ──────────
BreakAnalyzer.jsx                    ballisticsEngine.js
  │                                    │
  ├─ sends field data ───────────────► │ receives bunker positions,
  │   (bunkers, dimensions)            │ dimensions, config
  │                                    │
  │                                    ├─ computeVisibilityGrid()
  │                                    ├─ computeBallisticTable()
  │  ◄─── GRID_READY ─────────────────┤
  │                                    │
  ├─ sends path query ──────────────► │
  │   (player path, speed)             ├─ analyzeExposure()
  │  ◄─── EXPOSURE_RESULT ────────────┤
  │                                    │
  ├─ sends break config ────────────► │
  │   (5 paths + enemy pattern)        ├─ optimizeBreak()
  │  ◄─── BREAK_RESULT ───────────────┤
  │                                    │
  ├─ sends counter query ────────────► │
  │   (enemy path)                     ├─ findCounterPositions()
  │  ◄─── COUNTER_RESULT ─────────────┤
```

### 3.2 Worker Message Protocol

```typescript
// === Messages TO Worker ===

type WorkerInMessage =
  | {
      type: 'INIT_FIELD';
      payload: {
        fieldWidth: number;       // meters (e.g., 45)
        fieldLength: number;      // meters (e.g., 30)
        bunkers: BunkerDef[];
        gridResolution: number;   // cells per meter (default: 2 → 90×60 grid)
        ballisticConfig: {
          muzzleVelocity: number; // m/s, default 85
          elevationAngles: number[]; // [0, 5, 10, 15] degrees to pre-compute
        };
      };
    }
  | {
      type: 'ANALYZE_PATH';
      payload: {
        pathId: string;
        waypoints: Point[];       // sequence of (x, y) in field coords
        speed: number;            // m/s
        team: 'home' | 'away';
      };
    }
  | {
      type: 'ANALYZE_BREAK';
      payload: {
        homePaths: PathDef[];     // 5 paths
        awayPaths: PathDef[];     // 5 paths (known/scouted enemy tendencies)
      };
    }
  | {
      type: 'FIND_COUNTERS';
      payload: {
        enemyPath: PathDef;
        availableBunkers: string[]; // bunker IDs our player can go to
        maxResponseTime: number;    // max seconds to reach counter position
      };
    }
  | {
      type: 'COMPUTE_CROSSFIRE';
      payload: {
        shooterPositions: Point[];  // 2+ positions
        targetPath: PathDef;
      };
    };

// === Messages FROM Worker ===

type WorkerOutMessage =
  | {
      type: 'GRID_READY';
      payload: {
        visibilityGrid: Float32Array; // flattened NxNx4 (visible, distance, hitProb, flightTime)
        computeTimeMs: number;
      };
    }
  | {
      type: 'PATH_EXPOSURE';
      payload: {
        pathId: string;
        totalExposureTime: number;    // seconds
        maxSimultaneousThreats: number;
        segments: ExposureSegment[];
        overallSurvivalProb: number;  // probability of NOT getting hit
      };
    }
  | {
      type: 'BREAK_RESULT';
      payload: {
        homeExpectedHits: number;
        awayExpectedHits: number;
        perPlayer: PlayerBreakResult[];
        recommendations: string[];
      };
    }
  | {
      type: 'COUNTER_RESULT';
      payload: {
        options: CounterOption[];     // sorted by effectiveness
      };
    }
  | {
      type: 'PROGRESS';
      payload: { phase: string; percent: number };
    };
```

### 3.3 Core Data Types

```typescript
interface Point {
  x: number;  // meters from left edge
  y: number;  // meters from home base edge
}

interface BunkerDef {
  id: string;
  type: string;              // 'snake' | 'doritos' | 'can' | 'standup' | 'temple' | etc.
  position: Point;           // center point
  width: number;             // meters
  depth: number;             // meters
  height: number;            // meters
  shape: 'rect' | 'circle' | 'triangle'; // hitbox shape
  rotation: number;          // degrees
  mirror: boolean;           // auto-mirrored to other side
  // Derived (computed by worker):
  polygon?: Point[];         // actual collision polygon
}

interface PathDef {
  playerId: string;
  waypoints: Point[];
  speed: number;             // m/s
  startDelay: number;        // seconds after buzzer (reaction time, 0.1-0.3s)
}

interface ExposureSegment {
  fromT: number;             // seconds into run
  toT: number;
  position: Point;
  threats: {
    fromBunker: string;      // bunker ID the threat shoots from
    distance: number;
    hitProbPerSecond: number;
    canArc: boolean;         // requires arc shot
  }[];
  segmentSurvivalProb: number;
}

interface CounterOption {
  targetBunker: string;      // where our player goes
  arrivalTime: number;       // seconds to get there
  shootingWindow: {
    startT: number;          // when enemy enters our line of fire
    endT: number;            // when enemy reaches cover
    duration: number;
    hitProbability: number;  // P(hit) during this window
  };
  pathToPosition: Point[];   // recommended run path
  pathExposure: number;      // our player's exposure getting there
  score: number;             // composite score (higher = better option)
}
```

### 3.4 Visibility Grid Computation

The grid is the foundation. Pre-computed once per layout.

```
Grid dimensions: (fieldWidth * resolution) × (fieldLength * resolution)
e.g., 45m × 30m at 2 cells/m = 90 × 60 = 5,400 cells

For each pair of cells (A, B):
  — total pairs = 5400² / 2 ≈ 14.6M (too many for brute force)

Optimization: only compute FROM bunker shooting positions TO path-relevant cells.

Shooting positions: ~20-30 bunkers × 4 edges = ~100 positions
Target cells: all 5,400

Pairs to compute: 100 × 5,400 = 540,000 — very manageable.
At ~1μs per ray cast = ~0.5 seconds total.
```

For each (shooter_pos, target_cell) pair:
1. Cast ray in 2D from A to B
2. Check intersection with each bunker polygon
3. For each intersection: compare ray height at that x-distance with bunker height
4. If any bunker fully blocks → not visible at angle=0°
5. Repeat for each pre-computed elevation angle
6. Store: `{ visible: bool, distance: float, flightTime: float, hitProb: float }`

### 3.5 Performance Budget

Target: **< 3 seconds** for full grid computation on mid-range phone (2023 era).

| Operation | Estimated time |
|---|---|
| Parse & build bunker polygons | < 10ms |
| Visibility grid (540k pairs) | 500-1500ms |
| Ballistic table (100 distances × 4 angles) | < 50ms |
| Single path exposure analysis | < 20ms |
| Full 5v5 break analysis | < 200ms |
| Counter position search | < 100ms |

If needed: use `SharedArrayBuffer` + multiple workers for parallel grid computation on devices that support it. Fallback to single worker otherwise.

---

## 4. Firestore Data Model

### 4.1 Extension to Existing Layout Model

```
/workspaces/{slug}/layouts/{lid}
  ├── (existing fields: name, bunkers[], dimensions, etc.)
  │
  ├── bunkerMeta: {                    // NEW — height data per bunker
  │     [bunkerId]: {
  │       height: number,              // meters
  │       heightCategory: 'low' | 'mid' | 'high',
  │       shootingPositions: Point[],  // predefined edges/corners to shoot from
  │     }
  │   }
  │
  └── /breakAnalysis/{analysisId}      // NEW subcollection
        ├── name: string
        ├── createdAt: timestamp
        ├── type: 'break' | 'counter' | 'custom'
        ├── homePaths: PathDef[]
        ├── awayPaths: PathDef[]       // scouted / hypothetical enemy paths
        ├── results: {                 // cached computation results
        │     homeExpectedHits: number
        │     awayExpectedHits: number
        │     perPlayer: PlayerBreakResult[]
        │   }
        └── notes: string
```

### 4.2 Scouted Tendencies (Per Tournament)

```
/workspaces/{slug}/layouts/{lid}/tournaments/{tid}
  ├── (existing: teams, matches, etc.)
  │
  └── /scoutedBreaks/{scoutId}         // NEW subcollection
        ├── team: string               // opponent team name
        ├── matchRef: string           // which match this was observed
        ├── paths: PathDef[]           // 5 observed player paths
        ├── frequency: number          // how many times seen (1, 2, 3...)
        ├── tags: string[]             // e.g., ['aggressive', 'snake-heavy']
        └── createdAt: timestamp
```

### 4.3 Storage Efficiency

PathDef waypoints stored as compressed arrays:
```javascript
// Instead of [{x: 1.5, y: 0}, {x: 3.2, y: 4.1}, ...]
// Store as flat array with 1 decimal precision:
// [15, 0, 32, 41, ...] (multiply by 10, store as integers)
// Saves ~60% Firestore document size
```

Visibility grids are **never stored** — always recomputed on load (< 3s). Only paths and results are persisted.

---

## 5. Component Architecture

### 5.1 Component Tree

```
LayoutView (existing)
  │
  ├── FieldCanvas (existing — bunker rendering)
  │
  └── BreakAnalyzerModule (NEW — feature flag gated)
        │
        ├── BreakAnalyzerToolbar
        │     ├── ModeSelector        // 'visibility' | 'path' | 'break' | 'counter'
        │     ├── LayerToggles        // show/hide heatmap, paths, zones
        │     └── SettingsPanel       // physics params, grid resolution
        │
        ├── BreakAnalyzerCanvas       // overlay canvas on top of FieldCanvas
        │     ├── VisibilityHeatmap   // renders pre-computed grid as color overlay
        │     ├── PathRenderer        // draws player paths with exposure coloring
        │     ├── ShootingLanes       // lines from shooter to target with thickness = prob
        │     ├── CounterMarkers      // suggested counter positions
        │     └── CrossfireZones      // highlighted convergence areas
        │
        ├── PathEditor                // draw/edit paths via touch
        │     ├── PathDrawTool        // finger drag to draw path
        │     ├── WaypointEditor      // tap to add/remove/move waypoints
        │     └── PathList            // manage saved paths (home team 1-5, away 1-5)
        │
        ├── AnalysisPanel             // bottom sheet (mobile) or sidebar (tablet)
        │     ├── ExposureTimeline    // horizontal timeline showing danger zones during run
        │     ├── ThreatList          // which positions threaten this path
        │     ├── HitProbDisplay      // survival probability, expected hits
        │     └── RecommendationCards // actionable suggestions
        │
        └── BreakAnalyzerWorkerBridge // manages Web Worker lifecycle
              ├── useBallisticsWorker() hook
              ├── worker instance management
              └── message serialization/deserialization
```

### 5.2 Key Hooks

```javascript
// Worker lifecycle & communication
useBallisticsWorker(layoutData)
  → { isReady, progress, gridData, analyzePath, analyzeBreak, findCounters }

// Path drawing on canvas
usePathDrawing(canvasRef, { onPathComplete, snapToBunkers })
  → { isDrawing, currentPath, undo, clear }

// Analysis state management
useBreakAnalysis(layoutId)
  → { savedBreaks, scoutedPatterns, saveBreak, loadBreak, deleteBreak }

// Visibility at a point (tap on bunker → see what it covers)
useVisibilityAt(gridData, point)
  → { visibleCells, threats, shootingLanes }
```

### 5.3 Mobile UX Flow

```
┌─────────────────────────────────────────────┐
│  Field Layout (existing canvas)              │
│  ┌─────────────────────────────────────────┐ │
│  │                                         │ │
│  │         Field with bunkers              │ │
│  │         + overlay canvas                │ │
│  │         (heatmap / paths / lanes)       │ │
│  │                                         │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌──────────────────────────────┐            │
│  │ 👁 Visibility │ 🏃 Paths │ ⚔ Break │ 🛡 Counter │
│  └──────────────────────────────┘            │
│                                              │
│  ┌─────────────────────────────────────────┐ │
│  │  Bottom Sheet (drag up to expand)       │ │
│  │  ─────────────────────────────          │ │
│  │  Exposure: 0.8s | Survival: 72%        │ │
│  │  Threats: Snake1 (0.4s), Can2 (0.3s)   │ │
│  │  [Tap for details]                      │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

**Mode flows:**

1. **Visibility Mode** — tap any bunker → heatmap shows what it sees (green=covered, red=exposed). Tap two bunkers → show shooting lane between them with hit probability.

2. **Path Mode** — draw a path from base to bunker with finger. System instantly shows exposure analysis. Color-code the path: green=safe, yellow=moderate risk, red=high exposure.

3. **Break Mode** — define 5 home paths + 5 away paths (from scouting data). System computes expected outcome: hits given, hits taken, survival per player.

4. **Counter Mode** — draw enemy path → system highlights all viable counter positions with score. Tap a counter suggestion → see the full picture: your player's path to position, timing overlay, shooting window.

---

## 6. Canvas Rendering

### 6.1 Layer Stack (bottom to top)

```
1. Field background (existing)
2. Bunker shapes (existing)
3. Visibility heatmap (semi-transparent, togglable)
4. Shooting lanes (lines with opacity = probability)
5. Player paths (colored polylines with exposure gradient)
6. Counter markers (pulsing circles at suggested positions)
7. Crossfire zones (hatched overlap areas)
8. Interactive elements (drag handles, waypoints)
```

### 6.2 Rendering Approach

Use a **separate overlay canvas** stacked on top of existing FieldCanvas via CSS:

```jsx
<div style={{ position: 'relative' }}>
  <FieldCanvas />  {/* existing */}
  <canvas
    ref={overlayRef}
    style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'auto' }}
    width={canvasWidth}
    height={canvasHeight}
  />
</div>
```

This avoids modifying FieldCanvas at all. The overlay canvas handles:
- All BreakAnalyzer rendering
- Touch events for path drawing
- Tap events for bunker selection

### 6.3 Heatmap Rendering

Visibility heatmap uses `ImageData` for performance:

```javascript
function renderHeatmap(ctx, gridData, canvasWidth, canvasHeight, gridCols, gridRows) {
  const imageData = ctx.createImageData(canvasWidth, canvasHeight);
  const cellW = canvasWidth / gridCols;
  const cellH = canvasHeight / gridRows;

  for (let gy = 0; gy < gridRows; gy++) {
    for (let gx = 0; gx < gridCols; gx++) {
      const threatLevel = gridData[gy * gridCols + gx]; // 0-1
      const r = Math.floor(threatLevel * 255);
      const g = Math.floor((1 - threatLevel) * 255);
      const a = Math.floor(threatLevel * 120); // semi-transparent

      // Fill all pixels in this cell
      for (let py = Math.floor(gy * cellH); py < Math.floor((gy + 1) * cellH); py++) {
        for (let px = Math.floor(gx * cellW); px < Math.floor((gx + 1) * cellW); px++) {
          const idx = (py * canvasWidth + px) * 4;
          imageData.data[idx]     = r;
          imageData.data[idx + 1] = g;
          imageData.data[idx + 2] = 0;
          imageData.data[idx + 3] = a;
        }
      }
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
```

### 6.4 Path Exposure Coloring

Paths are drawn as polylines with per-segment color based on threat level:

```javascript
function renderPath(ctx, path, exposureSegments) {
  for (const segment of exposureSegments) {
    const threat = segment.threats.reduce((sum, t) => sum + t.hitProbPerSecond, 0);
    const color = threatToColor(threat); // green → yellow → red

    ctx.beginPath();
    ctx.moveTo(segment.fromPos.x, segment.fromPos.y);
    ctx.lineTo(segment.toPos.x, segment.toPos.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}
```

---

## 7. Integration Points with Existing PbScoutPro

### 7.1 Bunker Data Enrichment

Current bunker model (assumed from existing placement system):
```javascript
// Existing:
{ id, type, x, y, rotation, mirrored }

// Extended with:
{ id, type, x, y, rotation, mirrored, height, shootingEdges }
```

`height` can be auto-inferred from `type` using `HEIGHT_MAP` with manual override.
`shootingEdges` computed from shape geometry — which edges a player can shoot from.

### 7.2 Layout Module Integration

BreakAnalyzer activates as a **tab or mode** within the existing layout detail view:

```
Layout Detail
  ├── Overview (existing)
  ├── Tactics (existing)
  ├── Break Analyzer (NEW)    ← new tab
  └── Settings (existing)
```

Or, if tabs are getting crowded, as a **floating action button** that opens the analyzer overlay.

### 7.3 Disco/Zeeker Lines Reuse

Existing Disco/Zeeker line rendering can inform shooting lane visualization. Same rendering technique (line with label), different data source (computed from ballistics vs manually placed).

### 7.4 Theme Integration

All new UI elements use `theme.js` tokens:

```javascript
// New tokens to add:
breakAnalyzer: {
  heatmapSafe: 'rgba(76, 175, 80, 0.3)',
  heatmapDanger: 'rgba(244, 67, 54, 0.3)',
  pathHome: '#2196F3',
  pathAway: '#FF5722',
  shootingLane: 'rgba(255, 235, 59, 0.6)',
  counterMarker: '#9C27B0',
  crossfireZone: 'rgba(233, 30, 99, 0.2)',
}
```

### 7.5 Feature Flag

Gate the entire module behind a feature flag:

```javascript
// In app config or Firestore workspace settings:
features: {
  breakAnalyzer: true | false
}
```

---

## 8. Implementation Phases

### Phase 1 — Foundation (MVP)
**Estimated effort: 2-3 sessions**

- [ ] Bunker height data model extension
- [ ] Web Worker scaffold (`ballisticsEngine.js`)
- [ ] Ballistic trajectory solver (numerical integration)
- [ ] 2D ray-casting with height check
- [ ] Visibility grid computation
- [ ] `useBallisticsWorker` hook
- [ ] Overlay canvas setup
- [ ] Visibility heatmap rendering (tap bunker → see what it covers)
- [ ] Feature flag gating

**Deliverable:** Tap any bunker, see heatmap of what it can shoot / what can shoot it.

### Phase 2 — Path Analysis
**Estimated effort: 2-3 sessions**

- [ ] Touch-based path drawing tool
- [ ] Path exposure analysis in worker
- [ ] Path rendering with exposure gradient coloring
- [ ] Exposure timeline in bottom sheet
- [ ] Shooting lane visualization between two points
- [ ] Path save/load to Firestore
- [ ] Snap-to-bunker for path endpoints

**Deliverable:** Draw a run, instantly see danger zones and survival probability.

### Phase 3 — Break Optimization
**Estimated effort: 2-3 sessions**

- [ ] Multi-path editor (5 home + 5 away)
- [ ] Full break analysis computation
- [ ] Recommendation engine (suggest path swaps)
- [ ] Scouted tendencies import (from existing match data)
- [ ] Break save/load with results caching
- [ ] Side-by-side comparison of break variants

**Deliverable:** Define full 5v5 breakout scenario, get expected outcome and optimization tips.

### Phase 4 — Counter System
**Estimated effort: 1-2 sessions**

- [ ] Counter position finder algorithm
- [ ] Counter visualization (markers + paths + timing)
- [ ] Interactive: draw enemy path → see all counter options ranked
- [ ] Timing overlay (when enemy is exposed vs when defender arrives)

**Deliverable:** Draw opponent's run, see ranked defensive options with timing.

### Phase 5 — Crossfire & Polish
**Estimated effort: 1-2 sessions**

- [ ] Crossfire zone computation (2+ shooters converging)
- [ ] Crossfire visualization
- [ ] Performance optimization (SharedArrayBuffer if supported)
- [ ] UX polish — animations, transitions, mobile gestures
- [ ] Export / share break analysis

**Deliverable:** Full-featured tactical analysis tool.

---

## 9. Edge Cases & Constraints

### 9.1 Field Coordinate System
```
(0, 0) = home base center
x-axis = left-right (field width)
y-axis = towards away base (field length)
(fieldWidth/2, fieldLength) = away base center
```

All coordinates in **meters**. Canvas rendering scales to pixel space.

### 9.2 Symmetry
Field is symmetric along Y-axis. Bunkers defined on one side are mirrored. But break analysis is NOT symmetric — home team and away team have different perspectives. The mirror is about bunker placement, not about tactics.

### 9.3 Shooting Around Bunkers
Players don't just shoot over bunkers — they lean around them. A player behind a "standup" bunker can shoot left or right of it. The visibility model handles this via `shootingEdges` — a player at a bunker shoots from the edge, not the center.

### 9.4 Rate of Fire Budget
Tournament rules: ~10-12 bps max effective. In exposure calculations, use 8 bps as "aimed sustained fire" to avoid overestimating hit probability.

### 9.5 Reaction Time
After buzzer, player reaction time = 0.1-0.3s. Shooter acquiring target = 0.3-0.5s additional. Total: first shot at running player comes ~0.5-0.8s after exposure begins. Model this as `P(timing) = 0 for first 0.3s, then ramps up`.

---

## 10. File Structure

```
src/
  modules/
    breakAnalyzer/
      BreakAnalyzerModule.jsx       // main container component
      BreakAnalyzerToolbar.jsx      // mode & layer controls
      BreakAnalyzerCanvas.jsx       // overlay canvas
      AnalysisPanel.jsx             // bottom sheet with results
      PathEditor.jsx                // path drawing/editing
      components/
        VisibilityHeatmap.jsx       // heatmap render logic
        PathRenderer.jsx            // path + exposure coloring
        ShootingLanes.jsx           // lane visualization
        CounterMarkers.jsx          // counter suggestions
        ExposureTimeline.jsx        // timeline chart
        RecommendationCards.jsx     // actionable tips
      hooks/
        useBallisticsWorker.js      // worker lifecycle
        usePathDrawing.js           // touch path input
        useBreakAnalysis.js         // Firestore CRUD for analyses
        useVisibilityAt.js          // point query on grid
      workers/
        ballisticsEngine.js         // main Web Worker
        trajectory.js               // ballistic math (imported by worker)
        raycaster.js                // 2D ray-cast + height check
        visibilityGrid.js           // grid computation
        breakOptimizer.js           // multi-path optimization
        counterFinder.js            // counter position search
      config/
        ballisticConstants.js       // physics constants
        bunkerHeights.js            // HEIGHT_MAP
        playerModel.js              // player dimensions & speeds
      utils/
        coordinateTransform.js      // field coords ↔ canvas pixels
        pathCompression.js          // compact Firestore storage
```

---

## 11. Open Questions for Jacek

1. **Bunker data** — does the current layout model store bunker type names (e.g., "snake", "doritos") or just generic shapes? This determines how we auto-assign heights.

2. **Canvas setup** — is FieldCanvas a raw `<canvas>` element or wrapped in a library? Need to know for overlay positioning.

3. **Touch handling** — any existing gesture library (e.g., for pan/zoom on layouts)? Path drawing needs to coexist with it.

4. **Firestore budget** — how many reads/writes per session is acceptable? Visibility grids aren't stored, but break saves will add writes.

5. **Progressive rollout** — should Phase 1 be behind a beta flag visible only to certain workspaces?

---

*This specification is a living document. Update version number with each revision.*
*Next step: implement Phase 1 — visibility engine + heatmap overlay.*
