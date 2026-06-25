# NIGHT_QUESTIONS — sync nocny (2026-06-26)

Pytania/konflikty napotkane w nocy. Per reguła briefu: nie wymyślam, zostawiam działające, jadę dalej.

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
