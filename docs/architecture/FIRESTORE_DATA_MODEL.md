# Firestore Data Model — ground truth

**Verified 2026-05-21** against `firestore.rules`, `src/services/dataService.js`,
`src/hooks/useFirestore.js`, and the event-creation paths. This is the
authoritative DB map — **start here**, not from memory or older sketches. It
supersedes any earlier `ARCHITECTURE_C4` draft (no such file exists in the repo
as of this date).

> Re-verify before relying on this if the commit log shows schema/dataService
> churn after 2026-05-21.

---

## 1. Collections inventory

### Global (top-level)

| Path | Purpose | Key fields |
|---|---|---|
| `/users/{uid}` | Auth profiles | `email, displayName, globalRole, defaultWorkspace?, disabled?, createdAt, role`(legacy string) |
| `/leagues/{leagueId}` | League config (§ 63.15.1) | `name, shortName, divisions[], region, active` |
| `/players/{pid}` | Global player roster (Phase 2.2) | `name, nickname, pbliId, pbliIdFull, teamId, teamHistory[], hero, linkedUid, emails[], originWorkspace, ownerWorkspaceId, aliasIds[]` |
| `/teams/{tid}` | Global teams (Phase 2.3) | `name, leagues[], divisions{}, parentTeamId, externalId, originWorkspace, ownerWorkspaceId, retiredAt?` |

### Workspace-scoped (`/workspaces/{slug}/…`)

| Path | Purpose |
|---|---|
| `/workspaces/{slug}` (doc) | `members[], adminUid, userRoles{}, pendingApprovals[], rolesVersion, passwordHash` |
| `…/config/{doc}` | feature flags / workspace config |
| `…/players/{pid}` (+ `…/selfReports/{sid}`) | **LEGACY** workspace roster (dual-written; reads moved to global) · PPT logs |
| `…/pendingSelfReports/{sid}` | PPT unlinked-mode logs |
| `…/teams/{tid}` (+ `…/breakoutVariants/{vid}`) | **LEGACY** workspace teams (dual-written) · breakout variants |
| `…/layouts/{lid}` (+ `…/tactics/{x}`, `…/insights/{x}`, bunkers) | Field layouts |
| `…/tournaments/{tid}` (+ `…/scouted/{sid}` + `…/scouted/{sid}/notes/{nid}`, `…/matches/{mid}` + `…/points/{pid}` + `…/points/{pid}/shots/{sid}`, `…/tactics/{x}`) | **Tournaments AND sparing** |
| `…/trainings/{trid}` (+ `…/matchups/{mid}` + `…/points/{pid}` + `…/points/{pid}/shots/{sid}`) | Trainings |
| `…/events_index/{eventId}` | Cross-type event index (Model C — § 69) |

**Global vs workspace split:** `/players/` + `/teams/` exist BOTH globally and as
legacy workspace subcollections (dual-write maintained; reads moved to global).
`/leagues/` is global-only. All event data (`tournaments`, `trainings`,
`layouts`, `config`, `events_index`) is **workspace-only**. `/globalEvents/`
(§ 63.16) and a global `/layouts/` (§ 63 hybrid library) are **planned, not
built**.

## 2. Event model — half-merged, asymmetric

- **Tournament + Sparing → one collection** `/workspaces/{slug}/tournaments/`,
  discriminated by **`eventType`** (`'tournament'` default | `'sparing'`).
- **Training → separate collection** `/workspaces/{slug}/trainings/` (carries
  `type:'training'`).
- **Practice** = a `type:'practice'` flag on a `/tournaments/` doc.

⚠️ Sparing was unified into `/tournaments/` (the 2026-04-15 `eventType` work) but
training was **not** — the model is half-merged. Tournament docs carry **two
discriminator fields** (`eventType` *and* `type`).

**Field overlap** (tournament vs training doc): both carry `name, date, layoutId,
status, isTest, createdAt, updatedAt`. **Divergence** — tournament: `league,
year, division(s), eligibleClasses, fieldImage, location, rules, eventType`;
training: `type:'training', teamId, attendees[], squads{}, squadNames{}`.

