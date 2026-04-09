# Bunker Recognition Guide — PbScoutPro

## Purpose
This document teaches Claude (Vision API and agents) to recognize bunker types from 2D layout images.
Updated incrementally as Jacek teaches new shapes. **All agents must read this before processing layout images.**

---

## Bunker Types (NXL 2025-2026)

### Doritos (triangular)
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Small Dorito | SD | Small dark/red triangle | Smallest dorito |
| Medium Dorito | MD | Medium dark/red triangle | Only difference from SD = size |

- Usually found in rows near dorito side of field
- SD vs MD: **only size**, no shape change

### Bricks
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Brick | Br | Small blue upright rectangle | Part of snake compound structure |
| Giant Brick | GB | Large blue upright rectangle | Clearly bigger than Br |

### Cylinders & Round
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Cylinder | C | **Blue circle/ball** | Round, blue on 2D layouts |
| Cake | Ck | Low wide circle | Part of snake compound structure |

### Trees
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Tree | Tr | **Small red circle/dot** | Looks like a small red ball on 2D. NOT a cylinder — red = tree, blue = cylinder |

### Wings & W-shapes
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Wing | Wg | Small angled panel | Part of snake compound structure |
| Giant Wing | GW | Large rectangle with dark cut/bevel | Characteristic darker section = the cut |
| Mini Wedge | MW | Small W/wedge shape | |

### Temples
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Temple | T | Stepped pyramid shape | Like stairs from side |
| Maya Temple | MT | Large stepped pyramid | Bigger version of T, often near base |

### Beams
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Snake Beam | SB | Long horizontal red bar | No positionName — ballistics only. Part of snake compound + connects to center GP |

### Special / Center
| Type | Abbrev | 2D Appearance | Notes |
|------|--------|---------------|-------|
| Giant Plus | GP | Red cross/plus shape | Often center field. Snake Beams connect to it |

---

## Critical Recognition Rules

### Color = Type (on 2D layouts)
| Color | Shape | = Type |
|-------|-------|--------|
| **Red circle** (small) | dot/ball | **Tree (Tr)** |
| **Blue circle** (round) | ball | **Cylinder (C)** |
| **Red triangle** | triangle | **Dorito (SD/MD)** — size determines which |
| **Blue rectangle** (small) | upright rect | **Brick (Br)** |
| **Blue rectangle** (large) | upright rect | **Giant Brick (GB)** |
| **Red horizontal bar** | long bar | **Snake Beam (SB)** |
| **Red cross** | plus shape | **Giant Plus (GP)** |

### ⚠️ SNAKE = Compound Structure
A "snake" on a paintball field is NOT a single bunker. It is a **compound structure** assembled from multiple individual pieces:

**Standard snake composition (per side):**
- 4× Snake Beam (SB) — the horizontal bars
- 1× Cake (Ck) — round low piece
- 1× Brick (Br) — upright rectangle
- 1× Wing (Wg) — angled panel

There are typically **2 snakes** on a field (one each side of center), and they connect to a **center Giant Plus (GP)** via additional Snake Beams.

### Position helps identification
- **Near bases (field edges):** SB rows, SD/MD dorito rows, MT
- **Center field (50-yard line):** GP with SB connections
- **Mid-field scattered:** T, MT, C, Br, GW
- **Snake structure (running along one side):** SB + Ck + Br + Wg compound

### Ignore on layout images
- Corner logos (NXL, Major League Paintball, event logos)
- Base markers / start positions at field edges
- Grid lines, measurements, text labels
- Watermarks

---

## Height Groups (for ballistics)
| Group | Types | Approx height |
|-------|-------|---------------|
| low | SD, Ck | 2-3ft — crouch only |
| med | MD, Br, C, Wg, MW | 3-4ft — kneel cover |
| tall | T, Tr, MT, GB, GW, GP, SB | 4-6ft — standing cover |

## Shadow / Ballistics Rules
- Shadow starts **BEHIND** the obstacle (obstacle blocks line of fire, like casting light)
- Shadow direction depends on attacker position
- Taller obstacles → longer shadows (more cover)
- Low obstacles (SD, Ck) → short shadows, minimal cover
- Snake Beams provide cover only along their length axis

---

## Training Log
| Date | Source | What was learned |
|------|--------|-----------------|
| 2026-04-09 | World Cup 2025 (labeled layout) | All type abbreviations, positions, legend |
| 2026-04-09 | Tampa 2026 layout | GP = cross, GW = rect with cut, snake = compound (4SB+Ck+Br+Wg), Tr = small red circle, C = blue circle |
| 2026-04-09 | Jacek training session | Color rules: red circle=Tr, blue circle=C. Snake is compound not single. MT near base. |

## Pending Questions
- MW (Mini Wedge) vs larger Wedge — same type different sizes or separate?
- GP (Giant Plus) vs the X shape at base center — same type?
