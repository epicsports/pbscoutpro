# CC Brief: Status System + Layout Scope + Lineup Analytics
# (Combined implementation)

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Implement in this order: Part 1 → Part 2 → Part 3 → Part 4.
Run `npx vite build` after each part. Final commit at end.

---

# PART 1 — Data model: status, eventType, isTest

## `src/services/dataService.js`

### `addTournament()` — add 3 fields:
```js
status: data.status || 'open',          // 'open' | 'live' | 'closed'
eventType: data.eventType || 'tournament', // 'tournament' | 'sparing'
isTest: data.isTest || false,
```

### `addTraining()` — add 1 field (status already exists):
```js
isTest: data.isTest || false,
```

---

## `src/components/NewTournamentModal.jsx`

### Add "Sparing" to type selector
Current: `[Tournament] [Training]`
New: `[Tournament] [Sparing] [Training]`

```js
const [type, setType] = useState('tournament'); // 'tournament' | 'sparing' | 'training'
const [isTest, setIsTest] = useState(false);
```

Sparing form: name + date + layout only. No league/division/year fields.

```js
// In handleAdd, for sparing:
await ds.addTournament({
  name: name.trim(),
  eventType: 'sparing',
  layoutId: layoutId || null,
  date: date || null,
  isTest,
  league: null, division: null,
  year: currentYear(),
});
onCreated?.(ref?.id, 'tournament');
```

For tournament: add `eventType: 'tournament', isTest` to existing data object.

### isTest toggle — below type selector:
```jsx
<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
  <Checkbox
    checked={isTest}
    onChange={setIsTest}
    label="Test / stage session"
  />
</div>
```

Use existing `Checkbox` from ui.jsx.

---

## Session context bar — `src/App.jsx`

### New hook (inline or separate):
```js
function useActiveSessions(tournaments, trainings) {
  const liveTournament = tournaments.find(t => t.status === 'live') || null;
  const liveTraining   = trainings.find(t => t.status === 'live')   || null;
  return { liveTournament, liveTraining };
}
```

### `SessionContextBar` component:
```jsx
function SessionContextBar({ session, type, navigate }) {
  const isSparing = session.eventType === 'sparing';
  const label = type === 'tournament'
    ? session.name
    : `Training · ${session.date || 'Practice'}`;
  const badge = type === 'training' ? 'TRAINING'
    : isSparing ? 'SPARING' : 'TOURNAMENT';

  const go = () => {
    if (type === 'tournament') navigate(`/?tid=${session.id}`);
    else navigate(`/training/${session.id}`);
  };

  return (
    <div onClick={go} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '8px 16px', background: '#0d1117',
      borderTop: '1px solid #1a2234',
      cursor: 'pointer', minHeight: 44,
      WebkitTapHighlightColor: 'transparent',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4,
        background: '#ef444415', border: '1px solid #ef444430',
        borderRadius: 5, padding: '2px 7px', flexShrink: 0,
      }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%',
          background: '#ef4444', animation: 'livepulse 1.5s infinite' }} />
        <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 800,
          color: '#ef4444', letterSpacing: 0.8 }}>
          {badge} LIVE
        </span>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600,
        color: COLORS.text, flex: 1, overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {session.isTest && '(TEST) '}{label}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.accent,
        fontWeight: 600, flexShrink: 0 }}>Go →</span>
    </div>
  );
}
```

Add pulse animation to global CSS (index.css or inline style tag in App):
```css
@keyframes livepulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
```

### Wire into App — wrap routes in AppShell:

In the top-level App component that renders routes, add:
```jsx
// Add to imports
import { useTournaments } from './hooks/useFirestore';
import { useTrainings } from './hooks/useFirestore';

// In AppShell component:
function AppShell({ children }) {
  const navigate = useNavigate();
  const { tournaments } = useTournaments();
  const { trainings } = useTrainings();
  const { liveTournament, liveTraining } = useActiveSessions(tournaments, trainings);
  const liveSession = liveTournament || liveTraining;
  const liveType = liveTournament ? 'tournament' : 'training';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh' }}>
      <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      {liveSession && (
        <SessionContextBar session={liveSession} type={liveType} navigate={navigate} />
      )}
      <BottomNav />
    </div>
  );
}
```

