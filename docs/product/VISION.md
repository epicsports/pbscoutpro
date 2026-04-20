# PbScoutPro — Vision

> **Ten dokument jest North Star.**
> Czyta się go za każdym razem przed decyzją o kierunku.
> Wszystkie inne dokumenty opisują **jak** — ten opisuje **po co**.

- **Ostatnia aktualizacja:** 2026-04-17
- **Autor:** Jacek Parczewski
- **Status:** Living document

---

## 0. Stan na dziś — pilny kontekst

**Kluczowa data: NXL za 4 tygodnie (~15 maja 2026).**

Między teraz a NXL:
- Jeden turniej testowy (~2-3 tyg) — ostatni test bojowy przed NXL
- Treningi na layoucie
- Sparingi z innymi drużynami
- Trening ekipy scoutów w użyciu apki

**Wszystkie decyzje na 4 tyg są filtrowane pytaniem: "Czy to pomaga Rangerowi wygrać NXL 15 maja?" Jeśli nie — backlog.**

---

## 1. Prawdziwy cel (długoterminowy)

PbScoutPro to **predictive tactics engine** dla Ranger Warsaw, nie scouting app.

**Cel ostateczny:**
> *"Ta drużyna zagra teraz tak — zagraj to, a nikogo Ci nie trafią, rozwalisz ich w 30 sekund."*

To długa droga, 6-12 miesięcy minimum.

**Cel 4-tygodniowy (do NXL):**
Sławek (lub inny coach) w dniu NXL, między punktami (60-90s), otwiera apkę i widzi **jedną rzecz** która pomaga podjąć decyzję o następnym punkcie. Tylko tyle. Tylko aż tyle.

## 2. Strategiczne cele (w kolejności)

1. **Ranger wygrywa w NXL 15 maja** — jedyny KPI do 15 maja
2. **Apka stabilna pod presją** — żaden crash na NXL, żadna utrata danych
3. **Ekipa scoutów wie jak używać** — każdy ma swoje obowiązki, trening 15 min przed NXL
4. *(Post-NXL)* Nauka AI, predictive engine, komercjalizacja

**Punkt 1 dominuje.**

## 3. Budżet i ograniczenia

- **Pieniądze:** 0 PLN. Open-source, free tier, istniejące plany.
- **Claude MAX:** współfinansowany przez pracodawcę (SFMC Danone).
- **Zespół:** Jacek + zaangażowana ekipa (mocniejsza niż wcześniej sądzono).
- **Czas Jacka:** ~10h/tydzień na apkę.

## 4. Persony użytkowników

### Coaching team — nie tylko Sławek

**Ważna korekta v1:** To wielo-coachowy zespół:

- **Sławek** — główny coach, non-tech. Ogląda filmy, nie heatmapy. Cel: jeden wyraźny insight per sytuację.
- **Don** — coach z analytical mindset. Weryfikuje dane. Natural power user, użyć jako QA/validator.
- **Felix** — coach. Pytał o przegląd scoutingu meczów. Użytkownik danych.
- **Andrzej** — gracz + coach. Myśli produktowo. Partner do sparringu produktowego.

**Implikacja dla UI:** Coach Home Screen = minimalny default dla Sławka (1 insight), progressive disclosure dla Dona/Felixa którzy chcą głębiej.

### Scouci — mieszana ekipa

Zespół jest zaangażowany. Wszyscy testowali, pisali feedback po turnieju. Problem nie jest "motywacja na poziomie zespołu" — to indywidualne różnice.

- **Tymek** — mega user, skrupulatny. iPhone tester. Natural beta tester.
- **Paweł (Ice)** — okazyjny scout, ale jak jest — myśli. Dobry diagnostyk bugów.
- **Don** — scoutuje + validuje. Rzadka kombinacja.
- **Tomasz** — pomaga sprzed komputera. Jakość pracy ocenia Jacek jako niską — używać tam gdzie entuzjazm > precyzja.
- **Inni** — okazyjni scouci z drużyny.

**Motywacja — strategia:**
- Widzialność pracy — "te dane dały ten insight"
- Feedback jest słyszany — rytuał retrospektywy po turnieju (już robi Jacek)
- Jasna rola per osoba — nie "wszyscy robią wszystko"
- Pre-NXL: zero gamifikacji. Focus na usable tool. Scout ranking + rewards = post-NXL.

### Jacek — Dev + Gracz + Coach fallback

Kod, scouting gdy trzeba, testowanie, decyzje produktowe. Workflow: ship fast, iteracja na prodzie, feature flags dla bezpieczeństwa.

