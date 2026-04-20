# CC_BRIEF_SECURITY_ROLES_V2.md (REWRITTEN — supersedes prior version of this file)

> **Generated:** 2026-04-20 by Opus (second revision)
> **Decision source:** `docs/DESIGN_DECISIONS.md` § 38 v2 (§§ 38.1-38.14, including newly-added 38.12-38.14)
> **Supersedes:** prior version of this file from earlier today (single-role + email matching)
> **Branch:** `feat/security-roles-v2`
> **Deploy strategy:** between matches, iPhone validation before upcoming Sunday
> **Emergency restore:** ADMIN_EMAILS (`jacek@epicsports.pl`) — always retains admin
> **Estimated total time:** 12-18h (up from 10-14h due to multi-role + PBleagues onboarding)

---

## Key changes from v1 (READ THIS FIRST)

v1 of this brief assumed:
- Single role per user (`userRoles[uid] = 'coach'`)
- Email-based player matching (inherited from SelfLog Tier 1)
- Default role for new user = `'player'` auto-assigned

v2 requires:
- **Multi-role per user** (`userRoles[uid] = ['admin', 'coach', 'player']` — array)
- **PBleagues ID matching** as mandatory registration gate (no email fallback)
- **Default roles = `[]`** — admin must explicitly assign in Settings before user gets any capability

If you already started implementing v1 on this branch: STOP, commit what you have with message `WIP v1 approach — superseded`, then start fresh from this brief's Commit 1.

---

## Context — reading order

1. `docs/DESIGN_DECISIONS.md` § 38 v2 (full). Pay special attention to NEW subsections 38.12 (PBleagues matching), 38.13 (admin approval gate), 38.14 (edge cases).
2. `docs/DESIGN_DECISIONS.md` § 27 (Apple HIG)
3. `docs/DESIGN_DECISIONS.md` § 37 (doc discipline)
4. `docs/PROJECT_GUIDELINES.md` § 1 + § 8
5. `src/hooks/useWorkspace.jsx` (current)
6. `src/hooks/useFeatureFlag.js` (current)
7. `src/hooks/useSelfLogIdentity.js` (SelfLog Tier 1 — will be replaced)
8. `firestore.rules` (current — you will rewrite)
9. `src/components/MoreTabContent.jsx` (where View Switcher will live)
10. This brief

**Non-negotiable:** § 38 v2 is the contract. Do NOT deviate silently. If any spec here contradicts § 38 v2, STOP and ask — assume § 38 wins.

---

## Goal

1. Replace legacy role system with multi-role authorization (array of roles per user).
2. Add PBleagues ID as mandatory account linking during onboarding (no email fallback).
3. Add admin approval gate — new users land in pending state until admin assigns at least one role.
4. Add View Switcher for admin UI impersonation, adapted for multi-role.
5. Ship behind feature branch, validate on iPhone before merging.

**Non-goals (out of scope for this brief):**
- SelfLog Tier 2 UI ("Mój dzień", edit modals) — separate brief after this lands
- Cryptographic PBleagues suffix verification (future — current is soft-verification)
- Multi-workspace user support
- Audit log of role changes
- Email invitations / magic links

---

## Pre-work verification (do this BEFORE touching code)

Run these commands, paste output to Jacek in your first status message:

```bash
git pull origin main
git log --oneline -10

# Role system surface area
grep -rn "workspace.role" src/ | wc -l
grep -rn "workspace.adminUid" src/ | wc -l
grep -rn "ADMIN_EMAILS" src/
grep -rn "useSelfLogIdentity" src/

# PBleagues field — verify current data shape
grep -rn "pbliId" src/
grep -rn "pbleagues" src/ | grep -iv node_modules

# Role consumers
grep -rln "useWorkspace\|useFeatureFlag" src/pages/ src/components/

# Rules + indexes
wc -l firestore.rules
cat firestore.indexes.json | head -40

# Branch
git checkout -b feat/security-roles-v2
```

**Flags to raise before coding if found:**
- `pbliId` field does NOT exist in `players/` collection → STOP, ask Jacek for actual field name
- `workspace.role` has 50+ sites → scope bigger than estimated, report
- `useSelfLogIdentity` used in more files than expected → flag, it's being deprecated

---

## Scope — 4 commits on `feat/security-roles-v2`

1. **Foundation + PBleagues onboarding** (heaviest — ~5-7h)
2. **Settings UI (Members tab + pending approvals)**
3. **View Switcher**
4. **Firestore rules + legacy cleanup**

Each commit independently buildable. Do NOT squash.

---

## Commit 1 — Foundation + PBleagues onboarding

**Goal:** Multi-role resolution works. New users go through PBleagues match screen. Migration pre-populates `userRoles` arrays. Existing active users see app identically to before.

### 1.1 Create `src/utils/roleUtils.js`

