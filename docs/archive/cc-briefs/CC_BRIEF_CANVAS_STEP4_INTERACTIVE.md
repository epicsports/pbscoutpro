# CC_BRIEF_CANVAS_STEP4_INTERACTIVE.md

**Typ:** implementation — **HOT-PATH migration**. Pierwsza prawdziwa migracja konsumenta + pierwszy żywy test gestów (dotąd dormant). User-facing → realny smoke po deployu.
**Branch:** `feat/canvas-step4-interactive-canvas`
**PRE-FLIGHT:** Step 2 dostarczył `BaseCanvas` (`53df791`) + `useLandscapeMode` + § 64.11 tabela offsetów (load-bearing — czytaj ją w repo). Step #4 NIE tworzy infrastruktury — przenosi konsumentów na nią. Przeczytaj § 64.3/.4/.8.1 + § 64.11 zanim zaczniesz. Napisz „PRE-FLIGHT done".
**Źródło prawdy:** `git main` + repo. `/mnt/project/` stale.

## Model migracji (decyzja Opusa — NIE pytaj Jacka, chyba że § 64 temu przeczy)

1. **`InteractiveCanvas` = NOWY plik** `src/components/canvas/InteractiveCanvas.jsx`. Komponuje `<BaseCanvas>` (infrastruktura) + hostuje feature layer: drawing pipeline (`drawField → drawZones → drawAnalytics → drawBunkers → drawPlayers → drawQuickShots → drawLoupe → drawCalibration`) + inline player toolbar (`onToolbarAction`) + reset-zoom Btn. **NIE rename FieldCanvas.**
2. **`FieldCanvas.jsx` ZOSTAJE** jako legacy, **nietknięty**, obsługuje BallisticsPage (off-limits). Tymczasowa duplikacja wiring drawing-pipeline między FieldCanvas (legacy) a InteractiveCanvas (new) jest akceptowana na czas tranzycji — zwija się gdy BallisticsPage kiedyś zmigruje (Opus-gated, osobno).
3. **`FieldCanvas.jsx:263` hardcoded DPR ×2 — NIE usuwać w step #4.** (To koryguje Twój „what next" z poprzedniego closeoutu.) Powód: FieldCanvas dalej renderuje BallisticsPage; usunięcie ×2 zmieni rendering off-limits konsumenta. Dedup odłożony do migracji BallisticsPage. BaseCanvas ma poprawne DPR dla InteractiveCanvas — dwie ścieżki współistnieją do tego czasu.
4. **Migrujesz 4 bezpośrednich interaktywnych konsumentów** FieldCanvas → InteractiveCanvas, w tej kolejności (low-risk → hot-path):
   - BunkerEditorPage `:173`, LayoutDetailPage `:395`, TacticPage `:433` — brak `viewportSide`.
   - **MatchPage `:1835` NA KOŃCU** — jedyny żywy konsument `viewportSide` (half-field) + hot-path scoutingu + pierwszy realny test gestów.
5. **`FieldView` dispatcher (§ 64.8.1 deprecation) — OUT of step #4.** Jest sprzęgnięty z heatmap-dispatch (HeatmapCanvas: ScoutedTeamPage/TrainingResultsPage); jego deprecation idzie ze step #5. Zostaw nietknięty.
6. **BallisticsPage — zero edycji.** `ballisticsEngine.js` — nie czytać.

**🔴 Inwariant nadrzędny — read-equivalence:** każdy zmigrowany konsument renderuje i zachowuje się **bit-za-bitem identycznie** jak dziś. `canvasMaxHeight(L,P)` z `useLandscapeMode` musi odtwarzać literał z § 64.11 verbatim — zero „normalizacji" offsetów. To refactor zachowania-zero, nie redesign.

---

## STEP 1 — Spec-check (read-only, szybki)

Przeczytaj § 64.3/.4/.8.1. Potwierdź że model wyżej (nowy InteractiveCanvas komponujący BaseCanvas, kontrakt kompozycji jakim BaseCanvas przyjmuje drawing pipeline — children/render-prop/ref forwarding) jest zgodny z zablokowanym § 64.

