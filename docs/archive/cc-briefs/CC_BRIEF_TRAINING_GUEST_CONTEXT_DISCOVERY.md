# CC_BRIEF_TRAINING_GUEST_CONTEXT_DISCOVERY.md

**Typ:** discovery / decision — **READ-ONLY**. Zero fixów, zero commitów, zero deploy. Output = strukturalna diagnoza + rekomendacja scope.
**PRE-FLIGHT:** To ten sam root co debug PPT-pickera z dzisiejszej sesji (08d096f9): app filtruje/resolve'uje po **drużynie gracza (teamId / Ranger)** tam, gdzie powinien po **kontekście treningu / attendees**. Wtedy objaw był na PPT pickerze (player nie widzi treningu innej drużyny). Teraz na **coach summary** (goście treningu lecą jako „unassigned"). Nie zakładaj że picker-debug już ma fixa — STEP 1 to sprawdza. Default: **IT ALREADY EXISTS** — potwierdź/zaprzecz z repo. Napisz „PRE-FLIGHT done".
**Źródło prawdy:** `git main` + repo. `/mnt/project/` stale.

## Trzy wymiary (rozróżnij w całej diagnozie — NIE myl)

1. **player↔team** — `player.teamId` / `parentTeamId` (Ranger + child teams).
2. **workspace membership / guest** — `members[]` / role. Ortogonalne do (1).
3. **training attendees** — `training.attendees[]` + `squads{}`.

Target model (mierz diagnozę względem tego): **trening = jednostka kontekstu.** Ktokolwiek w `attendees[]` (gość czy nie) jest przypisywalny do składu, a jego performance jest resolve'owalny i oglądany przez coacha **i** przez niego samego, w scope **treningu** i **layoutu**, niezależnie od `teamId`.

## Off-limits (twardo)

- ❌ Żadnego fixa / commita / deploy.
- ❌ `ballisticsEngine.js` — nie czytać.
- ❌ Nie modyfikować żadnego pliku — tylko read + diagnoza.

---

## STEP 1 — Czy ranny picker-debug wszedł?

`git log` od 2026-05-23 rano. Sprawdź czy powstał jakikolwiek fix dla PPT-picker training-visibility (zmiany w `usePPTIdentity` / `teamTrainings` / picker filter). Zaraportuj: czy filtr pickera dalej = `teamIds.includes(tr.teamId)` ignorując `attendees`, czy już zmieniony. To kalibruje resztę (czy mówimy o nietkniętym roocie, czy o regresji/niedokończeniu).

## STEP 2 — Persystencja: (a) brak danych vs (b) brak resolve'u

