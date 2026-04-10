/**
 * LayoutDetailPage — single scrollable page per CC_BRIEF_LAYOUT_REDESIGN Part 2
 * Route: /layout/:layoutId
 *
 * Structure: PageHeader → FieldCanvas → Toggle row → Tactics list → Sticky New tactic
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import { useTrackedSave } from '../hooks/useSaveStatus';

import FieldCanvas from '../components/FieldCanvas';
import BunkerCard from '../components/BunkerCard';
import OCRBunkerDetect from '../components/OCRBunkerDetect';
import PageHeader from '../components/PageHeader';
import { Btn, Card, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, Checkbox, ActionSheet, MoreBtn, ConfirmModal, SectionTitle } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import CalibrationView from '../components/CalibrationView';
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
  const canvasContainerRef = useRef(null);
  const dragRef = useRef(null); // { type: 'disco'|'zeeker', startY, startVal }

  // ── Toggle state ──
  const [showLabels, setShowLabels] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [showZones, setShowZones] = useState(false);
  const [showHalf, setShowHalf] = useState(false); // show only left 55% of labels

  // ── UI state ──
  const [infoModal, setInfoModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mirrorModal, setMirrorModal] = useState(false);
  const [calibModal, setCalibModal] = useState(false);
  const [calibData, setCalibData] = useState(null);
  const [calibDoritoSide, setCalibDoritoSide] = useState('top');
  const [ocrOpen, setOcrOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [linesZonesModal, setLinesZonesModal] = useState(false);
  const [zoneDrawMode, setZoneDrawMode] = useState(null); // null | 'danger' | 'sajgon'
  const [deletePassword, setDeletePassword] = useState('');
  const [newTacticName, setNewTacticName] = useState('');
  const [newTacticModal, setNewTacticModal] = useState(false);
  const [tacticMenu, setTacticMenu] = useState(null);
  const [squadCode, setSquadCode] = useState(() => {
    try { return localStorage.getItem(`squadCode_${layoutId}`) || ''; } catch { return ''; }
  });
  const [squadInput, setSquadInput] = useState(false);
  const updateSquadCode = (code) => {
    const clean = code.toLowerCase().trim().replace(/[^a-z0-9\-]/g, '');
    setSquadCode(clean);
    if (clean) localStorage.setItem(`squadCode_${layoutId}`, clean);
    else localStorage.removeItem(`squadCode_${layoutId}`);
  };
  const [deleteTacticModal, setDeleteTacticModal] = useState(null);
  const [previewTacticId, setPreviewTacticId] = useState(null);

  // ── BunkerCard state ──
  const [bunkerCardOpen, setBunkerCardOpen] = useState(false);
  const [selectedBunker, setSelectedBunker] = useState(null);
  const [newBunkerPos, setNewBunkerPos] = useState(null);

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

  const clampBunkers = (list) => list.map(b => ({
    ...b, x: Math.max(0, Math.min(1, b.x)), y: Math.max(0, Math.min(1, b.y)),
  }));

  // Auto-save layout data
  const saveLayoutData = useCallback(async () => {
    await tracked(() => ds.updateLayout(layoutId, {
      discoLine: disco / 100, zeekerLine: zeeker / 100,
      bunkers: clampBunkers(editBunkers),
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
      fieldCalibration: calibration,
    }));
  }, [layoutId, disco, zeeker, editBunkers, editDanger, editSajgon, calibration]);

  const saveTimerRef = useRef(null);
  useEffect(() => {
    clearTimeout(saveTimerRef.current);
    if (layout) saveTimerRef.current = setTimeout(saveLayoutData, 2000);
    return () => clearTimeout(saveTimerRef.current);
  }, [saveLayoutData]);

  // ── BunkerCard handlers ──
  const handleBunkerTap = (pos) => {
    const hit = editBunkers.find(b => {
      const dx = b.x - pos.x, dy = b.y - pos.y;
      return Math.sqrt(dx * dx + dy * dy) < 0.05;
    });
    if (hit) {
      setSelectedBunker(hit);
      setNewBunkerPos(null);
    } else {
      setSelectedBunker(null);
      setNewBunkerPos(pos);
    }
    setBunkerCardOpen(true);
  };

  const handleBunkerSave = (data, doMirror) => {
    if (selectedBunker) {
      setEditBunkers(prev => prev.map(b => {
        if (b.id === selectedBunker.id) return { ...b, ...data };
        if (b.name === selectedBunker.name && Math.abs(b.x - (1 - selectedBunker.x)) < 0.05 && Math.abs(b.y - selectedBunker.y) < 0.05)
          return { ...b, ...data };
        return b;
      }));
    } else if (newBunkerPos) {
      const newList = [...editBunkers, { id: uid(), ...data, x: newBunkerPos.x, y: newBunkerPos.y }];
      if (doMirror && Math.abs(newBunkerPos.x - 0.5) > 0.02) {
        newList.push({ id: uid(), ...data, x: 1 - newBunkerPos.x, y: newBunkerPos.y });
      }
      setEditBunkers(newList);
    }
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

  const handleBunkerMove = (id, pos) => setEditBunkers(prev => {
    const moved = prev.find(b => b.id === id);
    if (!moved) return prev;
    return prev.map(b => {
      if (b.id === id) return { ...b, x: pos.x, y: pos.y };
      if (b.name === moved.name && Math.abs(b.x - (1 - moved.x)) < 0.05 && Math.abs(b.y - moved.y) < 0.05)
        return { ...b, x: 1 - pos.x, y: pos.y };
      return b;
    });
  });

  // ── Tactic handlers ──
  const handleAddTactic = async () => {
    if (!newTacticName.trim()) return;
    setNewTacticModal(false);
    try {
      const ref = await ds.addLayoutTactic(layoutId, {
        name: newTacticName.trim(),
        squadCode: squadCode || null,
        players: [null, null, null, null, null],
        shots: [[], [], [], [], []],
        bumps: [null, null, null, null, null],
      });
      setNewTacticName('');
      navigate(`/layout/${layoutId}/tactic/${ref.id}`);
    } catch (e) {
      console.error('Create tactic failed:', e);
      alert('Failed to create tactic: ' + e.message);
    }
  };

  const duplicateTactic = async (t) => {
    try {
      const ref = await ds.addLayoutTactic(layoutId, {
        name: t.name + ' (copy)',
        steps: t.steps || [],
        freehandStrokes: t.freehandStrokes || null,
      });
      navigate(`/layout/${layoutId}/tactic/${ref.id}`);
    } catch (e) {
      console.error('Duplicate tactic failed:', e);
    }
  };

  const handleDeleteLayout = async () => {
    await ds.deleteLayout(layoutId);
    navigate('/layouts');
  };

  if (layoutsLoading) return <SkeletonList count={4} />;
  if (!layout) return <EmptyState icon="?" text="Layout not found" />;

  const isLandscape = device.isLandscape && !device.isDesktop;

  return (
    <div style={{ height: '100dvh', maxWidth: isLandscape ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ HEADER (hidden in landscape) ═══ */}
      {!isLandscape && (
      <PageHeader
        back={{ to: '/layouts' }}
        title={name}
        subtitle="FIELD LAYOUT"
        badges={<><LeagueBadge league={league} /> <YearBadge year={year} /></>}
        action={<MoreBtn onClick={() => setMenuOpen(true)} />}
      />
      )}

      {/* ═══ LANDSCAPE FLOATING CONTROLS ═══ */}
      {isLandscape && (
        <>
        <div style={{ position: 'fixed', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <Btn variant="default" size="sm" onClick={() => navigate('/layouts')}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ‹ Back
          </Btn>
          <Btn variant="default" size="sm" onClick={() => setMenuOpen(true)}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ⋮
          </Btn>
        </div>
        {/* Toggle toolbar — right side */}
        <div style={{ position: 'fixed', top: 12, right: 12, display: 'flex', gap: 6, zIndex: 50 }}>
          <Btn variant="default" size="sm" onClick={() => setShowLabels(v => !v)}
            style={{ background: (showLabels ? COLORS.accent + '30' : COLORS.surface + 'dd'), backdropFilter: 'blur(8px)',
              padding: '8px 10px', fontSize: 13, fontWeight: 700, color: showLabels ? COLORS.accent : COLORS.textMuted,
              border: `1px solid ${showLabels ? COLORS.accent + '60' : COLORS.border}` }}>
            Aā
          </Btn>
          <Btn variant="default" size="sm" onClick={() => setShowZones(v => !v)}
            style={{ background: (showZones ? COLORS.info + '30' : COLORS.surface + 'dd'), backdropFilter: 'blur(8px)',
              padding: '8px 10px', fontSize: 13, fontWeight: 700, color: showZones ? COLORS.info : COLORS.textMuted,
              border: `1px solid ${showZones ? COLORS.info + '60' : COLORS.border}` }}>
            ◇
          </Btn>
          <Btn variant="default" size="sm" onClick={() => { setEditDanger([]); setShowZones(true); setZoneDrawMode('danger'); }}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)',
              padding: '8px 10px', fontSize: 12, fontWeight: 700, color: COLORS.danger,
              border: `1px solid ${COLORS.danger}30` }}>
            D
          </Btn>
          <Btn variant="default" size="sm" onClick={() => { setEditSajgon([]); setShowZones(true); setZoneDrawMode('sajgon'); }}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)',
              padding: '8px 10px', fontSize: 12, fontWeight: 700, color: COLORS.info,
              border: `1px solid ${COLORS.info}30` }}>
            S
          </Btn>
        </div>
        </>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ═══ FIELD CANVAS ═══ */}
        <div ref={canvasContainerRef} style={{
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          position: 'relative',
        }}>
          {/* Drag handles for disco/zeeker lines */}
          {!zoneDrawMode && ['disco', 'zeeker'].map(type => {
            const val = type === 'disco' ? disco : zeeker;
            const color = type === 'disco' ? '#fb923c' : '#22d3ee';
            const label = type === 'disco' ? 'DISCO' : 'ZEEKER';
            return (
              <div key={type} style={{
                position: 'absolute', left: 0, right: 0, top: `${val}%`, zIndex: 15,
                transform: 'translateY(-50%)', touchAction: 'none', cursor: 'ns-resize',
              }}
              onPointerDown={(e) => {
                e.preventDefault(); e.stopPropagation();
                e.target.setPointerCapture(e.pointerId);
                dragRef.current = { type };
              }}
              onPointerMove={(e) => {
                if (!dragRef.current || dragRef.current.type !== type) return;
                const container = canvasContainerRef.current;
                if (!container) return;
                const rect = container.getBoundingClientRect();
                const pct = ((e.clientY - rect.top) / rect.height) * 100;
                const clamped = Math.max(5, Math.min(95, Math.round(pct)));
                if (type === 'disco') setDisco(clamped);
                else setZeeker(clamped);
              }}
              onPointerUp={() => { dragRef.current = null; }}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '3px 0',
                }}>
                  <div style={{
                    background: color, borderRadius: 8, padding: '2px 10px',
                    fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#000',
                    boxShadow: `0 0 8px ${color}60`,
                    userSelect: 'none',
                  }}>{label} {val}%</div>
                </div>
              </div>
            );
          })}
          <FieldCanvas
            fieldImage={image}
            maxCanvasHeight={typeof window !== 'undefined' ? (isLandscape ? window.innerHeight - 20 : window.innerHeight - 200) : null}
            players={(() => {
              if (!previewTacticId) return [];
              const t = tactics.find(tc => tc.id === previewTacticId);
              if (!t) return [];
              return t.players || t.steps?.[0]?.players || [];
            })()}
            shots={(() => {
              if (!previewTacticId) return [[], [], [], [], []];
              const t = tactics.find(tc => tc.id === previewTacticId);
              if (!t) return [[], [], [], [], []];
              const raw = t.shots || t.steps?.[0]?.shots || {};
              if (Array.isArray(raw)) return raw;
              return [0,1,2,3,4].map(i => raw[String(i)] || []);
            })()}
            bumpStops={(() => {
              if (!previewTacticId) return [];
              const t = tactics.find(tc => tc.id === previewTacticId);
              if (!t) return [];
              return t.bumps || t.steps?.[0]?.bumps || [];
            })()}
            eliminations={[]} eliminationPositions={[]}
            editable={false}
            selectedBunkerId={null}
            discoLine={disco / 100}
            zeekerLine={zeeker / 100}
            hideLineLabels={true}
            bunkers={editBunkers}
            showBunkers={showLabels}
            showHalfLabels={showHalf}
            dangerZone={editDanger.length >= 3 ? editDanger : null}
            sajgonZone={editSajgon.length >= 3 ? editSajgon : null}
            showZones={showZones}
            layoutEditMode={zoneDrawMode}
            editDangerPoints={zoneDrawMode === 'danger' ? editDanger : undefined}
            editSajgonPoints={zoneDrawMode === 'sajgon' ? editSajgon : undefined}
            onZonePoint={zoneDrawMode ? (pos) => {
              if (zoneDrawMode === 'danger') setEditDanger(prev => [...prev, pos]);
              else setEditSajgon(prev => [...prev, pos]);
            } : undefined}
            onZoneClose={zoneDrawMode ? () => setZoneDrawMode(null) : undefined}
          />
        </div>

        {/* ═══ ZONE DRAW MODE INDICATOR ═══ */}
        {zoneDrawMode && (
          <div style={{
            margin: `0 ${SPACE.lg}px`, padding: `${SPACE.sm}px ${SPACE.lg}px`,
            borderRadius: RADIUS.md,
            background: (zoneDrawMode === 'danger' ? COLORS.danger : COLORS.info) + '15',
            border: `1px solid ${(zoneDrawMode === 'danger' ? COLORS.danger : COLORS.info)}40`,
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
          }}>
            <div style={{ flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: zoneDrawMode === 'danger' ? COLORS.danger : COLORS.info }}>
              Drawing {zoneDrawMode} zone — tap points
            </div>
            <Btn variant="accent" size="sm" onClick={async () => {
              await saveLayoutData();
              setZoneDrawMode(null);
            }} style={{ padding: '4px 12px', fontSize: FONT_SIZE.xs }}>
              ✓ Save
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => {
              // Revert: reload from layout
              if (zoneDrawMode === 'danger') setEditDanger(layout?.dangerZone ? [...layout.dangerZone] : []);
              else setEditSajgon(layout?.sajgonZone ? [...layout.sajgonZone] : []);
              setZoneDrawMode(null);
            }}
              style={{ color: COLORS.textMuted, padding: '2px 8px' }}>Cancel</Btn>
          </div>
        )}

        {/* ═══ EMPTY BUNKERS HINT ═══ */}
        {editBunkers.length === 0 && (
          <div style={{
            margin: `0 ${SPACE.lg}px`, padding: `${SPACE.md}px ${SPACE.lg}px`,
            borderRadius: RADIUS.md, background: COLORS.accent + '12',
            border: `1px solid ${COLORS.accent}30`,
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
          }}>
            <span style={{ fontSize: 20 }}>👆</span>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.accent }}>
              Tap the field to place bunkers
            </div>
          </div>
        )}
        {/* ═══ TOOLBAR (hidden in landscape) ═══ */}
        {!isLandscape && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}>
          {[
            { label: 'Aā', active: showLabels, toggle: () => setShowLabels(v => !v) },
            { label: '½', active: showHalf, toggle: () => setShowHalf(v => !v) },
            { label: '◇', active: showZones, toggle: () => setShowZones(v => !v) },
          ].map(t => (
            <div key={t.label} onClick={t.toggle} style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700,
              padding: '5px 12px', borderRadius: RADIUS.full, cursor: 'pointer',
              background: t.active ? COLORS.accent + '20' : COLORS.surfaceDark,
              color: t.active ? COLORS.accent : COLORS.textMuted,
              border: `1px solid ${t.active ? COLORS.accent + '40' : COLORS.border}`,
              transition: 'all .15s',
            }}>{t.label}</div>
          ))}
          <div style={{ flex: 1 }} />
          <div onClick={() => { setEditDanger([]); setShowZones(true); setZoneDrawMode('danger'); }} style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
            padding: '5px 10px', borderRadius: RADIUS.full, cursor: 'pointer',
            color: COLORS.danger, border: `1px solid ${COLORS.danger}30`,
            background: COLORS.surfaceDark,
          }}>DANGER</div>
          <div onClick={() => { setEditSajgon([]); setShowZones(true); setZoneDrawMode('sajgon'); }} style={{
            fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
            padding: '5px 10px', borderRadius: RADIUS.full, cursor: 'pointer',
            color: COLORS.info, border: `1px solid ${COLORS.info}30`,
            background: COLORS.surfaceDark,
          }}>SAJGON</div>
        </div>
        )}

        {/* ═══ TACTICS SECTION (hidden in landscape) ═══ */}
        {!isLandscape && (
        <div style={{ padding: `0 ${R.layout.padding}px`, paddingBottom: 80 }}>
          {/* Squad code bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0 4px' }}>
            {squadCode ? (
              <div onClick={() => setSquadInput(true)} style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
                padding: '4px 12px', borderRadius: RADIUS.full, cursor: 'pointer',
                background: COLORS.accent + '20', color: COLORS.accent,
                border: `1px solid ${COLORS.accent}40`,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🔑 {squadCode}
                <span onClick={(e) => { e.stopPropagation(); updateSquadCode(''); }} style={{ opacity: 0.5, fontSize: 10 }}>✕</span>
              </div>
            ) : (
              <div onClick={() => setSquadInput(true)} style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
                padding: '4px 12px', borderRadius: RADIUS.full, cursor: 'pointer',
                background: COLORS.surfaceDark, color: COLORS.textMuted,
                border: `1px dashed ${COLORS.border}`,
              }}>
                🔑 Enter squad code
              </div>
            )}
            <div style={{ flex: 1 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 8px' }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
              Tactics <span style={{ fontWeight: 400, color: COLORS.textMuted, fontSize: FONT_SIZE.sm }}>({(squadCode ? tactics.filter(t => t.squadCode === squadCode) : tactics.filter(t => !t.squadCode)).length})</span>
            </div>
            <Btn variant="accent" size="sm" onClick={() => { setNewTacticName(''); setNewTacticModal(true); }}
              style={{ padding: '6px 14px', borderRadius: RADIUS.full, fontSize: FONT_SIZE.xs, fontWeight: 700 }}>
              <Icons.Plus /> New
            </Btn>
          </div>

          {tacticsLoading && <SkeletonList count={2} />}
          {!tacticsLoading && (squadCode ? tactics.filter(t => t.squadCode === squadCode) : tactics.filter(t => !t.squadCode)).length === 0 && (
            <EmptyState icon="---" text={squadCode ? `No tactics for "${squadCode}" yet` : 'No tactics yet'} />
          )}

          {(squadCode ? tactics.filter(t => t.squadCode === squadCode) : tactics.filter(t => !t.squadCode)).map(t => {
            const players = (t.players || t.steps?.[0]?.players || []).filter(Boolean);
            const discoPct = layout?.discoLine || 0.30;
            const zeekerPct = layout?.zeekerLine || 0.80;
            const inDorito = players.filter(p => p.y < discoPct).length;
            const inSnake = players.filter(p => p.y > zeekerPct).length;
            const inMid = players.length - inDorito - inSnake;
            const toneParts = [];
            if (inDorito) toneParts.push(`${inDorito} dorito`);
            if (inMid) toneParts.push(`${inMid} mid`);
            if (inSnake) toneParts.push(`${inSnake} snake`);
            const tone = toneParts.length ? toneParts.join(' · ') : `${players.length}/5 placed`;
            const isPreviewing = previewTacticId === t.id;

            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12,
                background: COLORS.surfaceDark, border: `1px solid ${isPreviewing ? COLORS.accent + '60' : COLORS.border}`,
                marginBottom: 6, cursor: 'pointer',
              }}
                onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: FONT_SIZE.sm, color: COLORS.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginTop: 2 }}>{tone}</div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); setPreviewTacticId(isPreviewing ? null : t.id); }}
                  style={{
                    width: 32, height: 32, borderRadius: RADIUS.md,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPreviewing ? COLORS.accent + '20' : 'transparent',
                    color: isPreviewing ? COLORS.accent : COLORS.textMuted,
                    fontSize: 16, flexShrink: 0,
                  }}>
                  👁
                </div>
                <MoreBtn onClick={() => setTacticMenu(t)} />
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* ═══ BOTTOM BAR — NEW TACTIC (hidden in landscape) ═══ */}
      {!isLandscape && (
      <div style={{
        position: 'sticky',
        bottom: 0,
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        zIndex: 10,
        flexShrink: 0,
      }}>
        <Btn variant="accent" onClick={() => { setNewTacticName(''); setNewTacticModal(true); }}
          style={{ width: '100%', justifyContent: 'center' }}>
          <Icons.Plus /> New tactic
        </Btn>
      </div>
      )}

      {/* ═══ ACTION SHEET — page menu ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: 'Edit layout info', onPress: () => setInfoModal(true) },
        { label: 'Bunker names & types', onPress: () => navigate(`/layout/${layoutId}/bunkers`) },
        { label: 'Lines & zones config', onPress: () => setLinesZonesModal(true) },
        { label: 'Ballistics system', onPress: () => navigate(`/layout/${layoutId}/ballistics`) },
        { label: 'Re-calibrate field', onPress: () => { setCalibData(calibration); setCalibDoritoSide(layout?.doritoSide || 'top'); setCalibModal(true); } },
        { separator: true },
        { label: 'Delete layout', onPress: () => setDeleteModal(true), danger: true },
      ]} />

      {/* ═══ ACTION SHEET — tactic menu ═══ */}
      <ActionSheet open={!!tacticMenu} onClose={() => setTacticMenu(null)} actions={[
        { label: 'Edit', onPress: () => navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}`) },
        { label: 'Duplicate', onPress: () => duplicateTactic(tacticMenu) },
        { label: 'Print', onPress: () => { setTacticMenu(null); navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}?print=1`); } },
        { separator: true },
        { label: 'Delete tactic', onPress: () => setDeleteTacticModal(tacticMenu), danger: true },
      ]} />

      {/* ═══ BUNKER CARD ═══ */}
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
          <div style={{ display: 'flex', gap: SPACE.md }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>League</div>
              <div style={{ display: 'flex', gap: SPACE.xs }}>
                {LEAGUES.map(lg => (
                  <Btn key={lg} variant="default" size="sm" active={league === lg}
                    style={{ borderColor: league === lg ? LEAGUE_COLORS[lg] : COLORS.border, color: league === lg ? LEAGUE_COLORS[lg] : COLORS.textDim }}
                    onClick={() => setLeague(lg)}>{lg}</Btn>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>Year</div>
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

      {/* ═══ DELETE LAYOUT ═══ */}
      <ConfirmModal open={deleteModal} onClose={() => { setDeleteModal(false); setDeletePassword(''); }}
        title="Delete layout?" danger confirmLabel="Delete"
        message={`Delete "${name}"? All tactics for this layout will be permanently lost.`}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={setDeletePassword}
        onConfirm={handleDeleteLayout} />

      {/* ═══ DELETE TACTIC ═══ */}
      <ConfirmModal open={!!deleteTacticModal} onClose={() => setDeleteTacticModal(null)}
        title="Delete tactic?" danger confirmLabel="Delete"
        message={`Delete "${deleteTacticModal?.name}"?`}
        onConfirm={() => { ds.deleteLayoutTactic(layoutId, deleteTacticModal.id); setDeleteTacticModal(null); }} />

      {/* ═══ NEW TACTIC MODAL ═══ */}
      <Modal open={newTacticModal} onClose={() => setNewTacticModal(false)} title="New tactic"
        footer={<>
          <Btn variant="default" onClick={() => setNewTacticModal(false)}>Cancel</Btn>
          <Btn variant="accent" disabled={!newTacticName.trim()} onClick={handleAddTactic}><Icons.Check /> Create</Btn>
        </>}>
        <Input value={newTacticName} onChange={setNewTacticName} placeholder="Tactic name, e.g. Snake Attack"
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
        {squadCode && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginTop: 8 }}>
          Squad: <strong style={{ color: COLORS.accent }}>{squadCode}</strong>
        </div>}
      </Modal>

      {/* ═══ SQUAD CODE INPUT ═══ */}
      <Modal open={squadInput} onClose={() => setSquadInput(false)} title="Squad code"
        footer={<>
          <Btn variant="default" onClick={() => setSquadInput(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={() => setSquadInput(false)}><Icons.Check /> Done</Btn>
        </>}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 8 }}>
          Enter your squad code to see only your team's tactics. Same code = same library.
        </div>
        <Input value={squadCode} onChange={updateSquadCode} placeholder="e.g. ring, rage, rush"
          autoFocus onKeyDown={e => e.key === 'Enter' && setSquadInput(false)} />
      </Modal>

      {/* ═══ OCR SCAN ═══ */}
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

      {/* ═══ RE-CALIBRATE MODAL ═══ */}
      <Modal open={calibModal} onClose={() => setCalibModal(false)} title="Re-calibrate field"
        maxWidth={640}
        footer={<>
          <Btn variant="default" onClick={() => setCalibModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={async () => {
            if (calibData) {
              setCalibration(calibData);
              await tracked(() => ds.updateLayout(layoutId, { fieldCalibration: calibData, doritoSide: calibDoritoSide }));
            }
            setCalibModal(false);
          }}><Icons.Check /> Save</Btn>
        </>}>
        {calibData && (
          <CalibrationView
            image={image}
            calibration={calibData}
            onChange={setCalibData}
            doritoSide={calibDoritoSide}
            onDoritoSideChange={setCalibDoritoSide}
          />
        )}
      </Modal>

      {/* Lines & Zones config */}
      <Modal open={linesZonesModal} onClose={() => setLinesZonesModal(false)} title="Lines & Zones"
        footer={<Btn variant="accent" onClick={() => setLinesZonesModal(false)}>Done</Btn>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          {/* Disco line */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.bump, letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
              DISCO LINE — {disco}%
            </div>
            <input type="range" min={5} max={50} value={disco}
              onChange={e => setDisco(Number(e.target.value))}
              style={{ width: '100%', accentColor: COLORS.bump }} />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 2 }}>
              Players above this line are on dorito side
            </div>
          </div>
          {/* Zeeker line */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: '#06b6d4', letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
              ZEEKER LINE — {zeeker}%
            </div>
            <input type="range" min={50} max={95} value={zeeker}
              onChange={e => setZeeker(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#06b6d4' }} />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 2 }}>
              Players below this line are on snake side
            </div>
          </div>
          {/* Danger zone */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.danger, letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
              DANGER ZONE — {editDanger.length >= 3 ? `${editDanger.length} points` : 'not drawn'}
            </div>
            <div style={{ display: 'flex', gap: SPACE.sm }}>
              <Btn variant="default" size="sm" onClick={() => { setEditDanger([]); setLinesZonesModal(false); setShowZones(true); setZoneDrawMode('danger'); }}
                style={{ color: COLORS.danger, borderColor: COLORS.danger + '40' }}>
                {editDanger.length >= 3 ? 'Redraw' : 'Draw'} danger zone
              </Btn>
              {editDanger.length >= 3 && (
                <Btn variant="ghost" size="sm" onClick={() => setEditDanger([])} style={{ color: COLORS.danger }}>
                  Clear
                </Btn>
              )}
            </div>
          </div>
          {/* Sajgon zone */}
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.info, letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
              SAJGON ZONE — {editSajgon.length >= 3 ? `${editSajgon.length} points` : 'not drawn'}
            </div>
            <div style={{ display: 'flex', gap: SPACE.sm }}>
              <Btn variant="default" size="sm" onClick={() => { setEditSajgon([]); setLinesZonesModal(false); setShowZones(true); setZoneDrawMode('sajgon'); }}
                style={{ color: COLORS.info, borderColor: COLORS.info + '40' }}>
                {editSajgon.length >= 3 ? 'Redraw' : 'Draw'} sajgon zone
              </Btn>
              {editSajgon.length >= 3 && (
                <Btn variant="ghost" size="sm" onClick={() => setEditSajgon([])} style={{ color: COLORS.info }}>
                  Clear
                </Btn>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
