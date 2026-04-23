# PPT Implementation Spec — HTML structure + theme.js tokens

> Simplified visual spec for Player Performance Tracker.
> Original v7 mockup (standalone preview) lives at `/mnt/user-data/outputs/PLAYER_PERFORMANCE_TRACKER_V7_TRAINING_PICKER.html` — outside CC sandbox. This spec is what CC uses.

## Global tokens (from `src/utils/theme.js`)

All PPT components use these tokens. NEVER hardcode colors/sizes.

```
COLORS.bg, .surface, .card, .border, .text, .textDim, .textMuted, .textFaint
COLORS.accent (#f59e0b), .accentGradient, .accentGlow
COLORS.success (green), .danger (red)
COLORS.side.dorito, .snake, .center  (per § 34)

FONT_SIZE.xxs (10)  xs (12)  sm (13)  md (15)  lg (17)  xl (20)  xxl (24)
RADIUS.sm (6)  md (8)  lg (10)  xl (12)  xxl (16)  full (999)
SPACE.xs (4)  sm (8)  md (12)  lg (16)  xl (20)  xxl (24)
TOUCH.min (44)
```

**PPT touch targets override `TOUCH.min`:**
- Bunker cells, outcome cards: **88px** min-height
- Detail cards: **72px** min-height
- Variant cards: **76px** min-height
- Primary CTAs: **64px** height
- Header icon buttons: **44px**

Rationale: paintball gloves + fatigue, 2× Apple HIG min.

---

## View 1 — Training Picker

**Route:** `/player/log` when `trainings.filter(t => t.isLive).length !== 1`

```
<Header sticky>
  [spacer 44×44]  "Wybierz trening"  <IconBtn onClick={refresh}><RefreshCw/></IconBtn>
</Header>

<ScrollArea padding={SPACE.lg}>
  <Hero>
    <h1 fontSize:26 weight:800>Cześć {playerName} 👋</h1>
    <p fontSize:sm color:textMuted>
      W tym momencie nie ma aktywnego treningu. <strong>Wybierz z listy</strong>
      do którego chcesz logować punkty.
    </p>
  </Hero>

  {/* Alternative when multiple LIVE: "Masz kilka aktywnych treningów. Wybierz który scoutujesz." */}

  <SectionDivider>Treningi {teamName}</SectionDivider>

  {sortedTrainings.map(t => <TrainingCard training={t} />)}
</ScrollArea>
```

**TrainingCard:**
```
<Card style={{padding: '14px 16px', marginBottom: 10, display: 'flex', gap: 14,
  border: t.isLive ? '2px solid rgba(34,197,94,0.4)' : `2px solid ${COLORS.border}`,
  background: t.isLive ? 'rgba(34,197,94,0.04)' : COLORS.card}}>

  <IconBox 42×42 radius:lg bg:surface border:2px>
    <Calendar size={22} strokeWidth={2} />
  </IconBox>

  <Main flex:1>
    <Title fontSize:md weight:700>{t.name}</Title>
    <Meta fontSize:xs color:textMuted>
      {formatDate(t.date)} · Layout: {t.layoutName} · {t.pointsCount} punktów
    </Meta>
  </Main>

  <Badge type={t.isLive ? 'live' : t.isUpcoming ? 'upcoming' : 'ended'}>
    {t.isLive && <LiveDot green 6×6/>}
    {LIVE | Zaplanowane | Zakończone}
  </Badge>
</Card>
```

**Sort:** LIVE first, Upcoming (today/tomorrow) second, Ended (past, max 10) third.

**Badge colors:**
- `live`: bg `rgba(34,197,94,0.15)`, color `success`, border `rgba(34,197,94,0.4)`
- `upcoming`: bg `rgba(6,182,212,0.12)`, color `side.snake`, border `rgba(6,182,212,0.3)`
- `ended`: bg `rgba(100,116,139,0.15)`, color `textMuted`, border `borderStrong`

---

## Wizard Header (shared across steps)

