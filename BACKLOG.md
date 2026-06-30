# BACKLOG.md — jedyne źródło prawdy (Reads / PbScoutPro)

> **Zasada nadrzędna:** to jest JEDYNY backlog. `_PROJECT_STATE.md`, `NEXT_TASKS.md`,
> `_CC_BRIEF_night_batch.md`, `_LANDSCAPE_BACKLOG.md`, `DEPLOY_LOG.md` → `/_archive/`,
> każdy z jedną linią `→ patrz BACKLOG.md`. Nikt nie tworzy drugiej tabeli stanu.
>
> **Własność kolumn (sztywna):**
> - `Design` — właściciel: **Design**. Intencja/prototyp gotowy.
> - `Build` — właściciel: **CC**. Stan z gita/deployu, nie z notatek.
> - `Verified` — właściciel: **CC**. Link do zrzutów @390/834/1280. Bez pary zrzutów = NIE 🟢.
> - `Notes` — kto chce, decyzje + linki do briefu w `/briefs/`.

## Legenda statusów (wspólna — koniec z różnymi emoji u każdego agenta)
- ⚪ backlog (nieruszone)
- 🔵 designed — Design skończył intencję/prototyp, czeka na build
- 🟠 in-build — CC pracuje
- 🟢 live+verified — na produkcji **i** zrzuty @390/834/1280 dołączone
- 🔴 blocked / potrzebne widełko od Jacka

---

## EPIC: field-cluster (klaster pola)

| Screen | Design | Build | Verified | Notes |
|---|---|---|---|---|
| Match scout / Live Point Tracker | ⚪ | ⚪ | — | snapshot 2026-06-30, faza Breakout; i18n mismatch: „Rysuj" PL vs „Save point/Breakout/Settle/Mid-game" EN |
| Tactic page (rysowanie po layoutach) | ⚪ | ⚪ | — | flagi z handoffu: redundancja „Gotowe/Save", i18n; loupe LEFT (praworęczny) |
| Layout detail page | ⚪ | ⚪ | — | — |

## EPIC: team-consolidation (konsolidacja drużyn)

| Screen | Design | Build | Verified | Notes |
|---|---|---|---|---|
| Home page | ⚪ | ⚪ | — | — |
| Team detail page | ⚪ | ⚪ | — | model: Ranger Warsaw → Ring/Rage/Rebel/Rush |
| Confirm modals | ⚪ | ⚪ | — | ConfirmModal z ui.jsx |
| Empty states | ⚪ | ⚪ | — | EmptyState z ui.jsx |
| Input / select fields | ⚪ | ⚪ | — | Input z ui.jsx, tokeny z theme.js |

## EPIC: bugfix-red (twarde błędy — priorytet)

| Screen | Design | Build | Verified | Notes |
|---|---|---|---|---|
| Tournament team picker | n/d | 🔴 | — | child teams nie pojawiają się w pickerze |
| Add-to-tournament | n/d | 🔴 | — | division nie jest egzekwowane przy dodawaniu |
| Profile-claim (Safari) | n/d | 🔴 | — | `ReferenceError: Can't find variable: update` — scope w zminifikowanym bundle |

---

### Rytuał (na każdy epik, nie na ekran)
1. Design: bundluje ekrany epika → jeden komplet `brief + prototyp` do `/briefs/<epic>.md`. Status → 🔵.
2. CC: bierze cały epik wsadowo (noc), buduje, **render-verify @390/834/1280 PRZED shipem**, commit zrzutów. Status → 🟠 → 🟢. Bez pary zrzutów zostaje 🟠.
3. Jacek: ogląda arkusz par (prototyp obok zrzutu) raz na epik → „GO" albo flaga. Koniec.

### Twarde reguły
- CC shipuje 🟠→🟢 **samodzielnie**, gdy render-proof przechodzi. Eskaluje do Jacka tylko 🔴 lub realne widełko, w ≤3 liniach.
- Wszystko, czego potrzebuje drugi agent, ląduje w repo jako plik. Nigdy przez Jacka.
- Status raportujemy jako tabelę powyżej. Zero eseju kończącego się pytaniem.

---

## ✅ ZRECONCILOWANE z gitem (CC, 2026-06-30) — to już 🟢 (na prodzie), NIE budować
Render-confirm nocy (0 rozjazdów) + reality-pass 2 agentów potwierdziły, że **prawie cała powierzchnia jest shipnięta**:
- **Scout point** (rail 330px · matchup flip-card `SideSwapStrip` · oś faz + czasy · roster V3 · markery team-color + watermark-fallback · stożki team-color · animowane tory · VS intro · laptop→landscape · usunięty portret-FS · base-side glass-pille) — `MatchPage.jsx` + `components/match/*` + `field/*`.
- **Team management** = `TeamManage`/`TeamDetailPage` (hero crest · nazwa/extID/kraj/ligi · roster+HERO · siostry · audyt · retire · create `/team/new` · usunięty `TeamFormModal`).
- **Listy/dashboardy**: Today's points · Select training · My profile · Scout ranking · Point-logging (kiosk) · CSV · Workspace switcher · Coach list+DivTabs · Player stats wide · App shell (phone+wide) · Layout editor/library.
- **Avatary**: pełny rozszerzony `AvatarBuilder` (`/profile/avatar`) — **już shipnięte** (nie „basic").
- **ROZBIEGI→jedna tabela**, `ReportTable`, `ScheduleList`, EU flagi.
→ Stare wiersze „team-consolidation" (Home/Team-detail/Confirm/Empty/Input) = `exists`/🟢 (ui.jsx + TeamDetailPage). Field-cluster wiersze → patrz niżej.

## 🆕 NEW — wymaga decyzji Jacka (jedyne otwarte; reszta = exists/extends → CC robi sam)
Reality-pass wyłapał te NIE-istniejące w kodzie (`new`). RED = drogie/architektura:
- **🔴 N7 FieldWorkspace shell + mode-wizard** — wymaga wyciągnięcia stanu `LayoutDetailPage` do wspólnego hooka. Strukturalny refaktor. (rdzeń field-cluster)
- **🔴 N8 Taktyka skompozytowana na canvasie layoutu** — taktyka to osobny doc/page; integracja = decyzja architektoniczna.
- **🔴 N10 Logo drag-drop upload** (team) — łamie §93 URL-only; brak write-path. Backend+produkt GO.
- **🟠 N9 Trafialność (accuracy) connection-map** — nowa kolekcja + coach-draw + RBAC. Borderline RED.
- **🟢 N5 Callout-line render+draw** (`editLines[]` zapisywane, nigdy rysowane) · **N6 Zone vertex editor** (splątane z §88) — feasibility med→high.
- **🟢 NOT-RED (CC może po GO/sam): N1 watermark-marker** (częściowo zrobione) · **N2 live A-vs-B view** (view-only) · **N3 base end-zones** · **N4 field rail primitives** · **N11 per-team W/L chip** · **wizardy NewPlayer/NewTeam** (3/2-krok, ten sam payload).
- **DROP/CONFLICT (nie budować):** point-logging 5-step wizard (`wizard.jsx`) ↔ shipnięty kiosk · team-row warianty A–F (eksploracja) · pole „age" (FICTION, brak w schemacie) · `useTx()` (scaffolding).
- **⚠ PINNĄĆ przed buildem scout-point-resztki:** roster on/off (CONFLICT: `assignments[i]` vs nowy `onField[i]` vs UI-only) · shot `kind` (FICTION — brak pola).

## Kolejny epik: **bugfix-red** (3 RED bugi wyżej) → potem **field-cluster** (RED, staged briefy: N7→N8→N5/N6).
