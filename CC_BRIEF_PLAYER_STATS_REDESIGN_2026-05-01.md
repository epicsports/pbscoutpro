# CC BRIEF — PlayerStatsPage redesign

**Date:** 2026-05-01
**Branch:** `feat/player-stats-redesign-2026-05-01`
**Approved by:** Jacek (mockup v2 GO 2026-05-01)
**Mockup reference:** chat 2026-05-01, widget `player_stats_redesign_v2_bigger_fonts_avatars`
**Format:** decision-tree, single Jacek checkpoint after STEP 7

---

## What this is

Redesign `src/pages/PlayerStatsPage.jsx` end-to-end per Sławek's coach workflow + Apple HIG § 27. New visual hierarchy (3 component types), new naming convention (descriptive verb-phrase headers), new metric (per-bunker survival rate), data-source pille (transparent provenance), avatar cards in chemistry sections, depth section disabled.

## Source of truth for visual specs

The approved mockup widget contains the canonical visual spec. CC must reference it for exact font sizes, paddings, gaps, color tokens, avatar design (overlapping with 2.5px border cutout), and BarRow dimensions. If any visual ambiguity arises during implementation → **ESCALATE TO JACEK**, do not improvise.

---

## STEP 0 — Pre-flight (10 min — MANDATORY)

Verify Opus assumptions about codebase before touching anything. Opus memory may be stale; verify against real code.

### 0.1 Confirm file structure
```bash
wc -l src/pages/PlayerStatsPage.jsx           # expect ~1084
grep -c "^[A-Z]" src/pages/PlayerStatsPage.jsx
ls -la src/utils/playerStats.js src/utils/i18n.js
git log --oneline -20 src/pages/PlayerStatsPage.jsx src/utils/playerStats.js
```

### 0.2 Verify section structure in PlayerStatsPage.jsx
Open the file and confirm 7 sections exist in this order:
1. Profile header (avatar, name, HERO badge)
2. Scope pills (Ten turniej / Globalny / Ten mecz)
3. A. Performance (HeroMetric x2 + Chip x4)
4. B. Styl gry (sub-sections)
5. C. Słabości (sub-sections)
6. D. Chemia składu (LineupStatsSection)
7. E. Historia meczów

### 0.3 Verify computePlayerStats signature
Open `src/utils/playerStats.js`. Confirm:
- `computePlayerStats(playerPoints, field)` exists at L98±
- `classifyPosition` helper at L58±
- Return shape includes: `winRate`, `survival`, `plusMinus`, `kills`, `killsPerPoint`, `ptsPlayed`, `sideTendency`, `breakShotZones`, `obstacleShotZones`, `deathReason`, `deathBunkers`, `breakBunkers`

### 0.4 Search for helpers (may or may not exist)
```bash
grep -rn "winRateColor\|colorByRate\|rateColor" src/utils/ src/components/
grep -rn "getPlayerColor\|playerColor" src/utils/theme.js src/components/
grep -rn "getPlayerInitial\|playerInitial" src/utils/ src/components/
grep -rn "LineupStatsSection\|<LineupStats" src/
```

### 0.5 Output report

Send to Jacek before proceeding:
```
STEP 0 report:
- PlayerStatsPage.jsx: {N} lines, sections {confirmed/diverged}
- playerStats.js: existing metrics {list}, missing for redesign: bunkerSurvivalRate
- i18n.js: existing section keys to update: {list}
- winRateColor: [exists at {path}:{L}] / [needs creation]
- getPlayerColor: [exists at {path}:{L}] / [needs creation]  
- getPlayerInitial: [exists at {path}:{L}] / [needs creation]
- LineupStatsSection used in: {file paths}
- Recent commits touching these files: {summary or "none since 2026-05-01"}
```

**IF discovery diverges from Opus assumptions** → ESCALATE TO JACEK with specific divergence.
**IF all matches** → proceed to STEP 1.

---

## STEP 1 — Helpers

### 1a. winRateColor(rate)

**IF exists** → reuse. Note location for use in STEPs 5b, 5d.
**IF NOT exists** → create `src/utils/colorThresholds.js`:

```js
import { COLORS } from './theme.js';

/**
 * Returns color hex for a rate-based metric (0-100).
 * Used for win rate, survival rate, accuracy, +/-.
 * 
 * Thresholds: >70 green, 50-70 amber, <50 red, null = textDim
 */
export function winRateColor(rate) {
  if (rate == null || isNaN(rate)) return COLORS.textDim;
  if (rate > 70) return COLORS.success;     // #22c55e
  if (rate >= 50) return COLORS.warning;    // #f59e0b
  return COLORS.danger;                      // #ef4444
}

/**
 * Returns color hex for plus/minus metric (negative = bad).
 * Threshold: > +5 green, -5 to +5 amber, < -5 red.
 */
export function plusMinusColor(value) {
  if (value == null || isNaN(value)) return COLORS.textDim;
  if (value > 5) return COLORS.success;
  if (value >= -5) return COLORS.warning;
  return COLORS.danger;
}
```

Verify with: `winRateColor(78)===COLORS.success`, `winRateColor(60)===COLORS.warning`, `winRateColor(33)===COLORS.danger`, `winRateColor(null)===COLORS.textDim`.

### 1b. getPlayerColor(player)

**IF exists** → reuse.
**IF NOT exists** → use inline:
```js
const playerColor = player.color || COLORS.playerColors?.[playerIndex] || COLORS.surfaceLight;
```
Where `playerIndex` = position in roster (0-4). Fallback `COLORS.surfaceLight` (slate) if no array.

### 1c. getPlayerInitial(player)

**IF exists** → reuse.
**IF NOT exists** → inline:
```js
const initial = (player.nickname || player.firstName || player.name || '?').trim()[0]?.toUpperCase() || '?';
```

---

## STEP 2 — New metric: bunkerSurvivalRate per bunker

### 2.1 Modify `computePlayerStats` in `src/utils/playerStats.js`

Currently `breakBunkers` returns `[{ name, count }]` (or similar shape — verify in STEP 0). Extend to:

```js
breakBunkers: [
  { name: 'Snake1', played: 8, survived: 7, survivalRate: 88 },
  { name: 'Snake3', played: 5, survived: 3, survivalRate: 60 },
  { name: 'Center1', played: 3, survived: 1, survivalRate: 33 },
]
```

Computation:
- Iterate over `playerPoints` already filtered by playerId (existing logic)
- Per point: identify `breakBunker` (existing logic)
- Per point: `survived = !eliminations[playerSlot]` (true if eliminated flag is false/missing)
- Aggregate per bunker: `played++`, `if (survived) survived++`
- Final: `survivalRate = played > 0 ? Math.round(survived / played * 100) : null`
- Sort by `played DESC`, take top N (existing behavior)

### 2.2 Backward compat for `count` field

```bash
grep -rn "breakBunkers\.\|breakBunkers\[" src/
```

**IF `count` is read in other files** → keep as alias: `{ name, count: played, played, survived, survivalRate }`.
**IF only PlayerStatsPage uses it** → rename clean: `count → played`.

---

## STEP 3 — Data-source pille component

### 3.1 Create `<DataSourcePill>` component

Add to `src/components/ui.jsx` (or inline in PlayerStatsPage if you prefer — ask which is right per project convention; check if other components live in ui.jsx or as separate files).

```jsx
function DataSourcePill({ source }) {
  if (!source) return null;
  const config = {
    'scout': {
      bg: 'transparent',
      color: COLORS.textDim,
      label: t('data_source_scout'),  // "scout"
    },
    'scout+self': {
      bg: '#22d3ee15',
      color: '#22d3ee',
      label: t('data_source_scout_self'),  // "scout + self"
    },
    'scout-only': {
      bg: '#f59e0b15',
      color: '#f59e0b',
      label: t('data_source_scout_only'),  // "scout only"
    },
  }[source];
  if (!config) return null;
  return (
    <span style={{
      fontSize: FONT_SIZE.xs,
      fontWeight: 600,
      padding: '3px 9px',
      background: config.bg,
      color: config.color,
      borderRadius: RADIUS.sm,
      fontFamily: FONT,
      letterSpacing: '0.2px',
    }}>
      {config.label}
    </span>
  );
}
```

### 3.2 Per-section pille mapping