```
<Header sticky padding='8px 16px 12px' bg:COLORS.bg>
  <Row justifyContent:space-between gap:12 marginBottom:12>
    <IconBtn onClick={handleBack}><ChevronLeft size:20 color:accent/></IconBtn>
    <StepIndicator flex:1 textAlign:center fontSize:sm weight:700>
      <span color:textMuted fontSize:11 weight:600 uppercase letterSpacing:0.4>Krok</span>
      {currentStep}
      <span color:textMuted> z {totalSteps}</span>
    </StepIndicator>
    <IconBtn onClick={handleExit}><X size:20 color:textDim/></IconBtn>
  </Row>

  <ProgressTrack height:6 bg:card borderRadius:full>
    <ProgressFill width:{(currentStep/totalSteps)*100}%
                  bg:accentGradient shadow:'0 0 8px rgba(245,158,11,0.4)'
                  transition:'width 0.3s ease' />
  </ProgressTrack>
</Header>

<TrainingPill onClick={handleChangeTraining} marginTop:10>
  <LiveDot/> Trening {trainingName} · <span color:accent weight:800>#{pointNumber}</span> pkt dziś
</TrainingPill>
```

**totalSteps logic:**
- `variant ∈ {late-break, ze-strzelaniem}` → `5`
- `variant ∈ {na-wslizgu, na-okretke}` → `4`
- Step 1 (variant not chosen) → default `5`

**Back behavior:**
- Step 1 → confirm modal if dirty, else return to picker
- Step 2-5 → previous step, state preserved
- Step 4b back → Step 4 (not Step 3)

**Training pill tap → confirm modal → returns to picker + clears state**

---

## Step 1 — Breakout picker

**Q:** "Gdzie biegłeś?"
**Hint bootstrap:** "Wszystkie bunkry z {layoutName}"
**Hint mature:** "Twoje top 6 bunkrów z {layoutName}"

```
<WizardQuestion fontSize:xxl weight:800 letterSpacing:-0.6>Gdzie biegłeś?</WizardQuestion>
<WizardHint fontSize:sm color:textMuted marginBottom:20>{hintText}</WizardHint>

<BunkerGrid gridTemplateColumns:'1fr 1fr' gap:10>
  {bunkers.slice(0, 6).map(b => (
    <BunkerCell onClick={() => { setBreakout(b); navigate('step2'); }}
      minHeight:88 radius:xxl border:'2px solid border' bg:card padding:12
      position:relative flexDirection:column alignItems:center justifyContent:center gap:4>

      <SideLabel fontSize:xxs weight:700 letterSpacing:0.6 uppercase
                 color:{COLORS.side[b.side]}>
        {b.side.toUpperCase()}
      </SideLabel>
      <BunkerName fontSize:xl weight:800 letterSpacing:-0.5 color:text>
        {b.positionName}
      </BunkerName>
      {isMature && <Freq position:absolute top:10 right:12 fontSize:xxs weight:700
                         color:textFaint>{b.freqPct}%</Freq>}
    </BunkerCell>
  ))}

  <InneChip onClick={openInneBottomSheet}
    gridColumn:'1 / -1' minHeight:64 radius:xxl border:'2px dashed borderStrong'
    bg:transparent color:textDim fontSize:md weight:700 flex center gap:6>
    <Plus size:16 strokeWidth:2.5/> Inne bunkry
  </InneChip>
</BunkerGrid>
```

**"Inne bunkry" bottom sheet:** all layout bunkers EXCEPT top 6.

**Tap bunker → auto-advance Step 2 (100ms slide-left).**

---

## Step 2 — Variant picker

**Q:** "Jak biegłeś?"
**Hint:** "Sposób wejścia na pozycję"

```
<VariantStack flexDirection:column gap:10>
  {VARIANTS.map(v => (
    <VariantCard onClick={() => {
      setVariant(v.slug);
      navigate(SKIP_SHOTS.includes(v.slug) ? 'step4' : 'step3');
    }}
      minHeight:76 radius:xxl border:'2px solid border' bg:card padding:'14px 18px'
      display:flex alignItems:center gap:14>

      <IconWrap 44×44 radius:lg bg:surface color:textDim center>
        <v.Icon size:22 strokeWidth:2/>
      </IconWrap>

      <Labels flex:1 flexDirection:column gap:2>
        <Label fontSize:16 weight:800 color:text letterSpacing:-0.3>{v.label}</Label>
        <Hint fontSize:xs weight:500 color:textFaint>{v.hint}</Hint>
      </Labels>

      {v.skipShots && (
        <SkipBadge fontSize:9 weight:800 color:{side.snake} uppercase letterSpacing:0.4
                   padding:'3px 8px' radius:sm bg:'rgba(6,182,212,0.1)'
                   border:'1px solid rgba(6,182,212,0.25)'>
          SKIP SHOTS
        </SkipBadge>
      )}
    </VariantCard>
  ))}
</VariantStack>
```