```javascript
export const ROLES = ['admin', 'coach', 'scout', 'viewer', 'player'];
export const ADMIN_EMAILS = ['jacek@epicsports.pl'];
export const PBLI_ID_FULL_REGEX = /^#?\d+-\w+$/;

export function getRolesForUser(workspace, uid) {
  if (!workspace || !uid) return [];
  const roles = workspace.userRoles?.[uid];
  return Array.isArray(roles) ? roles : [];
}

export function hasRole(roles, target) {
  return Array.isArray(roles) && roles.includes(target);
}

export function hasAnyRole(roles, ...targets) {
  return targets.some(t => hasRole(roles, t));
}

export function isAdmin(workspace, user) {
  if (!workspace || !user) return false;
  const roles = getRolesForUser(workspace, user.uid);
  if (hasRole(roles, 'admin')) return true;
  if (workspace.adminUid === user.uid) return true;
  if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) return true;
  return false;
}

export function isPendingApproval(workspace, uid) {
  if (!workspace || !uid) return false;
  const roles = getRolesForUser(workspace, uid);
  return roles.length === 0 && workspace.members?.includes(uid);
}

export const canWriteScouting = (roles) => hasAnyRole(roles, 'admin', 'coach', 'scout');
export const canEditTactics   = (roles) => hasAnyRole(roles, 'admin', 'coach');
export const canManageMembers = (roles) => hasRole(roles, 'admin');
export const canWriteSelfLog  = (roles) => hasRole(roles, 'player');
export const canReadOnly      = (roles) => hasRole(roles, 'viewer') && roles.length === 1;

export function canAccessRoute(roles, routePath) {
  if (roles.length === 0) {
    return routePath === '/onboarding/pbleagues' || routePath === '/pending-approval';
  }
  if (hasRole(roles, 'admin')) return true;
  if (routePath.startsWith('/settings/members')) return false;
  if (routePath.startsWith('/debug/flags')) return false;
  if (hasRole(roles, 'coach')) return true;
  if (hasRole(roles, 'scout')) {
    if (routePath.startsWith('/layout/') && !routePath.includes('/analytics/')) return false;
    return true;
  }
  if (hasRole(roles, 'viewer')) return true;
  if (hasRole(roles, 'player')) {
    if (routePath === '/') return true;
    if (routePath.startsWith('/player/')) return true;
    if (routePath.startsWith('/tournament/') && routePath.includes('/team/')) return true;
    if (routePath.includes('/match/')) return false;
    if (routePath.startsWith('/layout/')) return false;
    return false;
  }
  return false;
}

export function parsePbliId(raw) {
  const trimmed = String(raw || '').trim();
  if (!PBLI_ID_FULL_REGEX.test(trimmed)) return { error: 'INVALID_FORMAT' };
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}

export function normalizePbliId(raw) {
  return String(raw || '').replace(/^#/, '').trim();
}
```

### 1.2 Refactor `src/hooks/useWorkspace.jsx`

Changes:
1. Remove `##` and `?` prefix parsing
2. Add computed `roles` via `getRolesForUser(workspace, user.uid)`
3. Add computed `isAdmin` via `isAdmin()` from roleUtils
4. Add computed `isPendingApproval` via `isPendingApproval()`
5. Add `linkedPlayer` computation — query players where `linkedUid === user.uid`
6. Migration trigger on load (admin only): if `rolesVersion !== 2`, call `migrateWorkspaceRoles(slug)` with progress toast

Return shape:
```javascript
{
  workspace,
  user,
  roles,              // array, may be empty
  isAdmin,            // computed boolean
  isPendingApproval,  // true if linked but no roles
  linkedPlayer,       // player doc, or null
  loading, error,
  // ... existing methods
}
```

### 1.3 Refactor `src/hooks/useFeatureFlag.js`

- Replace single `getRole()` with `getRoles()` array
- Remove implicit `scout` fallback
- All capability checks use multi-role helpers from roleUtils

### 1.4 Create `src/pages/PbleaguesOnboardingPage.jsx`

Route: `/onboarding/pbleagues` (protected: requires auth, no workspace role required).

Layout:
- Full-screen modal-style, no header, no nav
- Title: "Podłącz profil gracza" (21px/700)
- Paragraph: "Aby korzystać z aplikacji, podłącz swój profil z pbleagues.com. Jeśli nie masz konta, załóż je najpierw na pbleagues.com, a następnie wróć tutaj."
- External link button: "Otwórz pbleagues.com ↗" (new tab)
- Input field `Player ID`, placeholder `61114-8236`
- Help text: "Znajdziesz go w profilu na pbleagues.com → Settings → Player ID. Format: NNNNN-NNNN (np. 61114-8236)"
- Submit button `Podłącz profil` (accent, 52px, disabled until regex valid)
- Inline error above input on match failure
- Success state: replaces form with "✓ Konto zatwierdzone. Czekaj na przypisanie roli przez admina." + "Sprawdź status" + "Wyloguj się"

Styling: `ui.jsx` components + theme tokens, § 27 compliant.

### 1.5 Create `src/pages/PendingApprovalPage.jsx`

Route: `/pending-approval` (protected: auth + linked player + empty roles).

Layout:
- Full-screen blocker
- Title: "Czekamy na zatwierdzenie"
- Text: "Twoje konto jest podłączone do profilu {linkedPlayer.name} #{linkedPlayer.number}. Admin musi przypisać Ci rolę. Skontaktuj się: {adminEmail}"
- Primary: `Odśwież status` → re-fetch workspace → redirect if roles now assigned
- Secondary: `Wyloguj się`

