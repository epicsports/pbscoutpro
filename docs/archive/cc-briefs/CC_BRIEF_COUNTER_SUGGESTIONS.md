# CC_BRIEF_COUNTER_SUGGESTIONS.md
## Counter Suggestions — Tactical Recommendations Based on Opponent Tendencies

**Priority:** HIGH — USP of the app, transforms data into actionable coaching advice
**Context:** Coach sees opponent insights ("They push Snake 70%", "Predictable formation 2D 1S 2C"). Now the app should generate specific counter-actions: "Stack dorito defense", "Send runner to uncovered zone".
**Design specs:** Inline — this file contains full spec.

---

## Part 1: Counter engine in generateInsights.js

### New export: `generateCounters(insights, stats, points, field)`

Each existing insight type maps to one or more counter-suggestions.
Counters are generated ONLY from existing insights — no new data fetching needed.

```javascript
export function generateCounters(insights, stats, points, field) {
  const counters = [];
  
  insights.forEach(insight => {
    switch (insight.type) {
      // "Aggressive Snake 50 — reached in 70%"
      // → Counter: hold lanes to that zone, don't let them pass
      case 'aggressive':
        if (insight.text.includes('Snake')) {
          counters.push({
            priority: 'high',
            action: 'Hold snake lanes',
            detail: 'They push Snake 50 aggressively. Assign a dedicated lane holder to prevent the runner from reaching the fifty.',
            icon: '🛡',
          });
        } else if (insight.text.includes('Dorito')) {
          counters.push({
            priority: 'high',
            action: 'Hold dorito lanes',
            detail: 'They push Dorito 50 aggressively. Assign a dedicated lane holder to prevent the runner from reaching the fifty.',
            icon: '🛡',
          });
        }
        break;

      case 'low_runners':
        // "Low runners (<2 avg)" → push aggressively
        counters.push({
          priority: 'high',
          action: 'Push aggressively',
          detail: 'They stay near base with few runners. Send 2-3 runners to control territory and pressure them.',
          icon: '⚡',
        });
        break;

      case 'side_dominant':
        // "Snake dominant (>65%)" → stack opposite + send runner to weak side
        if (insight.text.toLowerCase().includes('snake')) {
          counters.push({
            priority: 'high',
            action: 'Attack their weak dorito',
            detail: 'They stack snake side. Send a runner to dorito — it will be under-defended.',
            icon: '🎯',
          });
        } else if (insight.text.toLowerCase().includes('dorito')) {
          counters.push({
            priority: 'high',
            action: 'Attack their weak snake',
            detail: 'They stack dorito side. Send a runner to snake — it will be under-defended.',
            icon: '🎯',
          });
        }
        break;

      case 'uncovered':
        // "Uncovered zone: Snake" → send runner there
        const zone = insight.text.match(/Uncovered.*?:\s*(\w+)/i)?.[1];
        if (zone) {
          counters.push({
            priority: 'high',
            action: `Send runner to ${zone.toLowerCase()}`,
            detail: `${zone} side is consistently uncovered. A runner there will face no opposition on the break.`,
            icon: '🏃',
          });
        }
        break;

      case 'dependency':
        // "Player dependency: Koe (+25% win rate impact)"
        const playerMatch = insight.text.match(/dependency.*?:\s*(.+?)[\s(]/i);
        const playerName = playerMatch?.[1] || 'key player';
        counters.push({
          priority: 'medium',
          action: `Eliminate ${playerName} early`,
          detail: `Their win rate drops significantly without ${playerName}. Focus fire on their position at the break.`,
          icon: '💀',
        });
        break;

      case 'pattern':
        // "Predictable — same formation 73% (2D 1S 2C)"
        if (insight.text.includes('Predictable')) {
          const formMatch = insight.text.match(/\(([^)]+)\)/);
          const form = formMatch?.[1] || '';
          counters.push({
            priority: 'high',
            action: 'Counter their predictable formation',
            detail: `They run ${form} most of the time. Set up lanes and positions specifically to counter this formation before the break.`,
            icon: '🧠',
          });
        }
        // "Unpredictable" → no specific counter, play solid
        if (insight.text.includes('Unpredictable')) {
          counters.push({
            priority: 'low',
            action: 'Play solid fundamentals',
            detail: 'They vary formations — no single counter works. Focus on good lane discipline and communication.',
            icon: '⚖',
          });
        }
        break;

      case 'center_control':
        // "Center control (>70%)" → contest the center
        counters.push({
          priority: 'medium',
          action: 'Contest center control',
          detail: 'They dominate the center. Send a center player with good lane coverage to challenge their positioning.',
          icon: '🎯',
        });
        break;

      case 'full_push':
        // "Full push (≥3.5 avg runners)" → hold lanes, don't over-extend
        counters.push({
          priority: 'medium',
          action: 'Hold lanes on break',
          detail: 'They push many runners. Focus on lane discipline during the break to catch them in the open.',
          icon: '🛡',
        });
        break;
    }
  });

  // Deduplicate by action
  const seen = new Set();
  return counters.filter(c => {
    if (seen.has(c.action)) return false;
    seen.add(c.action);
    return true;
  }).sort((a, b) => {
    const prio = { high: 0, medium: 1, low: 2 };
    return (prio[a.priority] || 1) - (prio[b.priority] || 1);
  }).slice(0, 4); // max 4 counter suggestions
}
```

