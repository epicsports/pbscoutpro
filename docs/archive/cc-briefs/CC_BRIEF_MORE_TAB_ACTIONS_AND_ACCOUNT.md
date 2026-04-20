# CC Brief: More tab — sekcja Akcje + Workspace w Konto

**Scope:** `TrainingPage.jsx` + `TournamentPage.jsx` (More tab). Identyczna mechanika, różne etykiety.

**Cel:** uprościć sekcję Akcje (jedna kontrolka zamiast toggle + przycisk), przenieść Workspace do sekcji Konto, wprowadzić read-only mode po zakończeniu sesji.

---

## 1. Sekcja AKCJE — merge LIVE toggle z Zakończ/Zamknij

Wywal toggle „Tryb LIVE" z More tab. Sesja jest LIVE z definicji dopóki nie zostanie zakończona.

Jedna pozycja w sekcji, zmienna w zależności od stanu sesji:

| Kontekst | Stan: trwa | Stan: zakończony |
|---|---|---|
| Trening | `Zakończ trening` (amber) | `Usuń trening` (red) |
| Turniej | `Zamknij turniej` (amber) | `Usuń turniej` (red) |

Warunek: `session.status === 'ended'` (lub odpowiednik) → renderuj `Usuń...`, w przeciwnym razie `Zakończ.../Zamknij...`. **Brak placeholdera „Zakończony ✓"** — status komunikuje context bar.

---

## 2. Sekcja KONTO — dodaj Workspace

Sekcja KONTO (na samym dole More tab) dostaje 3 pozycje w tej kolejności:

1. **Profil** (avatar + nick + rola, chevron) — prowadzi do edycji profilu
2. **Workspace** — pokazuje aktualny slug (`venom-squad`) jako wartość po prawej, chevron prowadzi do zmiany workspace
3. **Wyloguj się** — czerwony tekst, brak chevrona

Workspace **przenieś** z dotychczasowego miejsca (nie duplikuj). Jedno źródło prawdy.

---

## 3. Read-only mode po zakończeniu sesji

Po tapie `Zakończ trening` / `Zamknij turniej` → confirm modal → na OK:

- Status sesji ustaw na `ended`
- **Zostań w sesji** (nie redirect na home)
- **Scout tab:** lista historyczna widoczna, brak CTA „Nowy matchup", tap na matchup → tylko podgląd
- **Coach tab:** pełna funkcjonalność (notatki, analizy)
- **More tab:** sekcja Akcje przeładowuje się z `Usuń...`
- **Context bar:** badge zmienia kolor na szary, znika ● LIVE, dopisuje „zakończony"
- **Home u innych userów workspace:** sesja znika z LIVE, ląduje w „Ostatnie"

---

## 4. Confirm modale

| Akcja | Treść |
|---|---|
| `Zakończ trening` | „Zakończyć trening? Nie będzie można dodawać kolejnych punktów. Analizy i notatki zostają dostępne." |
| `Zamknij turniej` | „Zamknąć turniej? Nie będzie można dodawać kolejnych punktów. Analizy i notatki zostają dostępne." |
| `Usuń trening` / `Usuń turniej` | Bez zmian względem aktualnej logiki (admin-only, hard delete). |

---

## 5. i18n

Etykiety przez `t()` — patrz klucze `end_training`, `close_tournament`, `delete`. Dodaj `delete_training`, `delete_tournament` jeśli brak.

---

## Pliki do ruszenia

- `src/pages/TrainingPage.jsx`
- `src/pages/TournamentPage.jsx`
- `src/utils/i18n.js` (nowe klucze, jeśli brak)