| Section | `dataSource` prop |
|---|---|
| Win rate (HeroMetric) | scout |
| Survival (HeroMetric) | scout+self |
| Punkty (HeroMetric) | scout+self |
| +/− (HeroMetric) | scout |
| Kills (HeroMetric) | scout |
| K/pt (HeroMetric) | scout |
| Zazwyczaj gra po stronie | scout+self |
| Najczęściej zaczyna grę na | scout+self |
| Na breaku strzela | scout+self |
| Na pierwszej przeszkodzie gra w stronę | scout-only |
| Powód spadania | scout+self |
| Najczęściej trafiane przeszkody | scout-only |
| Najlepiej gra w duecie z | scout-only |
| Najlepiej gra w trójce z | scout-only |
| Historia meczów | (no pill) |

**IMPORTANT:** Pille są **presentation only**. They describe the data origin, do NOT change underlying logic. Sections marked `scout+self` already use union via Phase 1a foundation. Sections marked `scout-only` will unlock to `scout+self` in Phase 1b (separate brief).

---

## STEP 4 — i18n updates

### 4.1 Add new keys to `src/utils/i18n.js`

```js
// Section headers
stats_zazwyczaj_gra_po_stronie: { pl: 'Zazwyczaj gra po stronie:', en: 'Usually plays on side:' },
stats_najczesciej_zaczyna_gre_na: { pl: 'Najczęściej zaczyna grę na:', en: 'Most often starts game at:' },
stats_na_breaku_strzela: { pl: 'Na breaku strzela:', en: 'Shoots on break:' },
stats_na_pierwszej_przeszkodzie: { pl: 'Na pierwszej przeszkodzie gra w stronę:', en: 'On first obstacle plays toward:' },
stats_powod_spadania: { pl: 'Powód spadania:', en: 'Reason eliminated:' },
stats_najczesciej_trafiane: { pl: 'Najczęściej trafiane przeszkody:', en: 'Most often hit obstacles:' },
stats_najlepiej_w_duecie: { pl: 'Najlepiej gra w duecie z:', en: 'Best plays in duo with:' },
stats_najlepiej_w_trojce: { pl: 'Najlepiej gra w trójce z:', en: 'Best plays in trio with:' },
stats_historia_meczow: { pl: 'Historia meczów', en: 'Match history' },
stats_zagranych: { pl: 'Zagranych:', en: 'Played:' },

// HeroMetric labels (uppercase, short)
stats_metric_win_rate: { pl: 'WIN RATE', en: 'WIN RATE' },
stats_metric_survival: { pl: 'SURVIVAL', en: 'SURVIVAL' },
stats_metric_punkty: { pl: 'PUNKTY', en: 'POINTS' },
stats_metric_plusminus: { pl: '+/−', en: '+/−' },
stats_metric_kills: { pl: 'KILLS', en: 'KILLS' },
stats_metric_kpt: { pl: 'K/PT', en: 'K/PT' },

// Data source pills
data_source_scout: { pl: 'scout', en: 'scout' },
data_source_scout_self: { pl: 'scout + self', en: 'scout + self' },
data_source_scout_only: { pl: 'scout only', en: 'scout only' },

// Inline helpers
stats_pkt: { pl: 'pkt', en: 'pts' },
stats_punktow: (n) => ({ 
  pl: `${n} ${n===1?'punkt':n>=2&&n<=4?'punkty':'punktów'}`,
  en: `${n} ${n===1?'point':'points'}`
}),
stats_n_meczow: (n) => ({ 
  pl: `${n} ${n===1?'mecz':n>=2&&n<=4?'mecze':'meczów'}`,
  en: `${n} ${n===1?'match':'matches'}`
}),
stats_meczow_zagranych: { pl: 'punkty zagrane', en: 'points played' },
stats_survival_short: { pl: 'SURV', en: 'SURV' },
```

### 4.2 Remove or replace stale keys

Search and replace usages:
- `stats_strona_pola` → `stats_zazwyczaj_gra_po_stronie`
- `stats_top_break_bunker` / `stats_ulubiony_bunker` → `stats_najczesciej_zaczyna_gre_na`
- `stats_kierunek_break_shotow` → `stats_na_breaku_strzela`
- `stats_kierunek_obstacle_shotow` → `stats_na_pierwszej_przeszkodzie`
- `stats_pary_dorito` → `stats_najlepiej_w_duecie`
- `stats_trojki` → `stats_najlepiej_w_trojce`
- `stats_glebokosc_pozycji` → REMOVE (depth section disabled — STEP 6)

If any of these keys are used in OTHER pages (not just PlayerStatsPage), keep the old key + add new one as alias. Don't break other pages. Run:
```bash
grep -rn "stats_strona_pola\|stats_top_break_bunker\|stats_kierunek_break_shotow\|stats_kierunek_obstacle_shotow\|stats_pary_dorito\|stats_trojki\|stats_glebokosc_pozycji" src/
```

