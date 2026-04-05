# CC BRIEF: Design Token Migration
**Priority:** HIGH — foundation for all future UI work
**Run `npm run precommit` before every commit. Push after each part.**

## OVERVIEW
theme.js now exports `FONT_SIZE`, `RADIUS`, `SPACE` tokens.
`FONT` changed from JetBrains Mono to Inter.

Migrate ALL inline values across ALL files to use these tokens.

## IMPORTS
Every file that uses tokens needs:
```javascript
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
// or from '../../utils/theme' depending on depth
```

## TOKEN MAPPING

### FONT_SIZE (replace all inline `fontSize: N`)
| Inline value | Token | Usage |
|---|---|---|
| fontSize: 8-9 | FONT_SIZE.xxs | badge labels, toolbar labels, hints |
| fontSize: 10-11 | FONT_SIZE.xs | chips, secondary labels, close links |
| fontSize: 12 | FONT_SIZE.sm | pills, sub-text, select options |
| fontSize: 13-14 | FONT_SIZE.base | body, buttons, inputs, card subtitles |
| fontSize: 15-16 | FONT_SIZE.lg | card titles, save button, headers |
| fontSize: 17-18 | FONT_SIZE.xl | page titles |
| fontSize: 20-22 | FONT_SIZE.xxl | hero, scores, large titles |

### RADIUS (replace all inline `borderRadius: N`)
| Inline value | Token | Usage |
|---|---|---|
| borderRadius: 3-4 | RADIUS.xs | tiny badges, OT pill |
| borderRadius: 6 | RADIUS.sm | status badges |
| borderRadius: 8 | RADIUS.md | chips, inputs, small cards |
| borderRadius: 10-12 | RADIUS.lg | toolbar buttons, medium cards |
| borderRadius: 14 | RADIUS.xl | buttons, cards, modals |
| borderRadius: 16-20 | RADIUS.xxl | bottom sheets |
| borderRadius: '50%' or 999 | RADIUS.full | circles, pills |

### SPACE (replace inline padding/gap values)
| Inline value | Token | Usage |
|---|---|---|
| padding/gap: 4 | SPACE.xs | tight gaps |
| padding/gap: 8 | SPACE.sm | chip gaps |
| padding/gap: 12 | SPACE.md | section padding |
| padding/gap: 16 | SPACE.lg | page padding |
| padding/gap: 20 | SPACE.xl | section margins |
| padding/gap: 24 | SPACE.xxl | large spacing |
| padding: '0 16px' | `0 ${SPACE.page}px` | page horizontal |

### HARDCODED COLORS (replace with COLORS.xxx)
| Hardcoded | Token |
|---|---|
| '#f59e0b' | COLORS.accent |
| '#ef4444' | COLORS.danger |
| '#22c55e' | COLORS.success / COLORS.win |
| '#3b82f6' | Use TEAM_COLORS.B or COLORS.info |
| '#f97316' | COLORS.bump (add if missing) |
| '#64748b' | COLORS.textMuted |
| '#94a3b8' | COLORS.textDim |
| '#1e293b' | COLORS.border |
| '#0f172a' | COLORS.surfaceDark (add) |
| '#111827' | COLORS.surface |
| '#475569' | COLORS.textMuted (or add textFaint) |
| '#334155' | COLORS.borderLight (add) |

## EXECUTION ORDER
Work file by file. For each file:
1. Add imports (FONT_SIZE, RADIUS, SPACE)
2. Replace all inline fontSize with FONT_SIZE.xxx
3. Replace all inline borderRadius with RADIUS.xxx
4. Replace padding/gap with SPACE.xxx where obvious
5. Replace hardcoded hex colors with COLORS.xxx
6. Build + precommit after each file

### File order (by impact):
1. `src/pages/MatchPage.jsx` — most inline values (146 fontSize)
2. `src/pages/TournamentPage.jsx`
3. `src/pages/HomePage.jsx`
4. `src/pages/TeamDetailPage.jsx`
5. `src/pages/LayoutDetailPage.jsx`
6. `src/pages/TacticPage.jsx`
7. `src/components/ui.jsx` — shared components
8. `src/components/RosterGrid.jsx`
9. `src/components/ShotDrawer.jsx`
10. `src/components/BottomSheet.jsx`
11. `src/components/HeatmapCanvas.jsx`
12. `src/components/BunkerCard.jsx`
13. `src/components/PageHeader.jsx`

## RULES
- Do NOT change visual appearance — only replace literals with tokens
- If a value doesn't map cleanly to a token, leave it as-is
- `fontFamily: FONT` stays the same (FONT value changed in theme.js)
- Canvas drawing code (drawPlayers.js etc.) can keep inline values
- Keep `TOUCH` references as-is for now (backward compat)
- Add missing COLORS if needed (surfaceDark, borderLight, bump, info)

## TESTING
After ALL files migrated:
- [ ] App loads without errors
- [ ] All pages render correctly
- [ ] Font is now Inter everywhere (not JetBrains Mono)
- [ ] No visual changes except font family
