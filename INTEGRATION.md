# BreakAnalyzer — Integration

## Pliki do skopiowania

Skopiuj cały folder `src/modules/breakAnalyzer/` do projektu PbScoutPro:

```
src/modules/breakAnalyzer/
  BreakAnalyzerPage.jsx        ← strona główna modułu
  useBallisticsWorker.js       ← hook do Web Workera
  workers/
    ballisticsEngine.js        ← silnik obliczeniowy (Web Worker)
```

## Zmiany w istniejących plikach

### 1. App.jsx — dodaj route

```jsx
// Dodaj import:
import BreakAnalyzerPage from './modules/breakAnalyzer/BreakAnalyzerPage';

// Dodaj route (wewnątrz <Routes>):
<Route path="/layout/:layoutId/analyze" element={<BreakAnalyzerPage />} />
```

### 2. LayoutsPage.jsx — dodaj przycisk "Analyze"

W sekcji renderowania kart layoutów, obok przycisku "Annotate" dodaj:

```jsx
<Btn variant="ghost" size="sm"
  onClick={(e) => { e.stopPropagation(); navigate(`/layout/${l.id}/analyze`); }}>
  ⚡ Analyze
</Btn>
```

## Wymagania

- Vite (już macie) — Worker import via `new URL(..., import.meta.url)`
- Layout musi mieć bunkry (dodane przez annotacje w LayoutsPage)
- Bunkry muszą mieć nazwy — system auto-rozpoznaje typ z nazwy

## Co działa

- Tap bunkier → heatmapa widoczności (zielony=niska celność, czerwony=wysoka, fiolet=łukiem)
- Edytor typów — przypisz NXL typ do każdego bunkra (SB, MD, C, etc.)
- Model balistyczny z oporem powietrza i strzałami łukiem 0-15°
- Cały silnik w Web Worker — nie blokuje UI
