# CC Brief: Coach Language + UX Clarity Overhaul

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.

## Goal

Coaches are paintball experts but not tech users. Every piece of text in the app
must be immediately understood by someone who has never used analytics software.
Two principles drive every change:

1. **Lead with the conclusion, support with data** (not the reverse)
2. **Every number needs context** — "is this good or bad?"

No changes to logic, calculations, or data model. Text and section ordering only.

---

## File 1: `src/utils/generateInsights.js`

Replace ALL user-facing strings. Logic unchanged.

### Insight texts (the `text` + `detail` fields):

**Fifty reached (aggressive):**
```js
text: `Dobiegają do połowy — ${fiftyPct}% punktów`,
detail: topFifty ? `Najczęściej przez ${fiftyName}. Typowo drużyny robią to w ~35% punktów.` : 'Typowo drużyny robią to w ~35% punktów.',
```

**Heavy pocket (≤1.5 avg runners):**
```js
text: `Zostają blisko bazy — ${delayers} graczy strzela z tyłu`,
detail: 'Strzelają ciężkie lany na breaku. Priorytet: przeżyć start, nie biec przez paint.',
```

**Conservative (1.5–2.5 runners):**
```js
text: `Grają ostrożnie — ${runners} zawodnik${runners === 1 ? '' : 'ów'} biegnie na start`,
detail: 'Powolne tempo. Najpierw zajmij dobre pozycje, potem wywieraj presję — tape otworzy się po chwili.',
```

**Full push (≥3.5 runners):**
```js
text: `Agresywny start — ${Math.round(avgRunners)} biegną od razu`,
detail: 'Wystawiają wielu graczy na break. Zdyscyplinowane lany przyniosą darmowe eliminacje.',
```

**Dorito dominant:**
```js
text: `Grają głównie przez dorito — ${stats.dorito}% punktów`,
detail: 'To ich główna strona. Strona snake będzie słabo broniona — wyślij tam zawodnika.',
```

**Snake dominant:**
```js
text: `Grają głównie przez snake — ${stats.snake}% punktów`,
detail: 'To ich główna strona. Strona dorito będzie słabo broniona — wyślij tam zawodnika.',
```

**Center control:**
```js
text: `Kontrolują środek w ${stats.center}% punktów`,
detail: 'Dominują centrum — ogranicz crossfire i szanuj środkowego.',
```

**Side vulnerability:**
```js
text: `Tracą punkty gdy ktoś atakuje przez ${sideVuln.side === 'dorito' ? 'dorito' : 'snake'} — ${sideVuln.pct}% porażek`,
detail: `Wygrywamy ${sideVuln.winRateAgainst}% gdy atakujemy tę stronę. Warto tam naciskać.`,
```

**Uncovered zone:**
```js
text: `Nie strzelają w stronę ${zoneNames.toLowerCase()} podczas gry przeszkodowej`,
detail: `Zawodnik wchodzący przez ${zoneNames.toLowerCase()} napotka minimalny opór.`,
```

**Key player dependency (positive):**
```js
text: `Jeden zawodnik robi dużą różnicę (+${top.delta}% wygranych gdy gra)`,
detail: `Z nim: ${top.playerWinRate}% wygranych. Bez niego: ${top.teamWinRate}% (${top.ptsPlayed} pkt).`,
```

**Key player dependency (negative):**
```js
text: `Jeden zawodnik obniża wyniki zespołu (${top.delta}%)`,
detail: `Z nim: ${top.playerWinRate}% wygranych vs ${top.teamWinRate}% bez niego (${top.ptsPlayed} pkt).`,
```

**Late breakers:**
```js
text: `Drugorzędny ruch po starcie — ${lateRate}% punktów`,
detail: 'Wysyłają zawodnika chwilę po buzzerze. Trzymaj lany aktywne przez kilka sekund po starcie.',
```

**Predictable formation:**
```js
text: `Przewidywalny — taki sam start w ${topPct}% punktów`,
detail: `${topCount} z ${total} punktów: ${formatDesc.replace(/(\d+)D/,'$1 na dorito').replace(/(\d+)S/,' $1 na snake').replace(/(\d+)C/,' $1 w centrum').trim()}. Przygotuj konkretny counter.`,
```