---

## Part 2: Display on ScoutedTeamPage

### New section: "Counter plan" — shown BELOW insights, ABOVE stats

```jsx
{counters.length > 0 && (
  <div>
    <SectionLabel>Counter plan</SectionLabel>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {counters.map((c, i) => (
        <CounterCard key={i} counter={c} />
      ))}
    </div>
  </div>
)}
```

### CounterCard component

```jsx
function CounterCard({ counter }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = { high: '#f59e0b', medium: '#3b82f6', low: '#475569' }[counter.priority];
  
  return (
    <div onClick={() => setExpanded(!expanded)} style={{
      background: '#0f172a',
      border: `1px solid ${priorityColor}25`,
      borderLeft: `3px solid ${priorityColor}`,
      borderRadius: 10,
      padding: '12px 14px',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16 }}>{counter.icon}</span>
        <span style={{
          flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600,
          color: COLORS.text,
        }}>{counter.action}</span>
        <span style={{
          fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
          background: `${priorityColor}15`, color: priorityColor,
          textTransform: 'uppercase', letterSpacing: '.5px',
        }}>{counter.priority}</span>
      </div>
      {expanded && (
        <div style={{
          fontFamily: FONT, fontSize: 12, color: COLORS.textMuted,
          marginTop: 8, lineHeight: 1.5,
        }}>{counter.detail}</div>
      )}
    </div>
  );
}
```

### Wire in ScoutedTeamPage
```javascript
import { generateInsights, generateCounters, ... } from '../utils/generateInsights';

const insights = useMemo(() => generateInsights(stats, heatmapPoints, field, roster), [...]);
const counters = useMemo(() => generateCounters(insights, stats, heatmapPoints, field), [insights, stats, heatmapPoints, field]);
```

Render order on ScoutedTeamPage:
1. Insights (existing)
2. **Counter plan (NEW)**
3. Coaching stats (existing)
4. Heatmap (existing)
5. Player cards (existing)

---

## Part 3: Counter plan on training results

In training mode, counter suggestions are less relevant (you're scouting your own team).
BUT — for self-scouting, counters show what an OPPONENT could do against YOUR patterns.

On TrainingResultsPage, show counters with different framing:
- Header: "What opponents might do against you"
- Same engine, same cards, but contextually reframed

---

## Verification checklist
- [ ] `generateCounters` returns 0-4 suggestions based on insights
- [ ] Each insight type maps to at least one counter
- [ ] Counters sorted by priority (high → medium → low)
- [ ] No duplicate counters
- [ ] CounterCard renders with icon, action, priority badge
- [ ] Tap to expand/collapse detail text
- [ ] Counter section visible on ScoutedTeamPage below insights
- [ ] Counter section visible on TrainingResultsPage (reframed)
- [ ] Build passes
