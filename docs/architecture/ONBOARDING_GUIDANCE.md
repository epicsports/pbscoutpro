# ONBOARDING GUIDANCE — § 57 Phase 2 Spec

**Status:** deferred to § 57 Phase 2. Phase 1 ships propagator + schema without onboarding overlays.
**Owner:** Opus + CC
**Estimated effort:** ~1.5 days CC after Phase 1 ships
**Reference:** § 57 in DESIGN_DECISIONS.md

---

## 1. Goals

The multi-source observations feature introduces 4 new user behaviors that won't be obvious without guidance:

1. **Coaches need to assign before players self-log specific points** — without this gate, orphan reports accumulate.
2. **End-of-matchup is the synchronization moment** — coaches don't realize closing the matchup triggers batch propagation.
3. **Players see their data appear in heatmap with delay** — without explanation, players think their logs were lost.
4. **Mixed-source data needs visual legend** — coach reviewing heatmap must know which positions came from where.

Goal: deliver 9 contextual guidance moments that fire ONCE per user, dismiss-and-stay-dismissed, with reset option in Settings.

---

## 2. Storage schema

Single new field on `users/{uid}` document:

```javascript
onboardingFlags: {
  g1_firstAddPoint: boolean,        // dismissed = true
  g2_firstScoutedWithPending: boolean,
  g3_firstEndMatchup: boolean,
  g4_firstPostBatchToast: boolean,
  g5_firstLateLogIndicator: boolean,
  g6_firstOrphanSave: boolean,
  g7_firstLateLogToast: boolean,
  g8_firstViewSwitcher: boolean,
  g9_firstMixedSourceLegend: boolean,
}
```

**Defaults:** all flags absent (or false). Equivalent to "not yet seen, show next time trigger fires".

**Free tier impact:** 9 booleans on user doc = ~50 bytes. Negligible.

**Reset behavior:** Settings → "Pokaż wskazówki ponownie" deletes the entire `onboardingFlags` object. Next session, all 9 will re-trigger on their natural conditions.

---

## 3. Guidance moments (G1-G9)

| ID | Trigger condition | Pattern | When fires | Dismiss action |
|---|---|---|---|---|
| G1 | Coach role + first Add Point button click in any matchup | Tooltip pointing to "+ Add Point" button | First time MatchPage opened with empty points | Tap button or "Got it" link |
| G2 | Coach role + savePoint completes + at least 1 selfReport orphan exists for matchup | Toast (3s, dismissable) | First time user closes a point with pending logs | Auto-dismiss or X tap |
| G3 | Coach role + first time clicking "End matchup" | Modal (blocking, requires confirm) | First end-matchup ever | "Zamknij matchup" or "Anuluj" |
| G4 | Coach role + propagator completes successfully + at least 1 self-log was synced | Toast with count (5s) | First time post-batch results appear | Auto-dismiss or X tap |
| G5 | Coach role + matchup is open + at least 1 player from assignments has no orphan or scoped report | Inline badge in matchup header | First time "missing self-logs" indicator shows | Tap badge to expand list, then close |
| G6 | Player role + first PPT save in app history | Toast (4s) | First time player completes PPT | Auto-dismiss or X tap |
| G7 | Player role + late-log auto-trigger fires (matchup.status === 'closed' at save time) | Toast (5s) | First late-log save | Auto-dismiss or X tap |
| G8 | Multi-role user (has 2+ roles) + first session post-deploy | Spotlight on View Switcher in nav | First MatchPage open with role > 1 | "Got it" link |
| G9 | Coach role + heatmap with mixed-source data renders for first time | Inline legend (collapsible) | First mixed view | Click legend item to dismiss |

---

## 4. Polish microcopy

### G1 — First Add Point
**Tooltip:** "Pierwszy punkt? Zacznij od przypisania graczy do bunkrów. Player self-logi będą szukać tych przypisań żeby trafić w odpowiedni slot."

### G2 — First scouted with pending self-logs
**Toast:** "Punkt zapisany ✓ Dane graczy pojawią się po zakończeniu matchupu (czeka N logów)"

