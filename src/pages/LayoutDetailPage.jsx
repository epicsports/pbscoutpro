/**
 * LayoutDetailPage — single scrollable page per CC_BRIEF_LAYOUT_REDESIGN Part 2
 * Route: /layout/:layoutId
 *
 * Structure: PageHeader → FieldCanvas → Toggle row → Tactics list → Sticky New tactic
 */
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import { useTrackedSave } from '../hooks/useSaveStatus';

import InteractiveCanvas from '../components/canvas/InteractiveCanvas';
import FullscreenToggle from '../components/canvas/FullscreenToggle';
import { useLandscapeMode } from '../hooks/useLandscapeMode';
import BunkerCard from '../components/BunkerCard';
import OCRBunkerDetect from '../components/OCRBunkerDetect';
import PageHeader from '../components/PageHeader';
import { Btn, EmptyState, SkeletonList, Modal, Input, Select, Icons, LeagueBadge, YearBadge, ActionSheet, MoreBtn, ConfirmModal } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import { useWorkspace } from '../hooks/useWorkspace';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useLeagues } from '../hooks/useLeagues';
import { useLanguage } from '../hooks/useLanguage';
import CalibrationView from '../components/CalibrationView';
import { compressImage, yearOptions, uid } from '../utils/helpers';
import { bunkerStableKey } from '../utils/bunkerNames';
import { STATIC_FLAGS } from '../utils/featureFlags';
import {
  resolveZones, promoteSyntheticIds, dualWriteLegacyFromZones, makeNewZone,
} from '../utils/layoutZones';
import { Pencil, Trash2, Hexagon, Minus, Tag } from 'lucide-react';