## 3. Hierarchy — real Firestore paths

It is **not** a clean 5-level path nest. It is a 3-level subcollection nest + a
ref + an embed:

```
/workspaces/{slug}/layouts/{lid}                       ← Layout: SIBLING, not an ancestor
/workspaces/{slug}/tournaments/{tid}  (tournament|sparing) }
/workspaces/{slug}/trainings/{trid}   (training)          } ← Event — refs layout by `layoutId` field
        └─ matches/{mid}   |   matchups/{mid}             ← Match/Matchup: subcollection of the event
              └─ points/{pid}                             ← Point: subcollection
                    ├─ (embedded) assignments[], selfLogs{}  ← Player-in-Point: array/map ON the point doc
                    └─ shots/{sid}                           ← shot-level: subcollection
```

- **Layout ↔ Event** = a `layoutId` reference, not a path parent.
- **Event → Match → Point** = genuine subcollection nesting (separate trees for
  tournaments vs trainings).
- **Player-in-Point** = no doc — embedded as `point.assignments[]` (playerIds) +
  `point.selfLogs{}`; shot detail lives in `points/{pid}/shots`.

## 4. Read / write layer

**Hooks** (`src/hooks/useFirestore.js`): `usePlayers`, `useTeams`/`useActiveTeams`
(global); `useTournaments`, `useScoutedTeams`, `useMatches`, `usePoints`,
`useTactics`, `useNotes` (tournament tree); `useTrainings`, `useMatchups`,
`useTrainingPoints` (training tree); `useLayouts`/`useLayoutTactics`/
`useLayoutInsights`; `useEvents` (cross-type, § 69). Tournament and training have
**fully parallel hook trees** — `useMatches`↔`useMatchups`,
`usePoints`↔`useTrainingPoints`. ~22 component/page files consume the event
hooks.

**collectionGroup queries** (span event types): `shots` ×3, `selfReports` ×1,
`points`/`tactics`/`notes` (in `hasEverWritten`).

**Writes** — all in `dataService.js`, all **workspace-only** (no dual-write).
Only `/teams/` + `/players/` dual-write global + legacy workspace. Events are
single-path writes.

## 5. Known structural tech debt

- 🔴 **`/teams/` + `/players/` dual-collection** (global + legacy
  `/workspaces/{slug}/`). `deleteTeam`/`deletePlayer` hit only the workspace
  path while `useTeams`/`usePlayers` read global → delete-doesn't-stick
  (NEXT_TASKS Phase 2.3.d).
- 🔴 **`breakoutVariants` orphan-split** — teams are global, but
  `teams/{tid}/breakoutVariants/` lives under the legacy workspace `/teams/`.
- 🟠 **Two discriminator fields** on tournament docs (`eventType`, `type`).
- 🟠 **Parallel tournament/training trees** — duplicated structure + logic
  (`matches`↔`matchups`, points hooks, `addMatch`↔`addMatchup`).
- 🟠 **PPT selfReports split** — `players/{pid}/selfReports/` (linked) vs
  workspace-level `pendingSelfReports/` (unlinked).
- 🟡 **Orphaned dead code** — `subscribeTeams`/`subscribePlayers` (no callers),
  `setPointWithId`/`setTrainingPointWithId`.
- 🟡 **Planned-not-built** — `/globalEvents/` (§ 63.16), global `/layouts/`.

## 6. Events Model C — `events_index`

Decision 2026-05-21 (DESIGN_DECISIONS § 69). A thin **additive** index at
`/workspaces/{slug}/events_index/{eventId}` (1:1 with the source doc id) mirrors
every event (tournament | sparing | practice | training) for cross-type reads,
**without** migrating the nested trees or touching the 22 consumers. Written
atomically with the source doc (same `writeBatch`); `useEvents()` is the read
surface. Model B (full `/events/` unification) was rejected as too high-risk for
the benefit — see § 69.
