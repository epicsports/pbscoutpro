# CC Brief Boilerplate

> Każdy nowy CC_BRIEF_*.md MUSI zawierać tę sekcję "Acceptance criteria" na końcu.
> Wklej `cat docs/CC_BRIEF_BOILERPLATE.md >> CC_BRIEF_NEW.md` przy tworzeniu briefu.

---

## Acceptance criteria — § 27 Apple HIG specific

Przed pushem MUSISZ zweryfikować dla każdego nowego/zmienionego ekranu:

### Colors
1. Page bg = `#080c14` (NIE `#0a0e17`)
2. Card bg = `#0f172a`, Headers = `#111827`, Recessed = `#0b1120`
3. Card border-radius = 12px, inner = 10px, pills = 8px
4. Amber `#f59e0b` usage: LIST każde użycie i uzasadnij (musi być interactive/active)
5. Zero chevronów na non-split-tap cards

### Touch & Typography
6. Touch targets ≥44px, primary ≥48px, interactive cards 52-60px
7. Typography zgodna z § 27 scale (Hero 28-32/800, Primary 15-18/600-700, Body 13-15/500, Labels 11/600, Micro 8-9/600-700)
8. Back label matches destination (np. "‹ Matches", NIE "‹ Back")

### Self-review
9. Uruchom pełną checklistę z `docs/REVIEW_CHECKLIST.md`
10. Raportuj self-review w formacie z REVIEW_CHECKLIST.md

**Jeśli JAKIEKOLWIEK kryterium fail, NIE pushuj. Fix i re-verify.**
