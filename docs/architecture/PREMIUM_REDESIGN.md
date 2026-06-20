# Premium "North Star" Redesign — progress + screen map

Source: Jacek's design handoff (`reads ⊖ Design System.zip` → `reference/redesign.jsx` +
`theme.jsx` + `README.md`). A premium dark re-skin built on the **ELEV elevation system**,
the **Crest** team-logo primitive, the **RdIcon** line-icon set, and a tighter type scale.

## ✅ Shipped (live)
- **Foundation** — `theme.js` ELEV (surface/raised/overlay/sunken + hairline/hairlineStrong +
  shadow1-3 + innerTop + `ring()`), TYPE, TRACKING, TNUM. `RdIcon` (`src/components/RdIcon.jsx`,
  full handoff set + trash/shield/globe/palette). `global.css` keyframes (rdPulse/rdFade/rdSheetUp)
  + classes (rd-press/rd-zone/rd-scroll). Additive — existing COLORS untouched.
- **Menu (nav drawer)** — `NavDrawer` premium chrome + `MoreShell` (eyebrow + ELEV Card; rows with
  sunken icon TILE + RdIcon, `iconName` prop) + every menu emoji → RdIcon across MoreTabContent /
  TrainingMoreTab. Full e2e 113/113.
- **`Crest`** primitive (`src/components/Crest.jsx`) — the single team-logo tile (gradient + initials,
  size-derived radius). Available; wire into team-showing screens as they're re-skinned.

## 🗺 Screen → app mapping (for the remaining "Done" handoff screens)
| Handoff screen | App screen | Mapping | Notes |
|---|---|---|---|
| Nav drawer | `NavDrawer` + `MoreShell` | ✅ done | — |
| Match list (`MatchListPremium`) | `MatchCard` in Scout/CoachTabContent (MainPage) | clean | uses Crest (see Q1) |
| Player stats (`PlayerStatsPremium`) | `PlayerStatsPage` | clean 1:1 | needs the data-viz primitives (RdSplitBar/RdGaugeCards/RdDonut/RdStack) |
| Opponent analysis (`OpponentAnalysisPremium`) | `ScoutedTeamPage` | clean 1:1 | data-viz + Crest |
| Live scoring (`LiveMatchPremium`) | `MatchPage` | large | phone/desktop/tablet dispatcher; HIGHEST risk (NXL-proven capture) |
| **Coach team list** (`CoachTeamListPremium`) | **no clean match** | ⚠ ambiguous | a coach scout-browse (search + hide/unhide + records). NOT `TeamsPage` (admin add/edit/hierarchy/leagues/divisions). Needs a product call (Q2). |

## ❓ Open product questions (gate the remaining screens — Jacek)
- **Q1 — Crest (initials) vs real team logos.** The handoff says Crest is THE team primitive
  ("never ad-hoc logos") — initials over a color gradient. The app shows REAL uploaded team logos
  (`TeamBadge`/`WorkspaceLogo`). Swapping every team to an initials crest is a product change, not a
  re-skin. Options: (a) Crest everywhere per the handoff; (b) Crest as a fallback when no logo;
  (c) keep logos, adopt only the premium framing. **Recommend (b).**
- **Q2 — "Coach team list" target.** Is this a NEW coach scout-browse screen, or a re-skin of an
  existing one (TeamsPage? the scouted-teams list in CoachTabContent?)? It doesn't map 1:1.

## ▶ Recommended next (unambiguous, pure re-skins)
Player stats → opponent analysis → match list. Each needs the **data-viz vocabulary** ported first
(`RdSplitBar` :836 · `RdFieldLanes` :880 · `RdStack` :944 · `RdGaugeCards` :969 · `RdDonut` :1003 ·
`rdPct` :454) as shared primitives, then the screen layouts. Live scoring (MatchPage) LAST — it's the
NXL-proven capture path; treat like the tactic extraction (golden-master + parity, not a free re-skin).

Reference markup lives in the handoff `reference/redesign.jsx` at the line refs above.
