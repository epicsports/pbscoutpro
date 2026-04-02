import React, { useState, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge , ConfirmModal} from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useModal } from '../hooks/useModal';
import { useWorkspace } from '../hooks/useWorkspace';
import { useConfirm } from '../hooks/useConfirm';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS , responsive } from '../utils/theme';
import { compressImage, yearOptions, uid } from '../utils/helpers';
import { useVisibility } from '../hooks/useVisibility';
import FieldCanvas from '../components/FieldCanvas';
import FieldEditor from '../components/FieldEditor';

function LayoutTacticsList({ layoutId, onAdd, onOpen }) {
  const { tactics, loading } = useLayoutTactics(layoutId);
  return (
    <div style={{ padding: '4px 14px 10px', borderTop: `1px solid ${COLORS.border}30` }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, flex: 1 }}>
          ⚔️ Tactics {tactics.length > 0 && `(${tactics.length})`}
        </div>
        <Btn variant="ghost" size="sm" onClick={onAdd}><Icons.Plus /> Add</Btn>
      </div>
      {!loading && tactics.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', cursor: 'pointer' }}
          onClick={() => onOpen(t.id)}>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>⚔️ {t.name}</span>
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{t.steps?.length || 0} steps</span>
          <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); ds.deleteLayoutTactic(layoutId, t.id); }}><Icons.Trash /></Btn>
        </div>
      ))}
      {!loading && !tactics.length && (
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textMuted, padding: '4px 0' }}>No tactics yet</div>
      )}
    </div>
  );
}

export default function LayoutsPage() {
  const device = useDevice();
  const R = responsive(device.type);
    const navigate = useNavigate();
  const { layouts, loading } = useLayouts();
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;
  const modal = useModal();
  const isEdit = modal.is('edit');
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);
  const deleteConfirm = useConfirm();
  const [tacticModal, setTacticModal] = useState(null); // layoutId when open
  const [tacticName, setTacticName] = useState('');
  // Annotation editor
  const [annotateLayout, setAnnotateLayout] = useState(null); // layout object being annotated
  const [annotateMode, setAnnotateMode] = useState('bunker'); // 'bunker'|'danger'|'sajgon'
  const [editBunkers, setEditBunkers] = useState([]);
  const [editDanger, setEditDanger] = useState([]);
  const [editSajgon, setEditSajgon] = useState([]);
  const [pendingBunker, setPendingBunker] = useState(null); // {x,y} waiting for name
  const [bunkerNameInput, setBunkerNameInput] = useState('');
  const [editingBunkerId, setEditingBunkerId] = useState(null); // for rename
  const [annotateDisco, setAnnotateDisco] = useState(30);
  const [annotateZeeker, setAnnotateZeeker] = useState(80);
  const fileRef = useRef(null);

  // ── BreakAnalyzer: visibility ──
  const [showVisibility, setShowVisibility] = useState(false);
  const vis = useVisibility();

  // ── Field Calibration ──
  const [editCalibration, setEditCalibration] = useState({
    homeBase: { x: 0.05, y: 0.5 },
    awayBase: { x: 0.95, y: 0.5 },
  });
  const calOverlayRef = useRef(null);
  const calDragRef = useRef(null); // { base: 'homeBase'|'awayBase' }

  const openAdd = () => {
    setName(''); setLeague('NXL'); setYear(new Date().getFullYear());
    setImage(null); setDisco(30); setZeeker(80); modal.open('add');
  };

  const openEdit = (l) => {
    setName(l.name); setLeague(l.league); setYear(l.year || 2026);
    setImage(l.fieldImage); setDisco(Math.round((l.discoLine || 0.30) * 100)); setZeeker(Math.round((l.zeekerLine || 0.80) * 100));
    modal.open({ type: 'edit', layout: l });
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
    if (modal.is('add')) {
      await ds.addLayout(data);
    } else if (modal.is('edit')) {
      await ds.updateLayout(modal.value?.layout?.id, data);
    }
    modal.close();
  };

  const handleDelete = async (id) => {
    await ds.deleteLayout(id);
    deleteConfirm.cancel();
  };

  const openAnnotate = (l) => {
    setAnnotateLayout(l);
    setAnnotateMode('bunker');
    setEditBunkers(l.bunkers ? [...l.bunkers] : []);
    setEditDanger(l.dangerZone ? [...l.dangerZone] : []);
    setEditSajgon(l.sajgonZone ? [...l.sajgonZone] : []);
    setAnnotateDisco(Math.round((l.discoLine || 0.30) * 100));
    setAnnotateZeeker(Math.round((l.zeekerLine || 0.80) * 100));
    setEditCalibration(l.fieldCalibration || {
      homeBase: { x: 0.05, y: 0.5 },
      awayBase: { x: 0.95, y: 0.5 },
    });
    setPendingBunker(null); setBunkerNameInput(''); setEditingBunkerId(null);
    setShowVisibility(false);
    if (l.bunkers?.length) vis.initFromLayout(l.bunkers);
  };
