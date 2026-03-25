import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS } from '../utils/theme';
import { compressImage, yearOptions } from '../utils/helpers';

function LayoutTacticsList({ layoutId }) {
  const { tactics, loading } = useLayoutTactics(layoutId);
  if (loading || !tactics.length) return null;
  return (
    <div style={{ padding: '4px 14px 10px', borderTop: `1px solid ${COLORS.border}30` }}>
      <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>⚔️ Taktyki ({tactics.length})</div>
      {tactics.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' }}>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>⚔️ {t.name}</span>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{t.steps?.length || 0} kr.</span>
          <Btn variant="ghost" size="sm" onClick={() => ds.deleteLayoutTactic(layoutId, t.id)}><Icons.Trash /></Btn>
        </div>
      ))}
    </div>
  );
}

export default function LayoutsPage() {
  const navigate = useNavigate();
  const { layouts, loading } = useLayouts();
  const [modal, setModal] = useState(null); // null | 'add' | { type: 'edit', layout }
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef(null);

  const openAdd = () => {
    setName(''); setLeague('NXL'); setYear(new Date().getFullYear());
    setImage(null); setDisco(30); setZeeker(80); setModal('add');
  };

  const openEdit = (l) => {
    setName(l.name); setLeague(l.league); setYear(l.year || 2026);
    setImage(l.fieldImage); setDisco(Math.round((l.discoLine || 0.30) * 100)); setZeeker(Math.round((l.zeekerLine || 0.80) * 100));
    setModal({ type: 'edit', layout: l });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1200);
      setImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim() || !image) return;
    const data = { name: name.trim(), league, year: Number(year), fieldImage: image, discoLine: disco / 100, zeekerLine: zeeker / 100 };
    if (modal === 'add') {
      await ds.addLayout(data);
    } else if (modal?.type === 'edit') {
      await ds.updateLayout(modal.layout.id, data);
    }
    setModal(null);
  };

  const handleDelete = async (id) => {
    await ds.deleteLayout(id);
    setDeleteConfirm(null);
  };

  // Apply layout to tournament
  const applyToTournament = null; // Handled from TournamentPage

  return (
    <div style={{ minHeight: '100vh', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Biblioteka layoutów']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SectionTitle right={<Btn variant="accent" size="sm" onClick={openAdd}><Icons.Plus /> Layout</Btn>}>
          <Icons.Image /> Biblioteka layoutów ({layouts.length})
        </SectionTitle>

        {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
        {!loading && !layouts.length && <EmptyState icon="🗺️" text="Dodaj layout pola — będziesz mógł go używać w wielu turniejach" />}

        {layouts.map(l => (
          <div key={l.id} style={{ background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
            {l.fieldImage && (
              <div style={{ position: 'relative', maxHeight: 250, overflow: 'hidden' }}>
                <img src={l.fieldImage} alt={l.name} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 250 }} />
                {/* Disco line */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${(l.discoLine || 0.30) * 100}%`, borderTop: '2px dashed #f97316', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8, color: '#f97316', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>D</span>
                </div>
                {/* Zeeker line */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${(l.zeekerLine || 0.80) * 100}%`, borderTop: '2px dashed #3b82f6', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8, color: '#3b82f6', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>S</span>
                </div>
              </div>
            )}
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {l.name} <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                </div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 2 }}>
                  Disco: {Math.round((l.discoLine || 0.30) * 100)}% · Zeeker: {Math.round((l.zeekerLine || 0.80) * 100)}%
                </div>
              </div>
              <Btn variant="ghost" size="sm" onClick={() => openEdit(l)}><Icons.Edit /></Btn>
              <Btn variant="ghost" size="sm" onClick={() => setDeleteConfirm(l)}><Icons.Trash /></Btn>
            </div>
            <LayoutTacticsList layoutId={l.id} />
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'Nowy layout' : 'Edytuj layout'}
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={!name.trim() || !image}><Icons.Check /> Zapisz</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Nazwa layoutu, np. NXL 2026 Event 1" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => (
                  <Btn key={l} variant="default" size="sm" active={league === l}
                    style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => setLeague(l)}>{l}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Rok</div>
              <Select value={year} onChange={v => setYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
          {/* Image upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Zmień obraz' : 'Załaduj layout pola'}
            </Btn>
            {image && (
              <div style={{ marginTop: 8, position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}`, maxHeight: 150 }}>
                <img src={image} alt="preview" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 150 }} />
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${disco}%`, borderTop: '2px dashed #f97316', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8, color: '#f97316', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>DISCO</span>
                </div>
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${zeeker}%`, borderTop: '2px dashed #3b82f6', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8, color: '#3b82f6', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>ZEEKER</span>
                </div>
              </div>
            )}
          </div>
          {/* Line controls */}
          {image && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316', fontWeight: 700 }}>D:</span>
                <input type="range" min="10" max="50" value={disco} onChange={e => setDisco(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{disco}%</span>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#3b82f6', fontWeight: 700 }}>Z:</span>
                <input type="range" min="50" max="95" value={zeeker} onChange={e => setZeeker(Number(e.target.value))} style={{ flex: 1 }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{zeeker}%</span>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Usunąć layout?"
        footer={<>
          <Btn variant="default" onClick={() => setDeleteConfirm(null)}>Anuluj</Btn>
          <Btn variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}><Icons.Trash /> Usuń</Btn>
        </>}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim }}>
          Usunąć <strong style={{ color: COLORS.text }}>{deleteConfirm?.name}</strong>?
        </div>
      </Modal>
    </div>
  );
}
