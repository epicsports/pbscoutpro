# BACKLOG.md — jedyne źródło prawdy (Reads / PbScoutPro)

> **Zasada nadrzędna:** to jest JEDYNY backlog. `_PROJECT_STATE.md`, `NEXT_TASKS.md`,
> `_CC_BRIEF_night_batch.md`, `_LANDSCAPE_BACKLOG.md`, `DEPLOY_LOG.md` → `/_archive/`,
> każdy z jedną linią `→ patrz BACKLOG.md`. Nikt nie tworzy drugiej tabeli stanu.
>
> **Własność kolumn (sztywna):**
> - `Design` — właściciel: **CD**. Intencja/prototyp gotowy.
> - `Build` — właściciel: **CC**. Stan z gita/deployu, nie z notatek.
> - `Verified` — właściciel: **CC**. Link do zrzutów @390/834/1280. Bez pary zrzutów = NIE 🟢.
> - `owner` — kto prowadzi: **CC** (kod/bug/dane/infra/refactor/perf) · **CD** (wygląd/ekran/UX/komponent) · **ARCH** (mgła/duże/pomysł/research/decyzja).

## Legenda statusów (wspólna)
- ⚪ backlog (nieruszone)
- 🔵 designed — CD skończył intencję/prototyp, czeka na build
- 🟠 in-build — CC pracuje
- 🟢 live+verified — na produkcji **i** zrzuty @390/834/1280 dołączone
- 🔴 blocked / potrzebne widełko od Jacka
- ❄️ PARKED — dotyka live scout-screena (field-cluster), zamrożone do po Birmingham (po 5.07.2026)

---

