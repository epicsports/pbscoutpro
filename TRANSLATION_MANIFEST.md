# TRANSLATION MANIFEST — Polish → English
## For Claude Code: find and replace all Polish UI strings with English equivalents.
## Work file by file. Push after each file.

---

## src/App.jsx
| Line | Polish | English |
|------|--------|---------|
| 37 | `Ładowanie...` | `Loading...` |
| 74 | `Którą ręką obsługujesz telefon?` | `Which hand do you use?` |
| 77 | `Dostosuje pozycję lupy na ekranie` | `Adjusts magnifying loupe position` |
| 80 | `Lewa` | `Left` |
| 84 | `Prawa` | `Right` |

## src/components/ui.jsx
| Line | Polish | English |
|------|--------|---------|
| 201 | `Ładowanie...` | `Loading...` |

## src/components/FieldCanvas.jsx
| Line | Polish | English |
|------|--------|---------|
| 114 | `Załaduj layout pola w turnieju` | `Load field layout in tournament` |
| 419 | `↕ góra/dół = czas` | `↕ up/down = time` |
| 596 | `Strzały P${n}` | `Shots P${n}` |

## src/components/FieldEditor.jsx
| Line | Polish | English |
|------|--------|---------|
| 115 | `title="Etykiety bunkrów"` | `title="Bunker labels"` |
| 121 | `title="Strefy"` | `title="Zones"` |
| 127 | `title="Widoczność"` | `title="Visibility"` |
| 211 | `title="Przełącz schemat kolorów (daltonizm)"` | `title="Toggle color scheme (colorblind)"` |

## src/components/FieldView.jsx
| Line | Polish | English |
|------|--------|---------|
| 2 | `centralna warstwa wyświetlania boiska` | `central field display layer` |
| 4 | `Zastępuje bezpośrednie użycie...` | `Replaces direct usage of...` |

## src/components/CSVImport.jsx
| Line | Polish | English |
|------|--------|---------|
| 42 | `drużyna` (header detection) | keep both: `'team'` and `'drużyna'` for backward compat |
| 43 | `gracz`, `imię` (header detection) | keep both: `'player'` and `'gracz'` for backward compat |
| 121 | `📋 Import CSV — drużyny i zawodnicy` | `📋 Import CSV — teams & players` |
| 127 | `Wybierz plik CSV z drużynami i zawodnikami. Format: kolumna z nazwą drużyny i kolumna z imieniem gracza.` | `Select a CSV file with teams and players. Format: one column for team name, one for player name.` |
| 139 | `📂 Wybierz plik CSV` | `📂 Select CSV file` |
| 174 | `🔍 Podgląd` | `🔍 Preview` |
| 211 | `Zamknij` | `Close` |

## src/pages/LayoutDetailPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 229 | `Nie udało się utworzyć taktyki. Wyloguj się i zaloguj ponownie.` | `Failed to create tactic. Log out and log in again.` |
| 483 | `Anuluj` | `Cancel` |
| 485 | `Zapisz` | `Save` |
| 511 | `Zmień zdjęcie` / `Wgraj zdjęcie pola` | `Change image` / `Upload field image` |

## src/pages/LayoutsPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 127 | `Nowy layout` | `New layout` |
| 132 | `title="Nowy layout"` | `title="New layout"` |
| 134 | `Anuluj` | `Cancel` |
| 135 | `Utwórz` | `Create` |
| 163 | `Zmień zdjęcie` / `Wgraj zdjęcie pola *` | `Change image` / `Upload field image *` |
| 174 | `Linie Disco/Zeeker i bunkry — skonfiguruj na stronie detali layoutu` | `Disco/Zeeker lines and bunkers — configure on layout detail page` |
| 181 | `Usuń layout?` / `Usunąć "${name}"?` / `Usuń` | `Delete layout?` / `Delete "${name}"?` / `Delete` |

## src/pages/MatchPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 727-728 | Any remaining Polish toggle labels | Use English equivalents |
| 754 | `Rysuj...` | `Drawing...` |
| 758 | `Narysuj ścieżkę wroga na mapie` | `Draw enemy path on the map` |
| 775 | `pozycji` | `positions` |

## src/pages/TacticPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 405 | `rysuj ścieżkę wroga` | `draw enemy path` |
| 631 | `Narysuj ścieżkę biegu przeciwnika — przeciągnij palcem po mapie` | `Draw the enemy run path — drag your finger on the map` |
| 726 | `nie zdążę dobiec` (if present) | `may not arrive in time` |
| 742-745 | Any Polish stat labels | English equivalents |
| 774 | `Bump P{n} — kliknij pozycję docelową` | `Bump P{n} — tap target position` |

## src/pages/TeamDetailPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 103 | `Dywizje` | `Divisions` |
| 124 | `Nowy` | `New` |
| 127 | `Znajdź` | `Find` |
| 131 | `Skład` | `Roster` |
| 152 | `title="Edytuj profil"` | `title="Edit profile"` |
| 153 | `title="Usuń z drużyny"` | `title="Remove from team"` |
| 160 | `title="Nowy player"` | `title="New player"` |
| 162 | `Anuluj` | `Cancel` |
| 163 | `Dodaj` | `Add` |
| 175 | `Dodaj istniejącego playera` | `Add existing player` |
| 177 | `🔍 Szukaj po imieniu, ksywce, numerze...` | `🔍 Search by name, nickname, number...` |
| 201 | `Brak wyników. Utwórz nowego playera.` | `No results. Create a new player.` |

## src/pages/TeamsPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 73 | `— brak (drużyna główna) —` | `— none (main team) —` |
| 122 | `Nowa drużyna` | `New team` |
| 125 | `Dodaj` | `Add` |
| 128 | `Nazwa drużyny...` | `Team name...` |
| 143 | `Drużyna matka` | `Parent team` |
| 151 | `Edytuj drużynę` | `Edit team` |
| 154 | `Zapisz` | `Save` |
| 177 | `Usuń drużynę?` / `Usuń` | `Delete team?` / `Delete` |
| 178 | `Usunąć "${name}"?` | `Delete "${name}"?` |

## src/pages/TournamentPage.jsx
| Line | Polish | English |
|------|--------|---------|
| Any Polish labels | Translate to English |

## src/pages/ScoutedTeamPage.jsx
| Line | Polish | English |
|------|--------|---------|
| 117 | `Turniej` (fallback) | `Tournament` |

## src/pages/LoginGate.jsx
| Line | Polish | English |
|------|--------|---------|
| 87 | `⏳ Wczytywanie...` | `⏳ Loading...` |

## src/components/ScheduleImport.jsx
| Line | Polish | English |
|------|--------|---------|
| 370 | `Dywizja:` | `Division:` |

---

## Rules
1. Keep `Disco` and `Zeeker` as-is (proper nouns in paintball)
2. Keep bunker type abbreviations as-is (SB, MD, etc.)
3. CSV import: keep Polish header detection alongside English for backward compat
4. Comments in code can stay Polish or switch to English — low priority
5. `Breakout` stays `Breakout` (universal paintball term)