### 1.6 Routing gate in `src/App.jsx`

After auth + workspace load:
1. No `linkedPlayer` AND not in `members`? → redirect `/onboarding/pbleagues`
2. `linkedPlayer` exists but empty `roles`? → redirect `/pending-approval`
3. Has `roles`? → proceed (with `canAccessRoute` guard on protected routes)

Implement as `<AuthGate>` wrapper around Routes.

### 1.7 Add PBleagues functions to `src/services/dataService.js`

```javascript
export async function findPlayerByPbliId(workspaceSlug, systemId) {
  const normalizedInput = normalizePbliId(systemId);
  const playersRef = collection(db, 'workspaces', workspaceSlug, 'players');
  const snap = await getDocs(playersRef);
  const matches = [];
  snap.forEach(doc => {
    const dbId = normalizePbliId(doc.data().pbliId);
    if (dbId === normalizedInput) {
      matches.push({ id: doc.id, ...doc.data() });
    }
  });
  return matches;
}

export async function linkPbliPlayer(workspaceSlug, playerId, uid, fullId) {
  const wsRef = doc(db, 'workspaces', workspaceSlug);
  const playerRef = doc(db, 'workspaces', workspaceSlug, 'players', playerId);
  
  return runTransaction(db, async (tx) => {
    const playerSnap = await tx.get(playerRef);
    const wsSnap = await tx.get(wsRef);
    if (!playerSnap.exists() || !wsSnap.exists()) throw new Error('NOT_FOUND');
    
    const playerData = playerSnap.data();
    if (playerData.linkedUid && playerData.linkedUid !== uid) {
      throw new Error('ALREADY_LINKED');
    }
    
    tx.update(playerRef, {
      linkedUid: uid,
      pbliIdFull: fullId,
      linkedAt: serverTimestamp(),
    });
    
    const currentRoles = wsSnap.data().userRoles?.[uid];
    if (currentRoles === undefined) {
      tx.update(wsRef, {
        members: arrayUnion(uid),
        [`userRoles.${uid}`]: [],
        pendingApprovals: arrayUnion(uid),
      });
    }
  });
}

export async function approveUserRoles(workspaceSlug, targetUid, roles) {
  const wsRef = doc(db, 'workspaces', workspaceSlug);
  await updateDoc(wsRef, {
    [`userRoles.${targetUid}`]: roles,
    pendingApprovals: arrayRemove(targetUid),
  });
}

export async function updateUserRoles(workspaceSlug, targetUid, roles) {
  const wsRef = doc(db, 'workspaces', workspaceSlug);
  await updateDoc(wsRef, {
    [`userRoles.${targetUid}`]: roles,
  });
}

export async function transferAdmin(workspaceSlug, fromUid, toUid) {
  const wsRef = doc(db, 'workspaces', workspaceSlug);
  return runTransaction(db, async (tx) => {
    const wsSnap = await tx.get(wsRef);
    const ws = wsSnap.data();
    
    const fromRoles = (ws.userRoles?.[fromUid] || []).filter(r => r !== 'admin');
    const finalFromRoles = fromRoles.length > 0 ? fromRoles : ['coach'];
    
    const toRoles = ws.userRoles?.[toUid] || [];
    const finalToRoles = toRoles.includes('admin') ? toRoles : [...toRoles, 'admin'];
    
    tx.update(wsRef, {
      adminUid: toUid,
      [`userRoles.${toUid}`]: finalToRoles,
      [`userRoles.${fromUid}`]: finalFromRoles,
      adminTransferredAt: serverTimestamp(),
    });
  });
}

export async function migrateWorkspaceRoles(slug) {
  const wsRef = doc(db, 'workspaces', slug);
  const wsSnap = await getDoc(wsRef);
  if (!wsSnap.exists()) throw new Error('Workspace not found');
  
  const ws = wsSnap.data();
  if (ws.rolesVersion === 2) return { skipped: true, reason: 'already-migrated' };
  
  const members = ws.members || [];
  const userRoles = {};
  
  for (const uid of members) {
    const roles = [];
    if (uid === ws.adminUid) roles.push('admin');
    if (await hasEverWritten(uid)) {
      if (!roles.includes('coach')) roles.push('coach');
    }
    const linkedPlayerQuery = query(
      collection(db, 'workspaces', slug, 'players'),
      where('linkedUid', '==', uid),
      limit(1)
    );
    const linkedPlayerSnap = await getDocs(linkedPlayerQuery);
    if (!linkedPlayerSnap.empty && !roles.includes('player')) {
      roles.push('player');
    }
    userRoles[uid] = roles;
  }
  
  await updateDoc(wsRef, {
    userRoles,
    rolesVersion: 2,
    migratedAt: serverTimestamp(),
  });
  
  return { migrated: Object.keys(userRoles).length, userRoles };
}

async function hasEverWritten(uid) {
  const checks = [
    { cg: 'points', field: 'homeData.scoutedBy' },
    { cg: 'points', field: 'awayData.scoutedBy' },
    { cg: 'tactics', field: 'createdBy' },
    { cg: 'notes', field: 'createdBy' },
  ];
  for (const { cg, field } of checks) {
    const q = query(collectionGroup(db, cg), where(field, '==', uid), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return true;
  }
  return false;
}
```

