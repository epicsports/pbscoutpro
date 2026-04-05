# CC BRIEF: Screen Redesigns (3 screens)
**Priority:** HIGH — approved prototypes ready for implementation
**Run `npm run precommit` before every commit. Push after each part.**

## PART 1: Tournament Page Redesign
File: `src/pages/TournamentPage.jsx`

### Division Filter
Add pill switch below header. Filter matches and teams by selected division.
Use `DIVISIONS[league]` from theme.js.

### Match Sections: Live / Scheduled / Completed
Split matches into 3 groups by status. Live at top with amber border.

### Match Card
Both team names bold, "vs" dimmed. Score neutral white. No green/red.
Live: amber border + pulsing LIVE badge. Completed: opacity 0.65.

### Empty State (no matches)
Show "Add match" (primary) + "Import schedule" (secondary). After first match added, hide Import.

### Remove Tactics section from tournament page.

## PART 2: Side Picker Redesign
File: `src/pages/MatchPage.jsx` (side picker section ~line 154)

Red/blue cards with colored dots. Subtitle "Home/Away". "Just observe" link at bottom.

## PART 3: Match Summary
Neutral score colors (white). Both team names equal weight.
