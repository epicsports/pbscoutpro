# Backlog — landscape / „superhero" redesigns

Zbiór ekranów, które wrzucasz do przerobienia na wersję szeroką (tablet/desktop) lub do upiększenia.
Status: ⬜ do zrobienia · 🟡 propozycja czeka na akceptację · ✅ zrobione

---

## ✅ Zrobione w tej sesji

| Ekran | Trasa | Komponent | Notatka |
|---|---|---|---|
| **BLOK POLE — #7+#10+#11+#12 jako JEDEN Field Workspace** | `rd-field` (+`-bunkers`/`-lines`/`-tactic`/`-coach`) | `FIELD3.FieldWorkspace` (redesign10/11.jsx, dane `fielddata.jsx`) | **Cztery „ekrany" zwinięte w jedną powierzchnię pola + rail z trybami** (zgodnie z ustaleniem CC: wszystkie renderują przez jeden `FieldCanvas`, różni je tylko chrome). Pole **sterowane danymi** (schemat CC: bunkers 0–1 + 20 typów, lustro liczone `computeMirrors`, lineDivision, callout lines 2-pkt, strefy-wielokąty). Tryby w lewym icon-railu: **Podgląd (#10)** — przełączniki warstw (Nazwy/Linie/Strefy/Pół-pola) + legenda + meta; **Przeszkody (#7, admin)** — paleta 20 typów → stuknij pole, edycja mastera (nazwa/typ/displayName/wymiary/usuń), bliźniaki w lustrze ⇄ (re-entry = stały tab, naprawia bug RBAC); **Linie (#11, admin)** — linie faz z **jawnymi opisanymi kontrolkami** (Nazwa/Pozycja-suwak/Kolor — naprawia „klik=ukryta akcja") + callout z rysowaniem 2-pkt; **Strefy (#11, admin)** — lista + rysowanie wielokąta (stukaj wierzch., zamknij na 1.) + typ; **Taktyka (#12, coach)** — oś 5 faz, ustawienie 5/5 (stuknij pole), strzałki rozbiegu/strzałów, Rysuj/Wyczyść/Zapisz. Responsywne: wide = icon-rail │ pole │ content-rail; telefon = pole + poziome zakładki + panel. Admin-gating przez prop `isAdmin`. |
| Drużyny / Coach | `rd-coach` | `REDESIGN.CoachTeamListWide` | master-detail: lista (gradient + W-L + ukryte) ↔ panel drużyny + „Analizuj przeciwnika" |
| Statystyki zawodnika | `rd-playerstats` | `REDESIGN.PlayerStatsWide` | karta-hero (NBA) + self-review po lewej; siatka analityczna po prawej (tendencja, upadek, break, start, combo) |
| **#8 Scout — JEDEN responsywny widok** | `rd-home`→Scout · `rd-matches` | `REDESIGN.MatchListPremium` (prop `wide`) | **Zunifikowane:** telefon + tablet/desktop to ten sam komponent. Klik w nazwę/crest drużyny = scouting TEJ drużyny w TYM meczu (na każdej szerokości); klik w wynik/środek = podgląd meczu. Filtry działają realnie (szukanie po nazwie + dywizje Wszystkie/PRO3v3/SEMI-PRO/D3, filtr `m.div`). Live wyróżnione, na wide siatka auto-fill. `ScoutWide` (master-detail) wycofany — nieużywany. **Brief dla CC wysłany.** Labelki i18n = bug po stronie CC. |
| **#9 Field library (landscape) + filtry** | `layouts` | `REDESIGN8.LayoutsListWide` | pełna szerokość, siatka kart auto-fill z miniaturami pola + szukanie + chipsy ligi (NXL Europe/NXL US/PXL, dynamiczne) + licznik + stan pusty. Telefon = stary `MORE_UI.LayoutsList`. |
| **#1 Twoje dzisiejsze punkty (landscape HERO)** | `rd-today` | `REDESIGN6.TodayPointsWide` | **Przebudowany z wąskiej kolumny na 2-kol landscape.** LEWA (sticky): hero dnia — ring przeżywalności + numer-watermark + nick/event, kafle punkty/przeżyte/stracone, streak chip, split „gdzie biegałeś dziś”, insight „najczęstsza strata”. PRAWA: oś punktów (kolorowy lewy border = przeżył/out) + CTA „Zaloguj nowy punkt”. Dane wzbogacone do 6 pkt (`TODAY_POINTS`+`TODAY_DAY` w data4). |
| **#3 Mój profil (HERO)** | `rd-profile` | `REDESIGN6.MyProfileWide` | **Z formularza na kartę-bohatera.** Hero band: avatar na dysku akcentu, numer-watermark, nick eyebrow, imię/NAZWISKO, role jako 4 kafle „uprawnień”. Konto (nazwa/hasło/dane gracza) jako wtórne po prawej. |
| **#4 Profil drużyny (HERO + upload logo)** | `rd-teamprofile` | `REDESIGN6.TeamProfileWide` | **Hero crest band** (kolor klubu jako tło-akcent, liga·dywizja) + **realny slot uploadu logo** (drag-drop / file-picker → FileReader podgląd → podmienia crest w hero i topbarze). Plakietka „AKTYWNE · NXL US” (decyzja m1056). Kolor + ligi/dywizje/skład po prawej. |
| **#2 Wybór treningu (landscape hub)** | `rd-selecttraining` | `REDESIGN6.SelectTrainingWide` | **Z płaskiej listy na 2-kol hub gracza.** LEWA (sticky): hero najbliższego treningu — nazwa, data, **layout tego tygodnia** (model: tydzień = jeden layout, potem rotacja, decyzja m1142) + CTA „Loguj punkty”. PRAWA: siatka wcześniejszych treningów. Bez odznak/postępów (decyzja m1142). Dane: `SELECT_TRAINING` w data4. Telefon = `REDESIGN2.SelectTrainingPremium`. |
| **#5 Nowy zawodnik (wizard)** | `rd-newplayer` | `REDESIGN7.NewPlayerWizard` | **Formularz → 3-krokowy wizard** (telefon + wide). Krok 1 niezbędny = Imię i nazwisko + drużyna (multi-pick), bramka blokuje „Dalej”. Kroki 2-3 opcjonalne (Nr/nick/wiek/zdjęcie; rola/klasa/narodowość/bunkier/PBLI/notatki) z „Pomiń”. „Zapisz teraz” dostępne po kroku 1. Progress bar. (decyzja m1142). |
| **#6 Nowa drużyna (wizard)** | `rd-newteam` | `REDESIGN7.NewTeamWizard` | **Formularz → 2-krokowy wizard** (telefon + wide). Krok 1 niezbędny = nazwa drużyny + liga. Krok 2 opcjonalny = PBLeagues ID + drużyna nadrzędna z „Pomiń”. (decyzja m1142). |