**VARIANTS config:**
```js
const VARIANTS = [
  { slug: 'late-break',     label: 'Late break',     hint: 'Przycup ze strzelaniem',
    Icon: Lucide.Clock, skipShots: false },
  { slug: 'na-wslizgu',     label: 'Na wślizgu',     hint: 'Bez strzelania',
    Icon: Lucide.TrendingDown, skipShots: true },
  { slug: 'ze-strzelaniem', label: 'Ze strzelaniem', hint: '',
    Icon: Lucide.Crosshair, skipShots: false },
  { slug: 'na-okretke',     label: 'Na okrętkę',     hint: 'Dookoła przeszkody, bez strzelania',
    Icon: Lucide.Loader, skipShots: true },
];
const SKIP_SHOTS = ['na-wslizgu', 'na-okretke'];
```

---

## Step 3 — Shots picker (multi-select)

**Shown only if variant ∈ {late-break, ze-strzelaniem}**
**Q:** "Co strzelałeś?"
**Hint:** dynamic — "Tap po kolei · {count} cel(e) wybrany(e)"

```
<BunkerGrid>  {/* same component as Step 1 */}
  {bunkers.slice(0, 6).map(b => {
    const shotIdx = shots.findIndex(s => s.bunker === b.positionName);
    const isSelected = shotIdx !== -1;
    return (
      <BunkerCell onClick={() => toggleShot(b)}
        style={isSelected ? {
          background: 'rgba(245,158,11,0.10)',
          borderColor: COLORS.accent,
          boxShadow: '0 0 0 4px rgba(245,158,11,0.12)',
        } : defaultStyle}>
        {/* When selected: BunkerName color=accent, Freq% hidden, Order badge appears top-right
            Badge: 26×26 circle, bg:accent color:bg fontSize:14 weight:800 center */}
      </BunkerCell>
    );
  })}
  <InneChip>+ Inne bunkry</InneChip>
</BunkerGrid>

<SkipLink onClick={() => { setShots([]); navigate('step4'); }}
  marginTop:8 padding:14 textAlign:center color:textMuted fontSize:sm weight:600>
  Nic nie strzelałem →
</SkipLink>

<StickyFooter>
  <Btn variant:accent disabled={shots.length === 0} onClick={() => navigate('step4')}
    height:64 width:100% radius:xxl fontSize:17 weight:800>
    Dalej →
  </Btn>
</StickyFooter>
```

**toggleShot:**
```js
function toggleShot(bunker) {
  const existing = shots.findIndex(s => s.bunker === bunker.positionName);
  if (existing !== -1) {
    setShots(shots.filter((_, i) => i !== existing).map((s, i) => ({...s, order: i+1})));
  } else {
    setShots([...shots, { side: bunker.side, bunker: bunker.positionName, order: shots.length + 1 }]);
  }
}
```

**"Inne bunkry" excludes top 6 AND already-selected shots.**

---

## Step 4 — Outcome picker

**Q:** "Jak spadłeś?"
**Hint:** "Co się z Tobą stało w tym punkcie"

```
<OutcomeStack flexDirection:column gap:10>
  {OUTCOMES.map(o => (
    <OutcomeCard onClick={() => {
      setOutcome(o.slug);
      navigate(o.slug === 'elim_midgame' ? 'step4b' : 'step5');
    }}
      minHeight:84 radius:xxl padding:'16px 20px'
      border:'2px solid ${o.borderColor}' bg:{o.bgColor}
      display:flex alignItems:center gap:16>

      <IconCircle 52×52 radius:full border:'2px solid ${o.iconBorder}'
                  bg:{o.iconBg} color:{o.iconColor} center>
        <o.Icon size:24 strokeWidth:2/>
      </IconCircle>

      <LabelWrap flex:1>
        <BigLabel fontSize:17 weight:800 color:{o.textColor}>{o.label}</BigLabel>
        <SmallLabel fontSize:xs weight:500 color:{o.textColor} opacity:0.75>{o.sublabel}</SmallLabel>
      </LabelWrap>
    </OutcomeCard>
  ))}
</OutcomeStack>
```