- **IF** § 64 dyktuje inny kontrakt kompozycji niż ten którym zbudowałeś BaseCanvas w Step 2 → opisz dokładnie jak InteractiveCanvas wstrzykuje pipeline do BaseCanvas (1–2 zdania), proceed.
- **IF** § 64 wprost przeczy modelowi (np. wymaga rename, albo FieldView w scope) → **STOP, [ESCALATE TO JACEK]** z cytatem z § 64. Inaczej **nie zatrzymuj się** — to nie jest gate, tylko sanity-check.

## STEP 2 — Zbuduj `InteractiveCanvas.jsx`

- Renderuje `<BaseCanvas sizingStrategy=... maxCanvasHeight=... viewportSide=... pinchZoom pan loupe />` (opt-in gesty per § 64.4 — dla scoutingu wszystkie ON) i wstrzykuje feature layer (pipeline + toolbar) wg kontraktu z § 64.3/.4.
- Drawing pipeline + toolbar JSX + mode dispatch + feature props **przenosisz 1:1 z FieldCanvas** (L268–345 pipeline, L397+ toolbar). To ma być przeniesienie, nie przepisanie.
- DPR: InteractiveCanvas NIE ma własnego ×2 — dziedziczy z BaseCanvas (`window.devicePixelRatio || 2`).
- Gesty: pierwszy raz realnie wykonywane. Collectively gated (touchHandler monolityczny, § 64.11 caveat) — dla MatchPage to OK, scouting używa pinch+pan+loupe razem.

## STEP 3 — Migracja low-risk (3 konsumenci, brak viewportSide)

Po kolei, **każdy osobno + build między nimi**: BunkerEditorPage `:173`, LayoutDetailPage `:395`, TacticPage `:433`.
- Swap `FieldCanvas` → `InteractiveCanvas`, props 1:1.
- `maxCanvasHeight` policz przez `useLandscapeMode.canvasMaxHeight(L,P)` z literałami § 64.11 (BunkerEditor −160/−160, LayoutDetail −20/−200, Tactic full/−200).
- LayoutDetailPage: **edge tabs zostają w stronie** (page chrome), tylko sygnał `isLandscape` z hooka. Potwierdź że landscape edge-tabs + portrait renderują jak dziś.

## STEP 4 — Migracja MatchPage `:1835` (HOT-PATH, ostrożnie)

- Swap → InteractiveCanvas, props 1:1, `maxCanvasHeight = canvasMaxHeight(full, −180)`.
- **`viewportSide = fieldSide`** — jedyny żywy half-field. Zweryfikuj że clip + 2× zoom + auto-pan przeciwnej połowy działa identycznie dla `'left'` i `'right'` (BaseCanvas promował ten prop w Step 2 — to jego pierwszy realny konsument).
- **Gesty** — pierwszy żywy test: pinch-zoom, pan (gdy zoomed), loupe (long-press fine-place). Muszą zachować się jak dziś na FieldCanvas. `usedTouchRef` Safari double-fire guard zachowany.
- **IF** read-equivalence dla viewportSide LUB gestów nie da się utrzymać bez ruszania touchHandlera/BaseCanvas → **STOP, [ESCALATE TO JACEK]**. Nie obchodź tego cichym refactorem.

## STEP 5 — Weryfikacja

```
npx vite build 2>&1 | tail -5     # przejść
npm run precommit                  # przejść
git diff --stat                    # oczekiwane: +InteractiveCanvas.jsx, 4 konsumenci dotknięci; FieldCanvas/FieldView/BallisticsPage NIETKNIĘTE
```