---

## ⬜ Do przegadania (zebrane od Ciebie)

### 1. ✅ ZROBIONE — Twoje dzisiejsze punkty — `rd-today` / `REDESIGN6.TodayPointsWide`
Landscape hero (ring przeżywalności + insighty ↔ oś punktów). Patrz tabela „Zrobione" wyżej.

### 2. ✅ ZROBIONE — Wybór treningu — `rd-selecttraining` / `REDESIGN6.SelectTrainingWide`
Landscape hub: hero najbliższego treningu + layout tygodnia + CTA ↔ siatka wcześniejszych. Model: tydzień = jeden layout, potem rotacja; bez odznak/postępów (decyzja m1142). Patrz tabela „Zrobione".

### 3. ✅ ZROBIONE — Profil (gracza) — `rd-profile` / `REDESIGN6.MyProfileWide`
Karta-bohatera: hero band z avatarem na dysku akcentu, numerem-watermarkiem, role jako kafle uprawnień; konto jako wtórne. Patrz tabela „Zrobione". (Brak danych o trofeach/odznakach — jeśli mają być, dostarcz dane.)

### 4. ✅ ZROBIONE — Profil drużyny — `rd-teamprofile` / `REDESIGN6.TeamProfileWide`
Hero crest band + realny slot uploadu logo (drag-drop / file-picker → podgląd → podmienia crest), plakietka „AKTYWNE · NXL US" (decyzja m1056). Patrz tabela „Zrobione".

### 5. ✅ ZROBIONE — Nowy zawodnik (wizard) — `rd-newplayer` / `REDESIGN7.NewPlayerWizard`
3-krokowy wizard, niezbędne = Imię i nazwisko + drużyna (decyzja m1142). Patrz tabela „Zrobione".

### 6. ✅ ZROBIONE — Nowa drużyna (wizard) — `rd-newteam` / `REDESIGN7.NewTeamWizard`
2-krokowy wizard, niezbędne = nazwa + liga (decyzja m1142). Patrz tabela „Zrobione".

---

## Pytania otwarte (zbiorczo)
- **Trening:** zakres danych (typy, postęp, odznaki) — istnieje czy projektujemy nową funkcję?
- **Logo drużyny:** ✅ DECYZJA (m1247) — upload **produkcyjnie**. CC: realny upload + storage cresta w edytorze drużyny (nie tylko lokalny podgląd w prototypie).
- **Wizard zawodnika/drużyny:** które pola są naprawdę „niezbędne" vs „opcjonalne"? (lista wyżej to moja propozycja — potwierdź)
- **Konfiguracja pola / przeszkody:** patrz pozycja #7 — to największy brak; doprecyzuj zakres.
- **Kolejność:** co budujemy najpierw po przegadaniu?