// ── BreakAnalyzer: typy bunkrów i wysokości ──
const TYPE_ABBREV = ['SB','SD','MD','Tr','C','Br','GB','MW','Wg','GW','Ck','TCK','T','MT','GP'];
const TYPE_H = { SB:.76, SD:.85, MD:1, Tr:.9, C:1.2, Br:.8, GB:1.4, MW:.7, Wg:.9, GW:1.3, Ck:.85, TCK:1.1, T:1.0, MT:1.15, GP:1.05 };

function guessType(name) {
  if (!name) return 'Br';
  const n = name.toUpperCase();
  if (/^SB\d?$|SNAKE|^S\d/.test(n)) return 'SB';
  if (/^SD/.test(n)) return 'SD';
  if (/^MD|DORITO|^D\d|^D50/.test(n)) return 'MD';
  if (/^TR|TREE/.test(n)) return 'Tr';
  if (/^C\d?$|CAN|CYLINDER/.test(n)) return 'C';
  if (/^GB|GIANT.?B/.test(n)) return 'GB';
  if (/^BR|BRICK/.test(n)) return 'Br';
  if (/^MW|MINI.?W/.test(n)) return 'MW';
  if (/^GW|GIANT.?W/.test(n)) return 'GW';
  if (/^WG|^WING/.test(n)) return 'Wg';
  if (/^TCK|TALL.?C/.test(n)) return 'TCK';
  if (/^CK|CAKE/.test(n)) return 'Ck';
  if (/^MT|MAYA/.test(n)) return 'MT';
  if (/^T\d?$|TEMPLE/.test(n)) return 'T';
  if (/^GP|PLUS|STAR/.test(n)) return 'GP';
  return 'Br';
}

// ręcznie dodany kod! uwaga bo może coś rozjebać!
const addBunkerWithMirror = (bName, pos) => {
    const baType = guessType(bName);
    const heightM = TYPE_H[baType] ?? 0.8;
    const newBunkers = [
      ...editBunkers,
      { id: uid(), name: bName, x: pos.x, y: pos.y, labelOffsetY: -1, baType, heightM }
    ];
    
    // Dodaj lustrzane odbicie, jeśli to nie jest środek pola (x = 0.5)
    if (Math.abs(pos.x - 0.5) > 0.02) {
      newBunkers.push({ 
        id: uid(), 
        name: bName, 
        x: 1 - pos.x, 
        y: pos.y, 
        labelOffsetY: -1,
        baType,
        heightM,
      });
    }
    
    setEditBunkers(newBunkers);
    setPendingBunker(null);
    setBunkerNameInput('');
  };
