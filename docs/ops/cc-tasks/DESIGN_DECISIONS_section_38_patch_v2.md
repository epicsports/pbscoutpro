# DESIGN_DECISIONS.md § 38 — Patch v2

> **Context:** § 38 was committed 2026-04-20 with single-role-per-user model and email-based identity. Post-commit decisions (2026-04-20 Opus session) require:
> 1. Multi-role model (user can be admin + coach + player simultaneously)
> 2. PBleagues ID matching as mandatory account linking (no email fallback)
> 3. Post-registration approval gate (admin assigns roles in Settings → Members)
>
> This file is a set of edits to apply to `docs/DESIGN_DECISIONS.md`. Commit as `docs: § 38 v2 — multi-role + PBleagues matching (supersedes v1 subsections 38.2, 38.3, 38.8, 38.11; adds 38.12, 38.13, 38.14)`.

---

## Edit 1 — Replace § 38.2 ("Role model")

**Find entire § 38.2 block** (from `### 38.2 Role model` through the end of that section, up to `### 38.3 Admin determination`).

**Replace with:**

```markdown
### 38.2 Role model — multi-role per user

Roles are a **set**, not a single value. A user can hold multiple roles simultaneously (e.g. Jacek is `['admin', 'coach', 'player']`). Capability checks evaluate "any of" — if any held role grants a capability, the user has it.

| Role | Who | Grants capability to |
|---|---|---|
| `admin` | Workspace owner | Manage members + roles, edit everything, delete anything, destructive actions |
| `coach` | Team coach | Edit teams, tactics, notes, open/close matches, write scouting data, view all analytics |
| `scout` | Dedicated scout | Write scouting data (points, assignments, shots). Cannot delete, cannot manage members |
| `viewer` | Non-roster observer | Read-only entire workspace |
| `player` | Roster player (has `players/{X}.linkedUid === firebaseUid`) | Write own self-log only, read own stats, read team summary |

**Default roles for new user** after PBleagues match + admin approval: `[]` (empty array until admin assigns). New user sees blocked screen "Twoje konto czeka na zatwierdzenie przez admina" until admin adds at least one role.

**Roles stored as array:** `workspace.userRoles[uid] = ['admin', 'coach', 'player']`.

**Capability helpers** (in `src/utils/roleUtils.js`):
```javascript
function hasRole(roles, target) {
  return Array.isArray(roles) && roles.includes(target);
}

function hasAnyRole(roles, ...targets) {
  return targets.some(t => hasRole(roles, t));
}

function canWriteScouting(roles) {
  return hasAnyRole(roles, 'admin', 'coach', 'scout');
}

function canEditTactics(roles) {
  return hasAnyRole(roles, 'admin', 'coach');
}

function canManageMembers(roles) {
  return hasRole(roles, 'admin');
}

function canWriteSelfLog(roles) {
  return hasRole(roles, 'player');
}

function canReadOnly(roles) {
  return hasRole(roles, 'viewer') && roles.length === 1;
}
```

**Why multi-role:** Jacek is simultaneously admin (manages workspace), coach (runs practices), and player (plays in matches, self-logs). Single-role would force him to pick one, losing capabilities. Multi-role reflects reality: one person, multiple responsibilities.

**View Switcher behavior with multi-role:** admin with `['admin', 'coach', 'player']` sees 5 impersonation options (admin/coach/scout/viewer/player). Impersonating "coach" means UI gates based on `effectiveRoles = ['coach']` (single-element array, not the admin's full set). See § 38.5.
```

---

## Edit 2 — Replace § 38.3 ("Admin determination")

**Find § 38.3 block** (from `### 38.3 Admin determination` through `### 38.4`).

**Replace with:**

```markdown
### 38.3 Admin determination

A user is admin of this workspace if ANY of:

1. `hasRole(workspace.userRoles[uid], 'admin')` — array includes `'admin'` (primary path, § 38.2 role model)
2. `workspace.adminUid === user.uid` — legacy admin field retained for backwards compatibility + single-source-of-truth for "workspace owner" (transferable via Settings UI)
3. `user.email in ADMIN_EMAILS` — hardcoded allowlist `['jacek@epicsports.pl']` as emergency restore when (1) and (2) are broken

`ADMIN_EMAILS` does NOT grant admin globally — only in workspaces where the user is already a `members[]` entry. The allowlist is disaster recovery, not god-mode.

`adminUid` is the single transferable "workspace owner" pointer. When admin transfers to another user via Settings UI, `adminUid` updates AND `userRoles[toUid]` gets `'admin'` appended AND `userRoles[fromUid]` has `'admin'` removed (keeping other roles intact — fromUid may retain `'coach'` and `'player'`).

`isAdmin()` helper in `roleUtils.js`:
```javascript
function isAdmin(workspace, user) {
  if (!workspace || !user) return false;
  const roles = workspace.userRoles?.[user.uid] || [];
  if (hasRole(roles, 'admin')) return true;
  if (workspace.adminUid === user.uid) return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}
