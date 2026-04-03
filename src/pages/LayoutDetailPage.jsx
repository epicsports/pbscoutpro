/**
 * LayoutDetailPage — map editing pattern per LAYOUT_REDESIGN_V2.md
 * Route: /layout/:layoutId
 *
 * Structure:
 *   Top:    thumbnail + name + league/year + edit button
 *   Middle: toggle row + ONE full-width canvas
 *   Bottom: [Setup] [Taktyki] action buttons
 *   Overlay: BunkerCard bottom sheet (tap bunker or empty space)
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import { useTrackedSave } from '../hooks/useSaveStatus';

import FieldCanvas from '../components/FieldCanvas';
import BunkerCard, { BUNKER_TYPES, typeData, guessType, GROUP_COLOR, GROUP_LABEL } from '../components/BunkerCard';
import { Btn, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import { compressImage, yearOptions, uid } from '../utils/helpers';

export default function LayoutDetailPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts, loading: layoutsLoading } = useLayouts();
  const { tactics, loading: tacticsLoading } = useLayoutTactics(layoutId);
  const { workspace } = useWorkspace();
  const tracked = useTrackedSave();

  const layout = layouts?.find(l => l.id === layoutId);

  // ── Editable state ──
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);
  const [editBunkers, setEditBunkers] = useState([]);
  const [editDanger, setEditDanger] = useState([]);
  const [editSajgon, setEditSajgon] = useState([]);
  const [calibration, setCalibration] = useState({ homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // ── Toggle state ──
  const [showBunkers, setShowBunkers] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showZones, setShowZones] = useState(false);
  const [zoom, setZoom] = useState(false);

  // ── UI state ──
  const [infoModal, setInfoModal] = useState(false);
  const [setupModal, setSetupModal] = useState(false);
  const [zoneEditMode, setZoneEditMode] = useState(null); // null | 'danger' | 'sajgon'
  const [tacticsSheet, setTacticsSheet] = useState(false);
  const [newTacticName, setNewTacticName] = useState('');
  const [newTacticModal, setNewTacticModal] = useState(false);

  // ── BunkerCard state ──
  const [bunkerCardOpen, setBunkerCardOpen] = useState(false);
  const [selectedBunker, setSelectedBunker] = useState(null); // existing bunker obj
  const [newBunkerPos, setNewBunkerPos] = useState(null);     // {x,y} for new

  // ── Calibration drag ──
  const calDragRef = useRef(null);
  const calContainerRef = useRef(null);

  // ── Populate from layout ──
  useEffect(() => {
    if (!layout) return;
    setName(layout.name || '');
    setLeague(layout.league || 'NXL');
    setYear(layout.year || new Date().getFullYear());
    setImage(layout.fieldImage || null);
    setDisco(Math.round((layout.discoLine ?? 0.30) * 100));
    setZeeker(Math.round((layout.zeekerLine ?? 0.80) * 100));
    setEditBunkers(layout.bunkers ? [...layout.bunkers] : []);
    setEditDanger(layout.dangerZone ? [...layout.dangerZone] : []);
    setEditSajgon(layout.sajgonZone ? [...layout.sajgonZone] : []);
    setCalibration(layout.fieldCalibration || { homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } });
  }, [layout?.id]);

  // ── Save handlers ──
  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result, 1200);
      setImage(compressed);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveInfo = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await tracked(() => ds.updateLayout(layoutId, {
      name: name.trim(), league, year: Number(year), fieldImage: image,
      discoLine: disco / 100, zeekerLine: zeeker / 100,
    }));
    setSaving(false);
    setInfoModal(false);
  };

  const handleSaveSetup = async () => {
    setSaving(true);
    await tracked(() => ds.updateLayout(layoutId, {
      discoLine: disco / 100, zeekerLine: zeeker / 100,
      bunkers: editBunkers,
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
      fieldCalibration: calibration,
    }));
    setSaving(false);
    setSetupModal(false);
  };

  // ── BunkerCard handlers ──
  const handleBunkerTap = (pos) => {
    const hit = editBunkers.find(b => {
      const dx = b.x - pos.x, dy = b.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05;
    });
    if (hit) {
      setSelectedBunker(hit);
      setNewBunkerPos(null);
      setBunkerCardOpen(true);
    } else {
      setSelectedBunker(null);
      setNewBunkerPos(pos);
      setBunkerCardOpen(true);
    }
  };

  const handleBunkerSave = (data, doMirror) => {
    if (selectedBunker) {
      // Update existing + mirror
      setEditBunkers(prev => prev.map(b => {
        if (b.id === selectedBunker.id) return { ...b, ...data };
        if (b.name === selectedBunker.name && Math.abs(b.x - (1 - selectedBunker.x)) < 0.05 && Math.abs(b.y - selectedBunker.y) < 0.05)
          return { ...b, ...data };
        return b;
      }));
    } else if (newBunkerPos) {
      // Add new
      const newList = [...editBunkers, { id: uid(), ...data, x: newBunkerPos.x, y: newBunkerPos.y }];
      if (doMirror && Math.abs(newBunkerPos.x - 0.5) > 0.02) {
        newList.push({ id: uid(), ...data, x: 1 - newBunkerPos.x, y: newBunkerPos.y });
      }
      setEditBunkers(newList);
    }
    // Auto-save bunkers to Firestore
    setTimeout(async () => {
      await tracked(() => ds.updateLayout(layoutId, { bunkers: editBunkers }));
    }, 100);
  };

  const handleBunkerDelete = (b) => {
    setEditBunkers(prev => {
      const toDelete = new Set([b.id]);
      prev.forEach(other => {
        if (other.id !== b.id && other.name === b.name &&
            Math.abs(other.x - (1 - b.x)) < 0.05 && Math.abs(other.y - b.y) < 0.05)
          toDelete.add(other.id);
      });
      const result = prev.filter(x => !toDelete.has(x.id));
      tracked(() => ds.updateLayout(layoutId, { bunkers: result }));
      return result;
    });
  };

  // ── Calibration drag ──
  const getCalPos = useCallback((e) => {
    const el = calContainerRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const cy = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    return { x: Math.max(0, Math.min(1, cx / rect.width)), y: Math.max(0, Math.min(1, cy / rect.height)) };
  }, []);
  const handleCalMove = useCallback((e) => {
    if (!calDragRef.current) return; e.preventDefault();
    const pos = getCalPos(e); if (!pos) return;
    setCalibration(prev => ({ ...prev, [calDragRef.current]: pos }));
  }, [getCalPos]);
  const handleCalUp = useCallback(() => { calDragRef.current = null; }, []);

  // ── Tactic ──
  const handleAddTactic = async () => {
    if (!newTacticName.trim()) return;
    const E5 = [null, null, null, null, null];
    const E5A = [[], [], [], [], []];
    try {
      const ref = await ds.addLayoutTactic(layoutId, {
        name: newTacticName.trim(),
        steps: [{ players: E5, shots: E5A, assignments: E5, bumps: E5, description: 'Breakout' }],
      });
      setNewTacticModal(false); setNewTacticName('');
      navigate(`/layout/${layoutId}/tactic/${ref.id}`);
    } catch (e) {
      console.error('Create tactic failed:', e);
      alert('Nie udało się utworzyć taktyki. Wyloguj się i zaloguj ponownie.');
    }
  };

  if (layoutsLoading) return <SkeletonList count={4} />;
  if (!layout) return <EmptyState icon="❓" text="Layout nie znaleziony" />;

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column', paddingBottom: 60 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
        background: COLORS.surface, position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div onClick={() => navigate('/layouts')}
          style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: COLORS.accent }}>
          <Icons.Back />
          <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 500 }}>Layouts</span>
        </div>
      </div>

      {/* ═══ TOP: Thumbnail + Info + Edit ═══ */}
      <div style={{ display: 'flex', gap: 12, padding: '10px 14px', alignItems: 'center', borderBottom: `1px solid ${COLORS.border}20` }}>
        {image && (
          <img src={image} alt="" style={{ width: 48, height: 36, objectFit: 'cover', borderRadius: 6, border: `1px solid ${COLORS.border}`, flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name}
          </div>
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, display: 'flex', gap: 6, alignItems: 'center' }}>
            <LeagueBadge league={league} /> <YearBadge year={year} /> · {editBunkers.length} bunkrów
          </div>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => setInfoModal(true)}>
          <Icons.Edit />
        </Btn>
      </div>

      {/* ═══ MIDDLE: Toggle row + Canvas ═══ */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toggle row */}
        <div style={{ display: 'flex', gap: 10, padding: '6px 14px', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Nazwy', checked: showBunkers, toggle: () => setShowBunkers(v => !v) },
            { label: 'Linie', checked: showLines, toggle: () => setShowLines(v => !v) },
            { label: 'Strefy', checked: showZones, toggle: () => setShowZones(v => !v) },
          ].map(({ label, checked, toggle }) => (
            <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs, color: checked ? COLORS.text : COLORS.textDim }}>
              <input type="checkbox" checked={checked} onChange={toggle} style={{ accentColor: COLORS.accent }} />
              {label}
            </label>
          ))}
          <div style={{ flex: 1 }} />
          <Btn variant={zoom ? 'accent' : 'default'} size="sm" onClick={() => setZoom(v => !v)} style={{ padding: '0 8px', minWidth: 32 }}>
            <Icons.Zoom />
          </Btn>
        </div>

        {/* Zone edit bar — shows when drawing zones */}
        {zoneEditMode && (
          <div style={{
            display: 'flex', gap: 6, padding: '6px 14px', alignItems: 'center',
            background: zoneEditMode === 'danger' ? '#ef444420' : '#f59e0b20',
            borderRadius: 6, margin: '0 14px 4px',
          }}>
            <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, fontWeight: 700,
              color: zoneEditMode === 'danger' ? '#ef4444' : '#f59e0b', flex: 1 }}>
              ✏️ Rysuj {zoneEditMode === 'danger' ? 'Danger' : 'Sajgon'} — klikaj punkty na polu
            </span>
            <Btn size="sm" variant="default" onClick={() => {
              if (zoneEditMode === 'danger') setEditDanger(prev => prev.slice(0, -1));
              else setEditSajgon(prev => prev.slice(0, -1));
            }}>↩ Cofnij</Btn>
            <Btn size="sm" variant="default" onClick={() => {
              if (zoneEditMode === 'danger') setEditDanger([]);
              else setEditSajgon([]);
            }}>🗑 Wyczyść</Btn>
            <Btn size="sm" variant="accent" onClick={() => setZoneEditMode(null)}>✓ OK</Btn>
          </div>
        )}

        {/* THE canvas */}
        <div style={{ flex: 1, padding: '0 14px', position: 'relative' }}>
          <div style={{
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{ width: zoom ? '200%' : '100%', marginLeft: zoom ? '-50%' : '0' }}>
              <FieldCanvas
                fieldImage={image}
                players={[]} shots={[]} bumpStops={[]}
                eliminations={[]} eliminationPositions={[]}
                editable={false}
                discoLine={showLines ? disco / 100 : 0}
                zeekerLine={showLines ? zeeker / 100 : 0}
                bunkers={editBunkers}
                showBunkers={showBunkers}
                dangerZone={editDanger.length >= 3 ? editDanger : null}
                sajgonZone={editSajgon.length >= 3 ? editSajgon : null}
                showZones={showZones || !!zoneEditMode}
                layoutEditMode={zoneEditMode || 'bunker'}
                editDangerPoints={zoneEditMode === 'danger' ? editDanger : []}
                editSajgonPoints={zoneEditMode === 'sajgon' ? editSajgon : []}
                onBunkerPlace={handleBunkerTap}
                onZonePoint={pos => {
                  if (zoneEditMode === 'danger') setEditDanger(prev => [...prev, pos]);
                  else if (zoneEditMode === 'sajgon') setEditSajgon(prev => [...prev, pos]);
                }}
                onZoneUndo={() => {
                  if (zoneEditMode === 'danger') setEditDanger(prev => prev.slice(0, -1));
                  else if (zoneEditMode === 'sajgon') setEditSajgon(prev => prev.slice(0, -1));
                }}
                onZoneClose={() => {}}
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
                onBunkerLabelNudge={(id, delta) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? -1) + delta } : b))}
                onBunkerLabelOffset={(id, steps) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: steps } : b))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ═══ BOTTOM: Action buttons — FIXED at bottom ═══ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', gap: 8, padding: '10px 14px',
        background: COLORS.bg,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        zIndex: 40,
        maxWidth: R.layout.maxWidth || 640,
        margin: '0 auto',
      }}>
        <Btn variant="default" onClick={() => setSetupModal(true)} style={{ flex: 1, justifyContent: 'center' }}>
          ⚙️ Setup
        </Btn>
        <Btn variant="default" onClick={() => setTacticsSheet(true)} style={{ flex: 1, justifyContent: 'center' }}>
          ⚔️ Taktyki ({tactics.length})
        </Btn>
      </div>

      {/* ═══ BUNKER CARD (bottom sheet) ═══ */}
      {bunkerCardOpen && (
        <BunkerCard
          bunker={selectedBunker}
          isNew={!selectedBunker}
          position={newBunkerPos}
          onSave={handleBunkerSave}
          onDelete={handleBunkerDelete}
          onClose={() => setBunkerCardOpen(false)}
        />
      )}

      {/* ═══ INFO MODAL ═══ */}
      <Modal open={infoModal} onClose={() => setInfoModal(false)} title="Edytuj layout"
        footer={<>
          <Btn variant="default" onClick={() => setInfoModal(false)}>Anuluj</Btn>
          <Btn variant="accent" disabled={!name.trim() || saving} onClick={handleSaveInfo}>
            <Icons.Check /> Zapisz
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input value={name} onChange={setName} placeholder="Nazwa layoutu *" />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>Liga</div>
              <div style={{ display: 'flex', gap: 4 }}>
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
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Zmień zdjęcie' : 'Wgraj zdjęcie pola'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ SETUP MODAL ═══ */}
      <Modal open={setupModal} onClose={() => setSetupModal(false)} title="⚙️ Setup"
        footer={<>
          <Btn variant="default" onClick={() => setSetupModal(false)}>Zamknij</Btn>
          <Btn variant="accent" disabled={saving} onClick={handleSaveSetup}>
            <Icons.Check /> Zapisz
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Disco/Zeeker */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Linie</div>
            {[
              { label: 'Disco', color: '#f97316', value: disco, set: setDisco, min: 10, max: 50 },
              { label: 'Zeeker', color: '#3b82f6', value: zeeker, set: setZeeker, min: 50, max: 95 },
            ].map(({ label, color, value, set, min, max }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color, fontWeight: 700, minWidth: 48 }}>{label}</span>
                <input type="range" min={min} max={max} value={value}
                  onChange={e => set(Number(e.target.value))}
                  style={{ flex: 1, accentColor: color }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{value}%</span>
              </div>
            ))}
          </div>

          {/* Calibration mini */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Kalibracja baz</div>
            {image && (
              <div ref={calContainerRef} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.accent}40` }}
                onMouseMove={handleCalMove} onMouseUp={handleCalUp} onMouseLeave={handleCalUp}
                onTouchMove={handleCalMove} onTouchEnd={handleCalUp}>
                <img src={image} alt="calibrate" style={{ width: '100%', display: 'block', objectFit: 'contain', maxHeight: 160 }} />
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                  <line x1={`${calibration.homeBase.x * 100}%`} y1={`${calibration.homeBase.y * 100}%`}
                    x2={`${calibration.awayBase.x * 100}%`} y2={`${calibration.awayBase.y * 100}%`}
                    stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4" />
                  {[{ key: 'homeBase', color: '#22c55e', label: 'HOME' }, { key: 'awayBase', color: '#ef4444', label: 'AWAY' }].map(({ key, color, label }) => (
                    <g key={key} style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      onMouseDown={e => { e.preventDefault(); calDragRef.current = key; }}
                      onTouchStart={e => { e.preventDefault(); calDragRef.current = key; }}>
                      <circle cx={`${calibration[key].x * 100}%`} cy={`${calibration[key].y * 100}%`}
                        r="12" fill={color + '30'} stroke={color} strokeWidth="2" />
                      <circle cx={`${calibration[key].x * 100}%`} cy={`${calibration[key].y * 100}%`}
                        r="3" fill={color} />
                      <text x={`${calibration[key].x * 100}%`} y={`${calibration[key].y * 100}%`}
                        dy="-16" textAnchor="middle"
                        style={{ fontFamily: 'monospace', fontSize: 9, fill: color, fontWeight: 700, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}>
                        {label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
          </div>

          {/* Zone editing */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>Strefy</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <Btn variant={zoneEditMode === 'danger' ? 'accent' : 'default'} size="sm"
                onClick={() => { setZoneEditMode(zoneEditMode === 'danger' ? null : 'danger'); setSetupModal(false); }}>
                🔴 Danger {editDanger.length ? `(${editDanger.length} pkt)` : ''}
              </Btn>
              <Btn variant={zoneEditMode === 'sajgon' ? 'accent' : 'default'} size="sm"
                onClick={() => { setZoneEditMode(zoneEditMode === 'sajgon' ? null : 'sajgon'); setSetupModal(false); }}>
                🟡 Sajgon {editSajgon.length ? `(${editSajgon.length} pkt)` : ''}
              </Btn>
            </div>
            <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, marginTop: 4 }}>
              Kliknij i rysuj na polu. Punkty tworzą wielokąt.
            </div>
          </div>
        </div>
      </Modal>

      {/* ═══ TACTICS BOTTOM SHEET ═══ */}
      {tacticsSheet && (
        <>
          <div onClick={() => setTacticsSheet(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
            zIndex: 90, animation: 'fadeIn 0.15s ease-out',
          }} />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
            borderRadius: '14px 14px 0 0', padding: '8px 16px 16px',
            paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
            zIndex: 91, animation: 'slideUp 0.2s ease-out',
            maxHeight: '60vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
                ⚔️ Taktyki ({tactics.length})
              </div>
              <Btn variant="accent" size="sm" onClick={() => { setTacticsSheet(false); setNewTacticModal(true); }}>
                <Icons.Plus /> Nowa
              </Btn>
            </div>
            {tacticsLoading && <SkeletonList count={2} />}
            {!tacticsLoading && !tactics.length && (
              <EmptyState icon="⚔️" text="Brak taktyk" />
            )}
            {tactics.map(t => (
              <div key={t.id}
                onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                  marginBottom: 6, cursor: 'pointer', minHeight: TOUCH.minTarget,
                }}>
                <span style={{ fontSize: 18 }}>⚔️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontBase, color: COLORS.text, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                    {t.steps?.length || 0} kroków
                  </div>
                </div>
                <Btn variant="ghost" size="sm"
                  onClick={e => { e.stopPropagation(); ds.deleteLayoutTactic(layoutId, t.id); }}>
                  <Icons.Trash />
                </Btn>
                <Icons.ChevronRight />
              </div>
            ))}
          </div>
        </>
      )}

      {/* New tactic modal */}
      <Modal open={newTacticModal} onClose={() => setNewTacticModal(false)} title="Nowa taktyka"
        footer={<>
          <Btn variant="default" onClick={() => setNewTacticModal(false)}>Anuluj</Btn>
          <Btn variant="accent" disabled={!newTacticName.trim()} onClick={handleAddTactic}><Icons.Check /> Utwórz</Btn>
        </>}>
        <Input value={newTacticName} onChange={setNewTacticName} placeholder="Nazwa taktyki, np. Snake Attack"
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
      </Modal>
    </div>
  );
}
