# Feedback Extract — Ranger Scouci (Messenger)

- **Source:** Group chat "Ranger Scouci"
- **Okres:** ~10-11 kwietnia 2026 (pierwszy test bojowy PbScoutPro na turnieju)
- **Próbka:** ~20 wiadomości, 5 unikalnych osób
- **Analyzed:** 2026-04-16

---

## 🎯 Najważniejsze wnioski (TL;DR)

1. **To był pierwszy raz kiedy ekipa SERIO używała apki na turnieju.** Nie żaden "prosty feedback" — to jest retrospektywa z prawdziwego testu bojowego. Każde zdanie tu ma wagę 10× więcej niż hipotetyczne pytanie do Sławka.

2. **Dwa krytyczne bugi zidentyfikowane:** concurrent editing nie działało ("jeden tworzy, drugi czeka"), i side swap bug ("apka miesza stronami") — ten drugi to jest potencjalnie data corruption, nie UX issue.

3. **Fundamentalny problem UX wypłynął od Andrzeja:** "każdy wprowadza dane jako jedna osoba" — nie ma user accounts/attribution. To blokuje 3 rzeczy naraz: eliminację błędów, scout ranking (który obiecujesz), dane per-user do motivation system.

4. **Jacek sam zauważa:** "pomyślimy ze Sławkiem nad nagrodą dla najbardziej skrupulatnych scoutów" — scout motivation system jest już na radarze, nie tylko teoria z VISION.md.

5. **Poziom engagementu ekipy: WYSOKI.** Ludzie pisali, testowali, zgłaszali konkretne problemy, byli zaangażowani ("Bede na miejscu", "moze sie zdzwonic"). To nie jest problem motywacji — to jest problem narzędzi. Feedback o leniwych scoutach z poprzedniej rozmowy może być bardziej o konkretnych osobach niż o całej ekipie.

---

## 🔴 Pain points (problemy zgłoszone)

### PP1: Concurrent editing bug — prawie działa, ale nie

> **Tomasz (Sob 22:29):** "Ten coaching jednoczesny chyba zaczął działać. Jeden tworzy punkt, a drugi musi poczekać aż pojawi się live i może edytować. Sprawdziłem na poprzednim dwumeczu to jakoś poszlo"
>
> **Tomasz (później):** "Dobra jednak mi się nie aktualizuje żeby mógł edytować live. Ajsik pisał żeby zostawić i będzie działać na miejscu"

**Co to znaczy:** Feature dual-coach concurrent scouting (który jest w recent_updates jako już zaimplementowany) nie działa niezawodnie. Działa "czasem". Na turnieju = blocker.

**Priorytet:** P0. To jest feature który sprzedałeś ekipie jako kluczowy.

**Do akcji:** Zweryfikować w kodzie czy point-level dot notation writes faktycznie działają concurrent. Możliwe race condition w Firestore listener setup. Feature flag do wyłączenia gdy wybucha.

### PP2: Side swap bug — potencjalna korupcja danych

> **Jacek (Nie 19:20):** "na pewno był bug systemowy który zamienia w losowym momencie strony podczas punktu"
>
> **Paweł:** "Te bledy moge wynikac z blednie wpisanych danych lub apka miesza stronami"

**Co to znaczy:** Apka w trakcie punktu zamienia home/away strony. Jeśli to się dzieje post-save → dane w Firestore są corrupted — to co było "Drużyna A strzeliła" jest teraz "Drużyna B strzeliła". To niszczy bazę analityczną.

**Priorytet:** P0. Ważniejsze niż PP1 bo tamto irytuje użytkownika, to niszczy dane historyczne.

**Do akcji:**
- **Natychmiast:** znajdź root cause (prawdopodobnie w MatchPage state management albo side picker)
- **Krótkoterminowo:** audit script który wykrywa podejrzane point data (np. stats home i away które się nagle flipują)
- **Długoterminowo:** point-level immutability — raz zapisany punkt ma frozen side assignment

Bez tego predictive engine będzie się trenował na śmieciach.

### PP3: Brak user accounts / attribution

> **Andrzej (Nie):** "ustalenie profili użytkowników. Aktualnie każdy wprowadza dane jako jedna osoba może warto byłoby zrobić tak aby każdy miał swój login hasło. Może to też wykluczy błędy przy dodawaniu danych w tzw live i nie będzie nadpisywania wprowadzonych informacji"