**Firestore indexes** — verify or add in `firestore.indexes.json`:
- Collection group `points`: `homeData.scoutedBy ASC`, `awayData.scoutedBy ASC`
- Collection group `tactics`: `createdBy ASC`
- Collection group `notes`: `createdBy ASC`
- Collection `players` (within workspace subcollection): `linkedUid ASC` — **needed for `linkedPlayer` lookup**

Deploy indexes BEFORE migration: `firebase deploy --only firestore:indexes`. Wait for build (5-30 min).

### 1.8 Update all role consumers

Grep `workspace.role` and replace with multi-role API:
```javascript
// Before:
if (workspace.role === 'coach') { ... }

// After — use capability helper:
if (canWriteScouting(roles)) { ... }
// or role-specific if needed:
if (hasRole(roles, 'coach')) { ... }
```

Known sites (verify with grep):
- `src/pages/MatchPage.jsx` (~55, 57)
- `src/pages/ScoutedTeamPage.jsx` (~215)
- `src/components/MoreTabContent.jsx` (~32)
- `src/components/ScoutTabContent.jsx` (~27)
- `src/hooks/useFeatureFlag.js` (~12)

Replace direct admin checks (`user.email === 'jacek@epicsports.pl'`) with `isAdmin()` from roleUtils.

### 1.9 Deprecate `useSelfLogIdentity`

Email-based identity from SelfLog Tier 1 is replaced by `linkedPlayer` from useWorkspace:
- Update `useSelfLogIdentity.js` to delegate: `const { linkedPlayer } = useWorkspace(); return { playerId: linkedPlayer?.id, playerName: linkedPlayer?.name };`
- Add deprecation comment: `// DEPRECATED: this hook now delegates to useWorkspace.linkedPlayer. Migrate consumers in a future commit.`

### 1.10 i18n additions

Add PL + EN to `src/utils/i18n.js`:

```
onboarding_pbli_title, onboarding_pbli_body,
onboarding_pbli_open_pbleagues, onboarding_pbli_input_label,
onboarding_pbli_input_placeholder, onboarding_pbli_input_help,
onboarding_pbli_submit, onboarding_pbli_error_invalid_format,
onboarding_pbli_error_not_found, onboarding_pbli_error_already_linked,
onboarding_pbli_success_title, onboarding_pbli_success_body,
onboarding_pbli_success_refresh,
pending_approval_title, pending_approval_body,
pending_approval_refresh, pending_approval_signout
```

### Definition of done — Commit 1

- [ ] `roleUtils.js` created with all helpers (pure, unit-testable)
- [ ] `useWorkspace()` returns `{ roles, isAdmin, isPendingApproval, linkedPlayer, ... }`
- [ ] Zero `##` / `?` prefix parsing remains
- [ ] `useSelfLogIdentity` delegates to `linkedPlayer`
- [ ] PbleaguesOnboardingPage + PendingApprovalPage styled per § 27
- [ ] AuthGate routes unlinked → onboarding, pending → approval screen
- [ ] All ~5 role consumers use multi-role API
- [ ] Migration tested manually on dev workspace
- [ ] i18n PL + EN complete
- [ ] Precommit passes
- [ ] Existing active coach/scout see app identically to before
- [ ] Commit message: `feat(security): foundation + PBleagues onboarding (§ 38.1-38.4, 38.7-38.8, 38.12, 38.14)`

---

## Commit 2 — Settings UI (Members tab + pending approvals)

**Goal:** Admin sees all members, approves pending users with initial roles, updates existing roles, transfers admin. Pending approvals get dedicated section at top.

### 2.1 Create `src/pages/MembersPage.jsx`

Route: `/settings/members` (admin-only, redirect with toast if not admin).

Sections top-to-bottom:
1. **Pending approvals** — header `Oczekują zatwierdzenia (N)`, renders only if `pendingApprovals.length > 0`
2. **Active members** — header `Członkowie (N)`
3. **Admin transfer** button at bottom

### 2.2 Create `src/components/settings/PendingMemberCard.jsx`

Per pending user:
- Avatar: initials on colored circle (use linkedPlayer.name + number)
- Primary: player name + #number + team name
- Secondary: PBLI #{pbliId} + user email
- Role multi-select chips: `[Admin] [Coach] [Scout] [Viewer] [Player]` — toggleable, `[Player]` pre-selected
- Primary button `Zatwierdź` (disabled if zero roles selected)
- `⋮` menu: `Odrzuć` (remove from workspace, unlink player)

### 2.3 Create `src/components/settings/MemberCard.jsx`

Active member card:
- Same avatar + info layout
- Role chips read-only by default + "Edytuj" button
- Tap Edytuj → chips become toggleable + Save/Cancel
- Self-protection: current user's admin chip disabled if they hold admin (tooltip "Aby zmienić swoją rolę, najpierw przekaż admina")
- `⋮` menu: `Transferuj admina do tego użytkownika` (admin-only, target must not already be admin), `Usuń z workspace`

### 2.4 Create `src/components/settings/RoleTransferModal.jsx`