Wrap `<Routes>...</Routes>` + `<BottomNav />` in `<AppShell>`.

IMPORTANT: AppShell must be inside `<HashRouter>` so `useNavigate()` works.

---

## LIVE toggle buttons

### `TrainingPage.jsx` — footer:
Currently has "End training" button. Add alongside it:

```jsx
{training.status !== 'live' && training.status !== 'closed' && (
  <Btn variant="default" onClick={() => ds.updateTraining(trainingId, { status: 'live' })}
    style={{ minHeight: 48 }}>
    Set LIVE
  </Btn>
)}
{training.status === 'live' && (
  <Btn variant="default" onClick={() => ds.updateTraining(trainingId, { status: 'open' })}
    style={{ minHeight: 48, borderColor: '#ef444440', color: '#ef4444' }}>
    ● LIVE — tap to deactivate
  </Btn>
)}
```

### `MainPage.jsx` or `ScoutTabContent.jsx` — tournament card:
Find where the active tournament is displayed. Add LIVE toggle button near the tournament header. Use same pattern:
```js
ds.updateTournament(id, { status: 'live' })
ds.updateTournament(id, { status: 'open' })
```

### isTest badge — wherever tournament/training name is shown:
```jsx
{item.isTest && (
  <span style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700,
    color: '#64748b', background: '#1e293b', border: '1px solid #334155',
    borderRadius: 3, padding: '1px 4px', marginLeft: 4 }}>TEST</span>
)}
```

---

# PART 2 — Zone picker in QuickLogView (critical for lineup analytics)

## Problem
QuickLogView saves `assignments[i]` (player IDs) but NOT `players[i]` (positions).
Without position data, lineup analytics can only use slot-index fallback — inaccurate.

## Solution: zone picker step after player selection

After picking which players are on the field, show a quick zone assignment:
each selected player gets a D/C/S toggle (one tap).

This gives synthetic position data — stored as `players[i]` with hardcoded Y coordinates:
- D (dorito) → `{ x: 0.15, y: 0.20 }` (top-left area, within disco line)
- C (center) → `{ x: 0.15, y: 0.50 }` (center Y)
- S (snake)  → `{ x: 0.15, y: 0.80 }` (bottom area, past zeeker line)

These coordinates are synthetic but land correctly in zone classification.

## `QuickLogView.jsx` changes

### New state:
```js
const [zones, setZones] = useState({}); // { [pid]: 'D' | 'C' | 'S' }
const [step, setStep] = useState('pick'); // 'pick' | 'zone' | 'win'
```

### After player selection — add "Continue" button:
```jsx
{step === 'pick' && selected.size > 0 && (
  <div style={{ padding: '8px 16px' }}>
    <div onClick={() => setStep('zone')} style={{
      background: COLORS.accent, borderRadius: 10,
      minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
    }}>
      <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700,
        color: '#000' }}>Assign zones →</span>
    </div>
  </div>
)}
```

### Zone step — show for each selected player:
```jsx
{step === 'zone' && (
  <div style={{ padding: '0 16px' }}>
    <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
      letterSpacing: '.5px', textTransform: 'uppercase', color: '#475569',
      padding: '12px 0 8px' }}>
      Where did each player start?
    </div>
    {Array.from(selected).map(pid => {
      const p = allRoster.find(r => r.id === pid);
      const zone = zones[pid] || null;
      return (
        <div key={pid} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 8,
        }}>
          <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600,
            color: COLORS.text, minWidth: 80, flex: 1 }}>
            {p?.nickname || p?.name || '?'}
          </span>
          {[
            { key: 'D', label: 'D', color: '#fb923c' },
            { key: 'C', label: 'C', color: '#94a3b8' },
            { key: 'S', label: 'S', color: '#22d3ee' },
          ].map(z => (
            <div key={z.key}
              onClick={() => setZones(prev => ({ ...prev, [pid]: z.key }))}
              style={{
                width: 44, height: 44, borderRadius: 10,
                border: `2px solid ${zone === z.key ? z.color : '#1e293b'}`,
                background: zone === z.key ? `${z.color}20` : '#0f172a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
              }}>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800,
                color: zone === z.key ? z.color : '#475569' }}>{z.label}</span>
            </div>
          ))}
        </div>
      );
    })}
    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
      <div onClick={() => setStep('pick')} style={{
        flex: 1, minHeight: 44, borderRadius: 10,
        border: '1px solid #1e293b', background: '#0f172a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600,
          color: '#475569' }}>← Back</span>
      </div>
      <div onClick={() => setStep('win')} style={{
        flex: 2, minHeight: 44, borderRadius: 10,
        background: COLORS.accent,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>
        <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700,
          color: '#000' }}>Who won? →</span>
      </div>
    </div>
  </div>
)}
```