**Co to znaczy:** Nie wiadomo kto co wprowadził. Nie można:
- Zidentyfikować kto zrobił błąd (debugging)
- Zbudować scout ranking (o którym Jacek pisze że będzie)
- Robić attribution do scouta przy insights ("Twoje dane dały X insight")
- Wykrywać patterny — kto dokładnie scoutuje gorzej (i czy to jest patter)

**Priorytet:** P1 (nie P0 bo nie psuje aktualnie), ale blokuje wiele innych rzeczy na roadmapie.

**Ważna obserwacja:** Andrzej sam połączył kropki — "może to też wykluczy błędy przy dodawaniu danych w tzw live i nie będzie nadpisywania". Widzi że attribution + concurrent editing są powiązane. Andrzej myśli produktowo, nie tylko technicznie.

### PP4: Rozbiegi się nie zgadzały — błąd danych

> **Don:** "Moj jest taki ze rozbiegi nie zawsze sie zgadzaly. Np. obejrzalem mecz Ala, potem siadelm do appki a tam inne rozbiegi z meczu, ktory wlasnie skonczylem ogladac. Czyli widocznie user appki moze sie pomylic wprowadzając dane."

**Co to znaczy:** Don weryfikował dane scoutów porównując z meczem który obejrzał — i się nie zgadzały.

Dwa możliwe wnioski:
1. Scout się pomylił (human error)
2. Side swap bug (PP2) spowodował że rozbiegi są teraz w złej kolejności

Don zakłada (1), ale w świetle PP2 — możliwe że to (2) i scout był OK, apka to zepsuła.

**Do akcji:**
- Test scenario: scout robi rozbieg, save, reopen — czy rozbieg dalej jest w tej samej pozycji?
- Data integrity check po rozwiązaniu PP2
- To jest klasyczny przykład dlaczego video CV jest ważny — daje Ci ground truth do weryfikacji scout data.

### PP5: "Za dużo danych" na heatmapie

> **Jacek (Sob 22:29):** "Idzie maly fix na wyłączenie z heatmapy danych przeciwnika- za dużo danych"

**Co to znaczy:** Heatmapa pokazywała wszystkie dane (nasze + przeciwnika), co było mylące.

**Priorytet:** P2 (Jacek już fiksował). Ale warto zaznaczyć wzorzec: pokazujemy wszystko co mamy, a powinniśmy pokazywać to co jest potrzebne w kontekście. Patrz też §7 Coach Home Screen w VISION.md.

---

## 💡 Feature requests (czego chcą)

### FR1: Login per scout (od Andrzej, implicitly od wszystkich)

Zobacz PP3 — to jest też feature request, nie tylko pain point.

### FR2: Scout ranking + nagrody (od Jacek, emergent)

> **Jacek (Nie):** "i będzie ranking scoutów - pomyślimy ze Sławkiem nad jakąś nagrodą dla najbardziej skrupulatnych"

**Co to znaczy:** Jacek sam zauważa potrzebę scout motivation system. To potwierdza hypothesis z VISION.md.

**Do akcji:** Zaplanować — ale dopiero po login system (FR1 blokuje). Kolejność: user accounts → attribution → ranking → rewards.

---

## 🐛 Bugi techniczne (skategoryzowane)

| # | Bug | Severity | Component |
|---|-----|----------|-----------|
| B1 | Concurrent editing nie sync'uje live | P0 | useFirestore, MatchPage dual-coach |
| B2 | Side swap podczas punktu | P0 | MatchPage state / side picker |
| B3 | Heatmapa zbyt gęsta (data overload) | P2 | HeatmapCanvas filter logic |
| B4 | Rozbiegi niespójne (może B2) | P1 | Unknown - wymaga investigation |

---

## 🎯 Moments of delight (czego NIE było w feedbacku)

**Uwaga:** W 20 wiadomościach nie ma żadnego pozytywnego momentu typu "wow, apka pokazała mi X i było mega pomocne". Nikt nie napisał "zobaczyłem insight i zagraliśmy point na tej podstawie".

Dwa możliwe wnioski:
1. Nie było takiego momentu (value proposition nie zadziałał)
2. Polacy są skąpi w pozytywnym feedbacku, piszą tylko jak coś nie działa

