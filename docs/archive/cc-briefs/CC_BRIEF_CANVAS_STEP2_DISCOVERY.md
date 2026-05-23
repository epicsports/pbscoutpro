# CC_BRIEF_CANVAS_STEP2_DISCOVERY.md

**Typ:** discovery / mapping — **READ-ONLY** poza STEP 0.
**Jedyny dozwolony write:** STEP 0 (jedna linijka w HANDOVER, doc-only commit). Reszta = zero zmian w kodzie, zero deploy.
**Czas:** ~1 przebieg. Output = raport w chacie CC, nie kod.
**PRE-FLIGHT:** Ten brief NIE zakłada jak działa canvas. Zakłada że Canvas Step 1 już coś wyciągnął i że landscape już gdzieś żyje — zadaniem CC jest to znaleźć i opisać, nie przyjąć na wiarę. Domyślne założenie: **IT ALREADY EXISTS** — potwierdź albo zaprzecz z repo.

---

## Cel

Zmapować aktualną architekturę canvasa, żeby dało się napisać **brief implementacyjny Canvas Step 2** (BaseCanvas extraction + `useLandscapeMode`) bez zgadywania. Konkretnie: co wyciągnął Step 1, co dziś robi `FieldCanvas`, gdzie rozsmarowana jest logika landscape, i którzy konsumenci pękną przy ekstrakcji.

Output: raport + rekomendacja zakresu Step 2. **NIE implementuj.** Decyzja o granicy ekstrakcji należy do Jacka.

## Źródło prawdy

`git main` + środowisko CC = ground truth. `/mnt/project/` jest stale (dni opóźnienia — w ostatniej sesji widoczne: DESIGN_DECISIONS kopia do § 37, live do § 74). Czytaj **faktyczne repo**.

## Off-limits (twardo)

- ❌ `src/workers/ballisticsEngine.js` — Opus territory, nie czytać do refaktoru, nie ruszać. (Możesz odnotować ŻE BallisticsPage konsumuje canvas — bez wchodzenia w silnik.)

---

## STEP 0 — Korekta HANDOVER (jedyny write w tym briefie)

W `docs/ops/HANDOVER.md` pozycja o `adminUid` repoint figuruje jako **AWAITING-GO**. Jacek potwierdził w sesji: **GO nigdy nie padło, repointu nie robimy.** Zmień status tej pozycji:

- z: `AWAITING: adminUid repoint (GO'd — confirm whether it ran)` (lub bliski wariant — dopasuj do faktycznego brzmienia w pliku)
- na: `adminUid repoint — NO ACTION, not authorized. workspaces/ranger1996.adminUid stays JDDCmHSQ… No repoint without an explicit, deliberate decision (security: changes who is workspace-admin).`

Commit doc-only: `chore(docs): correct HANDOVER — adminUid repoint not authorized, no action`. **Bez deploy.** To jedyna zmiana pliku w tym przebiegu.

---

## STEP 1 — Co wyciągnął Canvas Step 1?

1. Znajdź sekcję **Canvas Architecture** w `docs/DESIGN_DECISIONS.md` (w poprzedniej sesji wskazywana jako § 64, ~line 5952 — zweryfikuj numer i zakres). Streść: jaki był plan Step 1 → Step 2, jaka granica modułów została zadeklarowana.
2. Znajdź faktyczny output Step 1 w kodzie. Czy istnieje już `BaseCanvas` (albo podobny extraction — hook, util, wrapper)? Jeśli tak — ścieżka pliku + co eksportuje + co odpowiada za co.
3. **IF** brak jakiegokolwiek śladu „Step 1" w kodzie i docs → **[ESCALATE TO JACEK]**: być może „Step 2" to w rzeczywistości pierwszy krok ekstrakcji i nazewnictwo wprowadza w błąd. Zatrzymaj się, zaraportuj rozjazd.

## STEP 2 — Co dziś robi `FieldCanvas.jsx`?

Zmapuj odpowiedzialności pliku (nie przepisuj kodu — opisz):
- rozmiar (LOC), główne sekcje
- co renderuje (field image, calibration transform, players, shots, bumps, zones, lines, toolbar, loupe…)
- jakie hooki/refy trzyma (touch handling, `usedTouchRef`, zoom/pan, ResizeObserver, sizing strategy width-first vs height-first)
- co jest „rdzeniem canvasa" (rysowanie + transform + interakcja), a co to „feature na wierzchu" (scouting toolbar, quick shots, hero ring itd.) — to jest kandydat na granicę BaseCanvas vs warstwa feature.

## STEP 3 — Gdzie żyje landscape?

1. Zlokalizuj całą logikę landscape/immersive: orientacja, landscape floating toolbar, left/right edge tabs (LABELS/LINES/ZONES/DANGER/SAJGON/DEATHS/BREAKS/TACTICS), wymuszanie orientacji, sizing w landscape.
2. Czy istnieje już hook `useLandscapeMode` (albo równoważny)? Jeśli tak — co robi, kto go używa. Jeśli nie — gdzie ta logika jest dziś rozsmarowana (komponenty, inline, media queries, JS orientation listeners).
3. **Bug z 19.05** — landscape coach view (zgłoszony przez Jacka jako jeden z dwóch live bugów po NXL). Zlokalizuj objaw w kodzie/route: który widok, co się łamie (render, orientacja, sizing, pusty stan?). Jeśli był już diagnozowany w `fix/ux-bugs-bundle` lub Sentry — podlinkuj. Cel: czy Step 2 (`useLandscapeMode`) naturalnie ten bug zjada, czy to osobny fix.

