import React, { useState, useEffect } from 'react';
import { Modal, Btn, Input, Select, Icons } from './ui';
import { useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS } from '../utils/theme';
import { yearOptions, currentYear } from '../utils/helpers';

/**
 * NewTournamentModal — create a tournament or practice session.
 *
 * Extracted from HomePage.jsx when HomePage was retired in § 31 refactor.
 * Opens with a `kind` hint ('tournament' | 'practice') that pre-fills name
 * and sets the practice flag.
 */
export default function NewTournamentModal({ open, onClose, onCreated, kind = 'tournament' }) {
  const { layouts } = useLayouts();
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [division, setDivision] = useState('');
  const [year, setYear] = useState(currentYear());
  const [layoutId, setLayoutId] = useState('');
  const practiceMode = kind === 'practice';

  // Reset form whenever the modal opens
  useEffect(() => {
    if (!open) return;
    setName(practiceMode ? 'Practice ' + new Date().toLocaleDateString() : '');
    setLeague('NXL');
    setDivision('');
    setYear(currentYear());
    setLayoutId('');
  }, [open, practiceMode]);

  const handleAdd = async () => {
    if (!name.trim()) return;
    const data = {
      name: name.trim(),
      league,
      year: Number(year),
      division: division || null,
      layoutId: layoutId || null,
    };
    if (practiceMode) data.type = 'practice';
    const ref = await ds.addTournament(data);
    onCreated?.(ref?.id);
    onClose?.();
  };

  return (
    <Modal open={open} onClose={onClose} title={practiceMode ? 'New practice' : 'New tournament'}
      footer={<>
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}>
          <Icons.Check /> Add
        </Btn>
      </>}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
        <Input
          value={name}
          onChange={setName}
          placeholder={practiceMode ? 'Practice session name…' : 'NXL Tampa 2026…'}
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
        {DIVISIONS[league] && !practiceMode && (
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
      </div>
    </Modal>
  );
}
