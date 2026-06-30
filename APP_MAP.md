# APP_MAP.md — ground-truth istniejącej aplikacji (Reads / PbScoutPro)

> **Właściciel: CC.** To jest prawda o tym, co REALNIE istnieje w kodzie.
> **CD ma obowiązek przeczytać ten plik PRZED projektowaniem.** Projektuje się
> przeciwko realnemu katalogowi komponentów, danych i ekranów — nie z wyobraźni.
> Generowane automatycznie tam, gdzie się da (patrz §9). Nie utrzymuj ręcznie tego,
> co można wygenerować.

## §1. Route'y / ekrany (co realnie istnieje)
| Route | Ekran | Co robi | Stan |
|---|---|---|---|
| `#/tournament/:id/match/:mid?scout=…&mode=new` | Match scout / Live Point Tracker | logowanie punktów na żywo, faza Breakout/Settle/Mid-game | live |
| _… CC uzupełnia z routera …_ | | | live / stub / flagged |

## §2. Katalog komponentów `ui.jsx` (AUTO-GEN — patrz §9)
| Komponent | Propsy / warianty | Uwagi |
|---|---|---|
| Btn | _… z kodu …_ | inline JSX styles, tokeny z theme.js |
| Card | | |
| Checkbox | | |
| Modal / ConfirmModal | | |
| ActionSheet / MoreBtn | | |
| PageHeader | | |
| Input | | |
| EmptyState | | |
| LeagueBadge / YearBadge | | |
> Reguła dla CD: **używaj tych komponentów**. Nowy komponent = tag `new` + uzasadnienie, nie domyślnie.

## §3. Model danych / data-contract (realny kształt z Firestore)
Encje i realne pola (CC wypełnia z kodu/typów). ZERO wymyślonych pól w projektach CD.
- **scout-point**: _… realne pola: breakout, result, time, elims (QuickLog) …_
- **tournament**: _…_
- **team**: parent „Ranger Warsaw" → child (Ring/Rage/Rebel/Rush), liga+dywizja
- **layout**: `layoutId` jako jednostka analityczna
- **tactic**: `/workspaces/{slug}/layouts/{lid}/tactics/{tid}`
- helpery: `resolveField()` / fallback — CC dopisuje sygnatury

## §4. Tokeny designu (kanon: `theme.js`)
Kolory (bg `#0a0e17`, surface `#111827`, amber `#f59e0b`), FONT_SIZE, RADIUS, SPACE.
CD projektuje wyłącznie na tych tokenach. Nowy token = tag `new` + uzasadnienie.

## §5. Feature flags
| Flag | Co włącza | Stan |
|---|---|---|
| _… CC uzupełnia …_ | | on / off / partial |

## §6. Zrzuty bieżących ekranów (kotwica rzeczywistości)
`/screenshots/<route-slug>@{390,834,1280}.png` — output render-harness, commit per sesja.
„Before" dla CD to ZAWSZE realny zrzut stąd, nie wyobrażenie.

---

## §7. Konwencja tagów (każdy element projektu CD)
- `exists` — jest w kodzie, CD tylko restyling. Tanie, bezpieczne, shipuj.
- `extends` — istnieje, CD dodaje wariant/stan. Mały build.
- `new` — nie istnieje. Wymaga scope'u + decyzji Jacka (build/defer/drop).

## §8. Reality-pass (bramka CC przed buildem)
Dla każdego briefu z `/briefs/`, CC w kilka minut:
1. adnotuje każdy punkt: exists / extends / new,
2. flaguje fikcję i konflikt z realnym kodem,
3. dla `new`: feasibility techniczna (koszt, kolizje, nowa kolekcja itd.).
Niuans: `new` ≠ śmieci. Rozdziel restyling-realnego (ship) od net-new (Jacek gate'uje).
Dopiero zaadnotowany brief idzie do buildu.

## §9. Jak utrzymać aktualność (anty-dryf)
CC pisze generator (Node), odpalany w render-harness / CI:
- parsuje router → §1,
- parsuje eksporty + propsy z `ui.jsx` → §2,
- dumpuje typy/schemat → §3,
- czyta rejestr flag → §5,
- render-harness produkuje §6.
Cel: §2/§3/§5/§6 maszynowo, świeże co sesję. Ręcznie tylko opisy w §1 i niuanse §3.

<!-- SEED: sekcje to szablon. CC wypełnia realną treścią z kodu przy pierwszym commicie
     i od razu stawia generator z §9, żeby plik się nie zestarzał. -->