**OUTCOMES config:**
```js
const OUTCOMES = [
  { slug: 'alive', label: 'Grałem do końca', sublabel: 'Nikt mnie nie trafił',
    Icon: Lucide.Shield,
    borderColor: 'rgba(34,197,94,0.35)', bgColor: 'rgba(34,197,94,0.06)',
    iconBorder: COLORS.success, iconBg: 'rgba(34,197,94,0.15)', iconColor: COLORS.success,
    textColor: COLORS.success },
  { slug: 'elim_break', label: 'Dostałem na brejku', sublabel: 'Pierwsze 5 sekund',
    Icon: Lucide.Zap,
    borderColor: 'rgba(239,68,68,0.35)', bgColor: 'rgba(239,68,68,0.06)',
    iconBorder: 'rgba(239,68,68,0.4)', iconBg: 'rgba(239,68,68,0.12)', iconColor: COLORS.danger,
    textColor: COLORS.danger },
  { slug: 'elim_midgame', label: 'Dostałem w grze', sublabel: 'Po rozbiegu',
    Icon: Lucide.Swords,
    borderColor: 'rgba(239,68,68,0.35)', bgColor: 'rgba(239,68,68,0.06)',
    iconBorder: 'rgba(239,68,68,0.4)', iconBg: 'rgba(239,68,68,0.12)', iconColor: COLORS.danger,
    textColor: COLORS.danger },
];
```

**Colors are DEFAULT (not just selected). Cards render green/red/red immediately.**

---

## Step 4b — Detail picker (conditional)

**Shown only if outcome === 'elim_midgame'**
**Q:** "Jak Cię trafili?"
**Hint:** "Wybierz rodzaj strzału"

```
<DetailStack flexDirection:column gap:8>
  {DETAIL_OPTIONS.map(d => (
    <DetailCard onClick={() => handleDetailClick(d)}
      minHeight:72 radius:xxl padding:'14px 18px' bg:card
      border:'2px solid ${d.neutral ? border : 'rgba(239,68,68,0.25)'}'
      display:flex alignItems:center gap:16>

      <IconCircle 44×44 radius:full
        border:'2px solid ${d.neutral ? border : 'rgba(239,68,68,0.3)'}'
        bg:{d.neutral ? surface : 'rgba(239,68,68,0.08)'}
        color:{d.neutral ? textDim : danger} center>
        <d.Icon size:22 strokeWidth:2/>
      </IconCircle>

      <LabelWrap flex:1>
        <BigLabel fontSize:16 weight:800 color:text letterSpacing:-0.2>{d.label}</BigLabel>
        <SmallLabel fontSize:xs weight:500 color:textFaint>{d.sublabel}</SmallLabel>
      </LabelWrap>
    </DetailCard>
  ))}
</DetailStack>
```

**DETAIL_OPTIONS config:**
```js
const DETAIL_OPTIONS = [
  // Group 1: konkretne (red borders)
  { slug: 'gunfight',      label: 'Gunfight',      sublabel: 'Wymiana ognia na przeszkodzie',
    Icon: Lucide.Target, neutral: false },
  { slug: 'przejscie',     label: 'Przejście',     sublabel: 'Podczas zmiany przeszkód',
    Icon: Lucide.ArrowRight, neutral: false },
  { slug: 'faja',          label: 'Faja',          sublabel: 'Przeciwnik mnie zabiegł',
    Icon: Lucide.Flag, neutral: false },
  { slug: 'na-przeszkodzie', label: 'Na przeszkodzie', sublabel: 'Blind shot, bounce',
    Icon: Lucide.Square, neutral: false },
  // Group 2: nieprecyzyjne (neutral borders)
  { slug: 'inne',          label: 'Inaczej',       sublabel: 'Opisz własnymi słowami',
    Icon: Lucide.HelpCircle, neutral: true },
  { slug: 'nie-wiem',      label: 'Nie wiem',      sublabel: 'Nie zauważyłem skąd',
    Icon: Lucide.X, neutral: true },
];
```

