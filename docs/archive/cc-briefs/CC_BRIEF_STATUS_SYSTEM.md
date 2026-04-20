# CC Brief 1: Status System + Event Types + Session Context Bar

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.

---

## Overview

Three connected changes that share one goal: the app knows "what session is active right now" and surfaces it everywhere.

---

## 1. Data model changes

### `dataService.js` — `addTournament()`

Add two fields:
```js
status: data.status || 'open',     // 'open' | 'live' | 'closed'
eventType: data.eventType || 'tournament', // 'tournament' | 'sparing'
isTest: data.isTest || false,
```

### `dataService.js` — `addTraining()`

Add one field (status already exists):
```js
isTest: data.isTest || false,
```

No Firestore migration needed — missing fields default gracefully.

---

## 2. `NewTournamentModal.jsx` — add eventType + isTest

### Tournament type selector: add "Sparing" option

Current selector has: `[Tournament] [Training]`
New selector: `[Tournament] [Sparing] [Training]`

Sparing = tournament format (matches, scouting, divisions) but no league/division fields shown.
Show for Sparing: name, date, layout. No league/division picker.

```js
const [type, setType] = useState('tournament'); // 'tournament' | 'sparing' | 'training'
const [isTest, setIsTest] = useState(false);
```

In `handleAdd` for sparing:
```js
await ds.addTournament({
  name: name.trim(),
  eventType: 'sparing',
  layoutId: layoutId || null,
  date: date || null,
  isTest,
  league: null, division: null, year: currentYear(),
});
```

For tournament:
```js
await ds.addTournament({ ...existingFields, eventType: 'tournament', isTest });
```

### isTest toggle

Below the type selector, add a small toggle row:
```
[ ] Test / stage session
```
Checkbox style using existing Checkbox component from ui.jsx.
When checked: title shows "(TEST)" prefix, data is tagged `isTest: true`.

---

## 3. `App.jsx` — `useActiveSessions` hook + `SessionContextBar`

### New hook (inline in App.jsx or separate file `useActiveSessions.js`):

```js
// Returns the first live tournament and first live training
export function useActiveSessions() {
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const liveTournament = tournaments.find(t => t.status === 'live') || null;
  const liveTraining = trainings.find(t => t.status === 'live') || null;
  return { liveTournament, liveTraining };
}
```

### `SessionContextBar` component (new, in App.jsx):

Appears between content and BottomNav when there's an active live session.
Shows the MOST RELEVANT session (tournament takes priority over training).

```jsx
function SessionContextBar({ session, type, onNavigate }) {
  // type: 'tournament' | 'training'
  const label = type === 'tournament'
    ? session.name
    : `Training · ${session.date || 'Practice'}`;
  const sub = type === 'tournament'
    ? (session.eventType === 'sparing' ? 'SPARING LIVE' : 'TOURNAMENT LIVE')
    : 'TRAINING LIVE';

  return (
    <div onClick={onNavigate} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px',
      background: '#0d1117',
      borderTop: '1px solid #1a2234',
      cursor: 'pointer',
      minHeight: 44,
      WebkitTapHighlightColor: 'transparent',
    }}>
      {/* LIVE badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#ef444415', border: '1px solid #ef444430',
        borderRadius: 5, padding: '2px 7px', flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
          animation: 'pulse 1.5s infinite' }} />
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800,
          color: '#ef4444', letterSpacing: 0.8 }}>{sub}</span>
      </div>
      {/* Session name */}
      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600,
        color: COLORS.text, flex: 1, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {/* Arrow */}
      <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.accent,
        fontWeight: 600, flexShrink: 0 }}>Go →</span>
    </div>
  );
}
```

Add CSS animation for pulse dot in `index.css` or via `<style>` tag in App:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

### Wire into `App.jsx`:

```jsx
function AppShell({ children }) {
  const { liveTournament, liveTraining } = useActiveSessions();
  const navigate = useNavigate();
  const liveSession = liveTournament || liveTraining;
  const liveType = liveTournament ? 'tournament' : 'training';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      {liveSession && (
        <SessionContextBar
          session={liveSession}
          type={liveType}
          onNavigate={() => {
            if (liveType === 'tournament') navigate(`/?tid=${liveSession.id}`);
            else navigate(`/training/${liveSession.id}`);
          }}
        />
      )}
      <BottomNav />
    </div>
  );
}
```

Wrap existing routes in `<AppShell>`.

---

## 4. Setting LIVE status — where to add the button

### Tournament → `ScoutTabContent.jsx` or `MainPage.jsx`

When a tournament is `open`, show in its card/header:
```
[Set LIVE]  — changes status to 'live'
```
When `live`, show:
```
[● LIVE]  [End LIVE]
```

Use `ds.updateTournament(id, { status: 'live' })` and `ds.updateTournament(id, { status: 'open' })`.

Implementation: find where tournament status `closed` is currently managed in MainPage.jsx and add LIVE toggle alongside it.

### Training → `TrainingPage.jsx`

In the footer alongside "End training" button:
- If `status === 'open'`: show `[Set LIVE]` button (secondary/ghost)
- If `status === 'live'`: replace with `[● LIVE — Tap to deactivate]`

```js
await ds.updateTraining(trainingId, { status: 'live' });
await ds.updateTraining(trainingId, { status: 'open' }); // deactivate
```

---

## 5. isTest visual indicator

Anywhere a tournament or training name is displayed (cards on MainPage, headers), if `isTest === true`, append a small `TEST` badge:

```jsx
{session.isTest && (
  <span style={{
    fontFamily: FONT, fontSize: 8, fontWeight: 700,
    color: '#94a3b8', background: '#1e293b',
    border: '1px solid #334155', borderRadius: 3,
    padding: '1px 4px', marginLeft: 4,
  }}>TEST</span>
)}
```

---

## Build & commit

`npx vite build` must pass.
Commit: `feat: status system (live/open/closed) + eventType (sparing) + isTest + session context bar`
