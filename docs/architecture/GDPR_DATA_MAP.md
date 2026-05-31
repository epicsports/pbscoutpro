# PbScoutPro — GDPR data map, consent basis & questions for counsel

> Read-only discovery, 2026-05-31. Maps the personal-data footprint, classifies
> consent basis, records current erasure/export/retention capability, and lists
> the open legal questions. **The "Questions for legal counsel" section is the
> document to take to a lawyer.** No data-subject-rights engineering has been
> built yet (it is blocked on the answers to Q1–Q2 below).
>
> PbScoutPro is a paintball xball scouting app (React + Firebase Firestore,
> Firebase Spark/free tier, deployed to GitHub Pages). Controller: Epic Sports /
> Jacek Parczewski (jacek@epicsports.pl).

---

## 1. The headline: who the data subjects are

Grounded in production counts (admin-SDK, 2026-05-31):

| Group | Count | Consent status |
|---|--:|---|
| App user accounts (signed up) | **22** | Plausibly consented (created their login) |
| Players **linked** to an auth user (self-loggers) | **5** | Plausibly consented (claimed their own profile) |
| Players **unlinked** — scouted opponents in the catalog | **3,237** | **NOT consented — never signed up, likely unaware** |
| **Total players in catalog** | **3,242** | — |

**99.8% of the people whose personal data this app holds are scouted opponents
who did not consent and were not informed.** This is the central legal exposure:
the product's core function (opponent scouting) is built on processing
identifiable third parties' data — including name, age, nationality, PBLI
identity, team history, and per-match performance — without their consent.

---

## 2. Personal-data map (what / where / whose)

All Firestore. "PII" = data identifying or relating to a natural person.

| Location | Personal-data fields | Whose data | Volume |
|---|---|---|---|
| `/users/{uid}` | **email, displayName**, globalRole, defaultWorkspace, disabled/disabledBy | App members | 22 |
| `/players/{id}` (global catalog) | **name, nickname, number, age, pbliId, nationality**, teamId, teamHistory[], linkedUid, ownerWorkspaceId | Players (mostly scouted opponents) | 3,242 |
| `/workspaces/{slug}` | members[] (uids), userRoles{uid:[roles]}, adminUid, pendingApprovals[] | Members | 579 / 2 per ws |
| `…/tournaments/{t}/matches/{m}/points/{p}` | assignments[] (player ids), scoutedBy (uid), coachUid | Scouted players + scout identity | 465 (ranger) |
| `/workspaces/{slug}/selfReports/{id}` | playerId, breakout{side,bunker,variant}, shots[], outcome | Self-logging players | 53 |
| `/workspaces/{slug}/pendingSelfReports/{id}` | same + uidWhoCreated | Unlinked self-loggers | 11 |
| `…/scouted/{sid}/notes/{id}` | authorId, authorName, content (free text — may name anyone) | Coaches + named persons | — |
| `/invites/{token}` | **createdBy (uid), redeemedBy (uid)**, workspaceSlug, role, expiresAt | Inviter + invitee | 2 |
| **Sentry** (third party, external) | `Sentry.setUser({ id: uid, email })` + workspace/role tags | Every user, on any error | live |

Field shapes verified on real docs (keys/types only; no values extracted):
- `/users` → `{ email, displayName, roles, defaultWorkspace, createdAt }`
- `/players` → `{ name, nickname, number, age, pbliId, nationality, teamId, teamHistory, linkedUid, ownerWorkspaceId, createdAt, updatedAt, … }`
- `/invites` → `{ workspaceSlug, role, createdBy, redeemedBy, expiresAt, createdAt, redeemedAt }`

**Third-party processors:** Google Firebase (Firestore/Auth/Hosting), Sentry
(error telemetry — receives uid + email), GitHub Pages (static hosting).

Code refs: `dataService.js` (`getOrCreateUserProfile` ~:45, `addPlayer` ~:218,
`createInvite` ~:2056), `playerPerformanceTrackerService.js:15` (selfReports),
`src/services/sentry.js:32` (`setSentryUser` — sends uid+email).

---

## 3. Consent-basis classification (the crux)