**handleDetailClick:**
```js
function handleDetailClick(d) {
  if (d.slug === 'inne') {
    setActiveExpand('inne'); // expands inline textarea
    // User fills textarea + taps "Zapisz i dalej" → saves text + advances
  } else {
    setOutcomeDetail(d.slug);
    setOutcomeDetailText(null);
    navigate('step5');
  }
}
```

**"Inaczej" expanded state:**
```
<DetailCard.Expanded flexDirection:column alignItems:stretch gap:14
  padding:'16px 18px 14px' bg:'rgba(239,68,68,0.09)'
  borderColor:danger boxShadow:'0 0 0 4px rgba(239,68,68,0.12)'>

  <Top display:flex alignItems:center gap:16>
    <IconCircle bg:'rgba(239,68,68,0.18)' borderColor:danger/>  {/* filled red variant */}
    <LabelWrap>
      <BigLabel color:danger>Inaczej</BigLabel>
      <SmallLabel>Opisz własnymi słowami</SmallLabel>
    </LabelWrap>
  </Top>

  <Textarea value={outcomeDetailText} onChange={...}
    placeholder="Np. Strzelił mnie kolega na zapleczu..." rows:2
    width:100% minHeight:56 radius:lg bg:COLORS.bg
    border:'2px solid borderStrong' color:text padding:'14px 16px'
    fontSize:md weight:500 fontFamily:FONT/>

  <Btn onClick={() => { setOutcomeDetail('inne'); navigate('step5'); }}
    height:50 bg:accentGradient color:bg fontSize:sm weight:800 radius:lg gap:8>
    <Check size:16 strokeWidth:2.8/> Zapisz i dalej
  </Btn>
</DetailCard.Expanded>
```

---

## Step 5 — Summary

**Q:** "Zapisać?"
**Hint:** "Tap rząd żeby cofnąć i poprawić"

```
<SummaryCard radius:xxl bg:card border:'1px solid border' padding:lg
             flexDirection:column gap:14>

  <SummaryRow onClick={() => navigate('step1')}>
    <RowLabel>Gdzie biegłeś</RowLabel>
    <RowValue><SideTag side={breakout.side}/> {breakout.bunker}</RowValue>
  </SummaryRow>

  <SummaryRow onClick={() => navigate('step2')}>
    <RowLabel>Jak</RowLabel>
    <RowValue>{variantLabel(variant)}</RowValue>
  </SummaryRow>

  <SummaryRow onClick={() => navigate(SKIP_SHOTS.includes(variant) ? 'step2' : 'step3')}>
    <RowLabel>Strzały</RowLabel>
    <RowValue>
      {SKIP_SHOTS.includes(variant)
        ? <em color:textFaint>Pominięte ({variantLabel(variant)})</em>
        : shots.length === 0
          ? <em color:textFaint>Nic nie strzelałem</em>
          : shots.map(s => s.bunker).join(' → ')}
    </RowValue>
  </SummaryRow>

  <SummaryRow onClick={() => navigate(outcome === 'elim_midgame' ? 'step4b' : 'step4')}>
    <RowLabel>Jak spadłeś</RowLabel>
    <RowValue>
      {outcomeLabel(outcome)}
      {outcomeDetail && ` · ${outcomeDetail === 'inne'
        ? `"${outcomeDetailText}"`
        : detailLabel(outcomeDetail)}`}
    </RowValue>
  </SummaryRow>
</SummaryCard>

<StickyFooter>
  <Btn variant:accent onClick={handleSave}
    height:64 width:100% radius:xxl fontSize:17 weight:800 gap:10>
    <Check size:20 strokeWidth:2.8/> Zapisz punkt
  </Btn>
</StickyFooter>
```

---

## Today's Logs List (post-save at `/player/log`)

