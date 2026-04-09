# Ballistic System — Documentation & Status

## Architecture
- **Web Worker**: `src/workers/ballisticsEngine.js` (454 lines)
- **Hook**: `src/hooks/useVisibility.js` — bridges React ↔ Worker
- **Canvas integration**: `src/components/FieldCanvas.jsx` renders visibility heatmap overlay

## Message Protocol (Worker ↔ Main Thread)

### INIT_FIELD
Initializes field with bunker geometry.
```
Input:  { fieldW, fieldH, bunkers: [{id, x, y, type, widthM?, depthM?, heightM?, shape?}], res=4 }
Output: { type: 'FIELD_READY', payload: { cols, rows, bunkers: count } }
```
- Bunkers converted from normalized (0-1) to meters using fieldW/fieldH
- Missing dimensions filled from SIZES/HEIGHTS lookup tables by bunker type
- Grid resolution: default 4 cells per meter

### QUERY_VIS (3-Channel Visibility)
Computes what you can hit from a bunker or free point.
```
Input:  { bunkerId?, pos?: {x,y}, stanceOverride?: 'prone'|'kneeling'|'standing' }
Output: { type: 'VIS_RESULT', payload: {
  bunkerId, cols, rows, isSnake, stance, barrelH,
  safe: Float32Array,     // direct LOS, behind cover (green→red gradient)
  arc: Float32Array,      // lob over obstacle, behind cover (orange)
  exposed: Float32Array,  // must expose body to shoot (blue)
}}
```
**3 channels:**
- **Safe**: Direct flat shot clears all obstacles. Shooter stays behind cover. Best quality.
- **Arc**: Flat shot blocked, but angled (3°-15°) shot works. Accuracy ×0.45. Still behind cover.
- **Exposed**: Must lean/sit-up to shoot. Direct or arc, but body visible. Risky.

**Priority**: safe > arc > exposed (only show lower channels when higher is zero)

### ANALYZE_PATH
Evaluates survival probability along a running path.
```
Input:  { pathId, waypoints: [{x,y}], speed=6.5 m/s, shooters: [{x,y,bh}] }
Output: { type: 'PATH_RESULT', payload: { pathId, totalT, surv, elim, segs } }
```

### ANALYZE_COUNTER
Full counter-analysis: bump heatmap + bunker scoring.
```
Input:  { enemyPath, enemySpeed, myBase, mySpeed, rof=8 }
Output: { type: 'COUNTER_RESULT', payload: {
  bumpGrid, bumpCols, bumpRows, counters (top 8 bunkers sorted by score), enemyTotalTime
}}
```

## Physics Constants
- Muzzle velocity: 85 m/s (~280 fps)
- Drag coefficient: calculated from 0.68" cal paintball
- Gravity: 9.81 m/s²
- Simulation timestep: 0.001s (Euler integration)
- Arc angles tested: 0°, 3°, 5°, 8°, 10°, 13°, 15°
- Max range: 45m (beyond = no hit possible)
- Arrival height min: 0.20m (ball must be above ground)

## Player Heights
- Prone (snake): barrel at 0.45m, sit-up at 0.95m
- Kneeling: barrel at 1.15m
- Standing: barrel at 1.55m

## Bunker Data
Heights, widths, depths for all NXL types defined in HEIGHTS/SIZES tables.
Stances per bunker type in STANCE table (determines default shooting position).

## Ray Casting
- Rectangle intersection: AABB ray test
- Circle intersection: quadratic formula
- `shotClear()`: tests if ball at height clears all bunkers between shooter and target
- `ballH()`: computes ball height at distance given barrel height and elevation angle

## Shooting Positions
From each bunker, 4-5 positions are generated:
- Left/right/top/bottom of bunker (covered=true, barrel at stance height)
- For low bunkers (<1.5m): over-the-top position (covered=false, barrel above bunker)
- Snake/prone: sides covered, front/back are exposed (sit-up required)

## Known Issues (from Jacek's feedback)
1. **Visibility incorrectly computed** — some bunkers don't block as expected
2. **Shot occlusion errors** — bullets pass through bunkers that should block
3. **Height not properly considered** — low obstacles (snake beam, cake) should allow shots over them when standing

## Planned Development Phases

### Phase 1: Direct Shot (Step 1)
Fix basic visibility — from any point on field, show where you can shoot directly.
No obstacles between you and target. This is the "best shot" — clear line of sight.

### Phase 2: Risky Shot (Step 2)  
Shots that require leaning out — you CAN shoot but you're visible to multiple opponents.
Risk = number of opponent positions that can see you.

### Phase 3: Low Obstacle Shot (Step 3)
Shots over low bunkers (snake beam, cake, wedge). Standing player can shoot over 
low obstacle to hit another standing player. Ball trajectory clears the obstacle.

### Phase 4: Arc/Blind Spot Shot (Step 4)
Parabolic shots over medium obstacles. Shooter raises barrel angle, ball arcs over 
obstacle to hit target behind cover. Limited by max practical angle.

### Future: Bounce, Counter-play, Break Planning, Prediction