// koniec ręcznie dodanego kodu - jeśli się wyjebie, usuń to co między komentarzami

  const saveAnnotations = async () => {
    if (!annotateLayout) return;
    await ds.updateLayout(annotateLayout.id, {
      bunkers: editBunkers,
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
      discoLine: annotateDisco / 100,
      zeekerLine: annotateZeeker / 100,
      fieldCalibration: editCalibration,
    });
    setAnnotateLayout(null);
  };

  const handleAddTactic = async () => {
    if (!tacticName.trim() || !tacticModal) return;
    const ref = await ds.addLayoutTactic(tacticModal, {
      name: tacticName.trim(),
      myTeamId: null,
      steps: [{ players: [null,null,null,null,null], shots: [{},{},{},{},{}], assignments: [null,null,null,null,null], description: 'Breakout' }],
    });
    setTacticModal(null);
    setTacticName('');
    navigate(`/layout/${tacticModal}/tactic/${ref.id}`);
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={['Layout Library']} />
      <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, display: 'flex', flexDirection: 'column', gap: R.layout.gap * 2 }}>
        <SectionTitle right={<Btn variant="accent" size="sm" onClick={openAdd}><Icons.Plus /> Layout</Btn>}>
          <Icons.Image /> Layout Library ({layouts.length})
        </SectionTitle>

        {loading && <EmptyState icon="⏳" text="Loading..." />}
        {!loading && !layouts.length && <EmptyState icon="🗺️" text="Add a field layout — reuse it across multiple tournaments" />}

        {layouts.map(l => (
          <div key={l.id} id={`layout-${l.id}`} className="layout-card" style={{ background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: 10, overflow: 'hidden', marginBottom: 8 }}>
            {l.fieldImage && (
              <div style={{ position: 'relative', overflow: 'hidden' }}>
                <img src={l.fieldImage} alt={l.name} style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: device.isMobile ? 180 : device.isTablet ? 320 : 400 }} />
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
              <Btn variant="ghost" size="sm" onClick={() => openAnnotate(l)} title="Edit bunkers & zones">🏷️</Btn>
              <Btn variant="ghost" size="sm" onClick={() => navigate(`/layout/${l.id}/analyze`)} title="Break Analyzer">⚡</Btn>
              <Btn variant="ghost" size="sm" onClick={() => {
                // Set print target and print
                window._printLayoutId = l.id;
                document.querySelectorAll('.layout-card').forEach(el => el.classList.remove('print-area'));
                document.getElementById('layout-' + l.id)?.classList.add('print-area');
                window.print();
              }} title="Print layout">🖨️</Btn>
              <Btn variant="ghost" size="sm" onClick={() => openEdit(l)}><Icons.Edit /></Btn>
              {isAdmin && <Btn variant="ghost" size="sm" title="Admin only" onClick={() => deleteConfirm.ask(l)}><Icons.Trash /></Btn>}
            </div>
            <LayoutTacticsList layoutId={l.id}
              onAdd={() => { setTacticName(''); setTacticModal(l.id); }}
              onOpen={(tacticId) => navigate(`/layout/${l.id}/tactic/${tacticId}`)} />
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal.value !== null} onClose={() => modal.close()} title={modal.is('add') ? 'New layout' : 'Edit layout'}
        footer={<>
          <Btn variant="default" onClick={() => modal.close()}>Cancel</Btn>
          <Btn variant="accent" onClick={handleSave} disabled={!name.trim() || !image}><Icons.Check /> Save</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input value={name} onChange={setName} placeholder="Layout name, e.g. NXL 2026 Event 1" autoFocus />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {LEAGUES.map(l => (
                  <Btn key={l} variant="default" size="sm" active={league === l}
                    style={{ borderColor: league === l ? LEAGUE_COLORS[l] : COLORS.border, color: league === l ? LEAGUE_COLORS[l] : COLORS.textDim }}
                    onClick={() => setLeague(l)}>{l}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Year</div>
              <Select value={year} onChange={v => setYear(Number(v))}>{yearOptions().map(y => <option key={y} value={y}>{y}</option>)}</Select>
            </div>
          </div>
          {/* Image upload */}
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Change image' : 'Upload field image'}
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
          {/* D/Z lines configured in Edit Annotations */}
        </div>
      </Modal>

      {/* Annotation editor modal */}
      <Modal open={!!annotateLayout} onClose={() => setAnnotateLayout(null)} title={`Edit annotations — ${annotateLayout?.name}`}
        footer={<>
          <Btn variant="default" onClick={() => setAnnotateLayout(null)}>Cancel</Btn>
          <Btn variant="accent" onClick={saveAnnotations}><Icons.Check /> Save</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Controls row: modes + zoom */}
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { key: 'bunker',    label: '🏷️', color: '#facc15', name: 'Bunkers' },
              { key: 'danger',    label: '⚠️', color: '#ef4444', name: 'DANGER' },
              { key: 'sajgon',    label: '🌊', color: '#3b82f6', name: 'SAJGON' },
              { key: 'calibrate', label: '📐', color: '#22c55e', name: 'Kalibracja' },
            ].map(m => (
              <Btn key={m.key} variant={annotateMode === m.key ? 'accent' : 'default'} size="sm"
                style={{ borderColor: annotateMode === m.key ? m.color : undefined, color: annotateMode === m.key ? '#000' : m.color }}
                onClick={() => { setAnnotateMode(m.key); setPendingBunker(null); }}>
                {m.label} {m.name}
              </Btn>
            ))}
            <div style={{ flex: 1 }} />
          </div>

          {/* Disco/Zeeker line controls */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#f97316', fontWeight: 700, minWidth: 14 }}>D</span>
              <input type="range" min="10" max="50" value={annotateDisco}
                onChange={e => setAnnotateDisco(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{annotateDisco}%</span>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#3b82f6', fontWeight: 700, minWidth: 14 }}>Z</span>
              <input type="range" min="50" max="95" value={annotateZeeker}
                onChange={e => setAnnotateZeeker(Number(e.target.value))} style={{ flex: 1 }} />
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{annotateZeeker}%</span>
            </div>
          </div>

          {/* Field canvas via FieldEditor — wrapped for calibration overlay */}
          {annotateLayout?.fieldImage && (
            <div ref={calOverlayRef} style={{ position: 'relative', margin: `0 -${R.layout.padding}px` }}>
            <FieldEditor
              hasLines hasBunkers={false} hasZones={false}
              hasVisibility={!!editBunkers.length}
              showVisibility={showVisibility} onShowVisibility={setShowVisibility}
              showZoom
              style={{}}
            >
              <FieldCanvas
                fieldImage={annotateLayout.fieldImage}
                players={[]} shots={[]} bumpStops={[]}
                eliminations={[]} eliminationPositions={[]}
                editable={false}
                discoLine={annotateDisco / 100}
                zeekerLine={annotateZeeker / 100}
                bunkers={editBunkers}
                showBunkers
                dangerZone={editDanger.length >= 3 ? editDanger : null}
                sajgonZone={editSajgon.length >= 3 ? editSajgon : null}
                showZones
                layoutEditMode={annotateMode}
                editDangerPoints={editDanger}
                editSajgonPoints={editSajgon}
                showVisibility={showVisibility}
                visibilityData={vis.visibilityData}
                onVisibilityTap={(bunkerId, pos) => vis.query(bunkerId, pos)}
                onBunkerPlace={(pos) => {
                  const hit = editBunkers.find(b => {
                    const dx = (b.x - pos.x), dy = (b.y - pos.y);
                    return Math.sqrt(dx*dx + dy*dy) < 0.05;
                  });
                  if (hit) { setEditingBunkerId(hit.id); setBunkerNameInput(hit.name); }
                  else { setPendingBunker(pos); }
                }}
                onBunkerMove={(id, pos) => setEditBunkers(prev => {
                  const moved = prev.find(b => b.id === id);
                  if (!moved) return prev;
                  return prev.map(b => {
                    if (b.id === id) return { ...b, x: pos.x, y: pos.y };
                    if (b.name === moved.name && Math.abs(b.x - (1 - moved.x)) < 0.05 && Math.abs(b.y - moved.y) < 0.05)
                      return { ...b, x: 1 - pos.x, y: pos.y };
                    return b;
                  });
                })}
                onBunkerDelete={undefined}
                onBunkerLabelNudge={(id, delta) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? -1) + delta } : b))}
                onBunkerLabelOffset={(id, steps) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: steps } : b))}
                onZonePoint={(pos) => {
                  if (annotateMode === 'danger') setEditDanger(prev => [...prev, pos]);
                  else setEditSajgon(prev => [...prev, pos]);
                }}
                onZoneUndo={() => {
                  if (annotateMode === 'danger') setEditDanger(prev => prev.slice(0, -1));
                  else setEditSajgon(prev => prev.slice(0, -1));
                }}
                onZoneClose={() => {}}
              />
            </FieldEditor>

            {/* ── Calibration overlay — draggable base markers ── */}
            {annotateMode === 'calibrate' && (() => {
              const getCalPos = (e) => {
                const el = calOverlayRef.current;
                if (!el) return null;
                const rect = el.getBoundingClientRect();
                const cx = e.touches ? e.touches[0].clientX : e.clientX;
                const cy = e.touches ? e.touches[0].clientY : e.clientY;
                return {
                  x: Math.max(0, Math.min(1, (cx - rect.left) / rect.width)),
                  y: Math.max(0, Math.min(1, (cy - rect.top) / rect.height)),
                };
              };
              const startDrag = (base, e) => {
                e.preventDefault();
                e.stopPropagation();
                calDragRef.current = base;
              };
              const onMove = (e) => {
                if (!calDragRef.current) return;
                e.preventDefault();
                const pos = getCalPos(e);
                if (pos) setEditCalibration(prev => ({ ...prev, [calDragRef.current]: pos }));
              };
              const onUp = () => { calDragRef.current = null; };

              const { homeBase: hb, awayBase: ab } = editCalibration;
              const dx = ab.x - hb.x, dy = ab.y - hb.y;
              const axisLen = Math.sqrt(dx*dx + dy*dy);
              const mPerN = axisLen > 0.01 ? (45.7 / axisLen).toFixed(2) : '—';

              return (
                <div
                  style={{ position: 'absolute', inset: 0, zIndex: 15, touchAction: 'none', cursor: 'crosshair' }}
                  onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                  onTouchMove={onMove} onTouchEnd={onUp}
                >
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                    {/* Axis line connecting bases */}
                    <line
                      x1={`${hb.x * 100}%`} y1={`${hb.y * 100}%`}
                      x2={`${ab.x * 100}%`} y2={`${ab.y * 100}%`}
                      stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeDasharray="6 4"
                    />
                    {/* Home base — green */}
                    <g
                      style={{ cursor: 'grab' }}
                      onMouseDown={e => startDrag('homeBase', e)}
                      onTouchStart={e => startDrag('homeBase', e)}
                    >
                      <circle cx={`${hb.x * 100}%`} cy={`${hb.y * 100}%`} r="14"
                        fill="rgba(34,197,94,0.25)" stroke="#22c55e" strokeWidth="2" />
                      <circle cx={`${hb.x * 100}%`} cy={`${hb.y * 100}%`} r="4"
                        fill="#22c55e" />
                      <text x={`${hb.x * 100}%`} y={`${hb.y * 100}%`}
                        dy="-18" textAnchor="middle"
                        style={{ fontFamily: 'monospace', fontSize: 10, fill: '#22c55e', fontWeight: 700,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                        🟢 HOME
                      </text>
                    </g>
                    {/* Away base — red */}
                    <g
                      style={{ cursor: 'grab' }}
                      onMouseDown={e => startDrag('awayBase', e)}
                      onTouchStart={e => startDrag('awayBase', e)}
                    >
                      <circle cx={`${ab.x * 100}%`} cy={`${ab.y * 100}%`} r="14"
                        fill="rgba(239,68,68,0.25)" stroke="#ef4444" strokeWidth="2" />
                      <circle cx={`${ab.x * 100}%`} cy={`${ab.y * 100}%`} r="4"
                        fill="#ef4444" />
                      <text x={`${ab.x * 100}%`} y={`${ab.y * 100}%`}
                        dy="-18" textAnchor="middle"
                        style={{ fontFamily: 'monospace', fontSize: 10, fill: '#ef4444', fontWeight: 700,
                          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                        🔴 AWAY
                      </text>
                    </g>
                    {/* Scale badge — middle of axis */}
                    <text
                      x={`${((hb.x + ab.x) / 2) * 100}%`}
                      y={`${((hb.y + ab.y) / 2) * 100}%`}
                      dy="28" textAnchor="middle"
                      style={{ fontFamily: 'monospace', fontSize: 9, fill: '#fff',
                        filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.9))' }}>
                      {mPerN} m/unit · {Math.round(axisLen * 100)}% osi
                    </text>
                  </svg>
                </div>
              );
            })()}

            </div>
          )}

          {/* Calibration info panel */}
          {annotateMode === 'calibrate' && (() => {
            const { homeBase: hb, awayBase: ab } = editCalibration;
            const dx = ab.x - hb.x, dy = ab.y - hb.y;
            const axisLen = Math.sqrt(dx*dx + dy*dy);
            const mPerN = axisLen > 0.01 ? (45.7 / axisLen).toFixed(1) : '—';
            const isCalibrated = axisLen > 0.1;
            return (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: isCalibrated ? COLORS.success + '15' : COLORS.surface,
                border: `1px solid ${isCalibrated ? COLORS.success + '50' : COLORS.border}`,
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                  📐 <strong style={{ color: COLORS.text }}>Kalibracja pola</strong> — przeciągnij markery baz na obrazku
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#22c55e' }}>
                    🟢 Home ({Math.round(hb.x * 100)}%, {Math.round(hb.y * 100)}%)
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: '#ef4444' }}>
                    🔴 Away ({Math.round(ab.x * 100)}%, {Math.round(ab.y * 100)}%)
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: isCalibrated ? COLORS.success : COLORS.textMuted, flex: 1 }}>
                    {isCalibrated
                      ? `✅ ${mPerN} m/jednostkę · oś ${Math.round(axisLen * 100)}% obrazka`
                      : '⚠️ Przesuń markery na końce osi pola (bazy)'}
                  </span>
                  <Btn variant="ghost" size="sm" onClick={() => setEditCalibration({
                    homeBase: { x: 0.05, y: 0.5 },
                    awayBase: { x: 0.95, y: 0.5 },
                  })}>Reset</Btn>
                </div>
              </div>
            );
          })()}

          {/* New bunker name input */}
          {pendingBunker && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px',
              borderRadius: 8, background: COLORS.accent + '10', border: `1px solid ${COLORS.accent}40` }}>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.accent, whiteSpace: 'nowrap' }}>✚ New</span>
              <Input value={bunkerNameInput} onChange={setBunkerNameInput}
                placeholder="e.g. SNAKE, D50..."
                autoFocus onKeyDown={e => {
                  if (e.key === 'Enter' && bunkerNameInput.trim()) addBunkerWithMirror(bunkerNameInput.trim(), pendingBunker);
                  if (e.key === 'Escape') { setPendingBunker(null); setBunkerNameInput(''); }
                }} style={{ flex: 1 }} />
              <Btn variant="accent" size="sm" disabled={!bunkerNameInput.trim()}
                onClick={() => addBunkerWithMirror(bunkerNameInput.trim(), pendingBunker)}>
                <Icons.Check />
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setPendingBunker(null); setBunkerNameInput(''); }}>✕</Btn>
            </div>
          )}

          {/* Bunker list — edit name inline, delete with mirror */}
          {annotateMode === 'bunker' && editBunkers.length > 0 && (
            <div style={{ maxHeight: 160, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, padding: '2px 0' }}>
                {editBunkers.length} bunkers — tap to edit, 🗑 deletes mirror pair
              </div>
              {editBunkers.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px',
                  background: editingBunkerId === b.id ? COLORS.surfaceHover : COLORS.surface, borderRadius: 6 }}>
                  {editingBunkerId === b.id ? (
                    <>
                      <Input value={bunkerNameInput} onChange={setBunkerNameInput} style={{ flex: 1, minHeight: 32 }}
                        autoFocus onKeyDown={e => {
                          if (e.key === 'Enter' && bunkerNameInput.trim()) {
                            const newName = bunkerNameInput.trim();
                            setEditBunkers(prev => prev.map(x => {
                              if (x.id === b.id) return { ...x, name: newName };
                              // Update mirror too
                              if (x.name === b.name && Math.abs(x.x - (1 - b.x)) < 0.05 && Math.abs(x.y - b.y) < 0.05)
                                return { ...x, name: newName };
                              return x;
                            }));
                            setEditingBunkerId(null); setBunkerNameInput('');
                          }
                          if (e.key === 'Escape') { setEditingBunkerId(null); setBunkerNameInput(''); }
                        }} />
                      <Btn variant="accent" size="sm" disabled={!bunkerNameInput.trim()} onClick={() => {
                        const newName = bunkerNameInput.trim();
                        setEditBunkers(prev => prev.map(x => {
                          if (x.id === b.id) return { ...x, name: newName };
                          if (x.name === b.name && Math.abs(x.x - (1 - b.x)) < 0.05 && Math.abs(x.y - b.y) < 0.05)
                            return { ...x, name: newName };
                          return x;
                        }));
                        setEditingBunkerId(null); setBunkerNameInput('');
                      }}><Icons.Check /></Btn>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: '#facc15', flex: 1, cursor: 'pointer' }}
                        onClick={() => { setEditingBunkerId(b.id); setBunkerNameInput(b.name); }}>
                        🏷️ {b.name}
                        <span style={{ color: COLORS.textMuted, fontSize: 10, marginLeft: 4 }}>
                          ({Math.round(b.x * 100)}%,{Math.round(b.y * 100)}%)
                        </span>
                      </span>
                      {/* baType selector */}
                      <select
                        value={b.baType || 'Br'}
                        onChange={e => {
                          const newType = e.target.value;
                          const newH = TYPE_H[newType] ?? 0.8;
                          setEditBunkers(prev => prev.map(x => {
                            if (x.id === b.id) return { ...x, baType: newType, heightM: newH };
                            // update mirror too
                            if (x.name === b.name && Math.abs(x.x - (1 - b.x)) < 0.05 && Math.abs(x.y - b.y) < 0.05)
                              return { ...x, baType: newType, heightM: newH };
                            return x;
                          }));
                        }}
                        style={{
                          background: COLORS.surface, color: COLORS.textDim,
                          border: `1px solid ${COLORS.border}`, borderRadius: 4,
                          fontFamily: FONT, fontSize: 10, padding: '2px 4px',
                          minWidth: 44, maxWidth: 52,
                        }}
                      >
                        {TYPE_ABBREV.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <Btn variant="ghost" size="sm" onClick={() => {
                        setEditBunkers(prev => {
                          const toDelete = new Set([b.id]);
                          prev.forEach(other => {
                            if (other.id !== b.id && other.name === b.name &&
                                Math.abs(other.x - (1 - b.x)) < 0.05 &&
                                Math.abs(other.y - b.y) < 0.05) {
                              toDelete.add(other.id);
                            }
                          });
                          return prev.filter(x => !toDelete.has(x.id));
                        });
                      }}><Icons.Trash /></Btn>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Zone undo/clear */}
          {(annotateMode === 'danger' || annotateMode === 'sajgon') && (
            <div style={{ display: 'flex', gap: 6 }}>
              <Btn variant="ghost" size="sm" onClick={() => {
                if (annotateMode === 'danger') setEditDanger(prev => prev.slice(0, -1));
                else setEditSajgon(prev => prev.slice(0, -1));
              }}>↩ Undo</Btn>
              <Btn variant="ghost" size="sm" onClick={() => {
                if (annotateMode === 'danger') setEditDanger([]);
                else setEditSajgon([]);
              }}><Icons.Trash /> Clear zone</Btn>
              <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, alignSelf: 'center' }}>
                {annotateMode === 'danger' ? editDanger.length : editSajgon.length} points
                {(annotateMode === 'danger' ? editDanger.length : editSajgon.length) >= 3 ? ' ✓' : ' (min 3)'}
              </span>
            </div>
          )}
        </div>
      </Modal>

      {/* Add tactic modal */}
      <Modal open={!!tacticModal} onClose={() => setTacticModal(null)} title="New tactic"
        footer={<>
          <Btn variant="default" onClick={() => setTacticModal(null)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleAddTactic} disabled={!tacticName.trim()}><Icons.Check /> Create</Btn>
        </>}>
        <Input value={tacticName} onChange={setTacticName} placeholder="Tactic name, e.g. Snake Attack"
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
      </Modal>

      <ConfirmModal {...deleteConfirm.modalProps(
        (layout) => handleDelete(layout?.id),
        { title: 'Delete layout?', message: `Delete "${deleteConfirm.value?.name}"?`, confirmLabel: 'Delete' }
      )} />
    </div>
  );
}
