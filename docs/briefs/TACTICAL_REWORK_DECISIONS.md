# Tactical rework — decyzje per-funkcjonalność (Jacek 2026-07-01)

Zasada: **realna funkcjonalność proda w nowym wyglądzie; nowości budujemy świadomie.**
Silnik: `src/components/tactical/DrawingCanvas.jsx` (branch `feat/tactical-drawing-canvas`).

## A. Realne w prodzie — adaptujemy WYGLĄD, funkcja zostaje

| # | Funkcja | Decyzja Jacka |
|---|---|---|
| A1 | Gracze (`players[5]`) | **Tak samo jak prod** — bez zmian zachowania |
| A2 | Runners (`runners[5]`) | **Zostawiamy jak prod** |
| A3 | Bumpy (`bumps[5]`) | **Zostawiamy jak prod** |
| A4 | Bump shots (`bumpShots[5]`) | Zostawiamy jak prod, ale **stylujemy jako nowe strzały** |
| A5 | Strzały gracza | **UPROSZCZONE (Jacek, 2026-07-01):** w taktyce + analizie pola gracza **tylko strzał KIERUNKOWY** (stożek snake/środek/dorito, model `quickShots` + `shotGeometry.shotDirectionDeg`). Tryby „w strefę" i „w punkt" **NIE** tu. Menu = [Strzał] → [Podstawowy=kierunkowy \| Bounce]. |
| A6 | Freehand (`freehandStrokes`) | **Modyfikujemy o cały nowy silnik rysowania + funkcje** |
| A7 | Fazy | **Fazy jak wszędzie** (Breakout>Settle>Mid), przedstawione **tak jak wszędzie** (spójny StageSwitcher) |
| A8 | Run lines (baza→gracz) | **Animujemy** (dziś statyczne) |
| A9 | Pole (obraz+bunkry+kalibracja) | **Jeszcze nie zaprojektowane — wracamy później** (CD do projektu) |

## B. Nowości — budujemy świadomie

| # | Funkcja | Decyzja Jacka |
|---|---|---|
| B1 | Pin (notatka na polu) | **Tak — nowość** |
| B2 | Bounce (odbicie via + wachlarz) | **Tak — nowość** |
| B3 | Entry edytowalne (węzły base/mid) | **Tak — nowość** |
| B4 | System warstw (typ = warstwa, toggle „Warstwy") | **Tak** |
| B5 | Podgląd↔Edycja+Fullscreen (+landscape-lock) | **OK** |
| B6 | Inspektor elementu (czas[s], kolor, usuń) | **Nie dokończone w projekcie — ZAWIESZAMY** (CD dokończy) |
| B7 | Oś czasu (play przez fazy) | = A7 (Breakout>Settle>Mid) |
| B8 | Menu strzału z gracza | **Jak w prototypie:** klik ludka → wybierasz Strzał → wybierasz **Podstawowy** czy **Bounce** |

## Parked do projektu CD
- **A9** (wygląd pola) i **B6** (inspektor elementu) — CD jeszcze nie dokończył; CC nie buduje aż będzie design.

## Powiązanie ze scoutingiem (kluczowe — patrz odpowiedź CC)
Model strzału (A5: stożek/strefa/punkt, snake/środek/dorito), fazy (A7), run lines (A8),
gracze/bumpy/runners — to **to samo słownictwo co scouting**. Silnik taktyk = słownictwo
scoutingu w kontekście planowania, w nowym wyglądzie. Scouting jest ❄️ FROZEN (Birmingham),
więc CC **reużywa danych/definicji stref read-only, nie tyka żywego kodu scoutingu**; nowy
wygląd zbudowany tu może scouting przejąć po evencie.
