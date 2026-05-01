# CC_BRIEF_QUICKLOG_VISUAL_REDESIGN

**Status:** ACTIVE  
**Owner:** Claude Code  
**Author:** Opus (chat 2026-05-01)  
**Format:** Decision-tree (IF-THEN per STEP, `[ESCALATE TO JACEK]` only on true blockers)  
**Target deadline:** Niedzielny sparing 2026-05-03  
**Branch:** `feat/quicklog-visual-redesign`

---

## Goal

Visual refactor of `QuickLogView.jsx` — flow już naprawiony przez `CC_BRIEF_TRAINING_SCOUTING_FLOW_FIX.md` (3 stages: Players → Positions → Outcome). Teraz **redesign wizualny** żeby:

- Stage 1: KIOSK-style kafelki gracza z metrykami (win% + survival + punkty dziś), awatary 48px (mobile) / 64px (tablet, 3-col grid)
- Stage 2: ikonki Dorito/Center/Snake **re-used z QuickShotPanel** zamiast tekstu, awatary 48px / 64px
- Stage 4: bez większych zmian (już OK)
- SelfLog FAB **ukryty** podczas całego QuickLog flow (1, 2, 4)
- Mockupy: chat 2026-05-01 (Opus), final mockup `quicklog_redesign_FINAL_full_flow` + `stage_2_with_icons_bigger_avatars`

**Out of scope:** Stage 3 (live tracking) — zostaje jak na produkcji.

---

## Context — co już jest gotowe (NIE re-implementuj)

- ✅ 3-stage state machine w `QuickLogView.jsx` (Players → Positions → Outcome) — flow z poprzedniego briefu
- ✅ Set→Array selection order (gracze przypisani do slotów w kolejności tap)
- ✅ Zone selections persist between stages
- ✅ Bug A (squad route in TrainingScoutTab) — fixed
- ✅ Bug B (canvas prefill from QuickLog) — fixed
- ✅ § 57 Phase 1a foundation (slotIds, _meta arrays, observation writers)
- ✅ Lucide-react już w projekcie (commit `95db593` z 2026-04-19)
- ✅ QuickShotPanel.jsx zawiera ikonki Dorito/Center/Snake (re-use cel)

**Pre-flight check:** to jest **WIZUALNY** redesign, nie refaktor flow. Logika stage'ów + Firestore writes pozostają bez zmian. Tylko JSX/styles + jeden warunek render'u FAB.

---

## STEP 0 — Verify Opus assumptions (MANDATORY)

Opus pisał ten brief bez dostępu do live kodu. Zanim dotkniesz JSX, zweryfikuj:

### Assumption A: QuickLogView ma 3 stages
**Verify:** `grep -n "stage\|step\|currentStep" src/components/QuickLogView.jsx | head -30`

- **IF** plik ma state typu `stage`/`step` z wartościami `'players' | 'positions' | 'outcome'` (lub podobne) → **OK, idź do Assumption B**
- **IF** plik nie istnieje albo ma inny model (np. wszystko na jednym ekranie) → **`[ESCALATE TO JACEK]`** — flow z poprzedniego briefu nie wszedł, redesign musi czekać

### Assumption B: SelfLog FAB jest w MatchPage.jsx (nie w QuickLogView)
**Verify:** `grep -n "SelfLog\|FAB\|MapPin\|playerId.*field\.layout" src/pages/MatchPage.jsx`

- **IF** FAB renderuje się w MatchPage z warunkiem `playerId && field?.layout` (lub podobnym) → **OK, znamy lokalizację, ukrywanie zrobimy w STEP 2**
- **IF** FAB jest w innym pliku (np. `MainPage`, `AppShell`) → **zaktualizuj brief: nazwa pliku FAB = `<plik>`**, kontynuuj
- **IF** FAB nie istnieje → **`[ESCALATE TO JACEK]`** — niemożliwe (commit `ffb9b43` go dodał), oznacza że został usunięty i Jacek o tym nie wie

### Assumption C: QuickShotPanel ma ikonki Dorito/Center/Snake jako SVG
**Verify:** `grep -rn "QuickShotPanel\|quickShot" src/components/ src/pages/ | head -10` aby znaleźć plik, potem:
`grep -n "Dorito\|Snake\|<svg\|fill=" src/components/<znaleziony plik>`

