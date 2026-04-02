/**
 * LayoutsPage — navigation list only.
 * P2: cards click through to /layout/:id (LayoutDetailPage)
 * Only action left here: + New layout modal.
 */
import React, { useState, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge, ConfirmModal } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import { useModal } from '../hooks/useModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useConfirm } from '../hooks/useConfirm';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import { compressImage, yearOptions } from '../utils/helpers';

export default function LayoutsPage() {
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { layouts, loading } = useLayouts();
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;
  const modal = useModal();
  const deleteConfirm = useConfirm();
  const fileRef = useRef(null);

  // New layout form state
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);

  const openAdd = () => {
    setName(''); setLeague('NXL'); setYear(new Date().getFullYear());
    setImage(null); setDisco(30); setZeeker(80);
    modal.open('add');
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
    await ds.addLayout({
      name: name.trim(), league, year: Number(year),
      fieldImage: image, discoLine: disco / 100, zeekerLine: zeeker / 100,
    });
    modal.close();
  };

  const handleDelete = async (id) => {
    await ds.deleteLayout(id);
    deleteConfirm.cancel();
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Layouts & Tactics']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 72, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        <SectionTitle right={<Btn variant="accent" size="sm" onClick={openAdd}><Icons.Plus /> Layout</Btn>}>
          <Icons.Image /> Layouts ({layouts.length})
        </SectionTitle>

        {loading && <EmptyState icon="⏳" text="Ładowanie..." />}
        {!loading && !layouts.length && (
          <EmptyState icon="🗺️" text="Dodaj pierwszy layout pola — używaj go w wielu turniejach" />
        )}

        {layouts.map(l => (
          <div
            key={l.id}
            onClick={() => navigate(`/layout/${l.id}`)}
            style={{
              background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
              borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}
          >
            {/* Thumbnail */}
            {l.fieldImage && (
              <div style={{ position: 'relative', overflow: 'hidden', maxHeight: device.isMobile ? 140 : 200 }}>
                <img src={l.fieldImage} alt={l.name}
                  style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                {/* Disco line overlay */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${(l.discoLine || 0.30) * 100}%`,
                  borderTop: '1.5px dashed #f97316', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8,
                    color: '#f97316', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>D</span>
                </div>
                {/* Zeeker line overlay */}
                <div style={{ position: 'absolute', left: 0, right: 0, top: `${(l.zeekerLine || 0.80) * 100}%`,
                  borderTop: '1.5px dashed #3b82f6', pointerEvents: 'none' }}>
                  <span style={{ position: 'absolute', right: 4, top: -12, fontFamily: FONT, fontSize: 8,
                    color: '#3b82f6', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '0 3px', borderRadius: 2 }}>Z</span>
                </div>
              </div>
            )}

            {/* Card footer */}
            <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text,
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  {l.name} <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                </div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 2 }}>
                  {l.bunkers?.length || 0} bunkrów
                  {l.fieldCalibration ? ' · 📐' : ''}
                  {l.dangerZone ? ' · ⚠️' : ''}
                </div>
              </div>
              {isAdmin && (
                <Btn variant="ghost" size="sm"
                  onClick={e => { e.stopPropagation(); deleteConfirm.ask(l); }}
                  title="Usuń layout">
                  <Icons.Trash />
                </Btn>
              )}
              <Icons.ChevronRight />
            </div>
          </div>
        ))}
      </div>

      {/* New layout modal */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="Nowy layout"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Anuluj</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={!name.trim() || !image}><Icons.Check /> Utwórz</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Nazwa layoutu, np. NXL 2026 Event 1" autoFocus />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(lg => (
                  <Btn key={lg} variant="default" size="sm" active={league === lg}
                    style={{ borderColor: league === lg ? LEAGUE_COLORS[lg] : COLORS.border, color: league === lg ? LEAGUE_COLORS[lg] : COLORS.textDim }}
                    onClick={() => setLeague(lg)}>{lg}</Btn>
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

          {/* Image upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Zmień zdjęcie' : 'Wgraj zdjęcie pola *'}
            </Btn>
            {image && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}`, maxHeight: 150, position: 'relative' }}>
                <img src={image} alt="preview" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 150 }} />
              </div>
            )}
          </div>

          {/* D/Z lines will be configured on detail page */}
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
            Linie Disco/Zeeker i bunkry — skonfiguruj na stronie detali layoutu
          </div>
        </div>
      </Modal>

      <ConfirmModal {...deleteConfirm.modalProps(
        (layout) => handleDelete(layout?.id),
        { title: 'Usuń layout?', message: `Usunąć "${deleteConfirm.value?.name}"?`, confirmLabel: 'Usuń' }
      )} />
    </div>
  );
}
