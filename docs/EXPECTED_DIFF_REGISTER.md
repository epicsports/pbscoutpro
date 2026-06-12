# Expected-diff register (H0 evidence mechanism)

> Jacek ruling 2026-06-12 (evening): mechanical batches must separate **proven-identical**
> commits from **accepted-visible-change** commits, and every accepted visible change gets a
> row HERE before it ships. Without this register, "proven identity" and "accepted change"
> become indistinguishable and the evidence mechanism loses its teeth. One row per shipped
> visible delta; newest first.

| Date | Commit(s) | Surface | Expected visible diff | Why accepted | Status |
|---|---|---|---|---|---|
| 2026-06-12 | (this commit) | LeagueFormModal, PlayerFormModal, TeamFormModal, WorkspacesAdminPage, BunkerEditorPage | PL users see Polish labels in admin form modals where hardcoded English rendered before (e.g. "New league" → "Nowa liga", "Save & next →" → "Zapisz i dalej →"); EN rendering unchanged | i18n coverage extension per H1; translation commit separated from extraction per batch-hygiene ruling | shipped pending smoke |
| 2026-06-12 | (this commit) (H1 batch 6) | NewTournamentModal (title, type tabs, field labels, placeholders), EntityPickerModal (empty state, title default), ui.jsx SwipeDelete/ConfirmModal/Loading | PL-language users see POLISH where hardcoded ENGLISH copy rendered before (e.g. "Name" → "Nazwa", "Team" → "Drużyna", "— select team —" → "— wybierz drużynę —", "Delete" → "Usuń", "Cancel" → "Anuluj", "Loading…" default, "Select" → "Wybierz", "No matches" → "Brak meczów"); EN rendering unchanged | i18n working as designed; wording not changed, translations are new coverage. Extraction (render-identical) shipped as `3944dcac`, this commit carries the PL translations only | shipped pending smoke |
| 2026-06-12 | (this commit) | TrainingResultsPage, TrainingSetupPage, TrainingSquadsPage | PL-language users now see POLISH where hardcoded ENGLISH copy rendered before (e.g. "Training not found" → "Nie znaleziono treningu", "Who's at practice?" → "Kto jest na treningu?", "Break bunkers" → "Bunkry startowe", "Dismiss" → "Odrzuć", etc.); EN rendering unchanged | i18n working as designed; wording unchanged, translations are new coverage (H1 batch 5 — training pages) | shipped pending smoke |
| 2026-06-12 | `85c6b0a4` (H2 batch 2) | MatchPage gradient, PlayerStatsPage | `#080c14` → `COLORS.bg` `#0a0e17` (2 call sites) — perceptually ~zero, pixels change | `#080c14` is the documented phantom colour (REVIEW_CHECKLIST §2: "the old #080c14 was a phantom, never a token"); occurrences are phantom leakage, not design | **shipped** (own commit, separate from the pixel-identical mints `48099cb0`) |
| 2026-06-12 | `bead743f` (H1 batch 1) — **retroactive entry** | TeamsPage, PlayersPage, LayoutsPage, ProfilePage, MainPage | PL-language users now see POLISH where hardcoded ENGLISH copy rendered before (e.g. "Select a tournament…" → "Wybierz turniej albo utwórz nowy"); EN rendering unchanged | i18n working as designed; wording not changed, translations are new coverage. Batch-hygiene corrected from batch 2 on: extraction (render-identical) and translation (visible) ship as SEPARATE commits | shipped, owed Jacek smoke |

## Rules (from the same ruling)

1. **Extraction commit** = render-identical by construction (same string via key). **Translation
   commit** = visible change, own commit + register row.
2. **Epsilon rule for colour stragglers:** literal within epsilon of an existing token →
   normalize to the token (+ register row, since pixels change); literal used systematically
   as a distinct value → mint a named token (pixel-identical, no row needed).
3. Alpha-amber family: minted as exact-value tokens (pixel-identical). Re-bucketing to a tidy
   A10/A20 scale would be a visible normalization → would need its own register row first.
