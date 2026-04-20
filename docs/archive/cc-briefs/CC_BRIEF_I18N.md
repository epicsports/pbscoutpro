# CC Brief: Bilingual Support (Polish / English)

Read DESIGN_DECISIONS.md + PROJECT_GUIDELINES.md first.
Implement in order: Step 1 → Step 2 → Step 3 → Step 4.
Run `npx vite build` after each step.

---

## Architecture decision

No external i18n library. Lightweight custom solution:
- `src/utils/i18n.js` — flat translation dictionary (PL + EN)
- `src/hooks/useLanguage.js` — React context, persists to localStorage
- `t(key)` for static strings, `t('key', { n: 5 })` for dynamic strings
- Default language: **Polish**

---

## Step 1 — Core i18n infrastructure

### Create `src/utils/i18n.js`

```js
/**
 * PbScoutPro translations.
 * Default language: 'pl'. Fallback: key string itself (never blank).
 *
 * Dynamic strings use a function: T.pl.points_n(5) → "5 pkt"
 * Static strings use a plain value: T.pl.save → "Zapisz"
 */

export const LANGUAGES = ['pl', 'en'];
export const DEFAULT_LANG = 'pl';

const T = {

  /* ─── Navigation & global ─────────────────────────────── */
  pl: {
    save:            'Zapisz',
    cancel:          'Anuluj',
    delete:          'Usuń',
    close:           'Zamknij',
    back:            'Wróć',
    add:             'Dodaj',
    create:          'Utwórz',
    edit:            'Edytuj',
    done:            'Gotowe',
    search:          'Szukaj…',
    loading:         'Ładowanie…',
    yes:             'Tak',
    no:              'Nie',
    confirm:         'Potwierdź',
    results:         'Wyniki',
    settings:        'Ustawienia',
    language:        'Język',

    /* ─── Main page / tabs ──────────────────────────────── */
    tab_scout:       'Scout',
    tab_coach:       'Coach',
    tab_layouts:     'Layouty',
    tab_team:        'Drużyna',

    /* ─── Tournament / event types ─────────────────────── */
    tournament:      'Turniej',
    sparing:         'Sparing',
    training:        'Trening',
    new_tournament:  'Nowy turniej',
    new_sparing:     'Nowy sparing',
    new_training:    'Nowy trening',
    set_live:        'Ustaw jako LIVE',
    end_live:        '● LIVE · dotknij aby wyłączyć',
    end_training:    'Zakończ trening',
    test_session:    'Sesja testowa / stage',
    close_tournament:'Zamknij turniej',
    close_training:  'Zakończ trening',

    /* ─── Session context bar ───────────────────────────── */
    live_go:         'Wejdź →',
    live_tournament: 'TURNIEJ LIVE',
    live_sparing:    'SPARING LIVE',
    live_training:   'TRENING LIVE',

    /* ─── Scout ranking ─────────────────────────────────── */
    scout_ranking:       'Ranking scoutów',
    scout_ranking_sub:   'JAKOŚĆ × ILOŚĆ DANYCH',
    scout_quality:       (pct) => `jakość ${pct}%`,
    scout_points:        (n) => `${n} pkt`,
    scout_empty:         'Brak scoutów',
    scout_empty_sub:     'Zacznij scoutować punkty żeby pojawić się w rankingu.',
    scope_global:        'Globalny',
    scope_layout:        'Ten layout',
    scope_tournament:    'Ten turniej',

    /* ─── Player stats ──────────────────────────────────── */
    player_stats:        'Statystyki zawodnika',
    scope_match:         'Ten mecz',
    scope_training:      'Trening',
    pts_played:          (n) => `${n} pkt`,
    win_rate:            (pct) => `${pct}%`,
    win_rate_context_high:  'powyżej średniej',
    win_rate_context_mid:   'na poziomie średniej',
    win_rate_context_low:   'poniżej średniej',

    /* ─── Lineup analytics ──────────────────────────────── */
    lineup_title:        'Najlepsze kombinacje graczy',
    lineup_dorito_pairs: 'Pary — dorito',
    lineup_snake_pairs:  'Pary — snake',
    lineup_dorito_trios: 'Trójki — dorito',
    lineup_snake_trios:  'Trójki — snake',
    lineup_pts:          (n) => `${n} pkt`,
    lineup_low_sample:   'mała próba',

    /* ─── Scouted team page ─────────────────────────────── */
    opponent_analysis:   'ANALIZA PRZECIWNIKA',
    section_counter:     'Jak ich pokonać',
    section_insights:    'Jak grają',
    section_breaks:      'Gdzie startują',
    section_side:        'Którą stroną grają',
    section_signals:     'Na co uważać',
    section_performance: 'Ich wyniki',
    section_heatmap:     'Heatmapa',
    section_players:     'Skład',
    section_matches:     (n) => `Mecze (${n})`,

    /* Confidence banner */
    conf_high:       (n, matches, scout) => `Dane wystarczające · ${n} pkt · ${matches} meczów${scout ? ` · Scout: ${scout}` : ''}`,
    conf_medium:     (n, weak) => `${n} pkt — część danych brakuje. Brakuje: ${weak}. Wnioski mogą być niedokładne.`,
    conf_low:        (n, weak) => `Mało danych — tylko ${n} pkt. Brakuje: ${weak}. Dodaj więcej meczów.`,
    conf_metric_positions: 'pozycji startowych',
    conf_metric_shots:     'strzałów',
    conf_metric_kills:     'eliminacji',
    conf_metric_players:   'przypisań graczy',
    conf_pill_positions:   'Pozycje',
    conf_pill_shots:       'Strzały',
    conf_pill_kills:       'Eliminacje',
    conf_pill_players:     'Gracze',

    /* Side tendency */
    side_dorito:       'DORITO',
    side_snake:        'SNAKE',
    side_won_pct:      (pct) => `wygrali ${pct}% takich pkt`,
    side_vs:           'VS',
    side_shoots_at:    'Strzelają w:',
    side_zone_only:    '(tylko strefy, brak dokładnych danych)',
    side_dorito_label: 'Dorito',
    side_snake_label:  'Snake',
    side_center_label: 'Centrum',

    /* Tactical signals */
    signal_targeted:   'Nasz najczęściej trafiany',
    signal_hunt:       'Gdzie eliminują najczęściej',
    signal_shoots_at:  'W co strzelają',
    signal_reach_50:   'Dobiegają do połowy',
    signal_set_lane:   'USTAW LANE',
    signal_high:       '⚡ WYSOKI',
    signal_elim_pct:   (pct, e, p) => `${pct}% eliminowany (${e}/${p} pkt)`,

    /* Performance */
    perf_win_rate:      'Win rate',
    perf_break_survival:'Przeżywalność breaku',
    perf_fifty:         'Dobiegają do połowy',

    /* ─── Quick log ─────────────────────────────────────── */
    quicklog_title:     'Szybki zapis',
    quicklog_point:     (n) => `Punkt #${n} — Kto grał?`,
    quicklog_picked:    (n) => `${n} wybranych`,
    quicklog_zones:     'Gdzie startował każdy zawodnik?',
    quicklog_assign:    'Przypisz pozycje →',
    quicklog_skip:      'Pomiń — zaloguj tylko wynik',
    quicklog_who_won:   'Kto wygrał?',
    quicklog_won:       (name) => `${name} wygrał`,
    quicklog_tap:       'dotknij aby zapisać',
    quicklog_back:      '← Wróć',
    quicklog_history:   'Historia punktów',
    quicklog_advanced:  'Zaawansowany scouting ›',
    zone_dorito:        'Dorito',
    zone_center:        'Centrum',
    zone_snake:         'Snake',

    /* ─── Training page ─────────────────────────────────── */
    training_playing:   (n) => `Grają (${n})`,
    training_completed: (n) => `Ukończone (${n})`,
    training_new_matchup: '+ Nowy matchup',
    training_attendees: 'Attendees',
    training_edit_squads: 'Edit squads',
    training_end:       'Zakończ trening',
    training_end_confirm: 'Zakończyć trening?',
    training_end_msg:   'Trening zostanie oznaczony jako zakończony. Dane i wyniki pozostaną dostępne.',

    /* ─── Confirm modals ────────────────────────────────── */
    delete_match:       'Usunąć mecz?',
    delete_matchup:     'Usunąć matchup?',
    delete_matchup_msg: 'Wszystkie zescoutowane punkty zostaną trwale usunięte.',
    delete_player:      'Usunąć zawodnika?',
    delete_team:        'Usunąć drużynę?',
    delete_layout:      'Usunąć layout?',
    delete_tactic:      'Usunąć taktykę?',

    /* ─── Empty states ──────────────────────────────────── */
    empty_no_data:      'Brak danych',
    empty_add_matches:  'Dodaj mecze aby zobaczyć statystyki',
    empty_no_players:   'Brak zawodników w tym składzie',
    empty_no_squads:    'Utwórz co najmniej 2 grupy żeby zacząć matchupy',
  },

  /* ─────────────────────────────────────────────────────── */

  en: {
    save:            'Save',
    cancel:          'Cancel',
    delete:          'Delete',
    close:           'Close',
    back:            'Back',
    add:             'Add',
    create:          'Create',
    edit:            'Edit',
    done:            'Done',
    search:          'Search…',
    loading:         'Loading…',
    yes:             'Yes',
    no:              'No',
    confirm:         'Confirm',
    results:         'Results',
    settings:        'Settings',
    language:        'Language',

    tab_scout:       'Scout',
    tab_coach:       'Coach',
    tab_layouts:     'Layouts',
    tab_team:        'Team',

    tournament:      'Tournament',
    sparing:         'Sparing',
    training:        'Training',
    new_tournament:  'New tournament',
    new_sparing:     'New sparing',
    new_training:    'New training',
    set_live:        'Set LIVE',
    end_live:        '● LIVE · tap to deactivate',
    end_training:    'End training',
    test_session:    'Test / stage session',
    close_tournament:'Close tournament',
    close_training:  'End training',

    live_go:         'Go →',
    live_tournament: 'TOURNAMENT LIVE',
    live_sparing:    'SPARING LIVE',
    live_training:   'TRAINING LIVE',

    scout_ranking:       'Scout ranking',
    scout_ranking_sub:   'DATA QUALITY × VOLUME',
    scout_quality:       (pct) => `${pct}% quality`,
    scout_points:        (n) => `${n} pts`,
    scout_empty:         'No scouts yet',
    scout_empty_sub:     'Scout some points to start the leaderboard.',
    scope_global:        'Global',
    scope_layout:        'This layout',
    scope_tournament:    'This tournament',

    player_stats:        'Player stats',
    scope_match:         'This match',
    scope_training:      'Training',
    pts_played:          (n) => `${n} pts`,
    win_rate:            (pct) => `${pct}%`,
    win_rate_context_high:  'above average',
    win_rate_context_mid:   'around average',
    win_rate_context_low:   'below average',

    lineup_title:        'Best player combinations',
    lineup_dorito_pairs: 'Dorito pairs',
    lineup_snake_pairs:  'Snake pairs',
    lineup_dorito_trios: 'Dorito trios',
    lineup_snake_trios:  'Snake trios',
    lineup_pts:          (n) => `${n} pts`,
    lineup_low_sample:   'low n',

    opponent_analysis:   'OPPONENT ANALYSIS',
    section_counter:     'How to beat them',
    section_insights:    'How they play',
    section_breaks:      'Where they start',
    section_side:        'Which side they play',
    section_signals:     'Watch out for',
    section_performance: 'Their results',
    section_heatmap:     'Heatmap',
    section_players:     'Roster',
    section_matches:     (n) => `Matches (${n})`,

    conf_high:       (n, matches, scout) => `Good data · ${n} pts · ${matches} matches${scout ? ` · Scout: ${scout}` : ''}`,
    conf_medium:     (n, weak) => `${n} pts — some data missing. Missing: ${weak}. Results may be inaccurate.`,
    conf_low:        (n, weak) => `Low data — only ${n} pts. Missing: ${weak}. Add more matches.`,
    conf_metric_positions: 'break positions',
    conf_metric_shots:     'shots',
    conf_metric_kills:     'kill attribution',
    conf_metric_players:   'player assignments',
    conf_pill_positions:   'Breaks',
    conf_pill_shots:       'Shots',
    conf_pill_kills:       'Kills',
    conf_pill_players:     'Players',

    side_dorito:       'DORITO',
    side_snake:        'SNAKE',
    side_won_pct:      (pct) => `won ${pct}% of these`,
    side_vs:           'VS',
    side_shoots_at:    'Shoots at:',
    side_zone_only:    '(zone only)',
    side_dorito_label: 'D-side',
    side_snake_label:  'S-side',
    side_center_label: 'Center',

    signal_targeted:   'Most targeted',
    signal_hunt:       'They hunt',
    signal_shoots_at:  'They shoot at',
    signal_reach_50:   'Reach the 50',
    signal_set_lane:   'SET LANE',
    signal_high:       '⚡ HIGH',
    signal_elim_pct:   (pct, e, p) => `${pct}% eliminated (${e}/${p} pts)`,

    perf_win_rate:      'Win rate',
    perf_break_survival:'Break survival',
    perf_fifty:         'Fifty reached',

    quicklog_title:     'Quick log',
    quicklog_point:     (n) => `Point #${n} — Who's playing?`,
    quicklog_picked:    (n) => `${n} picked`,
    quicklog_zones:     'Where did each player start?',
    quicklog_assign:    'Assign zones →',
    quicklog_skip:      'Skip — just log the score',
    quicklog_who_won:   'Who won?',
    quicklog_won:       (name) => `${name} won`,
    quicklog_tap:       'tap to log',
    quicklog_back:      '← Back',
    quicklog_history:   'Point history',
    quicklog_advanced:  'Advanced scouting ›',
    zone_dorito:        'Dorito',
    zone_center:        'Center',
    zone_snake:         'Snake',

    training_playing:   (n) => `Playing (${n})`,
    training_completed: (n) => `Completed (${n})`,
    training_new_matchup: '+ New matchup',
    training_attendees: 'Attendees',
    training_edit_squads: 'Edit squads',
    training_end:       'End training',
    training_end_confirm: 'End training?',
    training_end_msg:   'Mark training as finished. Data and results will stay available.',

    delete_match:       'Delete match?',
    delete_matchup:     'Delete matchup?',
    delete_matchup_msg: 'All scouted points in this matchup will be permanently lost.',
    delete_player:      'Delete player?',
    delete_team:        'Delete team?',
    delete_layout:      'Delete layout?',
    delete_tactic:      'Delete tactic?',

    empty_no_data:      'No data yet',
    empty_add_matches:  'Add matches to see stats',
    empty_no_players:   'No players in this squad',
    empty_no_squads:    'Form at least 2 squads to start matchups',
  },
};

