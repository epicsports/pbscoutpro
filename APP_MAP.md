# APP_MAP.md — code-reality source of truth (PbScoutPro)

> **This document is the agreed reality of the app.** Agents read it BEFORE
> building — you design against the real catalog of routes, components, data and
> tokens, not from imagination.

## §1. Purpose + how the generator works

This file is the single ground-truth map of what the app actually contains.
Four of its sections are **machine-written** from the source code and must never
be hand-edited:

- **§2 Routes** (`AUTOGEN:routes`) — from `src/App.jsx`
- **§3 UI catalog** (`AUTOGEN:ui`) — from `src/components/ui.jsx`
- **§5 Design tokens** (`AUTOGEN:tokens`) — from `src/utils/theme.js`
- **§6 Feature flags** (`AUTOGEN:flags`) — from `src/utils/featureFlags.js`

Each lives between `<!-- AUTOGEN:<name> START -->` / `<!-- AUTOGEN:<name> END -->`
markers. **Everything between those markers is owned by the generator** — edits
there will be overwritten on the next run.

Regenerate with:

```bash
npm run app-map         # rewrite the AUTOGEN blocks from code
npm run app-map:check   # CI/precommit guard — fails if the doc is stale
```

The generator (`scripts/gen-app-map.cjs`, documented in §9) does best-effort
regex / brace-balanced parsing — no AST libraries, no extra deps. Anything it
can't parse cleanly is emitted inline as a `> ⚠ parse note:` line so the doc
stays honest about its own blind spots. `app-map:check` is wired into
`npm run precommit`, so an out-of-date map blocks the commit.

The remaining sections (§4 data model, §7 screens, §8 screenshots) are
**curated by hand** — keep them current on doc-closeout.

---

## §2. Routes (AUTOGEN — do not hand-edit)

Parsed from `src/App.jsx`. `guard` is the wrapping element (RouteGuard /
AdminGuard / SuperAdminGuard) or `none`. `lazy` = component loaded via
`React.lazy(() => import(...))`.

<!-- AUTOGEN:routes START -->
_48 routes parsed from `src/App.jsx`. `⚑cond` = route mounted behind a build-time condition (e.g. emulator-only)._

| path | component | guard | lazy |
|---|---|---|---|
| `/` | MainPage | none | yes |
| `/teams` | TeamsPage | none | yes |
| `/team/:teamId` | TeamDetailPage | none | yes |
| `/players` | PlayersPage | none | yes |
| `/layouts` | LayoutsPage | RouteGuard | yes |
| `/layout/new` | LayoutWizardPage | RouteGuard | yes |
| `/layout/:layoutId` | LayoutDetailPage | RouteGuard | yes |
| `/layout/:layoutId/bunkers` | BunkerEditorPage | RouteGuard | yes |
| `/layout/:layoutId/ballistics` | BallisticsPage | RouteGuard | yes |
| `/layout/:layoutId/analytics/:mode` | LayoutAnalyticsPage | RouteGuard | yes |
| `/tournament/:tournamentId/team/:scoutedId` | ScoutedTeamPage | none | yes |
| `/tournament/:tournamentId/match/:matchId` | MatchPage | RouteGuard | yes |
| `/tournament/:tournamentId/tactic/:tacticId` | TacticPage | RouteGuard | yes |
| `/layout/:layoutId/tactic/:tacticId` | TacticPage | RouteGuard | yes |
| `/layout/:layoutId/tactics` | LayoutTacticsBoardPage | RouteGuard | yes |
| `/layout/:layoutId/tactic-edit/:tacticId` | TacticEditorPage | RouteGuard | yes |
| `/test/capture` | TestCaptureHarness ⚑cond | none | yes |
| `/player/:playerId/stats` | PlayerStatsPage | none | yes |
| `/player/checklist` | PackingChecklistPage | none | yes |
| `/break` | TakeABreakPage | none | yes |
| `/break/reads` | ReadsMiniPage | none | yes |
| `/break/snake` | ReadsSnakePage | none | yes |
| `/break/invaders` | ReadsInvadersPage | none | yes |
| `/break/lander` | ReadsLanderPage | none | yes |
| `/break/warrior` | ReadWarriorPage | none | yes |
| `/break/asteroids` | ReadsAsteroidsPage | none | yes |
| `/break/readbert` | ReadbertPage | none | yes |
| `/training/:trainingId/setup` | TrainingSetupPage | none | yes |
| `/training/:trainingId/squads` | TrainingSquadsPage | none | yes |
| `/training/:trainingId/results` | TrainingResultsPage | none | yes |
| `/training/:trainingId/hitability` | HitabilityPage | RouteGuard | yes |
| `/profile` | ProfilePage | none | yes |
| `/profile/avatar` | AvatarBuilderPage | none | yes |
| `/training/:trainingId/matchup/:matchupId` | MatchPage | RouteGuard | yes |
| `/training/:trainingId` | TrainingPage | none | yes |
| `/scouts` | ScoutRankingPage | none | yes |
| `/scouts/:uid` | ScoutDetailPage | none | yes |
| `/my-issues` | ScoutIssuesPage | none | yes |
| `/debug/flags` | DebugFlagsPage | AdminGuard | yes |
| `/admin/leagues` | AdminLeaguesPage | SuperAdminGuard | yes |
| `/admin/players` | AdminPlayersPage | SuperAdminGuard | yes |
| `/admin/teams` | AdminTeamsPage | SuperAdminGuard | yes |
| `/admin/workspaces` | WorkspacesAdminPage | SuperAdminGuard | yes |
| `/admin/layouts` | AdminLayoutsPage | SuperAdminGuard | yes |
| `/settings/members` | MembersPage | AdminGuard | yes |
| `/settings/members/:uid` | UserDetailPage | AdminGuard | yes |
| `/player/log` | PlayerPerformanceTrackerPage | none | yes |
| `/player/log/wizard` | PlayerPerformanceTrackerPage | none | yes |
<!-- AUTOGEN:routes END -->

