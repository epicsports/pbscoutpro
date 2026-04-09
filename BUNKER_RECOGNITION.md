# Bunker Recognition Guide — PbScoutPro

## Purpose
This document teaches Claude (Vision API and agents) to recognize **individual** bunker types from 2D layout images.
**All agents must read this before processing layout images.**

---

## ⚠️ CRITICAL RULE: One inflatable = one bunker = one name

Every bunker on a paintball field is a **single inflatable piece**. On 2D layouts, multiple bunkers may be placed touching each other forming structures (like the "snake"), but each inflatable is a separate bunker with its own type.

**DO NOT** treat a cluster of bunkers as one shape. Break down what you see into individual inflatables.

Example: A "snake" structure on a 2D layout looks like one long connected shape, but it's actually: Beam + Beam + Cake + Beam + Brick + Beam + Wing — each is a separate bunker placed next to each other.

---

## Bunker Types (NXL 2025-2026)

Each type = one inflatable piece. Recognized by shape, NOT by color (colors vary by manufacturer/layout style).

### Doritos (triangular)
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Small Dorito | SD | Small triangle/pyramid | low |
| Medium Dorito | MD | Medium triangle/pyramid | med |

- SD vs MD: **only size difference**, same shape
- 3D: pointed cone/pyramid shape
- 2D: solid triangle

### Bricks (rectangular)
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Brick | Br | Small upright rectangular block | med |
| Giant Brick | GB | Large upright rectangular block | tall |

- 3D: rectangular box standing upright
- 2D: rectangle (usually blue on NXL layouts)

### Cylinders & Round
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Cylinder | C | Round barrel shape | med |
| Cake | Ck | Low flat disc/puck | low |

- 3D cylinder: tall-ish barrel. 2D: circle (blue on NXL)
- 3D cake: short flat disc. 2D: wide low circle

### Trees
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Tree | Tr | Tall thin cylinder | tall |

- 3D: tall narrow cylinder/column (taller than C)
- 2D: small circle (red/dark on NXL — smaller than cylinder on 2D)

### Wings & Wedges
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Wing | Wg | Small angled panel | med |
| Giant Wing | GW | Large panel with cut/bevel | tall |
| Mini Wedge | MW | Small wedge/W shape | med |

### Temples
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Temple | T | Stepped pyramid (stairs from side) | tall |
| Maya Temple | MT | Large stepped pyramid | tall |

### Beams
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Snake Beam | SB | Long horizontal inflatable bar | tall |

- Part of snake structures (placed in lines with other bunkers)
- **Rarely named** by scouts — but MUST be in ballistics model (provides cover/shadow)
- No positionName assigned — ballistics only

### Special
| Type | Abbrev | Shape | Height group |
|------|--------|-------|-------------|
| Giant Plus | GP | Cross/plus shape | tall |

- Often at center of snake structure
- Snake Beams may extend from it

---

## How to Read a 2D Layout

### Step 1: Identify individual inflatables
Break down every visible shape into individual pieces. A cluster = multiple bunkers placed touching each other.

### Step 2: Classify each inflatable by shape
- Triangle → Dorito (SD or MD by size)
- Rectangle upright → Brick (Br or GB by size)
- Circle → Cylinder (C) or Tree (Tr) or Cake (Ck) by size/height
- Long bar → Snake Beam (SB)
- Cross → Giant Plus (GP)
- Stepped → Temple (T) or Maya Temple (MT)
- Angled panel → Wing (Wg) or Giant Wing (GW)

### Step 3: Name by position on field
Use the proprietary naming system from theme.js:
- Dorito side: D1, D2, D3, D4, D5, Palma
- Snake side: S1, S2, S3, S4, S5, Cobra, Ring, Scar1/2/3
- Center: Hammer, Hiena, Gwiazda, etc.
- Center bunkers (X: 30-65%) get no mirror pair

### What to ignore on layout images
- Logos (NXL, MLP, event branding)
- Base start positions
- Grid lines, measurements, text
- Watermarks, netting/barriers

---

## Ballistics Model

### Shadow rules
- Shadow = cover zone behind a bunker from attacker's perspective
- Shadow starts **at the far edge** of the obstacle (not under it)
- Taller bunkers → longer shadow → more cover
- Low bunkers (SD, Ck) → short shadow

### Snake Beams in ballistics
- SB are rarely named but **must be modeled** for ballistics
- They provide continuous linear cover along their length
- A player behind a snake beam line is protected from cross-field shots

### Height groups for ballistics
| Group | Types | Cover level |
|-------|-------|-------------|
| low | SD, Ck | Crouch only, minimal shadow |
| med | MD, Br, C, Wg, MW | Kneel cover |
| tall | T, Tr, MT, GB, GW, GP, SB | Standing cover |

---

## Training Log
| Date | Source | Lesson |
|------|--------|--------|
| 2026-04-09 | World Cup 2025 labeled | Type abbreviations, legend |
| 2026-04-09 | Tampa 2026 (2D + 3D views) | Each inflatable = one bunker. Structures are composed of multiple individual bunkers placed next to each other. Snake = many SB + Ck + Br + Wg. GP at center with SB extending. |
| 2026-04-09 | Jacek correction | DO NOT treat clusters as single shapes. Break down into individual inflatables. SB rarely named but required for ballistics. |