export default T;
```

---

### Create `src/hooks/useLanguage.js`

```js
import { createContext, useContext, useState, useCallback } from 'react';
import T, { DEFAULT_LANG } from '../utils/i18n';

const STORAGE_KEY = 'pbscoutpro_lang';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'pl'; // default PL
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  // t(key) — static string
  // t(key, arg1, arg2, ...) — dynamic: calls T[lang][key](arg1, arg2, ...)
  const t = useCallback((key, ...args) => {
    const val = T[lang]?.[key] ?? T['pl']?.[key] ?? key;
    if (typeof val === 'function') return val(...args);
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
```

### Wrap app in `LanguageProvider` — `src/App.jsx`

Add `LanguageProvider` as the outermost wrapper inside `WorkspaceProvider`:

```jsx
import { LanguageProvider } from './hooks/useLanguage';

// In the JSX tree, wrap everything:
<WorkspaceProvider>
  <LanguageProvider>
    <SaveStatusProvider>
      {/* ... existing content ... */}
    </SaveStatusProvider>
  </LanguageProvider>
</WorkspaceProvider>
```

---

### Language toggle component — `src/components/LangToggle.jsx`

```jsx
import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { FONT } from '../utils/theme';

export default function LangToggle() {
  const { lang, setLang } = useLanguage();
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {['pl', 'en'].map(l => (
        <div key={l} onClick={() => setLang(l)} style={{
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          color: lang === l ? '#f59e0b' : '#475569',
          padding: '4px 7px', borderRadius: 6, cursor: 'pointer',
          background: lang === l ? '#f59e0b15' : 'transparent',
          border: `1px solid ${lang === l ? '#f59e0b40' : 'transparent'}`,
          minHeight: 28, display: 'flex', alignItems: 'center',
          WebkitTapHighlightColor: 'transparent',
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {l === 'pl' ? '🇵🇱 PL' : '🇬🇧 EN'}
        </div>
      ))}
    </div>
  );
}
```

### Place toggle in `PageHeader.jsx`

Add `LangToggle` as a fixed element in the PageHeader right area:

```jsx
import LangToggle from './LangToggle';

// In PageHeader JSX, right side next to existing `action` slot:
<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
  <LangToggle />
  {action}
</div>
```

This puts the toggle in every screen's top-right corner — always accessible, never hidden in a settings menu.

---

## Step 2 — Wire `t()` into components

In each component, add at the top of the function body:

```js
const { t } = useLanguage();
```

Then replace hardcoded strings. Pattern:

```jsx
// Before:
<span>Scout ranking</span>
// After:
<span>{t('scout_ranking')}</span>

// Before:
<span>{n} pts</span>
// After:
<span>{t('lineup_pts', n)}</span>

// Before:
subtitle="TOURNAMENT SUMMARY"
// After:
subtitle={t('opponent_analysis')}
```

### Files to update:

**`src/pages/ScoutedTeamPage.jsx`** — replace all strings with `t()` calls:
- PageHeader subtitle
- All SectionHeader children: section_counter, section_insights, section_breaks, section_side, section_signals, section_performance, section_heatmap, section_players, section_matches
- Confidence banner: conf_high, conf_medium, conf_low, conf_pill_*, conf_metric_*
- Side tendency: side_*, side_won_pct, side_shoots_at, side_zone_only, classification labels+details
- Tactical signals: signal_*, Row label props
- Performance section labels: perf_*

**`src/components/QuickLogView.jsx`**:
- quicklog_point(ptNum), quicklog_picked(n), quicklog_zones, quicklog_assign
- quicklog_skip, quicklog_who_won, quicklog_won(teamName), quicklog_tap
- quicklog_back, quicklog_history, quicklog_advanced
- zone_dorito, zone_center, zone_snake (zone picker buttons)

**`src/components/LineupStatsSection.jsx`**:
- lineup_title, lineup_dorito_pairs, lineup_snake_pairs, lineup_dorito_trios, lineup_snake_trios
- lineup_pts(n), lineup_low_sample

**`src/pages/TrainingPage.jsx`**:
- training_playing(n), training_completed(n), training_new_matchup
- training_edit_squads, training_attendees
- training_end, training_end_confirm, training_end_msg
- set_live, end_live (LIVE buttons)
- delete_matchup, delete_matchup_msg

**`src/pages/ScoutRankingPage.jsx`**:
- scout_ranking, scout_ranking_sub
- scout_quality(pct), scout_points(n)
- scout_empty, scout_empty_sub
- scope_global, scope_layout, scope_tournament

**`src/pages/PlayerStatsPage.jsx`**:
- player_stats, scope pills: scope_global, scope_layout, scope_tournament, scope_match, scope_training
- pts_played(n), win_rate(pct), win_rate_context_*

**`src/App.jsx`** (SessionContextBar):
- live_go, live_tournament, live_sparing, live_training

---

## Step 3 — Translate `generateInsights.js`

generateInsights does NOT use React hooks — it's a pure utility.
Pass `lang` as a parameter instead:

```js
// Change function signatures:
export function generateInsights(stats, points, field, roster, lang = 'pl') { ... }
export function generateCounters(insights, stats, points, field, lang = 'pl') { ... }
```

Inside the functions, import T and use directly:

```js
import T from './i18n';
const tr = (key, ...args) => {
  const val = T[lang]?.[key] ?? T['pl']?.[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
};
```

Then replace every hardcoded string with `tr('key')` or `tr('key', arg)`.

### In `ScoutedTeamPage.jsx`, pass lang to generateInsights:

```js
const { t, lang } = useLanguage();

const insights = useMemo(() => generateInsights(stats, heatmapPoints, field, roster, lang),
  [stats, heatmapPoints, field, roster, lang]);
const counters = useMemo(() => generateCounters(insights, stats, heatmapPoints, field, lang),
  [insights, stats, heatmapPoints, field, lang]);
```

### Insight text keys to add to i18n.js

All insight `text` + `detail` strings from CC_BRIEF_COACH_LANGUAGE.md go into i18n.js
as keys. Example:

```js
// i18n.js additions:
pl: {
  // ... existing keys ...
  insight_fifty_text:      (pct, name) => `Dobiegają do połowy — ${pct}% punktów`,
  insight_fifty_detail:    (name) => name
    ? `Najczęściej przez ${name}. Typowo drużyny robią to w ~35% punktów.`
    : 'Typowo drużyny robią to w ~35% punktów.',
  insight_pocket_text:     (n) => `Zostają blisko bazy — ${n} graczy strzela z tyłu`,
  insight_pocket_detail:   'Strzelają ciężkie lany na breaku. Priorytet: przeżyć start, nie biec przez paint.',
  // ... all other insights from CC_BRIEF_COACH_LANGUAGE.md ...
},
en: {
  insight_fifty_text:      (pct, name) => `Aggressive ${name || 'fifty'} — reached in ${pct}% of points`,
  insight_fifty_detail:    (name) => name
    ? `Most often via ${name}. League average is ~35%.`
    : 'League average is around 35%.',
  insight_pocket_text:     (n) => `Heavy pocket — ${n} players delay, shooting lanes`,
  insight_pocket_detail:   'They shoot heavy break lanes. Priority: survive the start, don\'t run through paint.',
  // ...
},
```

Add ALL insight and counter keys following this pattern.
Reference CC_BRIEF_COACH_LANGUAGE.md for the Polish text and the original generateInsights.js for the English text.

---

## Step 4 — Language persistence + toggle visibility

### Ensure toggle is visible on every screen

`LangToggle` is in `PageHeader` — this covers all pages.
On screens without PageHeader (none currently), add it manually.

### Re-render on language change

Because `LanguageProvider` holds `lang` in state, all components using `useLanguage()`
automatically re-render when language changes. No additional work needed.

### generateInsights re-runs on language change

Because `lang` is passed as a parameter and included in the `useMemo` deps array
in ScoutedTeamPage, insights re-compute when language changes. ✓

---

## What NOT to translate

- **Paintball terminology**: Dorito, Snake, NXL, PXL, DPL, HERO — these are proper nouns, keep in both languages
- **Player names, team names** — user-entered data, never translated
- **URLs and routes** — unchanged
- **Firebase field names** — unchanged
- **Internal constants** — COLORS, FONT, etc.
- **The word "layout"** — technical term used in both languages by Polish paintball community
- **Admin-only screens** — BunkerEditorPage, BallisticsPage — low priority, skip for now

---

## Build & commit

After all 4 steps pass build:

```
npx vite build
```

Commit:
```
feat: bilingual support (Polish / English)

- src/utils/i18n.js: full translation dictionary PL + EN
  Static keys + dynamic function keys for string interpolation
- src/hooks/useLanguage.js: LanguageContext, localStorage persistence,
  t(key, ...args) helper, default language: Polish
- src/components/LangToggle.jsx: PL/EN pill in every PageHeader
- LanguageProvider wraps app in App.jsx
- ScoutedTeamPage, QuickLogView, LineupStatsSection, TrainingPage,
  ScoutRankingPage, PlayerStatsPage: all strings via t()
- generateInsights.js: lang param passed through, all strings in i18n.js
  Insights and counters re-render instantly on language switch
```
