# Marketing Material — raw promo source

> **Purpose:** accumulate promo raw material over time so a future product page + promo
> assets are less work. Seeded 2026-05-29; **append as feature discovery surfaces things.**
> Doc-only, low priority.

---

## Headline features (with a one-line marketing angle)

- **Real-time multi-coach concurrent scouting** — "two coaches, one match, zero collisions."
- **Custom ballistics engine** — shape-aware ray casting, 3-channel visibility (safe/arc/exposed),
  in a Web Worker. "See the lane before you commit to it."
- **Claude Vision bunker recognition** — photo of the field → digitized layout.
- **Coach intelligence** — insights engine, tactical counter-plan suggestions, coaching-priority
  framework. "Turn scouted points into a game plan."
- **Player analytics** — HERO rank, per-player stats, duo/trio chemistry.
- **Built for the field** — mobile-first PWA, Apple-HIG-grade UI, works on a phone at the venue.

## Audiences

NXL / PXL / DPL scouts, coaches, players; club orgs running their own scouting.

## Value props / differentiators

(fill as we go — e.g. purpose-built for xball vs generic note apps; live concurrent capture;
analytics that feed counter-plans.)

## Promo-prompt themes (for generating visuals/copy later)

- Hero: live concurrent scouting on a phone at a tournament, two coaches in sync.
- Ballistics visualization: a lane lit up safe/arc/exposed over a field.
- Before/after: a photographed field → clean digital layout (Vision).
- Coach dashboard: scouted data → counter-plan.

## Feed-me note

As discovery/features surface, append here. Next candidate: the concurrent-scouting + matcher
write-up (`docs/architecture/SCOUTING_CONCURRENCY_AND_CACHE.md`) — distill its headline into an
angle.

---

## ⚠️ Accuracy guardrails (for whoever writes the final copy)

Keep the marketing angles, but the underlying tech has nuances — don't ship a claim that
contradicts the as-built system (`SCOUTING_CONCURRENCY_AND_CACHE.md`):

- **Concurrent scouting:** the angle "zero collisions" is true, but the mechanism is **per-coach
  isolated streams merged at match-end** — NOT a shared live view and NOT a "claim system" (the
  chess-model claim/heartbeat system was **retired in Brief F**). During a match each coach sees
  their **own** stream; both contributions combine into the canonical record on "End match."
  Safe framing: "each coach scouts their own side with no write conflicts; the app merges both
  into one record automatically." Avoid implying coaches watch each other's taps live in real time.
- **PWA / offline:** "works on a phone at the venue" is fair (local autosave draft + Firestore
  offline write-queue across a connectivity drop). But **full cold-start offline** isn't there
  yet (auth handshake + cold cache) — don't claim "fully offline."
</content>