**Unpredictable:**
```js
text: `Nieprzewidywalny — ${sorted.length} różnych ustawień startowych`,
detail: `Żadne ustawienie nie dominuje (maks. ${topPct}%). Graj solidne podstawy, nie jeden counter.`,
```

### Counter plan texts (the `action` + `detail` fields):

**Heavy pocket → survive break:**
```js
action: 'Przeżyj start — czytaj ich lany',
detail: 'Mają 4+ graczy strzelających z bazy. Nie biegnij przez paint — poczekaj aż opuszczą lane (reload, chwila ciszy), potem atakuj wolny tape.',
```

**Conservative → build first:**
```js
action: 'Zajmij pozycje, potem naciskaj',
detail: 'Grają powoli. Najpierw wyjdź żywy na dobre bunkie, potem buduj presję z kątów. Nie forsuj breaku.',
```

**Full push → lanes on break:**
```js
action: 'Lany na breaku — darmowe eliminacje',
detail: 'Wysyłają wielu biegaczy. Zdyscyplinowane lany od buzzu przynoszą łatwe eliminacje zanim dotrą do bunkerów.',
```

**Dorito dominant → attack snake:**
```js
action: 'Atakuj snake — jest odkryta',
detail: 'Skupiają się na dorito. Wyślij agresywnego gracza na snake — napotka minimalną obronę.',
```

**Snake dominant → attack dorito:**
```js
action: 'Atakuj dorito — jest odkryte',
detail: 'Skupiają się na snake. Wyślij agresywnego gracza na dorito — napotka minimalną obronę.',
```

**Side vulnerability → exploit:**
```js
action: `Naciskaj przez ${side === 'dorito' ? 'dorito' : 'snake'} — tam ich bolą porażki`,
detail: `Większość ich przegranych pochodzi stąd gdy ktoś naciska tą stroną. Powtarzaj ten atak.`,
```

**Center control → contest:**
```js
action: 'Rzuć wyzwanie ich środkowemu',
detail: 'Dominują centrum. Wyślij środkowego z dobrym pokryciem lane — będą musieli na niego zwracać uwagę.',
```

**Uncovered zone → runner:**
```js
action: `Wyślij biegacza przez ${zone.toLowerCase()} — nikt tam nie strzela`,
detail: `Ta strona jest konsekwentnie niepokryta podczas gry przeszkodowej. Biegacz przejdzie bez walki.`,
```

**Key player → eliminate early:**
```js
action: 'Wyeliminuj ich kluczowego gracza na breaku',
detail: 'Bez niego ich wyniki znacząco spadają. Skup fire na początku punktu.',
```

**Predictable → counter:**
```js
// Build detail based on formation:
// 0D case:
detail: 'Nie mają zawodnika na dorito. Twój D-front może wejść głęboko bezpiecznie. Ustaw lane na ich gracza snake.'
// 0S case:
detail: 'Nie mają zawodnika na snake. Twój snake może wejść bez walki. Ustaw lane na ich gracza dorito.'
// 0D 0S case:
detail: 'Nikt nie biegnie na tape. Twoi frontowi mogą wejść na obie strony bezpiecznie — jedyne zagrożenie to lany środkowe.'
// default:
detail: `Używają tego samego ustawienia w ${topPct}% punktów. Przygotuj konkretne ustawienie counter przed meczem.`
```

**Unpredictable → fundamentals:**
```js
action: 'Graj solidne podstawy',
detail: 'Zmieniają ustawienia — jeden counter nie zadziała. Skup się na dyscyplinie lanów i komunikacji.',
```

**Late breakers → watch:**
```js
action: 'Trzymaj lany po buzzerze',
detail: 'Wysyłają zawodnika kilka sekund po starcie, gdy inni już weszli w pozycje. Zostań w lane przez 3–4 sekundy po buzzu.',
```

---

## File 2: `src/pages/ScoutedTeamPage.jsx`

### 2a. Subtitle and header text

```js
// PageHeader subtitle:
subtitle="ANALIZA PRZECIWNIKA"
// (was: "TOURNAMENT SUMMARY")
```

### 2b. Confidence banner — rewrite all three states

**High confidence (green):**
```
"Dane wystarczające · {N} punktów · {X} meczów{scoutSuffix}"
```
Pills rename:
- `"Breaks"` → `"Pozycje"`
- `"Shots"` → `"Strzały"`
- `"Kills"` → `"Eliminacje"`
- `"Players"` → `"Gracze"`