### Ranger (drużyna)

Nie używa apki bezpośrednio. Wygrane/przegrane to prawdziwy KPI.

## 5. Strategia trzech źródeł danych

**Pre-NXL: TYLKO źródło 1. Źródła 2 i 3 = post-NXL.**

### Źródło 1: Scout App (priorytet do NXL)
- Pozycje, strzały, eliminacje, outcome punktu
- Dual-coach concurrent editing
- Pre-NXL priorytet: stabilność, zero korupcji danych, dual-coach niezawodny.

### Źródło 2: Video CV (post-NXL, weekend project od czerwca)
- Bunker keypoint calibration
- Player detection (YOLO)
- Position tracking (bez identyfikacji kto to jest)
- Breakout map automatyczna
- Elim classifier z behawioru (gracz kierujący się do pitu = eliminated) — kluczowa innowacja Jacka

### Źródło 3: Coach Notes (post-NXL)
- Taktyczne obserwacje jakościowe.

## 6. Lessons learned z pierwszego testu bojowego (turniej 10-11 kwietnia)

Ze źródła: `docs/product/FEEDBACK_EXTRACT.md` (analiza messengera Ranger Scouci).

### Co zadziałało
- Ekipa zaangażowana — wszyscy pisali feedback, testowali, zgłaszali bugi
- Jacek aktywnie prosił o feedback — rytuał do zachowania
- Różne osoby zauważyły różne rzeczy — mamy implicit QA team

### Co się zepsuło (P0 bugs)
- Concurrent editing — działał czasem, nie zawsze
- Side swap — apka zamieniała strony podczas punktu (potencjalna korupcja danych)
- Rozbiegi się nie zgadzały — Don weryfikował vs mecz, nie było match
- Brak user accounts — nie wiadomo kto co wprowadził

### Co zrobione od niedzieli (deploy log)
- Dual-coach training model (2055b31+)
- Zone picker z kolorami składu
- Add match button prominent
- Nav paddingBottom fixy
- Wiele rzeczy inspirowanych feedbackiem

### Co NIE zaadresowane — decyzje pre-NXL
- User accounts — odsuwamy post-NXL, zbyt duża zmiana na 4 tyg
- Delight moments — krytyczne do zaadresowania (sekcja 7)
- Coach tools dla Sławka — krytyczne do zaadresowania (sekcja 7)

### Niepokojące dane

W 20 wiadomościach ekipy nie ma ANI JEDNEGO pozytywnego momentu. Nikt nie napisał "apka pokazała mi X i było mega pomocne".

Dwa wyjaśnienia:
1. Polacy są skąpi w pozytywach
2. Value proposition nie zadziałał

**Weryfikacja na następnym turnieju:** Jacek explicitly pyta — "Czy był moment że apka pokazała coś co zmieniło decyzję taktyczną?"

## 7. Coach persona deep dive — priority #1 przed NXL

**Największe pytanie projektu: Dlaczego Sławek nie używa insights z apki?**

### Hipotezy (w kolejności prawdopodobieństwa)

**H1:** Heatmapa to wrong format dla coacha w trakcie meczu.
Coach ma 60-90s między punktami, heatmapa wymaga 2-3 min interpretacji.

**H2:** Dane zamiast insightów w języku paintballu.
Apka mówi "pozycja y=0.3, 73%". Coach myśli "D1 sika z Drago w 3/4 punktów". Ten sam fakt, inne ubranie.

**H3:** Brak trust'u w dane.
Side swap bug + rozbiegi się nie zgadzały = ufundowana nieufność. Może heatmapa jest technicznie poprawna po naprawie, ale Sławek pamięta że było źle.

**H4:** Timing — coach patrzy w złym momencie.
Może Sławek patrzy po meczu, nie między punktami. Między punktami wraca do filmów.

### Walidacja — jedyny sposób: rozmowa ze Sławkiem 30 min

**Pytania:**
1. "Jak przygotowujesz taktykę przed meczem? Step-by-step dzień przed turniejem?"
2. "W trakcie meczu, między punktami — co wtedy robisz? Jakich informacji potrzebujesz?"
3. "Co chcesz wiedzieć o przeciwniku czego teraz nie wiesz?"
4. "Kiedy ostatnio podjąłeś taktyczną decyzję która się sprawdziła — co Cię do niej skłoniło?"
5. "Gdyby był asystent taktyczny — człowiek, nie apka — co by Ci mówił, kiedy, jak?"

**To zadanie na TEN tydzień.** Wyniki → `docs/COACH_INTERVIEW.md` → decydują o jedynym feature'e budowanym przed NXL.

