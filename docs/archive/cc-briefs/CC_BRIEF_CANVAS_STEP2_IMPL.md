# CC_BRIEF_CANVAS_STEP2_IMPL.md

**Typ:** implementation. Buduje DWA nowe pliki, **nie rusza żadnego konsumenta**. Zero user-facing change.
**Branch:** `feat/canvas-step2-basecanvas`
**PRE-FLIGHT:** Discovery zrobiony (poprzedni przebieg). Step 1 = tylko i18n cleanup (`5f12f7d`), więc to **pierwsza prawdziwa ekstrakcja**. BaseCanvas/useLandscapeMode nie istnieją — tworzysz od zera. Mimo to: przeczytaj § 64 w repo zanim zaczniesz, nie pisz z pamięci tego briefu. Napisz „PRE-FLIGHT done" w pierwszej wiadomości.
**Źródło prawdy:** `git main` + repo CC. `/mnt/project/` stale — czytaj faktyczny `docs/DESIGN_DECISIONS.md` § 64 (≈ line 5999).

## Scope locked (Jacek GO na A/B/C)

- **(A)** Gesty WCHODZĄ do Step 2 — BaseCanvas komponuje istniejący `createTouchHandler` + opt-in props.
- **(B)** `useLandscapeMode` owns the formula — zwraca `canvasMaxHeight(...)`, jako czysty read-equivalent.
- **(C)** Landscape coach view = OUT (ląduje na step #11 § 64.9). Step 2 = infrastruktura.

Step 2 dodaje pliki które na razie **nikt nie renderuje**. To zamierzone — fundament. Realne ćwiczenie kodu przychodzi na step #4 (FieldCanvas→InteractiveCanvas). Weryfikacja Step 2 jest więc *addytywna*: build przechodzi, żaden konsument nie ruszony, app renderuje identycznie.

## Off-limits (twardo)

- ❌ `src/workers/ballisticsEngine.js` — nie czytać, nie ruszać.
- ❌ `BallisticsPage.jsx` — owija Opus territory; zero edycji (nawet „przy okazji").
- ❌ Żadnej migracji konsumenta (8 call-sites zostaje na FieldCanvas/HeatmapCanvas/FieldView).
- ❌ Nie usuwać istniejących hardcoded `×2` DPR z FieldCanvas/HeatmapCanvas (to robi się przy ich migracji, nie teraz — tylko ZLOKALIZUJ i odnotuj w raporcie).
- ❌ Nie refaktorować `./field/draw*` ani `touchHandler.js` (są już sfaktorowane — tylko reuse).

---

## STEP 1 — Branch + read locked spec

1. `git checkout main && git pull`, potem `git checkout -b feat/canvas-step2-basecanvas`.
2. Przeczytaj w repo: § 64.3 (concerns BaseCanvas), § 64.4 (gestures composition + opt-in), § 64.8.3 (viewportSide promotion), § 64.8.5 (DPR), § 64.9 (11 steps — potwierdź że Step 2 = pierwsza ekstrakcja). **API i kontrakt kompozycji bierzesz z § 64.3/.4, nie z tego briefu** — brief mówi CO i z jakimi guardrailami, § 64 mówi JAK dokładnie dzieci komponują.

## STEP 2 — `useLandscapeMode` (new file `src/hooks/useLandscapeMode.js`)

Pure hook na bazie `useDevice` (`src/hooks/useDevice.js`).

- Owns formułę `device.isLandscape && !device.isDesktop` (dziś rozsmarowaną po 7 miejscach).
- Owns konsolidację `window.innerHeight − N`.
- API: `{ isLandscape, canvasMaxHeight(landscapeOffset, portraitOffset) }` (lub bliski kształt jeśli § 64 dyktuje inaczej — wtedy zaznacz rozjazd).

**🔴 Guardrail (B) — read-equivalence:** hook NIE zmienia żadnego zachowania w Step 2. `canvasMaxHeight(L, P)` musi odtwarzać **co do literału** obecną wartość każdego site'u, gdy ten site kiedyś zmigruje. Zero „normalizacji" offsetów. Zakoduj tę tabelę jako kanoniczną referencję (potwierdź wartości czytając pliki — poniżej z discovery, zweryfikuj):

| Site | dziś | landscapeOffset | portraitOffset |
|---|---|---|---|
| MatchPage :1835/1837 | `isLandscape ? full : −180` | full | −180 |
| TacticPage :433/435 | `isLandscape ? full : −200` | full | −200 |
| LayoutDetailPage :395/397 | `isLandscape ? −20 : −200` | −20 | −200 |
| HeatmapCanvas :36 | `−200` (no branch) | −200 | −200 |
| BunkerEditorPage :173/176 | `−160` (no branch) | −160 | −160 |
| LayoutAnalyticsPage :122 | `−90` (no branch) | −90 | −90 |
| BallisticsPage :90/92 | `−140` (off-limits) | −140 | −140 |

**Zdefiniuj „full" precyzyjnie** na podstawie obecnej semantyki sizing w FieldCanvas (np. `maxCanvasHeight: null` → height-first fill, albo konkretny sentinel). Udokumentuj jednym zdaniem w hooku.

## STEP 3 — `BaseCanvas` (new file `src/components/canvas/BaseCanvas.jsx`)

Owns dokładnie 7 concerns z § 64.3, **nic poza nimi**:

1. **Canvas DOM + ref forwarding** — dzieci rysują do jego `<canvas>` (kompozycja per § 64.3/.4). Sam **nie renderuje contentu** — zero importu `drawField`/`drawPlayers`/`drawZones`/etc.
2. **DPR scaling** — `window.devicePixelRatio || 2` (per § 64.8.5). Tu jest poprawna logika DPR; stare hardcoded `×2` w FieldCanvas/HeatmapCanvas ZOSTAJĄ (dedup przy migracji).
3. **Sizing strategy** — prop `sizingStrategy: 'width-first' | 'height-first'` + `maxCanvasHeight: number | null`. Enkapsuluje `window.innerHeight − N` (przez hook ze STEP 2).
4. **ResizeObserver** — pojedynczy setup, pojedynczy handler. (Uwaga na § 2.1 DESIGN_DECISIONS: nigdy `parent.clientHeight` — infinite zoom.)
5. **Landscape integration** — konsumuje `useLandscapeMode`.
6. **Safe-area** — udokumentowana ekspektatywa: stronę dostarcza padding, BaseCanvas **nie** czyta `env(safe-area-inset-*)`. Komentarz w pliku.
7. **viewportSide half-field clipping** — `viewportSide: null | 'left' | 'right'` (promote z dormant propa FieldCanvas, § 64.8.3): zoom 2× + auto-pan clipujący przeciwną połowę.

**🔴 Guardrail (A) — gesty 1:1, nie reimplementacja:** warstwa gestów BaseCanvas **komponuje TEN SAM `createTouchHandler`** co dziś FieldCanvas (L87–168: `[zoom,setZoom]`, `[pan,setPan]`, `loupeSourceRef`, delegate). Ten sam state shape, ta sama sygnatura wywołania. Opt-in props: `pinchZoom: bool`, `pan: bool`, `loupe: bool` (per § 64.4). Cel: na step #4 to ma być **przeniesienie**, nie przepisanie. Jeśli § 64.4 dyktuje inny kształt opt-in — idź za § 64.4 i zaznacz.

Gesty leżą dormant do migracji konsumentów — to OK.

## STEP 4 — Weryfikacja (addytywna)

```
npx vite build 2>&1 | tail -5     # musi przejść; potwierdź że unused exports nie wywalają tree-shake/lint
npm run precommit                  # musi przejść
```

- Potwierdź: **żaden** z 8 call-sites nie dotknięty (`git diff --stat` pokazuje tylko 2 nowe pliki + docs ze STEP 6).
- Potwierdź: app renderuje identycznie (nic nie importuje nowych plików → zero user-facing delta).
- § 27 self-review: oczekiwane **w większości N/A** (brak nowego widocznego UI; BaseCanvas nie renderuje chrome). Jedyny istotny check: „zero zmiany zachowania/wyglądu u jakiegokolwiek konsumenta". Raportuj w standardowym formacie z N/A gdzie dotyczy.

## STEP 5 — STOP. Report + [ESCALATE TO JACEK: GO to merge]

**NIE merge'uj do main bez explicit GO Jacka** (per workflow). Zaraportuj:
- diff stat (oczekiwane: 2 nowe pliki),
- § 27 self-review (verdict),
- gdzie znalazłeś 3× hardcoded DPR `×2` (do migration briefu, NIE ruszane teraz),
- czy „full" semantyka i kształt API hooka zgodne z § 64 (flaga jeśli rozjazd).

Czekaj na GO.

## STEP 6 — On GO: merge + docs + archive

1. `git checkout main && git merge --no-ff feat/canvas-step2-basecanvas && git push` (bez gh CLI / PR).
2. `npm run deploy` — **uwaga:** to no-op dla użytkownika (nowe pliki tree-shaken, nic ich nie importuje). Deployuj mimo to, by utrzymać invariant main==prod. Smoke Jacka ≈ zero (brak user-facing zmiany; sprawdza tylko że app wstaje + Sentry czysty).
3. `DEPLOY_LOG.md` — wpis (commit SHA, „Canvas Step 2 — BaseCanvas + useLandscapeMode, additive, zero consumer change", known: dormant until step #4).
4. `docs/DESIGN_DECISIONS.md` § 64.9 — oznacz Step 2 jako done (commit SHA). Dodaj krótki **§ 64.x note**: API `useLandscapeMode` + tabela offsetów per-site (kanoniczna referencja dla migracji step #4). To NIE nowa decyzja — to zapis wykonania zablokowanego planu.
5. `NEXT_TASKS.md` — `[DONE]` Step 2 + wskaż następny: step #4 FieldCanvas→InteractiveCanvas.
6. Archiwizuj W TYM SAMYM commicie co DEPLOY_LOG: `CC_BRIEF_CANVAS_STEP2_DISCOVERY.md` + `CC_BRIEF_CANVAS_STEP2_IMPL.md` → `docs/archive/cc-briefs/`.

---

## Out of scope (twardo — przypięte przed pisaniem)

- ❌ Migracja FieldCanvas → InteractiveCanvas (step #4).
- ❌ Migracja jakiegokolwiek konsumenta / FieldView.
- ❌ Usuwanie starych hardcoded `×2` DPR (przy migracji ich plików).
- ❌ Edge tabs (LABELS/LINES/DEATHS/TACTICS/DANGER/SAJGON) — page chrome, zostają.
- ❌ Landscape coach view feature (step #11).
- ❌ BallisticsPage / ballisticsEngine.js.
- ❌ Refactor `draw*` / `touchHandler.js` — tylko reuse.

---

## Executed 2026-05-23

**Branch:** `feat/canvas-step2-basecanvas` → merge `53df791` → main → `npm run deploy` (bundle hash unchanged: `index-i-JlR00N.js` 228.41 kB, gzip 68.59 kB — zero user-facing delta, additivity confirmed at byte level).

**Files created:**
- `src/hooks/useLandscapeMode.js` (61 LOC) — `{ isLandscape, canvasMaxHeight(L, P) }`, canonical offset table embedded as doc-comment.
- `src/components/canvas/BaseCanvas.jsx` (219 LOC) — 7 § 64.3 concerns + § 64.4 gesture composition.

**One Step-2 limitation documented in-file** (per brief's "idź za § 64.4 i zaznacz"): `createTouchHandler` is monolithic, so `pinchZoom`/`pan`/`loupe` props are **collectively gated** in this implementation (any true → attach; all false → don't). API shape per § 64.4 preserved — granular gating lands when `touchHandler` is refactored (out of Step 2 scope).

**3× hardcoded DPR sites localized (NOT touched):** `FieldCanvas.jsx:263`, `HeatmapCanvas.jsx:49`, `LayoutAnalyticsPage.jsx:416`. For each consumer's migration brief.

**Validation:** vite build ✓ 7.84 s; lint-ui 0 errors; main bundle hash bit-identical post-deploy.

**Next active:** § 64.9 step #4 (FieldCanvas → InteractiveCanvas extending BaseCanvas) — first real consumer migration.
