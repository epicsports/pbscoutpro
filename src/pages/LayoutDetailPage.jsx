/**
 * LayoutDetailPage — layout editing with accordion sections
 * Route: /layout/:layoutId
 *
 * Sections (accordion, one open at a time):
 *   1. Info       — name, league, year, image upload (compact)
 *   2. Konfiguracja — disco/zeeker, bunker names/types, zones, calibration
 *   3. Pole       — ONE FieldCanvas with layer checkboxes
 *   4. Taktyki    — tactic list + add button
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import { useTrackedSave } from '../hooks/useSaveStatus';
import Header from '../components/Header';
import FieldCanvas from '../components/FieldCanvas';
import FieldEditor from '../components/FieldEditor';
import { Btn, SectionTitle, EmptyState, Modal, Input, Select, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, TOUCH, LEAGUES, LEAGUE_COLORS, responsive } from '../utils/theme';
import { compressImage, yearOptions, uid } from '../utils/helpers';

// ── Bunker type data ──
const BUNKER_TYPES_FULL = [
  { abbr: 'SB',  name: 'Snake Beam',   height: 0.76, group: 'low' },
  { abbr: 'SD',  name: 'Small Dorito', height: 0.85, group: 'low' },
  { abbr: 'Tr',  name: 'Tree',         height: 0.90, group: 'low' },
  { abbr: 'MD',  name: 'Med. Dorito',  height: 1.00, group: 'med' },
  { abbr: 'Ck',  name: 'Cake',         height: 1.00, group: 'med' },
  { abbr: 'Br',  name: 'Brick',        height: 1.15, group: 'med' },
  { abbr: 'C',   name: 'Can',          height: 1.20, group: 'med' },
  { abbr: 'MW',  name: 'Mini Wedge',   height: 1.20, group: 'med' },
  { abbr: 'Wg',  name: 'Wing',         height: 1.40, group: 'tall' },
  { abbr: 'GP',  name: 'Giant Plus',   height: 1.50, group: 'tall' },
  { abbr: 'T',   name: 'Temple',       height: 1.50, group: 'tall' },
  { abbr: 'GB',  name: 'Giant Brick',  height: 1.50, group: 'tall' },
  { abbr: 'TCK', name: 'Tall Cake',    height: 1.60, group: 'tall' },
  { abbr: 'GW',  name: 'Giant Wing',   height: 1.70, group: 'tall' },
  { abbr: 'MT',  name: 'Maya Temple',  height: 1.80, group: 'tall' },
];
const GROUP_COLOR = { low: '#22c55e', med: '#f59e0b', tall: '#ef4444' };
const GROUP_LABEL = { low: 'Niskie ≤0.9m', med: 'Średnie 1.0–1.2m', tall: 'Wysokie ≥1.4m' };

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
function typeData(abbr) {
  return BUNKER_TYPES_FULL.find(t => t.abbr === abbr) || { abbr, name: abbr, height: 1.0, group: 'med' };
}

// ── Accordion section component ──
function Section({ id, title, icon, open, onToggle, badge, children }) {
  return (
    <div style={{ borderBottom: `1px solid ${COLORS.border}20` }}>
      <div onClick={() => onToggle(id)} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
        cursor: 'pointer', background: open ? COLORS.surfaceLight : COLORS.surface,
        userSelect: 'none',
      }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontBase, color: COLORS.text, flex: 1 }}>
          {title}
        </span>
        {badge && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>{badge}</span>}
        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && <div style={{ padding: '0 14px 12px' }}>{children}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export default function LayoutDetailPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts, loading: layoutsLoading } = useLayouts();
  const { tactics, loading: tacticsLoading } = useLayoutTactics(layoutId);
  const { workspace } = useWorkspace();
  const isAdmin = workspace?.isAdmin || false;

  const layout = layouts?.find(l => l.id === layoutId);

  // ── Accordion state — only one open at a time ──
  const [openSection, setOpenSection] = useState('info');
  const toggleSection = (id) => setOpenSection(prev => prev === id ? null : id);

  // ── Basic Info editable state ──
  const [name, setName]     = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear]     = useState(new Date().getFullYear());
  const [image, setImage]   = useState(null);
  const [disco, setDisco]   = useState(30);
  const [zeeker, setZeeker] = useState(80);
  const [saving, setSaving] = useState(false);
  const tracked = useTrackedSave();
  const fileRef = useRef(null);

  // ── Annotation (Konfiguracja section) ──
  const [annotateMode, setAnnotateMode]       = useState(null);
  const [showBunkers, setShowBunkers]         = useState(true);
  const [showLines, setShowLines]             = useState(true);
  const [showZones, setShowZones]             = useState(true);

  // Bunker editing
  const [editBunkers, setEditBunkers]         = useState([]);
  const [pendingBunker, setPendingBunker]     = useState(null);
  const [pendingName, setPendingName]         = useState('');
  const [pendingType, setPendingType]         = useState('Br');
  const [editingBunkerId, setEditingBunkerId] = useState(null);

  // Zone editing
  const [editDanger, setEditDanger]   = useState([]);
  const [editSajgon, setEditSajgon]   = useState([]);

  // Calibration
  const [calibration, setCalibration] = useState({ homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } });
  const calDragRef = useRef(null);
  const calContainerRef = useRef(null);

  // Tactic modal
  const [newTacticName, setNewTacticName] = useState('');
  const [tacticModalOpen, setTacticModalOpen] = useState(false);

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
      name: name.trim(), league, year: Number(year),
      fieldImage: image,
      discoLine: disco / 100, zeekerLine: zeeker / 100,
    }));
    setSaving(false);
  };

  const handleSaveAnnotations = async () => {
    setSaving(true);
    await tracked(() => ds.updateLayout(layoutId, {
      bunkers: editBunkers,
      dangerZone: editDanger.length >= 3 ? editDanger : null,
      sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
    }));
    setSaving(false);
    setAnnotateMode(null);
  };

  const handleSaveCalibration = async () => {
    setSaving(true);
    await tracked(() => ds.updateLayout(layoutId, { fieldCalibration: calibration }));
    setSaving(false);
    setAnnotateMode(null);
  };

  // ── Bunker helpers ──
  const addBunkerWithMirror = () => {
    if (!pendingBunker || !pendingName.trim()) return;
    const baType = pendingType;
    const td = typeData(baType);
    const base = { name: pendingName.trim(), baType, heightM: td.height, labelOffsetY: -1 };
    const newBunkers = [
      ...editBunkers,
      { id: uid(), ...base, x: pendingBunker.x, y: pendingBunker.y },
    ];
    if (Math.abs(pendingBunker.x - 0.5) > 0.02) {
      newBunkers.push({ id: uid(), ...base, x: 1 - pendingBunker.x, y: pendingBunker.y });
    }
    setEditBunkers(newBunkers);
    setPendingBunker(null); setPendingName(''); setPendingType('Br');
  };

  const deleteBunkerPair = (b) => {
    setEditBunkers(prev => {
      const toDelete = new Set([b.id]);
      prev.forEach(other => {
        if (other.id !== b.id && other.name === b.name &&
            Math.abs(other.x - (1 - b.x)) < 0.05 && Math.abs(other.y - b.y) < 0.05)
          toDelete.add(other.id);
      });
      return prev.filter(x => !toDelete.has(x.id));
    });
  };

  const setBunkerType = (bunker, newAbbr) => {
    const td = typeData(newAbbr);
    setEditBunkers(prev => prev.map(b => {
      if (b.id === bunker.id) return { ...b, baType: newAbbr, heightM: td.height };
      if (b.name === bunker.name && Math.abs(b.x - (1 - bunker.x)) < 0.05 && Math.abs(b.y - bunker.y) < 0.05)
        return { ...b, baType: newAbbr, heightM: td.height };
      return b;
    }));
  };

  // ── Calibration drag helpers ──
  const getCalPos = useCallback((e) => {
    const el = calContainerRef.current; if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = (e.touches?.[0]?.clientX ?? e.clientX) - rect.left;
    const cy = (e.touches?.[0]?.clientY ?? e.clientY) - rect.top;
    return { x: Math.max(0, Math.min(1, cx / rect.width)), y: Math.max(0, Math.min(1, cy / rect.height)) };
  }, []);

  const handleCalMove = useCallback((e) => {
    if (!calDragRef.current) return;
    e.preventDefault();
    const pos = getCalPos(e); if (!pos) return;
    setCalibration(prev => ({ ...prev, [calDragRef.current]: pos }));
  }, [getCalPos]);

  const handleCalUp = useCallback(() => { calDragRef.current = null; }, []);

  // ── Tactic ──
  const handleAddTactic = async () => {
    if (!newTacticName.trim()) return;
    const E5 = [null,null,null,null,null];
    const E5A = [[],[],[],[],[]];
    const ref = await ds.addLayoutTactic(layoutId, {
      name: newTacticName.trim(),
      steps: [{ players: E5, shots: E5A, assignments: E5, bumps: E5, description: 'Breakout' }],
    });
    setTacticModalOpen(false); setNewTacticName('');
    navigate(`/layout/${layoutId}/tactic/${ref.id}`);
  };

  if (layoutsLoading) return <EmptyState icon="⏳" text="Ładowanie..." />;
  if (!layout) return <EmptyState icon="❓" text="Layout nie znaleziony" />;

  const canvasLayoutEditMode = (annotateMode === 'bunker' || annotateMode === 'danger' || annotateMode === 'sajgon')
    ? annotateMode : null;

  // Canvas props shared between Konfiguracja and Pole sections
  const canvasProps = {
    fieldImage: image,
    players: [], shots: [], bumpStops: [],
    eliminations: [], eliminationPositions: [],
    editable: false,
    discoLine: showLines ? disco / 100 : 0,
    zeekerLine: showLines ? zeeker / 100 : 0,
    bunkers: editBunkers,
    showBunkers,
    dangerZone: editDanger.length >= 3 ? editDanger : null,
    sajgonZone: editSajgon.length >= 3 ? editSajgon : null,
    showZones,
  };

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <Header breadcrumbs={[{ label: 'Layouts', path: '/layouts' }, layout.name]} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* ═══ SECTION 1: INFO (compact) ═══ */}
        <Section id="info" title="Info" icon="📋" open={openSection === 'info'} onToggle={toggleSection}
          badge={<><LeagueBadge league={league} /> <YearBadge year={year} /></>}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
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
            <Btn variant="accent" disabled={!name.trim() || saving} onClick={handleSaveInfo}>
              <Icons.Check /> {saving ? 'Zapisuję...' : 'Zapisz info'}
            </Btn>
          </div>
        </Section>

        {/* ═══ SECTION 2: KONFIGURACJA (disco/zeeker, bunkers, zones, calibration) ═══ */}
        <Section id="config" title="Konfiguracja" icon="⚙️" open={openSection === 'config'} onToggle={toggleSection}
          badge={`${editBunkers.length} bunkrów`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>

            {/* Disco/Zeeker sliders */}
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Disco', color: '#f97316', value: disco, set: setDisco, min: 10, max: 50 },
                { label: 'Zeeker', color: '#3b82f6', value: zeeker, set: setZeeker, min: 50, max: 95 },
              ].map(({ label, color, value, set, min, max }) => (
                <div key={label} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color, fontWeight: 700, minWidth: 40 }}>{label}</span>
                  <input type="range" min={min} max={max} value={value}
                    onChange={e => set(Number(e.target.value))}
                    style={{ flex: 1, accentColor: color }} />
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{value}%</span>
                </div>
              ))}
            </div>

            {/* Mode selector */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {[
                { key: 'bunker',    label: 'Nazwy' },
                { key: 'types',     label: 'Typy' },
                { key: 'danger',    label: 'Strefy' },
                { key: 'calibrate', label: 'Kalibracja' },
              ].map(({ key, label }) => (
                <Btn key={key}
                  variant={annotateMode === key ? 'accent' : 'default'} size="sm"
                  onClick={() => setAnnotateMode(prev => prev === key ? null : key)}>
                  {label}
                </Btn>
              ))}
            </div>

            {/* Canvas for configuration editing */}
            <FieldEditor
              hasBunkers hasZones hasLines
              hasVisibility={false} hasCounter={false}
              showBunkers={showBunkers} onShowBunkers={setShowBunkers}
              showZones={showZones}   onShowZones={setShowZones}
              showLines={showLines}   onShowLines={setShowLines}
              showZoom
            >
              <FieldCanvas
                {...canvasProps}
                layoutEditMode={canvasLayoutEditMode}
                editDangerPoints={editDanger}
                editSajgonPoints={editSajgon}
                onBunkerPlace={pos => {
                  if (annotateMode !== 'bunker' && annotateMode !== 'types') return;
                  const hit = editBunkers.find(b => {
                    const dx = b.x - pos.x, dy = b.y - pos.y;
                    return Math.sqrt(dx*dx + dy*dy) < 0.05;
                  });
                  if (hit) { setEditingBunkerId(b => b === hit.id ? null : hit.id); }
                  else if (annotateMode === 'bunker') {
                    setPendingBunker(pos);
                    setPendingType(guessType(''));
                    setPendingName('');
                  }
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
                onZonePoint={pos => {
                  if (annotateMode === 'danger') setEditDanger(prev => [...prev, pos]);
                  else if (annotateMode === 'sajgon') setEditSajgon(prev => [...prev, pos]);
                }}
                onZoneUndo={() => {
                  if (annotateMode === 'danger') setEditDanger(prev => prev.slice(0,-1));
                  else if (annotateMode === 'sajgon') setEditSajgon(prev => prev.slice(0,-1));
                }}
                onZoneClose={() => {}}
                onBunkerLabelNudge={(id, delta) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? -1) + delta } : b))}
                onBunkerLabelOffset={(id, steps) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: steps } : b))}
              />
            </FieldEditor>

            {/* Calibration overlay */}
            {annotateMode === 'calibrate' && image && (
              <div>
                <div
                  ref={calContainerRef}
                  style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: `1px solid ${COLORS.accent}40` }}
                  onMouseMove={handleCalMove} onMouseUp={handleCalUp} onMouseLeave={handleCalUp}
                  onTouchMove={handleCalMove} onTouchEnd={handleCalUp}
                >
                  <img src={image} alt="calibrate" style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
                  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
                    <line
                      x1={`${calibration.homeBase.x * 100}%`} y1={`${calibration.homeBase.y * 100}%`}
                      x2={`${calibration.awayBase.x * 100}%`} y2={`${calibration.awayBase.y * 100}%`}
                      stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="6 4"
                    />
                    {[{ key: 'homeBase', color: '#22c55e', label: '🟢 HOME' }, { key: 'awayBase', color: '#ef4444', label: '🔴 AWAY' }].map(({ key, color, label }) => (
                      <g key={key} style={{ cursor: 'grab' }}
                        onMouseDown={e => { e.preventDefault(); calDragRef.current = key; }}
                        onTouchStart={e => { e.preventDefault(); calDragRef.current = key; }}
                      >
                        <circle cx={`${calibration[key].x * 100}%`} cy={`${calibration[key].y * 100}%`}
                          r="14" fill={color + '30'} stroke={color} strokeWidth="2" />
                        <circle cx={`${calibration[key].x * 100}%`} cy={`${calibration[key].y * 100}%`}
                          r="4" fill={color} />
                        <text x={`${calibration[key].x * 100}%`} y={`${calibration[key].y * 100}%`}
                          dy="-18" textAnchor="middle"
                          style={{ fontFamily: 'monospace', fontSize: 10, fill: color, fontWeight: 700, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))' }}
                        >{label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, flex: 1 }}>
                    Przeciągnij markery baz
                  </span>
                  <Btn variant="accent" size="sm" disabled={saving} onClick={handleSaveCalibration}>
                    <Icons.Check /> Zapisz
                  </Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setCalibration({ homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } })}>
                    Reset
                  </Btn>
                </div>
              </div>
            )}

            {/* New bunker form */}
            {pendingBunker && (
              <div style={{ padding: '10px 12px', borderRadius: 8, background: COLORS.accent + '12', border: `1px solid ${COLORS.accent}40` }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.accent }}>✚ Nowy bunkier</span>
                  <Input value={pendingName}
                    onChange={v => { setPendingName(v); setPendingType(guessType(v) || 'Br'); }}
                    placeholder="np. SNAKE, D50..."
                    autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') addBunkerWithMirror(); if (e.key === 'Escape') setPendingBunker(null); }}
                    style={{ flex: 1 }} />
                  <Btn variant="accent" size="sm" disabled={!pendingName.trim()} onClick={addBunkerWithMirror}><Icons.Check /></Btn>
                  <Btn variant="ghost" size="sm" onClick={() => setPendingBunker(null)}>✕</Btn>
                </div>
                {['low', 'med', 'tall'].map(group => (
                  <div key={group} style={{ marginBottom: 6 }}>
                    <div style={{ fontFamily: FONT, fontSize: 9, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: 4 }}>
                      {GROUP_LABEL[group]}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                      {BUNKER_TYPES_FULL.filter(t => t.group === group).map(t => (
                        <button key={t.abbr} onClick={() => setPendingType(t.abbr)}
                          style={{
                            padding: '5px 8px', borderRadius: 6, cursor: 'pointer', textAlign: 'left',
                            border: `1px solid ${pendingType === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                            background: pendingType === t.abbr ? GROUP_COLOR[group] + '20' : COLORS.surface,
                            fontFamily: FONT, fontSize: 10,
                          }}>
                          <strong style={{ color: pendingType === t.abbr ? GROUP_COLOR[group] : COLORS.text }}>{t.abbr}</strong>
                          <span style={{ color: COLORS.textDim }}> {t.name} · {t.height}m</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bunker list */}
            {(annotateMode === 'bunker' || annotateMode === 'types') && editBunkers.length > 0 && (
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, padding: '2px 0' }}>
                  {editBunkers.length} bunkrów
                </div>
                {editBunkers.map(b => {
                  const td = typeData(b.baType || guessType(b.name));
                  const gc = GROUP_COLOR[td.group];
                  return (
                    <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: editingBunkerId === b.id ? COLORS.surfaceHover : COLORS.surface, borderRadius: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: gc, flexShrink: 0 }} />
                      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, color: '#facc15', flex: 1, cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        onClick={() => setEditingBunkerId(id => id === b.id ? null : b.id)}>
                        {b.name}
                      </span>
                      <span style={{ fontFamily: FONT, fontSize: 9, color: gc, fontWeight: 700, background: gc + '18', padding: '2px 5px', borderRadius: 4 }}>
                        {b.baType || td.abbr} · {td.height}m
                      </span>
                      <Btn variant="ghost" size="sm" onClick={() => deleteBunkerPair(b)}><Icons.Trash /></Btn>
                    </div>
                  );
                })}
                {/* Inline type picker for selected bunker */}
                {editingBunkerId && (() => {
                  const b = editBunkers.find(x => x.id === editingBunkerId);
                  if (!b) return null;
                  return (
                    <div style={{ padding: '6px 8px', background: COLORS.surfaceLight, borderRadius: 6, border: `1px solid ${COLORS.accent}30` }}>
                      <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.accent, marginBottom: 6 }}>
                        Typ: <strong>{b.name}</strong>
                      </div>
                      {['low', 'med', 'tall'].map(group => (
                        <div key={group} style={{ marginBottom: 4 }}>
                          <div style={{ fontFamily: FONT, fontSize: 9, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: 3 }}>{GROUP_LABEL[group]}</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
                            {BUNKER_TYPES_FULL.filter(t => t.group === group).map(t => (
                              <button key={t.abbr}
                                onClick={() => { setBunkerType(b, t.abbr); setEditingBunkerId(null); }}
                                style={{
                                  padding: '3px 6px', borderRadius: 4, cursor: 'pointer',
                                  border: `1px solid ${(b.baType || 'Br') === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                                  background: (b.baType || 'Br') === t.abbr ? GROUP_COLOR[group] + '20' : COLORS.surface,
                                  fontFamily: FONT, fontSize: 9,
                                }}>
                                <strong style={{ color: GROUP_COLOR[group] }}>{t.abbr}</strong>
                                <span style={{ color: COLORS.textMuted }}> {t.height}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Zone controls */}
            {(annotateMode === 'danger' || annotateMode === 'sajgon') && (
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Btn variant="ghost" size="sm" onClick={() => {
                  if (annotateMode === 'danger') setEditDanger(p => p.slice(0,-1));
                  else setEditSajgon(p => p.slice(0,-1));
                }}>↩ Cofnij</Btn>
                <Btn variant="ghost" size="sm" onClick={() => {
                  if (annotateMode === 'danger') setEditDanger([]);
                  else setEditSajgon([]);
                }}><Icons.Trash /> Wyczyść</Btn>
                <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                  {annotateMode === 'danger' ? editDanger.length : editSajgon.length} pkt
                  {(annotateMode === 'danger' ? editDanger.length : editSajgon.length) >= 3 ? ' ✓' : ' (min 3)'}
                </span>
              </div>
            )}

            {/* Save annotations */}
            {(annotateMode === 'bunker' || annotateMode === 'types' || annotateMode === 'danger' || annotateMode === 'sajgon') && (
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="accent" disabled={saving} onClick={handleSaveAnnotations} style={{ flex: 1, justifyContent: 'center' }}>
                  <Icons.Check /> {saving ? 'Zapisuję...' : 'Zapisz annotacje'}
                </Btn>
                <Btn variant="ghost" onClick={() => {
                  setEditBunkers(layout.bunkers ? [...layout.bunkers] : []);
                  setEditDanger(layout.dangerZone ? [...layout.dangerZone] : []);
                  setEditSajgon(layout.sajgonZone ? [...layout.sajgonZone] : []);
                  setAnnotateMode(null);
                }}>Anuluj</Btn>
              </div>
            )}
          </div>
        </Section>

        {/* ═══ SECTION 3: POLE (canvas preview, read-only) ═══ */}
        <Section id="pole" title="Podgląd pola" icon="🗺️" open={openSection === 'pole'} onToggle={toggleSection}>
          <div style={{ marginTop: 8 }}>
            {/* Simple layer checkboxes */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
              {[
                { label: 'Nazwy bunkrów', checked: showBunkers, toggle: () => setShowBunkers(v => !v) },
                { label: 'Linie', checked: showLines, toggle: () => setShowLines(v => !v) },
                { label: 'Strefy', checked: showZones, toggle: () => setShowZones(v => !v) },
              ].map(({ label, checked, toggle }) => (
                <label key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim }}>
                  <input type="checkbox" checked={checked} onChange={toggle} style={{ accentColor: COLORS.accent }} />
                  {label}
                </label>
              ))}
            </div>
            <FieldCanvas
              {...canvasProps}
              layoutEditMode={null}
              editDangerPoints={[]}
              editSajgonPoints={[]}
            />
          </div>
        </Section>

        {/* ═══ SECTION 4: TAKTYKI ═══ */}
        <Section id="tactics" title="Taktyki" icon="⚔️" open={openSection === 'tactics'} onToggle={toggleSection}
          badge={`${tactics.length}`}>
          <div style={{ marginTop: 8 }}>
            <Btn variant="accent" size="sm" onClick={() => setTacticModalOpen(true)} style={{ marginBottom: 10 }}>
              <Icons.Plus /> Nowa taktyka
            </Btn>

            {tacticsLoading && <EmptyState icon="⏳" text="Ładowanie..." />}
            {!tacticsLoading && !tactics.length && (
              <EmptyState icon="⚔️" text="Brak taktyk — utwórz pierwszą" />
            )}

            {tactics.map(t => (
              <div key={t.id}
                onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 8, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`,
                  marginBottom: 6, cursor: 'pointer', minHeight: TOUCH.minTarget,
                }}>
                <span style={{ fontSize: 20 }}>⚔️</span>
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
        </Section>

      </div>

      {/* Tactic name modal */}
      <Modal open={tacticModalOpen} onClose={() => setTacticModalOpen(false)} title="Nowa taktyka"
        footer={<>
          <Btn variant="default" onClick={() => setTacticModalOpen(false)}>Anuluj</Btn>
          <Btn variant="accent" disabled={!newTacticName.trim()} onClick={handleAddTactic}><Icons.Check /> Utwórz</Btn>
        </>}>
        <Input value={newTacticName} onChange={setNewTacticName} placeholder="Nazwa taktyki, np. Snake Attack"
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
      </Modal>
    </div>
  );
}