### Win step — show only when step === 'win':
The existing "Who won?" buttons only render when `step === 'win'`.

### Zone → synthetic position mapping:
```js
const ZONE_POS = {
  D: { x: 0.15, y: 0.20 },
  C: { x: 0.15, y: 0.50 },
  S: { x: 0.15, y: 0.80 },
};
```

### Updated `handleWin`:
```js
const handleWin = async (winner) => {
  if (saving) return;
  setSaving(true);
  try {
    const pids = selected.size > 0
      ? Array.from(selected)
      : [...homeRoster.map(p => p.id), ...awayRoster.map(p => p.id)].slice(0, 5);

    const assignments = Array(5).fill(null);
    const players = Array(5).fill(null);
    pids.forEach((pid, i) => {
      if (i >= 5) return;
      assignments[i] = pid;
      const z = zones[pid];
      players[i] = z ? ZONE_POS[z] : null;
    });
    const outcome = winner === 'A' ? 'win_a' : 'win_b';
    await onSavePoint({ assignments, players, outcome });
  } catch (e) { console.error('Quick log save failed:', e); }
  setSaving(false);
  setStep('pick'); // reset for next point
  // Don't clear selected or zones — preserve lineup
};
```

### Update `TrainingPage.jsx` — pass `players` from `onSavePoint`:
In the `onSavePoint` handler in TrainingPage, destructure `players` from the argument:
```js
onSavePoint={async ({ assignments, players, outcome }) => {
  const makeData = (rosterArr) => ({
    players: players || Array(5).fill(null),  // use zone-derived positions
    assignments,
    shots: Array(5).fill([]),
    eliminations: Array(5).fill(false),
    eliminationPositions: Array(5).fill(null),
    quickShots: {}, obstacleShots: {},
    bumpStops: Array(5).fill(null),
    runners: Array(5).fill(false),
  });
  // ... rest unchanged
}}
```

### Skip zone step option:
The zone step is optional. If user taps "Who won? →" while some players have no zone assigned, that's fine — those players get `players[i] = null` (existing behavior).

Add a small skip link below zone assignments:
```jsx
<div style={{ textAlign: 'center', padding: '4px 0' }}>
  <span onClick={() => setStep('win')} style={{
    fontFamily: FONT, fontSize: 11, color: '#334155',
    cursor: 'pointer', textDecoration: 'underline',
  }}>Skip — just log the score</span>
</div>
```

---

# PART 3 — Layout scope in stats pages

## New hook: `src/hooks/useLayoutScope.js`

```js
import { useTournaments, useTrainings, useLayouts } from './useFirestore';

export function useLayoutScope(layoutId) {
  const { tournaments } = useTournaments();
  const { trainings }   = useTrainings();
  const { layouts }     = useLayouts();
  const layout = layouts.find(l => l.id === layoutId) || null;
  const scopedTournaments = layoutId
    ? tournaments.filter(t => t.layoutId === layoutId && t.status !== 'closed' || true)
    : [];
  // Include ALL tournaments (open + live + closed) with this layout
  const allScopedTournaments = layoutId
    ? tournaments.filter(t => t.layoutId === layoutId)
    : [];
  const allScopedTrainings = layoutId
    ? trainings.filter(t => t.layoutId === layoutId)
    : [];
  return { layout, tournaments: allScopedTournaments, trainings: allScopedTrainings };
}
```

## `PlayerStatsPage.jsx` — add layout scope

### URL param: `?scope=layout&lid=<layoutId>`

Add to existing scope logic:
```js
const lidParam = searchParams.get('lid') || '';
```

### Scope pills — add "Layout" pill:
```jsx
// Add to existing pills row:
{layouts.length > 0 && (
  <ScopePill
    label="Layout"
    active={scopeParam === 'layout'}
    onClick={() => setSearchParams({ scope: 'layout', lid: lidParam || layouts[0]?.id || '' })}
  />
)}
```

