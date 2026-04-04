/**
 * LayoutsPage — navigation list only.
 * P2: cards click through to /layout/:id (LayoutDetailPage)
 * Only action left here: + New layout modal.
 */
import React, { useState, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import { Btn, SectionTitle, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, ConfirmModal } from '../components/ui';
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
      <PageHeader title="Layouts" />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

        <SectionTitle>
          <Icons.Image /> Layouts ({layouts.length})
        </SectionTitle>

        {loading && <SkeletonList count={3} />}
        {!loading && !layouts.length && (
          <EmptyState icon="🗺️" text="Add your first field layout" />
        )}

        {/* 2x2 grid, sorted by year desc then name */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {[...layouts]
            .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
            .map(l => (
            <div
              key={l.id}
              onClick={() => navigate(`/layout/${l.id}`)}
              style={{
                background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
              }}
            >
              {/* Thumbnail — compact for grid */}
              {l.fieldImage && (
                <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
                  <img src={l.fieldImage} alt={l.name}
                    style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                </div>
              )}
              {/* Card footer — compact */}
              <div style={{ padding: '8px 10px' }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontSm, color: COLORS.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.name}
                </div>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 2,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add layout button — bottom, consistent */}
        <Btn variant="accent" onClick={openAdd} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          <Icons.Plus /> New layout
        </Btn>
      </div>

      {/* New layout modal */}
      <Modal open={modal.is('add')} onClose={() => modal.close()} title="New layout"
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={!name.trim() || !image}><Icons.Check /> Create</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Layout name, e.g. NXL 2026 Event 1" autoFocus />

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(lg => (
                  <Btn key={lg} variant="default" size="sm" active={league === lg}
                    style={{ borderColor: league === lg ? LEAGUE_COLORS[lg] : COLORS.border, color: league === lg ? LEAGUE_COLORS[lg] : COLORS.textDim }}
                    onClick={() => setLeague(lg)}>{lg}</Btn>
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

          {/* Image upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Change image' : 'Upload field image *'}
            </Btn>
            {image && (
              <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}`, maxHeight: 150, position: 'relative' }}>
                <img src={image} alt="preview" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 150 }} />
              </div>
            )}
          </div>

          {/* D/Z lines will be configured on detail page */}
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted }}>
            Disco/Zeeker lines and bunkers — configure on layout detail page
          </div>
        </div>
      </Modal>

      <ConfirmModal {...deleteConfirm.modalProps(
        (layout) => handleDelete(layout?.id),
        { title: 'Delete layout?', message: `Delete "${deleteConfirm.value?.name}"?`, confirmLabel: 'Delete' }
      )} />
    </div>
  );
}
