# CC_BRIEF_CANVAS_STEP5_IMPL.md

**Typ:** implementation — read-only consumer migration + dispatcher delete. NIE hot-path (HeatmapCanvas to widok agregatu, brak gestów dziś → migracja DODAJE pinch+pan; nie odbiera niczego). User-facing → realny smoke po deployu (3 heatmap surfaces).
**Branch:** `feat/canvas-step5-heatmapcanvas`
**PRE-FLIGHT:** Step #4 dostarczył `InteractiveCanvas` (`2b6a473`) — wzorzec kompozycji na BaseCanvas + read-equivalence pipeline. Step #5 powtarza ten model dla HeatmapCanvas + **fold-in deprecation FieldView** (§ 64.9 step #8 collapses into #5). Przeczytaj § 64.3/.4/.5/.8.1/.9/.10/.11 oraz `CC_BRIEF_CANVAS_STEP5_DISCOVERY.md` (raport — werdykt = option (b) loupe-off za darmo + bundle FieldView). Napisz „PRE-FLIGHT done".
**Źródło prawdy:** `git main` + repo. `/mnt/project/` stale.

## Model migracji (decyzja Opusa wg STEP5 discovery — NIE pytaj Jacka, chyba że § 64 temu przeczy)

1. **`HeatmapCanvas` refactor in-place** (nie nowy plik, nie rename) — ta sama nazwa, zmiana środka. Zostaje read-only canvas; zaczyna komponować `<BaseCanvas>` (infra: DOM/DPR/sizing/RO/landscape/half-field clipping/gesture composition); ~300 LOC draw body przenosi się 1:1 do `draw(ctx, w, h, state)` render-prop callback. Wzór = `InteractiveCanvas.jsx` (Step #4).
2. **Gesty: pinch+pan ON, loupe OFF** — `<BaseCanvas pinchZoom={true} pan={true} loupe={false}>`. Loupe-off jest naturalne via dwa istniejące gates (touchHandler L178/L352 `editable||layoutEditMode` + drawLoupe call-site absence) — **NIE ruszaj touchHandler.js, NIE ruszaj drawLoupe.js**. Discovery STEP 2 dowiódł że loupe-off za darmo; jakikolwiek defensive guard wewnątrz touchHandler = redundant + nie-zlecone.
3. **`FieldView.jsx` — DELETE** (207 LOC). Po Step #4 jedyne living call-sites idą przez `mode='heatmap'` branch; non-heatmap branch is dead code. Migracja 3 call sites na bezpośredni `<HeatmapCanvas>` w tym samym PR.
4. **4 konsumentów** (3 przez FieldView swap + 1 direct — **MatchPage = najwyższe ryzyko**):
   - `ScoutedTeamPage.jsx:654` — `<FieldView mode="heatmap">` → `<HeatmapCanvas>`. Niski risk (oddzielny widok, łatwy smoke).
   - `ScoutedTeamPage.jsx:674` — to samo.
   - `TrainingResultsPage.jsx:376` — `<FieldView mode="heatmap">` → `<HeatmapCanvas>`. Niski risk.
   - `MatchPage.jsx:1413` — **NAJWYŻSZE RYZYKO REGRESJI.** Direct caller dotknięty in-place refaktorem (HeatmapCanvas zmienia środek), na ścieżce scoutingu (heatmap tab w żywym meczu). Props zostają 1:1 (sig stabilna per STEP 3) → call-site code = no-op, ALE renderer to ten sam refaktorowany komponent → smoke MatchPage heatmap = **#1 priorytet po deployu**, nie audit-only afterthought.
5. **DPR `×2` literal at `HeatmapCanvas:49`** — **REMOVE** (BaseCanvas owns runtime `window.devicePixelRatio || 2` — jeden z 3 sites z § 64.11 finally migrates wraz z konsumentem).
6. **Sizing `−200` literal at `HeatmapCanvas:36`** — **REMOVE**. HeatmapCanvas owns sizing **internally**: liczy `useLandscapeMode.canvasMaxHeight(200, 200)` (§ 64.11 row dla HeatmapCanvas = 200/200, landscape parity, no orientation branch) i przekazuje do `<BaseCanvas maxCanvasHeight=... sizingStrategy='height-first'>` w swoim własnym renderze. **Konsumenci NIE przekazują żadnych sizing propsów** — zero diffu sizing-related na call-site → gwarantowana read-equivalence wymiarów.
7. **`./field/draw*` — zero edits.** Heatmap rendering jest in-file; nie wyciągamy do `./field/drawHeatmap.js` (osobny krok, post-step-#5 jeśli kiedyś).
8. **BallisticsPage / `ballisticsEngine.js` / `FieldCanvas.jsx` / `InteractiveCanvas.jsx` / `touchHandler.js` — zero edits.**

**🔴 Inwariant nadrzędny — read-equivalence:** każdy z 3 heatmap surface'ów (ScoutedTeamPage ×2 widoki + TrainingResultsPage + MatchPage heatmap tab) renderuje **bit-za-bitem identycznie** jak dziś. Dodatek pinch+pan = jedyna nowa zachowanie. Density clouds, marker shapes, hero rings, kill clusters, zone overlays, bunker labels = piksel-identycznie.

---

## STEP 1 — Spec-check (read-only, szybki)

Przeczytaj § 64.3/.4/.5/.8.1. Potwierdź że model wyżej (refactor in-place + bundle FieldView delete) jest zgodny z zablokowanym § 64.

- **IF** § 64 dyktuje że HeatmapCanvas musi być nowym plikiem (np. `canvas/HeatmapCanvas.jsx`) zamiast in-place refactor → przyjmij to (rename + reimport w 4 call sites). Reszta modelu bez zmian. To nie jest gate, tylko sanity-check.
- **IF** § 64 wymaga że FieldView deprecation musi być osobny krok #8 (nie #5) → **STOP, [ESCALATE TO JACEK]** z cytatem z § 64 + discovery werdykt który mówi inaczej. Inaczej proceed.

## STEP 2 — Pre-migration audit FieldView (oba checks — gate na scope + render-equivalence)

Przed jakąkolwiek migracją wykonaj DWA audyty FieldView (czytasz `src/components/FieldView.jsx` w całości — to ~207 LOC, szybko).

### STEP 2a — Layer-toggle Btn UI usage (decyduje scope Btn JSX)

Czy któryś z 3 FieldView call sites passes `showLayerControls={true}` lub `showHeatmapControls={true}` (FieldView L102-136)?

- **(a) żaden nie używa** → straight delete FieldView. **DEFAULT — discovery sugeruje to.**
- **(b) używają, ale TYLKO ScoutedTeamPage** → port Btn UI inline do ScoutedTeamPage przy migracji jego dwóch call sites. Delete FieldView.
- **(c) używają w >1 caller** → extract `<HeatmapControls>` do `src/components/HeatmapControls.jsx` (lightweight, ~50 LOC) + reuse z każdego callera. Delete FieldView.

Wybierz wariant **bez pytania Jacka**. Wszystkie 3 ścieżki kończą się delete FieldView; różnica = tylko gdzie żyje Btn JSX. Zaraportuj wybór w STEP 6.

### STEP 2b — Passthrough purity (gate na render-equivalence — KRYTYCZNE)

FieldView delete jest bezpieczne **TYLKO jeśli FieldView w branchu `mode='heatmap'` (L139-153) jest czystym passthroughem**. Zweryfikuj że FieldView NIE dodaje żadnej z poniższych rzeczy poza samo `<HeatmapCanvas {...mapped props}/>`:

- **Default-propsy** na poziomie sygnatury FieldView (L30-80) które żywe call-sites pominęły — np. `heatmapShowPositions = true`, `heatmapShowShots = true`, `heroPlayerIds = []`, `layers = ['lines']`, fallback `field = {}`. Jeśli call-site nie passa np. `heatmapShowPositions`, dziś dostaje `true` przez default FieldView; po migracji direct, HeatmapCanvas sam musi mieć `showPositions = true` default (sprawdź jego sig L6 — ma `showPositions = true, showShots = true, heroPlayerIds = []` → zgodne, OK). Każdy default FieldView który **nie ma odpowiednika w HeatmapCanvas defaults** = wymaga jawnego propu na call-site po migracji.
- **Internal state** (`internalBunkers`, `internalZones` z L85-91, inicjalizowane z `layers` array) — jeśli call-site nie passa `showBunkers`/`showZones` jawnie, dziś dostaje wartość z `layers` array (domyślnie `['lines']` → showBunkers=false, showZones=false). HeatmapCanvas też defaultuje obie na false → match. ALE jeśli któryś call-site passa `layers={['bunkers']}` lub `layers={['zones']}` → te muszą przejść jako jawne `showBunkers={true}`/`showZones={true}` przy migracji.
- **Wrapper container** — FieldView opakowuje wszystko w `<div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }} className={className}>` (L100). Jeśli call-site polega na tym flex-column wrappingu (np. heatmap-controls pod canvasem renderowane przez FieldView) → po migracji direct trzeba odtworzyć to opakowanie inline.
- **`style` / `className` forwarding** — jeśli któryś call-site passa `style` lub `className` do FieldView, te lecą na zewnętrzny wrapper div. Po migracji → opakuj `<HeatmapCanvas>` w odpowiedni `<div style className>`.

Wynik audytu (per call-site, 3 wpisy) raportuj w STEP 6: "FieldView=pure passthrough dla [siteX]" LUB "FieldView dodaje [X] dla [siteX] → odtworzone jako [Y] przy migracji". Jeśli audyt wykryje cokolwiek nietrywialnego — refleksja przed kontynuowaniem (nie panikuj, ale opisz to w raporcie, żeby Jacek widział delta).

## STEP 3 — Refactor HeatmapCanvas in-place

- Replace own canvas + ResizeObserver + DPR + sizing useEffect → outer wrap z `<BaseCanvas sizingStrategy='height-first' maxCanvasHeight={canvasMaxHeight(200,200)} fieldImage={fieldImage} pinchZoom pan loupe={false} draw={drawHeatmap}>`. `canvasMaxHeight(200,200)` policzony z `useLandscapeMode()` WEWNĄTRZ HeatmapCanvas (decyzja modelu #6 — konsumenci nie passują sizingu).
- Cały dotychczasowy draw body (`HeatmapCanvas.jsx:46-346`, ~300 LOC) przenieś verbatim do `const drawHeatmap = (ctx, w, h, state) => { ... }`. `state.imgObj` zastępuje lokalny `imgObj` (BaseCanvas już go ładuje z `fieldImage`).
- **🔴 KRYTYCZNE — re-render gate na propsach (toggle showShots/showZones/showPositions/showBunkers/HERO musi przerysować):** BaseCanvas's draw effect (BaseCanvas L257-277) ma `draw` w deps array. Wzorce, które działają:
  - **(a) DEFAULT — niewrapowana arrow function** w ciele HeatmapCanvas → nowa referencja `draw` co każdy render → effect re-fire'uje za każdym razem. Zamknięcie chwyta świeże propsy. Działa, ale re-fire'uje nawet gdy props się nie zmieniły (akceptowalny koszt — InteractiveCanvas tak działa per Step #4).
  - **(b) `useCallback(drawHeatmap, [points, rosterPlayers, bunkers, showBunkers, dangerZone, sajgonZone, showZones, showPositions, showShots, visibility, heroPlayerIds])`** — referentially stable kiedy props się nie zmieniają. **Każdy props który draw odczytuje MUSI być w deps array**, inaczej toggle nie przerysuje (stale closure trap). Jeśli wybierzesz (b) — wylistuj deps zawodowo, dopasuj 1:1 do tego co dziś jest w `useEffect` deps array (`HeatmapCanvas.jsx:346`).
  - **Zakaz (c):** `useCallback(drawHeatmap, [])` — gwarantowany stale closure, toggle nie zadziała.
  - **Walidacja:** lokalnie odpal `npm run dev`, przejdź na widok który toggluje `showShots`/`showZones`/HERO (TrainingResultsPage source-filter pills, ScoutedTeamPage HERO toggle) i potwierdź że canvas przerysowuje przy toggle. Zaraportuj w STEP 6 wybrany wzorzec (a) lub (b) + wynik live-toggle smoke.
- Props API: **bez zmiany breaking** — `fieldImage, points, rosterPlayers, bunkers, showBunkers, dangerZone, sajgonZone, showZones, showPositions, showShots, visibility, heroPlayerIds` zostają z tymi samymi defaults. Dodaj `pinchZoom = false, pan = false` jako opt-in (default off → backward compat dla MatchPage `:1413` zero touch). `loupe` — NIE dodawaj jako prop (zawsze false dla HeatmapCanvas; hardcoded w BaseCanvas wywołaniu).
- Usuń: `containerRef`, `canvasRef`, `imgObj` state + load effect, `size` state + RO effect, draw useEffect zewnętrzny scaffold, `<div ref><canvas ref>` JSX (wszystko owns BaseCanvas).
- Zachowaj: cały draw body, wszystkie helpery (`buildGrid`, `renderGrid`, `drawDot`, `drawTriangle`, `drawElimX`, `drawHeroRing`, `drawBumpLayer`, `drawShotLayer`, `drawZone`), `tracePathCone`/`vectorDirectionDeg` imports.

## STEP 4 — Migracja 3 call sites + delete FieldView

Po kolei, **każdy osobno + build między nimi**:

1. **ScoutedTeamPage `:654`** — swap `<FieldView mode="heatmap" field={field} heatmapPoints=...>` → `<HeatmapCanvas fieldImage={field.fieldImage} points={...} bunkers={field.bunkers||[]} dangerZone={field.dangerZone} sajgonZone={field.sajgonZone} showBunkers={...} showZones={...} ...>`. Mapping prop-by-prop (FieldView passes them through; przeczytaj FieldView `:139-153`). **NIE passuj** żadnego sizing propu (`maxCanvasHeight`/`sizingStrategy`) — HeatmapCanvas owns je per decyzja modelu #6. Pass `pinchZoom` / `pan` jeśli ScoutedTeamPage chce gesty (decyzja: portrait baseline → default off; landscape coach view włącza w step #11). DEFAULT step #5 = **default off** (read-equivalence; gesty = availability, nie aktywacja). Odtwórz wszystko co STEP 2b zidentyfikowało jako wartość-dodaną FieldView (default-prop, layers→show*, wrapper div, style/className).
2. **ScoutedTeamPage `:674`** — to samo.
3. **TrainingResultsPage `:376`** — to samo.
4. **MatchPage `:1413`** — direct caller, in-place refaktor go dotyka (renderer to ten sam refaktorowany komponent). Props zostają bez zmiany breaking (sig stabilna per STEP 3) → kod call-site = **no-op**. Jeśli signature WYMUSI breaking change → **STOP, [ESCALATE TO JACEK]** (signature break był wykluczony w modelu; to znak że refaktor poszedł poza scope). To NIE jest audit-only — to jest "code stays untouched, but behavior MUST be verified via #1 priorytetu smoke" (STEP 7).
5. **Delete `src/components/FieldView.jsx`** (207 LOC). `git rm`. Pre-flight: STEP 2b audit MUSI być pozytywny (pure passthrough LUB wszystkie wartości-dodane odtworzone w STEP 4.1-3).
6. **Grep audit po delete:** `grep -r "FieldView" src/` → musi zwrócić ZERO matches poza może komentarzem w `BaseCanvas.jsx` (kosmetyczny, zostaw lub czyść — discretion).

## STEP 5 — Weryfikacja

```
npx vite build 2>&1 | tail -5     # przejść
npm run precommit                  # przejść
git diff --stat                    # oczekiwane:
                                   #   M src/components/HeatmapCanvas.jsx (~300 LOC refactor)
                                   #   M src/pages/ScoutedTeamPage.jsx (~10 LOC)
                                   #   M src/pages/TrainingResultsPage.jsx (~5 LOC)
                                   #   D src/components/FieldView.jsx (-207 LOC)
                                   #   (opt) A src/components/HeatmapControls.jsx if STEP 2 var (c)
```

- Potwierdź NIETKNIĘTE: `FieldCanvas.jsx`, `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `drawLoupe.js`, `./field/draw*`, `InteractiveCanvas.jsx`, `BaseCanvas.jsx`, `MatchPage.jsx` (chyba że STEP 4.4 wymusza prop update — jeśli tak, jednoliniówka).
- § 27 self-review (pełny format) — fokus na **behavior-preservation**: density colors, marker shapes, hero rings, kill clusters, zones, bunker pills = piksel-identycznie. Pinch+pan = nowy affordance, ale dla step #5 default off → nie aktywny w żadnym żywym widoku (dopóki step #11 nie flipnie flagi w ScoutedTeamPage).

## STEP 6 — STOP. Report READY + [ESCALATE TO JACEK: GO to merge]

**NIE merge bez explicit GO Jacka.** Raportuj:
- diff stat (potwierdzenie 4 plików + 1 delete).
- § 27 verdict.
- **STEP 2a wybór:** wariant (a/b/c) Btn UI + uzasadnienie.
- **STEP 2b wynik (per call-site):** "pure passthrough" LUB "dodaje [X], odtworzone jako [Y]" dla każdego z 3 FieldView call sites. Jeśli cokolwiek nietrywialnego — opisz dokładnie.
- **🔴 BaseCanvas re-fire confirmation:** Czy BaseCanvas re-fire'uje `draw` na zmianie propsów HeatmapCanvas? Wybrany wzorzec — (a) plain arrow function (re-fire na każdym renderze) lub (b) `useCallback` z jawną deps list. **Live-toggle smoke wynik:** wymień KONKRETNIE które toggle dotknąłeś (np. "TrainingResultsPage source pills Scout→Coach przerysował", "ScoutedTeamPage HERO toggle przerysował", "showShots pill flip przerysował") + potwierdzenie że canvas przerysował na każdym. Jeśli pominąłeś ten smoke = nie raportuj READY, wróć i zrób.
- **Read-equivalence per call-site:** 3 heatmap surfaces + MatchPage heatmap tab eyeballed (portrait minimum; landscape jeśli dostępny). **MatchPage = priorytetowy** — to direct consumer renderera który się zmienił.
- **MatchPage code touch:** confirm no-op LUB jednoliniówka (jeśli STEP 4.4 wymusiła update). Jeśli signature break → ESCALATE zamiast READY.
- Bundle delta (`dist/assets/index-*.js` gzip before/after — oczekiwane: ~−1 kB net, bo FieldView delete > HeatmapCanvas refactor neutral).
- Sentry: zero nowych errorów przy lokalnych smoke'ach.

Czekaj na GO.

## STEP 7 — On GO: merge + deploy + docs + archive

1. `git checkout main && git merge --no-ff feat/canvas-step5-heatmapcanvas && git push` (bez gh CLI/PR).
2. `npm run deploy`.
3. `DEPLOY_LOG.md` — wpis (SHA, „Canvas Step #5 — HeatmapCanvas → BaseCanvas in-place + FieldView deprecation, 3 FieldView call-sites swapped to direct HeatmapCanvas + MatchPage:1413 direct caller covered by refactor (props 1:1); pinch+pan available default-off (unblocks landscape coach view step #11); loupe naturally inert via existing gates; sizing owned internally by HeatmapCanvas", known: STEP 2a wariant wybrany + STEP 2b passthrough findings + draw re-fire wzorzec (a/b) + smoke wynik MatchPage heatmap tab).
4. § 64.9 — Step #5 ✅ + Step #8 ✅ (FieldView deprecation collapsed in) z SHA; next active = step #6 (TacticPage analytics overlay) **OR** step #11 (landscape coach view feature) — decyzja Jacka post-step #5.
5. `NEXT_TASKS.md` — `[DONE]` step #5 + step #8 + next.
6. Archiwizuj W TYM commicie: `CC_BRIEF_CANVAS_STEP5_DISCOVERY.md` (jeśli istnieje na dysku) + `CC_BRIEF_CANVAS_STEP5_IMPL.md` → `docs/archive/cc-briefs/`.
7. HANDOVER — Main HEAD bump.

**Post-deploy smoke (Jacek, na prodzie — kolejność = ryzyko, MatchPage pierwszy):**
1. **🔴 MatchPage heatmap tab — #1 PRIORYTET.** Direct caller dotknięty in-place refaktorem na ścieżce scoutingu. Otwórz żywy match → przełącz na heatmap tab → toggle showShots/showZones/HERO → wszystko musi przerysować jak dziś. Sentry tu = blocker.
2. **TrainingResultsPage:** heatmap section (D1 source-filtered pills All/Scout/Coach/Player → toggle musi przerysować), portrait.
3. **ScoutedTeamPage:** per-team heatmap (oba miejsca — `:654` i `:674`), portrait. Density blobs (bumps + shots), markers, hero rings (jeśli HERO set), kill 💀, zones, bunker pills.
4. Sentry: zero nowych errorów na czterech widokach.
5. (Landscape smoke = NIE w scope step #5 — landscape coach view = step #11.)

Jeśli MatchPage heatmap regresuje → natychmiastowy `git revert -m 1 <SHA> && git push && npm run deploy`. To jest ścieżka scoutingu, nie znoszą się regresje wizualne.

---

## Out of scope (twardo)

- ❌ `touchHandler.js` — zero edits. Loupe-off za darmo via istniejące gates (discovery STEP 2 finding).
- ❌ `drawLoupe.js` — zero edits.
- ❌ `FieldCanvas.jsx` / `InteractiveCanvas.jsx` / `BaseCanvas.jsx` — zero edits (chyba że trywialny komentarz w BaseCanvas L42-54 caveat — kosmetyczny update opcjonalny).
- ❌ `./field/draw*` — heatmap rendering zostaje in-file, nie wyciągamy do `drawHeatmap.js` (osobny krok jeśli kiedyś).
- ❌ Landscape coach view aktywacja w ScoutedTeamPage (`useLandscapeMode` activation, full-screen layout, orientation routing) — to jest step #11 feature, NIE step #5.
- ❌ Flip `pinchZoom`/`pan` to `true` w którymkolwiek consumer (default off w step #5; step #11 włącza w landscape branch ScoutedTeamPage).
- ❌ Extract heatmap drawing helpers (`buildGrid`, `renderGrid`, etc.) do osobnego utility — zostają w `HeatmapCanvas.jsx`.
- ❌ BallisticsPage / `ballisticsEngine.js`.
- ❌ Refactor toggle visibility logic (`visibility` prop, `showPositions`, `showShots`) — zachowane 1:1.
- ❌ Jakakolwiek zmiana wyglądu/zachowania — read-equivalence to twardy inwariant.

---

## Executed YYYY-MM-DD

_(filled in post-merge by CC during STEP 7)_

**Branch:** `feat/canvas-step5-heatmapcanvas` → merge `<SHA>` → main → `npm run deploy`.

**Files:**
- _(filled in)_

**Off-limits invariants verified untouched:** `FieldCanvas.jsx`, `InteractiveCanvas.jsx`, `BaseCanvas.jsx`, `BallisticsPage.jsx`, `ballisticsEngine.js`, `touchHandler.js`, `drawLoupe.js`, `./field/draw*`, `MatchPage.jsx` _(or document the 1-line prop update if STEP 4.4 needed it)_.

**Validation:** `vite build` ✓ _(timing)_; `lint-ui` 0 errors. Bundle: _(delta)_.

**Next active:** § 64.9 step #6 OR step #11 — decyzja Jacka.
