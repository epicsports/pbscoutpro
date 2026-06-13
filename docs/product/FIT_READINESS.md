# FIT-READINESS CHECKLIST — what must be true for the first external team to onboard cold (2026-06-13)

> Committed to repo from chat (Opus/Jacek, 2026-06-13) so it is not chat-only. The beachhead is FIT (first external team, cold). This is the gate list — "can a team we've never met sign in Monday and get value without us in the room." Status reflects the 2026-06-12→13 prod ships; anything unverified is marked SMOKE.

## A — BLOCKERS (must be true; a no here delays FIT)
1. **Tenant data isolation** — a FIT member sees ONLY FIT data, never Ranger's. ✅ shipped (tenant-isolation rules, on CONFIRM) — ⚠️ SMOKE #4 owed: non-super-admin in 2 workspaces sees both, no leak across.
2. **Fresh invitee can enter** — invite → land in workspace, no NoWorkspaceScreen dead-end. ✅ shipped (STEP 9 single-membership auto-enter + defaultWorkspace stamp).
3. **Cold home is not barren** — coach/scout/player land on role-aware content/guidance, not an empty picker. ✅ shipped (B4) — SMOKE: fresh-workspace cold state per role.
4. **Auth a FIT user can actually complete** — sign-in without us provisioning by hand. ⚠️ PARTIAL: magic-link works; email-link arc F blocked on Jacek's Firebase-console config. Decide: is current auth enough for FIT, or is arc F a blocker? (Read: if invite+magic-link onboards a coach today, F is post-FIT.)
5. **Their data renders** — layouts with real bunkers, points, heatmaps populate (not the empty/❓ states the audit hit). ⚠️ depends on FIT importing/creating real data; wave-3 seed proves our side, but the FIRST real external import is the true test → E5-class risk (team↔league, groups).
6. **No dead-ends / eternal loaders on the core path** — login → pick event → scout → review. ✅ largely (no-eternal-loading shipped on the crash route; class rollout pending but core path clean).

## B — STRONGLY WANTED (FIT works without, but credibility/retention suffers)
7. **Consistent language** — no mixed PL/EN. ✅ coverage push complete (i18n batches 1–6 + B7–B12 + regression-sweep, 2026-06-13) — SMOKE #3 re-check (was the trigger; should now be clean).
8. **Onboarding guidance** — a coach knows what to do first without a call. ⚠️ narratives DRAFT, **Sławek review owed (Jacek)**; B4 covers the empty-state nudge, full onboarding content is arc E.
9. **Looks pro on their devices** — device-agnostic across their phones/tablets. ✅ §114 + rail rollout + phase-view/drawer shipped — SMOKE: the combined checklist per device.
10. **Import their schedule/teams** — CDF/schedule import works on unfamiliar data. ⚠️ worked for us (CDF #1); E5 by-design but UNVERIFIED in UI; groups-discovery open (see CC verdict below).

## C — NOT FIT BLOCKERS (explicitly post-FIT — don't let them pull priority)
Rebrand (reads manifest/name/icons/store) · splash · `<Screen>` migration · motion · design pass (arc D) · TWA/Capacitor/RevenueCat · translations DE/FR/ES · read-volume audit · events architecture · avatar generator · LP/waitlist (sales, parallel track).

## CRITICAL PATH TO "FIT CAN START" (shortest line through the blockers)
1. **Jacek:** prod smoke the combined checklist — especially #1 (multi-ws isolation, other account), #3 (PL consistency), #5/#10 (a real-ish import + a layout with bunkers renders). These three close the most blocker-risk per minute.
2. **Jacek:** decide #4 — is invite+magic-link enough to onboard a FIT coach? If yes, arc F drops below the line and FIT is essentially unblocked on auth.
3. **Jacek + Sławek:** the narratives review (#8) — the one human dependency that nothing else can unblock; gates onboarding content.
4. **Then a focused "FIT dry-run":** create a clean test workspace, invite a fake "coach" account, walk login → event → scout a point → coach review → player view, on a real phone. This is the real acceptance test — it exercises 1,2,3,5,6,7,9 at once on the actual path a FIT coach takes. Everything else is polish.

## READ
We are close. Every hard data/isolation/entry blocker shipped this week; what remains on the critical path is mostly VERIFICATION (smoke + dry-run) plus two human decisions (auth-sufficiency, narratives), not new building. The biggest unknown is the first REAL external import (#5/#10) — worth a deliberate test with messy data before a live team hits it.

---

## CC discovery verdict — #10 groups + #5 import data-path (2026-06-13, read-only)

**#9/#10 group-stage import — RESOLVED, group support is fully round-tripped (NOT captured-but-invisible).** Traced end-to-end:
- **Capture:** `ScheduleCSVImport.jsx` recognizes the CSV "Grupa"/"group" column (`grupa: ['grupa','group']`) and writes `group: r.grupa || null` per match (:499); the AI/JSON importer (`ScheduleImport.jsx`) extracts `group` per match and is told `group can be null if not visible`. `round` captured the same way.
- **Display:** `groupMatchesByStage` (`utils/divisionAliases.js`) buckets matches by **stage** (`stageRank(m.round)`: prelims → ocho → quarter → semi → final) then by **Grupa** within each stage; consumed by the scout match list (`ScoutTabContent.jsx:378-417`) which renders stage labels + `Grupa {name}` sub-headers. Empty-group/legacy matches render without a sub-header; single-stage+single-group flattens to avoid clutter. Shipped 2026-05-13.
- **Conclusion:** when FIT imports a group-stage schedule, the group/round data is both preserved AND surfaced (stage + group sub-headers). The board's "groups-discovery owed (does import preserve groups?)" item (LANE-3 #9) is **STALE → close it.**

**Residual #5/#10 import risk (the real first-external-import unknown) is therefore NOT groups, but:**
1. **Team-name resolution on unfamiliar data** — the importer's unresolved-team resolver maps CSV team strings → global teams; on a roster of teams we've never scouted, more rows hit the manual resolver. Works, but UX-untested at volume with messy names. (E5 league-merge at `ScheduleCSVImport.jsx:424-430` is confirmed by-design: tagging an existing global team with a new league's division NESTS the map, never drops other leagues.)
2. **E5 team↔league still UNVERIFIED in the UI** — by-design in code, owes Jacek's UI re-check (existing open row).

**Recommendation for the FIT dry-run:** the deliberate "messy data" import test should target **team-name matching** (typos, abbreviations, unknown teams) + the E5 multi-league case — NOT groups (proven). One CDF/CSV with deliberately dirty team names through the resolver is the highest-value import test before a live team.