---

## §3. UI catalog (AUTOGEN — do not hand-edit)

Every exported component from `src/components/ui.jsx` + its prop names (from the
destructured `function X({ … })` signature). **Rule for designers: use these
components.** A new component needs a `new` tag + justification, never by default.

<!-- AUTOGEN:ui START -->
_31 exported components parsed from `src/components/ui.jsx` (props = destructured signature names)._

| component | props |
|---|---|
| `Btn` | `children`, `onClick`, `variant`, `size`, `disabled`, `style`, `title`, `active`, `type`, `className`, `testId`, `ariaLabel` |
| `Input` | `value`, `onChange`, `placeholder`, `onKeyDown`, `onBlur`, `onFocus`, `autoFocus`, `style`, `type`, `error`, `disabled`, `name`, `id`, `inputMode`, `maxLength` |
| `Select` | `value`, `onChange`, `children`, `style`, `error`, `disabled` |
| `Field` | `label`, `required`, `optional`, `hint`, `error`, `children` |
| `LeagueBadge` | `league` |
| `DataSourcePill` | `source`, `t` |
| `ActionSheet` | `open`, `onClose`, `actions`, `title` |
| `MoreBtn` | `onClick`, `testId` |
| `SwipeDelete` | `onDelete`, `children`, `label`, `bg`, `color`, `testId`, `leftAction`, `leftLabel`, `leftBg`, `leftColor`, `leftTestId` |
| `Card` | `icon`, `iconLeft`, `title`, `subtitle`, `onClick`, `actions`, `badge`, `children`, `onSwipeDelete`, `scheduled`, `live` |
| `SectionLabel` | `children`, `color` |
| `ResultBadge` | `result` |
| `Score` | `value`, `color` |
| `CoachingStats` | `stats` |
| `SectionTitle` | `children`, `right` |
| `EmptyState` | `icon`, `text`, `subtitle` |
| `Modal` | `open`, `onClose`, `title`, `children`, `footer`, `maxWidth` |
| `Loading` | `text` |
| `Skeleton` | `width`, `height`, `style` |
| `SkeletonCard` | — |
| `SkeletonList` | `count` |
| `ScoreBadge` | `points` |
| `YearBadge` | `year` |
| `ConfirmModal` | `open`, `onClose`, `title`, `message`, `onConfirm`, `confirmLabel`, `danger`, `requirePassword`, `passwordLabel`, `password`, `onPasswordChange` |
| `PlayerChip` | `idx`, `player`, `label`, `color`, `selected`, `eliminated`, `hasBump`, `bumpDuration`, `shotCount`, `onClick`, `onRemove`, `size`, `style` |
| `Checkbox` | `label`, `checked`, `onChange`, `style` |
| `Slider` | `label`, `value`, `onChange`, `min`, `max`, `step`, `color`, `style` |
| `TextArea` | `value`, `onChange`, `placeholder`, `rows`, `style` |
| `FormField` | `label`, `children`, `style` |
| `SideTag` | `side` |
| `SegmentedControl` | `items`, `value`, `onChange`, `style` |

