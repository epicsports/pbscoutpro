# _inbox/ — skrzynka przekazań (Jacek ⇄ CD ⇄ CC)

Tu lądują **dropy plików**: zrzuty, zipy design-systemu od CD, drafty briefów, dane od Jacka.
Zastępuje katalog Downloads jako kanał wymiany.

**Reguły:**
- CC szuka nowych dropów **tu** (`_inbox/`), nie w Downloads. Skan na starcie każdej sesji.
- Zawartość `_inbox/` jest **gitignored** (skrzynka przekazań, nie część kodu) — tylko ten
  `README.md` jest trackowany, żeby katalog istniał w repo i był samoopisujący.
- `_inbox/` jest w katalogu repo → operacje na plikach są zaufane jak reszta repo
  (bez promptów uprawnień). Dlatego zewnętrzna reguła `Read(Downloads/**)` nie jest już potrzebna.

**Konwencja nazw draftów od CD (CD nie ma write-accessu do repo — zostawia pliki):**
- `BACKLOG__*.md` — wiersze do wklejenia do `BACKLOG.md`. CC: dopisuje wiersze (+ `owner`),
  commituje do `BACKLOG.md`. Wiersze designu wchodzą jako 🔵 / awaiting-Jacek (no-🔵-no-build dalej obowiązuje).
- `BRIEF__*.md` — brief design/feature. CC: reality-pass → kolejka wg owner/status → build buildable-slice.
- inne (zipy, `*.png`, `*.json`) — surowe dropy, obsługa ad hoc.

**Wchłonięcie (żeby nie wziąć draftu dwa razy):** po przetworzeniu
`mkdir -p _inbox/_processed` + `mv _inbox/<plik> _inbox/_processed/`.
`_processed/` nie jest skanowany. Trwałym zapisem jest **commit** (wiersze w `BACKLOG.md`
albo zaakceptowany brief w `docs/briefs/`), nie sam draft.
