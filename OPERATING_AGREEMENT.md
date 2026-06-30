# OPERATING_AGREEMENT.md — jak współpracują Design + CC (1 strona)

Cel: Jacek przestaje być szyną integracyjną. Repo jest jedynym wspólnym okiem.
Jacek poświęca ~10% dotychczasowego czasu: zatwierdza epiki, rozstrzyga widełka. Tyle.

## 1. Kto jest właścicielem czego
- **Repo (GitHub)** — jedyne źródło prawdy. Stan = `BACKLOG.md` + commity + zrzuty.
- **Design** — intencja designu, prototypy, tokeny (`theme.js`), rejestr decyzji.
  Pisze briefy jako pliki do `/briefs/`. NIE prowadzi backlogu stanu.
  `_PROJECT_STATE.md` zdegradowany do „design-intent + decyzje" (nie status).
- **CC** — implementacja + prawda o deployu. Właściciel kolumn `Build`/`Verified`
  w `BACKLOG.md`. Archiwizuje 5 starych list do `/_archive/` z pointerem.
- **Jacek** — bramka biznesowa: GO na epik, rozstrzyganie widełek. Final smoke (opcjonalny, wsadowy).

## 2. Rytuał sesji (oba agenty)
- **Start:** przeczytaj `BACKLOG.md` z repo. Nie pytaj Jacka o status. Design: czytaj też zrzuty z repo.
- **Koniec (CC):** zaktualizuj `Build`/`Verified` z prawdy gita/deployu. Bez tego sesja nie jest zamknięta.
- **Koniec (Design):** zaktualizuj `Design` + zapisz brief do `/briefs/`.

## 3. Praca w epikach, nie ekran-po-ekranie
Grupuj 🔵 w spójne epiki (field-cluster, team-consolidation, bugfix-red).
Jeden epik = jeden komplet brief+prototyp = jeden wsad CC = jeden przegląd Jacka.
Zakaz: 1 bug = 1 ship = 1 pętla przez Jacka.

## 4. Definicja gotowości (DoD) — wbudowana w każdy brief
Ekran jest „done" (🟢) tylko gdy:
- [ ] na produkcji,
- [ ] CC wyrenderował go @390/834/1280 (render-harness),
- [ ] zrzuty dołączone w repo obok prototypu Design.
Brak pary zrzut↔prototyp = status 🟠 „in-build", nigdy 🟢. To wycina ~90% reworku,
bo CC łapie rozjazd przed Jackiem, nie po nim.

## 5. Szablon briefu (Design → `/briefs/<epic>.md`)
```
# Brief: <epic>
## Ekrany: <lista>
## Data-contract: <realne pola z modelu/scout-point — ZERO wymyślonych danych>
## Tokeny: <z theme.js, bez nowych chyba że uzasadnione>
## Prototyp: <link/obraz>
## DoD: render @390/834/1280 + zrzuty w repo
## Decyzje: <co ustalone, co otwarte>
```
Reguła anty-rework: **data-contract powstaje PRZED prototypem.** Design nigdy nie wymyśla danych.

## 6. Eskalacja i format statusu
- Status raportowany WYŁĄCZNIE jako tabela z `BACKLOG.md`. Zero eseju.
- Do Jacka idzie tylko: 🔴 blok albo realne widełko projektowe — w ≤3 liniach, z rekomendacją.
- Rutynowy ship 🟠→🟢 nie wymaga pytania. CC robi go sam po render-proof.

## 7. Czego NIE robimy
- Nie tworzymy drugiej tabeli stanu (jeden `BACKLOG.md`, jeden właściciel kolumny).
- Nie przekazujemy niczego „przez Jacka", co może być plikiem w repo.
- Nie shipujemy bez render-proof.
- Nie piszemy esejów-z-pytaniem przy rutynie.
