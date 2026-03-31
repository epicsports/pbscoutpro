import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CSVImport from '../components/CSVImport';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge, AppFooter } from '../components/ui';
import { useTournaments, useTeams, usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { useDevice } from '../hooks/useDevice';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, DIVISIONS , responsive } from '../utils/theme';
import { yearOptions, currentYear } from '../utils/helpers';

export default function HomePage({ onLogout, workspaceName }) {
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { tournaments, loading: tLoading } = useTournaments();
  const { teams } = useTeams();
  const { players } = usePlayers();
  const [modal, setModal] = useState(null);
  const [csvOpen, setCsvOpen] = useState(false);
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [division, setDivision] = useState('');
  const [year, setYear] = useState(currentYear());
  const [filterYear, setFilterYear] = useState('all');
  const [filterLeague, setFilterLeague] = useState('all');

  const filtered = tournaments.filter(t => {
    if (filterYear !== 'all' && t.year !== Number(filterYear)) return false;
    if (filterLeague !== 'all' && t.league !== filterLeague) return false;
    return true;
  });

  const handleAdd = async () => {
    if (!name.trim()) return;
    await ds.addTournament({ name: name.trim(), league, year: Number(year), division: division || null });
    setModal(null); setName('');
  };

  const handleDelete = async (id) => { await ds.deleteTournament(id); setModal(null); };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header rightContent={
        <Btn variant="ghost" size="sm" onClick={onLogout} style={{ color: COLORS.textMuted, fontSize: TOUCH.fontXs }}>
          🔒 {workspaceName}
        </Btn>
      } />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>
        {/* Quick nav */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variant="default" onClick={() => navigate('/teams')}><Icons.Users /> Drużyny ({teams.length})</Btn>
          <Btn variant="default" onClick={() => navigate('/players')}><Icons.DB /> Zawodnicy</Btn>
          <Btn variant="default" onClick={() => setCsvOpen(true)}>📋 Import CSV</Btn>
          <Btn variant="default" onClick={() => navigate('/layouts')}>🗺️ Layouty</Btn>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Icons.Filter />
          <Select value={filterYear} onChange={setFilterYear} style={{ minWidth: 80 }}>
            <option value="all">Rok: Wszystkie</option>
            {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </Select>
          <Select value={filterLeague} onChange={setFilterLeague} style={{ minWidth: 80 }}>
            <option value="all">Liga: Wszystkie</option>
            {LEAGUES.map(l => <option key={l} value={l}>{l}</option>)}
          </Select>
        </div>

        {/* Tournaments */}
        <div>
          <SectionTitle right={
            <Btn variant="accent" onClick={() => { setName(''); setLeague('NXL'); setYear(currentYear()); setModal('add'); }}>
              <Icons.Plus /> Turniej
            </Btn>
          }>
            <Icons.Trophy /> Turnieje
          </SectionTitle>

          {tLoading && <EmptyState icon="⏳" text="Ładowanie..." />}
          {!tLoading && !filtered.length && <EmptyState icon="🏆" text="Brak turniejów. Dodaj pierwszy!" />}

          {filtered.map(t => (
            <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
              badge={<><LeagueBadge league={t.league} /> {t.division && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: COLORS.textMuted + '20', color: COLORS.textDim }}>{t.division}</span>} <YearBadge year={t.year} /></>}
              subtitle={`${t.scoutedTeams?.length || 0} drużyn · ${t.fieldImage ? '✅ layout' : '❌ brak layoutu'}`}
              onClick={() => navigate(`/tournament/${t.id}`)}
              actions={
                <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  <Btn variant="ghost" size="sm" onClick={() => setModal({ type: 'delete', id: t.id, name: t.name })}>
                    <Icons.Trash />
                  </Btn>
                </span>
              } />
          ))}
        </div>

        <AppFooter />
      </div>

      {/* Add tournament */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Nowy turniej"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleAdd} disabled={!name.trim()}><Icons.Check /> Dodaj</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="NXL Tampa 2026..." onKeyDown={e => e.key === 'Enter' && handleAdd()} autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => (
                  <Btn key={l} variant="default" size="sm" active={league === l}
                    style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => { setLeague(l); setDivision(''); }}>{l}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Rok</div>
              <Select value={year} onChange={v => setYear(Number(v))}>
                {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
          {DIVISIONS[league] && (
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Dywizja</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {DIVISIONS[league].map(d => (
                  <Btn key={d} variant="default" size="sm" active={division === d}
                    onClick={() => setDivision(division === d ? '' : d)}>{d}</Btn>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete */}
      <Modal open={!!modal?.type} onClose={() => setModal(null)} title="Usuń turniej?"
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="danger" onClick={() => handleDelete(modal?.id)}><Icons.Trash /> Usuń</Btn>
        </>}>
        <p style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim, margin: 0 }}>
          Usunąć <strong style={{ color: COLORS.text }}>{modal?.name}</strong> i wszystkie dane?
        </p>
      </Modal>

      <CSVImport open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} players={players} ds={ds} />
    </div>
  );
}