---

## 8. Scout (landscape) — filtry + zepsute labelki — `ScoutWide` / build CC
**Z review buildu CC** (zrzut m1009). Master-detail: lista meczów ↔ panel scoutingu.
**Braki / bugi:**
- ❌ **Brak filtrów i wyszukiwania na górze listy.** Przy 190 meczach i wielu dywizjach (PRO3v3, D3, SEMI-PRO) nie da się znaleźć meczu do scoutowania. Trzeba: pole szukania (po drużynie) + filtr dywizji (chipsy/segmenty) + status (Zaplanowane/Live/Zakończone). Wzorce już są: `DivTabs`, `UI.SearchField`, search w `CoachTeamListWide`.
- 🐛 **Zepsute labelki i18n w buildzie CC** (do poprawy po stronie CC — brak kluczy):
  - „Matches (undefined)" — `section_matches(n)` dostaje `undefined` zamiast liczby.
  - „tab_more", „settings_title" — nieprzetłumaczone klucze w stopce sidebara.
  - „match_details" — nieprzetłumaczony klucz na przycisku.
- ⚠️ Prawy panel (detal) mocno pusty, gdy nic nie wybrano — rozważyć stan pusty / podsumowanie.

## 9. Biblioteka layoutów / Field library (landscape) — `LayoutsList` / build CC
**Z review buildu CC** (zrzut m1010). „Field library · GLOBAL BASE LAYOUTS", siatka kart 2-kol.
**Braki:**
- ❌ **Brak wersji landscape** — siatka 2-kolumnowa wyśrodkowana z ogromnymi pustymi marginesami (ten sam problem zmarnowanej przestrzeni). Powinno: szersza siatka kart (auto-fill), pełne wykorzystanie szerokości.
- ❌ **Brak filtrów i wyszukiwania** — filtr ligi (PXL / NXL Europe / NXL US — **dynamiczna lista**) + szukanie po nazwie układu/roku.

---

## 10. Viewer layoutu (podgląd pola, read-only) — `FIELD LAYOUT` / build CC (NIETKNIĘTY)
**Z review buildu CC** (zrzuty m1011 — `uploads/pasted-1782306363846-0.png` = overlay OFF, `uploads/pasted-1782306388606-0.png` = overlay ON). Podgląd układu z biblioteki, tylko-do-odczytu.
**Stan:** wg Ciebie „nie ruszony w ogóle" — brak premium-redesignu i landscape.
**Co robi ekran (legenda przełączników, dolny pasek 4 ikon):**
- **Aa = Nazwy** — etykiety bunkrów (Dorito1-3, Dexter, Drago, Dykta, Dog, Hiena, Baza, Zamek, Środek, Hammer, Sparta, Ring, Cobra, Snake1-3, Suka…).
- **½** — niepewne (mirror / pół-pola?). **→ do potwierdzenia co robi.**
- **= = Linie** — linie faz (DISCO 39%, ZEEKER 67%) + linie taktyk.
- **◇ = Strefy** — kreskowane wielokąty stref składu (Orange 1-4, Baby Drago, Baby Suka, Blue 1/2, S2/S4).
- Góra-prawo: pełny ekran, tag ligi (NXL Europe), rok, menu „⋮". Dół: „Enter squad code" (import stref składu kodem).
**Propozycja:** premium + landscape (pole wykorzystuje wysokość, panel sterowania overlayami z boku zamiast dolnego paska), czytelne etykiety, spójne z resztą redesignu.

---

