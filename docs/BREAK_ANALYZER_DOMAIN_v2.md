# PbScoutPro — Domain Context for BreakAnalyzer v2.0
## Paintball Xball: Implementation-Relevant Knowledge

> This document contains ONLY domain knowledge that directly affects code,
> constants, algorithms, or UX decisions in the BreakAnalyzer module.
> Each section ends with `→ IMPL:` tags mapping knowledge to implementation.

---

## 1. Field Geometry

Standard xball/Race-To field (NXL, Millennium):
- Length: 150 ft (≈45.7m) — base to base
- Width: 120 ft (≈36.6m) — wire to wire
- Grid on official layouts: **10ft × 10ft** squares (15 cols × 12 rows)
- Symmetry: rotational 180° — both teams face identical setup from their perspective

**PbScoutPro field orientation:**
- Field displayed SIDEWAYS — **bases are LEFT (home) and RIGHT (away)**
- Layout images have borders/margins — field area doesn't fill edge-to-edge
- No distance/scale currently defined in the app — needs calibration

**Bases:**
- Rectangular inflatables at LEFT and RIGHT edges of the field
- Players position themselves AROUND the base, touching it with their barrel
- Players MUST stay within field boundaries — going outside = elimination (out)
- On layout images: tall narrow pink/red/blue rectangles at extreme edges

→ IMPL: Coordinate system in PbScoutPro:
  `x-axis` = field LENGTH (left=home base, right=away base)
  `y-axis` = field WIDTH (top=one wire, bottom=other wire)
  
  Field calibration from grid detection:
  Official layouts have 10ft grid → if we detect gridlines, we know:
  `pixelsPerCell` = distance between lines in px
  `metersPerPixel = 3.048 / pixelsPerCell` (10ft = 3.048m)
  
  Base detection: tall narrow shapes at x < 5% or x > 95% → exclude
  from bunker analysis, use as path origin points.
```
fieldCalibration: {
  fieldBounds: { left, right, top, bottom },  // px where field starts/ends
  realLength: 45.7,   // meters
  realWidth: 36.6,    // meters
  gridDetected: bool, // did we find the 10ft grid?
  bases: { home: {x,y}, away: {x,y} },
}
```

---

## 2. Field Elements

### 2.0 Bases (NOT bunkers — exclude from analysis)

Each team has a **base** — a rectangular inflatable on their side.
- On layouts: tall narrow rectangles at LEFT and RIGHT edges
- Players must touch base with marker barrel, position around it
- Players MUST stay within field boundaries — stepping outside = elimination
- Bases are spawn/start points for path calculations, not obstacles

→ IMPL: Detect by position at extreme edges (x < 5% or x > 95%),
  tall narrow shape. Tag as `type: 'base'`, exclude from ballistic
  calculations. Store `homeBase` and `awayBase` centers for path origins.

### 2.1 Bunker Inventory — NXL 2026

Standard NXL set. Not all pieces used in every layout.

**CRITICAL**: On layout images, bunkers appear in two colors (red/brown + blue).
Colors are PURELY VISUAL — they show the two symmetric halves of the field.
Red dorito = blue dorito = identical bunker. **Ignore color in classification.**