> Non-function exports (not parsed for props): `Icons`
<!-- AUTOGEN:ui END -->

---

## §4. Data model (curated)

Firestore is **multi-tenant**: most app data lives under `/workspaces/{slug}/…`;
a few collections are **global** (cross-workspace, super-admin owned). Shapes are
sourced from `src/services/dataService.js`, `src/utils/pointFactory.js`,
`firestore.rules`, and `docs/DESIGN_DECISIONS.md` §90 / §63.15. ZERO invented
fields — if it's not here, it's not in the contract.

### Tenant root + globals

| Collection | Key fields | Who writes |
|---|---|---|
| `/workspaces/{slug}` | `name`, `slug`, `adminUid`, `rolesVersion`, member map | admin (auto-entered on login) |
| `/workspaces/{slug}/config/{doc}` | e.g. `featureFlags` (dynamic flag overrides) | admin |
| `/users/{uid}` | `email`, `displayName`, `globalRole`, `defaultWorkspace`, `disabled`, `linkSkippedAt`, `linkedPlayerId` | self / admin |
| `/users/{uid}/appState/{doc}` | per-user UI state | self |
| `/invites/{token}` | `workspaceSlug`, `roles`, `email`, `expiresAt`, `redeemedBy` | admin (issue) / invitee (redeem) |
| `/leagues/{leagueId}` | `name`, `shortName`, `divisions`, `active` | super-admin |
| `/players/{playerId}` (GLOBAL) | `name`, `nick`, `teamId`, `league`, `division`, `class`, `isHero`, `bunker`, `position`, team-history | super-admin / scout via catalog |
| `/teams/{teamId}` (GLOBAL) | `name`, `parentTeamId`, `league`, `division`, `retired` (parent "Ranger Warsaw" → child Ring/Rage/…) | super-admin |
| `/layouts/{layoutId}` (GLOBAL base) | calibration, bunkers, zones, vision data — analytic unit | super-admin / layout editor |
| `/layoutAggregates/{layoutId}` | breakout/target/result rollups (bunker aggregate) | scout writes (point save) |
| `/catalog/{kind}/chunks/{chunkId}` | packed players/teams snapshot for offline | system (catalog bump) |
| `/meta/{docId}` | catalog version + misc app meta | system |
| `/leaderboards/{board}/scores/{uid}` | break-room mini-game scores | self |

### Per-workspace subtrees (under `/workspaces/{slug}/`)

| Collection | Key fields | Who writes |
|---|---|---|
| `tournaments/{tid}` | `name`, `league`, `division`, `year`, `layoutId`, `closed`, `heroPlayers` | scout / admin |
| `tournaments/{tid}/scoutedTeams/{sid}` | `teamId`, `name`, roster, division, hero set | scout |
| `tournaments/{tid}/scoutedTeams/{sid}/notes/{noteId}` | `text`, `author`, `seenBy[]` | scout |
| `tournaments/{tid}/matches/{mid}` | `scoutedId`, `opponent`, `side`, score, rollup, `editLockReleased` | scout |
| `tournaments/{tid}/matches/{mid}/points/{pid}` | the POINT shape (below) | scout (side-safe writes, §90) |
| `tournaments/{tid}/matches/{mid}/points/{pid}/shots/{sid}` | per-shot detail (source `scout`/`self`) | scout / self-log |
| `trainings/{trid}` | `name`, squads, who's-here, `date` | coach |
| `trainings/{trid}/matchups/{mid}` | squad-vs-squad pairing | coach |
| `trainings/{trid}/matchups/{mid}/points/{pid}` | POINT shape (training) | coach / scout |
| `layoutOverlays/{lid}` | per-workspace overlay on a global base layout | layout editor |
| `breakoutVariants/{teamId}/…` | named breakout variants + usage counts | scout |
| `selfReports/{sid}` / `pendingSelfReports/{sid}` | player self-log observations (§57) propagated into points | player (self-log) |
| `events_index/{eventId}` | denormalized event index | system |

### POINT shape (per side: `homeData` / `awayData`) — `src/utils/pointFactory.js`

Each point doc holds two side objects, `homeData` and `awayData`, each built by
`baseSide(side)` (all arrays length 5, one slot per player):