Per § 38.3 semantics:
- Warning: "Przekazanie admina do {name}. Stracisz admin rights i zachowasz: {listOfRemaining}. {name} otrzyma admin + zachowa obecne: {listOfTheirs}. Nieodwracalne przez UI (emergency przez ADMIN_EMAILS zachowane)."
- Input requires typing `TRANSFER` to enable confirm button
- Submit → `transferAdmin(slug, fromUid, toUid)` → toast → redirect to `/`

### 2.5 Create `src/components/ReviewRolesModal.jsx`

Shown on admin's first login post-migration when `migrationReviewedAt === null`:
- Title: "Sprawdź role członków"
- Body: "Zmigrowaliśmy {N} członków do nowego systemu. Aktywni (coach/scout) zachowali uprawnienia. Sprawdź i dostosuj w Settings."
- Primary: `Przejdź do ustawień` → `/settings/members`
- Secondary: `Zrobię to później` → `dismissMemberReview(slug)`

### 2.6 Add link to `src/components/MoreTabContent.jsx`

In Workspace section (admin only):
- Icon: Users (Lucide)
- Label: `Członkowie workspace'u`
- Badge: pending count (amber) if `pendingApprovals.length > 0`

### 2.7 Route registration

```jsx
<Route path="/settings/members" element={<AdminGuard><MembersPage /></AdminGuard>} />
```

`AdminGuard` reads `isAdmin` from `useViewAs()` (not useWorkspace — respects impersonation).

### 2.8 i18n for Members UI

Add all copy keys in PL + EN.

### Definition of done — Commit 2

- [ ] `/settings/members` works, admin-only
- [ ] Pending section with multi-select chips
- [ ] Approve flow saves atomically, moves out of pending
- [ ] Active section renders existing users
- [ ] Edit roles inline, save atomically
- [ ] Self-demote protection works
- [ ] Transfer flow requires TRANSFER typing, atomic, redirects
- [ ] Review prompt shows once per admin
- [ ] Badge shows pending count on More tab
- [ ] § 27 compliant (theme tokens, ui.jsx, 44px targets)
- [ ] i18n complete
- [ ] Precommit passes
- [ ] Commit message: `feat(security): Settings UI for member management + approvals (§ 38.4, 38.13)`

---

## Commit 3 — View Switcher

**Goal:** Admin previews UI as any role. Per-tab state, visible indicator, always-available escape. Adapted for multi-role.

### 3.1 Create `src/contexts/ViewAsContext.jsx`

```jsx
import { createContext, useContext, useState, useEffect } from 'react';

const ViewAsContext = createContext(null);

export function ViewAsProvider({ children, workspaceSlug }) {
  const storageKey = `pbscoutpro_viewAs_${workspaceSlug}`;
  const [viewAs, setViewAs] = useState(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  
  useEffect(() => {
    if (viewAs) sessionStorage.setItem(storageKey, JSON.stringify(viewAs));
    else sessionStorage.removeItem(storageKey);
  }, [viewAs, storageKey]);
  
  return <ViewAsContext.Provider value={{ viewAs, setViewAs }}>{children}</ViewAsContext.Provider>;
}

export function useViewAsContext() {
  return useContext(ViewAsContext);
}
```

Data: `viewAs = { role: string, playerId?: string } | null`.

### 3.2 Create `src/hooks/useViewAs.js`

```javascript
import { useWorkspace } from './useWorkspace';
import { useViewAsContext } from '../contexts/ViewAsContext';

export function useViewAs() {
  const { roles, isAdmin } = useWorkspace();
  const { viewAs, setViewAs } = useViewAsContext();
  
  if (!isAdmin) {
    return {
      effectiveRoles: roles,
      viewAs: null,
      setViewAs: () => {},
      isImpersonating: false,
      viewAsPlayerId: null,
      exitImpersonation: () => {},
    };
  }
  
  const effectiveRoles = viewAs ? [viewAs.role] : roles;
  const isImpersonating = viewAs !== null;
  const viewAsPlayerId = viewAs?.playerId || null;
  
  return {
    effectiveRoles,
    viewAs,
    setViewAs,
    isImpersonating,
    viewAsPlayerId,
    exitImpersonation: () => setViewAs(null),
  };
}
```

### 3.3 Create `src/components/ViewAsPill.jsx`

In More tab → Account section. Only when `isAdmin === true`.

- Default: ghost variant, eye icon + "Podgląd jako...", `#475569`
- Impersonating: amber border + bg `#f59e0b08`, "Podgląd jako: {role}" + X
- Tap → opens ViewAsDropdown

### 3.4 Create `src/components/ViewAsDropdown.jsx`

