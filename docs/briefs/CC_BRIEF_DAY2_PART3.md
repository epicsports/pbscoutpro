# CC BRIEF — SPRINT DAY 2 (part 3): B4 role-aware home / empty states

**Role:** CC, implementer. Design gate passed by Jacek (2026-06-10) on `mockup-4-b4-home.html` (file from Jacek; inline comments carry measurements + decisions). Runs AFTER part 2 merges (shared emulator + merge order). Branch `feat/b4-home`.

## STEP 0.5 — Verify Opus assumptions (STOP + escalate if wrong)
- A1: A partial B4 shipped in `0c4852a2` (per backlog: "DEFERRED (partial shipped)") — inventory what exists (NoTournamentEmptyState? home variants?) and BUILD ON it, don't duplicate.
- A2: Role of the current user in the active workspace is resolvable client-side (members/userRoles) — the home can branch coach/admin vs scout vs player without new reads beyond what auto-enter already loads.
- A3: Checklist signals are derivable from already-loaded data or one cheap query each: hasTournament/hasTraining, hasLayout (workspace-visible), memberCount>1, hasAnyPoint. If any signal requires a new expensive query (collection scan) → STOP, report cost, `[ESCALATE TO JACEK]` (we just fought read-volume; don't regress it).
- A4: Player claim flow exists (approved 2026-05-02 model: pick yourself from roster) — the player empty-state CTA deep-links to it, not to a new flow.

## STAGE 1 — Doc-sync
Record: B4 gate passed (mockup 4); B4 = onboarding stage 1 ONLY (stage 2 education = arc E, post design-pass, fed by ONBOARDING_NARRATIVES — note its pending review by Jacek+Sławek); checklist state = derived-from-data, NO onboarding-progress collection (architectural decision).

## STAGE 2 — Implementation (per mockup 4)
1. **Coach/Admin fresh-workspace home**: hero card (welcome + progress bar N/4) + 4 checklist steps. Steps & signals: (1) workspace ready — always done; (2) first tournament/training — hasTournament∨hasTraining, CTA deep-links to add/import; (3) layout — hasWorkspaceLayout, CTA → catalog; (4) invite — memberCount>1, CTA → invites. Admin sees a 5th step: configure names/zones (deep-link to admin config) — same screen, one extra row.
   - "Next" step: amber border/CTA (the ONLY amber on screen); done steps: dimmed + green ✓; future steps: ghost CTAs.
   - "Zrobię to później" (≥44px target) → normal dashboard with NoTournamentEmptyState copy in empty sections; each empty section's CTA returns to the relevant checklist action.
   - Checklist disappears entirely when all signals true (home = normal dashboard). No stored dismissal state needed beyond the existing session.
2. **Scout empty state** (no assignment): icon + "Nie masz jeszcze przydziału" + single CTA "Dołącz do sesji kodem" (existing kiosk-join), subline about waiting for coach.
3. **Player empty state** (unclaimed): "Połącz konto ze swoim profilem" + CTA → existing claim flow (A4); subline "poproś coacha o dodanie".
4. Copy: take verbatim from mockup 4 (PL); all strings through i18n tables (arc-B extraction will rely on it — don't add new hardcoded JSX strings).
5. §27 throughout; no new primitives (PageHeader + Section + cards as in mockup).

## STAGE 3 — e2e (fail-first)
Fresh stress-less seed (empty workspace): coach login → checklist visible, step 2 highlighted, progress 1/4; seed a tournament → reload → step 2 done, step 3 highlighted, 2/4; all signals true → checklist gone, dashboard renders. Scout login → join empty state. Player (unlinked) → claim empty state. Write the spec FIRST against current home, watch it fail.

## STAGE 4 — Validation + gate
build ✓ · lint-ui 0 errors · precommit (Bash) · full e2e green · audit re-run optional (B4 adds a screen state — if cheap, capture it).
**[GO GATE — Jacek]** READY + smoke plan (fresh-workspace path needs a test workspace or pbfit pre-data check — propose which). Merge on GO. Protect scout.*/package.json.

**[ESCALATE TO JACEK]** only on A1–A4 failure or if the partial-B4 from 0c4852a2 conflicts structurally with mockup 4.