## 🚦 WLOT ZADAŃ + TRIAGE — CC jest jedyną sortownią (od 2026-06-30)
Każdy request (feature / bug / pomysł / poprawka) **najpierw** ląduje tu jako wiersz z `owner`, **potem** klasyfikacja:
- jasny **kod / bug / dane / infra / refactor / perf** → `owner=CC`, robię sam.
- wartość w **wyglądzie / nowym ekranie / UX / komponencie** → `owner=CD`; wiersz „design-needed" z Notes (komponenty z `APP_MAP.md` + data-contract + ścieżka do zrzutu w `/screenshots/`) → briefuję CD.
- **mgła / duże / pomysł / research / decyzja o priorytecie / wymaga rozbicia** → `owner=ARCH`; **nie zaczynam**, flaguję do architekta. (przykłady: nowy moduł, „mam pomysł", duża funkcja bez zakresu)
- waham się CC↔ARCH → **domyślnie ARCH**. Tanio zapytać, drogo zbudować źle.

### Pętla domknięta z obu stron (niezmiennik)
- **CD** wkłada każdy design do BACKLOG jako 🔵 **w momencie powstania** — nie gdy CC go wypatrzy.
- **CC nie shipuje ekranu na 🟢, jeśli nie przeszedł wcześniej przez 🔵 w BACKLOG.**
  **Brak wiersza designu = build się NIE zaczyna** — CC flaguje „⚠ design nie zarejestrowany"
  zamiast budować. Nic nie wjeżdża do kodu z pominięciem BACKLOG. (Audyt-w-drugą-stronę
  z 2026-06-30 = jednorazowe nadrobienie; ta reguła sprawia, że nie trzeba go powtarzać.)
- Niezmienniki: **field-cluster ❄️** — cokolwiek dotyka live scout-screena dopisuję, ustawiam `owner`, ale **parkuję do GO**. **Destrukcyjne** (rm/force-push/reset --hard) — dalej pytam. Moje kolumny: build/verified. Design jest CD.

---

## EPIC: field-cluster (klaster pola)
> ❄️ **ZAMROŻONE do po Birmingham (2–5.07.2026)** — decyzja Jacka 2026-06-30. Żywy ekran
> live-scout, używany NA evencie. Zero zmian w `MatchPage`/field-cluster do końca turnieju.

| Screen | Design | Build | owner | Notes |
|---|---|---|---|---|
| Match scout / Live Point Tracker | ⚪ | ⚪❄️ | CD | i18n mismatch „Rysuj" PL vs EN; MatchPage #4 wide re-skin CD-gated (≥720 sign-off) |
| Scout point landscape — „Rysuj" zasłania nazwy drużyn | 🔵 | 🟠❄️ | CD | Live-bug (Jacek 2026-07-01). Brief CD `briefs/scout-point-draw-button-fix.md` (proj. reads ⊖ Design System): górne rogi=chipy tożsamości L/R, narzędzia→prawy-dolny stack. **Interim SHIPPED `35b6a1bd`** (sam chip Rysuj `top:8→48`, GO'd freeze exception) — render-proof @1280 owed. **Pełny brief CD = szerszy reposition, NIE zbudowany** — czeka na decyzję: wyjątek GO przed Birmingham vs park. |
| Tactic page (rysowanie po layoutach) | ⚪ | ⚪❄️ | CD | redundancja „Gotowe/Save", i18n, loupe LEFT; tactic-creation redesign (oś faz + Warstwy) |
| Layout detail page | ⚪ | ⚪❄️ | CD | Lines+Zones panele → explicit fields; field-config + **obstacle UI „DUŻY BRAK"** + re-entry bug |
| N7 FieldWorkspace shell + mode-wizard | ⚪ | ⚪❄️ | ARCH | strukturalny refaktor (stan LayoutDetailPage → wspólny hook) |
| N8 Taktyka skompozytowana na canvasie | ⚪ | ⚪❄️ | ARCH | integracja taktyka↔layout = decyzja architektoniczna |
| N5 Callout-line render+draw · N6 Zone vertex editor | ⚪ | ⚪❄️ | CC | `editLines[]` zapisywane, nigdy rysowane; feasibility med→high |

## EPIC: team-consolidation (konsolidacja drużyn) — ✅ DONE
Reality-pass 2026-06-30: 90% było shipnięte, gate-fix `AdminTeamsPage`→super-admin domknął epik. Zero pozycji dla CD.

| Screen | Design | Build | Verified | Notes |
|---|---|---|---|---|
| Team screen VIEW/EDIT/CREATE (`/team/:id`, `/team/new`) | 🟢 | 🟢 | `/screenshots/team-detail-{390,834,1280}.png` | super-admin gate; 3-tier crest; CREATE folduje TeamFormModal |
| Super-admin list (`/admin/teams`) | 🟢 | 🟢 | `/screenshots/admin-teams-{390,834,1280}.png` | gate-fix `effectiveIsAdmin`→`useIsSuperAdmin` (§2) |
| TeamFormModal removal | n/d | 🟢 | — | plik nie istnieje, zero importów |

## EPIC: bugfix-red — ✅ DONE (ffacc468)
| Screen | Build | Notes |
|---|---|---|
| Tournament team picker · Add-to-tournament | 🟢 | child dziedziczy ligę+dywizję rodzica (`MatchListPremium.jsx`) |
| Profile-claim (Safari) | 🟢 | nie-obecny w bieżącym kodzie; owed: 1× Safari smoke live-bundla |

---

## 📋 PEŁNY BACKLOG FUNKCJONALNOŚCI — backfill 2026-06-30
Wciągnięte z `_archive/{NEXT_TASKS,DEPLOY_LOG,_LANDSCAPE_BACKLOG}.md` + `NIGHT_*.md` + `docs/{ops/HANDOVER,DESIGN_DECISIONS,product/*}.md` + grep TODO/FIXME w `src/`. Deduplikowane. Status build = ⚪ jeśli nie inaczej.

### owner=CC — buildable teraz (kod/bug/dane/infra/refactor/perf, zakres jasny)
> **Triage 2026-07-01 (reality-pass):** ✅ ZAMKNIĘTE (już zrobione/stale): CC-2 · CC-4 (i18n guard wpięty `precommit.js:51-62`) · CC-7 (`ScheduleList` współdzielony) · CC-20 (presence celowo brak) · CC-21 (chunk-limit/isFreePlay zrobione). · **READY do buildu (spec gotowy):** CC-5 (i18n PL: `ScheduleCSVImport` :219/:228/:237 + `MemberCard`:85) · CC-3 (rok z `selectedTournament.date` → `parseScheduleDateTime`). · **Większe/scoped:** CC-1 (wide e2e — projekt+spec) · CC-6 (audyt 24 stron) · CC-8 (per-stage, multi-page, high-risk) · CC-14 (testids). · **→ ARCH:** CC-16 (externalId dedup = Phase 2.3.c admin UI, brief Opusa). · **→ needs-decision:** CC-13 (guardy `/teams`,`/players`,`/my-issues` zmieniają politykę dostępu — którą bramką + kto ma widzieć).
| # | Item | bucket | Notes |
|---|---|---|---|
| CC-1 | Wide-shell e2e coverage = ZERO ⭐ | infra | Playwright wide-viewport project + un-gate; tablet bugi docierały do usera bez gate'a. Najwyższa wartość. |
| CC-2 | ~~`updatePlayer` catalogVersion bump~~ ✅ already-fixed | bug | reality-pass 2026-07-01: oba bumpują (`updatePlayer` dataService.js:302, `updateTeam`:562). Nie-bug, stale w miningu. |
| CC-3 | ✅ `divisionAliases` rok z daty turnieju | data | DONE: CSV import bierze rok z `tournament.date` → else `.year` → else current. merge fix/i18n-csv-strings-year |
| CC-4 | i18n precommit guard | infra | wepnij `find-missing-i18n.cjs` do precommit (zweryfikuj czy już nie wpięte) |
| CC-5 | ✅ i18n — resztki hardcoded-PL | bug | DONE: `ScheduleCSVImport` ×3 + `MemberCard` → t() (PL+EN, func-key `csv_missing_columns`). merge fix/i18n-csv-strings-year. (Uwaga: `PlayerStatsPage` CAUSE_META nie tknięte — sprawdzić osobno jeśli realne) |
| CC-6 | `NetworkErrorState` → wepnij w 5 paneli | refactor | komponent gotowy, 5 load-timeout EmptyStates do podmiany |
| CC-7 | ScheduleList grouping component | refactor | Live/Scheduled/Completed + stage; ScoutTab/CoachTab/wide (matchClassify gotowe) |
| CC-8 | Preloader true per-stage stepping | perf | heatmap/stats/ranking: fetch-done→compute-done zamiast 1 boolean |
| CC-9 | Shared `ReportTable` primitive | refactor | breakouts/shooting/PlayerStats grids copy-paste; extract |
| CC-10 | Data-integrity audit script (side-flip scan) | infra | skan historycznych punktów; mark `confidence:low` (zależy od CC-P1) |
| CC-11 | Country DATA back-fill (crest flags) | data | **blocked: potrzebne źródło team→country od Jacka**; forma ustawia forward-only |
| CC-12 | Stuck-user recovery (3 konta + biuro rola) | data | ops; **GO-gated** (--live stamp) |
| CC-13 | Route-level guards (`/teams`,`/players`,`/my-issues`) | infra | 12/15 guarded; rozszerz player-allowlist. Low. |
| CC-14 | `MatchCard` testids coverage | infra | brak pokrycia strukturalnego render-catch |
| CC-15 | kiosk `onTapPoint` → switch lobby ctx | code | `OlderPointsSection.jsx:51` Brief-B follow-up (kiosk, nie live-scout) |
| CC-16 | externalId duplicate admin-curation | data | `useFirestore.js:179` TODO (część player-dedup?) Low. |
| CC-17 | Reads Mini App Check (reCAPTCHA v3) | infra | `initializeAppCheck` brak; **separate GO** |
| CC-18 | `chore/design-sync-inputs` push | infra | branch lokalnie, nie na main; **czeka na GO** |
| CC-19 | Pixel-diff baselines -linux/-mac | infra | regen poza -win32 (Oswald shift); zweryfikuj czy gate dziś zielony |
| CC-20 | B20 cross-device same-UID presence | bug | passive-presence; low, edge-case |
| CC-21 | Low-prio code-residuals batch | refactor | vite chunk limit · isFreePlay hide · invite resend · PPT retry · hmVisibility persist · composite indexes |
| CC-22 | ✅ EU Pro team logos backfill | data | STAGE 1+2 DONE (branch `feat/eu-pro-team-logos`): 14 AVIF `public/team-logos/` + `logoUrl` względne wpisane `--live` na 13 kanonicznych docs (ext-preferred) + catalogVersion bump. **Czeka na merge GO** → deploy uwidoczni logo. **Open/escalate:** (a) not-in-DB: Paris Camp Carnage + Section Annecy (avif w zapasie, doca NIE tworzę); (b) **Cloudflare fix-list:** 23 istniejące `logoUrl` są ABSOLUTNE → migracja na względne przed cutoverem (osobny --live); (c) refresh-candidate: TonTon Arsenal (== Toulouse Tonton, już ma logo). Pipeline: `scripts/logos/*`, §107.3. |

### owner=CC — ❄️ PARKED (dotyka live scout / field-cluster — do GO po Birmingham)
| # | Item | bucket | Notes |
|---|---|---|---|
| CC-P1 | ✅ **Side-swap home/away korupcja — FIXED** (FEEDBACK PP2) | bug | Forensic 2026-07-01: strukturalnie naprawione. fieldSide (viewport) odsprzężone od homeData/awayData (stała mapa draftA→home/draftB→away); shared-signal leak `currentHomeSide` usunięty `f7a23ad6`. Commits 59ee02df·cba60fa1·17cd6e55·0ba285a7·f7a23ad6·13837e47 (kwi 2026). Reszt-ryzyko: zły `?scout=` link (user, nie korupcja). **Nie ruszać MatchPage.** |
| CC-P2 | ✅ **Concurrent dual-coach sync — FIXED** (FEEDBACK PP1) | bug | Lock (match-claim Brief F) wycofany `3caf9c3c`; każdy punkt = własny `addDoc` (zero array-clobber); per-coach streams + `onSnapshot`; same-UID overwrite hotfix `2f696f58` (NXL Czechy 2026-05-15). Merge per-side w `endMatchAndMerge`. Uwaga (nie bug): coachе widzą swoje punkty live dopiero po End-match (chyba że ten sam login) — confirm z teamem. |
| CC-P3 | Point immutability (freeze side po save) | refactor | prewencja re-korupcji po CC-P1 |
| CC-P4 | Hardcoded canvas labels i18n (`drawZones.js` DISCO/ZEEKER…) | bug | stringi na żywym polu |
| CC-P5 | B8 Strzela% denominator (data-trust) | bug | parked w data-validation workstream |
| CC-P6 | Loupe pan-lag perf | perf | `loupeSourceRef` nigdy nie wypełniony; offscreen/throttle |
| CC-P7 | `scoutShortName` dead-code cleanup (MatchPage) | refactor | martwy po collapsed-line redesign |
| CC-P8 | Portrait expand/FS button na live-scout — ukryć w portrait | bug ❄️🔴 | **Już usunięty z MatchPage + zdeployowany (`a5c3f7b6`)** — jeśli Jacek widzi go na „Scouting…/SCOUT\|RYWAL", to najpewniej **stale PWA cache** (update appki). `FullscreenToggle` (Maximize2, dark rounded, top-right) żyje jeszcze tylko na `LayoutDetailPage:540` + `TacticPage:447` (frozen), gdzie `if(isLandscape)return null` = pokazuje się w PORTRAIT **celowo** (landscape sam immersuje). Prośba „tylko landscape" = odwrotność logiki komponentu. **Potrzebny zrzut + GO** (frozen). |

### owner=CD — design-needed (briefuję CD: APP_MAP komponenty + data-contract + zrzut)
| # | Item | bucket | Notes |
|---|---|---|---|
| CD-1 | forms-wide (NewPlayerWide/NewTeamWide) | screen | **blocked: brak eksportu `redesign7.jsx` od CD** |
| CD-2 | Opponent/coach-summary full re-skin | screen | `ScoutedTeamPage` body + `OpponentAnalysisWide` (tylko chrome shipnięte) |
| CD-3 | Crest Krok 2 — coach team-detail | screen | heatmap+timeline+deeper-CTA (rozbiegi table już jest). heatmap-extract = ❄️ patrz CD-P2 |
| CD-4 | MyProfile/TeamProfile full 2-col wide | screen | v1 shipnięte; pełny sticky 2-col additive |
| CD-5 | Viewer layout (read-only field viewer) | screen | premium + landscape; dziś 4 ikony + static bg |
| CD-6 | LayoutsList landscape + filtry | screen | full-width siatka + league chipsy + search |
| CD-7 | Scout (landscape) filtry + i18n | screen | division chipsy + search; i18n bug (section_matches/match_details) |
| CD-8 | B4 role-aware home + CTA | screen | empty-states funkcjonalne; „get started" home potrzebuje mockupu |
| CD-9 | Hitability density UX (tap-connection-line @N>5) | screen | własny brief |
| CD-10 | „Domowy" home badge | screen | mały; komponent czyta `defaultWorkspace` |
| CD-11 | Pixel-avatar builder | screen | **blocked: brak eksportu `avatars.jsx` (510 linii) od CD** |
| CD-12 | Custom zones builder | screen | spec `docs/product/CUSTOM_ZONES_SPEC.md` istnieje, zero kodu builderа |

### owner=CD — ❄️ PARKED (live scout / field-cluster)
| # | Item | bucket | Notes |
|---|---|---|---|
| CD-P1 | MatchPage #4 wide re-skin | screen | CD-gated (≥720 sign-off + Jacek green-light) |
| CD-P2 | ScoutWide points-heatmap overlay | screen | wymaga extractu `matchHeatmapPoints()` z MatchPage |
| CD-P3 | Folded-rail opponent controls | screen | nakłada się z ScoutedTeamPage landscape |

### owner=ARCH — flaguję do architekta, NIE startuję (mgła/duże/research/decyzja)
| # | Item | bucket | Notes |
|---|---|---|---|
| A-1 | Brief G — schema unification | data/refactor | retire members[]/adminUid/passwordHash, slug-normalize; Admin SDK + multi-checkpoint |
| A-2 | Phase 0 schema discovery (workspaces a/b/c) | research | decyzja blokuje Phase 1 |
| A-3 | Phase 1 schema work | refactor | blocked na A-2 |
| A-4 | G2 cross-tenant catalog isolation | data | players/teams/layouts read = any-authed (interim); cutover przed FIT |
| A-5 | Cross-workspace player identity bridge | data | pbliId-keyed overlay doc; Phase 3.1+ |
| A-6 | Tournament refs reconciliation MVP | refactor | collectionGroup deferred / Phase 2.3.d |
| A-7 | Phase γ reconciliation strategy lock | decyzja | trust-one-source vs manual super-admin escape |
| A-8 | defaultWorkspace self-update rule | rules | tenant-rules = in-brief CONFIRM; not load-bearing |
| A-9 | i18next migration (Phase 9) | refactor | lib + ~150-200 sites; duże |
| A-10 | freehand-as-string architecture | refactor | mapa vs string-pack; dotyka un-e2e concurrent-merge |
| A-11 | arc-B phase-2 untangle-then-wrap | refactor | WorkspacesAdmin/LayoutAnalytics/TrainingSetup/LayoutWizard + AnalyticsCanvas extract |
| A-12 | TournamentFormModal merge (dup-audit) | refactor | New vs Edit ~80% identyczne; rewires create/update; GO |
| A-13 | player-dedup Items 2-3 | data | reconcile queue + super-admin surface; --live = Hard-ESCALATE |
| A-14 | kiosk join-by-code (Arc E) | code | flow nie istnieje; potrzebny brief |
| A-15 | Trafialność / accuracy (=N9) | research | position→target pairs; nowa kolekcja + coach-draw + RBAC |
| A-16 | Point-as-Timeline Stage 4/5/7 | research | typed move-vocab → time-axis → self-log+kiosk unification; PARKED na vocab Jacka |
| A-17 | READS_SPLASH full cold-start brief | idea | login splash żyje; pełny brief nie zbudowany; GO |
| A-18 | Layout editor IA redesign | decyzja | parked na dyskusję IA z Jackiem (memory `project_layout_config_ux_review`) |
| A-19 | events-list redesign | decyzja | Jacek „przebudować docelowo"; dual-badge OK na teraz |
| A-20 | G3 per-role nav surface | decyzja | co widzi scout/coach/player; dziś „admin sees all" |
| A-21 | G1 ranger1996 empty roles | decyzja | 1 user bez ról — nadać czy usunąć z members[]? |
| A-22 | Coach/staff profile linking | screen | dziś tylko player-linking; brak coach/staff encji |
| A-23 | Hitability fullscreen view-only — confirm | decyzja | potwierdzić intencję (log na normalnej stronie, nie fullscreen) |
| A-24 | N10 Logo drag-drop upload (team) | code | łamie §93 URL-only; brak write-path; backend+produkt GO |
| A-25 | Breakout lane-level run | data | „lane→bunker" nie-derivable z capture (records break-TO); ❄️ |
| A-26 | 4-tool canvas selector (player/runner/shot/draw) | code | needs save-schema migration; ❄️ live-scout |
| A-27 | Ballistics→InteractiveCanvas migration | refactor | delete FieldCanvas.jsx; „Opus territory"; ❄️ live-canvas |
| A-28 | Rozbieg verification mismatch (PP4) | research | root-cause nieznany (side-swap vs human); ❄️ |
| A-29 | Dev Snapshot v1+ (PII anonymization) | research | low |
| A-30 | VISION post-NXL: user accounts / email-auth | feature | roadmap |
| A-31 | VISION: Video CV PoC | research | (CV MVP już osobno wystartowany) |
| A-32 | VISION: Claude PR-reviewer agent · Scout ranking+rewards | idea | nice-to-have; rewards blocked na accounts |

---

## ✅ ZRECONCILOWANE z gitem (2026-06-30) — 🟢 na prodzie, NIE budować
Scout point (rail · flip-card · oś faz · roster V3 · markery team-color · VS intro · laptop→landscape · glass-pille) · Team management (`TeamDetailPage`) · Listy/dashboardy (Today's points · training · profile · scout ranking · kiosk · CSV · workspace switcher · coach list · player stats wide · app shell · layout library) · `AvatarBuilder` · ROZBIEGI→jedna tabela · `ReportTable` · `ScheduleList` · EU flagi.
**DROP/CONFLICT (nie budować):** point-logging 5-step wizard ↔ kiosk · team-row warianty A–F · pole „age" (FICTION) · shot `kind` (FICTION) · `useTx()` scaffolding · roster on/off (CONFLICT `assignments[i]` vs `onField[i]` — PINNĄĆ przed scout-point-resztkami).

## CD handoff (Jacek poza pętlą — od 2026-06-30)
CC zasila CD: ⚪ ekran w aktywnym epiku → CC wypełnia `Notes` (APP_MAP komponenty + data-contract + zrzut `/screenshots/`). CD → 🔵. CC: 🔵 → build → render-proof @390/834/1280 → 🟢. **Bez 🔵 build się nie zaczyna** (patrz wlot/triage wyżej). Trzymamy się aktywnego epiku; NIE briefujemy field-cluster ❄️. Cały epik 🟢 → „done, <next> czeka na GO". 🔴 → Jacek.

## Stan epików
**bugfix-red** ✅ · **team-consolidation** ✅ · **field-cluster** ❄️ (do po Birmingham). **Brak aktywnego epiku** — czeka na GO Jacka po evencie. Backfill 2026-06-30 wciągnął całą resztę funkcjonalności (powyżej) z owner=CC/CD/ARCH.