**Medium confidence (amber):**
```
"{N} punktów — część danych brakuje, wnioski mogą być niedokładne. {weakText}{scoutSuffix}"
```
weakText items rename:
- `'breaks'` → `'pozycji startowych'`
- `'shots'` → `'strzałów'`
- `'kills'` → `'eliminacji'`
- `'player assignments'` → `'przypisań graczy'`

So weakText becomes: `"Brakuje: pozycji startowych, strzałów."`

**Low confidence (red):**
```
"Mało danych — tylko {N} punktów. {weakText} Dodaj więcej meczów żeby poprawić trafność."
```

### 2c. Section order — reorder JSX blocks

**New order (move JSX blocks, don't rewrite them):**
1. Confidence banner (stays at top)
2. **Counter plan** ← MOVE UP (was after Key insights)
3. **Key insights** ← MOVE DOWN (was before Counter plan)
4. Most likely break positions
5. Side tendency
6. Tactical signals
7. Performance
8. Heatmap
9. Players
10. Matches

Rationale: coach first sees "how to beat them" (Counter plan), then "why" (Key insights).

### 2d. Section header renames

```js
// Old → New
"Key insights"          → "Jak grają"
"Counter plan"          → "Jak ich pokonać"
"Most likely break positions" → "Gdzie startują"
"Side tendency"         → "Którą stroną grają"
"Tactical signals"      → "Na co uważać"
"Performance"           → "Ich wyniki"
"Players"               → "Skład"
"Matches"               → `Mecze (${teamMatches.length})`  // unchanged
```

### 2e. Tactical signals — Row labels

```js
"Most targeted" → "Nasz najczęściej trafiany"
"They hunt"     → "Gdzie eliminują najczęściej"
"They shoot at" → "W co strzelają"
"Reach the 50"  → "Dobiegają do połowy"
```

Reach the 50 badge: `"SET LANE"` → `"USTAW LANE"`

### 2f. Side tendency — classification labels and details

```js
// label → detail pairs:

'Pocket team' → 'Grają blisko bazy'
detail: 'Zostają przy bazie i strzelają lany. Priorytet na breaku: przeżyj, nie atakuj od razu.'

'Dorito dominant' → 'Grają głównie dorito'
detail: 'Ich główna strona to dorito. Snake będzie słabo broniony — skorzystaj z tego.'

'Snake dominant' → 'Grają głównie snake'
detail: 'Ich główna strona to snake. Dorito będzie słabo bronione — skorzystaj z tego.'

'Balanced' → 'Grają obie strony równomiernie'
detail: 'Nie ma oczywistej słabości na tape. Graj na swoich mocnych stronach.'

'D-side leaning' → 'Lekka przewaga dorito'
detail: 'Nieco bardziej skupieni na dorito. Snake może być nieco słabiej strzeżony.'

'S-side leaning' → 'Lekka przewaga snake'
detail: 'Nieco bardziej skupieni na snake. Dorito może być nieco słabiej strzeżony.'
```

Also rename the DORITO/SNAKE axis labels inside the side tendency card:
```js
// Column headers:
"DORITO" stays "DORITO"
"SNAKE" stays "SNAKE"
// Sub-label under win rate:
"won X% of these" → "wygrali X% takich pkt"
```

Shots targeting row inside side tendency:
```js
// "Shoots at" label:
"Shoots at" → "Strzelają w:"
// Zone labels:
'D-side' → 'Dorito'
'S-side' → 'Snake'
'Center' → 'Centrum'
// "(zone only)" suffix:
"(zone only)" → "(tylko strefy, brak dokładnych danych)"
```

### 2g. Performance section — add context to numbers

Win rate row: append context label
```jsx
// After win rate percentage, add a small context note:
const wrContext = wr >= 70 ? 'powyżej średniej' : wr >= 50 ? 'na poziomie średniej' : 'poniżej średniej';
// Display: "71%  powyżej średniej"
```

Break survival row rename:
```js
"Break survival" → "Przeżywalność breaku"
"Fifty reached"  → "Dobiegają do połowy"
"Bump rate"      → "Bumpy po starcie"
```

---

## File 3: `src/components/QuickLogView.jsx`

### Zone picker labels (from CC_BRIEF_COMBINED_ANALYTICS.md Part 2)

The zone picker uses single letters D/C/S. Replace with full words + color:

```jsx
// Zone buttons — replace the 3-item array:
[
  { key: 'D', label: 'Dorito', color: '#fb923c' },
  { key: 'C', label: 'Centrum', color: '#94a3b8' },
  { key: 'S', label: 'Snake',  color: '#22d3ee' },
]
```

Button width: expand from 44px fixed to `flex: 1` so full label fits.

Step header text:
```js
// "Where did each player start?" →
"Gdzie startował każdy zawodnik?"

// "Assign zones →" →
"Przypisz pozycje →"

// "Skip — just log the score" →
"Pomiń — zaloguj tylko wynik"

// "Who won? →" →
"Kto wygrał? →"

// "Pick players" header:
`Punkt #${ptNum} — Kto grał?`  // (already good, keep)

// "Back" →
"← Wróć"
```

Win buttons:
```js
// "R1 won" / "R2 won" sub-label:
"tap to log" → "dotknij aby zapisać"
```

History section:
```js
"History" → "Historia punktów"
```

---

## File 4: `src/components/LineupStatsSection.jsx`

Section header and group labels:

```js
// Main header:
"Lineup analytics" → "Najlepsze kombinacje graczy"

// Group labels:
"Dorito pairs"  → "Pary — dorito"
"Snake pairs"   → "Pary — snake"
"Dorito trios"  → "Trójki — dorito"
"Snake trios"   → "Trójki — snake"

// Under each combo — context:
// "{N} pts" → "{N} pkt"
// "low n" → "mała próba"

// Center player prefix:
"+ {centerName}" stays — this is clear
```

---

## File 5: `src/pages/TrainingPage.jsx`

### Context bar text:

```js
// "Edit squads" → keep in English per UI language decision (all UI = English)
// BUT the "tap = won" hint text (already removed per CC_BRIEF_PRACTICE brief):
// Confirm it's gone — no hint text on matchup cards
```

### LIVE button text:
```js
"Set LIVE"                    → "Ustaw jako LIVE"
"● LIVE — Tap to deactivate"  → "● LIVE · dotknij aby wyłączyć"
```

---

## File 6: `src/pages/ScoutRankingPage.jsx`

### Scope pills and labels:

```js
// Subtitle:
"DATA QUALITY × VOLUME" → "RANKING SCOUTÓW"

// Scout card subtitle:
"{N} points · {N}% quality" → "{N} pkt · jakość {N}%"

// Empty state:
"No scouts yet" → "Brak scoutów"
"Scout some points to start the leaderboard." → "Zacznij scoutować punkty aby pojawić się w rankingu."

// Scope pills (from CC_BRIEF_PRACTICE brief):
"Global"      → "Globalny"
"Layout"      → "Ten layout"
"Tournament"  → "Ten turniej"
```

---

## What NOT to change

- All variable names, function names, constants — only string literals shown to users
- All colors, sizes, layout — visual design unchanged
- Logic and calculations — unchanged
- English technical terms used internally (win_a, win_b, dorito, snake, etc.) — these
  are paintball terminology, keep them. Only translate UI labels that are non-obvious.
- MatchPage — leave entirely untouched
- URLs and routes — unchanged

---

## Note on language

The app UI language is English for all buttons and labels in the main flow.
EXCEPTION: coach-facing analytics text (insights, counters, section headers in
ScoutedTeamPage) can be in Polish because these are consumed by Polish-speaking coaches.
QuickLogView zone picker: Polish labels are fine (Dorito/Centrum/Snake are universal).

If you're unsure whether to translate something: leave it in English.
The goal is clarity, not full localization.

---

## Build & commit

`npx vite build` must pass with 0 errors.

Commit:
```
ux: coach language overhaul — plain language, conclusion-first layout

- generateInsights: rewrite all insight/counter text to plain Polish coach language
- ScoutedTeamPage: move Counter plan above Key insights, rename all sections,
  add win rate context (above/below average), rewrite confidence banner text
- QuickLogView: full zone labels (Dorito/Centrum/Snake), Polish zone picker text
- LineupStatsSection: Polish section headers
- TrainingPage: LIVE button Polish text
- ScoutRankingPage: Polish labels
No logic changes — text and section order only.
```
