# Sparing 2026-05-03 — Player self-log workaround

**Issue:** PPT page (`/player/log`) shows only trainings. Sparing self-log requires manual navigation.

**Workaround for sparing day:**

Gracze logujący własne breakouty w sparingu używają FAB w MatchPage:

1. Home (Scout tab)
2. Tap tournament card "Sparing 2026-05-03"
3. Tap match (vs przeciwnik)
4. Tap orange ⬆ FAB (bottom-right corner of MatchPage)
5. HotSheet otwiera się — log breakout + variant + shots + outcome jak na treningu

**Limit:** 4-5 tapów do otwarcia self-log w sparingu, vs 1 tap w treningu (PPT picker).

**Long-term fix:** Sparing architecture rozkmina post-2026-05-03 — combined Issue #3 + Issue #6, see NEXT_TASKS BLOCKED list.

**Coach instructions:** Wyślij graczom direct link do MatchPage przez Discord żeby skrócić ścieżkę. URL pattern: `https://epicsports.github.io/pbscoutpro/#/tournament/{tid}/match/{mid}`.

**Tablet KIOSK alternative:** Coach może użyć KIOSK lobby (`/kiosk` route) jeśli tablet jest dostępny — gracze tap tile + self-log inline. Działa identycznie w sparingu jak na treningu.