**Hypothesis:** Mix obu. Ale warto to monitorować w kolejnych turniejach. Delight moments są sygnałem że projekt dostarcza wartość. Jeśli za 3 turnieje nadal ich nie ma — red flag dla całego projektu.

**Do akcji:** Na następnym turnieju, Jacek explicitly pyta w grupie: "Był moment że apka pokazała coś co zmieniło decyzję taktyczną?"

---

## 🧠 Coach mental models — jak myślą

### Język którego używają

- **"rozbieg"** — to jest polski termin na "breakout", używany naturalnie
- **"dwumecz"** — dwa mecze z rzędu, sesja testowa
- **"scouting jakiegoś meczu"** — "obejrzeć scouting" = obejrzeć zescoutowany mecz, scouting to noun dla nich, nie verb
- **"rozbiegi sie nie zgadzały"** — "zgadzać się" = consistency check vs rzeczywistością

### Obserwacje meta

- **Don weryfikuje dane.** To jest rzadkie i cenne — scout który sprawdza czy to co ma w apce zgadza się z mecze. Don ma scout-analyst mindset, warto go pielęgnować jako power usera.
- **Tomasz jest techniczny** — pisze o "Ajsik" (developer?), testuje concurrent, rozumie że sync listener ma znaczenie. Potencjalny scout-developer partner.
- **Paweł myśli praktycznie** — od razu łączy "może to błędy wpisane" vs "może apka miesza". Dobry diagnostyk.
- **Andrzej myśli produktowo** — widzi connection między login a correctness data.

**Konkluzja:** Ekipa ma silniejsze skille niż myślisz. Masz tam mini-QA team (Don), mini-dev (Tomasz), mini-PM (Andrzej). Angażuj ich strukturalnie, nie tylko ad-hoc.

---

## 📊 Metadata

- **Unique contributors:** 5 (Jacek, Tomasz, Paweł, Don, Andrzej)
- **Najbardziej wokalni:** Jacek (host), Tomasz (techniczny feedback), Andrzej (strategic feedback)
- **Jakość feedbacku:** Wysoka — konkretne przykłady, nie generyczne
- **Sentiment:** Neutralny z lekko krytycznym — problem-focused, ale konstruktywny
- **Głównie o:** concurrent editing (4x), side swap bug (3x), user accounts (2x), rozbiegi (2x)
- **Brak wzmianek o:** heatmapie value, insights, coach tab, wyniku meczu, wygranej dzięki apce — pytanie otwarte: co Ranger wygrywa dzięki PbScoutPro?

---

## 🎬 TOP 5 rekomendacji — co robić

### 1. FIX CRITICAL BUGS FIRST (ten tydzień, przed kolejnym granikiem)

B2 (side swap) i B1 (concurrent editing) to P0. Jacek w messengerze pisze "to puścimy z Tymkiem updejy przed kolejnym granikiem" — utrzymać ten momentum.

**Konkretne akcje:**
- [ ] Dedicated debugging session dla B2 (data integrity first)
- [ ] Reproduction steps dla B1 (może test Playwright który robi 2 równolegle?)
- [ ] Feature flag dla dual-coach mode — jeśli nie działa, wyłączamy żeby nie spalić ekipy

### 2. USER ACCOUNTS / AUTH (tydzień 2)

PP3 blokuje za dużo rzeczy. Pozycja Firebase Auth z anonymous → email/password lub Google OAuth. 1-2 dni roboty.

Szczególne wymaganie: Don, Tomasz, Paweł, Andrzej etc. mają mieć łatwy login. Nie komplikować — magic link email albo Google OAuth (oni wszyscy mają gmail).

Feature flag: wdrożyć za flagą, najpierw Jacek + Tymek testują, potem reszta.

### 3. DATA INTEGRITY AUDIT (tydzień 2-3)

Jeśli B2 (side swap) był niewykryty jakiś czas, istniejące dane mogą być skorumpowane. Należy:
- [ ] Script który skanuje historical points pod kątem anomalii (nagłe flipy stron)
- [ ] Mark data as `confidence: low` jeśli wykryjemy tę sesję jako corrupted
- [ ] Future prevention: immutable point snapshots po zapisie

Bez tego predictive engine będzie się trenował na śmieciach.

### 4. RETROSPEKTYWA V2 (przed następnym turniejem)

Jacek zrobił świetną rzecz aktywnie prosząc o feedback ("poświęćcie 5 min i napiszcie swój feedback"). To powinno być rytuał po każdym turnieju, nie jednorazowy akt.