| Abbrev | Full Name | Layout Shape | Height | Footprint |
|--------|-----------|-------------|--------|-----------|
| SB | Snake Beam | Narrow horizontal rect | 0.76m | 3.0m × 0.76m |
| SD | Small Dorito | Small triangle | 0.85m | 1.0m × 1.2m |
| MD | Medium Dorito | Larger triangle | 1.00m | 1.2m × 1.8m |
| Tr | Tree | Small circle | 0.90m | 0.6m diameter |
| C | Cylinder/Can | Large circle | 1.20m | 0.9m diameter |
| Br | Brick | Small solid rectangle | 1.15m | 1.5m × 0.9m |
| GB | Giant Brick | Large solid rectangle | 1.50m | 3.0m × 1.5m |
| MW | Mini W / Mini Wedge | Small rect with bump on top | 1.20m | 1.5m × 0.8m |
| Wg | Wing | Medium rect with bump | 1.40m | 2.0m × 1.0m |
| GW | Giant Wing / Big Wedge | Large rect with bump | 1.70m | 2.4m × 1.5m |
| Ck | Cake | Square block | 1.00m | 1.5m × 1.5m |
| TCK | Tall Cake | Tall square block | 1.60m | 1.5m × 1.5m |
| T | Temple | Medium complex shape | 1.50m | 1.8m × 1.5m |
| MT | Maya Temple | Large complex w/ arms | 1.80m | 2.5m × 2.0m |
| GP | Giant Plus / Starfish | Cross/star shape (NEW 2026) | 1.50m | 2.5m × 2.5m |

**Orientation note:** Bricks (Br, GB), beams (SB), and wedges (MW, Wg, GW)
can be placed HORIZONTAL or VERTICAL. ~90% of beams and wedges lie horizontal.
Bricks may be either. Store `rotation` per instance.

→ IMPL: Type list must be **extensible** — new shapes appear (GP is 2026).
  Allow custom types with user-defined height.

### 2.2 Visual Detection Keys (auto-detect from layout image)

Detection pipeline for auto-classifying bunkers from 2D layout images:

**Pre-processing:**
1. Color threshold: isolate non-white pixels (bunkers are red/brown or blue
   on white/light backgrounds). Convert to HSV, threshold on saturation.
2. Ignore color hue — both red and blue are bunkers
3. Filter corners (logos: NXL top-left, MLP top-right, Tampa Bay bottom-right)
4. Filter extreme edges (bases at x < 5% or x > 95%)
5. Morphological cleanup: erode+dilate to separate touching shapes
6. Connected components: find each blob

**Per-blob classification:**

```
Compute: area, perimeter, bounding_box, aspect_ratio,
         circularity (4π·area/perimeter²), convex_hull_vertices, solidity

SHAPE RULES:

1. circularity > 0.82 → CIRCLE
   - area < threshold_small → Tr (Tree)
   - area >= threshold_small → C (Can)

2. convex_hull_vertices == 3 (or close) → TRIANGLE
   - area < threshold_small → SD (Small Dorito)
   - area >= threshold_small → MD (Medium Dorito)

3. Cross-shape test (skeleton has 4+ branches from center) → GP (Giant Plus)

4. aspect_ratio > 3.0 → SB (Snake Beam)

5. aspect_ratio 0.8-1.25 (square-ish):
   - Complex shape (solidity < 0.7, many concavities) → MT or T
   - Simple solid → Ck (Cake) or TCK (Tall Cake)

6. aspect_ratio 1.3-3.0 (rectangular):
   - Edge regularity high (smooth edges) → Br or GB (Brick)
   - Edge irregularity (bump/protrusion on one side) → MW, Wg, or GW (Wedge)
   - Size split within each: small/medium/large

7. Complex multi-lobed shape:
   - Large, near center → MT (Maya Temple)
   - Medium → T (Temple)

SIZE THRESHOLDS: calibrate from grid (10ft = known pixel distance).
  One grid cell = 10ft = 3.048m. Snake beam ≈ 1 cell long.
  Can ≈ 0.3 cells diameter. Medium dorito ≈ 0.4-0.6 cells.
```

→ IMPL: Run detection on layout image upload. Present results as overlay:
  each detected blob gets a colored label with proposed type.
  User taps to correct any misclassifications.
  Store confirmed types in Firestore alongside positions.

### 2.3 Bunker Properties by Type

**Snake Beams (SB)**
- Multiple beams form the "snake" — a chain along one wire/tape
- Player: LIES FLAT (prone), height 0.40m
- Sit-up over beam: height 0.95m, forward arc 120°, high exposure
  (only when supported / few enemies remain)