---

## STEP 5 — Visual restructure

Reference mockup widget for exact pixel values. Below is summary; mockup is canonical.

### 5a. Profile header

- Avatar 72px (mobile) / 88px (tablet), circle, `getPlayerColor(player)` bg, `getPlayerInitial(player)` 26px / 32px text
- `#{number}` 14px / 16px amber color, weight 700
- Name 22px / 30px, weight 600
- Subtitle 14px / 16px `COLORS.textMuted`
- HERO badge (if `player.hero === true`): inline-block 11px / 13px, amber bg + border, "★ HERO" letter-spacing 0.5px

### 5b. Headline 6-metric grid

Layout:
- Mobile: `grid-template-columns: repeat(3, 1fr)` (3×2 grid)
- Tablet: `grid-template-columns: repeat(6, 1fr)` (1×6 row)
- Gap: 10-12px

Per card:
- bg `COLORS.surface` (#0f172a), border 1px `COLORS.border`, radius 12-13px
- padding 14px 8px / 16px 12px
- Number 26px / 32px, weight 800, color = `winRateColor(value)` for rate metrics, `COLORS.text` for counts
- Label 11px / 12px, weight 600, letter-spacing 0.4-0.5px, uppercase, `COLORS.textDim`
- Mini bar (4px h, surfaceLight bg, colored fill) ONLY for rate metrics. Transparent placeholder for counts (alignment).
- DataSourcePill BELOW bar, 10-11px

Metrics:
| Metric | Number color | Mini bar | dataSource |
|---|---|---|---|
| Win rate | winRateColor | yes | scout |
| Survival | winRateColor | yes | scout+self |
| Punkty | text (neutral) | no | scout+self |
| +/− | plusMinusColor | no | scout |
| Kills | text | no | scout |
| K/pt | text | no | scout |

### 5c. "Zazwyczaj gra po stronie:" — BarRow x3

Layout:
```
SectionHeader (title + DataSourcePill on right)
BarRow Snake     (cyan)
BarRow Centrum   (slate)
BarRow Dorito    (orange)
```

BarRow component:
```jsx
function BarRow({ label, value, total, color, valueDisplay }) {
  const pct = total > 0 ? Math.round(value / total * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0' }}>
      <span style={{ 
        fontSize: FONT_SIZE.md, color, minWidth: 70, fontWeight: 600,
        fontFamily: FONT,
      }}>{label}</span>
      <div style={{ 
        flex: 1, height: 7, background: COLORS.surface, 
        borderRadius: 4, overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color }} />
      </div>
      <span style={{ 
        fontSize: FONT_SIZE.md, fontWeight: 700, color, 
        minWidth: 80, textAlign: 'right',
        fontFamily: FONT,
      }}>
        {valueDisplay || `${pct}%`}{' '}
        <span style={{ color: COLORS.textDim, fontWeight: 500 }}>({value})</span>
      </span>
    </div>
  );
}
```

Side colors from `COLORS.side` (per § 34.2):
- Snake `#22d3ee` (cyan)
- Centrum `#94a3b8` (slate)
- Dorito `#fb923c` (orange)

### 5d. "Najczęściej zaczyna grę na:" — top 3 bunker cards z survival

Per card:
- Padding 12px 14px (mobile) / 12px 14px (tablet), surface bg, 1px border, radius 10px
- Bunker name: 15-16px weight 600, min-width 85-90px
- Mid bar (5px h, surfaceLight bg, side color fill from bunker name parsing — "Snake1" → cyan, "Center3" → slate, "Dorito1" → orange)
- Right column (min-width 100-120px), two lines:
  - Line 1: `{played}` 13-14px weight 700 + "pkt" 11px textDim
  - Line 2: `{survivalRate}%` 12-14px weight 700, color = `winRateColor(survivalRate)` + "SURV" 9-11px textDim weight 600

### 5e. "Na breaku strzela:" + "Na pierwszej przeszkodzie gra w stronę:"

Identical to 5c (BarRow x3). Side colors. Different DataSourcePill (`scout+self` for break, `scout-only` for obstacle).

### 5f. "Powód spadania:" + "Najczęściej trafiane przeszkody:"

Each is BarRow x3 with deviations:

**"Powód spadania":**
- Label color = `COLORS.text` (neutral white)
- Bar color = `COLORS.danger` (red) for "Trafiony", `COLORS.warning` (amber) for "Wstrzelił", `COLORS.textDim` for "Inne"
- Value display = `{pct}% ({n})`
- DataSourcePill = `scout+self`

**"Najczęściej trafiane przeszkody":**
- Label color = side color from bunker name (Snake1→cyan, Center3→slate, Dorito1→orange)
- Bar color = `COLORS.danger` always
- Value display = `{count}×` (no %)
- DataSourcePill = `scout-only`

### 5g. "Najlepiej gra w duecie z:" + "Najlepiej gra w trójce z:"

Avatar-based cards. Per row:

```
[Avatar stack (overlapping)] [Names + bar] [%   ]
                                            [N pkt]
```

- Card padding 12-14px / 14-16px, surface bg, 1px border, radius 10-11px
- Avatar size: 40px (mobile) / 48px (tablet), font 14px / 16px weight 700
- Avatar border: 2px (mobile) / 2.5px (tablet), color = card bg `COLORS.surface` (creates cutout effect)
- Avatar overlap: margin-left -10px (mobile) / -12px (tablet)
- Trio z-index: first 3, second 2, third 1 (first appears on top)
- Avatar bg: `getPlayerColor(player)` || `COLORS.surfaceLight` fallback (slate)
- Middle column flex:1, min-width:0:
  - Names line: 13-16px weight 600 (smaller for trio if needed), `COLORS.text`
  - Mini bar 4-5px h, surfaceLight bg, `winRateColor(rate)` fill, margin-top 6-7px
- Right column min-width 80-90px:
  - Big % 16-19px weight 800, color = `winRateColor(winRate)`
  - Sublabel "N punktów" 11-12px textDim weight 500

### 5g.1 — LineupStatsSection refactor decision

Run:
```bash
grep -rn "LineupStatsSection\|<LineupStats" src/
```

**IF only PlayerStatsPage uses it** → modify `LineupStatsSection.jsx` in place to render new avatar pattern + new headers.
**IF used in other files** → create new `<DuoChemistry>` and `<TrioChemistry>` components in `src/components/`. Leave `LineupStatsSection` for other consumers.

### 5h. Historia meczów cards

Layout:
- Mobile: full-width vertical stack
- Tablet: `grid-template-columns: 1fr 1fr` (2-column)
- Gap 12-14px

Per row:
- Surface bg, 1px border, radius 10px, padding 13px 16px
- W/L badge: 26-32px square, radius 5-6px, bg `success/danger 20% alpha`, color `success/danger`, font 13-15px weight 800
- "vs {Opponent}" flex:1, 14-15px weight 500
- Right text: "Zagranych: <strong>N</strong>"
  - Label "Zagranych: " 12-13px weight 500 textMuted
  - Number 14-16px weight 700 text

Replace existing display "5 pkt" → "Zagranych: 5".

---

## STEP 6 — Disable depth section

Search PlayerStatsPage.jsx for depth-related rendering:
```bash
grep -n "glebokosc\|depth\|base.*mid.*deep\|Depth\|preferred.*position" src/pages/PlayerStatsPage.jsx
```

Approach:
- **DO NOT delete** depth computation in `playerStats.js` (data may return as sub-metric in future)
- Comment out or wrap rendering in `false &&`
- Add comment: `// Depth section disabled per Jacek 2026-05-01 — concept unclear to coaches. See DESIGN_DECISIONS § 59.7.`

---

## STEP 7 — § 27 self-review + smoke test

### 7.1 Run through `docs/REVIEW_CHECKLIST.md`

Walk every section. Specifically verify:

**Color discipline:**
- Amber `#f59e0b` only on: scope pill active, HERO badge, +/− positive (winRateColor), DataSourcePill `scout-only`, "#17" number
- DataSourcePill `scout-only` amber is **semantic warning**, not decorative — acceptable per § 27 (color encodes "incomplete data" meaning).
- **IF you find amber on non-interactive non-semantic element** → fix or escalate.

**Elevation:**
- Page bg `#080c14` ✓
- Cards `#0f172a` ✓
- Headers `#111827` ✓
- Recessed `#0b1120` (e.g. mini bars inside cards)

**Typography:**
- Hero numbers 26-32px / 800-900 ✓
- Primary 15-18px / 600-700 ✓
- Body 13-15px / 500 ✓
- Micro 9-11px / 600-700 ✓
- Nothing < 8px

**Touch targets:**
- Scope pills ≥44px height ✓
- History rows ≥44px ✓
- Bunker cards / chemistry cards ≥52px ✓
- HeroMetric cards ≥60px (decorative, not tappable, but spec) — acceptable

**Cards:**
- Each card = one purpose
- ≤3 data points on bunker card (name + count + survival)
- No chevrons (no card navigates anywhere from this page except match history click-through, if exists)

**Anti-patterns:**
- Multiple CTAs competing? NO
- Decorative gradients/glow? NO (avatar bg is functional color)
- Same shade across elevation? NO

### 7.2 Run automated checks

```bash
npm run precommit         # MUST pass
npx vite build 2>&1 | tail -10   # MUST pass with no errors
```

### 7.3 Manual smoke test

Open `/player/{playerId}/stats?scope=tournament&tid={tid}` for a player with full data. Verify:
1. All sections render correctly
2. Avatar stack overlap looks right (no gaps, no excessive overlap)
3. Survival % colors match thresholds (>70 green, 50-70 amber, <50 red)
4. DataSourcePill renders correctly per section
5. Toggle scope: Ten turniej → Globalny → Ten mecz → data updates per section
6. Empty state: open page for player with n=0 or n=1 punktów — verify no crashes, sections gracefully empty/hidden

### 7.4 Output report

```
PlayerStatsPage redesign — STEP 7 complete

§ 27 self-review:
Color discipline: PASS / violations: ...
Elevation:        PASS / ...
Typography:       PASS / ...
Touch targets:    PASS / ...
Cards:            PASS / ...
Anti-patterns:    ZERO / found: ...

Smoke test:
- npm run precommit: PASS / ...
- vite build: PASS / ...
- Render full data: PASS / ...
- Render empty data: PASS / ...
- Scope toggle: PASS / ...

Branch: feat/player-stats-redesign-2026-05-01
Diff: {N} files, +{X}/-{Y} lines

Verdict: READY FOR JACEK CHECKPOINT
```

---

## CHECKPOINT — Jacek verifies

After STEP 7 verdict READY:
1. Commit on branch `feat/player-stats-redesign-2026-05-01`
2. Push to GitHub
3. Send report to Jacek (the STEP 7.4 output)
4. **DO NOT MERGE** until Jacek says GO

**JACEK GO** → merge + deploy:
```bash
git checkout main
git merge --no-ff feat/player-stats-redesign-2026-05-01
git push origin main
npm run deploy
```

Then:
1. Move brief to archive: `git mv CC_BRIEF_PLAYER_STATS_REDESIGN_2026-05-01.md docs/archive/cc-briefs/`
2. Add `DEPLOY_LOG.md` entry
3. Update `NEXT_TASKS.md` with `[DONE]` marker
4. Commit + push the archive move

**JACEK NIE GO / iteration requested** → fix on branch, push, repeat checkpoint.

---

## DO NOT

- ❌ Don't touch obstacle shots schema (Phase 1b territory — separate brief post-sparing)
- ❌ Don't add features not in mockup (no "compare to team avg", no trend arrows, no sparklines)
- ❌ Don't delete depth computation in `playerStats.js` — only stop rendering
- ❌ Don't change data fetching pipeline (`raw.playerPoints` → `buildPlayerPointsFromMatch` → `computePlayerStats` stays untouched)
- ❌ Don't add scope `Layout` (existing 3 scopes only: Ten turniej / Globalny / Ten mecz)
- ❌ Don't merge to main without explicit Jacek GO
- ❌ Don't reuse `LineupStatsSection` if it cascades changes elsewhere — create new components instead

---

## Reference

- Mockup: chat 2026-05-01-19-28-00, widget `player_stats_redesign_v2_bigger_fonts_avatars` (final iteration)
- Earlier CC discovery: `outputs/CC_DISCOVERY_PLAYER_STATS_PAGE_2026-05-01.md`
- DESIGN_DECISIONS § 59 patch: applied separately (commit alongside this brief)
- Field side standard: `docs/DESIGN_DECISIONS.md` § 34
- Apple HIG compliance: `docs/DESIGN_DECISIONS.md` § 27
- Review checklist: `docs/REVIEW_CHECKLIST.md`
