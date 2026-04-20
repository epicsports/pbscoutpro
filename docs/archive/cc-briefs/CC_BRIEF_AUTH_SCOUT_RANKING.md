# CC_BRIEF_AUTH_SCOUT_RANKING.md
## User Accounts + Scout Ranking System

**Priority:** HIGH — foundation for scout accountability + data trust
**Design specs:** DESIGN_DECISIONS.md section 33
**Dependencies:** Firebase Auth (email/password provider must be enabled in Firebase Console)

**⚠️ IMPORTANT:** The human must enable Email/Password auth in Firebase Console before this works:
Firebase Console → Authentication → Sign-in method → Email/Password → Enable

---

## Part 1: Firebase Auth — email/password login

### Update `src/services/firebase.js`
Firebase Auth is already initialized (anonymous auth). Add email/password methods:

```javascript
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export const auth = getAuth(app);

export async function loginWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}
```

### Auth state management
In App.jsx, replace anonymous auth flow with email-based:
- On mount: check `onAuthStateChanged`
- If logged in → show workspace selector (existing magic word flow)
- If not logged in → show LoginPage
- Remove automatic anonymous sign-in

---

## Part 2: Login page

### New file: `src/pages/LoginPage.jsx`

Simple email/password form. Apple HIG compliant.

**Layout:**
- App logo/title at top
- Email input
- Password input  
- "Log in" button (amber CTA)
- "Create account" link below
- Toggle between login and register modes

**Register mode:**
- Email + Password + Display Name inputs
- "Create account" button
- "Already have an account? Log in" link

**Styling:**
- Centered vertically on screen
- Max-width 320px form
- Use existing Input, Btn components from ui.jsx
- Background: COLORS.bg
- No unnecessary decoration

**Error handling:**
- Invalid credentials → inline error message (red text below form)
- Network error → "Connection failed, try again"
- Weak password → "Password must be at least 6 characters"

---

## Part 3: User profile in Firestore

### New collection: `/users/{uid}`

```javascript
// On first login / registration, create user profile:
{
  email: 'kacper@example.com',
  displayName: 'Kacper',
  role: 'scout,coach,admin',  // comma-separated, all three by default
  workspaces: [],  // future: assigned workspaces
  createdAt: serverTimestamp(),
}
```

### In `src/services/dataService.js`:
```javascript
export async function getOrCreateUserProfile(uid, email, displayName) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  const profile = {
    email,
    displayName: displayName || email.split('@')[0],
    role: 'scout,coach,admin',
    workspaces: [],
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export function subscribeUserProfile(uid, cb) {
  return onSnapshot(doc(db, 'users', uid), snap => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null));
}
```

### Display name resolution
Add a shared hook or utility to resolve UIDs to display names:
```javascript
// Cache of uid → displayName for rendering
export function useUserNames(uids) {
  const [names, setNames] = useState({});
  useEffect(() => {
    if (!uids?.length) return;
    const uniqueUids = [...new Set(uids.filter(Boolean))];
    Promise.all(uniqueUids.map(async uid => {
      const snap = await getDoc(doc(db, 'users', uid));
      return [uid, snap.exists() ? snap.data().displayName : 'Unknown'];
    })).then(pairs => setNames(Object.fromEntries(pairs)));
  }, [uids.join(',')]);
  return names;
}
```

---

## Part 4: Scout ranking page

### New file: `src/pages/ScoutRankingPage.jsx`

Route: add to App.jsx or accessible from More tab / Coach tab.

**Data computation:**
```javascript
function computeScoutStats(points, userNames) {
  const scouts = {};  // { uid: { points: 0, breaks: 0, shots: 0, assigns: 0, ... } }
  
  points.forEach(pt => {
    ['homeData', 'awayData'].forEach(side => {
      const data = pt[side];
      if (!data?.scoutedBy) return;
      const uid = data.scoutedBy;
      if (!scouts[uid]) scouts[uid] = { uid, points: 0, totalSlots: 0, placed: 0, withShots: 0, nonRunners: 0, assigned: 0, totalPlaced: 0 };
      const s = scouts[uid];
      s.points++;
      const players = data.players || [];
      players.forEach((p, i) => {
        s.totalSlots++;
        if (p) {
          s.placed++;
          s.totalPlaced++;
          if (data.assignments?.[i]) s.assigned++;
          const isRunner = data.runners?.[i];
          if (!isRunner) {
            s.nonRunners++;
            const qs = data.quickShots || {};
            const os = data.obstacleShots || {};
            const hasShot = /* check slot i */ ;
            if (hasShot) s.withShots++;
          }
        }
      });
    });
  });
  
  return Object.values(scouts).map(s => ({
    ...s,
    name: userNames[s.uid] || 'Unknown',
    breakPct: s.totalSlots > 0 ? Math.round(s.placed / s.totalSlots * 100) : 0,
    shotPct: s.nonRunners > 0 ? Math.round(s.withShots / s.nonRunners * 100) : 0,
    assignPct: s.totalPlaced > 0 ? Math.round(s.assigned / s.totalPlaced * 100) : 0,
    composite: /* weighted average */ ,
  })).sort((a, b) => b.composite - a.composite);
}
```

