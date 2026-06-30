# CC — BRIEF NOCNY (batch: wszystkie niewdrożone ekrany)

> Tryb autonomiczny. Pracuj wg kolejności niżej, każdy ekran = osobny commit + e2e + samo-review (§27). **Nie merguj do `main` ekranu, którego nie wyrenderowałeś wizualnie i który nie ma zielonego e2e.** Zapisuj postęp w `DEPLOY_LOG.md` i odznaczaj w `_PROJECT_STATE.md`.

---

## 0. NAJPIERW: reconciliation (nie przebudowuj tego, co żyje)
Mieliśmy rozjazd prototyp ↔ produkcja. Zanim cokolwiek zbudujesz:
1. Otwórz `_PROJECT_STATE.md` (ledger — źródło prawdy „co już shipped") + `_LANDSCAPE_BACKLOG.md` (szczegóły per ekran).
2. Dla każdej pozycji z worklisty niżej **sprawdź realny stan w kodzie produkcyjnym** (grep komponentu, route, ELEV/RdIcon adoption — tak jak w audycie §matchpage). Jeśli ekran JEST już zgodny z prototypem → oznacz `🟢 SHIPPED` w ledgerze i pomiń. Jeśli rozjechany → to jest praca.
3. **Porównuj STRUKTURĘ i RENDER, nie tylko diff kodu** — to był nasz błąd. Renderuj na realnych szerokościach (telefon 390 / tablet 834 / desktop 1280), nie ufaj audytowi „po nazwach".
4. Raportuj na końcu: tabela `ekran → był / jest / co zrobiłeś`.

**Źródło prawdy dla designu = `prototype/`** (NIE zrzuty z prod, które wycofujemy). Kluczowe pliki: `app.jsx` (routing + `responsiveWide` allowlist + `isMobile` dispatch), `redesign.jsx` / `redesign2-11.jsx`, `teammanage.jsx`, `fieldfull.jsx`, `fielddata.jsx`, `theme.jsx`, `data2-5.jsx`.

---

## 1. NOWE w tej sesji (najświeższe — najmniej udokumentowane, zrób najpierw po reconciliation)

### 1a. Team management — KONSOLIDACJA (najwyższy priorytet)
- **Co:** scalić 5 powierzchni w JEDEN ekran — stary `TeamProfile*` + `RosterManage*` + `TeamFormModal` → jeden route `/team/:id`, role-adaptive, ten sam ekran obsługuje **create** (zastępuje modal) i **edit**.
- **Prototyp:** `TEAMMANAGE.TeamManage` (`prototype/teammanage.jsx`), route `rd-teamprofile` (alias `rd-teammanage`), w `responsiveWide`. Responsywny: telefon 1-kol ↔ tablet/desktop 2-kol (sticky identity 360px + settings 1fr).
- **Zawiera:** crest hero + upload logo (drag-drop/URL → podmienia crest wszędzie) + kolor; nazwa/kraj+flaga/PBLeagues ID/extId; ligi+dywizje; drużyny powiązane (parent/children); **roster = karty graczy pogrupowane Sztab trenerski / Zawodnicy / Pit-crew** z HERO toggle + pixel-avatarami; audyt (zwijalny, read-only); strefa retire/delete.
- **GATE = `isSuperAdmin`** (super_admin / e-mail właściciela), **NIE `effectiveIsAdmin`** (to workspace-admin). To **bugfix bezpieczeństwa do weryfikacji e2e**, nie założenie: dziś `/team/:id` puszcza UI edycji, serwer cicho odrzuca zapis → cicha porażka. Reszta ról = read-only.
- **Usuń `TeamFormModal`.** `/teams` (user list) zostaje bez zmian tę turę.
- **Brief szczegółowy:** `BRIEF - Drużyny Coach redesign.md` + (jeśli zacommitowany) `docs/briefs/TEAM_CONSOLIDATION_BRIEF.md`. **Baseline = gałąź `feat/team-edit-unification`** (redesign bazuje na niej, nie cofa).

### 1b. Selektor dywizji na liście drużyn coacha
- **Co:** segmentowany przełącznik `Wszystkie · PRO3v3 · SEMI-PRO · D3` u góry listy coacha — identyczny jak u scouta.
- **Prototyp:** `rd-coach`, wszystkie 3 warianty: `CoachTeamListPremium` (telefon), `CoachWide`, `CoachTeamListWide`.
- **Uwaga danych:** drużyny NIE mają pola dywizji — dywizję wyznaczasz per drużyna z rozpiski meczów turnieju (`m.div`). Filtr zawęża listę + aktualizuje licznik. Wzorzec 1:1 jak scout `DivTabs`.

### 1c. Fullscreen + oś faz na ekranach z polem
- **Co:** przycisk maksymalizacji na każdym ekranie z layoutem; po wciśnięciu pole wypełnia ekran, reszta znika, dostępne: overlay danych + paleta rysowania + **kontekstowa oś faz zadokowana na DOLE layoutu**.
- **Prototyp:** `fieldfull.jsx` → `FIELDFULL_UI.FieldFullscreen`, prop `phases` (+ `axisLabel`, `onPhase`). Wpięte na: Analiza przeciwnika (telefon+wide), Centrum analizy pola (gracz), kafelek Live.
- **Reguła kontekstowa:** oś (`FFAxis`: play/scrub/keyframe'y faz) renderuje się TYLKO gdy ekran ma dane punktu/fazy (Analiza, Live). Na ekranach bez faz (Field-center, kalibracja) oś jest ukryta — żeby nie był pusty pasek.
- **Nie dubluj** edytora taktyk (`FieldWorkspace`) — ma własny tryb pełnego pola.
- **Do podpięcia:** `onPhase` — żeby overlay pola faktycznie przełączał zawartość per faza, jeśli istnieją overlaye per-faza.

---

## 2. WORKLISTA — pozostałe ekrany 🟡 (kolejność = locked risk order)

Pełny spec każdego z nich jest w `_PROJECT_STATE.md` (kolumna „Next") + `_LANDSCAPE_BACKLOG.md`. Route + komponent + plik podane tam. Kolejność wg ustalonej zasady: fundament → shell → proste liście → pole/analiza na końcu.

**A. Fundament (jeśli reconciliation pokaże braki):** ELEV / `Crest` / `RdIcon` propagacja.

**B. App shell (GATED — patrz §3):** `AppShellPremium` (telefon) + `AppShellPremiumWide` (tablet/desktop sidebar + master-detail). Dwie powłoki wg `isMobile`.

**C. Proste liście / dashboardy (równolegle bezpieczne):**
- Today's points — `REDESIGN2.TodayPointsPremium` + `REDESIGN6.TodayPointsWide` (wide landscape HERO)
- Select training — `REDESIGN2.SelectTrainingPremium` + `REDESIGN6.SelectTrainingWide`
- My profile — `REDESIGN5.MyProfilePremium` + `REDESIGN6.MyProfileWide`
- Scout ranking — `REDESIGN4.ScoutRankingPremium` (master-detail wide)
- Point-logging wizard — `REDESIGN2.PointWizardPremium` + `REDESIGN6.PointWizardWide` (ma e2e net — użyj go)
- New-player / new-team — `REDESIGN7.NewPlayerWizard` / `NewTeamWizard` (wizard; required-gate: gracz = imię+nazwisko+drużyna, drużyna = nazwa+liga). **Popraw: strzałki na przyciskach „Dalej/Wstecz" są w złą stronę.**
- CSV import — `REDESIGN9.CsvImportPremium` + `CsvImportWide`
- Workspace switcher — `REDESIGN9.WorkspaceSwitcherPremium`
- Coach team list (wide) — `REDESIGN.CoachTeamListWide` (+ selektor dywizji z §1b)
- Player stats (wide) — `REDESIGN.PlayerStatsWide` (uwaga: §116 field-hero retired tylko dla tego ekranu — Option A z m1183)

**D. Avatary (jeśli rozszerzona wersja nie jest jeszcze wdrożona):** `AVATARS.PixelAvatar` (silnik) + `AVATARS.AvatarBuilder` (kreator). Pełny spec rozszerzenia (osie płeć/wiek/twarz/włosy 28/zarost/akcesoria/bluzy 18/tła 20+hue) jest w ledgerze + `_HANDOFF_CC_avatars/`. Privacy: toggle foto↔avatar + ukrywanie nazwisk.

**E. Pole + analiza (NA KOŃCU — najcięższe, dane-krytyczne):**
- **Field block = JEDEN `FIELD3.FieldWorkspace`** (`redesign10/11.jsx` + `fielddata.jsx`): tryby w lewym icon-railu — Podgląd(#10) / Przeszkody(#7, admin) / Linie(#11, admin) / Strefy(#11, admin) / Taktyka(#12, coach) / **Kalibracja baz A/B (super-admin)**. Routes `rd-field*` + `responsiveWide`. To retiruje stary `REDESIGN8` calibration + osobne ekrany. RBAC: prop `isAdmin` gate'uje 3 tryby admina; super-admin gate'uje kalibrację.
- **Kolejność uprawnień (potwierdzona m1158):** konfigurację pola (bazy, typy/pozycje przeszkód, labelki) robi **super-admin**; nazwy/strefy/linie robi **admin**; rysowanie taktyki robi **coach**; przeglądanie taktyk robi coach+gracz. Rysowanie taktyk = kompletnie osobny flow od konfiguracji pola.
- Layout editor / library — `REDESIGN8.*` + `REDESIGN8.LayoutsListWide` (landscape grid + filtry ligi + search).
- Opponent analysis + Live scoring — token/chrome już bezpieczne; pełny rebuild layout/data-viz tylko jeśli reconciliation pokaże rozjazd.

---

## 3. Bramki i zasady (locked)
- **Shell GATED na 5 archetypach responsywnych** — nie buduj produkcyjnego wide-shella, dopóki każdy ekran, który hostuje, nie ma zablokowanego wariantu tablet/desktop. Archetypy: master-detail / card-grid / dashboard / field+rail / wizard-modal (opis w `_PROJECT_STATE.md`).
- **One-screen principle:** gdzie MOŻE być jeden ekran, JEST jeden ekran (mode-switching wewnątrz, nie osobne route). Kanon: `MatchPage` = live/review/scouting. Field = jeden `FieldWorkspace`. Team = jeden `TeamManage`.
- **Responsywność:** `useWide(threshold)` (ResizeObserver) → multi-col ≥ próg. Route `rd-*` renderują full-bleed przez `responsiveWide` allowlist w `app.jsx` — **odtwórz to w produkcji**.

## 4. Edge-case law (na KAŻDYM ekranie)
- Brak zdjęcia → inicjały (nigdy pusty szary krążek). Pixel-avatar gdy włączony.
- Długie nazwisko → 2 linie (lh ~1.05) potem elipsa, **nigdy** zmniejszanie fontu.
- Brak nicku → eyebrow znika całkowicie. Brak numeru → ukryj odznakę (nigdy `#?`).
- Gauge/„TOP": „TOP" = ranking po wolumenie (neutralny/akcent); kolor ringu = wartość (survival 0%→czerwony). 0% nigdy zielony; drop „TOP" przy n=1 lub 0%.
- **Amber dyscyplina:** amber = tylko interaktywne/aktywne/live. Eyebrow sekcji = neutralne. Wyjątek: data-viz performance coloring (rzadko, intencjonalnie).

## 5. i18n
- Produkcja = źródło prawdy tłumaczeń (`t('key')` + dict per język, fallback `dict[lang]→en→key`, PL ma 3 formy liczby mnogiej). Prototyp = PL-only, **nie migruj** premium-warstwy. Dodanie języka = dodanie słownika. To Twoja robota, nie prototypu.

## 6. Workflow per ekran (tryb nocny)
1. Gałąź per ekran (lub logiczna grupa). 2. Build + precommit zielone. 3. e2e: pełny suite gdy ekran dotyka `*-rail` spec (field-hero); inaczej relevant subset + CI gate. 4. **Wyrenderuj wizualnie** na 3 szerokościach. 5. §27 self-review (color discipline / elevation / typography / edge-case). 6. Diff: 0 deletions ścieżek danych (zapisy/walidacja/nav) — restyle only. 7. **Zostaw do mojego smoke przed merge do main** — raportuj diff + flagi. 8. Odznacz w `_PROJECT_STATE.md` + `DEPLOY_LOG.md`.

## 7. Raport końcowy
- Tabela reconciliation (ekran → był/jest/zrobione).
- Lista zmergowanych commitów + co czeka na mój smoke.
- Otwarte decyzje/blokery (np. brakujące dane do avatara, `onPhase` overlaye per-faza).
