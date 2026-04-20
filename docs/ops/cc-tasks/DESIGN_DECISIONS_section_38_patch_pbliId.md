# DESIGN_DECISIONS.md § 38 — Field Rename Patch (pbliId)

> **Context:** § 38 v2 (committed 637afbc) uses field name `pbleaguesId`. Actual codebase uses `pbliId` (confirmed via grep: dataService.js:109, PlayerEditModal.jsx, CSVImport.jsx, TeamDetailPage.jsx:177). Data samples: `"61114"`, `"166646"` — system-assigned first segment, no `#` prefix, no suffix.
> 
> Patch rationale: rename in spec to match codebase, avoid unnecessary field migration. `pbliId` is the canonical name; `pbliIdFull` is the new field for captured full ID at link time.
> 
> Commit as: `docs: § 38 field rename pbleaguesId → pbliId to match codebase (no data migration needed)`.

---

## Edit 1 — § 38.8 Data model changes

**Find the `players/{pid}` block inside § 38.8** (search for `// players/{pid}`).

**Replace entire `players/{pid}` block with:**

```markdown
// players/{pid} — existing fields + additions:
{
  name: 'Jacek Parczewski',
  number: 66,
  teamId: 'ranger-rush',
  pbliId: '61114',                        // EXISTING — Paint Ball Leagues ID first segment
                                          // System-assigned on pbleagues.com, immutable, numeric
                                          // Already used by: PlayerEditModal, CSVImport, TeamDetailPage
  
  // NEW fields:
  linkedUid: 'firebase-uid-abc',          // NEW — Firebase uid of linked user account (null if unlinked)
  pbliIdFull: '61114-8236',               // NEW — full two-segment ID captured at link time
                                          // (audit + future re-verification if pbleagues suffix changes)
  linkedAt: Timestamp,                    // NEW — when player linked to uid
  emails: [...],                          // EXISTING from SelfLog Tier 1 — REMOVED as primary identity
                                          // keep field for historical data but no longer used for matching
}
```

---

## Edit 2 — § 38.12 PBleagues ID account linking — ID format subsection

**Find the subsection "#### ID format" inside § 38.12.**

**Replace entire ID format subsection with:**

