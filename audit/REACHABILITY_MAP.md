# Role → route reachability map (wave-2 audit, 2026-06-10)

Derived from the router (`App.jsx`) + guards: **RouteGuard** → `roleUtils.canAccessRoute(effectiveRoles, path)`; **AdminGuard** → `effectiveIsAdmin`; **SuperAdminGuard** → `useIsSuperAdmin` (globalRole). Plus the **AuthGate** (`App.jsx:124`): a non-admin post-migration user must be **linked** (`linkedPlayer`) OR have `linkSkippedAt`, AND have non-empty roles, to reach the app at all.

## Access rules (from `canAccessRoute`)
- **admin** → everything.
- **coach** → everything EXCEPT `/settings/members*` + `/debug/flags` (admin-only).
- **scout** → like coach, but ALSO blocked from `/layout/*` **except** `/layout/:id/analytics/*`.
- **player** → ONLY `/`, `/player/*`, `/tournament/:t/team/:s` (scouted read); blocked from `/match/*`, `/layout/*`, and everything else.
- **viewer** (retired) → read-only everywhere; not provisioned.
- Ungated routes (no RouteGuard): `/`, `/teams`, `/team/:id`, `/players`, `/tournament/:t/team/:s`, `/player/:id/stats`, `/training/:id(/setup|/squads|/results)`, `/profile`, `/scouts`, `/scouts/:uid`, `/my-issues`, `/player/log(/wizard)` — reachable by any authed post-AuthGate user **whose role canAccessRoute permits** (player is still narrowed by canAccessRoute even on ungated paths it checks).

## Matrix (✓ reachable · ✗ blocked · — n/a)
| Route | super_admin | workspace_admin | coach | scout | player |
|---|---|---|---|---|---|
| `/` (MainPage) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/teams`, `/team/:id` | ✓ | ✓ | ✓ | ✓ | ✗ (canAccess player) |
| `/players` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/scouts`, `/scouts/:uid`, `/my-issues` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/training/:id`(+setup/squads/results) | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/profile` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/player/:id/stats`, `/player/log(/wizard)` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/tournament/:t/team/:s` (ScoutedTeam) | ✓ | ✓ | ✓ | ✓ | ✓ |
| `/tournament/:t/match/:m`, `/training/:t/matchup/:m` (MatchPage) | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/training/:t/hitability` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/layout/:id`, `/bunkers`, `/ballistics`, `/layout/new`, `/layouts` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `/layout/:id/analytics/:mode` | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/tournament|layout/.../tactic/:id` (TacticPage) | ✓ | ✓ | ✓ | ✓ | ✗ |
| `/settings/members(/:uid)`, `/debug/flags` | ✓ | ✓ | ✗ | ✗ | ✗ |
| `/admin/*` (leagues/players/teams/workspaces/layouts) | ✓ | ✗ | ✗ | ✗ | ✗ |

**Role-exclusive sets:** `/admin/*` = super_admin only · `/settings/members*` + `/debug/flags` = admin (super+ws_admin) only · player's reachable set is a strict subset of coach's (so player rows are mostly "blocked" deltas, not exclusive screens).

**AuthGate provisioning (so each role reaches the app):** super_admin = globalRole (not a member, enters via membership of an admin'd ws or its own); ws_admin = `userRoles:['admin']`; coach = `['coach']` + `linkSkippedAt`; scout = `['scout']` + `linkSkippedAt`; player = `['player']` + a linked `players/{id}.linkedUid = player.uid`.

**Kiosk:** an in-flow overlay (post-save / lobby) reached only after a scout logs a training point + presses "Przekaż graczom" — NOT a deterministic standalone route. Capture attempt = best-effort; if non-deterministic, note + skip (per ESCALATE clause).