```
```

---

## Edit 3 — Replace § 38.8 ("Data model changes")

**Find § 38.8 block** (from `### 38.8 Data model changes` through `### 38.9`).

**Replace with:**

```markdown
### 38.8 Data model changes

```javascript
// workspaces/{slug}  — existing fields + additions:
{
  slug: 'ranger-warsaw',
  name: 'Ranger Warsaw',
  members: ['uid1', 'uid2', ...],        // existing
  adminUid: 'uid1',                       // existing, gains transferability
  
  // NEW fields:
  userRoles: {                            // NEW — per-user ROLE ARRAY (not string)
    'uid1': ['admin', 'coach', 'player'],
    'uid2': ['coach', 'player'],
    'uid3': ['scout'],
    'uid4': ['player'],
    'uid5': [],                           // awaiting admin approval
  },
  pendingApprovals: ['uid5'],             // NEW — uids past PBleagues match, awaiting first role
  rolesVersion: 2,                        // NEW — migration marker
  migrationReviewedAt: Timestamp | null,  // NEW — when admin last dismissed review
}

// players/{pid} — existing fields + additions:
{
  name: 'Jacek Parczewski',
  number: 66,
  teamId: 'ranger-rush',
  pbleaguesId: '#61114',                  // EXISTING — first segment from pbleagues.com
                                          // (may or may not have leading #, normalize on read)
  
  // NEW fields:
  linkedUid: 'firebase-uid-abc',          // NEW — Firebase uid of linked user account (null if unlinked)
  pbleaguesIdFull: '61114-8236',          // NEW — full two-segment ID captured at link time
                                          // (audit + future re-verification if pbleagues suffix changes)
  linkedAt: Timestamp,                    // NEW — when player linked to uid
  emails: [...],                          // EXISTING from SelfLog Tier 1 — REMOVED as primary identity
                                          // keep field for historical data but no longer used for matching
}

// Removed concepts:
// - workspace code ##/? prefix handling in useWorkspace.jsx
// - implicit 'scout' fallback in useFeatureFlag.getRole()
// - email-based player matching via players/{X}.emails[] (replaced by pbleaguesId + linkedUid)
```

**Migration note on `players/{X}.emails`:** SelfLog Tier 1 (shipped 2026-04-20) introduced `emails[]` for player-to-uid matching via `useSelfLogIdentity`. Post-§ 38, this mechanism is replaced. The `emails[]` field is NOT deleted (historical record), but matching logic moves to `linkedUid` lookup. Re-migration: on first admin login post-deploy, a script walks `players/{X}.emails[]` → attempts to map each email to current Firebase user → if match, sets `linkedUid` + prompts admin to confirm. After confirmation, email-based matching is disabled forever.
```

---

## Edit 4 — Replace § 38.11 ("Implementation paths — OPEN DECISION")

**Find § 38.11 block** (from `### 38.11 Implementation paths` through end of § 38 / before § 39 if exists).

**Replace with:**

```markdown
### 38.11 Implementation path — RESOLVED: Path A (full refactor)

Chosen 2026-04-20 by Jacek. Rationale: active season (matches weekly), player buy-in needed ASAP for SelfLog flywheel. Full refactor ships before next Sunday match with iPhone validation.

**Scope expanded from original estimate** to include:
- Multi-role model (was single-role in v1 of this section — updated above)
- PBleagues ID matching as mandatory registration gate (§ 38.12)
- Admin approval gate for new users (§ 38.13)
- No email-based player matching fallback

**New estimate:** 12-18h, 4 commits on `feat/security-roles-v2`. See `CC_BRIEF_SECURITY_ROLES_V2.md` for implementation breakdown.

**Deployment strategy:** branch complete → Jacek validates on iPhone → merge + deploy between matches → monitor 30 min post-deploy for rules regressions. ADMIN_EMAILS emergency restore path guarantees Jacek never locked out.
```

