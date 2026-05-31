# Mockup guidelines — READ BEFORE DESIGNING ANY MOCKUP

Standing rules for any layout/UI mockup or prototype. Keeps mockups faithful to
the shipped design system and the redesign direction so they translate to code
1:1 instead of inventing a parallel look.

---

## 1. Tokens — authority is `src/utils/theme.js`

**Never invent values — pull from `theme.js`.** Every color/size/spacing/radius in a
mockup must be a real token. The snapshot below is for convenience; `theme.js` is
the source of truth (re-pull if it changes).

**Palette (dark):**
- Surfaces: `bg #0a0e17` · `surfaceDark #0f172a` (cards) · `surface #111827` (panels) · `surfaceLight #1a2234` · `surfaceHover #1f2b3d`
- Borders: `border #2a3548` · `borderLight #334155`
- Text: `text #e2e8f0` · `textDim #94a3b8` · `textMuted #64748b`
- **Accent = amber `#f59e0b`** (interactive only, never decorative — §27)
- Semantic: `danger #ef4444` · `success #22c55e` · `info #3b82f6` · `bump #f97316`
- Field lines: **disco `#f97316`** · **zeeker `#3b82f6`**
- Effects: `accentGradient linear-gradient(135deg,#f59e0b,#ef8b00)` · `accentGlow 0 4px 24px #f59e0b25`

**Color pickers** (user-choosable zone/line colors) use **`COLORS_ZONE_PALETTE`**, with
**amber deliberately excluded** (amber is reserved for interactive accent):
`#ef4444 #3b82f6 #f97316 #22d3ee #a855f7 #ec4899 #14b8a6`.

**Type:** `FONT 'Inter', -apple-system, …`. `FONT_SIZE` xxs 10 · xs 12 · sm 13 · base 15 · lg 17 · xl 20 · xxl 24. Weights inline per §27 (hero 800–900 · titles 600–700 · body 500 · labels 600).

**Spacing / radii / touch:** `SPACE` xs 4 · sm 8 · md 12 · lg 16 · xl 20 · xxl 24. `RADIUS` sm 6 · md 10 · lg 12 (cards) · xl 14 (buttons/modals) · full 999. `TOUCH` minTarget **44** · targetLg 48 · iconBtn 40 · chipHeight 36.

League/team adjuncts: `LEAGUE_COLORS` NXL `#ef4444` · DPL `#3b82f6` · PXL `#22c55e`; `TEAM_COLORS` A `#ef4444` / B `#3b82f6`.

---

## 2. Presentation

- **Inline render, not HTML.** Render mockup screens inline (app-faithful inline-JSX
  styling with the tokens above), not as standalone HTML prototypes. The HTML
  prototypes in `outputs/` were a one-off; the convention going forward is inline.
- **Phone-frame.** Mobile-first; show a single phone viewport per screen.
- **One screen per option.** Each configurable thing gets its own screen/state — don't
  cram multiple editors into one frame. Show the real navigation, one step at a time.
- **§27 / Apple HIG.** Color discipline (amber = interactive only), elevation by surface
  shade, 44px touch targets, single primary CTA, details-on-drill-down. See
  `docs/DESIGN_DECISIONS.md` § 27.

---

## 3. Roles / panels (who sees what)

- **Coach — view-only** on field geometry. Sees their team's work; field setup is a
  read-only "managed by admin" surface (no inert controls).
- **Admin (per-team)** — configures the team overlay: **names · zones · lines**.
- **Super Admin (global base)** — configures the shared base (bunker geometry, calibration,
  field image) via the existing `BunkerEditorPage`; edits propagate to every workspace.

(Per the §96 base/overlay split: base = global `/layouts/{id}` super_admin; overlay =
`/workspaces/{slug}/layoutOverlays/{id}` coach/admin.)

---

## 4. Navigation — unify onto the admin section-stacked-detail pattern

Layout-config mockups must follow the **admin pattern** (à la `UserDetailPage`), **not**
the retired multi-entry layout pattern:

- **`PageHeader` + stacked `Section`s + `Row`s** on one detail screen.
- **Inline edit** (chips / inputs / sliders) + **`Modal` / `ConfirmModal`** for discrete
  actions and confirms. No scattered per-option entry points.
- **Names · Zones · Lines = sibling `Section`s** on the same screen (not separate routes,
  not a ⋮ menu of pushes).

> **Retiring (discovery §2):** the current `LayoutDetailPage` fragments config across a ⋮
> ActionSheet of PUSH routes (bunkers/ballistics/analytics/tactic) **+** a stack of Modals
> (edit-info, re-calibrate, lines&zones) **+** inline handles (line drag, zone draw). That
> multi-entry sprawl is being replaced by the single section-stacked detail above.