### G3 — First end-matchup
**Modal title:** "Zakończenie matchupu"
**Body:** "Po zamknięciu wszystkie self-logi automatycznie zaktualizują heatmapę i statystyki. Niezsynchronizowanych logów: **{N}**.\n\nMożesz nadal edytować punkty po zakończeniu — zmiany zostaną odzwierciedlone."
**Buttons:** "Zamknij matchup" | "Anuluj"

### G4 — Post-batch toast
**Toast:** "✓ Zsynchronizowano {N} self-logów. Heatmapa i statystyki zaktualizowane."

### G5 — Late-log indicator
**Badge:** "N graczy nie zalogowało jeszcze swoich danych" (clickable)
**Expanded list shows:** player names + last activity timestamp

### G6 — First orphan save (player view)
**Toast:** "Twój log zapisany ✓ Trener zsynchronizuje go po zakończeniu matchupu — pojawi się w heatmapie po zamknięciu."

### G7 — Late-log auto-trigger toast (player view)
**Toast:** "✓ Zsynchronizowano od razu — matchup już zakończony. Twoje dane są w statystykach."

### G8 — View Switcher first session
**Spotlight title:** "Przełączanie widoków"
**Body:** "Masz wiele ról. Tu możesz przełączać między widokiem coach / scout / player. Twoje dane pozostają takie same — zmienia się tylko interfejs."
**Button:** "Rozumiem"

### G9 — Mixed-source legend
**Inline legend (right side of heatmap):**
- Pełna kropka — pozycja od scouta (kanwa)
- Obrys kropki — pozycja z self-loga (bunker → centrum)
- Mieszana — gdy scout i self-log się różnią, wygrywa scout (patrz § 57.7)

(English equivalent in en locale; Polish primary per Jacek.)

---

## 5. Implementation pattern

Single React hook `useOnboardingFlag(flagName)` returns:

```javascript
const { hasSeen, markSeen, isLoading } = useOnboardingFlag('g3_firstEndMatchup');

if (!hasSeen && triggerCondition) {
  // show guidance
  // on dismiss: markSeen()
}
```

`markSeen()` writes single field to user doc:
```javascript
updateDoc(doc(db, `users/${uid}`), {
  [`onboardingFlags.g3_firstEndMatchup`]: true
});
```

**Component composition:**
- `<OnboardingTooltip flag="g1" anchor={addButtonRef}>...</OnboardingTooltip>`
- `<OnboardingToast flag="g4" condition={postBatchSuccess}>...</OnboardingToast>`
- `<OnboardingModal flag="g3" condition={endMatchupClick}>...</OnboardingModal>`
- `<OnboardingSpotlight flag="g8" anchor={viewSwitcherRef}>...</OnboardingSpotlight>`
- `<OnboardingBadge flag="g5" condition={hasPendingLogs}>...</OnboardingBadge>`

Settings reset:
```javascript
async function resetOnboardingFlags() {
  await updateDoc(doc(db, `users/${uid}`), {
    onboardingFlags: deleteField()
  });
}
```

---

## 6. Definition of done

§ 57 Phase 2 onboarding is complete when:
- [ ] `onboardingFlags` field exists on users/{uid} schema
- [ ] All 9 guidance moments fire on their natural triggers
- [ ] Each guidance moment is dismissable + dismiss persists across sessions
- [ ] Settings has "Pokaż wskazówki ponownie" button that resets all flags
- [ ] Polish copy reviewed by Jacek before merge
- [ ] Tested in dev with fresh user account: all 9 fire in expected order
- [ ] No double-firing on rapid trigger conditions (debounce/once-per-session checks)

---

## 7. Free tier impact

| Operation | Frequency | Daily cost |
|---|---|---|
| Read `onboardingFlags` on app open | 1 per session per user | ~3 reads/user/day |
| Write `onboardingFlags.gN: true` on dismiss | At most 9 lifetime per user | ~9 writes total per user |
| Reset flags | Rare (Settings action) | 1 write per use |

Effectively zero impact on Spark plan limits.

---

## 8. Future extensions (not in scope)

- Replay individual guidance via Settings → "Pokaż wskazówkę X"
- Localization beyond Polish (en locale already partially present in app)
- Analytics on which moments are most frequently dismissed without action (would need additional event logging)
- A/B testing different microcopy variants
