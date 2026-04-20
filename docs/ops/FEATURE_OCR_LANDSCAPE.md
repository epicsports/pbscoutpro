# Feature: OCR Bunker Names + Landscape Edit Mode

## 1. OCR: Read bunker names from layout image

### Why
Setting up 20 bunkers manually = 15 minutes of painful mobile typing.
Most NXL layout images have bunker names printed on them. AI can read them.

### How
Use Claude Vision API (already available — ScheduleImport uses it).

**Flow:**
1. Layout detail → Setup → "🔍 Rozpoznaj bunkry z obrazka"
2. App sends layout image to Claude Vision with prompt:
   "Identify all paintball bunker labels on this field layout image. 
   For each bunker, return: name, approximate x position (0-1 from left), 
   approximate y position (0-1 from top). Return JSON only."
3. Claude returns: `[{name:"D1", x:0.25, y:0.15}, {name:"S50", x:0.50, y:0.85}, ...]`
4. App shows results on canvas as yellow markers with names
5. User reviews: ✓ Accept all / tap to edit individual / × dismiss
6. Accepted bunkers auto-populate editBunkers with guessType() for each

**API call (same pattern as ScheduleImport):**
```javascript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }},
        { type: "text", text: `Analyze this NXL paintball field layout image. Find all bunker labels/names visible on the image. For each bunker, return its name and approximate position as x,y coordinates where (0,0)=top-left, (1,1)=bottom-right. Return ONLY a JSON array: [{"name":"D1","x":0.25,"y":0.15}, ...]. Include mirror pairs (same name on both sides). Common bunker names: D1,D2,D3,D50,S1,S2,S3,S50,Snake,Dorito,Can,Brick,Temple,Wing,Dallas,Dog,Hammer,Ring,Cobra,Palma.` }
      ],
    }],
  }),
});
```

**User needs to provide API key** (same as ScheduleImport). Store in sessionStorage.

### UI in Setup modal:
```
[🔍 Rozpoznaj bunkry z obrazka]
Wymaga klucza API Claude (jednorazowo)
```

Tap → if no API key, ask for it → send image → show loading → show results overlay on canvas → accept/reject.

---

## 2. Landscape Mode for Configuration

### Why
On 375px mobile, bunker editing is painful:
- Canvas is ~350px wide → bunker labels overlap
- Keyboard covers half the screen when naming
- Fat fingers can't precisely tap small bunkers

### How
When user enters any edit mode (bunker naming, zone drawing, calibration),
suggest or auto-rotate to landscape.

**Implementation:**
```javascript
// Request landscape orientation
async function requestLandscape() {
  try {
    await screen.orientation.lock('landscape');
  } catch (e) {
    // Fallback: show "Obróć telefon" message
  }
}

// Release on exit
function releaseLandscape() {
  try { screen.orientation.unlock(); } catch(e) {}
}
```

**Note:** `screen.orientation.lock()` only works in fullscreen mode on most
browsers. Alternative approach:
- Detect orientation change with `matchMedia('(orientation: landscape)')`
- When landscape detected while editing: expand canvas to fill screen
- Show floating toolbar (FAB) for edit controls
- When portrait: show normal layout

**Simplified approach (no lock, just optimize):**
```css
@media (orientation: landscape) {
  .layout-detail-canvas-area {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: var(--bg);
  }
}
```

When editing + landscape → canvas goes fullscreen automatically.
Exit button (×) returns to normal layout.

### UX:
```
User taps "Nazwy" to edit bunkers
→ Banner: "Obróć telefon dla lepszego widoku 📱↔️"
→ User rotates phone
→ Canvas fills entire screen in landscape
→ FAB with edit tools (save, undo, close)
→ Tap bunker → BunkerCard slides from right (not bottom)
→ Rotate back → returns to normal layout
```

---

## Implementation for Claude Code

### OCR (Task):
1. Create `src/components/OCRBunkerDetect.jsx` — modal with API key input + detect button
2. On detect: send image to Claude Vision, parse JSON response
3. Show results as overlay markers on canvas (yellow dots with names)
4. Accept button: merge into editBunkers (guessType for each)
5. Wire into Setup modal as button

### Landscape (Task):
1. Add CSS media query for landscape in `global.css`
2. In LayoutDetailPage: detect landscape + edit mode → expand canvas fullscreen  
3. Add "Obróć telefon" hint when entering edit mode on mobile
4. BunkerCard: slide from right in landscape, from bottom in portrait
