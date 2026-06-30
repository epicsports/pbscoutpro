# NIGHT_REPORT — design-sync (noc 2026-06-25/26)

**Metoda (root-cause fix):** zbudowałem jednorazowy harness `tests/e2e/_render-harness.spec.js` (NIE w suite, do usunięcia)
renderujący PROD @ 390 / **834 (tablet portret)** / 1280 → zrzuty w `data-export/render/`. Pierwszy raz WIDZĘ render tabletu —
to zdjęło przyczynę rozjazdu (wcześniej porównywałem KOD, nie RENDER). Od teraz DONE = zgodność zrzutu, nie „kod podobny".

---

## Kolejka z briefu — STATUS: 5/5 rdzeń gotowy + zmergowany

### 1. i18n — ✅ (rdzeń) — 2 leaki złapane RENDEREM + naprawione
- `scout_tab_*` PL = ANG („+ Add match"/„+ Add team"/…). → **`e73f94b4`** (PL→PL, EN bez zmian).
- **Coach tab** — hardcoded ANG (nigdy nie t()-wrapped → lint nie widział): „Teams/Matches/Standings (n)" (CoachTabContent) + „Tactics board/Choose a field/Untitled field" (OpenTacticsAction, brakowało useLanguage). → **`e0d556d6`**: +6 kluczy, render @834 potwierdza Drużyny/Mecze/Tablica taktyk.
- Leaki z Twoich zrzutów (`tab_more`/`settings_title`/`match_details`/`Save tactic`) — już PL (stary prod / i18n'd wcześniej).
- **Swept clean renderem (5):** Live · Scout · Coach (po fixie) · Gracz · **Layouty** (ANG tam = dane: nazwy treningów/layoutów, nie UI). Wzorzec: leaki były skupione (scout_tab + coach hardcoded), reszta ekranów renderuje czysto.
- ⚠ **Zostaje (opcjonalnie, harness gotowy):** training detail · player-stats · profile · settings — niska szansa na leak wg wzorca, ale warto domknąć render-first.

### 2. Menu „Wyświetlanie" — ✅ ZMERGOWANE (`ecf59b55`) — Q1=A
- Sekcja w szufladzie (między SESJA a ZARZĄDZAJ), **tylko super-admin**, 2 pill-toggle (Awatary / Ukryj nazwiska) spięte z **istniejącymi** `piiSettings` (zero przebudowy danych). Render-verified @390 (sekcja + toggle widoczne dla super-admina). Gate 116/116 (ukryte dla nie-super → brak regresji).

### 3. Scout (lista meczów) — ✅ HeroLive render-verified
- @834 HeroLive 1:1 z prototypem (pionowe drużyny + 44px wynik + „Scoutuj →" + „PODGLĄD MECZU"). MatchCard rebuild potwierdzony renderem.
- ⚠ **Zostaje:** testidy MatchCard (brak pokrycia strukturalnego) + render karty **Fixture** (fixtura ma tylko 1 mecz LIVE — trzeba turnieju z meczem `scheduled`).

### 4. Live scoring — ✅ render-verified 1:1
- @1280 landscape = `TabletLiveScoringPremium` 1:1 (372px sidebar: scoreboard + Warstwa + szczegółowe PointRows + KOMPLETNOŚĆ + Zakończ mecz | pole z tabami faz + dolny scrubber animacji). @834 portret czysty. i18n czysty. (zmergowane wcześniej; mój float-chip Stage-2b usunięty)

### 5. Edytor taktyk (Part B) — ✅ ZMERGOWANE (`7c56bf70`) — Q2=A
- **DATA-CRITICAL: save BYTE-IDENTICAL** (updateLayoutTactic/tacticStateToDoc/useCaptureDraft/handlery nietknięte — zweryfikowane). Chrome przebudowane na `TacticWorkspace` (lewy rail 348px: FAZA + „Jak rysować" + „Ustawienie" + Rysuj | poziome realne InteractiveCanvas + Zapisz taktykę; wariant read-only dla nie-coacha; telefon byte-identical). Zachowane **prod 5 realnych faz** + realne pole.
- Render @1280 zgodny; gate **116/116 incl. layout-tactic-freehand (save golden)**.
- **Render-first złapał + naprawił** klip „Mid-game" w railu (5 faz w 348px) → additive `wrap` prop na StageSwitcher (default false → MatchPage byte-identical).
- **Q2-B (literalny 4-narzędziowy selektor) ODŁOŻONE** — wymaga migracji schematu save (runner→segment, shot→{from,to}); osobny brief jeśli chcesz.

---

## Zmergowane na main tej nocy (auto-deploy, e2e-gated)
`e73f94b4` scout_tab i18n · `7c56bf70` tactic editor TacticWorkspace · `ecf59b55` drawer Wyświetlanie. (+ wcześniej: Live + match-list rebuild.)

## Smoke owed (Jacek)
- Tactic editor: otwórz taktykę → lewy rail + pole + Zapisz; rysowanie działa (klik gracza → menu bieg/strzał); zapisane taktyki całe.
- Drawer (jako super-admin): „Wyświetlanie" → przełącz avatary/nazwiska → foto/nazwy graczy zmieniają się globalnie.
- Minor §27: amber „Coach" badge w edytorze taktyk (do neutralnego, jeśli wolisz).

## Zostaje w kolejce (polish, render-first, autonomicznie)
1. Scout: testidy MatchCard + render Fixture (turniej ze scheduled).
2. i18n: render-sweep player/coach/training/layouts → fix genuine-untranslated.
3. Usunąć throwaway harness `_render-harness.spec.js` przed finalnym closeoutem.

## e2e / golden
Wszystko zielone (116/116). Harness throwaway poza suite. Tactic save pokryty goldenem (layout-tactic-freehand).

## Pytania
Brak otwartych — Q1 i Q2 rozstrzygnięte (patrz NIGHT_QUESTIONS.md). 4-tool selektor (Q2-B) = osobny brief jeśli chcesz literalnie.
