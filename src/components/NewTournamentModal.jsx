import React, { useState, useEffect } from 'react';
import { Modal, Btn, Input, Select, Checkbox, Icons } from './ui';
import { useLayouts, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS, PLAYER_CLASSES, eligibleClassesForDivision } from '../utils/theme';
import { yearOptions, currentYear } from '../utils/helpers';

/**
 * NewTournamentModal — create a tournament, practice, or training session.
 *
 * Type selector at the top switches between:
 *  - Tournament: full form (name, league, year, division, layout)
 *  - Training: simplified form (date + team + layout), auto-named
 *
 * onCreated(id, type) — caller decides where to route. Training should
 * route into /training/:id/setup; tournament/practice should be set as
 * the active tournament.
 */
export default function NewTournamentModal({ open, onClose, onCreated, kind = 'tournament' }) {
  const { layouts } = useLayouts();
  const { teams } = useTeams();

  const [type, setType] = useState(kind === 'practice' ? 'tournament' : kind);
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  // Multi-select (bug H1): data model has always been an array
  // (PROJECT_GUIDELINES § 4.2). Downstream consumers — DivisionPillFilter,
  // Add Match / Add Team modals — iterate tournament.divisions[] already.
  const [divisions, setDivisions] = useState([]);
  const [eligClasses, setEligClasses] = useState([]);
  const [year, setYear] = useState(currentYear());
  const [layoutId, setLayoutId] = useState('');
  const [isTest, setIsTest] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  // Training / sparing-only state
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [teamId, setTeamId] = useState('');

  // Reset form whenever the modal opens or the type toggles.
  useEffect(() => {
    if (!open) return;
    setType(kind === 'practice' ? 'tournament' : kind);
  }, [open, kind]);

  useEffect(() => {
    if (!open) return;
    if (type === 'training') {
      setName('');
      setDate(new Date().toISOString().slice(0, 10));
      setTeamId(prev => prev || teams[0]?.id || '');
    } else if (type === 'sparing') {
      setName('');
      setDate(new Date().toISOString().slice(0, 10));
      setLeague('NXL');
      setDivisions([]);
      setEligClasses([]);
    } else {
      setName('');
      setLeague('NXL');
      setDivisions([]);
      setEligClasses([]);
      setYear(currentYear());
    }
    setLayoutId('');
    setIsTest(false);
    setSubmitAttempted(false);
  }, [type, open, teams]);

  // Union eligible classes across all selected divisions — each division
  // cascades downward from its tier, so N divisions' eligibility is the
  // union (effectively equals the lowest-tier division's set).
  const unionEligForDivisions = (divs) => {
    if (!divs.length) return [];
    const set = new Set();
    divs.forEach(d => eligibleClassesForDivision(d).forEach(c => set.add(c)));
    return Array.from(set);
  };

  // Add/remove division from selection (bug H1). Replaces the former
  // single-select replace semantics so "PRO + SEMI same weekend" works.
  const handleDivisionToggle = (d) => {
    setDivisions(prev => {
      const next = prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d];
      setEligClasses(unionEligForDivisions(next));
      return next;
    });
  };

  const toggleEligClass = (cls) => {
    setEligClasses(prev => prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]);
  };

  const handleAdd = async () => {
    if (type === 'training') {
      if (!teamId) return;
      const ref = await ds.addTraining({
        name: name.trim() || null,
        date,
        teamId,
        layoutId: layoutId || null,
        isTest,
      });
      onCreated?.(ref?.id, 'training');
      onClose?.();
      return;
    }
    if (type === 'sparing') {
      if (!name.trim()) return;
      const ref = await ds.addTournament({
        name: name.trim(),
        eventType: 'sparing',
        layoutId: layoutId || null,
        date: date || null,
        isTest,
        league: null,
        division: null,
        year: currentYear(),
      });
      onCreated?.(ref?.id, 'tournament');
      onClose?.();
      return;
    }
    // Tournament: require name + ≥1 division when the league has divisions.
    // Leagues without a DIVISIONS entry skip the divisions gate entirely.
    setSubmitAttempted(true);
    if (!name.trim()) return;
    if (DIVISIONS[league] && divisions.length === 0) return;
    const data = {
      name: name.trim(),
      league,
      year: Number(year),
      // Persist the array (data-model native); keep singular `division`
      // populated with the first entry for any legacy consumer that still
      // reads it — safe defensive write, array remains authoritative.
      divisions,
      division: divisions[0] || null,
      eligibleClasses: eligClasses.length ? eligClasses : null,
      layoutId: layoutId || null,
      eventType: 'tournament',
      isTest,
    };
    const ref = await ds.addTournament(data);
    onCreated?.(ref?.id, 'tournament');
    onClose?.();
  };

  const divisionsRequired = type === 'tournament' && !!DIVISIONS[league];
  const canCreate = type === 'training'
    ? !!teamId
    : !!name.trim() && (!divisionsRequired || divisions.length >= 1);

  return (
    <Modal open={open} onClose={onClose}
      title={type === 'training' ? 'New training' : type === 'sparing' ? 'New sparing' : 'New tournament'}
      footer={<>
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant="accent" onClick={handleAdd} disabled={!canCreate}>
          <Icons.Check /> Add
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        {/* Type selector — Apple HIG segmented control */}
        <div style={{
          display: 'flex',
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.lg,
          padding: 3,
          gap: 2,
        }}>
          {[
            { key: 'tournament', label: 'Tournament' },
            { key: 'sparing',    label: 'Sparing'    },
            { key: 'training',   label: 'Training'   },
          ].map(opt => {
            const active = type === opt.key;
            return (
              <div key={opt.key}
                onClick={() => setType(opt.key)}
                style={{
                  flex: 1, padding: '9px 0', textAlign: 'center',
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: active ? 700 : 500,
                  borderRadius: RADIUS.md, cursor: 'pointer',
                  background: active ? COLORS.surfaceLight : 'transparent',
                  color: active ? COLORS.text : COLORS.textMuted,
                  boxShadow: active ? '0 1px 4px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(255,255,255,0.04)' : 'none',
                  transition: 'all .15s',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                {opt.label}
              </div>
            );
          })}
        </div>

        {/* Test/stage flag */}
        <Checkbox
          checked={isTest}
          onChange={setIsTest}
          label="Test / stage session"
        />

        {type === 'training' ? (
          <>
            {/* Training fields: name (optional but encouraged) + team + date + layout */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                Name <span style={{ color: COLORS.textDim, fontWeight: 400 }}>(optional)</span>
              </div>
              <Input
                value={name}
                onChange={setName}
                placeholder={teamId ? `e.g. pre-NXL Prague, ${teams.find(t => t.id === teamId)?.name || ''}` : 'e.g. pre-NXL Prague'}
                onKeyDown={e => e.key === 'Enter' && canCreate && handleAdd()}
                autoFocus
              />
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Team</div>
              <Select value={teamId} onChange={setTeamId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                <option value="">— select team —</option>
                {teams.filter(t => !t.parentTeamId).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
                {teams.filter(t => t.parentTeamId).map(t => (
                  <option key={t.id} value={t.id}>↳ {t.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Date</div>
              <Input value={date} onChange={setDate} type="date" />
            </div>
            {layouts.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Layout</div>
                <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                  <option value="">— no layout —</option>
                  {layouts.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
                  ))}
                </Select>
              </div>
            )}
          </>
        ) : type === 'sparing' ? (
          <>
            {/* Sparing fields: name + date + layout only */}
            <Input
              value={name}
              onChange={setName}
              placeholder="Sparing name…"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Date</div>
              <Input value={date} onChange={setDate} type="date" />
            </div>
            {layouts.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Layout</div>
                <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                  <option value="">— no layout —</option>
                  {layouts.map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
                  ))}
                </Select>
              </div>
            )}
          </>
        ) : (
          <>
            <Input
              value={name}
              onChange={setName}
              placeholder="NXL Tampa 2026…"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              autoFocus
            />
            <div style={{ display: 'flex', gap: SPACE.md }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>League</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LEAGUES.map(l => (
                    <Btn key={l} variant="default" size="sm" active={league === l}
                      style={{
                        borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border,
                        color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim,
                      }}
                      onClick={() => { setLeague(l); setDivisions([]); setEligClasses([]); }}>
                      {l}
                    </Btn>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Year</div>
                <Select value={year} onChange={v => setYear(Number(v))}>
                  {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </div>
            </div>
            {DIVISIONS[league] && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                  Divisions <span style={{ color: COLORS.textDim, fontWeight: 400 }}>(one or more)</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIVISIONS[league].map(d => (
                    <Btn key={d} variant="default" size="sm" active={divisions.includes(d)}
                      onClick={() => handleDivisionToggle(d)}>
                      {d}
                    </Btn>
                  ))}
                </div>
                {submitAttempted && divisions.length === 0 && (
                  <div style={{
                    fontFamily: FONT, fontSize: 11, fontWeight: 600,
                    color: COLORS.danger, marginTop: 6,
                  }}>
                    Select at least one division
                  </div>
                )}
              </div>
            )}
            {/* Eligible player classes — auto-populated from divisions, editable */}
            {(divisions.length > 0 || eligClasses.length > 0) && (
              <div>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4,
                  display: 'flex', justifyContent: 'space-between',
                }}>
                  <span>Eligible player classes</span>
                  {eligClasses.length > 0 && (
                    <span style={{ color: COLORS.textDim, fontWeight: 500 }}>{eligClasses.length} z {PLAYER_CLASSES.length}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {PLAYER_CLASSES.map(cls => {
                    const on = eligClasses.includes(cls);
                    return (
                      <div key={cls} onClick={() => toggleEligClass(cls)} style={{
                        padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: FONT, fontSize: 11, fontWeight: on ? 700 : 500,
                        background: on ? `${COLORS.accent}15` : COLORS.surfaceDark,
                        border: `1px solid ${on ? COLORS.accent + '60' : COLORS.border}`,
                        color: on ? COLORS.accent : COLORS.textDim,
                        minHeight: 32, display: 'inline-flex', alignItems: 'center',
                        WebkitTapHighlightColor: 'transparent',
                      }}>
                        {cls}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {layouts.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>Layout</div>
                <Select value={layoutId} onChange={setLayoutId} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                  <option value="">— no layout —</option>
                  {layouts.filter(l => l.league === league || league === 'NXL' || l.league === 'NXL').map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.league} {l.year})</option>
                  ))}
                </Select>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
