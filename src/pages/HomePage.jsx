import React, { useState } from 'react';
import { useModal } from '../hooks/useModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import CSVImport from '../components/CSVImport';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge, AppFooter , ConfirmModal} from '../components/ui';
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
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;
  const modal = useModal();
  const [csvOpen, setCsvOpen] = useState(false);
  const [bazaOpen, setBazaOpen] = useState(true);
  const [layoutsOpen, setLayoutsOpen] = useState(false);
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
    modal.close(); setName('');
  };

  const handleDelete = async (id) => { await ds.deleteTournament(id); modal.close(); };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header rightContent={
        <Btn variant="ghost" size="sm" onClick={onLogout} style={{ color: COLORS.textMuted, fontSize: TOUCH.fontXs }}>
          🔒 {workspaceName}
        </Btn>
      } />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 80 }}>
        {/* ── BAZA section ── */}
        <div style={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div onClick={() => setBazaOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            cursor: 'pointer', background: COLORS.surfaceLight, userSelect: 'none',
          }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
              🗃️ Database
            </span>
            <span style={{ color: COLORS.textMuted }}>{bazaOpen ? '▾' : '▸'}</span>
          </div>
          {bazaOpen && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 14px' }}>
              <Btn variant="default" onClick={() => navigate('/teams')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icons.Users /> Teams ({teams.length})
              </Btn>
              <Btn variant="default" onClick={() => navigate('/players')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                <Icons.DB /> Players
              </Btn>
              <Btn variant="default" onClick={() => setCsvOpen(true)} style={{ width: '100%', justifyContent: 'flex-start' }}>
                📋 Import CSV
              </Btn>
            </div>
          )}
        </div>

        {/* ── Layouts section ── */}
        <div style={{ borderRadius: 10, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          <div onClick={() => setLayoutsOpen(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
            cursor: 'pointer', background: COLORS.surfaceLight, userSelect: 'none',
          }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
              🗺️ Layout Library
            </span>
            <span style={{ color: COLORS.textMuted }}>{layoutsOpen ? '▾' : '▸'}</span>
          </div>
          {layoutsOpen && (
            <div style={{ padding: '10px 14px' }}>
              <Btn variant="default" onClick={() => navigate('/layouts')} style={{ width: '100%', justifyContent: 'flex-start' }}>
                🗺️ Open Layout Library
              </Btn>
            </div>
          )}
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
          <SectionTitle><Icons.Trophy /> Tournaments
          </SectionTitle>

          {tLoading && <EmptyState icon="⏳" text="Loading..." />}
          {!tLoading && !filtered.length && <EmptyState icon="🏆" text="No tournaments yet. Add the first one!" />}

          {filtered.map(t => (
            <Card key={t.id} icon={<Icons.Trophy />} title={t.name}
              badge={<><LeagueBadge league={t.league} /> {t.division && <span style={{ fontFamily: FONT, fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: COLORS.textMuted + '20', color: COLORS.textDim }}>{t.division}</span>} <YearBadge year={t.year} /></>}
              subtitle={`${t.scoutedTeams?.length || 0} teams · ${t.fieldImage ? '✅ layout' : '❌ no layout'}`}
              onClick={() => navigate(`/tournament/${t.id}`)}
              actions={
                <span style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                  {isAdmin && <Btn variant="ghost" size="sm" title="Admin only" onClick={() => modal.open({ type: 'delete', id: t.id, name: t.name })}>
                    <Icons.Trash />
                  </Btn>}
                </span>
              } />
          ))}
        </div>

        <AppFooter />
      </div>

      {/* Sticky Add Tournament */}
      <div style={{ position: 'sticky', bottom: 0, padding: `8px ${R.layout.padding}px`, background: COLORS.surface, borderTop: `1px solid ${COLORS.border}` }}>
        <Btn variant="accent" onClick={() => { setName(''); setLeague('NXL'); setYear(currentYear()); modal.open('add'); }}
          style={{ width: '100%', justifyContent: 'center', minHeight: 48, fontWeight: 800 }}>
          <Icons.Plus /> Add tournament
        </Btn>
      </div>
      {/* 
      </div>

      {/* Add tournament */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New tournament"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
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

      <ConfirmModal open={modal.is('delete')} onClose={() => modal.close()}
        title="Delete tournament?" danger confirmLabel="Delete"
        message={`Delete "${modal.value?.name}" and all data?`}
        onConfirm={() => handleDelete(modal.value?.id)} />

      <CSVImport open={csvOpen} onClose={() => setCsvOpen(false)} teams={teams} players={players} ds={ds} />
    </div>
  );
}