ActionSheet:
- Title: "Podgląd jako"
- 5 options (all canonical roles, regardless of admin's own set): Admin, Coach, Scout, Viewer, Player
- `player` selection → close this sheet, open ViewAsPlayerPicker
- Other selections → `setViewAs({ role })` + close
- "Wyjdź z podglądu" at bottom (when impersonating) → `setViewAs(null)`

### 3.5 Create `src/components/ViewAsPlayerPicker.jsx`

Modal:
- Title: "Wybierz gracza do podglądu"
- Search input filters by name
- List: all workspace players (from `workspaces/{slug}/players`), preferring those with `linkedUid != null`
- Each row: avatar + name + #number + team
- On select → `setViewAs({ role: 'player', playerId })` + close

### 3.6 Create `src/components/ViewAsIndicator.jsx`

Rendered at app root. Visible when `isImpersonating`.

- Top strip: `position: fixed; top: 0; left: 0; right: 0; height: 2px; background: COLORS.accent; z-index: 9999`
- Bottom-right pill: `position: fixed; bottom: 16px; right: 16px; z-index: 9999`
  - `COLORS.accent` bg, black text 12px/600
  - "Podgląd jako: {role}" + X button
  - Padding 8px 12px 8px 14px, border-radius full, shadow

### 3.7 Wire into app

**`src/App.jsx`:**
```jsx
<ViewAsProvider workspaceSlug={slug}>
  <ViewAsIndicator />
  <Routes>...</Routes>
</ViewAsProvider>
```

**`src/components/MoreTabContent.jsx`:**
Account section (between Profile and Sign out):
```jsx
{isAdmin && <ViewAsPill />}
```

### 3.8 Update all role consumers to use `effectiveRoles`

Replace `roles` from useWorkspace with `effectiveRoles` from useViewAs in UI gating code.

**`src/hooks/useFeatureFlag.js`:**
```javascript
import { useViewAs } from './useViewAs';
export function useFeatureFlag(flag) {
  const { effectiveRoles } = useViewAs();
  // use effectiveRoles for gating
}
```

### 3.9 Protected routes wrapper

**`src/components/RouteGuard.jsx`:**
```jsx
import { useViewAs } from '../hooks/useViewAs';
import { canAccessRoute } from '../utils/roleUtils';
import { Navigate, useLocation } from 'react-router-dom';

export function RouteGuard({ children }) {
  const { effectiveRoles } = useViewAs();
  const location = useLocation();
  if (!canAccessRoute(effectiveRoles, location.pathname)) {
    return <Navigate to="/" replace state={{ blockedRoute: location.pathname }} />;
  }
  return children;
}
```

MainPage: if `location.state?.blockedRoute`, show toast "Rola nie ma dostępu do {route}".

### 3.10 i18n

```
view_as_pill_label, view_as_pill_active,
view_as_dropdown_title,
view_as_role_admin, view_as_role_coach, view_as_role_scout, view_as_role_viewer, view_as_role_player,
view_as_exit,
view_as_player_picker_title, view_as_player_picker_search, view_as_player_picker_no_linked,
view_as_indicator_pill, view_as_blocked_route_toast
```

### Definition of done — Commit 3

- [ ] ViewAsProvider wraps app, sessionStorage works
- [ ] useViewAs returns single-element effectiveRoles when impersonating
- [ ] ViewAsPill in More → Account for admin only
- [ ] Dropdown offers all 5 roles
- [ ] PlayerPicker works for player impersonation
- [ ] Amber strip visible at top during impersonation
- [ ] Bottom-right pill with X above modals (z-index 9999)
- [ ] Tab close clears impersonation
- [ ] RouteGuard redirects when blocked
- [ ] All role-gated UI uses effectiveRoles
- [ ] i18n complete
- [ ] Precommit passes
- [ ] Commit message: `feat(security): view switcher for admin impersonation (§ 38.5-38.6)`

---

## Commit 4 — Firestore rules + legacy cleanup

**Goal:** Rules enforce multi-role + registration gate. Legacy prefix code fully gone. Backup prev rules. Test before deploy.

### 4.1 Backup current rules

```bash
cp firestore.rules firestore.rules.backup
git add firestore.rules.backup
git commit -m "chore: backup firestore.rules before v2 rewrite"
```

### 4.2 Rewrite `firestore.rules`

Helpers:
```
function getRoles(ws, uid) {
  return get(/workspaces/$(ws)).data.userRoles[uid];
}

function hasRole(ws, uid, target) {
  return target in getRoles(ws, uid);
}

function isAdmin(ws) {
  let uid = request.auth.uid;
  let ws_data = get(/workspaces/$(ws)).data;
  return (uid in ws_data.userRoles && 'admin' in ws_data.userRoles[uid])
      || ws_data.adminUid == uid
      || request.auth.token.email in ['jacek@epicsports.pl'];
}

function isCoach(ws) { return hasRole(ws, request.auth.uid, 'coach') || isAdmin(ws); }
function isScout(ws) { return hasRole(ws, request.auth.uid, 'scout') || isCoach(ws); }
function isPlayer(ws) { return hasRole(ws, request.auth.uid, 'player'); }
function isViewer(ws) { return hasRole(ws, request.auth.uid, 'viewer'); }
function isMember(ws) { return request.auth.uid in get(/workspaces/$(ws)).data.members; }
```

Paths:
```
match /workspaces/{ws} {
  allow read: if isMember(ws);
  allow update: if isAdmin(ws);
  
  // Player linking (§ 38.12) — allow user to link themselves to an unlinked player
  match /players/{pid} {
    allow read: if isMember(ws);
    allow update: if isCoach(ws)
                  || (request.auth != null
                      && resource.data.linkedUid == null
                      && request.resource.data.linkedUid == request.auth.uid
                      && request.resource.data.diff(resource.data).affectedKeys()
                          .hasOnly(['linkedUid', 'pbliIdFull', 'linkedAt']));
  }
  
  match /tournaments/{tid}/{document=**} {
    allow read: if isMember(ws);
    allow write: if isScout(ws);
  }
  
  match /trainings/{tid}/{document=**} {
    allow read: if isMember(ws);
    allow write: if isScout(ws);
  }
  
  match /layouts/{lid}/{document=**} {
    allow read: if isMember(ws);
    allow write: if isCoach(ws);
  }
  
  match /teams/{teamId}/{document=**} {
    allow read: if isMember(ws);
    allow write: if isCoach(ws);
  }
  
  match /notes/{nid} {
    allow read: if isMember(ws);
    allow write: if isCoach(ws);
  }
}

// Self-log shots
match /workspaces/{ws}/tournaments/{tid}/matches/{mid}/points/{pid}/shots/{sid} {
  allow read: if isMember(ws);
  allow create: if isScout(ws)
             || (isPlayer(ws) && request.resource.data.source == 'self');
  allow update, delete: if isScout(ws)
                     || (isPlayer(ws)
                         && resource.data.source == 'self'
                         && resource.data.scoutedBy == request.auth.uid);
}
```

**Comment in rules:** "player self-log `playerId` claim is client-side trust. Server validates `source=='self'` and `scoutedBy==uid` but NOT claimed `playerId`. Workspace members are invited — attack surface contained. Full server validation deferred."

### 4.3 Legacy cleanup

Final grep-and-destroy:
```bash
grep -rn "##" src/hooks/ src/pages/ | grep -v "node_modules"
grep -rn "'?'" src/hooks/ | grep -v "node_modules"
grep -rn "role === 'scout' ||" src/
grep -rn "fallback.*scout" src/
```

Remove any remaining `##`/`?` prefix parsing, `'scout'` fallbacks, direct email comparisons, unused imports.

### 4.4 Deploy sequence (coordinate with Jacek)

**Pre-flight:**
1. All indexes built in Firebase console
2. `firestore.rules.backup` exists in repo
3. Jacek's iPhone available for immediate testing

**Deploy order:**
```bash
# AFTER Jacek's iPhone validation — DO NOT merge blindly
git checkout main
git merge --no-ff feat/security-roles-v2
git push origin main

firebase deploy --only firestore:indexes  # Wait for build
npm run deploy                             # App code
firebase deploy --only firestore:rules     # Rules LAST — rollback target

# Monitor Firestore → Rules → denied requests for 30 min
```

**Rollback:**
```bash
# Rules rollback (most common)
cp firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules

# Full rollback
git revert <merge-commit> && git push
npm run deploy
```

**ADMIN_EMAILS works even with broken rules** — Jacek's app-layer admin check grants access regardless of Firestore state. Not locked out.

### Definition of done — Commit 4

- [ ] Rules fully rewritten with multi-role helpers
- [ ] Legacy prefix/fallback code removed (greps clean)
- [ ] Rules playground tested: role × path matrix (see testing plan)
- [ ] Indexes deployed
- [ ] `firestore.rules.backup` committed
- [ ] Precommit passes
- [ ] Commit message: `feat(security): Firestore rules v2 + legacy cleanup (§ 38.9)`

---

## Testing plan (mandatory before merge)

### Desktop (Chrome) — foundation

- [ ] Clear storage, login as fresh email → redirect `/onboarding/pbleagues`
- [ ] Invalid format → inline error
- [ ] Non-existent ID → "Nie znaleziono"
- [ ] Valid unlinked ID → success + redirect `/pending-approval`
- [ ] ID already linked to different uid → "Już podłączony"

### Desktop — admin flow

- [ ] Login as Jacek → migration runs → Review modal → Members page
- [ ] Pending section lists new test users
- [ ] Approve with `[Player]` → user leaves pending
- [ ] Approve with `[Coach, Player]` → user gets both
- [ ] Edit existing user roles → Firestore + UI update
- [ ] Self-demote admin chip → disabled with tooltip
- [ ] Transfer admin to another user → type TRANSFER → redirect as coach
- [ ] Re-login via ADMIN_EMAILS from different session → admin restored

### Desktop — View Switcher

- [ ] More → Account → ViewAsPill visible (admin only)
- [ ] Dropdown → Coach → amber strip + indicator pill + coach view
- [ ] While impersonating coach, visit `/settings/members` → blocked, toast, redirect
- [ ] Exit impersonation → admin restored
- [ ] Player impersonation → PlayerPicker → pick self → SelfLog FAB visible, own stats only
- [ ] Viewer impersonation → all CTAs hidden
- [ ] Close tab, reopen → impersonation cleared

### iPhone (Jacek — REQUIRED)

- [ ] Onboarding flow on real device (register test account, link)
- [ ] Members tab readable, 44px+ targets, chips tappable
- [ ] ViewSwitcher: amber strip visible, not clipped by notch/status
- [ ] PlayerPicker scrollable, search works
- [ ] With `player` role: FAB in MatchPage, HotSheet works

### iPhone (other coach — Tymek/Sławek)

- [ ] Login (existing) → no onboarding (migrated)
- [ ] Coach view identical to before
- [ ] Scout point → save succeeds
- [ ] `/settings/members` manually → blocked
- [ ] No ViewAsPill (not admin)

### Rules playground (Firebase console)

- [ ] Admin updates workspace.userRoles → ALLOW
- [ ] Coach writes match point → ALLOW
- [ ] Scout writes match point → ALLOW
- [ ] Player writes match point (non-self-log) → DENY
- [ ] Player writes self-log with source=self → ALLOW
- [ ] Player writes self-log without source → DENY
- [ ] Viewer writes anything → DENY
- [ ] Unlinked player links self (linkedUid = own uid) → ALLOW
- [ ] User sets linkedUid to OTHER uid → DENY
- [ ] User modifies already-linked player → DENY

---

## Git workflow

```bash
git checkout main && git pull origin main
git checkout -b feat/security-roles-v2

# Commit 1 (foundation + onboarding)
npm run precommit
git add -A
git commit -m "feat(security): foundation + PBleagues onboarding (§ 38.1-38.4, 38.7-38.8, 38.12, 38.14)"
git push -u origin feat/security-roles-v2

# Commit 2 (Settings UI)
npm run precommit
git add -A
git commit -m "feat(security): Settings UI for member management + approvals (§ 38.4, 38.13)"
git push

# Commit 3 (View Switcher)
npm run precommit
git add -A
git commit -m "feat(security): view switcher for admin impersonation (§ 38.5-38.6)"
git push

# Commit 4a (backup rules)
git add firestore.rules.backup
git commit -m "chore: backup firestore.rules before v2 rewrite"

# Commit 4b (rules + cleanup)
npm run precommit
git add -A
git commit -m "feat(security): Firestore rules v2 + legacy cleanup (§ 38.9)"
git push

# WAIT FOR JACEK'S iPHONE VALIDATION. DO NOT MERGE.

# After approval:
git checkout main && git merge --no-ff feat/security-roles-v2 && git push origin main
firebase deploy --only firestore:indexes
npm run deploy
firebase deploy --only firestore:rules
```

---

## Documentation updates (MANDATORY before merge, per § 37.2)

Before merging:

1. **`DEPLOY_LOG.md`** — prepend entry: commit SHAs, what changed, known issues (especially: playerId claim client-side deferred)
2. **`docs/ops/HANDOVER.md`** — patch:
   - Move "Security refactor path (A vs B)" OUT of awaiting decision
   - Add to "Recently shipped" with commit SHA
   - Remove from "Next on deck"
   - Add SelfLog Tier 2 as new priority 1 (unblocked by security)
   - Bump "Last updated" + HEAD SHA
3. **`NEXT_TASKS.md`** — refresh. SelfLog Tier 2 top priority.

Commit together with merge:
```bash
git add DEPLOY_LOG.md docs/ops/HANDOVER.md NEXT_TASKS.md
git commit -m "docs: update after security roles v2 deploy"
git push
```

---

## Final report format (after deploy)

```
§ 27 self-review:
[PASS/NEEDS FIXES per section — see REVIEW_CHECKLIST.md]

Deploy summary:
- Branch feat/security-roles-v2 merged as <sha>
- 5 commits (list with sha + message, incl backup)
- Rules deployed: yes/no
- Indexes deployed: yes/no
- Migration run: yes, N members migrated (breakdown by role combo)
- Test matrix: desktop X/Y, iPhone X/Y, rules X/Y

Known issues / deferred:
- PBleagues suffix is soft-verification (not cryptographically verified)
- Player self-log playerId claim is client-side (server validation deferred)
- <any other>

Ready for iPhone validation. Please test before Sunday match.
```

---

## Questions for Jacek during implementation

Stop-and-ask triggers:
- `pbliId` field shape doesn't match spec (no `#` prefix, different separator, etc.)
- Migration reveals users with activity not fitting coach/player heuristic
- Rules deny legitimate writes during testing
- Routes not covered by `canAccessRoute` matrix
- Any Path A/B re-emergence due to scope creep

**Default when ambiguous:** safer side (deny > allow, preserve > delete, ask > guess).

---

## Reference: § 38 subsection-to-commit mapping

| § 38 subsection | Commit |
|---|---|
| 38.1 Problem statement | Reference |
| 38.2 Multi-role model | Commit 1 (roleUtils) |
| 38.3 Admin determination | Commit 1 (isAdmin) |
| 38.4 Role assignment Settings | Commit 2 |
| 38.5 View Switcher | Commit 3 |
| 38.6 Protected routes matrix | Commit 1 (canAccessRoute) + Commit 3 (RouteGuard) |
| 38.7 Migration strategy | Commit 1 (migrateWorkspaceRoles) |
| 38.8 Data model changes | Commit 1 (userRoles array + linkedUid) |
| 38.9 Firestore rules outline | Commit 4 |
| 38.10 Anti-patterns | Reference |
| 38.11 Path A chosen | Context |
| 38.12 PBleagues ID matching | Commit 1 (onboarding + linking) |
| 38.13 Admin approval gate | Commits 1 + 2 (pending state + UI) |
| 38.14 Re-verification edge cases | Commits 1 + 2 (rules + Settings) |

---

End of brief.