## 11. Panele Lines + Zones (edycja overlayów) — DO PRZEPROJEKTOWANIA
**Z review buildu CC** (zrzuty m1013 — `uploads/pasted-1782306404536-0.png` = Lines, `uploads/pasted-1782306430506-0.png` = Zones). Dolne arkusze otwierane z paska viewera (#10).
**Werdykt:** „zdecydowanie do przeprojektowania".

**Panel LINES — co robi dziś:**
- Linie faz: każda ma **nazwę (edytowalna)**, **suwak pozycji %** (gdzie linia przecina pole), **paletę 7 kolorów**, opis semantyki („Players above/below this line are on … side").
- Domyślne: „Dorito side" (39%, pomarańczowy), „Snake side" (67%, turkus).
- Sekcja **CALLOUT LINES** + „+ New line" — dodawanie własnych linii.
- 🐛 **Problem UX (od Ciebie):** w edycji linii klik w **nazwę** = zmiana nazwy, klik w **kolor** = zmiana koloru — **nieintuicyjne**, brak czytelnych afordancji (co jest klikalne i co zrobi).

**Panel ZONES — co robi dziś:**
- Lista stref: każda = **kropka koloru + nazwa + ołówek (edytuj) + kosz (usuń)**.
- Strefy: S1-S4 (turkus), 5/6/7 (róż) — mapują na kreskowane wielokąty na polu.

**Propozycja (do przegadania):** rozdzielić wyraźnie pola edycji (osobne, opisane kontrolki: Nazwa / Pozycja / Kolor — nie „klik w element = ukryta akcja"); spójna lista z jawnymi przyciskami edycji; landscape = panel boczny zamiast dolnego arkusza, edycja na żywo obok pola.
**⚠️ Do potwierdzenia z CC:** pełen zakres funkcji (np. czy linie callout mają inne opcje, czy strefy mają przypisanie do składu/koloru drużyny, co dokładnie robi „½" z #10).

---

## 12. Tworzenie taktyki — DO PRZEPROJEKTOWANIA (niespójne)
**Z review buildu CC** (zrzut m1017 — `uploads/pasted-1782306567769-0.png`). Ekran „test / NXL US – MIDATLANTIC OPEN".
**Werdykt:** „bardzo nieużyteczny, niespójny. Miało być to samo co przy scoutingu."
**Co jest dziś:** stepper faz (Pre-breakout · Breakout · Settle · Mid · Endgame), gołe pole z licznikiem „0/5" (gracze), dół = ikona ołówka + „Save tactic". Brak czytelnego sposobu stawiania graczy / rysowania, wizualnie odstaje od reszty.
**Propozycja:** zunifikować z wokabularzem scoutingu — **oś faz jak w `OpponentAnalysisWide` / `RdLiveFieldCard`** (fazy jako keyframe'y na osi punktu), **panel Warstwy** (pozycje / strzały / plan), narzędzie **Rysuj** spięte z przeszkodami (#7). Ta sama paleta, te same kontrolki, ten sam layout co analiza przeciwnika.
**Powiązania:** #7 (przeszkody jako kotwice), #10/#11 (overlaye). Cały „blok pole" do zrobienia razem.

---

## 7. Konfiguracja pola + przeszkody + rysowanie taktyk — `editor` (DUŻY BRAK)

**Co realnie JEST w prototypie** (edytor układu = `REDESIGN8.LayoutEditorPremium`, menu „⬩ Layout editor (tactics)", trasa `editor`; tablet „▭ Tablet — Edytor layoutu"; wejście w apce: drawer → Editor → lista układów → otwórz):
- ✅ **Lista taktyk** (`TacticsPanel`) — karty z miniaturami, widoczność, autor, liczba graczy.
- ✅ **Kalibracja baz** — przeciąganie znaczników A/B na punkty startowe.
- ✅ **Tryb Rysuj** istnieje osobno (`ACCURACY_UI.DrawMode`, trasa `draw` / „▭ Tablet — Tryb Rysuj").

**Czego BRAKUJE (potwierdzony gap):**
- ❌ **Konfiguracja pola = stawianie / nazywanie / edycja przeszkód.** Pole w edytorze to **statyczne tło-zdjęcie** (`assets/layout-uk.jpg`) — nie da się dodać bunkra, nazwać go, przesunąć, obrócić, usunąć ani zbudować układu od zera.
- ❌ **Rysowanie NOWEJ taktyki z poziomu edytora** — przycisk „nowa taktyka" w edytorze jest na razie zaślepką (`onNewTactic` = no-op); rysowanie żyje tylko w oddzielnym `DrawMode`.

**Propozycja (do przegadania — OPEN, największy element):**
- **Tryb „Pole / Przeszkody":** paleta typów bunkrów (Snake, Dorito, Center, Can, Tombstone…) → przeciągasz na siatkę pola; każdy element: nazwa, pozycja, rozmiar, obrót; zapis jako układ. Symetria L/P (xball) jako opcja auto-lustra.
- **Spięcie z taktykami:** narysowane przeszkody stają się „kotwicami" do rysowania linii taktyk (zamiast tła-zdjęcia).
- **Pytania:** czy układy mają powstawać od zera w apce, czy raczej z importu zdjęcia + ręczne oznaczanie przeszkód na nim? Jaka lista typów przeszkód jest oficjalna?

**⚠️ KOREKTA (od Ciebie, m1014):** ekran **konfiguracji przeszkody ISTNIEJE w buildzie CC** — ale jest „zgubiony": prawdopodobnie **nie da się go otworzyć, gdy pole jest już zkalibrowane** (dostęp tylko przed kalibracją). Czyli to nie tyle brak funkcji, co **bug dostępu/nawigacji** — trzeba móc wrócić do edycji przeszkód po kalibracji. → User dośle zrzut, gdy go znajdzie; potwierdzić z CC ścieżkę dostępu.