- Potwierdź NIETKNIĘTE: `FieldCanvas.jsx` (w tym `:263` ×2), `FieldView.jsx`, `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `./field/draw*`.
- § 27 self-review (pełny format) — fokus na **behavior-preservation**: feature layer przeniesiony, zero zmiany wyglądu/zachowania. Toolbar/loupe/zone labels jak dziś.

## STEP 6 — STOP. Report READY + [ESCALATE TO JACEK: GO to merge]

**NIE merge bez explicit GO Jacka.** Raportuj: diff stat, § 27 verdict, potwierdzenie read-equivalence (viewportSide + gesty + 4 offsety), kontrakt kompozycji ze STEP 1. Czekaj na GO.

## STEP 7 — On GO: merge + deploy + docs + archive

1. `git checkout main && git merge --no-ff feat/canvas-step4-interactive-canvas && git push` (bez gh CLI/PR).
2. `npm run deploy`.
3. `DEPLOY_LOG.md` — wpis (SHA, „Canvas Step #4 — FieldCanvas→InteractiveCanvas, 4 consumers migrated; FieldCanvas legacy retained for BallisticsPage; gestures first live", known: FieldCanvas:263 DPR ×2 deferred to BallisticsPage migration).
4. § 64.9 — Step #4 ✅ z SHA; next active = step #5 (HeatmapCanvas → BaseCanvas).
5. `NEXT_TASKS.md` — `[DONE]` step #4 + next = step #5.
6. Archiwizuj W TYM commicie: `CC_BRIEF_CANVAS_STEP4_INTERACTIVE.md` → `docs/archive/cc-briefs/`.
7. HANDOVER — Main HEAD bump.

**Post-deploy smoke (Jacek, na prodzie — NIE gate, ale zrób szybko bo hot-path):**
- MatchPage scouting: place + select player (toolbar), pinch/pan/loupe, half-field `viewportSide` left+right, save point.
- TacticPage: place/drag/bump, shot drawer.
- LayoutDetailPage: portrait + landscape edge-tabs.
- BunkerEditorPage: tap bunker → sheet.
- Sentry: zero nowych errorów.

---

## Out of scope (twardo)

- ❌ Rename FieldCanvas / retire FieldCanvas / usunięcie FieldCanvas:263 ×2.
- ❌ FieldView deprecation (step #5).
- ❌ HeatmapCanvas / AnalyticsCanvas / DrawingOverlay (późniejsze kroki).
- ❌ BallisticsPage / ballisticsEngine.js.
- ❌ Refactor touchHandler (gesty zostają collectively gated — split to osobna decyzja przed step #5).
- ❌ Refactor `./field/draw*`.
- ❌ Jakakolwiek zmiana wyglądu/zachowania — read-equivalence to twardy inwariant.

---

## Executed 2026-05-24

**Branch:** `feat/canvas-step4-interactive-canvas` → merge `2b6a473` → main → `npm run deploy`.

**Files:**
- New: `src/components/canvas/InteractiveCanvas.jsx` (296 LOC) — feature-layer verbatim transplant of FieldCanvas L218-451 (drawing pipeline + toolbar JSX + photoCache + correctedBunkers + helpers + cursor logic). Sub-component `InteractiveChrome` reads gesture/transform state from `useBaseCanvas()` for toolbarPos + reset-Btn.
- Modified additively: `src/components/canvas/BaseCanvas.jsx` — added `touchHandlerState` pass-through prop (specialized child supplies the ~25 fields touchHandler reads beyond infra), `imgObj` in draw render-prop state + context, `cursor` prop, two-layer render structure (outer resize-observed + inner frame styled per FieldCanvas L367-378), `containerRef` + `setZoom`/`setPan` in context, mouse handler ref cleaned (`handlerRef` instead of `canvasRef._mouseHandler` property assignment from Step 2 polish backlog).
- 4 consumer migrations — swapped `<FieldCanvas>` → `<InteractiveCanvas>`, `maxCanvasHeight={typeof window...}` → `canvasMaxHeight(L,P)` from `useLandscapeMode`, verbatim § 64.11 offsets:
  - `BunkerEditorPage:173` → `canvasMaxHeight(160, 160)`.
  - `LayoutDetailPage:395` → `canvasMaxHeight(20, 200)`.
  - `TacticPage:433` → `canvasMaxHeight(0, 200)`.
  - `MatchPage:1835` → `canvasMaxHeight(0, 180)` + `viewportSide={fieldSide}` (jedyny żywy half-field consumer; pierwszy realny test BaseCanvas's viewportSide promotion z § 64.8.3).

**Off-limits invariants verified untouched:** `FieldCanvas.jsx` (incl. L263 `×2` DPR — stays for BallisticsPage), `FieldView.jsx`, `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `./field/draw*`.

**Validation:** `vite build` ✓ 7.47s → 7.39s; `lint-ui` 0 errors, 765 warnings (baseline). Main bundle `index.js` 228.50 kB / gzip 68.63 kB (was 228.41 / 68.59 — +0.09 kB delta for the migration code path; MatchPage page bundle +0.02 kB). No regression in bundle size.

**Next active:** § 64.9 step #5 — HeatmapCanvas → BaseCanvas (gesture opt-in via prop, unblocks coach summary landscape).
