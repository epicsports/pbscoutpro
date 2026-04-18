# Sławek — coach preparation workflow (voice message transcription)

> **Data:** 18.04.2026
> **Źródło:** Messenger voice message od Sławka, transcribed by Jacek przez iOS
> **Cel:** Zrozumieć co realnie robi head coach NXL gdy przygotowuje drużynę do meczu

## Kluczowy disclaimer

Sławek nagrał voice message surowo (strumień myśli, nie wypolerowany framework). Ale to czyni go tym cenniejszym — to jak faktycznie myśli przed turniejem.

## Filozofia taktyk — uniwersalne vs per-przeciwnik

**Zasada:** Ustalam taktyki **uniwersalne**, potem dostosuwuję do konkretnego przeciwnika.

**Etap 1 (przed turniejem):** uniwersalne taktyki na bazie znajomości layoutu + jak my gramy + jak przeciwnik MOŻE grać. NIE potrzebuje danych o przeciwniku.

**Etap 2 (w trakcie turnieju, między meczami):** dane o konkretnym przeciwniku → adaptacja taktyk.

**Wyjątek:** Dane cross-tournament na tym samym layoucie (np. PXL graną wcześniej) — bierze pod uwagę już w Etapie 1.

## 4 priorytetowe dane scoutingu

### 1. Breakout
- Jak się rozbiegali (pozycje docelowe)
- Czy przeżywali breakout (break survival rate)

### 2. Strefy strzału po breakoutcie
- Gdzie strzelają (lane'y)
- **VS** czy trafiają skutecznie (kills)

Krytyczne rozróżnienie: "strzelają" ≠ "trafiają" to dwie różne rzeczy.

### 3. Big Moves / pik moves (challenge!)
- Cross-field movement (center → dorito)
- "Meksyk" (coaching term)
- "Buszowanie do dorito"
- Sławek sam mówi: *"nie do końca wiem jak można to wyłapać"*

### 4. Tendencja drużyny
- Dorito side attacks
- Snake side attacks  
- Center aggressive (głębokie środkowe pozycje, x ∈ [0.3, 0.7] AND y między liniami)
- 3 niezależne liczniki, suma może być 0-300%

## Wiarygodność danych — kluczowy wymóg

*"Kluczowa jest wiarygodność tych danych czyli kto i jak to skautował i zawsze będę o tym wspominał."*

Wymagania:
- Tracking KTO wprowadził dane (`createdBy`)
- Ocena jakości scoutingu per osobę
- Filtrowanie po skaucie

Skauting robią GRACZE pierwszego składu (nie zewnętrzni scouci) — mają maksymalną motywację, lepsza jakość danych.

## Metryka wartości zawodnika — NIE kills

*"Nie, nie, nie, nie fragi, nie kile, nie. Nie interesuje. Kto ma największą skuteczność zwycięskich punktów na polu, nieważne ilu zestrzelił."*

- NIE liczba eliminacji (kills)
- NIE fragi (points scored)
- TAK: **win rate z udziałem tego zawodnika** (punkty wygrane gdy on był na polu)

**PBLeagues-style scoring:** sortuj po `+/-` (wins - losses), nie po win rate %. Absolute contribution > relative performance.

## Constraints operacyjne

**Mało czasu między punktami:** *"Potrzebuję kilka kluczowych"* — nie 50 metryk.

**Dwa tryby konsumpcji:**
1. W trakcie meczu — minimalna kognitywna obciążenia, kluczowe insights
2. Wieczór przed następnym dniem — głęboka analiza, starting 5 siada razem i skautuje nagrania

## Validation — case study Francja FSSY

Sławek: *"Zobacz jak wyskautowaliśmy we Francji sobie FSSY z którym turniej wcześniej w Anglii przegraliśmy. Na pewno Mercy chyba sześć jeden był, siedem dwa, bo mieliśmy wszystko przeczytane."*

**Dowód że scouting działa:** Anglia — przegrali z FSSY. Francja (cycle później) — scoutowali perfekcyjnie → Mercy 6:1 albo 7:2.
