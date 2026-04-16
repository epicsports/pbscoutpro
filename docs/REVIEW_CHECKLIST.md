# § 27 Review Checklist — po każdej implementacji UI

> Executable version of DESIGN_DECISIONS.md § 27 (Apple HIG Compliance).
> CC MUST run through this checklist before every UI-related commit.
> If ANY item fails, STOP and fix before committing.

## 1. Color discipline (precommit NIE wyłapie — context-dependent)

- [ ] Każdy amber `#f59e0b` element jest tappable LUB wskazuje active state?
- [ ] Zero amber na decoracji (border bez akcji, icon bez akcji, label bez active state)?
- [ ] Green `#22c55e` użyty tylko dla win/success/positive?
- [ ] Red `#ef4444` tylko dla loss/danger/destructive?
- [ ] Cyan `#22d3ee` tylko dla snake zone?
- [ ] Orange `#fb923c` tylko dla dorito zone?

## 2. Elevation (precommit łapie hex, ALE NIE layering logic)

- [ ] Page bg = `#080c14` (NOT `#0a0e17`)
- [ ] Cards/list items = `#0f172a`
- [ ] Headers/panels = `#111827`
- [ ] Recessed areas (score centers) = `#0b1120`
- [ ] Żadne dwa poziomy elevation NIE używają tego samego shade?

## 3. Typography (precommit łapie rozmiary, ale NIE pairing rozmiar+weight+context)

- [ ] Hero numbers (scores): 28-32px, weight 800-900?
- [ ] Primary text (names, titles): 15-18px, weight 600-700?
- [ ] Body text: 13-15px, weight 500?
- [ ] Secondary/labels: 11px, weight 600?
- [ ] Micro (badges, hints): 8-9px, weight 600-700?
- [ ] Zero tekstu poniżej 8px?
- [ ] Letter-spacing: ujemne na large (-.2 to -.3px), neutralne na body, dodatnie na labels (.3-.6px)?

## 4. Touch targets

- [ ] Minimum 44×44px wszędzie?
- [ ] Primary actions ≥48px?
- [ ] Interactive cards min-height 52-60px?

## 5. Cards (100% kontekstowe)

- [ ] Jeden card = jeden touch target (chyba że explicit split-tap jak match cards)?
- [ ] Max 3 data points widoczne na card level?
- [ ] Border-radius: 12px (cards), 10px (inner elements), 8px (pills)?
- [ ] Active state = subtle bg change (NIE border change)?
- [ ] Szczegóły na drill-down, nie na list card?

## 6. Navigation

- [ ] Back label matches destination ("‹ Matches", NIE generic "‹ Back")?
- [ ] Title centered, 13-14px, weight 500-600?
- [ ] Status pills (LIVE, FINAL) right-aligned?
- [ ] Header height 48px, bg `#0d1117`?

## 7. Anti-patterns — JEŚLI ZNAJDZIESZ CHOĆ JEDNO, STOP I REFACTOR

- [ ] Zero multiple CTAs competing for attention na jednej karcie?
- [ ] Zero amber na non-interactive elementach?
- [ ] Zero chevronów na non-split-tap cards (cała karta nawigująca = bez chevronu)?
- [ ] Zero stats/numbers na list cards które należą na detail page?
- [ ] Zero tekstu < 8px?
- [ ] Zero touch targets < 44px?
- [ ] Zero tego samego bg shade na różnych elevation layers?
- [ ] Zero gradientów/shadows/glow jako decoracja (dozwolone tylko na CTA buttons, HERO indicator)?

---

## Self-review report format

Po sprawdzeniu wszystkich 7 sekcji, raportuj użytkownikowi w tym formacie:

```
§ 27 self-review:
Color discipline: [PASS / violations: file:line - description]
Elevation:        [PASS / violations: ...]
Typography:       [PASS / violations: ...]
Touch targets:    [PASS / violations: ...]
Cards:            [PASS / violations: ...]
Navigation:       [PASS / violations: ...]
Anti-patterns:    [ZERO / found: ...]
Verdict:          [READY TO COMMIT / NEEDS FIXES]
```

Jeśli verdict = **NEEDS FIXES**, fix violations i powtórz review PRZED commitem.
