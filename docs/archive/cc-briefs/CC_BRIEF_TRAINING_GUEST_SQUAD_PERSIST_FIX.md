# CC_BRIEF_TRAINING_GUEST_SQUAD_PERSIST_FIX.md

**Typ:** fix — contained. 2 pliki, ~20 LOC. User-facing → smoke po deployu.
**Branch:** `fix/training-guest-squad-persist`
**PRE-FLIGHT:** Discovery zrobiony (Twój raport „Training guest context"). Root = gość zapisuje się do `training.attendees[]` ale NIE do `training.squads{}`; SquadEditor auto-distribute jest local-only. Coach view i tożsamość są OK — nie ruszać. Przeczytaj własny raport discovery + `TrainingCoachTab.jsx:184-202`. Napisz „PRE-FLIGHT done".
**Źródło prawdy:** `git main` + repo.

## Co naprawiamy (decyzja Opusa — oba, bo zamykają dwie różne kolejności)

**Option 1 — `AttendeesEditor.jsx` `toggleAttendee` (+ `applyPreset`).** Gdy DODAJESZ gracza do `attendees`, w TYM SAMYM `updateTraining` write dopisz go do **najmniejszego istniejącego składu**. Atomic, niezależne od otwarcia SquadEditora. Jeśli `squads{}` puste/nie istnieje → no-op (Option 2 to łapie).

**Option 2 — `SquadEditor.jsx` auto-distribute effect (:27-49).** Po round-robin placement, jeśli `next` różni się od zapisanego `training.squads` → wywołaj `scheduleSave(next)` **od razu**. Dziś to tylko `setSquads(next)` (local). To domyka „składy uformowane po zaproszeniu gościa".

Razem: Option 1 = gość zaproszony gdy składy już są; Option 2 = składy formowane po zaproszeniu. Każdy attendee kończy w jakimś składzie, niezależnie od kolejności.

**Zachowaj istniejący UX:** auto-placement to „starting point" (§ 32) — coach dalej re-draguje. Nie zmieniamy logiki round-robin, tylko ją persystujemy.

## Off-limits (twardo)

- ❌ Roster-snapshot matchupów (`TrainingScoutTab.jsx:99-101 / :111-112`) — **backfill istniejących squad-matchupów = OSOBNY temat, NIE w tym fixie** (patrz „known limitation").
- ❌ `TrainingCoachTab` resolution / `playersById` / identity / `playerStats scope=training` — działają poprawnie per discovery, zero zmian.
- ❌ Zmiana schematu, nowe kolekcje, events Model A/B/C.
- ❌ `ballisticsEngine.js`, canvas (`BaseCanvas/InteractiveCanvas/HeatmapCanvas`).

---

## STEP 1 — Potwierdź findings (read)

Zweryfikuj że nadal: `AttendeesEditor.jsx:73-81` write'uje tylko `attendees` (+ `syncSquads` usuwa stale, nie dodaje); `SquadEditor.jsx:27-49` auto-distribute jest local-only. Jeśli coś się zmieniło od discovery → zaznacz, dostosuj.

## STEP 2 — Option 1 (AttendeesEditor)

W `toggleAttendee` (ADD branch) i `applyPreset`: policz najmniejszy istniejący skład z `training.squads`, dopisz nowego pid, włącz do tego samego `updateTraining({ attendees: next, squads: nextSquads })`. Idempotent (jeśli pid już w jakimś składzie → nie przenoś).

## STEP 3 — Option 2 (SquadEditor)

W mount auto-distribute effect: po zbudowaniu `next`, jeśli `!isEqual(next, training.squads)` → `scheduleSave(next)`. Bez zmiany logiki round-robin.

## STEP 4 — Weryfikacja

```
npx vite build 2>&1 | tail -5
npm run precommit
git diff --stat   # oczekiwane: AttendeesEditor.jsx + SquadEditor.jsx, nic więcej
```

Potwierdź NIETKNIĘTE: TrainingCoachTab, TrainingScoutTab (matchup roster), playerStats, identity, canvas, ballistics.
§ 27 self-review — fokus behavior: auto-placement to istniejący UX, tylko teraz persystowany.

## STEP 5 — STOP. Report READY + [ESCALATE: GO to merge]

Raportuj: diff stat, § 27 verdict, potwierdzenie że oba ścieżki (invite-gdy-składy-są / składy-po-invite) kończą gościa w `squads{}` zapisanych.

## STEP 6 — On GO: merge + deploy + docs

1. `git checkout main && git merge --no-ff fix/training-guest-squad-persist && git push`.
2. `npm run deploy`.
3. `DEPLOY_LOG.md` — wpis (SHA, „Training guest squad-persist fix — invite now persists guest into squads{} (Option 1 atomic + Option 2 auto-distribute save); fixes 'Bez składu' bucket", known: existing squad-matchup rosters NOT backfilled).
4. `NEXT_TASKS.md` — `[DONE]` + flag „matchup roster backfill" jako osobny otwarty temat.
5. Archiwizuj: `CC_BRIEF_TRAINING_GUEST_CONTEXT_DISCOVERY.md` + `CC_BRIEF_TRAINING_GUEST_SQUAD_PERSIST_FIX.md` → `docs/archive/cc-briefs/`.
6. HANDOVER — HEAD bump.

**Post-deploy smoke (Jacek):**
- Trening z istniejącymi składami → zaproś gościa → coach summary pokazuje go pod składem, NIE „Bez składu".
- Nowy trening → zaproś gości PRZED formowaniem składów → uformuj składy → wszyscy w składach po reloadzie.
- Free-play matchup: stats gościa lecą (regression check — działało, nie zepsuć).

---

## Known limitation (out of scope — osobna decyzja Jacka)

Squad-vs-squad matchupy utworzone PRZED zaproszeniem gościa mają zamrożony `homeRoster/awayRoster` snapshot → gość NIE pojawi się w nich wstecznie (zero punktów w tych konkretnych matchupach). Fix dotyczy: przyszłych matchupów + free-play + etykiety „Bez składu" w coach summary. Backfill starych matchupów = osobny ticket jeśli Jacek go chce.

---

## Executed-2026-05-24

**Shipped:** merge `909e7105` of `fix/training-guest-squad-persist` (`6b9bd55b`), deployed via `npm run deploy` 2026-05-24.

**Implementation faithful to brief:**
- Option 1 `AttendeesEditor.jsx` — added `placeIntoExistingSquads` helper, modified `toggleAttendee` ADD branch + `applyPreset`; combined `{ attendees, squads }` into single `updateTraining` write. Imports `SQUADS as SQUAD_META` from `utils/squads`. +49/−9 LOC.
- Option 2 `SquadEditor.jsx` — added file-level `squadsDiffer(a, b)` helper; moved `scheduleSave` above the mount effect; in the existing mount effect (round-robin logic byte-for-byte unchanged), conditionally `scheduleSave(next)` when `squadsDiffer(initial, next)`. Effect deps gain `scheduleSave`. +37/−10 LOC.

**Build/lint:** `vite build` ✓ 5.06s clean; `npm run precommit` ✓ all checks passed; bundle unchanged at 227.89 kB / 68.54 kB gzip.

**Diff stat (`git diff --name-only`):** `AttendeesEditor.jsx` + `SquadEditor.jsx`, nothing else (off-limits files confirmed untouched).

**§ 27:** PASS — no UI surfaces touched, auto-placement was existing § 32 / § 53 UX-intended state.

**Known limitation reaffirmed:** existing squad-vs-squad matchups created before the guest invite have frozen `homeRoster`/`awayRoster` snapshots — they will NOT retroactively include the new guest. Future matchups + free-play + coach summary label all fixed. Backfill of old squad-matchup rosters tracked separately in `NEXT_TASKS.md` as an open item.
