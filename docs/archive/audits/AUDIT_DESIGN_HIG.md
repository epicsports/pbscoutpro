# PbScoutPro — Audyt Design + Apple HIG
**Data:** 2026-04-16
**Zakres:** Cały codebase, 20+ stron, 30+ komponentów

---

## 🔴 KRYTYCZNE (użytkownik to widzi i go frustruje)

### 1. Touch targets poniżej 44px (Apple HIG minimum)
**16 miejsc** z `minHeight: 32-36px` — za małe na palec.
- AppShell "Change" button (32px)
- PlayerStatsPage scope pills (36px)
- ScoutedTeamPage scope pills (36px)
- Division pills w ScoutTabContent, CoachTabContent (36px)
- LoginGate buttons (32px)
- NewTournamentModal type selector (36px)
**Fix:** Globalny sweep — `minHeight: 44` na wszystkich interaktywnych elementach.

### 2. Fonty poniżej 10px (Apple HIG: minimum 11pt)
**~15 miejsc** z `fontSize: 7-9` w MatchPage (OT badge, point numbers, scout labels).
**Fix:** Wszystkie poniżej 10px → podnieść do FONT_SIZE.xxs (10px).

### 3. Content pod BottomNav (brak paddingBottom)
**7 stron** bez paddingBottom: BallisticsPage, BunkerEditorPage, LayoutAnalyticsPage,
TeamDetailPage, TrainingSquadsPage, LayoutsPage, PlayersPage.
**Fix:** Dodać `paddingBottom: 80` do scrollable content na każdej stronie z BottomNav.

### 4. Niespójne nagłówki sekcji (3 różne komponenty!)
- `SectionTitle` (ui.jsx) — duży, bold
- `SectionLabel` (ui.jsx) — mały, uppercase, muted
- `SectionHeader` (ScoutedTeamPage, ScoutIssuesPage) — custom per page
**Fix:** Ujednolicić do 2 wariantów w ui.jsx. Usunąć lokalne SectionHeader.

---

## 🟡 WAŻNE (psuje spójność premium wrażenia)

### 5. 300+ hardcoded kolorów zamiast COLORS.* z theme.js
Najczęstsze: `#475569` (51x), `#f59e0b` (46x), `#ef4444` (35x), `#1a2234` (33x).
Wszystkie MAJĄ odpowiedniki w theme.js ale są wpisane ręcznie.
**Fix:** Masowy find/replace — CC brief z mapą kolorów.

### 6. 13 miejsc z duplikatem `fontFamily: FONT, fontFamily: FONT`
Kopiuj-wklej artifact. Nie psuje nic ale brudzi kod.
**Fix:** Usunąć duplikaty.

### 7. 9 hardcoded angielskich stringów w pages (poza i18n)
Mimo wdrożenia i18n, kilka stron ma jeszcze hardcoded "Edit", "Delete", "Save".
**Fix:** Zamienić na t() calls.

### 8. Raw HTML w LoginPage, LoginGate, LayoutDetailPage
`<button>`, `<input>`, `<select>` zamiast komponentów z ui.jsx (Btn, Input, Select).
**Fix:** Zamienić na shared components.

### 9. Brak loading/empty states na 5 stronach
BallisticsPage, BunkerEditorPage, LayoutWizardPage — bez Loading/SkeletonList.
**Fix:** Dodać Loading component przy ładowaniu danych.

---

## 🔵 POLERKA (different between good and great)

### 10. Niespójne elevation/surface hierarchy
Apple HIG dark mode: głębszy = ciemniejszy. Ale karty używają mix:
- Niektóre: `#0f172a` (surfaceDark) 
- Inne: `#111827` (surface)
- Jeszcze inne: `#0b1120` (custom, nigdzie w theme)
**Fix:** Standaryzować: Card = COLORS.surfaceDark, Recessed = #0d1117, Elevated = COLORS.surface.

### 11. Spacing inconsistencies
Niektóre strony: `padding: 16px`, inne `padding: SPACE.lg` (= 16px, ale raz token, raz literal).
**Fix:** Wszędzie tokeny z theme.js.

### 12. MatchPage point cards — gęste, małe fonty
Review view w MatchPage ma karty punktów z fontem 7-9px, dużo informacji w małej przestrzeni.
**Fix:** Zwiększyć fonty, uprościć karty, progressive disclosure (tap → details).

### 13. Brak haptic feedback na key actions
Apple HIG zaleca haptic na destrukcyjnych akcjach (delete) i sukces (save point).
**Fix:** `navigator.vibrate?.([10])` na save, `navigator.vibrate?.([30])` na delete.

### 14. ScoutedTeamPage — najdłuższa strona (1299 linii), custom SectionHeader
Osobny komponent SectionHeader zamiast ui.jsx. Insight/counter cards mają własny styl.
**Fix:** Wyekstrahować do shared components, ujednolicić z resztą.

### 15. Brak animacji przejść między ekranami
Apple HIG: push/pop transitions. Obecnie hard cut między stronami.
**Fix:** CSS slide-in/slide-out na route transitions (niski priorytet).

---

## 📋 PLAN WDROŻENIA (sugerowana kolejność)

### Sprint 1: Touch & Readability (CC brief, ~2h)
- [x] #1 Touch targets ✅ 21 fixes → 44px minimum
- [x] #2 Fonty ✅ 49 fixes → minimum 10px
- [x] #3 paddingBottom ✅ 2 pages na wszystkich stronach
- [x] #6 Duplikaty fontFamily ✅ 3 files

### Sprint 2: Component Consistency (CC brief, ~3h)  
- [ ] #4 Ujednolicenie section headers
- [ ] #8 Raw HTML → ui.jsx components
- [x] #5 Hardcoded kolory ✅ 379 replacements → COLORS.* (masowy sweep)
- [ ] #10 Elevation hierarchy standaryzacja

### Sprint 3: Data & Polish (CC brief, ~2h)
- [x] #7 Remaining i18n ✅ 6 pages wired strings
- [ ] #9 Loading/empty states
- [ ] #12 MatchPage point card redesign
- [ ] #11 Spacing tokens

### Sprint 4: Premium (manual, ~1h)
- [ ] #13 Haptic feedback
- [ ] #14 ScoutedTeamPage extraction
- [ ] #15 Route transitions (opcjonalne)

---

## METRYKI SUKCESU
- Zero touch targets < 44px
- Zero fontów < 10px
- Zero hardcoded kolorów (wszystko z COLORS.*)
- Każda strona: Loading + EmptyState
- Jeden set section header komponentów
- 100% i18n coverage
