# CC BRIEF: Design System Implementation
**Priority:** HIGH — approved prototypes ready for implementation
**Reference prototypes:** All in /mnt/user-data/outputs/ (HTML files)
**Run `npm run precommit` before every commit. Push after each part.**

---

## DESIGN PRINCIPLES (apply everywhere)
- **Amber (#f59e0b)** — every primary action, CTA, active selections
- **Green (#22c55e)** — ONLY for "won" / "success" / "confirmed"
- **Red (#ef4444)** — ONLY for "hit" / "delete" / "danger"
- **Blue (#3b82f6)** — ONLY for opponent team / secondary info
- **Orange (#f97316)** — ONLY for bump stops / arc / LIVE badge
- **Gray (#94a3b8)** — everything neutral / inactive / secondary
- Font: Inter, -apple-system, sans-serif
- Border radius: 10-14px for cards/buttons, 8px for chips, 16-20px for sheets
- Background: #0f172a for surfaces in sheets, #111827 for main surfaces

---

## PART 1: Save Point Bottom Sheet Redesign

Replace the entire BottomSheet content in MatchPage (lines ~595-682).

### New design (Variant A — approved):
```jsx
<BottomSheet open={saveSheetOpen} onClose={() => setSaveSheetOpen(false)} maxHeight="auto">
  {/* Question */}
  <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 500, color: COLORS.textDim, textAlign: 'center', marginBottom: 14 }}>
    Who won this point?
  </div>

  {/* Outcome cards */}
  <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
    {[
      { val: 'win_a', label: teamA?.name?.slice(0, 10) || 'A' },
      { val: 'win_b', label: teamB?.name?.slice(0, 10) || 'B' },
    ].map(o => (
      <div key={o.val} onClick={() => setOutcome(outcome === o.val ? null : o.val)}
        style={{
          flex: 1, padding: '16px 8px 14px', borderRadius: 14, textAlign: 'center',
          cursor: 'pointer', position: 'relative', overflow: 'hidden',
          border: `2px solid ${outcome === o.val ? '#22c55e50' : COLORS.border}`,
          background: outcome === o.val ? '#22c55e08' : '#0f172a',
        }}>
        <div style={{
          fontFamily: FONT, fontSize: 9, fontWeight: 700, letterSpacing: 1,
          color: outcome === o.val ? '#22c55e' : 'transparent',
          marginBottom: 6, height: 14,
        }}>{outcome === o.val ? 'WINNER' : '\u00A0'}</div>
        <div style={{
          fontFamily: FONT, fontSize: 15, fontWeight: 700,
          color: outcome === o.val ? COLORS.text : COLORS.textMuted,
          position: 'relative', zIndex: 1,
        }}>{o.label}</div>
        {outcome === o.val && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse at bottom center, rgba(34,197,94,0.12) 0%, transparent 70%)',
          }} />
        )}
      </div>
    ))}
    <div onClick={() => setOutcome(outcome === 'timeout' ? null : 'timeout')}
      style={{
        flex: '0 0 54px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 14, cursor: 'pointer',
        border: `2px solid ${outcome === 'timeout' ? '#f59e0b50' : COLORS.border}`,
        background: outcome === 'timeout' ? '#f59e0b08' : '#0f172a',
        fontSize: 20,
      }}>⏱</div>
  </div>

  {/* Side change — inline pill */}
  {!editingId && (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px', marginBottom: 20 }}>
      <span style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, fontWeight: 500 }}>Next point</span>
      <div style={{ display: 'flex', background: '#0f172a', borderRadius: 10, border: `1px solid ${COLORS.border}`, padding: 3 }}>
        <div onClick={() => setSideChange(false)} style={{
          padding: '8px 16px', borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', color: !sideChange ? '#f59e0b' : '#475569',
          background: !sideChange ? '#1e293b' : 'transparent',
        }}>Same</div>
        <div onClick={() => setSideChange(true)} style={{
          padding: '8px 16px', borderRadius: 8, fontFamily: FONT, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', color: sideChange ? '#f59e0b' : '#475569',
          background: sideChange ? '#1e293b' : 'transparent',
        }}>Swap sides</div>
      </div>
    </div>
  )}

  {/* Save button */}
  <Btn variant="accent" disabled={!outcome || saving}
    onClick={async () => {
      await savePoint();
      if (sideChange) setFieldSide(s => s === 'left' ? 'right' : 'left');
      setSideChange(false);
      setSaveSheetOpen(false);
    }}
    style={{
      width: '100%', justifyContent: 'center', minHeight: 52, fontWeight: 700, fontSize: 15,
      borderRadius: 14,
      background: outcome ? 'linear-gradient(135deg, #f59e0b, #ef8b00)' : '#1e293b',
      color: outcome ? '#000' : '#475569',
      boxShadow: outcome ? '0 4px 24px #f59e0b25' : 'none',
      border: 'none',
    }}>
    {saving ? 'Saving...' : outcome ? 'Save point' : 'Select winner to save'}
  </Btn>

  {/* More options — hidden by default */}
  <div onClick={() => setMoreInfoOpen(v => !v)}
    style={{ textAlign: 'center', padding: '14px 0 0', fontFamily: FONT, fontSize: 11, color: '#475569', cursor: 'pointer' }}>
    {moreInfoOpen ? '− hide options' : '+ penalties · overtime · notes'}
  </div>

  {moreInfoOpen && (
    <div style={{ paddingTop: 14, marginTop: 12, borderTop: '1px solid #1e293b20', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontFamily: FONT, fontSize: 12, color: COLORS.textDim, fontWeight: 500, minWidth: 65 }}>Penalties</span>
        <Select value={draftA.penalty} onChange={v => setDraftA(prev => ({ ...prev, penalty: v }))}
          style={{ flex: 1, background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
          <option value="">{teamA?.name?.slice(0,6)} — none</option>
          {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
        <Select value={draftB.penalty} onChange={v => setDraftB(prev => ({ ...prev, penalty: v }))}
          style={{ flex: 1, background: '#0f172a', border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
          <option value="">{teamB?.name?.slice(0,6)} — none</option>
          {PENALTIES.filter(Boolean).map(p => <option key={p} value={p}>{p}</option>)}
        </Select>
      </div>
      {/* OT toggle */}
      <div onClick={() => setIsOT(!isOT)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <div style={{
          width: 44, height: 26, borderRadius: 13, padding: 3,
          background: isOT ? '#f59e0b' : '#1e293b', transition: 'background .2s',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)', transition: 'transform .2s',
            transform: isOT ? 'translateX(18px)' : 'translateX(0)',
          }} />
        </div>
        <span style={{ fontFamily: FONT, fontSize: 13, color: isOT ? '#f59e0b' : COLORS.textMuted }}>Overtime</span>
      </div>
      <input value={draftComment} onChange={e => setDraftComment(e.target.value)}
        placeholder="Quick note (optional)"
        style={{
          fontFamily: FONT, fontSize: 12, padding: '10px 14px', borderRadius: 10,
          background: '#0f172a', color: COLORS.textMuted, border: `1px solid ${COLORS.border}`,
          width: '100%', outline: 'none',
        }} />
    </div>
  )}

  {/* Close match */}
  {!editingId && (
    <div onClick={() => { closeMatchConfirm.ask(true); setSaveSheetOpen(false); }}
      style={{ textAlign: 'center', padding: '10px 0 0', fontFamily: FONT, fontSize: 10, color: '#334155', cursor: 'pointer' }}>
      Close match (mark as final)
    </div>
  )}
</BottomSheet>
```

DELETE the old BottomSheet content between `<BottomSheet open={saveSheetOpen}>` and `</BottomSheet>`.
Also DELETE the `Back to heatmap` button — heatmap view is accessed from main view toggle.

---

## PART 2: Assign Bottom Sheet — Compact Grid

When toolbar 👤 Assign is tapped, show a bottom sheet with 3-column grid.

### Current behavior
Toolbar action 'assign' opens... nothing currently (CC didn't wire it up).

### New: Create assign bottom sheet state + UI in MatchPage

Add state:
```javascript
const [assignTarget, setAssignTarget] = useState(null); // player index to assign
```

In `handleToolbarAction`, for 'assign':
```javascript
if (action === 'assign') {
  setAssignTarget(idx);
  setToolbarPlayer(null);
}
```

Add assign BottomSheet:
```jsx
<BottomSheet open={assignTarget !== null} onClose={() => setAssignTarget(null)}>
  <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, textAlign: 'center', marginBottom: 12 }}>
    Assign {assignTarget !== null ? getChipLabel(assignTarget) : ''}
  </div>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
    {roster.map(r => {
      const taken = draft.assign.some((a, i) => a === r.id && i !== assignTarget);
      return (
        <div key={r.id} onClick={() => {
          if (taken) return;
          pushUndo();
          setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = r.id; return n; });
          setAssignTarget(null);
        }}
          style={{
            padding: '12px 8px', borderRadius: 12, textAlign: 'center',
            cursor: taken ? 'default' : 'pointer', opacity: taken ? 0.25 : 1,
            background: '#0f172a', border: `1.5px solid ${COLORS.border}`,
          }}>
          <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>#{r.number}</div>
          <div style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
            {(r.nickname || r.name || '').slice(0, 5)}
          </div>
        </div>
      );
    })}
  </div>
  {assignTarget !== null && draft.assign[assignTarget] && (
    <div onClick={() => {
      pushUndo();
      setDraft(prev => { const n = { ...prev, assign: [...prev.assign] }; n.assign[assignTarget] = null; return n; });
      setAssignTarget(null);
    }}
      style={{ textAlign: 'center', padding: '12px 0 0', fontFamily: FONT, fontSize: 12, color: COLORS.textDim, cursor: 'pointer' }}>
      Unassign
    </div>
  )}
</BottomSheet>
```

---

## EXECUTION ORDER
1. Part 1 — Save sheet redesign → push
2. Part 2 — Assign grid bottom sheet → push

After ALL:
```bash
npm run build
npm run precommit
```

## TESTING
- [ ] Save sheet: outcome cards with WINNER label + green glow
- [ ] Save sheet: timeout ⏱ as small card
- [ ] Save sheet: pill switch Same/Swap sides
- [ ] Save sheet: save button disabled until outcome selected
- [ ] Save sheet: OT is toggle switch (not button)
- [ ] Save sheet: + penalties hidden by default
- [ ] Assign: 3-column grid with #Num + short name
- [ ] Assign: taken players grayed out
- [ ] Assign: unassign option at bottom
