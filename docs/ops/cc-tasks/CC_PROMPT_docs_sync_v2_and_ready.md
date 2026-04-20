# CC Prompt — Docs sync v2 + Ready for Security Refactor implementation

Kontynuacja PbScoutPro. Opus wprowadził dwie kluczowe zmiany decyzji względem poprzedniej sesji.

**To zadanie ma dwa etapy: najpierw doc sync (zawsze przed implementacją), potem start Commit 1 pracy security. Rób etap 1, zaraportuj, czekaj na GO od Jacka przed rozpoczęciem etapu 2.**

---

## Etap 1 — Doc sync (zrób TERAZ)

### Kontekst

W poprzedniej sesji zapisałeś § 38 do DESIGN_DECISIONS.md + CC_BRIEF_SECURITY_ROLES_V2.md. Opus + Jacek doprecyzowali dwie rzeczy które zmieniają fundament:
1. **Multi-role per user** — zamiast `userRoles[uid] = 'coach'` mamy `userRoles[uid] = ['admin', 'coach', 'player']` (array). Jacek jest jednocześnie admin + coach + player.
2. **PBleagues ID matching** — obligatoryjne dla wszystkich, zastępuje email-based matching z SelfLog Tier 1. Zero fallbacku.

To wymaga patchy do § 38 (przepisane 38.2, 38.3, 38.8, 38.11 + dodane 38.12, 38.13, 38.14) oraz całkowicie przepisanego briefu.

### Zadania

#### 1. Pull latest

```bash
cd /path/to/pbscoutpro
git pull origin main
```

#### 2. Zastosuj patche § 38 zgodnie z `DESIGN_DECISIONS_section_38_patch_v2.md`

Plik zawiera 7 konkretnych edycji. Zrób je w kolejności w `docs/DESIGN_DECISIONS.md`:

- **Edit 1** — zastąp § 38.2 (Role model → multi-role array)
- **Edit 2** — zastąp § 38.3 (Admin determination → trzy paths: hasRole + adminUid + ADMIN_EMAILS)
- **Edit 3** — zastąp § 38.8 (Data model → array userRoles + linkedUid + pbleaguesIdFull + pendingApprovals)
- **Edit 4** — zastąp § 38.11 (Implementation paths → resolved Path A)
- **Edit 5** — dopisz na końcu § 38 nowe podsekcje 38.12, 38.13, 38.14
- **Edit 6** — zmień nagłówek § 38 (dodaj "extended April 20, 2026")
- **Edit 7** — bump "Last updated" na samej górze DESIGN_DECISIONS.md

**Uwaga:** Edit 5 (trzy nowe podsekcje 38.12-38.14) to największa zmiana objętościowo — nowy content ~200 linii. Skopiuj dokładnie treść z pliku patch.

**Sanity check po wszystkich edycjach:**
```bash
grep -c "^### 38\." docs/DESIGN_DECISIONS.md
# Powinno zwrócić 14 (38.1 do 38.14)
grep "^## 38" docs/DESIGN_DECISIONS.md
# Powinieneś zobaczyć zaktualizowany nagłówek z "extended April 20, 2026"
```

#### 3. Nadpisz `CC_BRIEF_SECURITY_ROLES_V2.md` w repo (jeśli tam trafił)

Jeśli poprzednia wersja briefu została commitowana do repo — zastąp całą zawartość plikiem `CC_BRIEF_SECURITY_ROLES_V2.md` z dostarczonych plików (ten co jest teraz z tym promptem, nie ten z poprzedniej sesji).

Jeśli brief był tylko lokalnie u Jacka i nie trafił do git — pomiń ten krok (brief użyjesz bezpośrednio w Etapie 2 z dostarczonych plików).

Sprawdź:
```bash
ls docs/archive/cc-briefs/ | grep -i security
# Jeśli jest CC_BRIEF_SECURITY_ROLES_V2.md — nadpisz
```

#### 4. Update HANDOVER.md