- Movement along snake: crawl 1.0-2.0 m/s
- Gaps between beams are kill zones (0.3s exposure per gap)
- Cover: excellent from sides, zero from ends

→ IMPL: Detect snake chain: SB-type bunkers near tape (y < 15% or y > 85%),
  roughly collinear, sorted by x-position.
```
snakeChain: {
  segments: BunkerDef[],
  gaps: [{ between: [id1, id2], width: number, position: Point }],
  stances: [
    { name: 'prone_side', playerHeight: 0.4, arcs: ['left','right'], arcWidth: 30 },
    { name: 'situp_beam', playerHeight: 0.95, arcs: ['forward'], arcWidth: 120 },
  ],
  moveSpeed: 1.5,
  gapExposureTime: 0.3,
}
```

**Doritos (SD, MD)**
- Triangle: point faces enemy, wide back
- Player: KNEELS (height 1.10m)
- Shooting: lean out left or right, exposing head + gun arm (~0.3m wide)
- Cover: narrow from front, wide from sides

→ IMPL: `shape: 'triangle', playerStance: 'kneeling', leanExposure: 0.3m`

**Trees (Tr) and Cans (C)**
- Circular: 360° rotation but only covers what's directly behind
- Tree: small, low (0.90m) — player kneels/crouches tightly
- Can: larger, taller (1.20m) — more comfortable kneeling position
- Player can shoot any direction by rotating around the cylinder

→ IMPL: `shape: 'circle', firingArcs: [0, 360], coverRadius: diameter/2`

**Bricks (Br, GB)**
- Solid rectangle — like a wall. Good cover from one direction.
- Can be horizontal or vertical → changes which lanes it blocks
- GB (Giant Brick) is much larger, provides standing cover

→ IMPL: `shape: 'rect', rotation: 0|90`
  Br: kneeling. GB: standing behind it.

**Wedges / Wings (MW, Wg, GW)**
- Rectangle with bumpy/asymmetric top edge
- The "bump" means the top surface isn't flat — harder to shoot over
- Can be horizontal (lying) or vertical (standing) — ~90% horizontal
- GW (Giant Wing) provides standing cover

→ IMPL: Same as bricks but with slightly taller effective height due to bump.
  For ballistic purposes, add +0.10m to height for the irregular top.

**Cakes (Ck, TCK)**
- Square blocks. Ck is medium, TCK is tall
- Ck: player kneels. TCK: player can stand.

→ IMPL: `shape: 'rect', aspectRatio: ~1.0`

**Temples (T, MT)**
- Complex shapes with multiple surfaces/angles
- MT (Maya Temple) has "arms" extending from a central body
- Usually placed at strategic positions (mid-field, center)
- Player can stand behind them. Multiple shooting angles possible.

→ IMPL: Use convex hull as simplified hitbox for ray-casting.
  For detailed cover analysis (Phase 5+), use actual polygon.

**Giant Plus / Starfish (GP)**
- Cross/star shape — NEW for 2026 season
- Height ~1.50m — standing cover
- Distinctive: provides cover from 4 directions simultaneously
- Unique shooting angles between the "arms"

→ IMPL: `shape: 'cross'` — hitbox as two overlapping rectangles forming a +.

---

## 3. Player Positions & Roles

### 3.1 The Five Roles (classic assignment)

| Role | Where they go | Speed priority | Risk level |
|------|--------------|---------------|------------|
| Snake player | Snake side, aggressive | Sprint | Very high |
| Snake insert | Supports snake, mid-snake side | Sprint | High |
| Dorito player | Dorito side, aggressive | Sprint | Very high |
| Center / Mid | Center structures | Moderate | Medium |
| Back / Home | Stays near base or tall back bunker | Low | Low |

→ IMPL: Each of the 5 paths in a break tagged with a role.
  Role affects default speed (sprint vs jog) and risk tolerance.
  `roles: ['snake', 'snake_insert', 'dorito', 'center', 'back']`

