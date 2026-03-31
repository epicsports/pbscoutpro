import React, { useState, useRef } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { Btn, Card, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS , responsive } from '../utils/theme';
import { compressImage, yearOptions, uid } from '../utils/helpers';
import FieldView from '../components/FieldView';

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
  const [modal, setModal] = useState(null); // null | 'add' | { type: 'edit', layout }
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
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
  const [annotateZoom, setAnnotateZoom] = useState(1); // 1 or 2 for mobile magnifier
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

  const openAnnotate = (l) => {
    setAnnotateLayout(l);
    setAnnotateMode('bunker');
    setEditBunkers(l.bunkers ? [...l.bunkers] : []);
    setEditDanger(l.dangerZone ? [...l.dangerZone] : []);
    setEditSajgon(l.sajgonZone ? [...l.sajgonZone] : []);
    setPendingBunker(null); setBunkerNameInput(''); setEditingBunkerId(null);
  };

  const saveAnnotations = async () => {
    if (!annotateLayout) return;
    await ds.updateLayout(annotateLayout.id, {
      bunkers: editBunkers,
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
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
              <Btn variant="ghost" size="sm" onClick={() => {
                // Set print target and print
                window._printLayoutId = l.id;
                document.querySelectorAll('.layout-card').forEach(el => el.classList.remove('print-area'));
                document.getElementById('layout-' + l.id)?.classList.add('print-area');
                window.print();
              }} title="Print layout">🖨️</Btn>
              <Btn variant="ghost" size="sm" onClick={() => openEdit(l)}><Icons.Edit /></Btn>
              <Btn variant="ghost" size="sm" onClick={() => setDeleteConfirm(l)}><Icons.Trash /></Btn>
            </div>
            <LayoutTacticsList layoutId={l.id}
              onAdd={() => { setTacticName(''); setTacticModal(l.id); }}
              onOpen={(tacticId) => navigate(`/layout/${l.id}/tactic/${tacticId}`)} />
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'add' ? 'New layout' : 'Edit layout'}
        footer={<>
          <Btn variant="default" onClick={() => setModal(null)}>Cancel</Btn>
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

      {/* Annotation editor modal */}
      <Modal open={!!annotateLayout} onClose={() => setAnnotateLayout(null)} title={`Edit annotations — ${annotateLayout?.name}`}
        footer={<>
          <Btn variant="default" onClick={() => setAnnotateLayout(null)}>Cancel</Btn>
          <Btn variant="accent" onClick={saveAnnotations}><Icons.Check /> Save</Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Mode selector */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[
              { key: 'bunker', label: '🏷️ Bunkers', color: '#facc15' },
              { key: 'danger', label: '⚠️ DANGER', color: '#ef4444' },
              { key: 'sajgon', label: '🌊 SAJGON', color: '#3b82f6' },
            ].map(m => (
              <Btn key={m.key} variant={annotateMode === m.key ? 'accent' : 'default'} size="sm"
                style={{ flex: 1, justifyContent: 'center', borderColor: annotateMode === m.key ? m.color : undefined, color: annotateMode === m.key ? '#000' : m.color }}
                onClick={() => { setAnnotateMode(m.key); setPendingBunker(null); }}>
                {m.label}
              </Btn>
            ))}
          </div>

          {/* Mobile zoom toggle */}
          {device.isMobile && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setAnnotateZoom(v => v === 1 ? 2 : 1)}
                style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '4px 10px', borderRadius: 6,
                  background: annotateZoom === 2 ? COLORS.accent : COLORS.surfaceLight,
                  color: annotateZoom === 2 ? '#000' : COLORS.text,
                  border: `1px solid ${COLORS.border}`, cursor: 'pointer' }}>
                {annotateZoom === 2 ? '🔍 ×2 ON' : '🔍 ×2'}
              </button>
            </div>
          )}
          {/* Instructions */}
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, padding: '4px 0' }}>
            {annotateMode === 'bunker' && '🏷️ Tap field to place bunker anchor. Drag to move. Tap × to delete.'}
            {annotateMode === 'danger' && '⚠️ Tap to add polygon vertices for DANGER zone. Tap first vertex to close.'}
            {annotateMode === 'sajgon' && '🌊 Tap to add polygon vertices for SAJGON zone. Tap first vertex to close.'}
          </div>

          {/* Field canvas */}
          {annotateLayout?.fieldImage && (
            <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.border}`, maxHeight: device.isMobile ? '55vh' : device.isTablet ? '65vh' : '70vh' }}>
              <FieldView mode="strategy"
                field={{
                  fieldImage: annotateLayout.fieldImage,
                  discoLine: annotateLayout.discoLine || 0.30,
                  zeekerLine: annotateLayout.zeekerLine || 0.80,
                  bunkers: editBunkers,
                  dangerZone: editDanger.length >= 3 ? editDanger : null,
                  sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
                }}
                showBunkers={true}
                showZones={true}
                showLines={true}
                layers={['bunkers', 'zones', 'lines']}
                layoutEditMode={annotateMode}
                editDangerPoints={editDanger}
                editSajgonPoints={editSajgon}
                onBunkerPlace={(pos) => setPendingBunker(pos)}
                onBunkerMove={(id, pos) => setEditBunkers(prev => {
                  const moved = prev.find(b => b.id === id);
                  if (!moved) return prev;
                  return prev.map(b => {
                    if (b.id === id) return { ...b, x: pos.x, y: pos.y };
                    if (b.name === moved.name &&
                        Math.abs(b.x - (1 - moved.x)) < 0.05 &&
                        Math.abs(b.y - moved.y) < 0.05) {
                      return { ...b, x: 1 - pos.x, y: pos.y };
                    }
                    return b;
                  });
                })}
                onBunkerDelete={(id) => setEditBunkers(prev => prev.filter(b => b.id !== id))}
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
            </div>
          )}

          {/* Pending bunker name input */}
          {pendingBunker && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <Input value={bunkerNameInput} onChange={setBunkerNameInput}
                placeholder="Bunker name, e.g. SNAKE, D50..."
                autoFocus onKeyDown={e => {
                  if (e.key === 'Enter' && bunkerNameInput.trim()) {
                    setEditBunkers(prev => [...prev, { id: uid(), name: bunkerNameInput.trim(), x: pendingBunker.x, y: pendingBunker.y }]);
                    setPendingBunker(null); setBunkerNameInput('');
                  }
                  if (e.key === 'Escape') { setPendingBunker(null); setBunkerNameInput(''); }
                }} />
              <Btn variant="accent" size="sm" disabled={!bunkerNameInput.trim()} onClick={() => {
                setEditBunkers(prev => [...prev, { id: uid(), name: bunkerNameInput.trim(), x: pendingBunker.x, y: pendingBunker.y }]);
                setPendingBunker(null); setBunkerNameInput('');
              }}><Icons.Check /></Btn>
              <Btn variant="ghost" size="sm" onClick={() => { setPendingBunker(null); setBunkerNameInput(''); }}>✕</Btn>
            </div>
          )}

          {/* Bunker list with rename + delete */}
          {annotateMode === 'bunker' && editBunkers.length > 0 && (
            <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {editBunkers.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: COLORS.surface, borderRadius: 6 }}>
                  {editingBunkerId === b.id ? (
                    <>
                      <Input value={bunkerNameInput} onChange={setBunkerNameInput} style={{ flex: 1 }}
                        autoFocus onKeyDown={e => {
                          if (e.key === 'Enter' && bunkerNameInput.trim()) {
                            setEditBunkers(prev => prev.map(x => x.id === b.id ? { ...x, name: bunkerNameInput.trim() } : x));
                            setEditingBunkerId(null); setBunkerNameInput('');
                          }
                          if (e.key === 'Escape') { setEditingBunkerId(null); setBunkerNameInput(''); }
                        }} />
                      <Btn variant="accent" size="sm" disabled={!bunkerNameInput.trim()} onClick={() => {
                        setEditBunkers(prev => prev.map(x => x.id === b.id ? { ...x, name: bunkerNameInput.trim() } : x));
                        setEditingBunkerId(null); setBunkerNameInput('');
                      }}><Icons.Check /></Btn>
                    </>
                  ) : (
                    <>
                      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: '#facc15', flex: 1 }}>🏷️ {b.name}</span>
                      <Btn variant="ghost" size="sm" onClick={() => { setEditingBunkerId(b.id); setBunkerNameInput(b.name); }}><Icons.Edit /></Btn>
                      <Btn variant="ghost" size="sm" onClick={() => {
                        // Delete this bunker and its mirror (same name, mirrored X)
                        setEditBunkers(prev => {
                          const toDelete = new Set([b.id]);
                          // Find mirror: same name, x ≈ 1 - b.x, y ≈ b.y
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

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete layout?"
        footer={<>
          <Btn variant="default" onClick={() => setDeleteConfirm(null)}>Cancel</Btn>
          <Btn variant="danger" onClick={() => handleDelete(deleteConfirm?.id)}><Icons.Trash /> Delete</Btn>
        </>}>
        <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.textDim }}>
          Delete <strong style={{ color: COLORS.text }}>{deleteConfirm?.name}</strong>?
        </div>
      </Modal>
    </div>
  );
}