### Layout picker — show when scope === 'layout':
```jsx
{scopeParam === 'layout' && (
  <div style={{ padding: '0 16px 8px' }}>
    <Select value={lidParam}
      onChange={v => setSearchParams({ scope: 'layout', lid: v })}>
      <option value="">— select layout —</option>
      {layouts.map(l => (
        <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
      ))}
    </Select>
  </div>
)}
```

### Data fetching for layout scope:

In the existing `useEffect` fetch block, add after the training scope block:

```js
if (scopeParam === 'layout' && lidParam) {
  const layoutTournaments = tournaments.filter(t => t.layoutId === lidParam);
  scanTids = layoutTournaments.map(t => t.id);
  // Also tag each point with eventType for later filtering
  // (walk same as global but filtered to these tids)
}
```

The existing global scope walking logic handles the rest — just set `scanTids` correctly.

Tag each playerPoint with eventType:
```js
.map(pp => ({
  ...pp,
  tournamentId: tid,
  field,
  eventType: tournament.eventType || 'tournament',
}))
```

### Layout scope summary header:

Show above stats when scope=layout:
```jsx
{scopeParam === 'layout' && lidParam && (() => {
  const layout = layouts.find(l => l.id === lidParam);
  const layoutTournaments = tournaments.filter(t => t.layoutId === lidParam);
  const trainingCount = layoutTournaments.filter(t => false).length; // from training scope data
  const sparingCount = layoutTournaments.filter(t => t.eventType === 'sparing').length;
  const tCount = layoutTournaments.filter(t => t.eventType === 'tournament').length;
  return (
    <div style={{ margin: '0 16px 8px', padding: '10px 14px',
      background: '#0f172a', border: '1px solid #1a2234', borderRadius: 10 }}>
      <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700,
        color: COLORS.text, marginBottom: 4 }}>
        {layout?.name || 'Layout'}
      </div>
      <div style={{ fontFamily: FONT, fontSize: 11, color: '#475569' }}>
        {[
          sparingCount > 0 && `${sparingCount} sparing`,
          tCount > 0 && `${tCount} tournament`,
        ].filter(Boolean).join(' · ')}
        {' · '}{raw.playerPoints.length} points
      </div>
    </div>
  );
})()}
```

## `ScoutedTeamPage.jsx` — add layout scope pill

Below PageHeader, add scope pill row when `tournament.layoutId` exists:

```jsx
{tournament?.layoutId && (() => {
  const isLayoutScope = searchParams.get('scope') === 'layout';
  const layoutTournaments = tournaments
    .filter(t => t.layoutId === tournament.layoutId && t.id !== tournamentId);
  if (layoutTournaments.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 8, padding: '8px 16px' }}>
      <ScopePill label="This tournament" active={!isLayoutScope}
        onClick={() => setSearchParams({})} />
      <ScopePill label={`All on this layout (${layoutTournaments.length + 1})`}
        active={isLayoutScope}
        onClick={() => setSearchParams({ scope: 'layout' })} />
    </div>
  );
})()}
```

When `scope=layout`: fetch points from ALL tournaments sharing layoutId + current one.
Aggregate into `heatmapPoints`. All existing sections recalculate from merged data.

Show event breakdown above existing banner:
```jsx
{isLayoutScope && (
  <div style={{ margin: '0 16px 4px', fontFamily: FONT, fontSize: 11, color: '#475569' }}>
    Aggregated across {allLayoutTournaments.length} events on this layout
  </div>
)}
```

## `ScoutRankingPage.jsx` — add layout scope

Extend the existing tournament scope (from CC_BRIEF_PRACTICE_AND_SCOUT_RANKING.md) to also include layout:

```js
const [scope, setScope] = useState('global'); // 'global' | 'layout' | 'tournament'
const [selectedLayoutId, setSelectedLayoutId] = useState('');
const [selectedTournamentId, setSelectedTournamentId] = useState('');

const filteredPoints = useMemo(() => {
  if (scope === 'tournament' && selectedTournamentId)
    return points.filter(p => p.tournamentId === selectedTournamentId);
  if (scope === 'layout' && selectedLayoutId) {
    const tids = new Set(tournaments
      .filter(t => t.layoutId === selectedLayoutId)
      .map(t => t.id));
    return points.filter(p => tids.has(p.tournamentId));
  }
  return points;
}, [points, scope, selectedLayoutId, selectedTournamentId, tournaments]);
```