## 8. Roadmap do NXL (4 tygodnie)

### Tydzień 1 (~17-24 kwietnia)

**Must-haves:**
- [ ] Dokończenie fixów post-turniejowych (Jacek w trakcie)
- [ ] Feature flags (`src/config/flags.js`) — 30 min
- [ ] Sentry free tier — 30 min
- [ ] Rollback playbook (`docs/ROLLBACK.md`) — 15 min
- [ ] Rozmowa ze Sławkiem (30 min) — krytyczne, decyduje o Tygodniu 2

**Nice-to-have:**
- [ ] Retrospective template (`docs/TOURNAMENT_RETRO_TEMPLATE.md`)

### Tydzień 2 (~25 kwietnia - 1 maja)

Jedna najważniejsza rzecz na podstawie rozmowy ze Sławkiem.

Najbardziej prawdopodobne (zmieni się po rozmowie):
- **Coach QuickView** — single page, między punktami:
  - Top insight o przeciwniku (1 zdanie, w języku paintballu)
  - Rekomendowane breakout lub position adjustment
  - Quick access do "poprzedni punkt — co zadziałało"

**Zasada: nie budować pod założenie, budować pod dane z rozmowy.**

### Tydzień 3 (~2-8 maja) — drugi turniej testowy

- [ ] Turniej jako test bojowy Coach QuickView
- [ ] Strukturalna retrospektywa (template)
- [ ] Bugi z turnieju → fix w tym tygodniu
- [ ] Feature freeze od końca tygodnia

### Tydzień 4 (~9-14 maja) — przygotowanie NXL

**Feature freeze.** Tylko polish i stabilność.

- [ ] Playwright smoke automatyczny przed każdym commitem
- [ ] Training ekipy scoutów (15 min przed NXL)
- [ ] Coach checklist dla Sławka
- [ ] Wszystkie znane bugi fixed lub za feature flag
- [ ] Sentry alerts, rollback sprawdzony

### Po NXL (od ~16 maja)

- User accounts
- Video CV Level 1 PoC (weekend)
- Agentic workflow (Claude PR reviewer)
- Design system legacy cleanup
- Predictive engine research
- Scout ranking + rewards

## 9. Non-goals (do NXL)

- ❌ Video CV — za duży projekt na 4 tyg
- ❌ User accounts — ryzykowna zmiana tuż przed NXL
- ❌ Predictive engine — potrzeba czystych danych
- ❌ Scout gamification — focus na usability
- ❌ Duże UX redesigny — risk > value
- ❌ Agentic workflow — nice to have, nie critical
- ❌ Komercjalizacja / marketing — produkt musi wygrać NXL
- ❌ Wsparcie dla innych formatów — tylko NXL speedball

## 10. Decyzyjny framework (4-tygodniowy)

Przy każdej decyzji:

1. **Pomaga Rangerowi wygrać NXL 15 maja?**
   - Tak → priorytet
   - Nie → post-NXL backlog

2. **Ryzyko destabilizacji akceptowalne?**
   - Mała zmiana za feature flag → OK
   - Duża lub bez flagi → NIE w tyg 4

3. **Można w <1 dzień?**
   - Tak → robimy
   - Nie → rozłożyć lub odłożyć

4. **Zwiększa zaufanie ekipy?**
   - Tak (naprawia znany bug, dodaje brakujący feature) → bonus
   - Neutralne → OK
   - Może obniżyć → feature flag obowiązkowy

## 11. Sygnały że coś idzie źle

- Scouci wycofują się z testowania — feedback loop się psuje
- Turniej v2 ma więcej bugów niż v1 — regresja
- Sławek dalej nie używa apki między punktami — core value failure
- Jacek spędza >5h na jednym buggu — czas na feature flag i odłożenie
- Apka pada w dniu turnieju — incident
- >1 P0 bug na turnieju v2 — framework testowania nie działa

---

## Historia zmian

- **2026-04-16 (v1):** Pierwszy draft — prawdziwy cel, 3 źródła danych, CV roadmap.
- **2026-04-17 (v2):** Pełna rewizja po:
  - Messenger feedback z pierwszego turnieju (docs/product/FEEDBACK_EXTRACT.md)
  - Info że wiele bugów adresowanych od niedzieli
  - Kontekst: NXL za 4 tygodnie
  - Korekta persony: wielu coachów, zespół mocniejszy niż myślano
  - Przeformatowanie roadmap na 4-tygodniowy focus
  - CV i predictive engine odsunięte post-NXL
  - Rozmowa ze Sławkiem = priorytet tygodnia 1
