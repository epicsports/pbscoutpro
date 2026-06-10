# Intensity-encoding inventory (extraction bundle, 2026-06-10)

Every place the app visually encodes data **intensity / magnitude / frequency / count**, grouped by mechanism. Verified against source. Feeds DESIGN_DECISIONS §115 (colour-semantics) + the Hitability Summary intensity-ramp redesign.

## Mechanism A — RGB-lerp + alpha-ramp on a density grid (the §61/§62 heatmap family, 6 sites)
Shared shape: `alpha = min(cap, t·k + floor)`, hue lerped per surface.
| Encodes | file:line | hue lerp | alpha |
|---|---|---|---|
| Deaths density | `drawAnalyticsField.js:67-70` | `rgb(239,68,68)→(220,38,38)` | `min(0.85, t·0.85+0.12)` |
| Break positions | `drawAnalyticsField.js:142-145` | `rgb(250,204,21)→(239,68,68)` (gold→rust) | `min(0.88, t·0.85+0.12)` |
| Bump density A | `HeatmapCanvas.jsx:~474` | `rgb(191,219,254)→(168,85,247)` | `min(0.92, t·0.95+0.18)` |
| Bump density B | `HeatmapCanvas.jsx:~474` | `rgb(244,114,182)→(212,83,150)` | `min(0.92, t·0.95+0.18)` |
| Shot density A | `HeatmapCanvas.jsx:~543` | `rgb(239,68,68)→(220,38,38)` | `min(0.88, t·0.9+0.15)` |
| Shot density B | `HeatmapCanvas.jsx:~547` | `rgb(6,182,212)→(4,212,240)` | `min(0.88, t·0.9+0.15)` |

## Mechanism B — alpha-only choropleth, fixed hue (zone frequency)
| Encodes | file:line | formula |
|---|---|---|
| Callout-zone shot freq | `HeatmapCanvas.jsx:639` | `alpha = 0.12 + 0.30·freqNorm` (lerp 0.12→0.42), hue = zone colour |
| Callout-zone **kill** freq | `HeatmapCanvas.jsx:638` | `alpha = 0.30 + 0.40·freqNorm` (lerp 0.30→0.70) + red outline |
| "Luf" connector strength | `HeatmapCanvas.jsx:~694` | stroke `alpha = dim?0.08:0.5`, width 1.5 |

## Mechanism C — marker SIZE ∝ count (no colour) — the outlier
| Encodes | file:line | formula |
|---|---|---|
| Hitability target weight | `HitabilityCanvas.jsx:154` | `radius = 11 + min(cnt,12)·1.2` (cap 23.4px). **No colour channel.** |
| Layout cumulative HITS | `HitabilityAnalyticsSection.jsx` (read-only `HitabilityCanvas` w/ `weightTargets`) | same radius formula, cumulative across trainings |

## Mechanism D — numeric count badge (exact, no ramp)
Kill-cluster badge `HeatmapCanvas.jsx:~572` (red circle + white count) · Hitability badge `HitabilityCanvas.jsx:162-166` (**amber `#f59e0b`** circle + white count) · shooter-credit badge `drawAnalyticsField.js:~100`.

## Mechanism E — stroke-weight ∝ value
Counter lanes `drawBunkers.js:133`: `lineWidth = max(1.5, pHit·5)`; lane hue by type (safe `#22c55e` / arc `#f97316` / exposed `#3b82f6`); selection alpha `isSelected?1:0.25`.

## Mechanism F — visibility multi-channel ramps (theme-level, has a colour-blind variant)
`theme.js:99-137` `HEATMAP.default` vs `HEATMAP.colorblind`, switched by `activeHeatmap` (`:179`). Default: `safe` green→red (`rgb(0,200,0)→(255,0,0)`), `arc` orange, `exposed` blue→purple, `bump` cyan. Colorblind: white→yellow→orange→purple.

*(Static, non-intensity for contrast: zone fill `drawZones.js:~90` `color+'28'` (16% flat, presence-only); position markers — shape (circle/triangle/X) + team hue, isolation `baseAlpha 0.16|1`.)*

---

## Divergence table — A vs B vs C
| | A — density grid | B — choropleth | C — Hitability |
|---|---|---|---|
| **Channel** | hue lerp **+** alpha | **alpha only**, fixed hue | **size only**, no colour |
| **Floor→cap** | α 0.12–0.18 → 0.85–0.92 | α 0.12→0.42 (kill 0.30→0.70) | r 11→23.4px |
| **Normalization** | `t = v/max` per cell | `freqNorm = count/maxW` per phase | `min(cnt,12)` (hard cap) |
| **Hue carries magnitude?** | yes (shifts) | no (constant) | n/a |
| **Colour-blind intensity cue** | via alpha (hue unreliable) | via alpha (single hue) | via size (hue-free, safe) |

Three different mental models for "more = ___": **A** = redder+more-opaque, **B** = more-opaque, **C** = bigger. No shared scale.

## Dominant ramp / canonization candidate (report, not decide)
- **By usage**, Mechanism **A** dominates (6 sites) + shares one alpha formula — but it's a *family of per-surface hues*, not one ramp; its hue lerps are **not luminance-monotonic** (deaths/break go *darker* as hotter; intensity is actually carried by the **alpha** ramp, not luminance). So A is alpha-monotonic, hue-arbitrary.
- **Existing colour-blind-safe ramp:** `HEATMAP.colorblind` (`theme.js:120-137`) is white→yellow→orange→purple — a **luminance-ordered, deuteranopia-safe** sequential ramp. Strongest *existing* canonical candidate if one ramp is wanted (today scoped to the visibility heatmap only).
- **B** (alpha-only single hue) is the cleanest monotonic-intensity model but encodes magnitude only as opacity (weak at low counts on the dark bg).
- **C** (Hitability) is the explicit redesign target (§115 / parked #1) — size-only, no ramp.

## Amber-clash note (`#f59e0b` = interactive accent, §27)
1. **Direct:** the Hitability count badge fills with `COLORS.accent #f59e0b` on a **non-interactive** badge (`HitabilityCanvas.jsx:164`) — a mild §27 amber-decorative tension (alongside the documented BigMove-default exception).
2. **Adjacent:** the break-position ramp's low-density stop `rgb(250,204,21)` sits visually near amber → faint break heat can read as "interactive gold."
3. **Forward risk:** a green→yellow→red sequential ramp (the obvious choice for Hitability) **traverses amber** mid-scale → collides with the accent's interactive meaning. `COLORS_ZONE_PALETTE` already excludes amber for this reason; a canonical magnitude ramp should likely too (the colorblind white→yellow→orange→purple avoids the amber-interactive band better than green→amber→red). **Ramp choice = Opus.**