Pill row: `[Global] [Layout] [Tournament]`

---

# PART 4 — Lineup analytics

## `src/utils/generateInsights.js` — add `computeLineupStats()`

```js
/**
 * computeLineupStats — pair and trio win rates.
 *
 * Classifies each assigned player by zone (using position Y if available,
 * slot-index fallback otherwise). Builds pair and trio keys, counts
 * played/wins per combination.
 *
 * @param {Array}  points     - heatmap points with { players, assignments, outcome }
 * @param {Object} field      - for zone classification
 * @param {Array}  allPlayers - for name lookup
 * @returns {Array} sorted by winRate desc
 */
export function computeLineupStats(points, field, allPlayers) {
  if (!points?.length) return [];

  const disco  = field?.discoLine  ?? 0.30;
  const zeeker = field?.zeekerLine ?? 0.80;
  const dSide  = field?.layout?.doritoSide || field?.doritoSide || 'top';

  const zoneOf = (pos, slotIdx) => {
    if (pos) {
      const isD = dSide === 'top' ? pos.y < disco  : pos.y > (1 - disco);
      const isS = dSide === 'top' ? pos.y > zeeker : pos.y < (1 - zeeker);
      return isD ? 'D' : isS ? 'S' : 'C';
    }
    // Fallback by slot index
    return slotIdx <= 1 ? 'D' : slotIdx === 2 ? 'C' : 'S';
  };

  const combos = {}; // key → { played, wins, type, side, pids, centerPid }

  const acc = (key, isWin, meta) => {
    if (!combos[key]) combos[key] = { played: 0, wins: 0, ...meta };
    combos[key].played++;
    if (isWin) combos[key].wins++;
  };

  points.forEach(pt => {
    const assignments = pt.assignments || [];
    const players     = pt.players    || [];
    const isWin = pt.outcome === 'win';

    const byZone = { D: [], S: [], C: [] };
    assignments.forEach((pid, i) => {
      if (!pid) return;
      const zone = zoneOf(players[i], i);
      byZone[zone].push(pid);
    });

    // Pairs (need ≥ 2 players on same side)
    ['D', 'S'].forEach(side => {
      const pids = byZone[side];
      if (pids.length < 2) return;
      const sorted = [...pids].sort();
      const pairPids = sorted.slice(0, 2);
      const pairKey = `pair|${side}|${pairPids.join('|')}`;
      acc(pairKey, isWin, { type: 'pair', side, pids: pairPids, centerPid: null });

      // Trios: pair + each center player
      byZone.C.forEach(cpid => {
        const trioKey = `trio|${side}|${pairPids.join('|')}|${cpid}`;
        acc(trioKey, isWin, { type: 'trio', side, pids: pairPids, centerPid: cpid });
      });
    });
  });

  const playerName = pid => {
    const p = allPlayers?.find(pl => pl.id === pid);
    return p?.nickname || p?.name?.split(' ')[0] || '?';
  };

  return Object.entries(combos)
    .filter(([, c]) => c.played >= 3)
    .map(([key, c]) => ({
      key,
      type: c.type,
      side: c.side,
      pids: c.pids,
      centerPid: c.centerPid,
      names: c.pids.map(playerName),
      centerName: c.centerPid ? playerName(c.centerPid) : null,
      played: c.played,
      wins: c.wins,
      winRate: Math.round((c.wins / c.played) * 100),
      lowSample: c.played < 8,
    }))
    .sort((a, b) => b.winRate - a.winRate || b.played - a.played);
}
```

## New component: `src/components/LineupStatsSection.jsx`

