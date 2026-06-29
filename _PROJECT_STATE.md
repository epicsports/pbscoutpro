# ⚠️ PROJECT STATE — READ FIRST (every session)

> **Purpose:** this file is the single source of truth for *what has already shipped*.
> Claude has **no memory between sessions** — this file IS the memory. Read it before
> touching the prototype, and update the table whenever a screen goes to Claude Code (CC)
> and/or production.

## TL;DR
The `prototype/` folder is a **design prototype**, but a subset of its redesigned screens
have **already been handed to Claude Code (CC) and are being implemented** — they are
**not live yet**, but they are locked: the design is committed and in the build pipeline.
Treat those as **frozen**, not open canvas. Changes to them are *change requests against an
in-flight implementation*: flag the impact, keep diffs tight, and produce an updated handoff
note rather than a fresh from-scratch design.

## Status legend
- 🟢 **SHIPPED** — implemented by CC and live in production. Source of truth is the real codebase.
- 🔵 **IN IMPLEMENTATION** — handed to CC, being built, **not live yet**. Design is frozen / in pipeline.
- 🟡 **PROTOTYPE** — designed here, NOT yet handed off. Free to iterate.
- ⚪️ **NOT STARTED** — not yet designed.

**Queue column** (🟡 rows only): 1️⃣ 2️⃣ 3️⃣… = hand-off order (what's next). `–` = not yet sequenced.

## Screen ledger
_Last updated: (set date when you edit) — update the Status column as things ship._

| Screen | Prototype component | Status | Next |
|---|---|---|---|
| Match list (phone) | `MatchListPremium` | 🔵 IN IMPLEMENTATION | – |
| Coach team list (phone) | `CoachTeamListPremium` | 🔵 IN IMPLEMENTATION | – |
| Coach team list (wide) | `REDESIGN.CoachTeamListWide` | 🟡 PROTOTYPE | ✦ standalone master-detail (list + team overview + Analizuj CTA); `rd-coach` now responsive — ready for CC |
| Opponent analysis (phone, + small-sample) | `OpponentAnalysisPremium` | 🔵 IN IMPLEMENTATION | – |
| Player stats (phone) | `PlayerStatsPremium` | 🔵 IN IMPLEMENTATION | – |
| Player stats (wide) | `REDESIGN.PlayerStatsWide` | 🟡 PROTOTYPE | ✦ landscape: shared `RdPlayerHeroCard` + self-review rail (left), analytics grid (right); `rd-playerstats` responsive |
| Live scoring — phone | `LivePhonePremium` | 🔵 IN IMPLEMENTATION | – |
| Live scoring — desktop | `LiveDesktopPremium` | 🔵 IN IMPLEMENTATION | – |
| Live scoring — tablet | `TabletLiveScoringPremium` | 🔵 IN IMPLEMENTATION | – |
| Nav drawer (phone) | `NavDrawerPremium` | 🔵 IN IMPLEMENTATION | – |
| Pixel avatars + Kreator awatara | `AVATARS.PixelAvatar` (silnik) · `AVATARS.AvatarBuilder` (kreator) | 🟡 PROTOTYPE | ✦ **Rozbudowany silnik 1-bit (16×16):** osie **płeć(K/M/neutralna → brwi/rzęsy)·wiek(młody/dorosły/starszy → zmarszczki+siwizna)**·twarz(7: okrągła/owalna/szczupła/szeroka/kwadrat/serce/romb)·włosy(28: krótkie męskie crop/buzz/spiky/quiff/mohawk/undercut + DŁUGIE damskie spływające na ramiona: long/lob/wavy/curly/hime/halfup/bob/braids/braid/pigtails/ponytail/spacebuns/bun/updo/afro — strands rysowane do rzędów 13-15 na 16-gridzie → po skali ×1.3 drapują się po barkach)·zarost(8)·okulary(brak/okulary/słoneczne/gogle/eye-black)·nakrycie(brak/opaska/czapka/czapka-tył/zimowa/bandana)·**bluza(8 krojów: crew/hoodie/zip/raglan/jersey/polo/v-neck/tank)**. **Kolory przez ten sam swatch-picker co w apce (podwójny ring), w PARACH „wygląd + kolor" (kolor w tym samym panelu co kształt, nie osobna zakładka):** Włosy = 18 fryzur + 14 hex · Bluza = 12 krojów + 19 kolorów (chip „T"=drużyna) · Skóra = 9 tonów. **Ubrania cel-shaded** (baza+cień przesunięty w odcieniu+światło z góry-lewej, skóra rysowana POD ubraniem → dekolty pokazują ciało). **Siatka portretu powiększona do 24×24**: głowa to dotychczasowa grafika 16-grid renderowana w skali ×1.3 w górnej części tarczy (wszystkie 18 fryzur/zarost/akcesoria bez zmian), a ubranie rysowane natywnie na 24 — pełne barki wypełniające dół tarczy → bluza zajmuje ~2× więcej kadru. **18 krojów**: crew, v-neck, dekolt U, polo, koszula, z kapturem, zip, bomber, raglan, jersey, tank, pasek, golf, varsity, puchowa + **paintballowe: paintball (raglan+numer), panel (przekątny color-block), mesh (siatka)**. **Barki ZAOKRĄGLONE** (GBODY: wąska zaokrąglona góra rzędu 18 → najszersze deltoidy rząd 19 → łuk koła w dół) — **dół wypełnia okrąg edge-to-edge, bez prześwitów**. **Akcesoria (panel łączy 3 osie):** łańcuchy (złoty/srebrny/choker) + kolczyki (wpinka/kółko/para) + **OKULARY przeniesione tu z osobnej zakładki** (okulary/słoneczne/gogle/eye-black — wszystkie 4 rysowane). **Nakrycia:** beanie, capback + bandany ze wzorami (paisley/moro/czaszka/płomienie/krata) + kolor przez `headwearColor`. **TŁA (21 scen, oś `bg`):** plaża, zachód, góry, Tokyo, miasto, noc, las, pustynia, śnieg, kosmos, zorza, ocean, wulkan, kanion, sawanna, deszcz, boisko, arena PB, galaktyka, chmury, vaporwave — pixel-art 24-grid za biustem, klipowane do dysku. **Hue/tint pod klimat:** każde tło ma `mood`+`amt`; `tintHex` miesza wszystkie kolory awatara (głowa+bluza) w stronę nastroju tła (ciepły zachód, chłodna noc itd.). Twarze (7) na różnych sylwetkach. Płeć/wiek realnie wpływają na render (K: rzęsy+usta · M: brwi · starszy: zmarszczki). Spec przechowuje hex bezpośrednio (wstecznie zgodne z nazwanymi kluczami via fallback w `buildSpans`). `topColor:'team'` → bierze `teamColor` z drużyny zawodnika (prop). `buildSpans(spec,teamColor)`, `randomSpec()`, `avatarSpec(seed)` (deterministyczny, wstecznie kompatybilny). Kreator: duży podgląd + Losuj + pasek kategorii + siatka opcji (mini-podglądy / próbki), localStorage `rd-avatar-spec`, responsywny (telefon stack / wide master-detail). Wejście: tap awatara w „Mój profil" (`rd-avatarbuilder`). Rostery (`redesign`/`redesign6` hero) przekazują `teamColor`. — ready for CC |
| — | | | |
| App shell (top bar + tab bar + home/teams/matches tabs) | `AppShellPremium` + `AppShellPremiumWide` (redesign.jsx) | 🟡 PROTOTYPE | ✦ redesigned (phone + tablet/desktop) — ready for CC |
| Point-logging wizard | `REDESIGN2.PointWizardPremium` + `REDESIGN6.PointWizardWide` | 🟡 PROTOTYPE | ✦ redesigned (phone + wide modal) — ready for CC |
| Today's points | `REDESIGN2.TodayPointsPremium` + `REDESIGN6.TodayPointsWide` | 🟡 PROTOTYPE | ✦ redesigned (phone + **wide landscape HERO**: survival ring + side-split + fall insight ↔ point timeline; data enriched to 6 pts) — ready for CC |
| Select training (player) | `REDESIGN2.SelectTrainingPremium` + `REDESIGN6.SelectTrainingWide` | 🟡 PROTOTYPE | ✦ redesigned (phone + **wide landscape hub**: nearest-training hero + week-layout + CTA ↔ past-trainings grid). Model: week = one layout, then rotation; no badges/progress (decision m1142). Route `rd-selecttraining` added to `responsiveWide`. — ready for CC |
| Training screens (coach / scout) | `REDESIGN3.*` | 🟡 PROTOTYPE | ✦ redesigned — ready for CC |
| ~~Public player profile~~ | ~~`REDESIGN4.PlayerProfilePremium`~~ | ❌ DROPPED | Skonsolidowany ze „Statystyki zawodnika" (`REDESIGN.PlayerStats*`) — ta sama rola, jeden ekran. Route `rd-pubstats` + wpisy menu usunięte (m1326). CC: NIE budować osobnego public-profile. |
| Scout ranking | `REDESIGN4.ScoutRankingPremium` | 🟡 PROTOTYPE | ✦ redesigned — ready for CC |
| Profile / settings | `REDESIGN5.MyProfilePremium` + `REDESIGN6.MyProfileWide` | 🟡 PROTOTYPE | ✦ redesigned (phone + wide) — ready for CC |
| **Team management (CONSOLIDATED)** | `TEAMMANAGE.TeamManage` (`teammanage.jsx`) | 🟡 PROTOTYPE | ✦ **Scala 5 powierzchni w JEDEN ekran** (`one-screen principle`): stary `TeamProfile*` + `RosterManage*` + `TeamFormModal` → jeden route `rd-teamprofile` (+ alias `rd-teammanage`), responsywny (telefon 1-kol ↔ tablet/desktop 2-kol sticky identity). Zawiera: crest hero + upload logo + kolor; nazwa/kraj/PBLeagues ID/extId; ligi+dywizje; drużyny powiązane (parent/children); **roster jako karty graczy pogrupowane Sztab/Zawodnicy/Pit-crew** z HERO toggle + pixel-avatarami; audyt (zwijalny, read-only); strefa retire/delete. **Ten sam ekran = create (zastępuje modal) i edit.** **Gate = `isSuperAdmin`** (super_admin / e-mail właściciela), NIE `effectiveIsAdmin`; reszta read-only. **CC: usunąć `TeamFormModal`; brief = `BRIEF - Drużyny Coach redesign.md` + sekcja niżej. Baseline gałąź `feat/team-edit-unification`.** — ready for CC |
| ~~Team profile (old)~~ | ~~`REDESIGN5/6.TeamProfile*`~~ | ❌ DROPPED | Wchłonięty przez `TEAMMANAGE.TeamManage`. NIE budować osobno. |
| ~~Roster manage (old)~~ | ~~`REDESIGN5/6.RosterManage*`~~ | ❌ DROPPED | Wchłonięty przez `TEAMMANAGE.TeamManage` (roster = sekcja kart). NIE budować osobno. |
| New-team / new-player forms | `forms.jsx` (orig) → **`REDESIGN7.NewPlayerWizard` / `NewTeamWizard`** (live; old `NewPlayerPremium`/`NewPlayerWide`/`NewTeamPremium`/`NewTeamWide` retained but unrouted) | 🟡 PROTOTYPE | ✦ **converted form → stepped wizard** (phone + wide via `wide` prop). Player = 3 steps (req: full name + team multi-pick → gates Next; opt: number/nick/age/photo; opt: role/class/nation/bunker/PBLI/notes). Team = 2 steps (req: name + league; opt: PBLeagues ID + parent). „Save now” after step 1, Skip on optional steps, progress bar. Required gate per decision m1142. `FORM_OPTS.teams` added (data5). — ready for CC |
| CSV import | `MORE_UI.CsvImport` (orig) → `REDESIGN9.CsvImportPremium` + `CsvImportWide` | 🟡 PROTOTYPE | ✦ redesigned (phone + wide, premium mapping + live preview headers) — ready for CC |
| Layout editor | `layouts.jsx` (orig) → `REDESIGN8.LayoutEditorPremium` + `NewLayoutPremium` + `TournamentSettingsPremium` + `LayoutErrorPremium` | 🟡 PROTOTYPE | ✦ redesigned (phone + wide, responsive) — ready for CC. One screen, modes **Taktyki ↔ Kalibracja baz A/B** (draggable A/B markers @50% h → drive phase axis), enriched tactic cards (coach-stroke mini-thumb + players + author + visibility), real field photo. Routes `editor`/`editor-empty`/`newlayout`/`tournsettings`/`layouterror` swapped + added to `responsiveWide` allow-list. **Note: dropped `rdSheetUp` anim on settings sheet (rendered off-screen in full-bleed mount).** |
| Workspace switcher (full screen) | `WorkspaceSwitcher` (orig) → `REDESIGN9.WorkspaceSwitcherPremium` (phone sheet + wide modal) | 🟡 PROTOTYPE | ✦ redesigned — delegated from old `WorkspaceSwitcher`, all call-sites premium — ready for CC |
| **Field block (#7 bunkers · #10 viewer · #11 lines/zones · #12 tactic · Kalibracja baz A/B)** | `FIELD3.FieldWorkspace` (redesign10.jsx + redesign11.jsx + data `fielddata.jsx`) | 🟡 PROTOTYPE | ✦ **Kalibracja baz A/B folded in (m1146)** — drag A(lewo)/B(prawo) markers on the SAME SVG surface, default 50% height ~5% from edges per m0320, dashed phase-baseline between them, rail readout X/Y + rozstaw% + Reset/Potwierdź. `calibrate` is a super-admin-only mode (route `rd-field-calibrate`); this RETIRES the old `REDESIGN8` separate calibration on the legacy `window.FIELD` renderer → one field surface, "jeden ekran" principle. ✦ **All four+cal collapsed into ONE field workspace** (CC confirmed all 4 share one `FieldCanvas`; divergence is only rail chrome). Data-driven SVG field per CC schema (bunkers normalized 0–1 + 20 BUNKER_TYPES, `computeMirrors` for mirror twins, lineDivision, 2-pt callout lines, freehand zone polygons). Left icon mode-rail swaps the right content-rail: View(#10 toggles+legend) / Bunkers(#7 palette+place+edit, **admin**) / Lines(#11 explicit Nazwa·Pozycja·Kolor controls — fixes click=hidden-action bug, **admin**) / Zones(#11 polygon draw, **admin**) / Tactic(#12 phase axis + 5/5 placement + runner/shot arrows). `isAdmin` prop gates the 3 admin modes — the persistent Bunkers tab IS the #7 RBAC re-entry fix. Responsive (wide 3-col, phone stacked). Routes `rd-field*` + `responsiveWide`. — ready for CC |

## Design system
- Tokens: `prototype/theme.jsx` ≡ production `src/utils/theme.js` (kept in sync by hand).
- Premium primitives shared across redesign files via `window.RDX` (tokens, `Crest`, `RdIcon`, `LivePulse`, `SectionLabel`). New premium screens live in `redesign2.jsx`–`redesign5.jsx`; shell + live + analysis in `redesign.jsx`.
- The `ELEV` elevation system, `Crest`, and `RdIcon` are **in implementation** — handed to CC, not live yet.
- Latest handoff package: `design_handoff_premium_redesign/`.

## Working agreement
1. **Every session: read this file first.** If a screen is 🔵 or 🟢, the design is committed — edits are change requests, not redesigns.
2. Lifecycle: 🟡 PROTOTYPE → (hand to CC) → 🔵 IN IMPLEMENTATION → (live) → 🟢 SHIPPED. Flip the row + bump the date at each transition.
3. If you (the user) tell me something moved stage, I update this ledger so future sessions know.
4. **Every CC task is delivered as a ready-to-paste brief** (fenced block, no commentary the user has to strip out). Standing user instruction.

## Architecture decisions (locked)
_These are settled. Don't relitigate without the user reopening them._

- **Responsive shell = two shells by breakpoint, NOT one framework.**
  - Phone → re-skin the existing bottom-tab shell (low risk, it works).
  - Tablet/desktop → new `AppShellPremiumWide` (persistent sidebar + master-detail), switched via `isMobile`.
  - Rationale: re-skinning the stretched single-column tablet does NOT fix wasted space — the problem that started this. Mirrors the prototype's `AppShellPremium` vs `AppShellPremiumWide`.
- **Shell build is GATED on closing the 5 responsive archetypes first** (below). CC must not build the production wide shell until every screen the shell hosts has a locked tablet/desktop variant — otherwise the shell's content contract shifts and forces a rebuild.
- **5 responsive archetypes** (each screen maps to one; lock the tablet/desktop form of each):
  1. **Master-detail** — phone: full-screen list → push; wide: list + detail pane. (Matches, coach list, scout-of-training, ranking)
  2. **Card grid** — phone: 1 col; wide: 2–4 cols. (Teams, roster)
  3. **Dashboard / profile** — phone: stacked sections; wide: centered max-width column + 2-col blocks. (Player profile, my profile, team profile, today's points)
  4. **Field + rail** — phone: field + bottom; wide: full-bleed field + side rail. (Live scoring ✅, opponent analysis ✅ done)
  5. **Wizard / modal** — phone: full-screen steps; wide: centered max-width panel. (Point wizard ✅, forms ✅ done)
- **Implementation risk order:** fundament (ELEV/Crest/RdIcon) → shell → simple leaves → opponent/live last. "Opponent last" = its **layout/data-viz rebuild**, NOT token propagation (eyebrow color, ELEV cards) — those are safe to apply early as chrome.

## Edge-case rules (design law — apply on every screen)
_Resolved during the player-stats / hero-card review. CC folded these on `feat/premium-design-revisions`._

- **Empty avatar = bug.** No photo → always fall back to initials from the name. Never render an empty grey circle.
- **Long surname** → wrap to **2 lines** (line-height ~1.05) then ellipsis. **Never** shrink the font (rows go inconsistent).
- **No nick** → the nick eyebrow **collapses entirely** (no empty line, no placeholder). Name reflows into the space.
- **No number** → **hide the number badge entirely**. Never `#?` / `#—`. (Identity badge absence = hide, unlike a W-L "—" stat placeholder.)
- **Gauge / "TOP" badges decouple two signals:** the "TOP" label = ranking by **volume** (neutral/accent); the ring color = **value-semantic** (survival 0%→red, low→amber, high→green). A 0% ring is **never** green. Drop the "TOP" superlative when value is 0% or there's only **one** item (n=1).
- **Amber discipline:** amber = interactive/active/live ONLY. Section eyebrows are neutral (sunken/hairline/textDim). Data-viz performance coloring (e.g. low breakout% in amber) is the one allowed non-interactive use — keep it rare and intentional.

## i18n / multi-language (decision — added 2026-06-25)
- **Production = source of truth for translations.** Key-based `t('key')` + per-language dict (`STRINGS`). Adding a language = adding a dictionary. Multi-language work is **CC's job**, not the prototype's.
- **Prototype = PL-only visual reference.** Premium layer (`redesign*.jsx`) has hardcoded Polish and is **intentionally NOT migrated** to `tx()`. Do not bulk-migrate it — decision m1395.
- **Infra prep done (m1392–1393):** `tx()` in `app.jsx` + `manage.jsx` accepts a lang-map form `tx({pl,en,de,…})` alongside `tx('PL','EN')`; language toggle is data-driven off `Object.keys(D.STRINGS)` (+ `LANG_LABELS`). Adding a dict auto-adds its toggle button — for preview only.
- CC brief delivered m1395: audit hardcoded strings in premium screens, confirm `dict[lang]→en→key` fallback, plural rules (PL has 3 forms), and true cost of adding one language.

## One-screen principle (design law — apply app-wide) — added 2026-06-24
**Wherever it CAN be one screen, it IS one screen.** If two "screens" operate on the same data surface and differ only by mode/state, they are ONE screen with mode switching inside it — not separate routes/layouts the user navigates between.
- **Canonical case:** `MatchPage` = ONE match screen with three modes (live scoring / match detail-review / point scouting), not three screens. `LiveMatchPremium` is the visual base; detail + scouting modes adopt the same shell/vocabulary, swapping only the mode-specific body.
- **Test:** same underlying entity + same data hooks + user toggles between views → consolidate into one screen with internal mode state. Different entity or different task → separate screen is fine.
- Applies retroactively as the target for every future consolidation. When auditing a surface, prefer collapsing mode-variants into one shell over multiplying routes.

## Current state (source of truth)
- **All screens designed.** Every screen has a phone + wide variant; all are either 🔵 in implementation or 🟡 ready for CC. No open backlog of un-drawn screens.

### Latest-session deltas (2026-06-29 — fold into next CC handoff)
- **Team management consolidated** → `TEAMMANAGE.TeamManage` (`teammanage.jsx`), route `rd-teamprofile`. Replaces `TeamProfile*` + `RosterManage*` + `TeamFormModal`. Gate `isSuperAdmin`. See ledger row.
- **Division selector on coach team list** (`rd-coach`, all 3 variants — phone `CoachTeamListPremium`, `CoachWide`, `CoachTeamListWide`): segmented control `Wszystkie · PRO3v3 · SEMI-PRO · D3` at top, identical to scout. Division derived per-team from the tournament fixtures (`m.div`), since teams carry no division field. Filters the list + updates the count.
- **Fullscreen maximize + bottom phase-axis on every field screen** (`fieldfull.jsx` → `FIELDFULL_UI.FieldFullscreen`, prop `phases`): maximize button on Opponent analysis (phone+wide), Field-center (player), Live tile. Fullscreen = field maxed + data overlay + draw palette + **contextual phase-axis docked at the bottom of the layout** (`FFAxis`: play/scrub/keyframes). Axis renders ONLY when the screen has point/phase data (Opponent, Live); hidden on data-less fields (Field-center, calibration). Tactic editor (`FieldWorkspace`) keeps its own full-field draw mode — not duplicated. CC: wire `onPhase` so the field overlay actually swaps content per phase if per-phase overlays exist.
- **Responsive system:** `useWide(threshold)` hook (ResizeObserver) → multi-col ≥ threshold, 1-col below. Phone/wide variants switched by `isMobile` in `app.jsx`. Responsive `rd-*` routes render full-bleed via the `responsiveWide` allowlist in `app.jsx` (NOT sheet-constrained) — **CC must replicate this in production**.
- **One-screen principle applied:** `MatchPage` = one screen / three modes (live / review / scouting). Field block = one `FieldWorkspace` (view / bunkers / lines / zones / tactic / calibrate by left mode-rail). Player profile consolidated into Player stats (`rd-pubstats` dropped m1326).
- **Prototype source for CC:** `prototype/` is the source of truth. Key files: `app.jsx` (routing + `responsiveWide` allowlist + `isMobile` dispatch), `redesign6.jsx` (`*Wide` variants + `useWide` + `WTopBar`), `redesign.jsx` (RdIcon glyph set, shell, match list, opponent), `redesign10/11.jsx` + `fielddata.jsx` (field workspace), `theme.jsx` (tokens), `data2-5.jsx` (data).

## Open decisions
_None open — all resolved as of m1366._

### Resolved
- **„Dzisiejsze punkty" (telefon):** `runSide` czytany z nazwy bunkra; mapowanie strony → `D=Dorito · S=Snake · C=Środek`; `outcome` klasyfikowalne jako żyje/out. Karta punktu przeprojektowana na układ pionowy label→value z zawijaniem (m1366). „Centrum" → „Środek" wszędzie gdzie pokazujemy nazwę STRONY (nie bunkra).
- **Kafle scrimmage na treningu:** składy montowane ad-hoc → **kolor domyślny/neutralny** (`#64748b`), nie barwa drużyny macierzystej (m1366).
- **Logo NXL US PRO:** upload 20 logo produkcyjnie — **zatwierdzony** (m1366).

## 🌙 Reconciliation noc 2026-06-29 (CODE-LEVEL triage — render-confirm owed)
Triage prod ↔ prototyp po kodzie (nie render — to drugi krok). Cel §0: nie przebudowywać tego, co żyje.

| Ekran | Prod | Werdykt (kod) |
|---|---|---|
| Coach team list — selektor dywizji | `CoachTabContent.jsx:222` `DivisionTabs` + `CoachWide` | 🟢 SHIPPED-likely (filtr już jest; delta = `m.div` vs `tournament.divisions` → render-confirm) |
| Today's points | `TodaysLogsList.jsx` | 🟢 SHIPPED-likely |
| Select training | `TrainingPickerView.jsx` | 🟢 SHIPPED-likely |
| My profile | `ProfilePage.jsx` (+ PixelAvatar) | 🟢 SHIPPED-likely |
| Scout ranking | `ScoutRankingPage.jsx` (master-detail wide) | 🟢 SHIPPED-likely |
| Point-logging | `QuickLogView.jsx` (kiosk, NIE wizard; tablet @768) | 🟢 SHIPPED-likely |
| CSV import | `CSVImport.jsx` | 🟢 SHIPPED |
| Workspace switcher | `WorkspaceSwitcher.jsx` | 🟢 SHIPPED |
| Player stats (wide) | `PlayerStatsPage.jsx` (WidePanel 2-col + RdDataViz) | 🟢 SHIPPED-likely |
| App shell | `AppShell.jsx` + `AppShellPremiumWide.jsx` | 🟢 SHIPPED |
| **Pixel avatars + builder** | `avatars.jsx` PixelAvatar+AvatarBuilder, `/profile/avatar` | 🟢 SHIPPED (→ team roster MOŻE go użyć) |
| Layout editor / library | `LayoutsPage.jsx` (LayoutsListWide) + `LayoutDetailPage.jsx` | 🟢 SHIPPED-likely |
| **Field block — unified mode rail** | `CanvasRailLayout.jsx` + per-page `configMode` inline | ⚠️ PARTIAL. **§1c fullscreen + oś faz SHIPPED 2026-06-29** (`FieldFullscreen.jsx`: ScoutedTeam +oś, Hitability bez osi, view-only; e2e 116/116, render 6/6). ⏳ unified mode-rail (bunkers/lines/zones/calibrate EDIT) = **RED** → staged briefy Opusa + GO |
| **New player / new team** | `PlayerFormModal.jsx` / `TeamFormModal.jsx` | ❌ to single-form modale, NIE 3/2-krokowe wizardy (§2C work) |
| **Team management** | `TeamDetailPage.jsx` | 🟢 §1a SHIPPED 2026-06-29 (gate→`isSuperAdmin` + read-only + create-mode `/team/new` + `TeamFormModal` usunięty; e2e 116/116; render 3×3). ⏳ reskin wizualny per `teammanage.jsx` = osobny krok na tym fundamencie |

**Wniosek:** 12/15 SHIPPED-likely (tylko render-confirm, NIE rebuild). Realna praca nocy = **§1a Team** (priorytet) · **wizardy gracz/drużyna** · **§1c + field mode-rail** (na końcu, data-critical). Render-confirm 12 ekranów owed (harness + emulator).