```
<Header>
  <Title>Twoje dzisiejsze punkty</Title>
  <IconBtn onClick={refresh}><RefreshCw/></IconBtn>
</Header>

{pendingQueue.length > 0 && (
  <Banner bg:'rgba(245,158,11,0.08)' border:'1px solid rgba(245,158,11,0.2)'
          radius:md padding:sm fontSize:xs color:accent>
    <Cloud size:14/> {pendingQueue.length} niezsynchronizowanych
  </Banner>
)}

<LogList>
  {logs.map((log, idx) => (
    <LogCard>
      <Ordinal>#{idx + 1}</Ordinal>
      <Main>
        <Line1>
          <SideTag side={log.breakout.side}/> {log.breakout.bunker} · {variantLabel(log.breakout.variant)}
        </Line1>
        <Line2 color:textFaint>
          {log.shots === null ? '—' : log.shots.map(s => s.bunker).join(' → ') || 'bez strzałów'}
          {log.outcomeDetail && ` · ${detailLabelShort(log.outcomeDetail)}`}
        </Line2>
      </Main>
      <OutcomeChip color={log.outcome === 'alive' ? success : danger}>
        {outcomeLabelShort(log.outcome)}
      </OutcomeChip>
    </LogCard>
  ))}
</LogList>

<StickyCTA>
  <Btn variant:accent onClick={startNewPoint} height:64 width:100%>
    + Nowy punkt
  </Btn>
</StickyCTA>
```

---

## Animations

```css
.step-enter { transform: translateX(100%); }
.step-enter-active { transform: translateX(0); transition: transform 100ms ease-out; }
.step-exit { transform: translateX(0); }
.step-exit-active { transform: translateX(-100%); transition: transform 100ms ease-in; }
```

**Tap feedback on cells:** `active: { background: cardHover, transform: scale(0.98), transition: 0.15s ease }`

---

## Confirm modal (exit wizard)

Reuse existing `ConfirmModal` from `src/components/ui.jsx`:

```
<ConfirmModal open={showExitConfirm} variant="danger"
  title="Wyjść z logowania?"
  message="Wprowadzone dane zostaną utracone. Czy na pewno chcesz wyjść?"
  confirmLabel="Wyjdź bez zapisu" cancelLabel="Zostań"
  onConfirm={() => { clearWizardState(); navigate('/player/log'); }}
  onCancel={() => setShowExitConfirm(false)}/>
```

---

## Lucide icon mapping

| Step | Element | Icon |
|------|---------|------|
| Picker header | Refresh | `RefreshCw` |
| Picker card | Calendar | `Calendar` |
| Wizard header | Back | `ChevronLeft` |
| Wizard header | Exit | `X` |
| Step 1/3 | Inne chip | `Plus` |
| Step 2 | Late break | `Clock` |
| Step 2 | Na wślizgu | `TrendingDown` |
| Step 2 | Ze strzelaniem | `Crosshair` |
| Step 2 | Na okrętkę | `Loader` (CC may substitute) |
| Step 4 | Alive | `Shield` |
| Step 4 | Elim break | `Zap` |
| Step 4 | Elim midgame | `Swords` |
| Step 4b | Gunfight | `Target` |
| Step 4b | Przejście | `ArrowRight` |
| Step 4b | Faja | `Flag` |
| Step 4b | Na przeszkodzie | `Square` |
| Step 4b | Inaczej | `HelpCircle` |
| Step 4b | Nie wiem | `X` |
| Step 5 CTA | Save | `Check` |
| Today's list | Pending | `Cloud` |

stroke-width 2 default, 2.5-2.8 on CTAs and chevrons.

---

## i18n keys

Add `ppt` namespace to `src/utils/i18n.js`:

