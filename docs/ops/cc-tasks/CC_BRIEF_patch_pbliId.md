# CC_BRIEF_SECURITY_ROLES_V2.md — pbliId Field Rename Patch

> **Context:** Field rename patch. Brief references `pbleaguesId` / `pbleaguesIdFull`, actual codebase uses `pbliId` (confirmed). Data format confirmed via live Firestore samples: plain numeric strings like `"61114"`, `"166646"` (no `#`, no suffix).
>
> Apply these edits to `docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md`.

---

## Edit 1 — Section 1.1 `roleUtils.js` constants + helpers

**Find:**
```javascript
export const PBLEAGUES_ID_REGEX = /^#?\d+-\w+$/;
```

**Replace with:**
```javascript
export const PBLI_ID_FULL_REGEX = /^#?\d+-\w+$/;
```

**Find the `parsePbleaguesId` function:**
```javascript
export function parsePbleaguesId(raw) {
  const trimmed = String(raw || '').trim();
  if (!PBLEAGUES_ID_REGEX.test(trimmed)) return { error: 'INVALID_FORMAT' };
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}
```

**Replace with:**
```javascript
export function parsePbliId(raw) {
  const trimmed = String(raw || '').trim();
  if (!PBLI_ID_FULL_REGEX.test(trimmed)) return { error: 'INVALID_FORMAT' };
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}
```

**Find:**
```javascript
export function normalizePbleaguesId(raw) {
  return String(raw || '').replace(/^#/, '').trim();
}
```

**Replace with:**
```javascript
export function normalizePbliId(raw) {
  return String(raw || '').replace(/^#/, '').trim();
}
```

---

## Edit 2 — Section 1.4 PbleaguesOnboardingPage

**Find the help text spec line:**
```
- Help text: "Znajdziesz go w profilu na pbleagues.com → Settings → Player ID. Format: NNNNN-NNNN"
```

**Replace with:**
```
- Help text: "Znajdziesz go w profilu na pbleagues.com → Settings → Player ID. Format: NNNNN-NNNN (np. 61114-8236)"
```

No other changes to this section needed — placeholder `61114-8236` stays, title stays "Podłącz profil gracza", etc.

---

## Edit 3 — Section 1.7 dataService functions

**Find `findPlayerByPbleaguesId` function:**
```javascript
export async function findPlayerByPbleaguesId(workspaceSlug, systemId) {
  const normalizedInput = normalizePbleaguesId(systemId);
  const playersRef = collection(db, 'workspaces', workspaceSlug, 'players');
  const snap = await getDocs(playersRef);
  const matches = [];
  snap.forEach(doc => {
    const dbId = normalizePbleaguesId(doc.data().pbleaguesId);
    if (dbId === normalizedInput) {
      matches.push({ id: doc.id, ...doc.data() });
    }
  });
  return matches;
}
```

**Replace with:**
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
```

**Find `linkPbleaguesPlayer` function signature and body:**
```javascript
export async function linkPbleaguesPlayer(workspaceSlug, playerId, uid, fullId) {
```

**Replace function name and update field names inside:**
```javascript
export async function linkPbliPlayer(workspaceSlug, playerId, uid, fullId) {
```

**Inside the same function, find:**
```javascript
    tx.update(playerRef, {
      linkedUid: uid,
      pbleaguesIdFull: fullId,
      linkedAt: serverTimestamp(),
    });
```

**Replace with:**
```javascript
    tx.update(playerRef, {
      linkedUid: uid,
      pbliIdFull: fullId,
      linkedAt: serverTimestamp(),
    });
```

---

## Edit 4 — Section 1.10 i18n additions

**Find the i18n key list block. Replace entire block with:**

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

Route stays `/onboarding/pbleagues` (URL matches external brand, not internal field name — acceptable).

---

## Edit 5 — Commit 1 message

**Find:**
```
git commit -m "feat(security): foundation + PBleagues onboarding (§ 38.1-38.4, 38.7-38.8, 38.12, 38.14)"
```

**No change — commit message references the feature (PBleagues onboarding) which is product-facing language, not the internal field name. Acceptable to keep.**

---

## Edit 6 — Section 2.2 PendingMemberCard spec

**Find line in PendingMemberCard spec:**
```
- Secondary: PBleagues ID + user email
```

**Replace with:**
```
- Secondary: PBLI #{pbliId} + user email
```

---

## Edit 7 — Firestore rules in Section 4.2

**Find in the `/players/{pid}` rule block:**
```
|| (request.auth != null
    && resource.data.linkedUid == null
    && request.resource.data.linkedUid == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['linkedUid', 'pbleaguesIdFull', 'linkedAt']));
```

**Replace with:**
```
|| (request.auth != null
    && resource.data.linkedUid == null
    && request.resource.data.linkedUid == request.auth.uid
    && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['linkedUid', 'pbliIdFull', 'linkedAt']));
```

---

## Edit 8 — Pre-work verification section

**Find:**
```bash
# PBleagues field — verify current data shape
grep -rn "pbleaguesId" src/
grep -rn "pbleagues" src/ | grep -iv node_modules
```

**Replace with:**
```bash
# PBLI field — verify current data shape
grep -rn "pbliId" src/
grep -rn "pbleagues" src/ | grep -iv node_modules
```

Also find:
```
- If `pbleaguesId` field does NOT exist in `players/` collection → STOP, ask Jacek for actual field name
```

**Replace with:**
```
- If `pbliId` field does NOT exist in `players/` collection → STOP, ask Jacek for actual field name
```

---

## Edit 9 — Global grep after edits

After all edits applied, run final check on the brief:
```bash
grep -n "pbleaguesId" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "pbleaguesIdFull" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "normalizePbleaguesId" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "parsePbleaguesId" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "findPlayerByPbleaguesId" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "linkPbleaguesPlayer" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
grep -n "PBLEAGUES_ID_REGEX" docs/archive/cc-briefs/CC_BRIEF_SECURITY_ROLES_V2.md
```

**All should return zero matches.** If any remain, rename them using the mapping:

| Old | New |
|---|---|
| `pbleaguesId` | `pbliId` |
| `pbleaguesIdFull` | `pbliIdFull` |
| `normalizePbleaguesId` | `normalizePbliId` |
| `parsePbleaguesId` | `parsePbliId` |
| `findPlayerByPbleaguesId` | `findPlayerByPbliId` |
| `linkPbleaguesPlayer` | `linkPbliPlayer` |
| `PBLEAGUES_ID_REGEX` | `PBLI_ID_FULL_REGEX` |

**Acceptable `pbleagues` matches (do NOT rename):**
- `pbleagues.com` (external URL)
- `/onboarding/pbleagues` (route — user-facing, matches brand)
- `onboarding_pbleagues_*` → already renamed to `onboarding_pbli_*` via Edit 4, verify
- Commit messages mentioning "PBleagues onboarding" (product-facing language)
- Comments referencing pbleagues.com or PBleagues as service

---

End of patch.