---

## Edit 5 — Add new § 38.12, § 38.13, § 38.14 AT END of § 38

**Find the last line of § 38** (end of § 38.11 after Edit 4 above).

**Append after it:**

```markdown
### 38.12 PBleagues ID account linking (onboarding flow)

Every new user must link their account to a PBleagues player profile before gaining any role in the workspace. No email-based fallback — if a user has no PBleagues account, they create one at pbleagues.com first. If their PBleagues ID is not yet in the admin's player database, they contact the admin (jacek@epicsports.pl) to be added.

#### ID format

- **pbleagues.com source:** user profile shows full ID like `61114-8236`
  - First segment (`61114`): system-assigned numeric, immutable, publicly visible on match results
  - Separator: hyphen `-`
  - Second segment (`8236`): user-configurable at pbleagues.com/profile. Numeric in observed cases; treat as `\w+` defensively
- **Our Firestore:** `players/{pid}.pbleaguesId` stores first segment, historically with `#` prefix (e.g. `"#61114"`) for UI display consistency with pbleagues' own convention
- **Normalization:** strip leading `#` before comparison

#### Input validation

```javascript
const PBLEAGUES_ID_REGEX = /^#?\d+-\w+$/;

function parsePbleaguesId(raw) {
  const trimmed = raw.trim();
  if (!PBLEAGUES_ID_REGEX.test(trimmed)) {
    return { error: 'INVALID_FORMAT' };
  }
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}
```

Reject inputs that don't match: missing separator, missing either segment, non-numeric first segment, whitespace inside.

#### Matching algorithm

```javascript
async function findPlayerByPbleaguesId(workspaceSlug, systemId) {
  const playersSnap = await getDocs(collection(db, 'workspaces', workspaceSlug, 'players'));
  const matches = [];
  for (const doc of playersSnap.docs) {
    const dbId = doc.data().pbleaguesId?.replace(/^#/, '');
    if (dbId === systemId) matches.push({ id: doc.id, ...doc.data() });
  }
  return matches;
}
```

**Match outcomes:**

| Outcome | Response |
|---|---|
| Zero matches | Reject: "Nie znaleziono gracza o ID #{systemId} w bazie workspace {name}. Skontaktuj się z adminem: {admin email from workspace}" |
| One match, `linkedUid === null` | Success — proceed to link |
| One match, `linkedUid === currentUid` | Success (idempotent re-login from same user) — proceed normally |
| One match, `linkedUid` is different uid | Reject: "Ten profil gracza jest już podłączony do innego konta. Skontaktuj się z adminem aby rozlinkować." |
| Multiple matches (data integrity bug — should not happen since `pbleaguesId` should be unique per workspace) | Show disambiguation picker: list of matching players with name + team + number, user picks one. Log to Sentry. |

#### Linking action

On successful match + user confirmation:
```javascript
await runTransaction(db, async (tx) => {
  // Link player doc to uid
  tx.update(doc(db, 'workspaces', slug, 'players', matchedPlayerId), {
    linkedUid: currentUid,
    pbleaguesIdFull: `${systemId}-${userSuffix}`,
    linkedAt: serverTimestamp(),
  });
  
  // Add uid to members if not already, initialize empty roles array
  tx.update(doc(db, 'workspaces', slug), {
    members: arrayUnion(currentUid),
    [`userRoles.${currentUid}`]: [],          // empty — awaiting admin approval
    pendingApprovals: arrayUnion(currentUid),
  });
});
```

#### Onboarding screen specification

Full-page modal, no dismiss, no skip. Path: `/onboarding/pbleagues` (protected, requires auth but no workspace role).

Content:
- Title: "Podłącz profil gracza"
- Explainer: "Aby korzystać z aplikacji, podłącz swój profil z pbleagues.com. Jeśli nie masz konta, załóż je najpierw na pbleagues.com, następnie wróć tutaj."
- Link to pbleagues.com (opens new tab)
- Input field: `Player ID`, placeholder `61114-8236`, inline validation
- Help text below input: "Znajdziesz go w swoim profilu na pbleagues.com → Settings → Player ID"
- Submit button: "Podłącz profil" (disabled until validator passes)
- On success → modal state updates to "Konto zatwierdzone. Czekaj na przypisanie roli przez admina." with "Sprawdź status" refresh button
- On error → inline error above input, user stays on screen