**Card layout:**
```jsx
<div style={{ /* card */ }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <span style={{ fontSize: 18, fontWeight: 800, color: '#334155', width: 24 }}>{rank}</span>
    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#e2e8f0' }}>
      {name.charAt(0).toUpperCase()}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{name}</div>
      <div style={{ fontSize: 11, color: '#475569' }}>{points} points · {composite}% quality</div>
    </div>
    {/* Star rating: 1-5 based on composite */}
    <div style={{ color: '#f59e0b', fontSize: 12 }}>{'★'.repeat(stars)}{'☆'.repeat(5-stars)}</div>
  </div>
</div>
```

---

## Part 5: Scout detail view

### Accessible by tapping scout card on ranking page

**Two sections:**

**A) Match progression (chronological bars):**
```jsx
{matches.map(m => {
  const pct = computeMatchCompleteness(m.points);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 11, color: '#475569', minWidth: 80 }}>vs {m.opponent}</span>
      <div style={{ flex: 1, height: 6, background: '#1a2234', borderRadius: 3 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: pctColor(pct), borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 11, fontWeight: 700, color: pctColor(pct) }}>{pct}%</span>
    </div>
  );
})}
```

**B) Per-section breakdown (micro-bars):**
```
Breaks      ██████████ 95%
Shots       ████████   81%
Assignments ████████░░ 87%
Runners     ██████░░░░ 68%
Eliminations████████░░ 72%
```

---

## Part 6: Scout issues / TODO view

### Visible to the scout (personal view)

Auto-scan all points where `scoutedBy === currentUser.uid`.
Group missing data by type, link to specific points.

```javascript
function computeScoutIssues(points, uid) {
  const issues = { shots: [], assignments: [], runners: [], eliminations: [] };
  
  points.forEach(pt => {
    ['homeData', 'awayData'].forEach(sideKey => {
      const data = pt[sideKey];
      if (data?.scoutedBy !== uid) return;
      const players = data.players || [];
      players.forEach((p, i) => {
        if (!p) return;
        // Missing shots
        if (!data.runners?.[i]) {
          const qs = data.quickShots || {};
          const os = data.obstacleShots || {};
          const hasShot = /* check */;
          if (!hasShot) {
            issues.shots.push({ matchId: pt.matchId, pointId: pt.id, playerSlot: i });
          }
        }
        // Missing assignment
        if (!data.assignments?.[i]) {
          issues.assignments.push({ matchId: pt.matchId, pointId: pt.id, playerSlot: i });
        }
      });
    });
  });
  
  return issues;
}
```

**Render:**
```jsx
{Object.entries(issues).map(([type, list]) => list.length > 0 && (
  <div>
    <SectionLabel>Missing {type} ({list.length} points)</SectionLabel>
    {/* Group by match */}
    {groupByMatch(list).map(({ matchName, items }) => (
      <div>
        <span>{matchName}: </span>
        {items.map(item => (
          <span onClick={() => navigate(`/tournament/${tid}/match/${item.matchId}?scout=${teamId}&point=${item.pointId}`)}>
            pt #{item.pointNum}
          </span>
        ))}
      </div>
    ))}
  </div>
))}
```

---

## Part 7: Attribution display

### On ScoutedTeamPage confidence banner
Add scout names to the confidence line:
```
● Based on 14 points · 3 matches · 90% complete · Scouted by Kacper, Eryk
```

### On point cards (MatchPage review)
Small text showing who scouted each side:
```
#3  Nexty 1:0 Husaria  |  Kacper → ← Eryk
```

---

## Part 8: Navigation + routes

### Add to More tab:
```jsx
<MoreItem icon="👤" label="Scout ranking" onClick={() => navigate('/scouts')} />
<MoreItem icon="📋" label="My scouting TODO" onClick={() => navigate('/my-issues')} />
```

### Routes:
```jsx
<Route path="/scouts" element={<ScoutRankingPage />} />
<Route path="/scouts/:uid" element={<ScoutDetailPage />} />
<Route path="/my-issues" element={<ScoutIssuesPage />} />
```

### Login:
```jsx
// In App.jsx, before workspace check:
if (!user) return <LoginPage />;
if (!workspace) return <WorkspaceLoginPage />;
return <MainPage />;
```

---

## Verification checklist

### Auth
- [ ] Email/password login works
- [ ] Registration creates account + Firestore profile
- [ ] Logout works
- [ ] Session persists across page reloads
- [ ] Error messages for invalid credentials
- [ ] Existing magic word flow still works after email login

### Attribution
- [ ] New points store real user UID in scoutedBy
- [ ] Display names resolve correctly
- [ ] Confidence banner shows scout names

### Ranking
- [ ] Scout ranking page shows all scouts sorted by composite score
- [ ] Card shows rank + name + points + quality + stars
- [ ] Tap card → detail with match progression + section breakdown

### Issues
- [ ] Scout sees their own missing data grouped by type
- [ ] Tap point → opens for editing
- [ ] Issues update after fixing data

### General
- [ ] Build passes
- [ ] Existing anonymous users can still access (backwards compatible)
