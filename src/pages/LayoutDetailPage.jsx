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
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import { useTrackedSave } from '../hooks/useSaveStatus';

import FieldCanvas from '../components/FieldCanvas';
import BunkerCard, { BUNKER_TYPES, typeData, guessType, GROUP_COLOR, GROUP_LABEL } from '../components/BunkerCard';
import OCRBunkerDetect from '../components/OCRBunkerDetect';
import PageHeader from '../components/PageHeader';
import ModeTabBar from '../components/ModeTabBar';
import { Btn, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, Checkbox } from '../components/ui';
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

  // ── UI state ──
  const [infoModal, setInfoModal] = useState(false);
  const [activeMode, setActiveMode] = useState('preview'); // preview|bunkers|lines|calibrate|zones|tactics
  const [zoneEditMode, setZoneEditMode] = useState(null); // null | 'danger' | 'sajgon'
  const [newTacticName, setNewTacticName] = useState('');
  const [newTacticModal, setNewTacticModal] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);

  // Landscape detection
  const [isLandscape, setIsLandscape] = useState(() => window.innerWidth > window.innerHeight);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: landscape)');
    const handler = (e) => setIsLandscape(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

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

  // Validate bunker positions (clamp to 0-1)
  const clampBunkers = (list) => list.map(b => ({
    ...b,
    x: Math.max(0, Math.min(1, b.x)),
    y: Math.max(0, Math.min(1, b.y)),
  }));

  // Auto-save layout data (lines, bunkers, zones, calibration)
  const saveLayoutData = useCallback(async () => {
    await tracked(() => ds.updateLayout(layoutId, {
      discoLine: disco / 100, zeekerLine: zeeker / 100,
      bunkers: clampBunkers(editBunkers),
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
      fieldCalibration: calibration,
    }));
  }, [layoutId, disco, zeeker, editBunkers, editDanger, editSajgon, calibration]);

  // Auto-save on mode switch (debounced)
  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    if (layout) saveTimerRef.current = setTimeout(saveLayoutData, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [disco, zeeker, editBunkers.length, editDanger.length, editSajgon.length, calibration.homeBase.x, calibration.awayBase.x]);

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
      alert('Failed to create tactic. Log out and log in again.');
    }
  };

  if (layoutsLoading) return <SkeletonList count={4} />;
  if (!layout) return <EmptyState icon="❓" text="Layout not found" />;

  const MODES = [
    { id: 'preview', icon: '👁', label: 'Preview' },
    { id: 'bunkers', icon: '🏷', label: 'Bunkers' },
    { id: 'lines', icon: '⚙️', label: 'Lines' },
    { id: 'calibrate', icon: '📐', label: 'Calib.' },
    { id: 'zones', icon: '⚠️', label: 'Zones' },
    { id: 'tactics', icon: '⚔️', label: `Tactics (${tactics.length})` },
  ];

  const canvasEditMode = activeMode === 'bunkers' ? 'bunker' : activeMode === 'zones' ? zoneEditMode : null;

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ HEADER ═══ */}
      <PageHeader
        back={{ label: 'Layouts', to: '/layouts' }}
        title={name}
        badges={<><LeagueBadge league={league} /> <YearBadge year={year} /></>}
        subtitle={`${editBunkers.length} bunkers`}
        right={<Btn variant="ghost" size="sm" onClick={() => setInfoModal(true)}><Icons.Edit /></Btn>}
      />

      {/* ═══ CANVAS ═══ */}
      <div style={{ flex: 1, padding: '4px 14px 0', position: 'relative' }}>
        <FieldCanvas
          fieldImage={image}
          players={[]} shots={[]} bumpStops={[]}
          eliminations={[]} eliminationPositions={[]}
          editable={false}
          selectedBunkerId={selectedBunker?.id || null}
          discoLine={showLines ? disco / 100 : 0}
          zeekerLine={showLines ? zeeker / 100 : 0}
          bunkers={editBunkers}
          showBunkers={showBunkers}
          dangerZone={editDanger.length >= 3 ? editDanger : null}
          sajgonZone={editSajgon.length >= 3 ? editSajgon : null}
          showZones={showZones || !!zoneEditMode}
          layoutEditMode={canvasEditMode}
          editDangerPoints={zoneEditMode === 'danger' ? editDanger : []}
          editSajgonPoints={zoneEditMode === 'sajgon' ? editSajgon : []}
          onBunkerPlace={activeMode === 'bunkers' ? handleBunkerTap : undefined}
          onZonePoint={pos => {
            if (zoneEditMode === 'danger') setEditDanger(prev => [...prev, pos]);
            else if (zoneEditMode === 'sajgon') setEditSajgon(prev => [...prev, pos]);
          }}
          onZoneUndo={() => {
            if (zoneEditMode === 'danger') setEditDanger(prev => prev.slice(0, -1));
            else if (zoneEditMode === 'sajgon') setEditSajgon(prev => prev.slice(0, -1));
          }}
          onZoneClose={() => {}}
          onBunkerMove={activeMode === 'bunkers' ? (id, pos) => setEditBunkers(prev => {
            const moved = prev.find(b => b.id === id);
            if (!moved) return prev;
            return prev.map(b => {
              if (b.id === id) return { ...b, x: pos.x, y: pos.y };
              if (b.name === moved.name && Math.abs(b.x - (1 - moved.x)) < 0.05 && Math.abs(b.y - moved.y) < 0.05)
                return { ...b, x: 1 - pos.x, y: pos.y };
              return b;
            });
          }) : undefined}
          onBunkerLabelNudge={(id, delta) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? -1) + delta } : b))}
          onBunkerLabelOffset={(id, steps) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: steps } : b))}
        />
      </div>

      {/* ═══ MODE PANEL (below canvas, max 30% screen) ═══ */}
      <div style={{ maxHeight: '30vh', overflowY: 'auto', padding: '8px 14px', borderTop: `1px solid ${COLORS.border}30` }}>

        {/* 👁 Preview */}
        {activeMode === 'preview' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <Checkbox label="Labels" checked={showBunkers} onChange={v => setShowBunkers(v)} />
            <Checkbox label="Lines" checked={showLines} onChange={v => setShowLines(v)} />
            <Checkbox label="Zones" checked={showZones} onChange={v => setShowZones(v)} />
            <div style={{ flex: 1 }} />
            <Btn variant="default" size="sm" onClick={() => {
              const canvas = document.querySelector('canvas');
              if (!canvas) return;
              if (navigator.share) {
                canvas.toBlob(blob => navigator.share({ files: [new File([blob], `${name}.png`, { type: 'image/png' })] }).catch(() => {}));
              } else { const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = `${name}.png`; a.click(); }
            }}>📤</Btn>
            <Btn variant="default" size="sm" onClick={() => {
              if (navigator.share) navigator.share({ title: name, url: window.location.href }).catch(() => {});
              else navigator.clipboard?.writeText(window.location.href).then(() => alert('Link copied!'));
            }}>🔗</Btn>
          </div>
        )}

        {/* 🏷 Bunkers */}
        {activeMode === 'bunkers' && (
          <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
            Tap on field to add bunker · {editBunkers.length} bunkers
            <Btn variant="default" size="sm" onClick={() => setOcrOpen(true)} style={{ marginLeft: 8 }}>🔍 OCR</Btn>
          </div>
        )}

        {/* ⚙️ Lines */}
        {activeMode === 'lines' && (
          <div>
            {[
              { label: 'Disco', color: '#f97316', value: disco, set: setDisco, min: 10, max: 50 },
              { label: 'Zeeker', color: '#3b82f6', value: zeeker, set: setZeeker, min: 50, max: 95 },
            ].map(({ label, color, value, set, min, max }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color, fontWeight: 700, minWidth: 48 }}>{label}</span>
                <input type="range" min={min} max={max} value={value}
                  onChange={e => set(Number(e.target.value))} style={{ flex: 1, accentColor: color }} />
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{value}%</span>
              </div>
            ))}
          </div>
        )}

        {/* 📐 Calibration */}
        {activeMode === 'calibrate' && (
          <div>
            <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 6 }}>
              Drag HOME/AWAY markers on canvas
            </div>
            {image && (
              <div ref={calContainerRef} style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.accent}40`, maxHeight: 120 }}
                onMouseMove={handleCalMove} onMouseUp={handleCalUp} onMouseLeave={handleCalUp}
                onTouchMove={handleCalMove} onTouchEnd={handleCalUp}>
                <img src={image} alt="" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
                  {[{ key: 'homeBase', color: '#22c55e', label: 'H' }, { key: 'awayBase', color: '#ef4444', label: 'A' }].map(({ key, color, label }) => (
                    <g key={key} style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      onMouseDown={e => { e.preventDefault(); calDragRef.current = key; }}
                      onTouchStart={e => { e.preventDefault(); calDragRef.current = key; }}>
                      <circle cx={`${calibration[key].x * 100}%`} cy={`${calibration[key].y * 100}%`}
                        r="10" fill={color + '30'} stroke={color} strokeWidth="2" />
                      <text x={`${calibration[key].x * 100}%`} y={`${calibration[key].y * 100}%`}
                        dy="-14" textAnchor="middle" style={{ fontFamily: 'monospace', fontSize: 9, fill: color, fontWeight: 700 }}>{label}</text>
                    </g>
                  ))}
                </svg>
              </div>
            )}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              <Btn size="sm" variant="ghost" onClick={() => setCalibration({ homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } })}>Reset</Btn>
              <Btn size="sm" variant="default" onClick={() => setOcrOpen(true)}>🔍 OCR</Btn>
            </div>
          </div>
        )}

        {/* ⚠️ Zones */}
        {activeMode === 'zones' && (
          <div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <Btn variant={zoneEditMode === 'danger' ? 'accent' : 'default'} size="sm"
                onClick={() => setZoneEditMode(zoneEditMode === 'danger' ? null : 'danger')}>
                🔴 Danger {editDanger.length ? `(${editDanger.length})` : ''}
              </Btn>
              <Btn variant={zoneEditMode === 'sajgon' ? 'accent' : 'default'} size="sm"
                onClick={() => setZoneEditMode(zoneEditMode === 'sajgon' ? null : 'sajgon')}>
                🟡 Sajgon {editSajgon.length ? `(${editSajgon.length})` : ''}
              </Btn>
              {zoneEditMode && <>
                <Btn size="sm" variant="ghost" onClick={() => { if (zoneEditMode === 'danger') setEditDanger(p => p.slice(0,-1)); else setEditSajgon(p => p.slice(0,-1)); }}>↩</Btn>
                <Btn size="sm" variant="ghost" onClick={() => { if (zoneEditMode === 'danger') setEditDanger([]); else setEditSajgon([]); }}>🗑</Btn>
              </>}
            </div>
            {zoneEditMode && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>Tap points on canvas to draw polygon</div>}
          </div>
        )}

        {/* ⚔️ Tactics */}
        {activeMode === 'tactics' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontSm, color: COLORS.text, flex: 1 }}>Tactics ({tactics.length})</span>
              <Btn variant="accent" size="sm" onClick={() => setNewTacticModal(true)}><Icons.Plus /> New</Btn>
            </div>
            {tacticsLoading && <SkeletonList count={2} />}
            {!tacticsLoading && !tactics.length && <EmptyState icon="⚔️" text="No tactics yet" />}
            {tactics.map(t => (
              <div key={t.id} onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, marginBottom: 4, cursor: 'pointer', minHeight: 40 }}>
                <span style={{ fontSize: 14 }}>⚔️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: COLORS.text, fontWeight: 600 }}>{t.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>{t.steps?.length || 0} steps</div>
                </div>
                <Btn variant="ghost" size="sm" onClick={e => { e.stopPropagation(); ds.deleteLayoutTactic(layoutId, t.id); }}><Icons.Trash /></Btn>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ MODE TABS ═══ */}
      <ModeTabBar modes={MODES} activeMode={activeMode}
        onModeChange={id => { setActiveMode(id); if (id !== 'zones') setZoneEditMode(null); }} />

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
      <Modal open={infoModal} onClose={() => setInfoModal(false)} title="Edit layout"
        footer={<>
          <Btn variant="default" onClick={() => setInfoModal(false)}>Cancel</Btn>
          <Btn variant="accent" disabled={!name.trim() || saving} onClick={handleSaveInfo}>
            <Icons.Check /> Save
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input value={name} onChange={setName} placeholder="Layout name *" />
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>League</div>
              <div style={{ display: 'flex', gap: 4 }}>
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
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? 'Change image' : 'Upload field image'}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* Setup modal + Tactics sheet removed — replaced by mode tabs */}

      {/* New tactic modal */}
      <Modal open={newTacticModal} onClose={() => setNewTacticModal(false)} title="New tactic"
        footer={<>
          <Btn variant="default" onClick={() => setNewTacticModal(false)}>Cancel</Btn>
          <Btn variant="accent" disabled={!newTacticName.trim()} onClick={handleAddTactic}><Icons.Check /> Create</Btn>
        </>}>
        <Input value={newTacticName} onChange={setNewTacticName} placeholder="Tactic name, e.g. Snake Attack"
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
      </Modal>

      {/* OCR bunker detection */}
      {ocrOpen && (
        <OCRBunkerDetect
          image={image}
          onAccept={(bunkers) => {
            setEditBunkers(prev => [...prev, ...bunkers]);
            tracked(() => ds.updateLayout(layoutId, { bunkers: [...editBunkers, ...bunkers] }));
          }}
          onClose={() => setOcrOpen(false)}
        />
      )}
    </div>
  );
}
