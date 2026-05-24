# Custom Named Zones — feature spec (capture 2026-05-24)
## Status: MAP → DESIGN → IMPLEMENT. Implementacja NIE autoryzowana. Capture intencji.

## Po co
Zespoły komunikują nie tylko przeszkody, ale i STREFY które ktoś strzela/kontroluje
(zone control + zone shooting; nazwy typu Orange, Black, etc.). Chcemy móc tworzyć
customowe, NAZWANE strefy i czytać te dane wszędzie gdzie relewantne. To rozszerzenie
istniejącego wzorca named-zone (danger/sajgon/bigmove polygons + side-tendency stats §30/§34)
poza stałe pasy dorito/center/snake na dowolne nazwane poligony.

## Impact surfaces (DO ZMAPOWANIA — CC zweryfikuje faktyczne touch-pointy w discovery)
1. Layout config: osobna część konfiguracji — twórz/nazwij/narysuj strefy.
   Storage = layout doc, np. customZones:[{id,name,color?,polygon}] (mirror danger/sajgon/bigMove).
2. Canvas render: rysowanie nazwanych stref (overlay + label pill, jak danger/sajgon).
3. Scout shot-assignment: NOWA część POŚREDNIA — „którą strefę strzelał". Między
   toggle kierunku (obstacle/break) a precyzyjnym rysowaniem. QuickShotPanel/shot UI dostaje zone-picker.
4. Point data model: zone-shot reference (kto którą strefę strzelał) + zone-presence
   (pozycja gracza wewnątrz strefy) derived przez pointInPolygon.
5. Coach stats: zone control % (presence) + zone shooting % per nazwana strefa
   (nowe metryki, wzór jak side-tendency §30/§34).
6. ScoutedTeamPage: wyświetlanie zone control/shooting.
7. Comms vocabulary: nazwy stref = słownik zespołu (jak side names dorito/snake/center).

## Open questions (do rozstrzygnięcia w design)
- Strefy per-layout (geometria) vs słownik nazw per-team? (prawdopodobnie geometria per-layout.)
- Kolory stref — auto czy ręczne?
- Relacja do istniejących quick-shots toggle (dorito/center/snake §19) — custom strefy
  rozszerzają czy zastępują pasy? Współistnienie?
- Jak zone-shooting relacjonuje z istniejącymi quickShots/obstacleShots/precise (§19/§29)
  — nowy tier reprezentacji strzału? Jak agregujemy w stats?
- Overlap stref (gracz w dwóch strefach naraz)?

## Sequence (per Jacek)
1. MAP impact (CC read-only discovery — zweryfikuj 7 surfaces wyżej, faktyczne pliki/pola).
2. DESIGN interface (layout zone-editor + scout zone-picker + coach display) — mockupy, Apple HIG.
3. IMPLEMENT (phased, z planem deployu — Jacek: „zaplanować deploy tej funkcjonalności").
