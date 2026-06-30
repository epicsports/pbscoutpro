# NIGHT_QUESTIONS — sync nocny (2026-06-26)

Pytania/konflikty napotkane w nocy. Per reguła briefu: nie wymyślam, zostawiam działające, jadę dalej.

## ✅ ROZSTRZYGNIĘTE (Jacek odpowiedział w nocy)
- **Q1 = A (z poprawką):** super-admin steruje, **bez** podziału per-workspace. → ZAIMPLEMENTOWANE: sekcja „Wyświetlanie" w szufladzie, widoczna tylko dla super-admina, reużycie istniejących `piiSettings` (avatarMode/surnameMode), zero przebudowy danych. Branch `feat/menu-display-toggles`, gate w toku → merge po zielonym.
- **Q2 = A:** redesign TYLKO wizualny, zachowujemy istniejący data model + funkcje (klik gracza → menu bieg/strzał/bump + rysowanie notatek). → ZMERGOWANE (Part B, `7c56bf70`; save byte-identical, gate 116/116, render @1280 zgodny). **Q2-B (literalny 4-narzędziowy selektor) NIE robiony** — wymaga migracji schematu save, data-critical; osobny brief jeśli chcesz.

---

## Q1 — Menu „Wyświetlanie": scope prefów = USER czy WORKSPACE? (KONFLIKT decyzji)
**Brief nocny** (§3, od Maćka): dodać w szufladzie `NavDrawerPremium` sekcję „Wyświetlanie" z 2 przełącznikami
**„widocznymi dla KAŻDEJ roli"**, persistencja **„jak ustawień UŻYTKOWNIKA"**:
- „Awatary zamiast zdjęć" (domyślnie ON)
- „Ukryj nazwiska graczy" (domyślnie OFF)
Prototyp (`redesign.jsx:1824-1827`) trzyma je w lokalnym stanie per-user.

**Ale wcześniejsza decyzja Jacka** (Privacy Faza 1/2, ten sam wieczór): prefy są **per-WORKSPACE, ustawiane TYLKO przez super-admina**
(`workspaces/{slug}.piiSettings.avatarMode|surnameMode`, czytane przez PlayerAvatar/displayPlayerName). Cytat decyzji Jacka:
„1. Super admin ale może ustawiać per workspace".

**Konflikt:** prototyp/brief = per-user, każda rola ↔ shipowane = per-workspace, super-admin. To dwie różne architektury danych
(user doc vs workspace doc) i dwa różne RBAC. Reguła „prototyp wygrywa" implikuje przepisanie na per-user — ale to cofnęłoby
świadomą decyzję Jacka z tego samego wieczora + zmieniłoby gdzie czytają wszystkie miejsca renderujące zdjęcie/nazwisko.

**Czego potrzebuję (1 decyzja):** który scope?
- (A) **per-user** (jak brief/prototyp) — przebuduję prefy avatarMode/surnameMode z workspace→user, drawer dla każdej roli.
- (B) **per-workspace** (jak shipowane) — drawer pokazuje przełączniki tylko super-adminowi (lub read-only dla reszty), spięte z piiSettings.
- (C) **oba** — workspace = domyślne, user = override (najwięcej pracy).

**Status:** NIE ruszam menu do czasu decyzji (żeby nie cofnąć Twojej decyzji ani nie zbudować złej architektury). Reszta kolejki leci.

---

## Q2 — TacticWorkspace: prototypowe „4 narzędzia" (gracz/bieg/strzał/rysuj) NIE mapują na model prod (DATA-CRITICAL, save zostawiony nietknięty)

**Brief (Part B):** przebudować `TacticEditorPage.jsx` na wygląd prototypu `TacticWorkspace` — lewy rail = selektor faz + **przyciski narzędzi** (player/runner/shot/draw, ikona+label, active=accent) zmapowane na ISTNIEJĄCE tryby/handlery prod. Twarda zasada: jeśli narzędzia prototypu NIE mapują czysto na model prod → STOP, nie wymyślaj nowego kształtu save, zapisz tu jako Q2, zostaw save nietknięty.

**Mismatch (dlaczego nie mapują):** prototyp i prod mają DWIE różne gramatyki przechwytywania:

- **Prototyp** (`redesign12.jsx`): 4 wzajemnie wykluczające się *narzędzia płótna*. `player` → tap stawia gracza; `runner`/`shot` → tap start, tap koniec → **segment `{from, to}`**; `draw` → freehand. Bufory faz: `tactic.phases[phase] = { players:[], runners:[{from,to}], shots:[{from,to}] }`.
- **Prod** (`useCaptureDraft` + `InteractiveCanvas`): płótno NIE ma trybu „narzędzia". Stawianie gracza jest ZAWSZE aktywne (tap pustego pola → następny gracz). **Runner = boolean per-gracz** (`runners[idx]=true/false`), przełączany w pływającym pasku per-gracz (tap gracza → toolbar → „Runner"), NIE rysowany segment. **Shot = per-gracz** tablica punktów (`shots[idx][] : point[]`) via QuickShotPanel (strefy) lub ShotDrawer (precyzyjny), NIE segment `{from,to}`. Tylko **draw (freehand)** to realny tryb (`drawMode` → DrawToolbar). Zapis: `tacticStateToDoc(phases, anns)` → `updateLayoutTactic` (schemaVersion:2, per-faza `{players, assign, bumps, runners, shots, quickShots, zoneShots, annotations}`, serializowane wspólnymi helperami punktu).

