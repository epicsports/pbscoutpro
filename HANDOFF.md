# HANDOFF

## 2026-06-19 — Arcade Shared-Code Discovery (branch `discovery/arcade-shared`, READ-ONLY)
- Report: `docs/ARCADE_SHARED_DISCOVERY.md`. 5 games confirmed (Warrior/Invaders/Lander/Snake/Mini), all
  vanilla canvas+WebAudio, **no engine, no heavy deps, no binary assets**; all lazy `/break/*` → **zero in app entry**.
- **Shareable & duplicated:** procedural audio (×5, biggest win), cosmic sky (×2, +Asteroids), seven-seg, dither,
  game-loop/DPR shell. Already shared: `ArcadeButton`. Proposed modules live in `src/components/arcade/`.
- **Hi-score = ALREADY single-source** (`_submitArcadeScore`→`leaderboards/{board}` + `getArcadeBests`). New games
  add 1 board wrapper + an initials overlay; **no rules change**.
- **Asteroids prototype** received + saved to `docs/prototypes/asteroids.html`; its hi-score is **in-memory only**
  (no persistence/initials) → must be wired to the shared board on port. Q*bert prototype still pending.
- **Lightness rule for the impl brief:** no eagerly-loaded module may import `src/components/arcade/*` (else arcade
  leaks into the app entry).
- Built (not estimated): per-game chunks 18–29 kB, app entry 415 kB unaffected. `dist/` not committed.
- **Blockers (§7):** `HANDOFF.md` didn't exist (repo uses `docs/ops/HANDOVER.md`) — created at root per brief;
  Q*bert mapping is genre-inferred pending its prototype.
- Branch pushed, **NOT merged**. Implementation is a separate, gated brief.