```js
ppt: {
  // Picker
  picker_title: 'Wybierz trening',
  picker_hero_greeting: 'Cześć {name} 👋',
  picker_hero_no_live: 'W tym momencie nie ma aktywnego treningu. Wybierz z listy do którego chcesz logować punkty.',
  picker_hero_multi_live: 'Masz kilka aktywnych treningów. Wybierz który scoutujesz.',
  picker_section: 'Treningi {teamName}',
  picker_badge_live: 'LIVE',
  picker_badge_upcoming: 'Zaplanowane',
  picker_badge_ended: 'Zakończone',
  picker_empty: 'Poczekaj aż coach utworzy trening',

  // Wizard
  step_label: 'Krok',
  step_of: 'z',

  // Step 1
  step1_question: 'Gdzie biegłeś?',
  step1_hint_bootstrap: 'Wszystkie bunkry z {layoutName}',
  step1_hint_mature: 'Twoje top 6 bunkrów z {layoutName}',
  inne_bunkers: 'Inne bunkry',

  // Step 2
  step2_question: 'Jak biegłeś?',
  step2_hint: 'Sposób wejścia na pozycję',
  variant_late_break: 'Late break',
  variant_late_break_hint: 'Przycup ze strzelaniem',
  variant_na_wslizgu: 'Na wślizgu',
  variant_na_wslizgu_hint: 'Bez strzelania',
  variant_ze_strzelaniem: 'Ze strzelaniem',
  variant_na_okretke: 'Na okrętkę',
  variant_na_okretke_hint: 'Dookoła przeszkody, bez strzelania',
  skip_shots_badge: 'SKIP SHOTS',

  // Step 3
  step3_question: 'Co strzelałeś?',
  step3_hint: 'Tap po kolei · {count} cel(e) wybrany(e)',
  step3_skip: 'Nic nie strzelałem →',
  step3_next: 'Dalej →',

  // Step 4
  step4_question: 'Jak spadłeś?',
  step4_hint: 'Co się z Tobą stało w tym punkcie',
  outcome_alive: 'Grałem do końca',
  outcome_alive_sub: 'Nikt mnie nie trafił',
  outcome_elim_break: 'Dostałem na brejku',
  outcome_elim_break_sub: 'Pierwsze 5 sekund',
  outcome_elim_midgame: 'Dostałem w grze',
  outcome_elim_midgame_sub: 'Po rozbiegu',

  // Step 4b
  step4b_question: 'Jak Cię trafili?',
  step4b_hint: 'Wybierz rodzaj strzału',
  detail_gunfight: 'Gunfight',
  detail_gunfight_sub: 'Wymiana ognia na przeszkodzie',
  detail_przejscie: 'Przejście',
  detail_przejscie_sub: 'Podczas zmiany przeszkód',
  detail_faja: 'Faja',
  detail_faja_sub: 'Przeciwnik mnie zabiegł',
  detail_na_przeszkodzie: 'Na przeszkodzie',
  detail_na_przeszkodzie_sub: 'Blind shot, bounce',
  detail_inne: 'Inaczej',
  detail_inne_sub: 'Opisz własnymi słowami',
  detail_nie_wiem: 'Nie wiem',
  detail_nie_wiem_sub: 'Nie zauważyłem skąd',
  detail_inne_placeholder: 'Np. Strzelił mnie kolega na zapleczu...',
  detail_inne_save: 'Zapisz i dalej',

  // Step 5
  step5_question: 'Zapisać?',
  step5_hint: 'Tap rząd żeby cofnąć i poprawić',
  step5_save: 'Zapisz punkt',
  row_breakout: 'Gdzie biegłeś',
  row_variant: 'Jak',
  row_shots: 'Strzały',
  row_outcome: 'Jak spadłeś',
  shots_skipped: 'Pominięte ({variant})',
  shots_none: 'Nic nie strzelałem',

  // Exit
  exit_title: 'Wyjść z logowania?',
  exit_message: 'Wprowadzone dane zostaną utracone. Czy na pewno chcesz wyjść?',
  exit_confirm: 'Wyjdź bez zapisu',
  exit_cancel: 'Zostań',

  // Today's logs
  logs_title: 'Twoje dzisiejsze punkty',
  logs_pending: '{count} niezsynchronizowanych',
  logs_new_point: '+ Nowy punkt',

  // Toasts
  toast_saved: 'Zapisany punkt #{n}',
  toast_saved_offline: 'Zapisany lokalnie, zsynchronizujemy gdy wróci sieć',
},
```

---

## If CC hits visual ambiguity

1. Check this spec first
2. If unclear, stop and ask Jacek — don't guess
3. Rest of spec (routing, data model, adaptive pickers, offline) lives in `docs/DESIGN_DECISIONS.md` § 48