- `players[5]` — `{x,y}` normalized 0–1 positions (or null)
- `assignments[5]` — player IDs
- `shots {}` — keyed map (Firestore rejects nested arrays, so `{}` not `[[]]`)
- `eliminations[5]` (bool) · `eliminationPositions[5]` (`{x,y}`)
- `quickShots {}` · `obstacleShots {}`
- `bumpStops[5]` · `runners[5]` (bool)
- `fieldSide` — `'left' | 'right'` (or dorito/snake/center per side semantics)
- `slotIds[5]` — stable per-side UUIDs (§57; bind self-reports)
- **provenance siblings** (§57, null until a multi-source writer fills them):
  `playersMeta[5]`, `shotsMeta[5]`, `eliminationsMeta[5]` — each entry
  `{ source: 'scout'|'self'|'kiosk', writerUid, ts }`

**"Point as Timeline" (charter):** keyframe #0 = this atomic point; an additive
`timeline[]` delta keyed by `slotIds` AUGMENTS it — it never replaces
`homeData` / `awayData`. Event-sourced, workspace-private.

---

## §5. Design tokens (AUTOGEN — do not hand-edit)

Parsed from `src/utils/theme.js`. Designers work **only** on these tokens; a new
token needs a `new` tag + justification.

<!-- AUTOGEN:tokens START -->
_12 token groups parsed from `src/utils/theme.js`. Object values shown where primitive (hex / number / string); computed values (gradients, functions, arrays) show the key only._

**COLORS** (49 keys): `bg` · `surface`='#111827' · `surfaceLight`='#1a2234' · `surfaceHover`='#1f2b3d' · `surfaceDark` · `surfaceBar`='#0d1117' · `border`='#2a3548' · `borderLight` · `borderActive` · `accent` · `accentDim` · `danger` · `dangerDim` · `success` · `successDim` · `bump` · `info` · `zeeker`='#06b6d4' · `text` · `textDim` · `textSubtle`='#8b95a5' · `textMuted` · `white` · `black` · `win` · `loss` · `timeout` · `playerColors` · `eliminatedOverlay` · `skull` · `bumpStop` · `shotColor` · `discoLine` · `zeekerLine` · `accentGradient` · `accentGlow` · `accentA06`='#f59e0b06' · `accentA08`='#f59e0b08' · `accentA0c`='#f59e0b0c' · `accentA10`='#f59e0b10' · `accentA12`='#f59e0b12' · `accentA15`='#f59e0b15' · `accentA18`='#f59e0b18' · `accentA20`='#f59e0b20' · `accentA25`='#f59e0b25' · `accentA30`='#f59e0b30' · `accentA40`='#f59e0b40' · `successRadial` · `dangerRadial`

**ELEV** (12 keys): `bg`='#0a0e17' · `sunken`='#080b12' · `surface`='#111827' · `raised`='#161f31' · `overlay`='#1c2740' · `hairline`='#1e2636' · `hairlineStrong`='#28324a' · `shadow1` · `shadow2` · `shadow3` · `innerTop` · `ring`

**FONT**: ``'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif``

**FONT_COND**: ``'Oswald', 'Inter', system-ui, sans-serif``

**FONT_SIZE** (7 keys): `xxs`=10 · `xs`=12 · `sm`=13 · `base`=15 · `lg`=17 · `xl`=20 · `xxl`=24

**RADIUS** (7 keys): `xs`=4 · `sm`=6 · `md`=10 · `lg`=12 · `xl`=14 · `xxl`=20 · `full`=999

**SPACE** (7 keys): `xs`=4 · `sm`=8 · `md`=12 · `lg`=16 · `xl`=20 · `xxl`=24 · `page`=16

**TOUCH** (15 keys): `minTarget`=44 · `targetLg`=48 · `btnPadY`=10 · `btnPadX`=16 · `btnPadYSm`=6 · `btnPadXSm`=10 · `spacing`=8 · `spacingLg`=12 · `fontBase`=15 · `fontSm`=13 · `fontXs`=12 · `fontLg`=17 · `fontXl`=20 · `chipHeight`=36 · `iconBtn`=40

**TEAM_COLORS** (4 keys): `A`='#ef4444' · `B`='#3b82f6' · `A_light`='#f87171' · `B_light`='#60a5fa'

**TRACKING** (2 keys): `label`='1.5px' · `tight`='-.3px'

**TYPE** (8 keys): `display`=32 · `h1`=24 · `h2`=20 · `bar`=22 · `title`=18 · `body`=16 · `meta`=14 · `label`=12

**TNUM** (2 keys): `fontVariantNumeric`='tabular-nums' · `fontFeatureSettings`='"tnum"'
<!-- AUTOGEN:tokens END -->

---