#### Admin is also subject to PBleagues matching

Even Jacek (admin via ADMIN_EMAILS emergency path) must complete PBleagues linking to be fully functional — without it, `linkedUid` is null on his player doc, meaning he cannot self-log (player role capability requires link). His admin capabilities still work via ADMIN_EMAILS, but SelfLog won't.

### 38.13 Admin approval gate

Post-PBleagues linking, user has `userRoles[uid] = []` (empty array). They are members of the workspace but hold no capabilities.

**User experience while pending:**
- Full-screen blocker after login: "Twoje konto czeka na zatwierdzenie przez admina. Otrzymasz dostęp gdy admin przypisze Ci rolę. Skontaktuj się: {admin email}"
- Single button: "Odśwież" — re-fetches workspace, re-evaluates roles
- Sign-out always available

**Admin experience:**
- Settings → Members tab shows dedicated section "Oczekują zatwierdzenia ({count})" at top
- Each pending user card: avatar (initials), display name (from linked player doc), email, PBleagues ID
- Inline role multi-select chips: `[Admin] [Coach] [Scout] [Viewer] [Player]` — admin taps chips to toggle
- "Zatwierdź" button saves selected roles → user leaves pending state
- Default pre-selected role on pending card: `['player']` (most common case — admin can override)

**Firestore data flow:**
```javascript
// Admin approval
await updateDoc(doc(db, 'workspaces', slug), {
  [`userRoles.${targetUid}`]: selectedRoles,  // e.g. ['player', 'coach']
  pendingApprovals: arrayRemove(targetUid),
});
```

**Why explicit approval instead of auto-assign:** admin wants control over who gets scouting write access, who's just a spectator, who's a player. Auto-assigning all PBleagues-matched users to `'player'` is safe for rosters but wrong for guests/parents — admin reviews and decides.

### 38.14 Re-verification and re-linking edge cases

**Case: User reinstalls app / clears storage** — new Firebase session on same device. If email+password login maps to same uid → `linkedUid` still valid → no re-link needed. If user created new Firebase account → new uid → needs re-link (pbleaguesId match finds old player doc but `linkedUid` is old uid → admin must rollinkować manually).

**Case: User changed suffix on pbleagues.com** — `pbleaguesIdFull` no longer matches what user types. Our match logic only uses systemId (first segment), so match still succeeds. Captured `pbleaguesIdFull` in our DB is stale but not harmful. Re-verification flow: admin can trigger "Re-verify PBleagues" in Settings → Members → per-user `⋮` menu, which clears `pbleaguesIdFull` and prompts user to re-enter at next login.

**Case: Two users share same PBleagues ID (data bug)** — cannot happen on pbleagues.com side (system-assigned first segments are globally unique). If our DB ever has two players with same `pbleaguesId` in same workspace, it's admin error in data entry. Disambiguation picker (§ 38.12) handles UI; admin cleanup handles root cause.

**Case: Player dropped from roster** — admin deletes player doc. `linkedUid` reference dies with doc. User still has Firebase account + workspace membership, but no player capabilities. SelfLog FAB disappears. User is effectively demoted to whatever non-player roles they hold (if any). If none → back to pending-approval blocker until admin acts.

**Case: Admin wants to disable a member's access without deleting** — Settings → Members → set roles to `[]`. User is effectively kicked without losing their PBleagues link; admin can restore roles later. For full removal, admin sets roles to `[]` AND removes uid from `members[]` (separate explicit action, requires confirmation modal).
```

---

## Edit 6 — Update § 38 header metadata (optional but recommended)

**Find line near top of § 38:**
```
## 38. Security Role System + View Switcher (approved April 17, 2026 — awaiting implementation)
```

**Replace with:**
```
## 38. Security Role System + View Switcher (approved April 17, 2026, extended April 20, 2026 — Path A chosen, awaiting implementation)
```

This signals to future readers that § 38 had a v2 revision.

---

## Edit 7 — Update top-of-file "Last updated"

**Find:**
```
## Last updated: 2026-04-13 by Opus
```

(or whatever the current value is at the very top of DESIGN_DECISIONS.md)

**Replace with:**
```
## Last updated: 2026-04-20 by Opus (§ 38 v2 — multi-role + PBleagues matching)
```