- **IF** ikonki są inline SVG w komponencie → **OK, w STEP 1 wyodrębnij paths**
- **IF** ikonki to lucide-react imports (np. `<Triangle>`, `<Plus>`, `<Activity>`) → **OK, w STEP 1 zanotuj nazwy komponentów**
- **IF** plik nie zawiera ikon Dorito/Center/Snake → **`[ESCALATE TO JACEK]`** — Jacek myli się co do lokalizacji, potrzebny screen z DevTools żeby zlokalizować komponent

**Output STEP 0:** raport ✅/❌ dla A, B, C + lokalizacja FAB + lokalizacja ikon. Wklej do chatu, **NIE commit'uj jeszcze nic**.

---

## STEP 1 — Discovery: extract zone icons from QuickShotPanel

Cel: wyodrębnić DOKŁADNIE te same ikonki które są w QuickShotPanel, żeby Stage 2 wyglądał 1:1.

### 1a. Open QuickShotPanel file (znalezione w Assumption C)
Przeczytaj cały JSX dla części "Dorito" / "Center" / "Snake" buttons.

### 1b. Wyodrębnij dla każdej zony:
- **SVG path / icon import** (cały markup)
- **Color** (np. `#ef4444` dla Dorito, `#a855f7` dla Center, `#10b981` dla Snake — lub cokolwiek jest w kodzie)
- **Size attributes** (width/height — żeby wiedzieć czy są scale'owalne)
- **Stroke vs fill** (Dorito wygląda na fill, Center na stroke, Snake na stroke z complex path)

### 1c. Czy są w shared component?
- **IF** ikonki są w shared component (np. `<ZoneIcon zone="dorito" />`) → **OK, importuj ten komponent w QuickLogView**
- **IF** ikonki są inline w QuickShotPanel → **wyodrębnij do nowego shared komponentu** `src/components/ZoneIcon.jsx` z props `{ zone: 'dorito'|'center'|'snake', size: number, active: boolean }` i refaktor QuickShotPanel żeby też go używał (DRY)

**Output STEP 1:** Zone icon paths/imports + colors + decision (existing component vs new ZoneIcon). Wklej do chatu.

---

## ⏸ JACEK CHECKPOINT 1

**STOP. Nie kontynuuj bez zielonego światła od Jacka.**

Wklej w chacie:
- Wynik STEP 0 (✅/❌ dla A/B/C)
- Wynik STEP 1 (zone icon source + decision o ZoneIcon component)

Jacek zatwierdzi że dobrze rozumiesz kod **przed** napisaniem JSX.

---

## STEP 2 — Hide SelfLog FAB during QuickLog

### 2a. Find FAB render condition
Z STEP 0 Assumption B znamy plik. Otwórz, znajdź FAB render block.

### 2b. Add `isQuickLogActive` flag
Najprostsze podejście: prop drilling z parent komponenta. Sprawdź czy MatchPage ma już state typu `quickLogOpen` / `showQuickLog`:

`grep -n "quickLog\|QuickLog" src/pages/MatchPage.jsx`

- **IF** state istnieje (np. `showQuickLog`, `quickLogVisible`) → **rozszerz warunek FAB: `&& !showQuickLog`**
- **IF** state nie istnieje → **dodaj go**: `const [quickLogActive, setQuickLogActive] = useState(false)`, ustaw `true` gdy QuickLog się otwiera, `false` na unmount/save/cancel
  - Najpewniej masz już warunek typu `if (mode === 'quickLog')` lub renderujesz `<QuickLogView>` warunkowo — używaj tego samego warunku do ukrycia FAB

### 2c. Test handle: FAB powinien zniknąć przy otwarciu QuickLog na każdym stage
Verify: `npm run dev`, otwórz match, kliknij na squad (training) → FAB znika → przejdź do Stage 2 → FAB nadal niewidoczny → Stage 4 → niewidoczny → save/cancel → FAB wraca.

**Acceptance:**
- [ ] FAB niewidoczny na Stage 1, 2, 4
- [ ] FAB wraca po zamknięciu QuickLog
- [ ] Brak warning'ów w consoli

---

## STEP 3 — Stage 1 player tile redesign

### 3a. Avatar size — increase
Mobile: 36px → **48px**  
Tablet (min-width 768px): 44px → **64px**

Dodaj media query (inline styles via React — użyj `useMediaQuery` hook lub `window.matchMedia` z `useEffect`/`useState`):

```jsx
const isTablet = window.matchMedia('(min-width: 768px)').matches;
const avatarSize = isTablet ? 64 : 48;
```

**Better approach:** użyj `useEffect` + listener na resize, żeby reagowało na zmianę orientacji tabletu.

### 3b. Tile layout (mobile + tablet identyczny, tylko rozmiary różne)

```
┌─────────────────────────────────────────────┐
│ [Avatar]  #17 Felix         72%       [✓]  │
│           ♥ 81  ⏱ 4         WIN             │
└─────────────────────────────────────────────┘
```

- Avatar 48/64px po lewej
- Środek (flex:1, min-width:0): row 1 = `#17` (11/12px amber `#f59e0b` 700) + `Felix` (16/17px 600); row 2 = ikonki z liczbami (10/12px)
- Win% + WIN label na prawo (19/22px 800 colored, 8px 600 #475569 letter-spacing 0.5px)
- Checkbox circle 26/28px na samej prawej (active: amber bg + black check; inactive: 2px border #475569)

### 3c. Lucide icons import
```jsx
import { Heart, Clock } from 'lucide-react';
```

- `<Heart fill="..." stroke="none" size={12} />` dla survival rate (FILL = colored, NO stroke)
- `<Clock stroke="#64748b" strokeWidth={2.5} size={12} />` (NO fill)

### 3d. Color coding (win rate + survival rate use same scale)
Wyodrębnij helper do `src/utils/colorScale.js` (lub gdzie pasuje):

```js
export const winRateColor = (rate) => {
  if (rate == null || isNaN(rate)) return '#64748b'; // grey for no data
  if (rate > 70) return '#22c55e'; // green
  if (rate >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
};
```

Survival rate: **same function**. Punkty dziś: zawsze neutralne `#94a3b8` (count, nie %).

### 3e. Selected state (when player tapped)
- Background: `#f59e0b08` (8% alpha amber)
- Border: 1.5px solid `#f59e0b` (mobile), 2px solid `#f59e0b` (tablet)
- Checkbox: amber bg `#f59e0b` + black `✓` (16px font, 800 weight)

### 3f. Tablet 3-column grid
```jsx
const containerStyle = {
  display: 'grid',
  gridTemplateColumns: isTablet ? 'repeat(3, 1fr)' : '1fr',
  gap: 12,
  padding: '0 12px',
};
```

### 3g. Disabled CTA when 0/5
- 0/5: bg `#0f172a`, color `#475569`, border `1px solid #1a2234`, text "Wybierz 5 zawodników"
- 5/5: bg `#f59e0b`, color `#0a0e17`, no border, text "Przypisz pozycje →"

### 3h. Footer counter
- Mobile: simple "0 / 5 wybranych" (color zmienia się: grey → green when 5)
- Tablet: counter + legenda ikonek (♥ survival · ⏱ punkty dziś) po lewej, CTA po prawej

**Acceptance:**
- [ ] Awatary 48/64px
- [ ] Win% color-coded (green/amber/red)
- [ ] Heart icon filled, Clock icon outline
- [ ] Tablet 3-col grid (verify: resize browser do >768px → grid; <768px → list)
- [ ] Disabled CTA wygląda inaczej niż active (border vs filled)

---

## STEP 4 — Stage 2 zone icon toggles

### 4a. Layout per player row (mobile + tablet identyczny model, różne rozmiary)

```
[Avatar]  Felix #17     [▲ red]  [✚ purple]  [⌇ green]
```

- Avatar: 48/64px (jak Stage 1)
- Name + #number: min-width 92px (mobile), 220px (tablet)
- 3 zone tiles: flex:1, **aspect-ratio: 1** (kwadratowe), gap 5px (mobile), 12px (tablet)
- Icon w środku tile: 22px (mobile), 40px (tablet)

### 4b. Use ZoneIcon component (z STEP 1)
```jsx
<ZoneIcon zone="dorito" size={isTablet ? 40 : 22} active={selected} />
```

Active state per zone:
- Dorito: border `#ef4444` 1.5/2px, bg `#ef444415` (15% alpha)
- Center: border `#a855f7` 1.5/2px, bg `#a855f715`
- Snake: border `#10b981` 1.5/2px, bg `#10b98115`

Inactive state (uniform):
- Border `#1a2234` 1px
- Bg `#0f172a`
- Icon color: `#64748b` (greyed)

### 4c. Mobile-only legend pill (under list)
```jsx
{!isTablet && (
  <div style={{ /* pill styles */ }}>
    <span><ZoneIcon zone="dorito" size={11} active /> Dorito</span>
    <span><ZoneIcon zone="center" size={11} active /> Centrum</span>
    <span><ZoneIcon zone="snake" size={11} active /> Snake</span>
  </div>
)}
```

Style: bg `#0d1117`, border `1px solid #1a2234`, radius 8px, padding 8px 12px, gap 14px, justify-content center, font-size 9px, color `#64748b`, weight 600.

### 4d. ⋮ menu w nagłówku
- Pozycja: header right (po nazwie tournament)
- Items: "Zaawansowany scouting →", "Pomiń pozycje", "Anuluj punkt"
- Use `MoreBtn` + `ActionSheet` z `ui.jsx` (już istnieją)
- "Zaawansowany scouting" = amber (`#f59e0b`), pozostałe `#94a3b8`

### 4e. Footer
- Mobile: "← Wróć" (ghost) + "▶ Rozpocznij punkt" (amber, flex:1)
- Tablet: "← Wróć do graczy" + "▶ Rozpocznij punkt" — większe paddings

**Acceptance:**
- [ ] Ikonki dokładnie z QuickShotPanel (STEP 1) — żadne nowe SVG
- [ ] Aspect-ratio 1:1 na zone tiles (kwadratowe, nie prostokąty)
- [ ] Active state per zona ma odpowiedni kolor border + bg tint
- [ ] ⋮ menu ma 3 items, "Zaawansowany scouting" amber
- [ ] Mobile ma legendę, tablet nie ma

---

## STEP 5 — Stage 4 verify (no changes expected)

Otwórz Stage 4 w `QuickLogView.jsx`. Sprawdź czy:
- 2 karty drużyn (red + purple/blue)
- Sekcja "Skład w tym punkcie" z color-coded zone tags

Jeśli wygląda OK, **nie dotykaj**. Jeśli czegoś brakuje → zaadresuj minimal change.

**Acceptance:** Stage 4 wygląda jak na mockupie `quicklog_redesign_FINAL_full_flow`.

---

## STEP 6 — Self-review against §27 Apple HIG

Przejdź `docs/REVIEW_CHECKLIST.md` i raportuj w formacie:

```
§ 27 self-review — QuickLog Visual Redesign:
Color discipline:
  - Win% colored only on data (green/amber/red) — ✓
  - Amber tylko na: CTA "Przypisz pozycje", "Rozpocznij punkt", checkbox active, "Zaawansowany scouting" w menu — ✓
  - Zone colors (red/purple/green) tylko na ikonkach + active borders — ✓
Elevation:
  - Page bg #0a0e17, tiles #0f172a, footer #0d1117 — ✓
Typography:
  - Hero (win%) 19/22px 800 — ✓
  - Primary (name) 14/17px 600 — ✓
  - Secondary (icons + counts) 10/12px 600 — ✓
  - Micro (WIN label) 8px 600 letter-spacing 0.5px — ✓
Touch targets:
  - Avatars 48/64px — ✓ (min 44)
  - Zone tiles aspect-ratio 1:1 ≥48px square — ✓
  - CTA height 13px padding × 2 + 14px text = ~40px — ⚠ verify ≥44 (might need 14px padding)
Cards:
  - 1 tile = 1 touch target (Stage 1 = select player; Stage 2 = each zone independent) — ✓
Anti-patterns:
  - Multiple competing CTAs: NIE (single primary per stage, secondary w ⋮ menu) — ✓
  - Amber on non-interactive: sprawdź legend pill mobile (icons w pill są decoracyjne) — clarify
Verdict: [READY TO COMMIT / NEEDS FIXES]
```

- **IF** verdict NEEDS FIXES → fix → re-review
- **IF** verdict READY → continue STEP 7

---

## STEP 7 — Smoke test

Run `npm run dev`, test on tablet emulator (Chrome DevTools, iPad landscape 1024×768) AND mobile emulator (iPhone 14, 390×844):

### Test cases:
1. **Tablet, training mode:** klik squad → QuickLog open → Stage 1 = 3-col grid, awatary 64px, FAB schowany
2. **Tablet, Stage 1 → Stage 2:** wybierz 5 graczy → klik "Przypisz pozycje" → Stage 2 z 5 wierszami i ikonami zone, awatary 64px
3. **Tablet, Stage 2 → Stage 4:** klik "Rozpocznij punkt" → przejście (jeśli Stage 3 live tracking jest skonfigurowany — może iść bezpośrednio do Stage 4 w niektórych ścieżkach)
4. **Tablet, ⋮ menu:** klik ⋮ na Stage 2 → ActionSheet z 3 opcjami, "Zaawansowany scouting" amber
5. **Mobile, ten sam flow:** wszystko 1-col, awatary 48px, legenda widoczna na Stage 2
6. **FAB return:** zamknij QuickLog (anuluj punkt lub zapisz) → FAB wraca

### Smoke test report format:
```
Smoke test — QuickLog Visual Redesign:
✓ Tablet 3-col grid Stage 1
✓ Tablet awatary 64px
✓ Mobile 1-col, awatary 48px
✓ Stage 2 zone icons (red/purple/green)
✓ FAB hidden during QuickLog
✓ FAB returns after close
✓ ⋮ menu: 3 items, amber "Zaawansowany scouting"
[any FAILED items here]
Status: PASS / FAIL
```

- **IF** FAIL → fix → re-test
- **IF** PASS → continue STEP 8

---

## ⏸ JACEK CHECKPOINT 2

**STOP.** Wklej w chacie:
- §27 self-review verdict
- Smoke test report
- 2-3 screenshots (mobile + tablet, Stage 1 i 2 minimum)

Jacek zatwierdzi GO na merge.

---

## STEP 8 — Documentation update

Po Jacek GO:

### 8a. Patch DESIGN_DECISIONS.md (append § 58)

Append na końcu pliku, **przed** sekcją która nie istnieje (= absolutny koniec):

```markdown

## 58. QuickLog Stage-Based Scouting Flow (approved 2026-05-01)

### 58.1 Four-stage flow architecture
- **Stage 1 — Wybór graczy:** KIOSK-style player tiles z metrykami (win% + survival + punkty dziś)
- **Stage 2 — Pozycje:** zone icon toggles (Dorito/Center/Snake) re-used z QuickShotPanel
- **Stage 3 — Live tracking:** zachowany z produkcji (poza scope tego redesignu)
- **Stage 4 — Outcome:** dwie karty drużyn + skład w tym punkcie z color-coded zonami

### 58.2 Stage 1 player tile spec
**Layout:** `[avatar] [name + #number + metrics] [win% + WIN] [checkbox]`

**Avatar:**
- Mobile: 48px diameter
- Tablet (min-width 768px): 64px diameter
- Background: `playerColor` z theme (lub `#1e293b` fallback)
- Initial: 16/22px white (lub `#94a3b8` jeśli grey fallback)

**Name + number:**
- Number: 11/12px `#f59e0b` 700 (amber)
- Name: 14/17px `#e2e8f0` 600

**Metrics row (under name):**
- ♥ Survival rate: lucide `<Heart>` filled, size 12/13px, color = `winRateColor(rate)`, count next to it 11/12px 700 same color
- ⏱ Punkty dziś: lucide `<Clock>` outline, size 12/13px stroke `#64748b`, count next to it 11/12px 600 `#94a3b8`

**Win rate (right side):**
- 19/22px 800, color = `winRateColor(rate)` (green >70 / amber 40-70 / red <40 / grey if no data)
- "WIN" label below: 8px 600 `#475569`, letter-spacing 0.5px

**Checkbox (rightmost):**
- 26/28px circle
- Inactive: 2px border `#475569`, transparent bg
- Active: bg `#f59e0b`, content `✓` 14/16px 800 `#0a0e17`

**Selected tile state:**
- Border: 1.5px (mobile) / 2px (tablet) solid `#f59e0b`
- Background: `#f59e0b08` (8% alpha)

**Inactive tile state:**
- Border: 1px solid `#1a2234`
- Background: `#0f172a`

### 58.3 Stage 2 zone icon toggles
**Icons re-used from QuickShotPanel.jsx** (cross-ref § 19 Quick Shots Dual Mode). Same `<ZoneIcon>` component used in both views — DRY, single source of truth dla shape + color.

**Zone colors (active state border + bg tint @ 15% alpha):**
- Dorito: `#ef4444` (red, filled triangle ▲)
- Center: `#a855f7` (purple, plus ✚)
- Snake: `#10b981` (green, knot/loop)

**Inactive state (uniform):**
- Border: 1px solid `#1a2234`
- Background: `#0f172a`
- Icon color: `#64748b` (grey)

**Tile layout:**
- aspect-ratio: 1:1 (kwadratowe)
- Icon size: 22px (mobile) / 40px (tablet)
- Gap between tiles: 5px (mobile) / 12px (tablet)

**Mobile only:** legend pill at bottom (icons + labels) for first-time users. Tablet has bigger icons + supporting subtitle, legend not needed.

### 58.4 SelfLog FAB visibility rule
FAB (z `feat/player-selflog`, commit `ffb9b43`) **ukryty na całym QuickLog flow** (Stage 1, 2, 4).

**Render condition:** existing `playerId && field?.layout` warunek extended z `&& !isQuickLogActive`. FAB wraca po zamknięciu QuickLog (save / cancel / dismiss).

**Rationale:** FAB służy graczowi do logowania siebie (Tier 1 self-report). QuickLog służy scout'owi do logowania całego punktu zespołu. Gdy scout robi QuickLog, FAB rozprasza i sugeruje konkurencyjny flow — ukrycie eliminuje konflikt.

### 58.5 Anti-patterns
- ❌ **Tekst zamiast ikon na Stage 2** — ikona jednoznacznie definiuje zonę, tekst zajmuje miejsce
- ❌ **Avatar < 48px na mobile** — w QuickLog (KIOSK use case) gracz musi widzieć kafelek z odległości ręki
- ❌ **Wiele konkurujących CTA na Stage 2** — single primary "▶ Rozpocznij punkt", secondary actions w ⋮ menu
- ❌ **FAB SelfLog widoczny podczas QuickLog** — różne use cases, konflikt UX
- ❌ **Hardcoded color thresholds w komponentach** — zawsze przez `winRateColor()` helper

### 58.6 Cross-references
- § 19 Quick Shots Dual Mode (zone icon source of truth)
- § 27 Apple HIG Compliance (touch targets, color discipline, elevation)
- § 32 Training Mode (squad → match → scouting flow)
- § 35 Player Self-Report UI patterns (FAB definition)
- § 57 Multi-Source Observations Foundation (slot/meta architecture preserved)
```

Commit message: `docs: add § 58 QuickLog Stage-Based Scouting Flow`

### 8b. Patch NEXT_TASKS.md (append "On fire indicator" to backlog)

Find the `# 📦 BACKLOG` section. Append at the end (before any closing footer):

```markdown
- **On fire indicator** — visual signal na Stage 1 player tile gdy gracz ma >70% win rate w ostatnich 5 punktach sesji. Forma: amber pulsing dot na avatarze lub glow ring. Post-MVP, decyzja po niedzielnym sparingu czy potrzebne.
```

Commit message: `docs: add 'On fire indicator' to backlog`

### 8c. Patch CLAUDE.md (jeśli wspomina QuickLog flow)
**Verify:** `grep -n "QuickLog\|quick log\|stage" CLAUDE.md`
- **IF** są wzmianki które wymagają aktualizacji → patch
- **IF** brak wzmianek → skip

---

## STEP 9 — Push + merge + deploy

Stosując konwencję z memory rule:

```bash
# Na branchu feat/quicklog-visual-redesign
git add -A
git commit -m "feat: QuickLog visual redesign — KIOSK tiles, zone icons, hide SelfLog FAB"
git push origin feat/quicklog-visual-redesign

# Merge do main
git checkout main
git pull origin main
git merge --no-ff feat/quicklog-visual-redesign -m "Merge feat/quicklog-visual-redesign"
git push origin main

# Deploy
npm run deploy
```

**NIE używaj `gh` CLI ani PR workflow** (zgodnie z memory rule #14).

---

## STEP 10 — DEPLOY_LOG entry + archive brief

### 10a. DEPLOY_LOG.md entry (na górze, przed poprzednim entry)

```markdown
## 2026-05-0X — QuickLog Visual Redesign (CC_BRIEF_QUICKLOG_VISUAL_REDESIGN)
**Commit:** <merge-sha> · branch `feat/quicklog-visual-redesign`
**Status:** ✅ Deployed
**What changed:** QuickLogView.jsx visual refactor — KIOSK-style player tiles z metrykami (win% + survival + punkty dziś), tablet 3-col grid breakpoint, awatary 48px (mobile) / 64px (tablet), zone icon toggles re-used z QuickShotPanel zamiast tekstu, ⋮ menu w nagłówku Stage 2 z "Zaawansowany scouting / Pomiń pozycje / Anuluj punkt", `<ZoneIcon>` shared component (extracted z QuickShotPanel dla DRY). SelfLog FAB ukryty podczas QuickLog flow (rendered tylko gdy quickLog inactive). Win rate / survival rate color coding helper `winRateColor()` (green >70 / amber 40-70 / red <40). § 58 dodane do DESIGN_DECISIONS.md, "On fire indicator" do NEXT_TASKS backlog.
**Known issues:** [any from smoke test]
```

### 10b. Archive brief
```bash
git mv /mnt/user-data/outputs/CC_BRIEF_QUICKLOG_VISUAL_REDESIGN.md docs/archive/cc-briefs/
# Update INDEX
echo "- CC_BRIEF_QUICKLOG_VISUAL_REDESIGN.md (2026-05-0X) — KIOSK tiles + zone icons + hide FAB" >> docs/archive/cc-briefs/INDEX.md
git add -A
git commit -m "chore(docs): archive CC_BRIEF_QUICKLOG_VISUAL_REDESIGN + DEPLOY_LOG"
git push origin main
```

### 10c. Update NEXT_TASKS.md — mark QuickLog redesign DONE
```markdown
- [DONE] feat: QuickLog Visual Redesign — see archive/cc-briefs/CC_BRIEF_QUICKLOG_VISUAL_REDESIGN.md, deployed in {sha}
```

---

## Checklist na koniec

- [ ] STEP 0 verify done, raport w chacie
- [ ] STEP 1 discovery done, ZoneIcon decision podjęta
- [ ] **JACEK CHECKPOINT 1 passed**
- [ ] STEP 2 FAB hide implemented + tested
- [ ] STEP 3 Stage 1 redesigned (avatars, metrics, color coding, tablet grid)
- [ ] STEP 4 Stage 2 redesigned (zone icons, aspect-ratio, ⋮ menu)
- [ ] STEP 5 Stage 4 verified
- [ ] STEP 6 §27 self-review READY
- [ ] STEP 7 smoke test PASS
- [ ] **JACEK CHECKPOINT 2 passed**
- [ ] STEP 8 docs patches committed (§ 58 + NEXT_TASKS backlog)
- [ ] STEP 9 merged to main + deployed
- [ ] STEP 10 DEPLOY_LOG + archive

---

## Notes

- `<ZoneIcon>` jako shared component: jeśli ekstrakcja z QuickShotPanel jest skomplikowana (np. ikonki są mocno splecione z layoutem), **nie ekstrakuj** — duplikuj inline w QuickLogView i zaplanuj refaktor jako osobny brief po niedzielnym sparingu. Cel jest visual redesign, nie wielki refaktor.

- Lucide-react już jest w projekcie. **NIE instaluj** ponownie. `import { Heart, Clock } from 'lucide-react'` powinno działać.

- Win rate dla gracza może być **null/undefined** jeśli brak danych. `winRateColor()` musi obsłużyć null → grey `#64748b`. Wartość liczbowa wyświetlać jako `—` zamiast `N/A%` gdy null.

- Mockupy referencyjne: chat 2026-05-01 z Opus, widget'y `quicklog_redesign_FINAL_full_flow` (4 stages) + `stage_2_with_icons_bigger_avatars` (Stage 2 update). Jeśli widget'y zaginęły, screenshots Jacka mogą być w jego lokalnej historii — zapytaj.

- Branch convention: `feat/quicklog-visual-redesign` — match z deploy log entries pattern (e.g. `feat/player-selflog`, `feat/big-moves`).
