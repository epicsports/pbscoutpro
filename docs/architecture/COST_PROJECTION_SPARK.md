# Firestore Spark-tier cost projection at N teams

> Read-only analysis, 2026-05-31. Projects free-tier (Spark) headroom as the
> production push onboards N competitive tenants. Grounded in code read/write
> patterns + real admin-SDK doc counts. **The live Firebase usage panel is not
> remotely readable — Jacek cross-checks this projection against it.**

## TL;DR
- **Binding constraint = daily reads.** The **catalog cold-load (~3,541 reads)** is
  ~90% of a user's daily reads and is **global** (every device, every tenant reads
  the same `/players` + `/teams`).
- **Untreated breach:** peak tournament day at **~N=5**; typical day at **~N=10–13**
  daily-active devices. Breach tracks *daily-active devices × 3,541*, not N directly
  (~14 active device-days = the 50k read cap).
- **Mitigation #1 (shipped 2026-05-31): catalog TTL 24h → 30d.** Drops steady-state
  cold-loads to per-catalog-edit cadence → ~90% read reduction → breach pushed to
  **~N=40–50+**. One line, version-gating already guarantees correctness.
- Writes, deletes, storage, egress do **not** breach at N=10.

## Spark hard caps (free tier)
50,000 reads/day · 20,000 writes/day · 20,000 deletes/day · 1 GiB stored · 10 GiB/mo egress.

## Real volumes (admin-SDK, 2026-05-31)
- **Catalog (global, shared by all tenants):** 3,242 players + 298 teams = **3,540 docs**.
- **ranger1996:** 4 tournaments, 238 matches (one tournament has 190), 137 scouted,
  465 points across 66 played matches. **Points/match: avg 7, p90 12, max 21.**
  **Point doc ~1.7 KB.** selfReports 53.
- **Layout previews:** now globally de-duped (5 bases × ~90 KB ≈ 0.45 MB total) after
  the § 96 globalization — no longer copied per workspace.

## Per-action read/write/delete (from code)
| Action | reads | writes | del | source |
|---|--:|--:|--:|---|
| App open → enter workspace | ~5 | 0–2 | 0 | `useWorkspace.jsx` auth/workspace/linkedPlayer |
| **Catalog COLD (TTL/version/miss)** | **~3,541** | 0 | 0 | `getCatalogPlayersOnce`+`getCatalogTeamsOnce` (1 read/doc) |
| Catalog WARM | 2 | 0 | 0 | 2 × `/meta/catalogVersion` |
| MainPage listeners (tournaments/trainings/layouts/overlays/events) | ~20 | 0 | 0 | `useFirestore` `subscribe*` |
| Open a tournament (matches + scouted) | 30–**290** | 0 | 0 | `subscribeMatches` reads ALL (Prague=190) + `subscribeScoutedTeams` |
| Open a match (points) | ~7 | 0 | 0 | `subscribePoints` |
| Log a point | 0 | 1 | 0 | `addPoint` (no re-read; listener callback is free) |
| `endMatchAndMerge` (2-coach, ~16 pts) | 1+N (~17) | ~25 | **0** | reads match + all points; batch updates; **no deletes** |

Catalog cache logic (`useFirestore.js:64–93`): `fresh = cached && version matches &&
(now − ts) < CATALOG_TTL_MS`. Cold fires on miss **OR** version change **OR** TTL expiry.

## Activity model (per active device/day, warm catalog after 1 daily cold)
- **Typical:** ~3,800 reads / ~50 writes (1 cold catalog + light browse).
- **Peak (tournament day):** ~6,500 reads / 200–800 writes (heavy navigation incl.
  big-tournament opens + live point streams + merges).
- Deletes ≈ 0 (merge marks `mergedInto`, never deletes).

## Projection vs caps (~2 devices/team typical, ~4 peak)
| N | reads/day (typ) | %50k | reads/day (peak) | %50k | writes peak | %20k |
|--:|--:|--:|--:|--:|--:|--:|
| 1 | 7,700 | 15% | 26,000 | 52% | 1,600 | 8% |
| 5 | 38,500 | 77% | **130,000 🔴** | 260% | 8,000 | 40% |
| 10 | **77,000 🔴** | 154% | **260,000 🔴** | 520% | 16,000 | 80% |

**Storage/egress non-issues at N=10:** ~50k points × 1.7 KB ≈ 85 MB + catalog +
de-duped previews ≈ **~150 MB / 1 GiB**; egress ≈ **~2.7 GiB / 10 GiB-mo**.

## Breach point
- **Reads (binding):** peak day ~**N=4–5** (untreated), typical day ~**N=10–13**.
  Driver = daily-active devices × the 3,541-read catalog cold-load.
- **Writes:** ~**N=12** heavy-simultaneous scouting. **Deletes / storage / egress:** never at this scale.

## Mitigation ladder (cheapest first; Blaze is the last resort)
1. **✅ SHIPPED 2026-05-31 — catalog TTL 24h → 30d** (`CATALOG_TTL_MS`, one line).
   Version-gating already invalidates instantly on any edit; TTL was a redundant
   daily-refetch backstop. ~90% read reduction → breach → ~N=40–50+.
2. **League-scoped catalog load** (backlog, trigger ~N=40–50 or extreme peak days) —
   fetch only players/teams for the league(s) a workspace scouts (NXL-only team
   doesn't need 3,242 cross-league players). Cuts cold-load ~3,541 → ~500–1,000.
3. **Tournament match-listener scoping** (backlog) — `subscribeMatches` reads ALL
   matches (Prague=190); filter to active/recent or paginate. Cuts peak navigation.
4. **Version-read caching** (backlog) — collapse the 2 per-session `/meta/catalogVersion`
   reads + redundant MainPage listeners.
5. **collectionGroup `selfReports`/`shots` scoping** — cross-tenant scan; already tracked
   as the deferred § 94 #3 (trigger: before self-logs go multi-tenant).

Blaze (pay-as-you-go) is **not** needed for the foreseeable production push.

## The number to cross-check on the usage panel (Jacek only)
**Daily cold-catalog-load count** = panel reads/day ÷ ~3,541. The model assumes ~1
per device/day from the old 24h TTL. With mitigation #1 this should now drop sharply
(cold-loads only on catalog-edit days). If the panel still shows reads ≈ N_devices ×
3,541 after this ships, a catalog edit is bumping the version more often than expected —
investigate the bump cadence (which writes call `bumpCatalogVersion`).