**Propozycja:** `docs/TOURNAMENT_RETRO_TEMPLATE.md`:
```markdown
# Retrospective - [Nazwa turnieju] - [Data]

## Co się działo w apce?
- Ile meczów zescoutowano: X
- Ile punktów: Y
- Unique scouts active: Z
- Crash reports: N

## Feedback ekipy
- [cytat] — [kto]
- ...

## Bugs wykryte
- [opis] — severity — assigned to

## Wins (co zadziałało)
- ...

## Action items
- [ ] ...

## Delight check
- Czy ktoś miał moment "apka pokazała X i zadecydowałem Y"? Jakiego typu?
```

Po każdym turnieju Jacek spędza 30 min wypełniając. Po 10 turniejach masz empirical history projektu.

### 5. POWER USERS PROGRAM (miesiąc 1-2)

Don, Tomasz, Andrzej to są Twoi best users. Używaj ich strukturalnie:
- **Don** → QA/validation — niech sprawdza data integrity systematically
- **Tomasz** → beta tester — daje mu feature flag access na nowe rzeczy pierwszy
- **Andrzej** → product sparring partner — 15 min rozmowa co 2 tyg, co widzi z boku

To jest Twój wewnętrzny product team. Za darmo. Wykorzystaj.

---

## 🎯 Sygnały do VISION.md

Te wnioski z messengera zmieniają lub potwierdzają VISION.md:

### POTWIERDZAJĄ:
- ✅ Scout motivation jako priorytet — Jacek sam o tym napisał w messengerze
- ✅ Sławek nie jest jedynym coachem — jest cała ekipa która daje feedback, nie tylko on
- ✅ Data quality jest issue — Don już weryfikuje, PP4 pokazuje wprost

### ZMIENIAJĄ / UZUPEŁNIAJĄ:
- 🔄 Persona "Scouci" jest bardziej zniuansowana — masz Dona (analytical), Tomasza (technical), Andrzeja (product-minded). To nie jest homogeniczna grupa leniwych/motywowanych.
- 🔄 Problem "Sławek nie widzi wartości" może być częścią większego wzorca — nikt w feedbacku nie wspomina pozytywnych doświadczeń. Może to nie tylko Sławek?
- 🔄 Side swap bug to data corruption risk — to zmienia priorytety. Najpierw zabezpieczamy dane, potem budujemy predictive engine na nich.

### NOWE:
- 🆕 "Dwumecz" jako unit testowy — zespół już ma naturalny rytm (dwumecz = sesja). Wykorzystać jako natural testing unit w workflow.
- 🆕 Concurrent editing jest kluczowy sprzedażowo — Jacek sprzedał ten ficzer ekipie, oni go używają, musi działać.
- 🆕 Ekipa jest gotowa do płacenia uwagą, nie pieniędzmi — inwestują czas, testują, piszą feedback. To cenniejsze niż $.

---

## 🗣️ Voice of User — dosłowne cytaty

Do użycia w CC briefs. Prawdziwy głos użytkowników.

**O concurrent editing:**
> "Ten coaching jednoczesny chyba zaczął działać. Jeden tworzy punkt, a drugi musi poczekać aż pojawi się live i może edytować."  — Tomasz

**O data accuracy:**
> "Moj jest taki ze rozbiegi nie zawsze sie zgadzaly. Np. obejrzalem mecz Ala, potem siadelm do appki a tam inne rozbiegi z meczu, ktory wlasnie skonczylem ogladac."  — Don

**O user accounts:**
> "Aktualnie każdy wprowadza dane jako jedna osoba może warto byłoby zrobić tak aby każdy miał swój login hasło. Może to też wykluczy błędy przy dodawaniu danych w tzw live i nie będzie nadpisywania wprowadzonych informacji"  — Andrzej

**O side swap:**
> "na pewno był bug systemowy który zamienia w losowym momencie strony podczas punktu"  — Jacek (diagnoza)

**O engagement:**
> "poświęćcie 5 min i napiszcie swój feedback po weekendzie"  — Jacek (active listening)

---

## Historia zmian

- **2026-04-16:** Pierwsza ekstrakcja z messengera Ranger Scouci. ~20 wiadomości. Zidentyfikowano 2 bugi P0, 1 fundamentalny gap UX (accounts), silniejszy niż oczekiwano engagement ekipy.
