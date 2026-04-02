# Polish Sprint — Make PbScoutPro Pro

## 🎨 Visual polish

### Icons & branding
- [ ] Replace emoji toolbar icons (🏷️ 〰️ ⚠️ 🔥 ✏️ 🔍) with custom SVG icons
  Emoji renders differently per OS/browser. SVG = pixel-perfect everywhere.
  Style: thin line icons, 18px, stroke only, matching accent color when active.
- [ ] App icon / favicon — custom paintball-themed icon (not generic 🎯 emoji)
- [ ] Loading states — skeleton screens instead of "⏳ Ładowanie..."
- [ ] Empty states — illustrations instead of plain text ("Add your first layout")

### Typography & spacing
- [ ] Audit font sizes — ensure hierarchy: page title > section > card > detail
- [ ] Consistent padding/margins across all pages (use R.layout tokens)
- [ ] Card styles — unified border radius, shadow, hover state across all card types
- [ ] Modal styles — consistent width, padding, animation

### Color & contrast
- [ ] Audit text contrast ratios (WCAG AA minimum: 4.5:1)
- [ ] Heatmap colors — test on color-blind users (deuteranopia: red/green issue)
  Consider: safe=white→yellow, arc=orange, exposed=purple (no red/green)
- [ ] Active/inactive states — clear visual distinction on all toggles

## ⚡ Performance

### Load speed
- [ ] Lazy load pages (React.lazy + Suspense on routes)
- [ ] Image compression — layout images are base64 in Firestore, check sizes
- [ ] Debounce Firestore listeners (onSnapshot can fire rapidly)

### Canvas performance
- [ ] Visibility heatmap — use OffscreenCanvas + ImageData instead of fillRect loop
  Current: ~27k fillRect calls. ImageData: 1 putImageData call = 10× faster.
- [ ] Cache visibility grid — don't recompute when toggling layers
- [ ] Throttle drag-to-explore recomputation (already 150ms, verify)

### Worker
- [ ] SharedArrayBuffer if supported (parallel grid computation)
- [ ] Transfer ArrayBuffer instead of Array.from() in postMessage (zero-copy)

## 📱 Mobile UX

### Touch interactions
- [ ] Verify ALL interactive elements ≥ 44px (Playwright test exists)
- [ ] Swipe gestures — swipe between tactic steps (instead of tap 1/2/3)
- [ ] Pull-to-refresh on lists (layouts, tournaments, teams)
- [ ] Haptic feedback on player placement (navigator.vibrate)

### Responsive
- [ ] Test every screen on iPhone SE (375px) — smallest common viewport
- [ ] Bottom sheet pattern for info panels (instead of below-canvas sections)
- [ ] Keyboard avoidance — inputs shouldn't be hidden behind keyboard on mobile

## 🔒 Robustness

### Error handling
- [ ] Firestore offline support — show cached data when offline
- [ ] Network error messages — "Brak połączenia" banner
- [ ] Undo last action — at least for player placement and shot placement
- [ ] Auto-save indicator — show "Saved ✓" / "Saving..." in header

### Data integrity
- [ ] Validate bunker positions on save (0 < x < 1, 0 < y < 1)
- [ ] Prevent duplicate bunker names in same layout
- [ ] Max image size limit with user feedback (currently just compresses silently)

## 🌟 Pro features (quick wins)

- [ ] Dark/light theme toggle (currently dark only — some users scout outdoors)
- [ ] Keyboard shortcuts: Escape = deselect, 1-5 = select player, Z = undo
- [ ] Export tactic as image (canvas.toDataURL → share/download)
- [ ] Share layout via link (generate read-only shareable URL)

---

## How to work through this

For Claude Code:
```
> Read POLISH_SPRINT.md. Start with "Icons & branding" — replace emoji 
  toolbar icons with SVG. Use thin line style, 18px, currentColor stroke.
  Show me the result.
```

Each item is small enough for one Claude Code session. Do 3-5 per day.
Commit after each with message: `polish: [item description]`
