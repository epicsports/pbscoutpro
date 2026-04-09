/**
 * TacticPage — scouting-style tactic editor
 * Routes: /layout/:layoutId/tactic/:tacticId
 *         /tournament/:tournamentId/tactic/:tacticId
 *
 * Same interaction model as MatchPage scouting editor:
 * full-height canvas, floating toolbar on player tap, drag-to-bump, ShotDrawer.
 */
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';

import FieldCanvas from '../components/FieldCanvas';
import ShotDrawer from '../components/ShotDrawer';
import PageHeader from '../components/PageHeader';
import { Btn, Modal, Input, Icons, ActionSheet, MoreBtn, ConfirmModal } from '../components/ui';
import { useLayouts, useLayoutTactics, useTournaments, useTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, responsive } from '../utils/theme';

export default function TacticPage() {
  const { tournamentId, layoutId: paramLayoutId, tacticId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);

  // Determine if layout-mode or tournament-mode
  const isLayoutMode = !!paramLayoutId;
  const { layouts } = useLayouts();
  const { tournaments } = useTournaments();
  const tournament = tournamentId ? tournaments.find(t => t.id === tournamentId) : null;
  const layoutId = paramLayoutId || tournament?.layoutId;
  const layout = layouts.find(l => l.id === layoutId);

  // Tactics — from layout or tournament
  const { tactics: layoutTactics } = useLayoutTactics(isLayoutMode ? layoutId : null);
  const { tactics: tournamentTactics } = useTactics(isLayoutMode ? null : tournamentId);
  const tactics = isLayoutMode ? layoutTactics : tournamentTactics;
  const tactic = tactics.find(t => t.id === tacticId);

  // Field data from layout
  const field = {
    fieldImage: layout?.fieldImage,
    bunkers: layout?.bunkers || [],
    fieldCalibration: layout?.fieldCalibration || null,
  };

  // ── State ──
  const [players, setPlayers] = useState([null, null, null, null, null]);
  const [shots, setShots] = useState([[], [], [], [], []]);
  const [bumps, setBumps] = useState([null, null, null, null, null]);

  const [selPlayer, setSelPlayer] = useState(null);
  const [toolbarPlayer, setToolbarPlayer] = useState(null);
  const [shotMode, setShotMode] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [renameModal, setRenameModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ── Load from Firestore (handles old steps[] and new flat format) ──
  useEffect(() => {
    if (!tactic) return;
    // New format: flat players/shots/bumps
    if (tactic.players) {
      setPlayers(Array.isArray(tactic.players) ? tactic.players : [null, null, null, null, null]);
      const rawShots = tactic.shots || [[], [], [], [], []];
      setShots(Array.isArray(rawShots)
        ? rawShots.map(s => Array.isArray(s) ? s : Object.values(s || {}))
        : [0, 1, 2, 3, 4].map(i => {
            const v = rawShots[String(i)]; return Array.isArray(v) ? v : [];
          })
      );
      setBumps(tactic.bumps || [null, null, null, null, null]);
    }
    // Old format: steps[0]
    else if (tactic.steps?.[0]) {
      const s = tactic.steps[0];
      setPlayers(Array.isArray(s.players) ? s.players : [null, null, null, null, null]);
      const rawShots = s.shots || [[], [], [], [], []];
      setShots(Array.isArray(rawShots)
        ? rawShots.map(sh => Array.isArray(sh) ? sh : Object.values(sh || {}))
        : [0, 1, 2, 3, 4].map(i => {
            const v = rawShots[String(i)]; return Array.isArray(v) ? v : [];
          })
      );
      setBumps(Array.isArray(s.bumps) ? s.bumps : [null, null, null, null, null]);
    }
    setNewName(tactic.name || '');
    setLoaded(true);
  }, [tactic?.id]);

  // ── Dirty check ──
  const isDirty = useMemo(() => {
    if (!tactic || !loaded) return false;
    const origPlayers = tactic.players || tactic.steps?.[0]?.players || [null, null, null, null, null];
    const origShots = tactic.shots || tactic.steps?.[0]?.shots || [[], [], [], [], []];
    const origBumps = tactic.bumps || tactic.steps?.[0]?.bumps || [null, null, null, null, null];
    return JSON.stringify(players) !== JSON.stringify(origPlayers)
      || JSON.stringify(shots) !== JSON.stringify(origShots)
      || JSON.stringify(bumps) !== JSON.stringify(origBumps);
  }, [players, shots, bumps, tactic, loaded]);

  // ── Save ──
  const handleSave = async () => {
    setSaving(true);
    try {
      const data = { players, shots: ds.shotsToFirestore(shots), bumps };
      if (isLayoutMode) {
        await ds.updateLayoutTactic(layoutId, tacticId, data);
      } else {
        await ds.updateTactic(tournamentId, tacticId, data);
      }
      setIsDirty(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      console.error('Save error:', e);
      alert('Save failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  // ── Rename ──
  const handleRename = async () => {
    if (!newName.trim()) return;
    if (isLayoutMode) {
      await ds.updateLayoutTactic(layoutId, tacticId, { name: newName.trim() });
    } else {
      await ds.updateTactic(tournamentId, tacticId, { name: newName.trim() });
    }
    setRenameModal(false);
  };

  // ── Delete ──
  const handleDelete = async () => {
    if (isLayoutMode) {
      await ds.deleteLayoutTactic(layoutId, tacticId);
      navigate(`/layout/${layoutId}`);
    } else {
      await ds.deleteTactic(tournamentId, tacticId);
      navigate(`/tournament/${tournamentId}`);
    }
  };

  // ── Toolbar items — only Shot + Del ──
  const toolbarItems = useMemo(() => {
    if (toolbarPlayer === null) return [];
    return [
      { icon: '🎯', label: 'Shot', color: COLORS.textDim, action: 'shoot' },
      { icon: '✕', label: 'Del', color: COLORS.textMuted, action: 'remove' },
    ];
  }, [toolbarPlayer]);

  const handleToolbarAction = (action, idx) => {
    if (action === 'close') { setToolbarPlayer(null); return; }
    if (action === 'shoot') { setShotMode(idx); setToolbarPlayer(null); }
    if (action === 'remove') { removePlayer(idx); setToolbarPlayer(null); }
  };

  const handleSelectPlayer = (idx) => {
    setToolbarPlayer(toolbarPlayer === idx ? null : idx);
  };

  // ── Player handlers ──
  const handlePlacePlayer = (pos) => {
    setPlayers(prev => {
      const next = [...prev];
      const idx = next.findIndex(p => p === null);
      if (idx >= 0) { next[idx] = pos; setSelPlayer(idx); }
      return next;
    });
  };

  const handleMovePlayer = (idx, pos) => {
    setPlayers(prev => { const n = [...prev]; n[idx] = pos; return n; });
  };

  const handleBumpPlayer = (idx, fromPos) => {
    setBumps(prev => { const n = [...prev]; n[idx] = { x: fromPos.x, y: fromPos.y }; return n; });
  };

  const removePlayer = (idx) => {
    setPlayers(prev => prev.map((p, i) => i === idx ? null : p));
    setShots(prev => prev.map((s, i) => i === idx ? [] : s));
    setBumps(prev => prev.map((b, i) => i === idx ? null : b));
    setSelPlayer(null);
  };

  // ── Shot handlers ──
  const handlePlaceShot = (pi, pos) => {
    setShots(prev => { const n = prev.map(a => [...a]); n[pi].push(pos); return n; });
  };

  const handleDeleteShot = (pi, si) => {
    setShots(prev => { const n = prev.map(a => [...a]); n[pi].splice(si, 1); return n; });
  };

  // ── Navigation ──
  const backTo = isLayoutMode ? `/layout/${layoutId}` : `/tournament/${tournamentId}`;
  const backLabel = isLayoutMode ? 'Layout' : 'Tournament';

  // ── Auto-print when ?print=1 ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('print') === '1' && tactic) {
      setTimeout(() => window.print(), 500);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [tactic?.id]);

  if (!tactic) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: FONT, color: COLORS.textMuted }}>Loading...</div>
    </div>
  );

  return (
    <div style={{
      height: '100dvh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
    }}>
      {/* ═══ HEADER ═══ */}
      <div className="no-print">
        <PageHeader
          back={{ to: backTo }}
          title={tactic.name || 'Tactic'}
          subtitle={(layout?.name || backLabel).toUpperCase()}
          action={<MoreBtn onClick={() => setMenuOpen(true)} />}
        />
      </div>

      {/* Print title (hidden in normal view) */}
      <div className="print-title" style={{ display: 'none' }}>
        {tactic.name}
      </div>

      {/* ═══ CANVAS ═══ */}
      <div className="print-area" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <FieldCanvas
          fieldImage={field.fieldImage}
          maxCanvasHeight={typeof window !== 'undefined' ? window.innerHeight - 200 : 500}
          players={players}
          shots={shots}
          bumpStops={bumps}
          eliminations={[false, false, false, false, false]}
          eliminationPositions={[null, null, null, null, null]}
          onPlacePlayer={handlePlacePlayer}
          onMovePlayer={handleMovePlayer}
          onPlaceShot={handlePlaceShot}
          onDeleteShot={handleDeleteShot}
          onBumpPlayer={handleBumpPlayer}
          onSelectPlayer={handleSelectPlayer}
          editable
          selectedPlayer={selPlayer}
          mode={shotMode !== null ? 'shoot' : 'place'}
          toolbarPlayer={toolbarPlayer}
          toolbarItems={toolbarItems}
          onToolbarAction={handleToolbarAction}
          bunkers={field.bunkers}
          showBunkers={true}
          fieldCalibration={field.fieldCalibration}
          discoLine={0}
          zeekerLine={0}
        />
      </div>

      {/* ═══ BOTTOM BAR ═══ */}
      <div className="no-print" style={{
        padding: '10px 12px',
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
      }}>
        <Btn variant={savedFlash ? 'default' : 'accent'}
          style={{ width: '100%', padding: '14px 0', fontSize: FONT_SIZE.base, fontWeight: 700,
            ...(savedFlash ? { background: COLORS.success + '20', borderColor: COLORS.success, color: COLORS.success } : {}),
          }}
          onClick={handleSave}
          disabled={(!isDirty && !savedFlash) || saving}>
          {saving ? 'Saving...' : savedFlash ? '✓ Saved' : 'Save tactic'}
        </Btn>
      </div>

      {/* ═══ SHOT DRAWER ═══ */}
      <ShotDrawer
        open={shotMode !== null}
        onClose={() => setShotMode(null)}
        playerIndex={shotMode}
        playerLabel={shotMode !== null ? `P${shotMode + 1}` : ''}
        playerColor={shotMode !== null ? COLORS.playerColors[shotMode] : '#fff'}
        fieldSide="left"
        fieldImage={field.fieldImage}
        bunkers={field.bunkers || []}
        shots={shotMode !== null ? (shots[shotMode] || []) : []}
        onAddShot={pos => { if (shotMode !== null) handlePlaceShot(shotMode, pos); }}
        onUndoShot={() => {
          if (shotMode !== null && shots[shotMode]?.length) {
            handleDeleteShot(shotMode, shots[shotMode].length - 1);
          }
        }}
      />

      {/* ═══ ACTION SHEET ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: 'Rename', onPress: () => { setNewName(tactic.name || ''); setRenameModal(true); } },
        { label: 'Print', onPress: () => window.print() },
        { separator: true },
        { label: 'Delete tactic', danger: true, onPress: () => setDeleteModal(true) },
      ]} />

      {/* ═══ RENAME MODAL ═══ */}
      <Modal open={renameModal} onClose={() => setRenameModal(false)} title="Rename tactic"
        footer={<>
          <Btn variant="default" onClick={() => setRenameModal(false)}>Cancel</Btn>
          <Btn variant="accent" onClick={handleRename} disabled={!newName.trim()}><Icons.Check /> Save</Btn>
        </>}>
        <Input value={newName} onChange={setNewName} placeholder="Tactic name" autoFocus
          onKeyDown={e => e.key === 'Enter' && handleRename()} />
      </Modal>

      {/* ═══ DELETE CONFIRM ═══ */}
      <ConfirmModal
        open={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete tactic"
        message="This tactic and all its data will be permanently lost."
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
