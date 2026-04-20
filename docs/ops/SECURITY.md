# Security Roadmap — PbScoutPro

## Current state: CRITICAL ⚠️

| Issue | Severity | Status |
|-------|----------|--------|
| Firestore rules `allow: if true` | 🔴 Critical | Rules updated in repo, needs deploy |
| No Firebase Auth | 🔴 Critical | Needs implementation |
| Admin = `##` prefix in localStorage | 🔴 Critical | Needs server-side check |
| .env committed to git | 🟡 Medium | ✅ Fixed (removed from tracking) |
| No rate limiting | 🟡 Medium | Firebase rules handle basic cases |
| API key in ScheduleImport | 🟢 Low | User's own key, component state only |

---

## Implementation plan

### Phase 1: Firebase Anonymous Auth (MINIMUM — do first)

Firebase Anonymous Auth gives each device a unique `uid` without requiring
email/password. Combined with Firestore rules, this prevents unauthenticated
API access.

**Step 1: Enable Anonymous Auth in Firebase Console**
1. Go to Firebase Console → Authentication → Sign-in method
2. Enable "Anonymous" provider
3. Save

**Step 2: Add auth to firebase.js**
```javascript
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

const auth = getAuth(app);
export { auth };

// Auto sign-in on app load
export async function ensureAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth).then(cred => resolve(cred.user));
      }
    });
  });
}
```

**Step 3: Update useWorkspace.jsx**
```javascript
import { ensureAuth } from '../services/firebase';

// In enterWorkspace():
const user = await ensureAuth();
// ... existing workspace logic ...
// Add uid to workspace members list:
await setDoc(ref, {
  members: arrayUnion(user.uid),
  lastAccess: serverTimestamp(),
}, { merge: true });
```

**Step 4: Deploy Firestore rules**
```bash
firebase deploy --only firestore:rules
```

**Result:** Anonymous users get a uid → Firestore rules check uid in members array → only workspace members can access data.

### Phase 2: Workspace passwords (hashed)

Currently: slug IS the password (anyone who guesses "ranger1996" is in).
Fix: store password hash, verify on join.

**Workspace document structure:**
```javascript
{
  name: "Ranger 1996",
  passwordHash: "sha256_of_password",  // NEW
  members: ["uid1", "uid2", ...],       // NEW — array of Firebase Auth uids
  adminUid: "uid1",                     // NEW — workspace creator
  createdAt: Timestamp,
  lastAccess: Timestamp,
}
```

**Join flow:**
1. User types workspace code (e.g. "Ranger1996")
2. App hashes it: `sha256(code)` → looks up workspace where `passwordHash` matches
3. If found → add user's anonymous uid to `members` array
4. If not found → offer to create new workspace with this password

**Why hash, not plaintext?** If someone reads the workspace document (which is
possible with read:true on workspace level), they see a hash, not the password.

### Phase 3: Admin verification (server-side)

Currently: `isAdmin` in localStorage = anyone can fake it.

Fix: Store `adminUid` in workspace doc. Firestore rules check:
```
allow delete: if resource.data.adminUid == request.auth.uid;
```

The admin is the person who CREATED the workspace. Transfer possible by
updating `adminUid` field (only current admin can do this via rules).

In the app: check `workspace.adminUid === auth.currentUser.uid` instead
of `workspace.isAdmin`.

---

## What NOT to worry about

- **Firebase API key in code**: This is a frontend key, designed to be public.
  Firebase security comes from Firestore rules, not API key secrecy.
- **Layout images**: Base64 in Firestore. No file upload attack vector.
- **XSS**: React auto-escapes. No `dangerouslySetInnerHTML` in codebase.
- **CSRF**: Not applicable (no cookies, no server).

---

## Deploy order

1. ✅ Remove .env from git (done)
2. Enable Anonymous Auth in Firebase Console (manual, 2 min)
3. Update firebase.js + useWorkspace.jsx (Claude Code)
4. Deploy Firestore rules: `firebase deploy --only firestore:rules`
5. Test: verify existing workspaces still accessible
6. Add password hashing (Phase 2)
7. Add admin verification (Phase 3)