### 3.2 Player Physical Model

| Property | Value | Context |
|----------|-------|---------|
| Sprint speed | 6.0-7.0 m/s | Break run, straight line |
| Jog speed | 3.5-4.5 m/s | Cautious movement |
| Crawl (snake) | 1.0-2.0 m/s | Moving along snake |
| Slide-in speed | 5.0-6.0 m/s | Last 1-2m diving into bunker |
| Height standing | 1.70-1.80m | Behind tall bunkers |
| Height running | 1.55-1.65m | Hunched sprint |
| Height kneeling | 1.00-1.15m | Behind medium bunkers |
| Height prone | 0.35-0.45m | Snake, lying flat |
| Shoulder width | 0.40-0.50m | Hitbox width |
| Reaction time (buzzer) | 0.05-0.20s | Time to start moving |
| Target acquisition | 0.30-0.50s | Time to aim at spotted target |

→ IMPL: Default `PLAYER_SPRINT = 6.5`, `PLAYER_HEIGHT_RUNNING = 1.60`.
  Hitbox running: 0.45m × 1.60m.
  Hitbox sliding: lower (1.0m) but wider (0.6m) for last 1.5m.
  First 0.3s of exposure → no incoming fire (target acquisition delay).

### 3.3 Effective Target Area (simplified)

Don't model individual body zones. Use single effective target area by stance:
- `running = 0.45 × 1.60 = 0.72 m²`
- `kneeling = 0.45 × 0.50 = 0.225 m²` (only upper body above bunker)
- `prone = 0.45 × 0.25 = 0.1125 m²`
Accuracy curve already accounts for difficulty of hitting at distance.

---

## 4. The Break — First 5 Seconds

### 4.1 Sequence of Events

```
T = 0.00s   Buzzer sounds
T = 0.05-0.15s   Players react, start moving from base positions
T = 0.10-0.30s   Players sprint toward assigned bunkers
T = 0.50-0.80s   FIRST SHOTS — back players / bump players start shooting
T = 1.00-1.50s   Aggressive players (snake/dorito) cross exposed zones
T = 1.50-2.50s   First eliminations — players caught in the open
T = 2.00-3.50s   Players reach primary bunkers, break is "set"
T = 3.00-5.00s   Engagement phase begins — positional play
```

→ IMPL: Analysis window T=0 to T=5s. `ANALYSIS_WINDOW = 5.0` seconds.
  Back players shoot at T≈0.5s. Front players most vulnerable T=1.0-2.5s.

### 4.2 Laning

"Laning" = pre-aiming at a point and shooting sustained stream as enemy crosses.

- Laner shoots BEFORE target arrives (sustained stream)
- Target runs THROUGH the lane — brief exposure (0.1-0.4s)
- Multiple laners on same lane = multiplicative threat (crossfire)
- Kill zone ≈ 1.0m wide perpendicular to target path

→ IMPL: `P(lane_kill) = 1 - (1 - P_single)^(rof * exposure_time)`
  Two laners: `P(combined) = 1 - (1 - P1)(1 - P2)`
  rof = 8 bps. At sprint through 1m zone: exposure ≈ 0.15s → ~1.2 balls.

### 4.3 Common Break Patterns

- **Aggressive snake push**: 2-3 players to snake side (high risk)
- **Dorito control**: mirror of above
- **Center lock**: all safe positions (low risk, low reward)
- **Split push**: snake + dorito aggressive simultaneously

→ IMPL: Store as `breakTemplates[]` in config. Phase 3 presets.

### 4.4 Bump Spots (Przycupa)

A "bump" = **pre-break open stance**. At buzzer, player stands EXPOSED
(not behind cover) to get a clean, stable shooting lane that's unavailable
from behind a bunker. Stationary, fully exposed (1.75m), but shooting from T=0.

Risk/reward meta-game:
- First point: opponent doesn't know → free kill opportunity
- Later points: opponent pre-aims bump spot → bumper becomes easy target