export default function LayoutDetailPage() {
  const { t } = useLanguage();
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();   // § back target — honor where we came from
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts, loading: layoutsLoading } = useLayouts();
  const { tactics, loading: tacticsLoading } = useLayoutTactics(layoutId);
  const { workspace, isAdmin } = useWorkspace();   // § 98 — per-team admin owns layout config (zones/lines/names)
  const isSuper = useIsSuperAdmin();   // § 96 — base geometry is super_admin-curated; coaches edit overlay (zones/naming/tactics) only
  const tracked = useTrackedSave();

  const layout = layouts?.find(l => l.id === layoutId);

  // §H3 no-eternal-loading — bounded 12s wait. If the layouts subscription
  // never fires (network issue / deleted layout URL), flip to error state.
  const [layoutLoadTimedOut, setLayoutLoadTimedOut] = useState(false);
  useEffect(() => {
    if (layout) { setLayoutLoadTimedOut(false); return undefined; }
    const id = setTimeout(() => setLayoutLoadTimedOut(true), 12000);
    return () => clearTimeout(id);
  }, [layout]);

  const leaguesList = useLeagues();

  // ── Editable state ──
  const [name, setName] = useState('');
  const [league, setLeague] = useState('NXL');
  const [year, setYear] = useState(new Date().getFullYear());
  const [image, setImage] = useState(null);
  const [disco, setDisco] = useState(30);
  const [zeeker, setZeeker] = useState(80);
  // § 98 STAGE 4 — division-line metadata (name/color) → overlay.lineDivision.
  const [lineDivMeta, setLineDivMeta] = useState({
    disco: { name: 'Dorito side', color: '#fb923c' },
    zeeker: { name: 'Snake side', color: '#22d3ee' },
  });
  const [editBunkers, setEditBunkers] = useState([]);
  // § 88 — unified zones. editZones holds the full layout.zones[]; the legacy
  // 3 named fields are derived via dualWriteLegacyFromZones on persist.
  const [editZones, setEditZones] = useState([]);
  // § 98 STAGE 4b — callout lines (overlay.lines[]): display-only comms lines,
  // 0..N, each { id, name, color, trackSide:'above'|'below', geometry:{a,b}|null }.
  const [editLines, setEditLines] = useState([]);
  const [lineDrawMode, setLineDrawMode] = useState(null);   // callout line id being drawn | null
  const [lineDeleteConfirm, setLineDeleteConfirm] = useState(null);
  // § 98 STAGE 5 — per-team bunker callouts (overlay.bunkerNames map) + rename target.
  const [editBunkerNames, setEditBunkerNames] = useState({});
  const [renameBunker, setRenameBunker] = useState(null);   // bunker being renamed | null
  const [renameValue, setRenameValue] = useState('');
  // drawPoints = polygon being actively drawn (decoupled from editZones until
  // Save commits). Snapshot of the original polygon taken on draw-enter so
  // Cancel can discard.
  const [drawPoints, setDrawPoints] = useState([]);
  const [zoneDeleteConfirm, setZoneDeleteConfirm] = useState(null);   // zoneId | null
  const [renamingZoneId, setRenamingZoneId] = useState(null);
  const [colorPopoverZoneId, setColorPopoverZoneId] = useState(null);
  const [calibration, setCalibration] = useState({ homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const dragRef = useRef(null); // { type: 'disco'|'zeeker', startY, startVal }

  // ── Toggle state ──
  const [showLabels, setShowLabels] = useState(false);
  const [showLines, setShowLines] = useState(true);
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
  // § 98 — canvas-first config mode-switcher. null = view only; 'zones'|'lines'
  // are the per-team admin config layers (Nazwy lands Stage 5). Admin-gated.
  const [configMode, setConfigMode] = useState(null);
  const [zoneDrawMode, setZoneDrawMode] = useState(null); // § 88 — null | <zoneId>; was the legacy enum 'danger'|'sajgon'|'bigMove'
  const [deletePassword, setDeletePassword] = useState('');
  const [newTacticName, setNewTacticName] = useState('');
  const [newTacticModal, setNewTacticModal] = useState(false);
  const [tacticMenu, setTacticMenu] = useState(null);
  const [tacticsDrawer, setTacticsDrawer] = useState(false);
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
    setLineDivMeta({
      disco: {
        name: layout.lineDivision?.disco?.name || 'Dorito side',
        color: layout.lineDivision?.disco?.color || '#fb923c',
      },
      zeeker: {
        name: layout.lineDivision?.zeeker?.name || 'Snake side',
        color: layout.lineDivision?.zeeker?.color || '#22d3ee',
      },
    });
    // § b2 — strip the merge-attached `displayName` so the super-admin geometry
    // save (handleBunkerSave/Delete/add → updateBaseLayout({bunkers})) never
    // writes a workspace display name into the shared base. Identity (positionName)
    // stays raw; per-team names live only in the overlay (editBunkerNames).
    setEditBunkers(layout.bunkers ? layout.bunkers.map(({ displayName, ...b }) => b) : []);
    // § 88 — resolve zones (prefer layout.zones[]; fall back to synthesizing
    // from the legacy dangerZone/sajgonZone/bigMoveZone fields). Promote any
    // synth `legacy-*` ids to UUIDs so subsequent edits work with stable IDs.
    setEditZones(promoteSyntheticIds(resolveZones(layout)));
    setEditLines(Array.isArray(layout.lines) ? layout.lines.map(l => ({ ...l })) : []);
    setEditBunkerNames(layout.bunkerNameOverrides || {});   // § b2a — stableKey-keyed (normalized by the useLayouts merge)
    setCalibration(layout.fieldCalibration || { homeBase: { x: 0.05, y: 0.5 }, awayBase: { x: 0.95, y: 0.5 } });
  }, [layout?.id]);

  // § 98 / § b2a — apply per-team bunker names at the DISPLAY layer only, keyed
  // by STABLE identity (`masterId || id`), NOT positionName. The merge keeps
  // base.bunkers raw (so the super_admin base editor isn't masked/corrupted) and
  // never overwrites positionName. stableKey collapses master+mirror to one key
  // (pair-rename preserved) while giving two distinct same-named obstacles
  // independent keys (the bug fix). Memoized so the canvas doesn't redraw every
  // render.
  const displayBunkers = useMemo(
    () => editBunkers.map(b => {
      const k = bunkerStableKey(b);
      return editBunkerNames[k] ? { ...b, positionName: editBunkerNames[k] } : b;
    }),
    [editBunkers, editBunkerNames],
  );

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
    // § 96 — name/league/year/image/lines are BASE (shared). super_admin edits
    // the global base; a coach can only set a workspace-local name override.
    if (isSuper) {
      await tracked(() => ds.updateBaseLayout(layoutId, {
        name: name.trim(), league, year: Number(year), fieldImage: image,
      }));
    } else {
      await tracked(() => ds.updateLayoutOverlay(layoutId, { nameOverride: name.trim() }));
    }
    setSaving(false);
    setInfoModal(false);
  };


  // Auto-save layout data.
  // § 88 — Single source of truth for zones is `editZones[]`. The legacy
  // dangerZone/sajgonZone/bigMoveZone fields are derived via
  // dualWriteLegacyFromZones so existing readers (coachingStats danger/
  // sajgon + computeBigMoves) keep working until v2 cleanup. Synth ids
  // promoted to UUIDs (idempotent — first-edit-after-legacy migrates).
  const saveLayoutData = useCallback(async () => {
    // § 96 — split write across the base/overlay seam:
    //   • OVERLAY (zones + legacy mirror) — workspace-local, every coach writes it.
    //   • BASE (lines + bunkers + calibration) — global, super_admin only.
    // The debounce fires on any edit; routing keeps a coach's zone edits off
    // the shared base (rules would deny it anyway).
    const promotedZones = promoteSyntheticIds(editZones);
    const zoneMirror = dualWriteLegacyFromZones(promotedZones);
    // § 98 — layout config (zones + the 2 division lines) is local-admin-owned
    // (overlay write is isAdmin in rules). Gate the CLIENT write too so a coach
    // viewing a layout never fires a denied overlay write on the load-debounce.
    // Nested-map literal for lineDivision — NOT dot-notation (setDoc gotcha).
    if (isAdmin) {
      await tracked(() => ds.updateLayoutOverlay(layoutId, {
        baseLayoutId: layoutId,
        zones: promotedZones,
        ...zoneMirror,
        lineDivision: {
          disco:  { y: disco / 100,  name: lineDivMeta.disco.name,  color: lineDivMeta.disco.color },
          zeeker: { y: zeeker / 100, name: lineDivMeta.zeeker.name, color: lineDivMeta.zeeker.color },
        },
        lines: editLines,   // § 98 4b — callout lines (display-only)
        // § b2a — persist the stableKey-keyed override map (this is the lazy
        // migration's "persist-on-next-write"). editBunkerNames was loaded from
        // the merge's normalized map, so any legacy positionName/id keys are
        // already reconciled to stableKeys + stale keys dropped. Retire the
        // legacy id-keyed `bunkerNames` field so it can't shadow on re-read.
        bunkerNameOverrides: editBunkerNames,
        bunkerNames: {},
      }));
    }
    if (isSuper) {
      // § 98 — disco/zeeker no longer written to base (now per-team overlay).
      // § 98 5 — bunkers are NOT written here either: editBunkers carries the
      // MERGED per-team positionName, so writing it back would leak per-team
      // names into the shared base. Bunker geometry is edited on
      // BunkerEditorPage (writes base directly). Only calibration remains.
      await tracked(() => ds.updateBaseLayout(layoutId, {
        fieldCalibration: calibration,
      }));
    }
  }, [layoutId, disco, zeeker, lineDivMeta, editLines, editBunkerNames, editBunkers, editZones, calibration, isSuper, isAdmin]);

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
      // § 96 — bunker geometry is BASE (super_admin-curated, global).
      if (isSuper) await tracked(() => ds.updateBaseLayout(layoutId, { bunkers: editBunkers }));
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
      if (isSuper) tracked(() => ds.updateBaseLayout(layoutId, { bunkers: result }));   // § 96 — base geometry
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
    // § 96 — a coach removes the layout from THEIR workspace (deletes the
    // overlay only). A super_admin additionally deletes the shared global
    // base (curated library op; affects every workspace).
    await ds.removeLayoutFromWorkspace(layoutId);
    if (isSuper) await ds.deleteBaseLayout(layoutId);
    navigate('/layouts');
  };

  // § 76 hotfix — `useLandscapeMode()` MUST be called BEFORE the conditional
  // returns below; calling it after the `if (layoutsLoading) return ...` /
  // `if (!layout) return ...` short-circuits means render N (loading=true)
  // has FEWER hooks than render N+1 (loading=false) → React 18 hard error
  // "Rendered more hooks than during the previous render." The pre-existing
  // 1-internal-hook delta (useCallback) had been silent; § 76 added useState
  // for `fsActive` + a second useCallback for `setFullscreen`, pushing the
  // delta past whatever margin React was tolerating.
  //
  // § 76 FS Stage 2 — chrome-hide / maxWidth read `immersive` (landscape OR
  // portrait-FS); `isLandscape` retained for <FullscreenToggle> visibility
  // gate only (toggle renders null in landscape — rotation already immerses).
  const { isLandscape, fsActive, immersive, setFullscreen, canvasMaxHeight } = useLandscapeMode();

  if (layoutsLoading && !layoutLoadTimedOut) return <SkeletonList count={4} />;
  if (!layout) return (
    <div data-testid="layout-load-error">
      <EmptyState
        icon="⚠️"
        text={t('layout_load_error')}
        subtitle={t('layout_load_error_sub')}
      />
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <Btn variant="accent" onClick={() => { setLayoutLoadTimedOut(false); navigate(0); }}>{t('match_retry')}</Btn>
      </div>
    </div>
  );

  return (
    <div style={{ height: '100dvh', maxWidth: immersive ? '100%' : (R.layout.maxWidth || 640), margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      {/* ═══ HEADER (hidden in immersive) ═══ */}
      {!immersive && (
      <PageHeader
        back={{ to: location.state?.from || '/layouts' }}
        title={name}
        subtitle={t('layout_detail_subtitle')}
        badges={<><LeagueBadge league={league} /> <YearBadge year={year} /></>}
        action={<MoreBtn onClick={() => setMenuOpen(true)} />}
      />
      )}

      {/* ═══ IMMERSIVE FLOATING CONTROLS (landscape OR portrait-FS) ═══ */}
      {immersive && (
        <>
        <div style={{ position: 'fixed', top: 12, left: 12, display: 'flex', gap: 8, zIndex: 50 }}>
          <Btn variant="default" size="sm" onClick={() => navigate('/layouts')}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ‹ {t('back')}
          </Btn>
          <Btn variant="default" size="sm" onClick={() => setMenuOpen(true)}
            style={{ background: COLORS.surface + 'dd', backdropFilter: 'blur(8px)', padding: '8px 12px' }}>
            ⋮
          </Btn>
        </div>
        {/* Left edge tabs */}
        <div style={{ position: 'fixed', left: 0, top: 52, bottom: 12,
          zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
          {[
            { label: t('layout_detail_tab_labels'), color: COLORS.accent, active: showLabels, onClick: () => setShowLabels(v => !v) },
            { label: t('layout_detail_tab_lines'), color: COLORS.bump, active: showLines, onClick: () => setShowLines(v => !v) },
            { label: t('layout_detail_tab_zones'), color: COLORS.info, active: showZones, onClick: () => setShowZones(v => !v) },
            { label: t('layout_detail_tab_deaths'), icon: '💀', color: COLORS.danger, onClick: () => navigate(`/layout/${layoutId}/analytics/deaths`) },
            { label: t('layout_detail_tab_positions'), icon: '🎯', color: COLORS.success, onClick: () => navigate(`/layout/${layoutId}/analytics/breaks`) },
            // § 112 STAGE 3 — Hitability cumulative section (also the future
            // "akwizycja killi" tab seed; not a separate tab yet).
            { label: t('layout_detail_tab_hits'), icon: '💥', color: COLORS.accent, onClick: () => navigate(`/layout/${layoutId}/analytics/trafialnosc`) },
          ].map(tab => (
            <div key={tab.label} onClick={tab.onClick} style={{
              background: tab.active ? (tab.color + '25') : COLORS.surface + 'ee',
              backdropFilter: 'blur(8px)',
              borderRadius: '0 8px 8px 0',
              border: `1px solid ${tab.active ? tab.color + '60' : COLORS.border}`, borderLeft: 'none',
              padding: '8px 6px',
              cursor: 'pointer',
              boxShadow: '2px 0 8px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            }}>
              {tab.icon && <span style={{ fontSize: 14, lineHeight: 1 }}>{tab.icon}</span>}
              <div style={{
                writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                fontFamily: FONT, fontSize: 10, fontWeight: 700,
                color: tab.active ? tab.color : COLORS.textMuted,
                letterSpacing: '1px', whiteSpace: 'nowrap',
              }}>{tab.label}</div>
            </div>
          ))}
        </div>
        {/* Tactics edge tab — right side, centered vertically */}
        {!tacticsDrawer && (
          <div onClick={() => setTacticsDrawer(true)} style={{
            position: 'fixed', right: 0, top: '50%', transform: 'translateY(-50%)',
            zIndex: 50, cursor: 'pointer',
            background: COLORS.surface + 'ee', backdropFilter: 'blur(8px)',
            borderRadius: '14px 0 0 14px',
            border: `1px solid ${COLORS.border}`, borderRight: 'none',
            padding: '20px 10px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
            boxShadow: '-4px 0 16px rgba(0,0,0,0.4)',
          }}>
            <div style={{
              writingMode: 'vertical-lr', transform: 'rotate(180deg)',
              fontFamily: FONT, fontSize: 15, fontWeight: 700, color: COLORS.accent,
              letterSpacing: '2px',
            }}>{t('layout_detail_tab_tactics')}</div>
            <div style={{
              width: 26, height: 26, borderRadius: '50%',
              background: COLORS.accent, color: COLORS.black,
              fontFamily: FONT, fontSize: 13, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{(squadCode ? tactics.filter(t => t.squadCode === squadCode) : tactics.filter(t => !t.squadCode)).length}</div>
          </div>
        )}
        </>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ═══ FIELD CANVAS ═══ */}
        <div ref={canvasContainerRef} style={{
          scrollbarWidth: 'none', msOverflowStyle: 'none',
          position: 'relative',
        }}>
          {/* Drag handles for disco/zeeker lines */}
          {!zoneDrawMode && !lineDrawMode && showLines && ['disco', 'zeeker'].map(type => {
            const val = type === 'disco' ? disco : zeeker;
            const color = type === 'disco' ? COLORS.bump : COLORS.zeeker;
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
          <FullscreenToggle fsActive={fsActive} onToggle={() => setFullscreen(!fsActive)} isLandscape={isLandscape} />
          <InteractiveCanvas
            fieldImage={image}
            maxCanvasHeight={canvasMaxHeight(20, 200)}
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
            runners={(() => {
              if (!previewTacticId) return [];
              const t = tactics.find(tc => tc.id === previewTacticId);
              return t?.runners || [];
            })()}
            bumpShots={(() => {
              if (!previewTacticId) return [[], [], [], [], []];
              const t = tactics.find(tc => tc.id === previewTacticId);
              if (!t || !t.bumpShots) return [[], [], [], [], []];
              const raw = t.bumpShots;
              if (Array.isArray(raw)) return raw;
              return [0,1,2,3,4].map(i => raw[String(i)] || []);
            })()}
            freehandStrokes={(() => {
              if (!previewTacticId) return [];
              const t = tactics.find(tc => tc.id === previewTacticId);
              return t?.freehandStrokes || [];
            })()}
            editable={false}
            selectedBunkerId={null}
            discoLine={showLines ? disco / 100 : 0}
            zeekerLine={showLines ? zeeker / 100 : 0}
            discoColor={lineDivMeta.disco.color}
            zeekerColor={lineDivMeta.zeeker.color}
            hideLineLabels={true}
            bunkers={displayBunkers}
            showBunkers={showLabels || configMode === 'names'}
            showHalfLabels={showHalf}
            zones={editZones}
            editZonePoints={(zoneDrawMode || lineDrawMode) ? drawPoints : null}
            showZones={showZones}
            layoutEditMode={zoneDrawMode || lineDrawMode || (configMode === 'names' ? 'bunker' : null)}
            calloutLines={editLines}
            editLinePoints={lineDrawMode ? drawPoints : null}
            activeLineId={lineDrawMode}
            showCalloutLines={showLines}
            showCalloutHatch={configMode === 'lines'}
            onBunkerPlace={configMode === 'names' ? (pos) => {
              // § 98 5 — tap a bunker → per-team rename. Positions read-only:
              // no onBunkerMove wired, so drag is a no-op.
              const hit = editBunkers.find(b => Math.hypot(b.x - pos.x, b.y - pos.y) < 0.05);
              if (hit) {
                setRenameBunker(hit);
                setRenameValue(editBunkerNames[bunkerStableKey(hit)] ?? hit.positionName ?? hit.name ?? '');
              }
            } : undefined}
            onZonePoint={(zoneDrawMode || lineDrawMode) ? (pos) => {
              // § 98 4b — a callout line caps at 2 endpoints; zones are N.
              if (lineDrawMode) { setDrawPoints(prev => prev.length >= 2 ? prev : [...prev, pos]); return; }
              setDrawPoints(prev => [...prev, pos]);
            } : undefined}
            onZonePointMove={(zoneDrawMode || lineDrawMode) ? ({ pointIdx, pos }) => {
              setDrawPoints(prev => prev.map((p, i) => i === pointIdx ? pos : p));
            } : undefined}
            onZonePointDelete={zoneDrawMode ? ({ pointIdx }) => {
              setDrawPoints(prev => prev.filter((_, i) => i !== pointIdx));
            } : undefined}
            onZoneMidpointInsert={zoneDrawMode ? ({ insertAfterIdx, pos }) => {
              setDrawPoints(prev => {
                const next = [...prev];
                next.splice(insertAfterIdx + 1, 0, pos);
                return next;
              });
            } : undefined}
            // touchHandler fires onZoneClose when the user taps on the
            // first vertex of a ≥3-vertex polygon (legacy "close polygon"
            // gesture). Per § 88 the canvas-side close-gesture is treated as
            // SAVE (commit drawPoints onto the zone), mirroring the Save
            // button in the banner. Explicit Cancel still discards.
            onZoneClose={zoneDrawMode ? () => {
              setEditZones(prev => prev.map(z =>
                z.id === zoneDrawMode
                  ? { ...z, polygon: drawPoints.length >= 3 ? drawPoints : z.polygon }
                  : z
              ));
              setDrawPoints([]);
              setZoneDrawMode(null);
            } : undefined}
          />
        </div>

        {/* ═══ § 88 ZONE DRAW MODE INDICATOR ═══ */}
        {zoneDrawMode && (() => {
          const activeZone = editZones.find(z => z.id === zoneDrawMode);
          if (!activeZone) return null;
          const zoneColor = activeZone.color || COLORS.danger;
          const isEditing = drawPoints.length >= 3;
          return (
          <div style={{
            margin: `0 ${SPACE.lg}px`, padding: `${SPACE.sm}px ${SPACE.lg}px`,
            borderRadius: RADIUS.md,
            background: zoneColor + '15',
            // § 27 carve-out — the banner border uses the zone's color
            // (zone identity carrier), not the generic active-state
            // signal. The Save button below is the active CTA.
            borderLeft: `3px solid ${zoneColor}`,
            border: `1px solid ${zoneColor}40`,
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
          }}>
            <div style={{ flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: zoneColor, fontWeight: 600 }}>
              {t('zone_draw_banner', activeZone.name || '')}
            </div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>
              {isEditing ? t('zone_hint_editing') : t('zone_hint_drawing')}
            </div>
            <Btn variant="accent" size="sm" onClick={async () => {
              // Commit drawPoints onto the zone (or clear polygon when <3 vertices).
              setEditZones(prev => prev.map(z =>
                z.id === zoneDrawMode
                  ? { ...z, polygon: drawPoints.length >= 3 ? drawPoints : null }
                  : z
              ));
              setDrawPoints([]);
              setZoneDrawMode(null);
              // saveLayoutData fires automatically via the 2s debounce useEffect.
            }} style={{ padding: '4px 12px', fontSize: FONT_SIZE.xs }}
              disabled={drawPoints.length > 0 && drawPoints.length < 3}>
              ✓ {t('save')}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => {
              setDrawPoints([]);
              setZoneDrawMode(null);
            }}
              style={{ color: COLORS.textMuted, padding: '2px 8px' }}>{t('cancel')}</Btn>
          </div>
          );
        })()}

        {/* ═══ § 98 4b LINE DRAW MODE BANNER ═══ */}
        {lineDrawMode && (() => {
          const activeLn = editLines.find(l => l.id === lineDrawMode);
          if (!activeLn) return null;
          const c = activeLn.color || COLORS.accent;
          return (
          <div style={{
            margin: `0 ${SPACE.lg}px`, padding: `${SPACE.sm}px ${SPACE.lg}px`,
            borderRadius: RADIUS.md, background: c + '15',
            borderLeft: `3px solid ${c}`, border: `1px solid ${c}40`,
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
          }}>
            <div style={{ flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.xs, color: c, fontWeight: 600 }}>
              {t('line_draw_banner', activeLn.name || '')}
            </div>
            <Btn variant="accent" size="sm" onClick={() => {
              setEditLines(prev => prev.map(l =>
                l.id === lineDrawMode
                  ? { ...l, geometry: drawPoints.length >= 2 ? { a: drawPoints[0], b: drawPoints[1] } : l.geometry }
                  : l
              ));
              setDrawPoints([]);
              setLineDrawMode(null);
            }} style={{ padding: '4px 12px', fontSize: FONT_SIZE.xs }}
              disabled={drawPoints.length !== 2}>
              ✓ {t('save')}
            </Btn>
            <Btn variant="ghost" size="sm" onClick={() => { setDrawPoints([]); setLineDrawMode(null); }}
              style={{ color: COLORS.textMuted, padding: '2px 8px' }}>{t('cancel')}</Btn>
          </div>
          );
        })()}

        {/* ═══ § 98 5 NAZWY HINT ═══ */}
        {configMode === 'names' && (
          <div style={{
            margin: `0 ${SPACE.lg}px`, padding: `${SPACE.md}px ${SPACE.lg}px`,
            borderRadius: RADIUS.md, background: COLORS.accent + '12',
            border: `1px solid ${COLORS.accent}30`,
            display: 'flex', alignItems: 'center', gap: SPACE.sm,
          }}>
            <Tag size={16} color={COLORS.accent} />
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.accent }}>
              {t('layout_detail_names_hint')}
            </div>
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
              {t('layout_detail_place_bunkers_hint')}
            </div>
          </div>
        )}
        {/* ═══ TOOLBAR (hidden in immersive) ═══ */}
        {!immersive && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}>
          {[
            { label: 'Aā', active: showLabels, toggle: () => setShowLabels(v => !v) },
            { label: '½', active: showHalf, toggle: () => setShowHalf(v => !v) },
            { label: '═', active: showLines, toggle: () => setShowLines(v => !v) },
            { label: '◇', active: showZones, toggle: () => setShowZones(v => !v) },
          ].map(btn => (
            <div key={btn.label} onClick={btn.toggle} style={{
              fontFamily: FONT, fontSize: 13, fontWeight: 700,
              padding: '5px 12px', borderRadius: RADIUS.full, cursor: 'pointer',
              background: btn.active ? COLORS.accent + '20' : COLORS.surfaceDark,
              color: btn.active ? COLORS.accent : COLORS.textMuted,
              border: `1px solid ${btn.active ? COLORS.accent + '40' : COLORS.border}`,
              transition: 'all .15s',
            }}>{btn.label}</div>
          ))}
          <div style={{ flex: 1 }} />
          {/* § 88 — the 3 hardcoded zone shortcut buttons (DANGER/SAJGON/
              BIG MOVE) are retired. All zone editing flows through the
              new zone list in the Lines & Zones modal, which supports N
              named zones uniformly. */}
        </div>
        )}

        {/* ═══ TACTICS SECTION (hidden in immersive) ═══ */}
        {!immersive && (
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
                🔑 {t('layout_detail_enter_squad_code')}
              </div>
            )}
            <div style={{ flex: 1 }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0 8px' }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
              {t('layout_detail_tactics_heading')} <span style={{ fontWeight: 400, color: COLORS.textMuted, fontSize: FONT_SIZE.sm }}>({(squadCode ? tactics.filter(tc => tc.squadCode === squadCode) : tactics.filter(tc => !tc.squadCode)).length})</span>
            </div>
            <Btn variant="accent" size="sm" onClick={() => { setNewTacticName(''); setNewTacticModal(true); }}
              style={{ padding: '6px 14px', borderRadius: RADIUS.full, fontSize: FONT_SIZE.xs, fontWeight: 700 }}>
              <Icons.Plus /> {t('layout_detail_new_btn')}
            </Btn>
          </div>

          {tacticsLoading && <SkeletonList count={2} />}
          {!tacticsLoading && (squadCode ? tactics.filter(tc => tc.squadCode === squadCode) : tactics.filter(tc => !tc.squadCode)).length === 0 && (
            <EmptyState icon="---" text={squadCode ? t('layout_detail_no_tactics_squad', squadCode) : t('layout_detail_no_tactics')} />
          )}

          {(squadCode ? tactics.filter(tc => tc.squadCode === squadCode) : tactics.filter(tc => !tc.squadCode)).map(tactic => {
            const players = (tactic.players || tactic.steps?.[0]?.players || []).filter(Boolean);
            const discoPct = layout?.discoLine || 0.30;
            const zeekerPct = layout?.zeekerLine || 0.80;
            const inDorito = players.filter(p => p.y < discoPct).length;
            const inSnake = players.filter(p => p.y > zeekerPct).length;
            const inMid = players.length - inDorito - inSnake;
            const toneParts = [];
            if (inDorito) toneParts.push(`${inDorito} dorito`);
            if (inMid) toneParts.push(`${inMid} mid`);
            if (inSnake) toneParts.push(`${inSnake} snake`);
            const tone = toneParts.length ? toneParts.join(' · ') : t('layout_detail_players_placed', players.length);
            const isPreviewing = previewTacticId === tactic.id;

            return (
              <div key={tactic.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 12,
                background: COLORS.surfaceDark, border: `1px solid ${isPreviewing ? COLORS.accent + '60' : COLORS.border}`,
                marginBottom: 6, cursor: 'pointer',
              }}
                onClick={() => navigate(`/layout/${layoutId}/tactic/${tactic.id}`)}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontWeight: 600, fontSize: FONT_SIZE.sm, color: COLORS.text,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tactic.name}</div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginTop: 2 }}>{tone}</div>
                </div>
                <div onClick={(e) => { e.stopPropagation(); setPreviewTacticId(isPreviewing ? null : tactic.id); }}
                  style={{
                    width: 32, height: 32, borderRadius: RADIUS.md,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPreviewing ? COLORS.accent + '20' : 'transparent',
                    color: isPreviewing ? COLORS.accent : COLORS.textMuted,
                    fontSize: 16, flexShrink: 0,
                  }}>
                  👁
                </div>
                <MoreBtn onClick={() => setTacticMenu(tactic)} />
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* ═══ BOTTOM BAR — NEW TACTIC (coach only; admin uses the header + mode bar) ═══ */}
      {!immersive && !isAdmin && (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0, right: 0,
        maxWidth: R.layout.maxWidth || 640,
        margin: '0 auto',
        padding: '10px 16px',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
        background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        zIndex: 30,
      }}>
        <Btn variant="accent" onClick={() => { setNewTacticName(''); setNewTacticModal(true); }}
          style={{ width: '100%', justifyContent: 'center' }}>
          <Icons.Plus /> {t('layout_detail_new_tactic_btn')}
        </Btn>
      </div>
      )}

      {/* ═══ § 98 ADMIN MODE BAR — canvas-first config switcher (admin only) ═══ */}
      {!immersive && isAdmin && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          maxWidth: R.layout.maxWidth || 640, margin: '0 auto',
          background: '#0c1018', borderTop: '1px solid #1f2937',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          display: 'flex', zIndex: 32,
        }}>
          {[
            { key: 'names', label: t('mode_names'), Icon: Tag },
            { key: 'zones', label: t('section_strefy'), Icon: Hexagon },
            { key: 'lines', label: t('mode_lines'), Icon: Minus },
          ].map(m => {
            const active = configMode === m.key;
            return (
              <div key={m.key} onClick={() => {
                const next = active ? null : m.key;
                setConfigMode(next);
                if (next === 'zones') setShowZones(true);
                if (next === 'lines') setShowLines(true);
                if (next === 'names') setShowLabels(true);
              }} style={{
                flex: 1, minHeight: TOUCH.minTarget, padding: '8px 0',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                cursor: 'pointer', color: active ? COLORS.accent : COLORS.textMuted,
                WebkitTapHighlightColor: 'transparent',
              }}>
                <m.Icon size={20} strokeWidth={2} />
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, letterSpacing: '.3px' }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ACTION SHEET — page menu ═══ */}
      <ActionSheet open={menuOpen} onClose={() => setMenuOpen(false)} actions={[
        { label: `+ ${t('layout_detail_new_tactic_btn')}`, onPress: () => { setNewTacticName(''); setNewTacticModal(true); } },
        { label: t('layout_detail_tactics_count', tactics.length), onPress: () => setTacticsDrawer(true) },
        { separator: true },
        // § 98 6 — layout config is local-admin-only; coaches/members get a
        // view-only surface (no edit-info / bunker-base / calibrate / delete).
        ...(isAdmin ? [
          { label: t('layout_detail_edit_info'), onPress: () => setInfoModal(true) },
        ] : []),
        // § b1 — the BunkerEditorPage writes the shared GLOBAL base (geometry +
        // default names/types), so it's super-admin only. Workspace admins rename
        // bunkers per-team via the "Names" config mode below (overlay, local).
        // Previously this was isAdmin-gated → workspace admins hit a locked screen
        // and could mistake it for the per-team rename path.
        ...(isSuper ? [
          { label: t('layout_detail_global_base_menu'), onPress: () => navigate(`/layout/${layoutId}/bunkers`) },
        ] : []),
        // § 98 7 — Ballistics hidden/dormant (built + wired, usage unproven). Code
        // + route (/layout/:id/ballistics) retained; entry removed until justified.
        { label: t('layout_detail_deaths_heatmap'), onPress: () => navigate(`/layout/${layoutId}/analytics/deaths`) },
        { label: t('layout_detail_break_positions'), onPress: () => navigate(`/layout/${layoutId}/analytics/breaks`) },
        // § 112 — Hitability cumulative section (TODO: future "akwizycja killi" tab seeds here).
        { label: t('layout_detail_hitability'), onPress: () => navigate(`/layout/${layoutId}/analytics/trafialnosc`) },
        ...(isAdmin ? [
          { label: t('layout_detail_recalibrate'), onPress: () => { setCalibData(calibration); setCalibDoritoSide(layout?.doritoSide || 'top'); setCalibModal(true); } },
          { separator: true },
          { label: t('delete_layout'), onPress: () => setDeleteModal(true), danger: true },
        ] : []),
      ]} />

      {/* ═══ ACTION SHEET — tactic menu ═══ */}
      <ActionSheet open={!!tacticMenu} onClose={() => setTacticMenu(null)} actions={[
        { label: t('edit'), onPress: () => navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}`) },
        { label: t('layout_detail_tactic_duplicate'), onPress: () => duplicateTactic(tacticMenu) },
        { label: t('layout_detail_tactic_print'), onPress: () => { setTacticMenu(null); navigate(`/layout/${layoutId}/tactic/${tacticMenu?.id}?print=1`); } },
        { separator: true },
        { label: t('delete_tactic'), onPress: () => setDeleteTacticModal(tacticMenu), danger: true },
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
      <Modal open={infoModal} onClose={() => setInfoModal(false)} title={t('layout_detail_modal_title')}
        footer={<>
          <Btn variant="default" onClick={() => setInfoModal(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" disabled={!name.trim() || saving} onClick={handleSaveInfo}>
            <Icons.Check /> {t('save')}
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Input value={name} onChange={setName} placeholder={t('layout_detail_layout_name_ph')} />
          <div style={{ display: 'flex', gap: SPACE.md }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>{t('league_label')}</div>
              <div style={{ display: 'flex', gap: SPACE.xs }}>
                {leaguesList.map(L => {
                  const lg = L.shortName;
                  return (
                    <Btn key={L.id} variant="default" size="sm" active={league === lg}
                      style={{ borderColor: league === lg ? LEAGUE_COLORS[lg] : COLORS.border, color: league === lg ? LEAGUE_COLORS[lg] : COLORS.textDim }}
                      onClick={() => setLeague(lg)}>{lg}</Btn>
                  );
                })}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: SPACE.xs }}>{t('year_label')}</div>
              <Select value={year} onChange={v => setYear(Number(v))}>
                {yearOptions().map(y => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
            <Btn variant="default" onClick={() => fileRef.current?.click()} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Image /> {image ? t('layout_detail_change_image') : t('layout_detail_upload_image')}
            </Btn>
          </div>
        </div>
      </Modal>

      {/* ═══ DELETE LAYOUT ═══ */}
      <ConfirmModal open={deleteModal} onClose={() => { setDeleteModal(false); setDeletePassword(''); }}
        title={t('delete_layout')} danger confirmLabel={t('delete')}
        message={t('layout_detail_delete_msg', name)}
        requirePassword={workspace?.slug}
        password={deletePassword} onPasswordChange={setDeletePassword}
        onConfirm={handleDeleteLayout} />

      {/* ═══ DELETE TACTIC ═══ */}
      <ConfirmModal open={!!deleteTacticModal} onClose={() => setDeleteTacticModal(null)}
        title={t('delete_tactic')} danger confirmLabel={t('delete')}
        message={t('layout_detail_delete_tactic_msg', deleteTacticModal?.name || '')}
        onConfirm={() => { ds.deleteLayoutTactic(layoutId, deleteTacticModal.id); setDeleteTacticModal(null); }} />

      {/* ═══ NEW TACTIC MODAL ═══ */}
      <Modal open={newTacticModal} onClose={() => setNewTacticModal(false)} title={t('layout_detail_new_tactic_btn')}
        footer={<>
          <Btn variant="default" onClick={() => setNewTacticModal(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" disabled={!newTacticName.trim()} onClick={handleAddTactic}><Icons.Check /> {t('create')}</Btn>
        </>}>
        <Input value={newTacticName} onChange={setNewTacticName} placeholder={t('layout_detail_tactic_name_ph')}
          autoFocus onKeyDown={e => e.key === 'Enter' && handleAddTactic()} />
        {squadCode && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim, marginTop: 8 }}>
          {t('layout_detail_squad_code_label')} <strong style={{ color: COLORS.accent }}>{squadCode}</strong>
        </div>}
      </Modal>

      {/* ═══ TACTICS DRAWER (landscape) ═══ */}
      {tacticsDrawer && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex' }}
          onClick={() => setTacticsDrawer(false)}>
          <div style={{ flex: 1 }} />
          <div onClick={e => e.stopPropagation()} style={{
            width: 280, height: '100%', background: COLORS.surface,
            borderLeft: `1px solid ${COLORS.border}`,
            display: 'flex', flexDirection: 'column',
            boxShadow: '-8px 0 32px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
                {t('layout_detail_tactics_count', (squadCode ? tactics.filter(tc => tc.squadCode === squadCode) : tactics.filter(tc => !tc.squadCode)).length)}
              </div>
              <div onClick={() => setTacticsDrawer(false)}
                style={{ fontFamily: FONT, fontSize: 18, color: COLORS.textMuted, cursor: 'pointer', padding: 4 }}>✕</div>
            </div>
            <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
              {squadCode ? (
                <div onClick={() => setSquadInput(true)} style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                  padding: '6px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                  background: COLORS.accent + '20', color: COLORS.accent,
                  border: `1px solid ${COLORS.accent}40`,
                  display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                }}>
                  🔑 {squadCode}
                  <span onClick={(e) => { e.stopPropagation(); updateSquadCode(''); }} style={{ marginLeft: 'auto', opacity: 0.5, fontSize: 12 }}>✕</span>
                </div>
              ) : (
                <div onClick={() => setSquadInput(true)} style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
                  padding: '6px 14px', borderRadius: RADIUS.full, cursor: 'pointer',
                  background: COLORS.surfaceDark, color: COLORS.textMuted,
                  border: `1px dashed ${COLORS.border}`, flex: 1, textAlign: 'center',
                }}>
                  🔑 {t('layout_detail_enter_squad_code')}
                </div>
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              {(squadCode ? tactics.filter(tc => tc.squadCode === squadCode) : tactics.filter(tc => !tc.squadCode)).map(tactic => {
                const tPlayers = (tactic.players || tactic.steps?.[0]?.players || []).filter(Boolean);
                const isPrev = previewTacticId === tactic.id;
                return (
                  <div key={tactic.id} onClick={() => { navigate(`/layout/${layoutId}/tactic/${tactic.id}`); setTacticsDrawer(false); }}
                    style={{
                      padding: '10px 12px', borderRadius: RADIUS.md, marginBottom: 4, cursor: 'pointer',
                      background: isPrev ? COLORS.accent + '15' : COLORS.surfaceDark,
                      border: `1px solid ${isPrev ? COLORS.accent + '40' : COLORS.border}`,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tactic.name}</div>
                      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textDim }}>{t('layout_detail_players_of_5', tPlayers.length)}</div>
                    </div>
                    <div onClick={(e) => { e.stopPropagation(); setPreviewTacticId(isPrev ? null : tactic.id); }}
                      style={{ fontSize: 16, opacity: isPrev ? 1 : 0.3, color: isPrev ? COLORS.accent : COLORS.textMuted }}>👁</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: 12, borderTop: `1px solid ${COLORS.border}` }}>
              <Btn variant="accent" onClick={() => { setNewTacticName(''); setNewTacticModal(true); setTacticsDrawer(false); }}
                style={{ width: '100%', justifyContent: 'center' }}>
                <Icons.Plus /> {t('layout_detail_new_tactic_btn')}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SQUAD CODE INPUT ═══ */}
      <Modal open={squadInput} onClose={() => setSquadInput(false)} title={t('layout_detail_squad_modal_title')}
        footer={<>
          <Btn variant="default" onClick={() => setSquadInput(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={() => setSquadInput(false)}><Icons.Check /> {t('done')}</Btn>
        </>}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 8 }}>
          {t('layout_detail_squad_hint')}
        </div>
        <Input value={squadCode} onChange={updateSquadCode} placeholder={t('layout_detail_squad_placeholder')}
          autoFocus onKeyDown={e => e.key === 'Enter' && setSquadInput(false)} />
      </Modal>

      {/* ═══ OCR SCAN ═══ */}
      {/* Gated by STATIC_FLAGS.ENABLE_VISION_API per DESIGN_DECISIONS § 65 (2026-05-20).
          ocrOpen has no active setter in this file (the "Re-scan bunkers" ActionSheet
          item was never wired) — render block kept as scaffold for future server-side
          re-implementation; flag prevents accidental rewiring. */}
      {ocrOpen && STATIC_FLAGS.ENABLE_VISION_API && (
        <OCRBunkerDetect
          image={image}
          onAccept={(bunkers) => {
            setEditBunkers(prev => [...prev, ...bunkers]);
            if (isSuper) tracked(() => ds.updateBaseLayout(layoutId, { bunkers: [...editBunkers, ...bunkers] }));   // § 96 — base geometry
          }}
          onClose={() => setOcrOpen(false)}
        />
      )}

      {/* ═══ RE-CALIBRATE MODAL ═══ */}
      <Modal open={calibModal} onClose={() => setCalibModal(false)} title={t('layout_detail_recalib_modal_title')}
        maxWidth={640}
        footer={<>
          <Btn variant="default" onClick={() => setCalibModal(false)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={async () => {
            if (calibData) {
              setCalibration(calibData);
              // § 96 — calibration + doritoSide are BASE (super_admin-curated).
              if (isSuper) await tracked(() => ds.updateBaseLayout(layoutId, { fieldCalibration: calibData, doritoSide: calibDoritoSide }));
            }
            setCalibModal(false);
          }}><Icons.Check /> {t('save')}</Btn>
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

      {/* ═══ § 98 CONFIG PANEL — Strefy / Linie (fixed above the mode bar; admin) ═══ */}
      {!immersive && isAdmin && (configMode === 'zones' || configMode === 'lines') && !zoneDrawMode && !lineDrawMode && (
      <div style={{
        position: 'fixed', bottom: 'calc(56px + env(safe-area-inset-bottom, 0px))',
        left: 0, right: 0, maxWidth: R.layout.maxWidth || 640, margin: '0 auto',
        background: COLORS.surface, borderTop: '1px solid #1f2937',
        borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg,
        maxHeight: '46vh', overflowY: 'auto', zIndex: 31,
        padding: 15, boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACE.md }}>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
            {configMode === 'zones' ? t('section_strefy') : t('mode_lines')}
          </div>
          <div onClick={() => setConfigMode(null)} style={{
            width: TOUCH.minTarget, height: TOUCH.minTarget, display: 'flex',
            alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted,
            cursor: 'pointer', fontSize: 18,
          }}>✕</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>
          {configMode === 'lines' && (<>
          {/* § 98 STAGE 4 — "Podział pola": the 2 division lines (name + Y + color).
              Writes overlay.lineDivision; the merge feeds stats transparently. */}
          {[
            { key: 'disco', val: disco, setVal: setDisco, min: 5, max: 50, hint: t('layout_detail_disco_hint') },
            { key: 'zeeker', val: zeeker, setVal: setZeeker, min: 50, max: 95, hint: t('layout_detail_zeeker_hint') },
          ].map(ln => (
            <div key={ln.key} style={{
              background: COLORS.surface, border: '1px solid #1f2937',
              borderRadius: RADIUS.md, padding: 15,
            }}>
              <input
                value={lineDivMeta[ln.key].name}
                onChange={e => setLineDivMeta(m => ({ ...m, [ln.key]: { ...m[ln.key], name: e.target.value } }))}
                placeholder={t('zone_rename_placeholder')}
                style={{
                  width: '100%', boxSizing: 'border-box', padding: '0 12px', minHeight: TOUCH.minTarget,
                  background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
                  outline: 'none', marginBottom: SPACE.sm,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginBottom: SPACE.sm }}>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: COLORS.textMuted, minWidth: 38 }}>{ln.val}%</span>
                <input type="range" min={ln.min} max={ln.max} value={ln.val}
                  onChange={e => ln.setVal(Number(e.target.value))}
                  style={{ flex: 1, accentColor: lineDivMeta[ln.key].color }} />
              </div>
              <div style={{ display: 'flex', gap: SPACE.sm, flexWrap: 'wrap' }}>
                {(COLORS.zonePalette || []).map(c => (
                  <div key={c}
                    onClick={() => setLineDivMeta(m => ({ ...m, [ln.key]: { ...m[ln.key], color: c } }))}
                    style={{
                      width: 28, height: 28, borderRadius: RADIUS.full, background: c, cursor: 'pointer',
                      boxShadow: c === lineDivMeta[ln.key].color ? `0 0 0 2px ${COLORS.surface}, 0 0 0 4px ${COLORS.accent}` : 'none',
                      WebkitTapHighlightColor: 'transparent',
                    }} />
                ))}
              </div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: SPACE.sm }}>
                {ln.hint}
              </div>
            </div>
          ))}
          {/* § 98 4b — "Linie calloutowe" (0..N display-only comms lines) */}
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
            color: COLORS.textDim, letterSpacing: '0.5px',
            marginTop: SPACE.sm, textTransform: 'uppercase',
          }}>{t('section_callout_lines')}</div>
          {editLines.map(ln => (
            <div key={ln.id} style={{
              background: COLORS.surface, border: '1px solid #1f2937',
              borderRadius: RADIUS.md, padding: 15,
              display: 'flex', flexDirection: 'column', gap: SPACE.sm,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                <input
                  value={ln.name}
                  onChange={e => setEditLines(prev => prev.map(x => x.id === ln.id ? { ...x, name: e.target.value } : x))}
                  placeholder={t('zone_rename_placeholder')}
                  style={{
                    flex: 1, minWidth: 0, boxSizing: 'border-box', padding: '0 12px', minHeight: TOUCH.minTarget,
                    background: COLORS.bg, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.sm,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text, outline: 'none',
                  }}
                />
                <div onClick={() => { setDrawPoints(ln.geometry?.a && ln.geometry?.b ? [ln.geometry.a, ln.geometry.b] : []); setLineDrawMode(ln.id); }}
                  style={{ width: TOUCH.minTarget, height: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textDim, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Draw line"><Pencil size={18} strokeWidth={2} /></div>
                <div onClick={() => setLineDeleteConfirm(ln.id)}
                  style={{ width: TOUCH.minTarget, height: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.danger, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  aria-label="Delete line"><Trash2 size={18} strokeWidth={2} /></div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, flexWrap: 'wrap' }}>
                {(COLORS.zonePalette || []).map(c => (
                  <div key={c} onClick={() => setEditLines(prev => prev.map(x => x.id === ln.id ? { ...x, color: c } : x))}
                    style={{ width: 26, height: 26, borderRadius: RADIUS.full, background: c, cursor: 'pointer',
                      boxShadow: c === ln.color ? `0 0 0 2px ${COLORS.surface}, 0 0 0 4px ${COLORS.accent}` : 'none', WebkitTapHighlightColor: 'transparent' }} />
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', background: COLORS.bg, borderRadius: RADIUS.full, padding: 2 }}>
                  {[['above', t('line_side_above')], ['below', t('line_side_below')]].map(([side, label]) => {
                    const on = (ln.trackSide || 'above') === side;
                    return (
                      <div key={side} onClick={() => setEditLines(prev => prev.map(x => x.id === ln.id ? { ...x, trackSide: side } : x))}
                        style={{ minHeight: 32, padding: '6px 12px', borderRadius: RADIUS.full, cursor: 'pointer',
                          fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700,
                          background: on ? COLORS.accent : 'transparent', color: on ? COLORS.black : COLORS.textMuted,
                          display: 'flex', alignItems: 'center', WebkitTapHighlightColor: 'transparent' }}>{label}</div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          <div onClick={() => {
            const palette = COLORS.zonePalette || ['#22d3ee'];
            const fresh = { id: uid(), name: `Line ${editLines.length + 1}`, color: palette[editLines.length % palette.length], trackSide: 'above', geometry: null };
            setEditLines(prev => [...prev, fresh]);
            setDrawPoints([]);
            setLineDrawMode(fresh.id);
          }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px',
            background: 'transparent', border: `1.5px dashed ${COLORS.accent}60`, borderRadius: RADIUS.md,
            color: COLORS.accent, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
            cursor: 'pointer', minHeight: TOUCH.minTarget, WebkitTapHighlightColor: 'transparent',
          }}>{t('line_add_btn')}</div>
          </>)}
          {configMode === 'zones' && (<>
          {/* § 88 — unified zone list. Replaces the 3 hardcoded zone
              sections (DANGER/SAJGON/BIG MOVE). Each zone is one card with
              swatch + name + pencil (draw/edit shape) + trash (delete via
              ConfirmModal). Tap name = inline rename, tap swatch = palette
              popover. "+ Dodaj strefę" creates a new zone + opens draw mode. */}
          <div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
              color: COLORS.textDim, letterSpacing: '0.5px',
              marginBottom: SPACE.xs, textTransform: 'uppercase',
            }}>
              {t('section_strefy')}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
              {editZones.map(zone => {
                const hasPolygon = Array.isArray(zone.polygon) && zone.polygon.length >= 3;
                const isRenaming = renamingZoneId === zone.id;
                const isColorOpen = colorPopoverZoneId === zone.id;
                return (
                  <div key={zone.id} style={{
                    display: 'flex', flexDirection: 'column',
                    background: COLORS.surfaceDark,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: RADIUS.md,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: SPACE.sm,
                      padding: '10px 12px',
                      minHeight: TOUCH.minTarget,
                    }}>
                      {/* Color swatch — tap toggles palette popover */}
                      <div
                        onClick={() => setColorPopoverZoneId(isColorOpen ? null : zone.id)}
                        style={{
                          width: 28, height: 28, borderRadius: RADIUS.full,
                          background: zone.color,
                          border: `2px solid ${COLORS.surface}`,
                          boxShadow: isColorOpen ? `0 0 0 2px ${zone.color}` : 'none',
                          cursor: 'pointer', flexShrink: 0,
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        aria-label={t('zone_color_picker_label')}
                      />
                      {/* Name — tap to rename inline */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isRenaming ? (
                          <input
                            autoFocus
                            defaultValue={zone.name}
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              if (v) {
                                setEditZones(prev => prev.map(z =>
                                  z.id === zone.id ? { ...z, name: v } : z
                                ));
                              }
                              setRenamingZoneId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') e.target.blur();
                              else if (e.key === 'Escape') setRenamingZoneId(null);
                            }}
                            placeholder={t('zone_rename_placeholder')}
                            style={{
                              width: '100%', padding: '4px 8px',
                              background: COLORS.bg, border: `1px solid ${COLORS.border}`,
                              borderRadius: RADIUS.xs,
                              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                              color: COLORS.text,
                              outline: 'none',
                            }}
                          />
                        ) : (
                          <div
                            onClick={() => setRenamingZoneId(zone.id)}
                            style={{
                              display: 'flex', flexDirection: 'column',
                              cursor: 'pointer', minHeight: TOUCH.minTarget - 20,
                              WebkitTapHighlightColor: 'transparent',
                            }}
                          >
                            <span style={{
                              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                              color: COLORS.text,
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            }}>{zone.name}</span>
                            {!hasPolygon && (
                              <span style={{
                                fontFamily: FONT, fontSize: FONT_SIZE.xxs,
                                color: COLORS.textMuted, fontStyle: 'italic',
                              }}>{t('zone_not_drawn')}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Pencil — enter draw mode */}
                      <div
                        onClick={() => {
                          setShowZones(true);
                          setDrawPoints(hasPolygon ? [...zone.polygon] : []);
                          setZoneDrawMode(zone.id);
                        }}
                        style={{
                          width: TOUCH.minTarget, height: TOUCH.minTarget,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: COLORS.textDim, cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        aria-label="Draw zone"
                      >
                        <Pencil size={18} strokeWidth={2} />
                      </div>
                      {/* Trash — delete via ConfirmModal */}
                      <div
                        onClick={() => setZoneDeleteConfirm(zone.id)}
                        style={{
                          width: TOUCH.minTarget, height: TOUCH.minTarget,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: COLORS.danger, cursor: 'pointer',
                          WebkitTapHighlightColor: 'transparent',
                        }}
                        aria-label="Delete zone"
                      >
                        <Trash2 size={18} strokeWidth={2} />
                      </div>
                    </div>
                    {/* Color popover — palette swatches */}
                    {isColorOpen && (
                      <div style={{
                        display: 'flex', gap: SPACE.sm, padding: '8px 12px 12px',
                        background: COLORS.bg,
                        borderTop: `1px solid ${COLORS.border}`,
                      }}>
                        {(COLORS.zonePalette || []).map(c => {
                          const isCurrent = c === zone.color;
                          return (
                            <div
                              key={c}
                              onClick={() => {
                                setEditZones(prev => prev.map(z =>
                                  z.id === zone.id ? { ...z, color: c } : z
                                ));
                                setColorPopoverZoneId(null);
                              }}
                              style={{
                                width: 28, height: 28, borderRadius: RADIUS.full,
                                background: c,
                                boxShadow: isCurrent ? `0 0 0 2px ${COLORS.surface}, 0 0 0 4px ${c}` : 'none',
                                cursor: 'pointer',
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
              {/* "+ Dodaj strefę" — dashed CTA */}
              <div
                onClick={() => {
                  const fresh = makeNewZone(editZones);
                  setEditZones(prev => [...prev, fresh]);
                  setShowZones(true);
                  setDrawPoints([]);
                  setZoneDrawMode(fresh.id);
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '12px',
                  background: 'transparent',
                  border: `1.5px dashed ${COLORS.border}`,
                  borderRadius: RADIUS.md,
                  color: COLORS.textDim,
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                  cursor: 'pointer',
                  minHeight: TOUCH.minTarget,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {t('zone_add_btn')}
              </div>
            </div>
          </div>
          </>)}
        </div>
      </div>
      )}
      {/* § 88 — Zone delete confirm */}
      <ConfirmModal
        open={!!zoneDeleteConfirm}
        title={t('zone_delete_confirm_title')}
        message={zoneDeleteConfirm ? t('zone_delete_confirm_msg', editZones.find(z => z.id === zoneDeleteConfirm)?.name || '') : ''}
        confirmLabel={t('zone_delete_confirm_label')}
        danger
        onClose={() => setZoneDeleteConfirm(null)}
        onConfirm={() => {
          setEditZones(prev => prev.filter(z => z.id !== zoneDeleteConfirm));
          setZoneDeleteConfirm(null);
          // If we were drawing this zone, exit draw mode.
          if (zoneDrawMode === zoneDeleteConfirm) {
            setDrawPoints([]);
            setZoneDrawMode(null);
          }
        }}
      />
      {/* § 98 4b — Callout line delete confirm */}
      <ConfirmModal
        open={!!lineDeleteConfirm}
        title={t('line_delete_confirm_title')}
        message={lineDeleteConfirm ? (editLines.find(l => l.id === lineDeleteConfirm)?.name || '') : ''}
        confirmLabel={t('zone_delete_confirm_label')}
        danger
        onClose={() => setLineDeleteConfirm(null)}
        onConfirm={() => {
          setEditLines(prev => prev.filter(l => l.id !== lineDeleteConfirm));
          if (lineDrawMode === lineDeleteConfirm) { setDrawPoints([]); setLineDrawMode(null); }
          setLineDeleteConfirm(null);
        }}
      />
      {/* § 98 5 — per-team bunker rename (positions/types are super_admin base) */}
      <Modal open={!!renameBunker} onClose={() => setRenameBunker(null)} title={t('layout_detail_rename_bunker_title')}
        footer={<>
          <Btn variant="default" onClick={() => setRenameBunker(null)}>{t('cancel')}</Btn>
          <Btn variant="accent" onClick={() => {
            if (renameBunker) {
              const v = renameValue.trim();
              // § b2a — key the override by STABLE identity (`masterId || id`).
              // A mirror's key is its master's id → one rename covers the pair;
              // two distinct obstacles sharing a positionName get independent
              // keys (the bug fix). Unlike positionName-keying, a bunker with a
              // blank positionName CAN now be overridden (key is its id).
              const key = bunkerStableKey(renameBunker);
              if (key) {
                setEditBunkerNames(prev => {
                  const next = { ...prev };
                  if (v) next[key] = v; else delete next[key];
                  return next;
                });
              }
            }
            setRenameBunker(null);
          }}><Icons.Check /> {t('save')}</Btn>
        </>}>
        <Input value={renameValue} onChange={setRenameValue} placeholder={t('layout_detail_bunker_callout_ph')} autoFocus
          onKeyDown={e => e.key === 'Enter' && e.target.blur()} />
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 8 }}>
          {t('layout_detail_bunker_name_hint')}
        </div>
      </Modal>
    </div>
  );
}