- **Consented / opted in (~0.2%):** the 22 user accounts (created their login) +
  the 5 players who linked/claimed their own profile and self-log.
- **Not consented (~99.8%):** the 3,237 unlinked scouted players. Their data was
  entered by coaches and is processed (stored, analysed into stats, annotated in
  notes) without consent or notice.

Everything downstream — stats engines, scouted rosters, coach notes, match points
— references these player ids, so a player's footprint is spread across many docs.

---

## 4. Current capability vs GDPR rights (the gaps)

| Right | Current capability | Gap |
|---|---|---|
| **Erasure (Art. 17)** | `softDisableUser` flags only; `deletePlayerGlobal` deletes the catalog doc but **cascades nothing**; `removeMember`/`leaveWorkspaceSelf` unlink a player, delete no data | No data-subject deletion path. Deleting leaves dangling refs in points.assignments[], selfReports.playerId, userRoles{uid}, invites, notes.authorId, + Sentry (external) |
| **Access / Portability (Art. 15/20)** | None | No export/download; access needs manual console extraction |
| **Transparency (Art. 13/14)** | None | No privacy policy, no notice to scouted players |
| **Consent** | None captured | No terms/consent at signup; no record of consent |
| **Retention (Art. 5(1)(e))** | **Indefinite.** Only client-side validity TTLs (invite 7d, scout draft 24h) — expired invites persist; nothing auto-deletes. Spark = no Cloud Functions → no server-side scheduled cleanup | No retention policy or expiry |

---

## 5. Minimum engineering to honor data-subject requests (internal — blocked on legal)

Ordered cheapest-first; all Spark-compatible (admin-SDK + client assembly; no
Blaze/Cloud Functions required). **Do not start (a)/(b) until counsel answers
Q1–Q2** — they decide tombstone-vs-hard-delete and whether consent-at-signup
suffices or scouted-player notice is also required.

- **(c) Privacy policy + terms/consent at signup** — greenfield. Static
  privacy/terms route + consent checkbox + timestamp on `/users` at first login.
  Smallest, highest legal value (establishes the baseline). **Do first.**
- **(a) Delete-user + cascade** — partial primitives exist. A script that removes
  `/users/{uid}`, strips `members[]`/`userRoles{}`/`pendingApprovals[]` across all
  workspaces, nulls `linkedUid`, scrubs/tombstones `scoutedBy`/`coachUid`/
  `authorId`, deletes the user's `selfReports` + `invites`, **and** files a Sentry
  deletion request. Admin-SDK first; self-serve UI later.
- **(b) Export-user-data** — greenfield. Assemble a uid's `/users` doc + linked
  player + selfReports + authored notes/points refs → JSON download (client-side).

Also: **player erasure** (a scouted player demanding deletion) is a separate,
larger cascade than user-account deletion and depends entirely on Q2.

---

## 6. ▶ QUESTIONS FOR LEGAL COUNSEL ◀ (the takeaway list)

1. **Lawful basis for scouted opponents.** Is processing the 3,237 unconsented
   scouted players' performance data defensible under "legitimate interest"
   (competitive sport / publicly-observable match performance)? Does that basis
   cover storing **age, nationality, and PBLI identity**, or only on-field actions?
2. **Erasure rights of catalog players.** Do unconsented scouted players have
   Art. 17 rights here? If one demands erasure, must their *scouting history*
   (points/stats/notes) be deleted, or only direct identifiers? (Determines
   whether build (a) tombstones or hard-deletes.)
3. **Retention periods.** How long may person-linked scouting data be kept? Is
   there a "no longer competitively relevant" deletion obligation?
4. **Data residency (EU).** What Firestore region is required? Note **Sentry**
   sends uid+email cross-border (US?) — does that transfer need SCCs / a basis?
5. **Processor / DPA.** Are DPAs needed with Google (Firebase) and Sentry? Are the
   *workspaces* (competitive teams) joint controllers or separate controllers of
   the scouting data they enter?
6. **Transparency to non-members (Art. 14).** Is there an obligation to *inform*
   scouted players that their data is held, given it was not collected from them?

---

*Source: read-only discovery (code + admin-SDK counts), 2026-05-31. No personal
data values were extracted into this document — only counts and field schemas.*