## §6. Feature flags (AUTOGEN — do not hand-edit)

Two layers: **STATIC** (hardcoded, change = deploy) and **DYNAMIC** (Firestore
`/workspaces/{slug}/config/featureFlags`, per `audience`). Visibility resolved by
`isInAudience(audience, userRole, user)` (`all` → everyone; `beta` →
scout/coach/admin; `admin` → admin role or `ADMIN_EMAILS`).

<!-- AUTOGEN:flags START -->
_6 static + 9 dynamic flags parsed from `src/utils/featureFlags.js`._

**Static** (hardcoded; change = deploy)

| flag | default |
|---|---|
| `ENABLE_CONCURRENT_EDITING` | `true` |
| `ENABLE_VISION_API` | `false` |
| `ENABLE_BALLISTICS` | `true` |
| `ENABLE_MOTION` | `false` |
| `DEBUG_PANEL` | `import.meta.env?.DEV` |
| `LOG_PERFORMANCE` | `import.meta.env?.DEV` |

**Dynamic** (Firestore `/workspaces/{slug}/config/featureFlags`; per-`audience`)

| flag | enabled | audience |
|---|---|---|
| `coachBrief` | false | beta |
| `perPlayerShots` | false | beta |
| `accuracyMetric` | false | beta |
| `confidenceBadge` | false | all |
| `multiScoutSession` | false | beta |
| `layoutNotesTagged` | false | beta |
| `videoCV` | false | admin |
| `predictiveEngine` | false | admin |
| `selfLog` | false | admin |
<!-- AUTOGEN:flags END -->

---

## §7. Screens index (curated stub)

Maintained alongside `BACKLOG.md` (built separately). Maps a screen to its
prototype reference and the prod file/route that realizes it.

| screen | prototype ref | prod file / route | status |
|---|---|---|---|
| _(stub — populate alongside BACKLOG.md)_ | — | — | — |

---

## §8. Screenshots (curated stub)

Current-state screenshots live in `/screenshots/` (committed by the render
harness — `npm run screenshots`). The "before" for any redesign is always a real
screenshot from here, never an imagined state.

| route slug | viewports | file |
|---|---|---|
| _(index placeholder — populated by the render harness)_ | 390 / 834 / 1280 | `/screenshots/<route-slug>@{w}.png` |

---

## §9. Generator (`scripts/gen-app-map.cjs`)

Node, CommonJS, **zero extra deps** — best-effort regex + brace-balanced string
parsing (no AST libraries; none are present in the project).

**npm scripts:**
- `npm run app-map` → `node scripts/gen-app-map.cjs` (writes the blocks)
- `npm run app-map:check` → `node scripts/gen-app-map.cjs --check` (exits non-zero
  if APP_MAP.md would change). Wired into `npm run precommit`.

**How it parses:**
- **§2 routes** — collects `const X = lazy(() => import(...))` names, then walks
  every `<Route …>`: extracts `path=` (string or `{expr}`), brace-matches the
  `element={…}`, detects the wrapping guard (`RouteGuard`/`AdminGuard`/
  `SuperAdminGuard`), and picks the first non-guard `<Component`. `⚑cond` marks a
  route mounted behind a build-time `&&` condition (e.g. emulator-only).
- **§3 ui** — every `export function X(` in `ui.jsx`; brace-matches the param
  list, and if it's an object destructure, splits top-level keys to list prop
  names. Non-function exports (e.g. `Icons`) are listed but not prop-parsed.
- **§5 tokens** — comments stripped first (quote-aware), then a curated group
  list (COLORS, ELEV, FONT, FONT_COND, FONT_SIZE, RADIUS, SPACE, TOUCH,
  TEAM_COLORS, TRACKING, TYPE, TNUM). For object groups it lists keys (with the
  value where it's a primitive hex/number/string); scalar groups (FONT,
  FONT_COND) show the literal.
- **§6 flags** — `STATIC_FLAGS` (flag + raw default) and `DYNAMIC_FLAG_DEFAULTS`
  (flag + `enabled` + `audience`) from `src/utils/featureFlags.js`.

The four AUTOGEN blocks are filled independently; a block whose marker pair is
absent from APP_MAP.md is skipped with a warning (the others still write).

**Known limits (by design):** it parses string structure, not JS semantics — so
conditionally-mounted routes are flagged not resolved, computed token values
(gradients, functions, arrays) show key-only, and dynamically-built routes (none
today) would be missed. Any clean-parse failure is emitted as a `> ⚠ parse note:`
inside the block.