```jsx
import React from 'react';
import { COLORS, FONT, RADIUS } from '../utils/theme';

export default function LineupStatsSection({ lineupStats }) {
  if (!lineupStats?.length) return null;

  const dPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'D');
  const sPairs = lineupStats.filter(l => l.type === 'pair' && l.side === 'S');
  const dTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'D');
  const sTrios = lineupStats.filter(l => l.type === 'trio' && l.side === 'S');

  if (!dPairs.length && !sPairs.length && !dTrios.length && !sTrios.length) return null;

  return (
    <>
      {/* SectionHeader inline — import from ui.jsx if available */}
      <div style={{ padding: '12px 16px 4px' }}>
        <span style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600,
          color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          Lineup analytics
        </span>
      </div>
      {dPairs.length > 0 && (
        <LineupGroup label="Dorito pairs" items={dPairs} color="#fb923c" />
      )}
      {sPairs.length > 0 && (
        <LineupGroup label="Snake pairs" items={sPairs} color="#22d3ee" />
      )}
      {dTrios.length > 0 && (
        <LineupGroup label="Dorito trios" items={dTrios} color="#fb923c" showCenter />
      )}
      {sTrios.length > 0 && (
        <LineupGroup label="Snake trios" items={sTrios} color="#22d3ee" showCenter />
      )}
    </>
  );
}

function LineupGroup({ label, items, color, showCenter }) {
  return (
    <div style={{ margin: '0 16px 8px', background: '#0f172a',
      border: '1px solid #1a2234', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px 4px', borderBottom: '1px solid #111827',
        fontFamily: FONT, fontSize: 9, fontWeight: 600,
        color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </div>
      {items.slice(0, 5).map((item, i) => {
        const wr = item.winRate;
        const wrColor = wr >= 60 ? '#22c55e' : wr >= 45 ? '#f59e0b' : '#ef4444';
        return (
          <div key={item.key} style={{
            display: 'grid', gridTemplateColumns: '1fr 80px 44px',
            alignItems: 'center', gap: 8, padding: '10px 14px',
            borderBottom: i < items.length - 1 ? '1px solid #111827' : 'none',
            opacity: item.lowSample ? 0.65 : 1,
          }}>
            <div>
              <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600,
                color: COLORS.text }}>
                {item.names.join(' + ')}
              </div>
              {showCenter && item.centerName && (
                <div style={{ fontFamily: FONT, fontSize: 10, color: '#475569', marginTop: 1 }}>
                  + {item.centerName}
                </div>
              )}
              <div style={{ fontFamily: FONT, fontSize: 10, color: '#334155', marginTop: 1 }}>
                {item.played} pts{item.lowSample ? ' · low n' : ''}
              </div>
            </div>
            <div style={{ height: 5, background: '#1a2234', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${wr}%`,
                background: wrColor, borderRadius: 3 }} />
            </div>
            <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700,
              color: wrColor, textAlign: 'right' }}>
              {wr}%
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

## `PlayerStatsPage.jsx` — wire lineup stats

```js
import LineupStatsSection from '../components/LineupStatsSection';
import { computeLineupStats } from '../utils/generateInsights';

// In useMemo block (after raw is computed):
const lineupStats = useMemo(() => {
  if (scopeParam === 'match') return null;
  // Build simplified point list for lineup computation
  const pts = raw.playerPoints.map(pp => ({
    players: pp.teamData?.players || [],
    assignments: pp.teamData?.assignments || [],
    outcome: pp.isWin ? 'win' : 'loss',
  }));
  return computeLineupStats(pts, null, players);
}, [raw.playerPoints, players, scopeParam]);

// In JSX — add after existing stats sections:
{lineupStats && lineupStats.length > 0 && (
  <LineupStatsSection lineupStats={lineupStats} />
)}
```

---

# WHAT NOT TO CHANGE
- `TrainingSquadsPage.jsx`
- `TrainingSetupPage.jsx`
- `TrainingResultsPage.jsx`
- Firestore rules
- Match scouting (MatchPage) — leave untouched

---

# BUILD & COMMIT

After all 4 parts:
```
npx vite build
```
Must pass with 0 errors.

Commit message:
```
feat: status system + layout scope + lineup analytics + zone picker

Part 1: tournament/training status (open/live/closed), eventType (sparing),
  isTest flag, session context bar in App, LIVE toggle buttons
Part 2: zone picker (D/C/S) in QuickLogView — synthetic position data
  for accurate lineup analytics without full canvas scouting
Part 3: layout scope in PlayerStatsPage, ScoutedTeamPage, ScoutRankingPage
  — aggregate all events sharing same layoutId
Part 4: computeLineupStats() — pair/trio win rates, LineupStatsSection component
```