→ IMPL: Bump spots are distinct from paths:
```
bumpSpot: {
  position: Point,          // open field position
  shooterHeight: 1.75,      // standing, fully exposed
  targetPoint: Point,       // where they're aiming
  startTime: 0.0,           // shooting from T=0
  targetAcquisition: 0.0,   // already aimed
  shootingDuration: 1.5-3.0,// seconds before retreating to cover
  retreatPath: PathDef,     // escape route after shooting
}
```
  Counter: bump spots are high-value targets (stationary + fully exposed).

---

## 5. Shooting Mechanics

### 5.1 Firing Arcs from Bunker Positions

**Can/Tree (circular, 360° capable):**
Rotate around bunker. Effective arc per stance: ~120° per lean.

**Dorito (limited arcs):**
Left or right lean only. Two ~60° arcs on each side. Switch time ~0.5-1.0s.

**Snake (very restricted):**
Prone: ~30° cone left, ~30° cone right.
Sit-up: ~120° forward (high exposure).

**Tall structures (Temple, Maya, GW, TCK):**
Standing: pick a side, shoot from edge. Arc ~90-120° from that edge.

→ IMPL: Each bunker type defines `firingPositions[]`:
```
firingPositions: [
  { side: 'left', offset: {x: -0.4, y: 0}, arcCenter: 270, arcWidth: 120, stance },
  { side: 'right', offset: {x: 0.4, y: 0}, arcCenter: 90, arcWidth: 120, stance },
]
```

### 5.2 Arc Shots (Parabolic Over Bunkers)

Players angle marker 5-15° upward to lob over low obstacles.
Less accurate (~45% of base accuracy). Used for:
- Shooting over snake from across field
- Lobbing over low doritos at medium range
- "Sweetspotting" — arc that clears bunker but drops onto player behind

→ IMPL: In visibility grid, for blocked pairs check arc with elevation 5-15°.
  `arcAccuracyMultiplier: 0.45`. Only check if direct LOS blocked.

---

## 6. Counter-Play Logic

### 6.1 Counter Algorithm

Enemy path is known (from scouting). Find positions where YOUR player:
1. Can REACH in time (before enemy crosses engagement zone)
2. Has LINE OF SIGHT to enemy path during exposure window
3. Is NOT overly exposed (survival matters)
4. Has good HIT PROBABILITY (distance, angle)

→ IMPL: `findCounterPositions()`:
  For each candidate bunker B:
    `t_arrive = pathDistance(ourBase, B) / sprintSpeed`
    For each point P on enemy path:
      `t_enemy = pathDistance(enemyBase, P) / enemySpeed`
    Find overlap windows. Score = Σ(hitProb) - exposurePenalty.
  Sort by score, top 3-5 become recommendations.

### 6.2 Blocking vs Containing

**Blocking** = stopping one specific run (lane that path)
**Containing** = owning an area (deny movement through zone)

→ IMPL: Phase 4 = blocking. Phase 5+ = containing (area denial viz).

---

## 7. Field Zones & Naming Convention

```
                     Snake side (top in app)
              ↑
    HOME ┌────────────────────────────────────────┐ AWAY
    BASE │ H-Back │ Inserts │ Snake40 │ Snake50   │ BASE
         │        │         │         │  (deep)   │
         │H-Center│   Mid   │  Center │           │
         │        │         │         │           │
         │ H-Back │ Inserts │   D40   │   D50     │
         └────────────────────────────────────────┘
              ↓
                     Dorito side (bottom in app)

         ←── Home zone ──→←── Mid ──→←── Deep/50 ──→
```

→ IMPL: Auto-assign zone tags:
  `x < 33%` → "home", `33-66%` → "mid", `x > 66%` → "deep/50"
  `y < 40%` → "snake side", `y > 60%` → "dorito side", else → "center"

---

## 8. Implementation Constants