## STEP 4 — Konsumenci `FieldCanvas`

Wylistuj WSZYSTKIE miejsca importujące/renderujące `FieldCanvas` (oczekiwane, potwierdź: MatchPage, TacticPage, LayoutDetailPage, HeatmapCanvas/heatmap view, BallisticsPage, deaths/breaks analytics — plus cokolwiek czego nie wymieniłem). Dla każdego: jakie propsy podaje, czy ustawia `maxCanvasHeight` (height-first) czy nie (width-first), czy używa `viewportSide`/half-field. To jest lista „co nie może pęknąć" przy ekstrakcji.

## STEP 5 — Rekomendacja zakresu Step 2 → ESCALATE

Na bazie STEP 1–4 zaproponuj:
- **granicę BaseCanvas**: co wchodzi do BaseCanvas (rdzeń: image + transform + sizing + raw touch/zoom/pan + loupe?), a co zostaje warstwą feature na zewnątrz (players/shots/toolbar/zones).
- **odpowiedzialności `useLandscapeMode`**: orientacja + edge tabs + landscape sizing — co dokładnie hook ma owijać.
- ryzyka regresji per konsument ze STEP 4.
- czy bug z 19.05 należy wziąć w zakres Step 2 czy fixnąć osobno wcześniej.

**[ESCALATE TO JACEK]** — granica ekstrakcji + czy landscape bug wchodzi w Step 2. Reszta to autonomiczne mapowanie; nie czekaj na Jacka na każdym STEP-ie, tylko na finalnym werdykcie.

---

## Out of scope (twardo)

- ❌ Żadnej implementacji, ekstrakcji, refaktoru w tym przebiegu.
- ❌ Żadnych commitów poza STEP 0 (doc-only).
- ❌ Żadnego deploy.
- ❌ Nie ruszać `src/workers/ballisticsEngine.js`.
- ❌ Nie przepisywać `FieldCanvas` „przy okazji" — tylko opis.

Po raporcie + werdykcie STEP 5 → Jacek decyduje o granicy, dopiero potem brief implementacyjny Step 2.

---

## Executed 2026-05-23

**STEP 0:** HANDOVER skorygowany — `adminUid` repoint → NO ACTION. Commit `b151474`, doc-only, no deploy.

**STEP 1:** § 64 znaleziona w `DESIGN_DECISIONS.md:5999`. § 64.9 lista 11 kroków (HANDOVER's „8" było luźnym shorthand). Step 1 w kodzie = commit `5f12f7d` (2026-05-19) `refactor: drawZones.js i18n cleanup — canvas Step 1 of § 64` — pure i18n move, no architectural extraction. **No BaseCanvas, no useLandscapeMode, no InteractiveCanvas/AnalyticsCanvas/DrawingOverlay** w `src/`. Step 2 = pierwsza prawdziwa ekstrakcja.

**STEP 2:** `FieldCanvas.jsx` = 454 LOC. 5 layers glued in one: Canvas DOM, sizing/ResizeObserver, viewportSide clipping, gestures (zoom/pan/loupe via touchHandler), drawing pipeline, feature JSX (toolbar). 60+ props — większość feature, ~6 infrastructure. Rendering helpers już sfaktorowane do `./field/draw*`; `createTouchHandler` już sfaktorowany do `./field/touchHandler.js`.

**STEP 3:** No `useLandscapeMode` exists. Only `useDevice` (`src/hooks/useDevice.js:36`) exposes raw `isLandscape: w > h`. Formuła `device.isLandscape && !device.isDesktop` rosmarowana po 2 stronach explicit (LayoutDetailPage:262, MatchPage:70). `window.innerHeight − N` pattern na 7+ sites z per-site offsetami. Edge tabs (LABELS/LINES/DEATHS/TACTICS/DANGER/SAJGON) tylko na LayoutDetailPage:290–336 + page chrome — out of canvas concern. Bug z 19.05 = FEATURE GAP (HeatmapCanvas has ZERO gestures per `CANVAS_ARCHITECTURE.md:131,181`), nie crash — original audit trigger (§ 64.10). Step 2 SAM go nie fixnie; feature ląduje na step #11.

**STEP 4:** 6 direct FieldCanvas consumers (FieldView, MatchPage, TacticPage, LayoutDetailPage, BallisticsPage — **off-limits, Opus territory**, BunkerEditorPage). 2 FieldView heatmap consumers (ScoutedTeamPage, TrainingResultsPage § 70.8 D1). HeatmapCanvas via FieldView only. Wszyscy 8 = nieruszani w Step 2 (additive).

**STEP 5 (ESCALATE):** Zalecony zakres — BaseCanvas (7 concerns z § 64.3) + useLandscapeMode (own the formula + `canvasMaxHeight(L,P)`). Bug 19.05 = NIE w zakresie Step 2 (steps 4–7 + 11). Granular gesture opt-in (per § 64.4) wymaga refactoru touchHandlera — out of brief; Step 2 użyje all-or-nothing gating + opt-in API per § 64.4 shape.

**Jacek GO:** A (gestures into Step 2 via touchHandler reuse + opt-in props), B (hook owns formula), C (landscape coach view = step #11, out of Step 2). Implementation brief = `CC_BRIEF_CANVAS_STEP2_IMPL.md` (archived alongside this).