Jedna zmiana: aktualizuj "Awaiting decision" table — usuń wiersz "Security refactor path (A vs B)" (jest zamknięty, Path A wybrane). Zamiast tego dodaj w "Recently shipped" notatkę że doc § 38 v2 jest gotowy:

Znajdź:
```
| **Security refactor path (A vs B)** | Path A = full refactor (8-15h) before NXL Czechy...
```

Usuń cały ten wiersz.

W "Recent design decisions" zaktualizuj wiersz § 38:
```
| 38 | Security Role System + View Switcher (v2) | 2026-04-17 (v1) + 2026-04-20 (v2 extended: multi-role + PBleagues matching) | 5 roles ARRAY per user, PBleagues ID mandatory onboarding, admin approval gate. Path A chosen. Brief ready: CC_BRIEF_SECURITY_ROLES_V2.md |
```

Bump "Last updated" na górze pliku.

#### 5. Precommit + commit

```bash
npm run precommit  # doc-only, powinien przejść
git add docs/DESIGN_DECISIONS.md docs/ops/HANDOVER.md
git commit -m "docs: § 38 v2 — multi-role + PBleagues matching (supersedes v1 subsections 38.2, 38.3, 38.8, 38.11; adds 38.12-38.14)"
git push origin main
```

#### 6. Zaraportuj Jackowi

Napisz KROTKO (3-5 linii):
- Commit SHA
- Ile linii dodanych do DESIGN_DECISIONS (powinno być ~200-250)
- Potwierdzenie że HANDOVER.md zaktualizowane
- Na końcu: **"Gotowy do Etapu 2 (Commit 1 implementacji). Czekam na GO od Ciebie."**

---

## Etap 2 — Implementacja security refaktoru (zacznij PO "GO" od Jacka)

### Brief

Pełne instrukcje w `CC_BRIEF_SECURITY_ROLES_V2.md` (dostarczony plik). 4 commity na branch `feat/security-roles-v2`.

### Kolejność

1. **Pre-work verification** — uruchom grepy z briefu (§ Pre-work verification), wklej output Jackowi
2. Jacek potwierdza że skala pokrywa się z założeniami → daje GO
3. Zacznij Commit 1 (foundation + PBleagues onboarding)
4. Po każdym commicie: precommit + push. **NIE MERGE do main** bez explicit GO od Jacka na końcu wszystkich 4 commitów
5. Po Commit 4: raport + czekanie na iPhone validation od Jacka

### Bezpieczeństwo

- **Nie merguj do main sam**. Zawsze czekasz na explicit GO od Jacka przed merge.
- **ADMIN_EMAILS (`jacek@epicsports.pl`) zawsze działa jako emergency** — nawet jeśli coś się spieprzy w rules, Jacek nie straci dostępu.
- **Rules deploy LAST w kolejności deploymentu** (indexes → code → rules) żeby rules były pierwszym kandydatem do rollbacku.

### Pytania do Jacka w trakcie (stop-and-ask triggers)

Jeśli napotkasz:
- `pbleaguesId` field shape w bazie nie pasuje do spec (np. brak `#` prefix albo inny separator)
- Migration reveals weird data (user bez activity ale też bez linkedPlayer)
- Rules denying legitimate writes
- Path A vs B ponownie wychodzi

→ STOP, zapytaj. Default: safer side (deny > allow, preserve > delete, ask > guess).

---

## Zasady (przypomnienie z poprzednich sesji)

- Inline JSX styles + theme tokens tylko (zero Tailwind, zero CSS modules)
- Min 44×44px touch targets (§ 27 compliance)
- i18n PL + EN dla każdego nowego UI stringa
- Precommit pass przed każdym commit
- Commit messages: imperative mood, prefix feat/fix/chore, reference § gdzie możliwe
- Dokumentacja **ciągle aktualizowana** — każda decyzja z chatu idzie do repo. Jacek prosił o to explicite.

Jedziemy etapem 1. Wracaj po skończeniu.