```javascript
export const BALLISTIC_CONSTANTS = {
  ballMass: 0.0032,           // kg
  ballDiameter: 0.0173,       // m
  dragCoefficient: 0.47,      // sphere
  airDensity: 1.225,          // kg/m³
  gravity: 9.81,              // m/s²
  muzzleVelocity: 85,         // m/s (≈280 fps)
  maxElevation: 15,           // degrees
  effectiveRange: 45,         // m
};

export const PLAYER_CONSTANTS = {
  sprintSpeed: 6.5, jogSpeed: 4.0, crawlSpeed: 1.5, slideSpeed: 5.5,
  heightStanding: 1.75, heightRunning: 1.60, heightKneeling: 1.10, heightProne: 0.40,
  shoulderWidth: 0.45,
  reactionTime: 0.10, targetAcquisition: 0.40,
  rateOfFire: 8, sideSwapTime: 0.8,
};

export const ACCURACY_CURVE = [
  [5, 0.95], [10, 0.85], [15, 0.70], [20, 0.50],
  [25, 0.35], [30, 0.20], [35, 0.12], [40, 0.06], [50, 0.02],
];

export const BUNKER_HEIGHTS = {
  SB: 0.76,  SD: 0.85,  MD: 1.00,  Tr: 0.90,  C: 1.20,
  Br: 1.15,  GB: 1.50,  MW: 1.20,  Wg: 1.40,  GW: 1.70,
  Ck: 1.00,  TCK: 1.60, T: 1.50,   MT: 1.80,  GP: 1.50,
};

export const BUNKER_STANCE = {
  SB: 'prone',  SD: 'kneeling', MD: 'kneeling', Tr: 'kneeling', C: 'kneeling',
  Br: 'kneeling', GB: 'standing', MW: 'kneeling', Wg: 'kneeling', GW: 'standing',
  Ck: 'kneeling', TCK: 'standing', T: 'standing', MT: 'standing', GP: 'standing',
};

export const BARREL_HEIGHT = {
  prone: 0.45, kneeling: 1.15, standing: 1.55, running: 1.30, bump: 1.55,
};

export const FIELD_DEFAULTS = {
  length: 45.7, width: 36.6, gridFt: 10,
  analysisWindow: 5.0, gridResolution: 2,
};

export const ARC_SHOT = {
  accuracyMultiplier: 0.45,
  elevationAngles: [0, 3, 5, 8, 10, 13, 15],
  clearanceMargin: 0.20,
};
```

---

## 9. Glossary

| Term | Meaning | Impl relevance |
|------|---------|----------------|
| Break / OTB | Opening sprint at buzzer | Core analysis unit |
| Lane / Laning | Pre-aimed sustained fire at a crossing point | Primary kill mechanism |
| Bump / Przycupa | Pre-break open stance for clean shooting lane | Stationary shooter, full exposure |
| Insert | Support position between base and 50 | Role / bunker zone |
| Snap | Quick lean-out, shoot, tuck back | Post-break (Phase 5+) |
| Sweetspot | Arc angle clearing cover to hit player behind | Arc shot optimization |
| Run-through | Aggressive move past the 50 into enemy territory | Extreme risk path |
| Cross-up | Unexpected path — going opposite side from usual | Counter-tendency play |
| Wire / Tape | Sideline of the field | Boundary constraint |
| Bunker up | Reach and secure a bunker position | Path endpoint |
| Trade | Teammate eliminates who eliminated you | Not modeled Phase 1-4 |
| Out | Player steps outside field boundary → eliminated | Field boundary constraint |

---

## 10. NOT Covered (Intentionally)

Tournament rules/penalties, marker specs beyond velocity, paint quality,
team strategy beyond break analysis, comms/coaching, history, equipment.

---

*Document version 2.0 — companion to BREAK_ANALYZER_SPEC.md*
*Provide both documents to any LLM working on BreakAnalyzer implementation.*