Zbudowanie prototypowego selektora 4 narzędzi wymagałoby: (a) runnera jako segmentu zamiast boola, (b) strzału jako `{from,to}` zamiast `shots[idx][]` punktów — czyli **zmiany kształtu save** = korupcja zapisanych taktyk. To dokładnie to, czego brief zabrania.

**Co zrobiłem zamiast tego (bez wymyślania):** zostawiłem płótno prod + jego prawdziwy model interakcji VERBATIM (always-on place-player + pływający pasek per-gracz dla runner/shot/bump + freehand `drawMode`). Przerobiłem TYLKO chrome na język `TacticWorkspace`: lewy rail (selektor faz na PRAWDZIWYCH fazach prod via StageSwitcher + karta „Jak rysować" + karta statusu „Ustawienie" placed/runners/shots + toggle Freehand), poziome pole (prawdziwe InteractiveCanvas), wariant read-only (coach edytuje; non-coach/zawodnik podgląd — płótno nie-edytowalne, bez narzędzi/save). Phone <720 = istniejący stacked layout byte-identical. **Save + wszystkie handlery przechwytywania NIETKNIĘTE.**

**Czego potrzebuję (1 decyzja):** czy akceptujesz mapowanie „runner/shot = akcje per-gracz w pływającym pasku" (model prod, save bezpieczny) zamiast 4 osobnych narzędzi płótna z prototypu? Jeśli chcesz literalnie 4-narzędziowy selektor jak w prototypie, to wymaga osobnego briefu na MIGRACJĘ schematu save (runner→segment, shot→{from,to}) — to nie jest restyling chrome i nie zrobię tego autonomicznie (data-critical).

**Status:** chrome przebudowane wg modelu prod, save nietknięty, build/precommit/e2e zielone (golden freehand + tactics-board). Czekam na decyzję ws. literalnego 4-narzędziowego selektora.

---
## Crest package (Design System 5) — night of 2026-06-26 · status + 2 decisions

**Done + verified on branch `feat/crest-bands` (NOT merged — Tier-2, awaiting GO):**
- 3-tier `Crest`/`TeamBadge`: logo → **country flag** (13 premium inline-SVG flags) → color+initials. Flags render-verified (premium crests).
- `CrestBand` (logo/flag/initials band) in coach catalog rows + hidden rows + team-detail header.
- `country` field added to TeamFormModal + dataService (additive).
- **CRASH CAUGHT BY RENDER-VERIFY (gate missed it):** agent used `<CrestBand>` in ScoutedTeamPage without importing it → whole team-detail page crashed. Fixed (commit 63b69289). Gate was green *despite* the crash — the scoutedteam specs don't exercise that render path.

**DECISION 1 — premium-row fidelity.** Render-verify shows prod's catalog/header are cleaner-but-more-conservative than the prototype: prod uses plain 15px names + compact rows; the prototype uses an **Oswald condensed city/nick wordmark + tall (114px) band rows**. Closing it means: add the Oswald web font + FONT_COND token + port rdShade/splitTeamName + restructure the rows. Caveat I can't resolve alone: I can't fully render-verify "as nice as the prototype" because the **test fixtures have no logos** (the prototype's punch is the logo band) — real NXL teams DO have logos, so it'd shine in your real use, but I can only verify with a CSS mock, not the live catalog. → Want me to do the full premium-row upgrade, or keep the cleaner conservative rows?

**DECISION 2 — country back-fill (the flag fallback's data).** The flag only shows for logo-less teams with `country`. The form lets you set it going forward. A bulk back-fill of existing teams needs your GO + a source: the 16 prototype-mapped teams are mostly US (+FR/RU/TH) but they all HAVE logos (so flag is just their fallback); the logo-less teams have no known country. → Do you want a back-fill, and from what source?

### UPDATE (later same night) — DECISION 1 RESOLVED + new GO items
Re-read your directive as "execute the given prototype" (not a new design choice), so I DID the premium upgrade (agent 23fb7a5f) and **render-verified it**:
- Catalog row: tall band row + **"TEAM" eyebrow over the "ALPHA" Oswald condensed wordmark** + band — matches prototype 808-824. ✓
- Team-detail header: big band + "TEAM ALPHA" Oswald 28px wordmark. ✓
- (Band shows a faint initials watermark on the bare test fixture; a real NXL logo fills it.)

**NEW GO ITEM A — pixel baselines.** The redesign + the global Oswald webfont fail **27 `toHaveScreenshot` baselines** (team/teams screens = intended; other screens = sub-pixel font-load shift). ZERO functional failures. This BLOCKS the e2e deploy gate until baselines are regenerated. Regen = accepting the new visuals as truth → you should eyeball the redesign first. I will NOT regenerate autonomously (it'd bake in visuals you haven't approved + could mask a side-effect).
**NEW GO ITEM B — merge + deploy** `feat/crest-bands` (Tier-2 redesign) on your GO, after baselines.