```markdown
#### ID format

- **pbleagues.com source:** user profile shows full ID like `61114-8236`
  - First segment (`61114`): system-assigned numeric, immutable, publicly visible on match results. Length varies (5-6+ digits observed).
  - Separator: hyphen `-`
  - Second segment (`8236`): user-configurable at pbleagues.com/profile. Numeric in observed cases; treat as `\w+` defensively
- **Our Firestore:** `players/{pid}.pbliId` stores first segment only (e.g. `"61114"` — no `#` prefix, no suffix). Existing field — already populated for all rostered players via CSV import and manual entry.
- **Normalization:** input from user may include `#` (some users copy-paste with pbleagues.com's display convention). Strip leading `#` before parsing and comparison.
```

---

## Edit 3 — § 38.12 Input validation subsection

**Find the subsection "#### Input validation" inside § 38.12.**

**Replace with:**

```markdown
#### Input validation

```javascript
const PBLI_ID_FULL_REGEX = /^#?\d+-\w+$/;

function parsePbliId(raw) {
  const trimmed = raw.trim();
  if (!PBLI_ID_FULL_REGEX.test(trimmed)) {
    return { error: 'INVALID_FORMAT' };
  }
  const cleaned = trimmed.replace(/^#/, '');
  const [systemId, userSuffix] = cleaned.split('-');
  return { systemId, userSuffix, full: `${systemId}-${userSuffix}` };
}
```

Reject inputs: missing separator, missing either segment, non-numeric first segment, whitespace inside.

**Stored vs input format:**
- Input (user types): `61114-8236` or `#61114-8236` — full two-segment ID
- Match against: `players/{X}.pbliId` which stores only `"61114"` (first segment)
- Save at link time: `players/{X}.pbliIdFull = "61114-8236"` (full captured input, normalized)
```

---

## Edit 4 — § 38.12 Matching algorithm subsection

**Find the subsection "#### Matching algorithm" inside § 38.12.**

**Replace with:**

```markdown
#### Matching algorithm

```javascript
async function findPlayerByPbliId(workspaceSlug, systemId) {
  const playersRef = collection(db, 'workspaces', workspaceSlug, 'players');
  const snap = await getDocs(playersRef);
  const matches = [];
  snap.forEach(doc => {
    const dbId = String(doc.data().pbliId || '').replace(/^#/, '').trim();
    if (dbId === systemId) matches.push({ id: doc.id, ...doc.data() });
  });
  return matches;
}
```

**Note on `#` handling:** defensive strip in matcher — even though current data samples are plain numeric, some legacy data may have been imported with `#` prefix. Normalizing at match time is cheap insurance.

**Match outcomes** — unchanged from v2, but reference to `pbleaguesId` replaced by `pbliId` in error messages:

| Outcome | Response |
|---|---|
| Zero matches | Reject: "Nie znaleziono gracza o PBLI #{systemId} w bazie workspace {name}. Skontaktuj się z adminem: {admin email}" |
| One match, `linkedUid === null` | Success — proceed to link |
| One match, `linkedUid === currentUid` | Success (idempotent re-login from same user) — proceed |
| One match, `linkedUid` is different uid | Reject: "Ten profil gracza jest już podłączony do innego konta. Skontaktuj się z adminem aby rozlinkować." |
| Multiple matches (data bug — `pbliId` should be unique per workspace) | Show disambiguation picker: list players with name + team + number. Log to Sentry. |
```

---

## Edit 5 — § 38.12 Linking action subsection

**Find the subsection "#### Linking action" inside § 38.12.**

**Replace with:**

```markdown
#### Linking action

On successful match + user confirmation:
```javascript
await runTransaction(db, async (tx) => {
  // Link player doc to uid
  tx.update(doc(db, 'workspaces', slug, 'players', matchedPlayerId), {
    linkedUid: currentUid,
    pbliIdFull: `${systemId}-${userSuffix}`,   // store full captured input
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
```

---

## Edit 6 — § 38.12 Onboarding screen specification

**Find the subsection "#### Onboarding screen specification" inside § 38.12.**

**Find the specific line:**
```
- Help text below input: "Znajdziesz go w swoim profilu na pbleagues.com → Settings → Player ID"
```

**Replace with:**
```
- Help text below input: "Znajdziesz go w swoim profilu na pbleagues.com → Settings → Player ID. Format: NNNNN-NNNN (np. 61114-8236)"
```

Also find:
```
- Input field: `Player ID`, placeholder `61114-8236`, inline validation
```

**Replace with:**
```
- Input field: `Player ID`, placeholder `61114-8236`, inline validation (must match pattern `^#?\d+-\w+$`)
```

---

## Edit 7 — § 38.14 Re-verification edge cases

**Find the "Case: User changed suffix on pbleagues.com" block in § 38.14.**

**Replace entire case with:**

```markdown
**Case: User changed suffix on pbleagues.com** — `pbliIdFull` no longer matches what user types if they update suffix later. Our match logic only uses `systemId` (first segment via `pbliId` field), so match still succeeds — suffix change doesn't break linking. Captured `pbliIdFull` in our DB is stale but not harmful. Re-verification flow: admin can trigger "Re-verify PBLI" in Settings → Members → per-user `⋮` menu, which clears `pbliIdFull` and prompts user to re-enter at next login.
```

Any other references to `pbleaguesId` inside § 38.14 → replace with `pbliId`. Also `pbleaguesIdFull` → `pbliIdFull`.

---

## Edit 8 — Global grep across § 38

After edits 1-7, run final check:
```bash
grep -n "pbleaguesId" docs/DESIGN_DECISIONS.md
```

**Expected result: zero matches within § 38 body.** If any remain (I may have missed some incidental references), replace them with `pbliId` (or `pbliIdFull` where appropriate from context).

Acceptable matches OUTSIDE § 38: none expected (field was only mentioned in § 38).

---

## Edit 9 — Bump "Last updated" at top of file

**Find:**
```
## Last updated: 2026-04-20 by Opus (§ 38 v2 — multi-role + PBleagues matching)
```

**Replace with:**
```
## Last updated: 2026-04-20 by Opus (§ 38 v2.1 — pbliId rename to match codebase, no data migration)
```
