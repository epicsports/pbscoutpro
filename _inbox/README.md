# _inbox/ — skrzynka przekazań (Jacek ⇄ CD ⇄ CC)

Tu lądują **dropy plików**: zrzuty, zipy design-systemu od CD, drafty briefów, dane od Jacka.
Zastępuje katalog Downloads jako kanał wymiany.

**Reguły:**
- CC szuka nowych dropów **tu** (`_inbox/`), nie w Downloads.
- Zawartość `_inbox/` jest **gitignored** (skrzynka przekazań, nie część kodu) — tylko ten
  `README.md` jest trackowany, żeby katalog istniał w repo i był samoopisujący.
- `_inbox/` jest w katalogu repo → operacje na plikach są zaufane jak reszta repo
  (bez promptów uprawnień). Dlatego zewnętrzna reguła `Read(Downloads/**)` nie jest już potrzebna.
- Gdy CC przetworzy drop (np. wciągnie brief do BACKLOG jako 🔵, rozpakuje zip), plik zostaje
  w `_inbox/` jako artefakt przekazania — nie commitujemy go do kodu.
