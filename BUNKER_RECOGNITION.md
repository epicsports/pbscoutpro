# Bunker Recognition Guide — PbScoutPro

## Purpose
This document teaches Claude (Vision API and agents) to recognize bunker types from 2D layout images.
Updated incrementally as Jacek teaches new shapes.

## ⚠️ READ THIS FIRST
All agents (Opus, Claude Code) must read this file before processing layout images.
When suggesting bunker names/types, use this knowledge base.

---

## Bunker Types (NXL 2025-2026)

### Doritos (triangular)
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Small Dorito | SD | Small triangle | ~3ft | Smallest dorito |
| Medium Dorito | MD | Medium triangle | ~4ft | Only difference from SD is size |

- On 2D layouts: solid dark triangles (red or black fill, sometimes with shadow/gradient)
- Usually found in rows near the bases (dorito side of field)
- SD vs MD: **only size difference**, no shape change

### Bricks & Rectangles
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Brick | Br | Small upright rectangle | ~3×2ft | Blue on 2D layouts |
| Giant Brick | GB | Large upright rectangle | ~5×3ft | Blue, clearly bigger than Br |

### Cylinders & Round
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Cylinder | C | Circle/sphere | ~3ft dia | Often gray or dark on 2D |
| Cake | Ck | Low wide circle | ~3ft dia, short | Flat/pancake look |

### Tall / Tree-like
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Tree | Tr | Tall thin cylinder | ~5ft tall | Red on 2D, taller than C |

### Wings & W-shapes
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Wing | Wg | Small wing shape | ~3ft | Angled panel |
| Giant Wing | GW | Large rectangular with cut | ~5ft | Characteristic darker cut/bevel on one side |
| Mini W | MW | Small W shape | ~3ft | W-shaped from above |

### Temples
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Temple | T | Stepped pyramid | ~4ft | Like stairs from side |
| Maya Temple | MT | Large stepped pyramid | ~5ft | Bigger version of T |

### Beams
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Snake Beam | SB | Long horizontal bar | ~8-12ft | Red, always near snake side / base area. No positionName — ballistics only |

### Special / Center
| Type | Abbrev | Visual | Size | Notes |
|------|--------|--------|------|-------|
| Giant Plus | GP | Cross/plus shape | ~5ft | Red cross shape, often center field |
| Wedge | Wdg | Rectangle with center gradient | ~4ft | Looks like a "breast" — gradient bump in middle. Often center field near snake structure |

---

## Layout Recognition Rules

### Color conventions on 2D layouts
- **Red/dark red**: Doritos, Trees, Beams, GP, Wedge — typically "obstacle" colored
- **Blue**: Bricks, Giant Bricks — typically "shelter" colored  
- **Gray/dark**: Cylinders
- **Mixed/gradient**: Wings, GW have characteristic darker cut

### Position on field helps identification
- **Near bases (edges)**: SB (beams), SD/MD (dorito rows), Br (bricks)
- **Center field (50-yard)**: GP, Wedge, GW, SB structure
- **Mid-field**: T, MT, C, Br scattered

### Ignore on layouts
- Corner logos (NXL, Major League Paintball, event logos)
- Base markers / start positions
- Grid lines and measurements
- Text labels

---

## Shadow / Ballistics Model

### Shadow rules (for future ballistics)
- Shadow starts BEHIND the obstacle (as if the obstacle casts light/blocks line of fire)
- Shadow direction depends on the attacker's position
- Taller obstacles cast longer shadows (more cover)
- Low obstacles (Ck, SD) cast shorter shadows

### Height groups (for ballistics)
| Group | Types | Approx height |
|-------|-------|---------------|
| low | SD, Ck, C | 2-3ft |
| med | MD, Br, Wg, MW, Wdg | 3-4ft |
| tall | T, Tr, MT, GB, GW, GP, SB | 4-6ft |

---

## Training Log
- **2026-04-09**: Initial training from World Cup 2025 (labeled) + Tampa 2026 + CZE + UK + FRA layouts
- Learned: GP = cross shape, Wedge = rectangle with center gradient, GW = large rect with dark cut, SB = horizontal beams near base/snake
- Pending: confirm Br vs Tr on Tampa, confirm C vs other round shapes, confirm dorito sizes, identify bottom X shape on Tampa
