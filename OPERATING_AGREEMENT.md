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

## 8. CD handoff bez Jacka (od 2026-06-30)
Jacek wychodzi z pętli przekazywania roboty do CD. **CC sam zasila CD.**
- Ekran ⚪ w **aktywnym** epiku, który czeka na design → CC wypełnia `Notes` w `BACKLOG.md`
  wszystkim, czego CD potrzebuje: **realne komponenty z `APP_MAP.md`** (nazwy, propsy),
  **data-contract** (realne pola modelu — zero wymyślonych), **ścieżka do aktualnego
  zrzutu** w `/screenshots/`. CD projektuje wyłącznie z tego.
- CD kończy → ustawia ekran na 🔵. CC: 🔵 → build → render-proof @390/834/1280 → 🟢.
- CC **trzyma się aktywnego epiku**; nie briefuje epików zamrożonych (np. field-cluster ❄️).
- Gdy **cały** aktywny epik = 🟢 → CC nie startuje nowego epiku samowolnie; raportuje
  „done, <następny> czeka na GO". Tylko 🔴/realne widełko idzie do Jacka.

## 10. Skrzynka przekazań = `_inbox/` (od 2026-07-01)
Wymiana plików (zrzuty, zipy design-systemu CD, drafty briefów, dane Jacka) idzie przez
**`_inbox/` w repo**, nie przez Downloads. CC szuka nowych dropów w `_inbox/`. Zawartość
gitignored (tylko `_inbox/README.md` trackowany); katalog jest w repo → operacje na plikach
zaufane bez promptów (dlatego `Read(Downloads/**)` usunięte z whitelisty).

**CD nie ma write-accessu** → zostawia drafty jako pliki w `_inbox/` wg konwencji:
`BACKLOG__*.md` (wiersze → commit do BACKLOG, design = 🔵/awaiting-Jacek) ·
`BRIEF__*.md` (brief → reality-pass → kolejka wg owner → build). **CC skanuje `_inbox/` na
starcie każdej sesji** (CLAUDE.md §CD-DRAFT), przetwarza bez pytania Jacka, po czym **wchłania**
draft (`mv _inbox/<plik> _inbox/_processed/`), żeby nie wziąć go dwa razy. Trwały zapis =
commit (wiersze BACKLOG / brief w `docs/briefs/`), nie draft.

## 9. CC = jedyna sortownia + pętla domknięta z obu stron (od 2026-06-30)
- **CC jest jedynym wlotem zadań.** Każdy request (feature/bug/pomysł/poprawka) **najpierw**
  ląduje w `BACKLOG.md` jako wiersz z `owner`, **potem** klasyfikacja:
  kod/bug/dane/infra/refactor/perf → **CC** (robi sam) · wygląd/ekran/UX/komponent → **CD**
  (design-needed + brief) · mgła/duże/pomysł/research/decyzja-o-priorytecie/rozbicie → **ARCH**
  (nie startuje, flaguje). Wahanie CC↔ARCH → **domyślnie ARCH**.
- **Niezmiennik domknięcia (oba kierunki):**
  - CD wkłada każdy design do BACKLOG jako 🔵 **w momencie powstania**, nie gdy CC wypatrzy.
  - **CC nie shipuje na 🟢 niczego, co nie przeszło wcześniej przez 🔵 w BACKLOG.**
    **Brak wiersza designu = build się NIE zaczyna** — CC flaguje „⚠ design nie zarejestrowany"
    zamiast budować. Nic nie wjeżdża do kodu z pominięciem BACKLOG.
- Field-cluster ❄️: cokolwiek dotyka live scout-screena → dopisz + `owner`, ale **parkuj do GO**.

## 7. Czego NIE robimy
- Nie tworzymy drugiej tabeli stanu (jeden `BACKLOG.md`, jeden właściciel kolumny).
- Nie przekazujemy niczego „przez Jacka", co może być plikiem w repo.
- Nie shipujemy bez render-proof.
- Nie piszemy esejów-z-pytaniem przy rutynie.
