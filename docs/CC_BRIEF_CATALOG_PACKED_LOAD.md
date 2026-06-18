# CC BRIEF — Packed catalog cold-load (kill the players spinner)

**Status:** GO'd (Jacek, 2026-06-18). Option 1 of the pagination discussion.
**Goal:** cut the global `/players` cold-load (2,579 docs / ~1.47 MB / ~2,579 reads)
that drives the per-page loading spinner, WITHOUT breaking complete `playersById`
lookups, the version-gated cache, or the "search any player/team" pickers.

## Diagnosis (measured on prod 2026-06-18)
- `/players`: **2,579 docs, ~1.47 MB JSON, ~1.5 s fetch server-side** → multi-second
  on mobile + parse + IndexedDB persist = the spinner. `/teams`: 307 docs / 100 KB — fine.
- Cache (`useGatedCatalog`, version-gated IndexedDB) works; cost is one-time per device
  per catalog edit (or iOS IndexedDB eviction → cold every visit).
- **Field audit:** most player fields ARE used by some consumer (name, number, nickname,
  teamId, photoURL, hero, age, role, nationality, favoriteBunker, pbliId, linkedUid,
  aliasIds, teams, playerClass). So slimming FIELDS is a small, risky win.
- **Scouted-subset idea (measured):** the only heavy workspace (ranger1996) scouts
  1,177/2,579 players + 151/307 teams → only ~2× shrink; other workspaces are empty.
  Good long-term, modest now, and needs a picker rewrite. Deferred to a follow-up brief.

## Why NOT Firestore pagination
`playersById`/`teamsById` must be COMPLETE — `point.assignments[i]`, MatchPage opponent,
`player.teamId`, scouted `roster[]` all resolve IDs from the full map. A paged fetch
collapses those lookups to empty (the exact "data disappears" bug already fixed once).

## Design — packed, version-gated, self-healing, fallback-safe
Keep ALL fields (no consumer changes); collapse the 2,579-doc fetch into a few large docs.

**Layout (new global collection, additive):**
- `/catalog/players` — manifest `{ version, chunkCount, count }`
- `/catalog/players/chunks/{i}` — `{ version, items: [ ...full player objects slice ] }`
  (chunk size ≈ 800 KB to stay under the 1 MB doc limit → ~2 chunks for players)
- same shape for `/catalog/teams` (1 chunk; small).

**Read path (`useGatedCatalog`):**
1. Read manifest (1) + chunks (chunkCount). If ALL match `meta/catalogVersion` AND shape
   validates → use it (≈3 reads, ~1.47 MB as 2 blobs → far less SDK/parse/IDB overhead
   than 2,579 docs). Feed the existing IndexedDB cache as today.
2. Else (missing / stale-version / shape-invalid) → **fall back to the current
   `getCatalog*Once` full getDocs** (today's behaviour — correct, just slow).
3. **Self-heal:** when the fallback ran AND the user is admin, write the packed
   chunks+manifest stamped with the current version (single-flight). Next load is fast.

**Pre-pack (so prod is fast immediately):** `scripts/migration/pack-catalog.cjs`
(admin SDK) builds the packed docs now (additive write — covered by this GO).

**Rules (`firestore.rules`):** `match /catalog/{document=**}` → `allow read: if isMember`;
`allow write: if isAdmin`. Global (not tenant-scoped); NOT a tenant-isolation predicate.
Packed content is treated as UNTRUSTED by the client (shape-validate, else fall back), so
admin-only writes + client validation neutralise abuse.

## Why this is safe
- Additive: new collection; `/players` untouched. Fallback === today → no regression even
  if packed is absent/stale/corrupt. Reversible: delete `/catalog/*` → back to today.
- No field changes → no page can break on a missing field.
- Read-count win (~2,579 → ~3) also relieves the Spark read-cap (COST_PROJECTION_SPARK).

## Acceptance
- `npm run precommit` passes.
- With packed present+current: a cold load of a roster page issues ~3 catalog reads
  (not 2,579) and the spinner is materially shorter; `playersById` still resolves every
  assignment/roster id (no blank squads).
- With packed absent/stale: identical behaviour to today (slow but correct).
- Rules: member reads `/catalog`, non-admin write denied.

## Rollout
1. Land code behind the fallback (no prod effect until packed exists).
2. Deploy rules (`firestore:rules`) — task-GO'd by this brief.
3. Run `pack-catalog.cjs --live` once → prod fast. Smoke a roster page.
4. Steady state: admin edits bump version → admin reload self-heals the pack.

## Deferred (follow-up briefs)
- Scouted-subset load + lazy picker (usage-bounded; ~2× more for heavy ws, picker rewrite).
- iOS IndexedDB eviction resilience.
- Field slimming on top of packing (optional, small).
