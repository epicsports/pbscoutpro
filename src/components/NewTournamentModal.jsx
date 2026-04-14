import React, { useState, useEffect } from 'react';
import { Modal, Btn, Input, Select, Icons } from './ui';
import { useLayouts, useTeams } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS } from '../utils/theme';
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

  const [type, setType] = useState(kind === 'practice' ? 'tournament' : kind); // 'tournament' | 'training'
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [division, setDivision] = useState('');
  const [year, setYear] = useState(currentYear());
  const [layoutId, setLayoutId] = useState('');
  // Training-only state
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
    } else {
      setName('');
      setLeague('NXL');
      setDivision('');
      setYear(currentYear());
    }
    setLayoutId('');
  }, [type, open, teams]);

  const handleAdd = async () => {
    if (type === 'training') {
      if (!teamId) return;
      const ref = await ds.addTraining({
        date,
        teamId,
        layoutId: layoutId || null,
      });
      onCreated?.(ref?.id, 'training');
      onClose?.();
      return;
    }
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      league,
      year: Number(year),
      division: division || null,
      layoutId: layoutId || null,
    };
    const ref = await ds.addTournament(data);
    onCreated?.(ref?.id, 'tournament');
    onClose?.();
  };

  const canCreate = type === 'training' ? !!teamId : !!name.trim();

  return (
    <Modal open={open} onClose={onClose} title={type === 'training' ? 'New training' : 'New tournament'}
      footer={<>
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant="accent" onClick={handleAdd} disabled={!canCreate}>
          <Icons.Check /> Add
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        {/* Type selector */}
        <div style={{
          display: 'flex',
          background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.md,
          padding: 3,
        }}>
          {[
            { key: 'tournament', label: 'Tournament' },
            { key: 'training',   label: 'Training'   },
          ].map(opt => {
            const active = type === opt.key;
            return (
              <div key={opt.key}
                onClick={() => setType(opt.key)}
                style={{
                  flex: 1, padding: '8px 0', textAlign: 'center',
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                  borderRadius: RADIUS.sm, cursor: 'pointer',
                  background: active ? COLORS.surface : 'transparent',
                  color: active ? COLORS.text : COLORS.textMuted,
                  boxShadow: active ? '0 1px 4px #00000025' : 'none',
                  transition: 'all .15s',
                  WebkitTapHighlightColor: 'transparent',
                  minHeight: 36,
                }}>
                {opt.label}
              </div>
            );
          })}
        </div>

        {type === 'training' ? (
          <>
            {/* Training fields: team + date + layout */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Team</div>
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
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Date</div>
              <Input value={date} onChange={setDate} type="date" />
            </div>
            {layouts.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Layout</div>
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
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {LEAGUES.map(l => (
                    <Btn key={l} variant="default" size="sm" active={league === l}
                      style={{
                        borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border,
                        color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim,
                      }}
                      onClick={() => { setLeague(l); setDivision(''); }}>
                      {l}
                    </Btn>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
                <Select value={year} onChange={v => setYear(Number(v))}>
                  {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
                </Select>
              </div>
            </div>
            {DIVISIONS[league] && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Division</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {DIVISIONS[league].map(d => (
                    <Btn key={d} variant="default" size="sm" active={division === d}
                      onClick={() => setDivision(division === d ? '' : d)}>
                      {d}
                    </Btn>
                  ))}
                </div>
              </div>
            )}
            {layouts.length > 0 && (
              <div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Layout</div>
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