Znajdź trening którego Jacek użył (goście zaproszeni, w coach summary „unassigned"). Ustal:
- `teamId` treningu (która drużyna?).
- **Jak gość trafił do treningu** — czy jest ścieżka „dodaj gościa", czy gość = workspace member dodany ręcznie, czy player innej drużyny? Opisz realną ścieżkę dodania.
- Czy guest playerId jest w `attendees[]`?
- Czy guest playerId jest w `squads{}` (przypisany do składu)?
- Czy punkty treningu (`matchups/{mid}/points`) mają guesta w `assignments` / `players`?

**Rozstrzygnięcie:** jeśli guest NIE jest zapisany w squads/points → **(a) brak danych** (bug przy zapisie przypisania). Jeśli JEST zapisany ale coach view go nie pokazuje → **(b) brak resolve'u**. Powiedz wprost które.

## STEP 3 — Skąd „unassigned" (resolution path)

Zlokalizuj widok coacha gdzie pojawia się „unassigned" (TrainingResultsPage? CoachTabContent? ScoutedTeamPage w kontekście treningu? — znajdź faktyczny). Opisz **jak resolve'uje playerId → tożsamość/staty**:
- Czy mapuje przez roster drużyny (`teamId` → players), i gracz spoza rostera (gość) → „unassigned"?
- Czy łączy attendees ze squads ze stats, i gdzie dokładnie gość wypada?
- Pokaż linię/funkcję gdzie powstaje bucket „unassigned".

## STEP 4 — Model tożsamości gościa

- Czy „gość" to w ogóle player doc? Jak reprezentowany jest gracz spoza drużyny (brak `teamId`? inny `teamId`? `parentTeamId`?).
- Czy `useUserNames` / player-stats `scope='training'` potrafią zresolve'ować guesta (jego punkty, performance) — czy też zakładają team membership?
- Self-view: czy gość zalogowany jako player mógłby zobaczyć swój performance z tego treningu (training-scope + layout-scope), czy ta sama team-bariera go blokuje?

## STEP 5 — Scope verdict → rekomendacja

Na bazie 1–4 powiedz wprost:
- **Fix kontenerowy** — coach summary + picker resolve'ują po `attendees` / kontekście treningu zamiast po rosterze `teamId`; guest-identity działa bo attendees są źródłem. Zakres = X plików, brak zmiany schematu.
- **vs zmusza decyzję architektoniczną** — jeśli gość nie ma sensownej reprezentacji jako player, albo training↔teamId binding jest tak wszyty, że poprawny model wymaga odłożonej decyzji events/training-context (Model A/B/C). Wtedy opisz dlaczego.

**[ESCALATE TO JACEK]** tylko jeśli STEP 5 = „zmusza decyzję architektoniczną". Jeśli kontenerowy → rekomendacja + lista plików, ja zatwierdzam i piszę impl/fix brief.

---

## Out of scope (twardo)

- ❌ Jakikolwiek fix, commit, deploy, modyfikacja pliku.
- ❌ ballisticsEngine.js.
- ❌ Decyzja events-architecture (Model A/B/C) — tylko zasygnalizuj jeśli STEP 5 jej dotyka.

Po diagnozie + werdykcie STEP 5 → fix brief (kontenerowy) albo decyzja Jacka (architektoniczny).

---

## Executed-2026-05-24

**Discovery executed by CC 2026-05-24. Verdict: CONTAINER FIX** — not architectural. Headline findings:

- **STEP 1:** PPT picker filter at `usePPTIdentity.js:83-86` ALREADY contains the attendee clause (`teamIds.includes(tr.teamId) || (Array.isArray(tr.attendees) && tr.attendees.includes(playerId))`). No fix landed since 2026-05-23; the existing clause works. The "team-vs-attendees" framing doesn't apply here.
- **STEP 2:** Guest is written to `training.attendees[]` (real "Zaproś gościa" path in `AttendeesEditor.jsx:198-205` → `InviteGuestModal` → `toggleAttendee` → `updateTraining({ attendees })`). Guest is NOT written to `training.squads{}`. `SquadEditor`'s mount-effect (`:27-49`) auto-distributes unplaced attendees round-robin LOCALLY (`setSquads(next)`) but never persists — only drag/squad-count/rename triggers `scheduleSave`. **Verdict: (a) brak danych** — squads-side write is missing.
- **STEP 3:** "Bez składu" bucket lives at `TrainingCoachTab.jsx:184-202`. Leaderboard rows are built FROM `training.attendees` (line 51), resolved via global `playersById` (line 53) — NOT from team roster. Each row's `squadKey` is looked up from `training.squads`; null → grouped under `'other'` → labelled "Bez składu". Confirmed: this is NOT a team-vs-attendees resolution bug; the coach view already uses training context as the row source. The issue is purely "guest in attendees but not in squads".
- **STEP 4:** Guest = standard `/players/` doc with their home team's `teamId`. Global `usePlayers()` + `playersById` resolves identically for guest as for in-team. `PlayerStatsPage.jsx:354-410` `scope=training&tid=...` is `playerId`-keyed off URL — zero team-gating on data fetch. `player.teamId` referenced only for display chip (`:368`) and back-nav (`:694`). Self-view works for guest.
- **STEP 5:** **CONTAINER FIX.** Files: `AttendeesEditor.jsx` (atomic invite-time placement) + `SquadEditor.jsx` (persist auto-distribute on mount). No schema change. No new collections. No events Model A/B/C decision needed.

Knock-on noted: existing squad-vs-squad matchups with frozen `homeRoster`/`awayRoster` snapshots won't retroactively include guests — separate ticket if Jacek wants.

Follow-up fix brief written + shipped same day: `CC_BRIEF_TRAINING_GUEST_SQUAD_PERSIST_FIX.md` (merge `909e7105`, 2026-05-24).
