# CC BRIEF — Player-identity dedup (pbliId as primary key; flag-ambiguous-for-super-admin)

> Authored by CC at Jacek's request (2026-06-16), from the investigation that closed B26.
> **Status: SPEC — needs Jacek GO + the "obvious" threshold ratified before build.** Identity
> merges are high blast radius (a wrong merge fuses two real people permanently).

## Problem (what Jacek actually wants)
Avoid **duplicate player docs** in the global `/players` catalog. Definition (Jacek 2026-06-16):
- A **duplicate = two docs with the exact same FIRST + LAST name where one has a pbleagues id
  (`pbliId`) and one does not** (or, pathologically, two docs sharing a `pbliId`).
- **`pbliId` is the PRIMARY KEY when present** — there must never be two docs with the same pbliId.
- **Multi-team is NORMAL, not a duplicate.** One player legitimately plays many teams in one event
  (3v3 Thu / pro Fri / nations-cup Fri / 7-man Sat …) → `player.teams[]` holding many teams is
  CORRECT. There is **no "reassign on move."** (This corrects an earlier wrong hypothesis.)

## Root cause (where duplicates are born)
Rosters/players are imported from the pbleagues CSV via `CSVImport.jsx` (player import; the
`ScheduleCSVImport` is schedule/teams only and just *derives* scouted pick-lists from `player.teams`).
The dup is created in `CSVImport.jsx` **Path 2** (name-path, `:375-409`):
- **Path 1 (pbliId match, `:329-371`)** correctly enforces pbliId-uniqueness: a row with a pbliId
  that matches an existing pbliId doc → update + APPEND team. No new doc. ✓
- **Path 2** is reached when a row has a pbliId but **no existing pbliId doc matches**. It calls the
  local `matchPlayer(name, null, teamId, players, mergeByName)` (`:563-571`), which only finds an
  existing same-name doc if it is **on the same `teamId`** (`:565`) or has **no team** (`:570`). So a
  pbliId-bearing row whose exact name matches a **pbliId-less** doc already on a **different team**
  → no match → **a new doc is created** (`:400`) → duplicate (same name, one pbliId / one not).
- (If `matchPlayer` *does* match, `:387` already stamps the pbliId onto the existing doc — the claim
  logic exists; it just isn't reached for the cross-team case.)

**Not the roster-repair box (B26).** `repairScoutedRostersForTournament` narrows scouted *pick-lists*
from `player.teams`; it can't fix identity dups (it faithfully reproduces them). B26's box was retired
2026-06-16 as a misframe; its narrowing fn stays in dataService (non-destructive, e2e-covered).

## Policy (Jacek): obvious → auto-resolve; ambiguous → flag a super-admin to reconcile
**PROPOSED "obvious" threshold — RATIFY before build:**
- **OBVIOUS → auto-claim:** import row has a `pbliId`, no pbliId-match, and there is **exactly ONE**
  pbliId-less doc with an **exact normalized first+last name** match → stamp its `pbliId` + append the
  team. One unambiguous candidate = safe.
- **NOT OBVIOUS → flag (do NOT merge):**
  - **>1** same-name candidate (which one?), OR
  - a same-name doc that **already has a different `pbliId`** (two pbliIds, same name — can't both be
    primary), OR
  - _(open: should differing hard attributes — nationality / age — force a flag even on a single
    candidate? Jacek to rule.)_
  → import the row as a NEW doc (no data lost) **and** record a reconciliation flag pairing the
  candidates for a super-admin.

## Work items (suggested order; each its own verified ship)
1. **Import prevention** (lowest risk; stops NEW dups) — `CSVImport.jsx` Path 2: implement the
   obvious-vs-flag logic above. Auto-claim the single exact-name pbliId-less doc; else create + flag.
   Add the exact-normalized-name matcher (reuse `normalizePbliInput`/name-normalization already in
   `pbliMatching.js`). e2e: (a) single same-name pbliId-less doc → claimed (pbliId stamped, no new
   doc); (b) two same-name candidates → new doc + a flag recorded; (c) same-name with conflicting
   pbliId → flag.
2. **Reconcile queue + super-admin surface** — a "Potential duplicates" list (admin players area)
   reading the flags → opens the existing **`MergePlayersModal`** to confirm/merge (reuses the merge
   + `aliasIds` machinery). Decide flag storage (a `reconcileFlags` collection vs a field on the
   pbliId-bearing doc). e2e: a flagged pair appears in the queue → merge resolves it.
3. **Migration (existing dups)** — one-time scan of `/players` for exact-name pairs where one has a
   pbliId and one doesn't (and same-pbliId collisions): **auto-merge the obvious singletons**, **flag
   the ambiguous** into the queue. `--dry` first; report counts; `--live` under GO. Reuse the merge
   path so `aliasIds` are written (so prior point assignments still resolve).

## Guardrails / tiering
- **Identity = high blast radius.** A wrong merge is irreversible-ish (fuses two people). Default to
  FLAG over auto-merge whenever there's any ambiguity. Auto-claim only the single-exact-name case.
- **Tier-2 / GO-gated** — needs Jacek GO + the "obvious" threshold ratified. The migration's `--live`
  is a Hard-ESCALATE op (per Firebase policy) — `--dry` + backup first.
- Preserve `aliasIds` on every merge so historical point `assignments` keep resolving names.
- Cross-region namesakes (the §72 "Chavez US ≠ Chavez EU" concern) are exactly why ambiguity flags
  rather than auto-merges.

## Anchors
`CSVImport.jsx:329-409` (the two import paths) · `:563-571` (`matchPlayer`, team-scoped) ·
`pbliMatching.js` (normalize + match helpers) · `MergePlayersModal.jsx` (merge UI) · `aliasIds`
(survivor.aliasIds[] post-merge) · `dataService.repairScoutedRostersForTournament` (the retired box's
fn — unrelated, kept).

## Decisions owed (Jacek) before build
1. Ratify the "obvious" threshold (exactly-one-exact-name-pbliId-less = auto-claim; else flag). Do
   conflicting nationality/age force a flag on a single candidate?
2. Scope/sequence: import-prevention now, then queue + migration? Or all together?
3. Flag storage shape + where the super-admin reconcile surface lives.
