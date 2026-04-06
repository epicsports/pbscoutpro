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
  const [showLabels, setShowLabels] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showZones, setShowZones] = useState(false);

  // ── UI state ──
  const [infoModal, setInfoModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mirrorModal, setMirrorModal] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [newTacticName, setNewTacticName] = useState('');
  const [newTacticModal, setNewTacticModal] = useState(false);
  const [tacticMenu, setTacticMenu] = useState(null);
  const [deleteTacticModal, setDeleteTacticModal] = useState(null);

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

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ HEADER ═══ */}
      <PageHeader
        back={{ label: 'Layouts', to: '/layouts' }}
        title={name}
        badges={<><LeagueBadge league={league} /> <YearBadge year={year} /></>}
        right={<MoreBtn onClick={() => setMenuOpen(true)} />}
      />

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ═══ FIELD CANVAS ═══ */}
        <div style={{
          overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          <FieldCanvas
            fieldImage={image}
            players={[]} shots={[]} bumpStops={[]}
            eliminations={[]} eliminationPositions={[]}
            editable={false}
            selectedBunkerId={selectedBunker?.id || null}
            pendingBunkerPos={bunkerCardOpen && !selectedBunker ? newBunkerPos : null}
            discoLine={showLines ? disco / 100 : 0}
            zeekerLine={showLines ? zeeker / 100 : 0}
            bunkers={editBunkers}
            showBunkers={showLabels}
            dangerZone={editDanger.length >= 3 ? editDanger : null}
            sajgonZone={editSajgon.length >= 3 ? editSajgon : null}
            showZones={showZones}
            layoutEditMode="bunker"
            onBunkerPlace={handleBunkerTap}
            onBunkerMove={handleBunkerMove}
            onBunkerLabelNudge={(id, delta) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? -1) + delta } : b))}
            onBunkerLabelOffset={(id, steps) => setEditBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: steps } : b))}
          />
        </div>

        {/* ═══ TOGGLE ROW ═══ */}
        <div style={{ display: 'flex', gap: 14, padding: '10px 16px' }}>
          <Checkbox label="Labels" checked={showLabels} onChange={setShowLabels} />
          <Checkbox label="Lines" checked={showLines} onChange={setShowLines} />
          <Checkbox label="Zones" checked={showZones} onChange={setShowZones} />
        </div>

        {/* ═══ TACTICS SECTION ═══ */}
        <div style={{ padding: `0 ${R.layout.padding}px`, paddingBottom: 80 }}>
          <SectionTitle right={
            <Btn variant="accent" size="sm" onClick={() => setNewTacticModal(true)}><Icons.Plus /> New</Btn>
          }>
            Tactics ({tactics.length})
          </SectionTitle>

          {tacticsLoading && <SkeletonList count={2} />}
          {!tacticsLoading && !tactics.length && <EmptyState icon="---" text="No tactics yet" />}

          {tactics.map(t => (
            <Card
              key={t.id}
              icon="---"
              title={t.name}
              subtitle={`${t.steps?.length || 0} steps`}
              onClick={() => navigate(`/layout/${layoutId}/tactic/${t.id}`)}
              actions={<MoreBtn onClick={() => setTacticMenu(t)} />}
            />
          ))}
        </div>
      </div>

      {/* ═══ STICKY NEW TACTIC ═══ */}
      <div style={{
        position: 'sticky', bottom: 0, padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: `linear-gradient(transparent, ${COLORS.bg} 30%)`,
        zIndex: 10,
      }}>
        <Btn variant="accent" onClick={() => setNewTacticModal(true)}
          style={{ width: '100%', justifyContent: 'center' }}>
          <Icons.Plus /> New tactic
        </Btn>
      </div>

      {/* ═══ ACTION SHEET — page menu ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: 'Edit layout info', onPress: () => setInfoModal(true) },
        { label: 'Re-calibrate field', onPress: () => navigate(`/layout/${layoutId}/calibrate`) },
        { label: 'Re-scan bunkers (Vision)', onPress: () => setOcrOpen(true) },
        { separator: true },
        { label: 'Delete layout', onPress: () => setDeleteModal(true), danger: true },
      ]} />

      {/* ═══ ACTION SHEET — tactic menu ═══ */}
      <ActionSheet open={!!tacticMenu} onClose={() => setTacticMenu(null)} actions={[
        { label: 'Edit', onPress: () => navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}`) },
        { label: 'Duplicate', onPress: () => duplicateTactic(tacticMenu) },
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
    </div>
  );
}
