/**
 * BunkerEditorPage — full-screen scouting-style editor for naming and typing bunkers
 * Route: /layout/:layoutId/bunkers
 *
 * Full-height canvas (same as scouting). Tap a bunker to select it.
 * Bottom sheet slides up with name + type picker.
 * All bunkers visible with labels. Selected bunker highlighted.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import FieldCanvas from '../components/FieldCanvas';
import BottomSheet from '../components/BottomSheet';
import PageHeader from '../components/PageHeader';
import { Btn, Input } from '../components/ui';
import { BUNKER_TYPES, typeData, GROUP_COLOR, GROUP_LABEL } from '../components/BunkerCard';
import { useLayouts } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, POSITION_NAMES, POSITION_TYPE_SUGGEST, responsive } from '../utils/theme';
import { getBunkerSide } from '../utils/helpers';

export default function BunkerEditorPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts } = useLayouts();
  const layout = layouts?.find(l => l.id === layoutId);

  const [bunkers, setBunkers] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('');
  const [showTypeGrid, setShowTypeGrid] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load bunkers from layout
  useEffect(() => {
    if (layout?.bunkers) setBunkers(layout.bunkers);
  }, [layout?.id]);

  // Auto-save bunker positions (debounced) — for drag/nudge changes
  const saveTimerRef = useRef(null);
  useEffect(() => {
    if (!layoutId || !bunkers.length) return;
    // Skip initial load
    if (!layout?.bunkers) return;
    // Don't save if bunkers haven't changed from layout
    if (JSON.stringify(bunkers) === JSON.stringify(layout.bunkers)) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      ds.updateLayout(layoutId, { bunkers });
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [bunkers, layoutId]);

  const selected = bunkers.find(b => b.id === selectedId);
  const image = layout?.fieldImage;

  const handleBunkerTap = useCallback((pos) => {
    // Find nearest bunker to tap position
    let best = null, bestDist = 0.08;
    bunkers.forEach(b => {
      const dx = b.x - pos.x, dy = b.y - pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = b; }
    });
    if (best) {
      // Edit existing bunker
      setSelectedId(best.id);
      setEditName(best.positionName || best.name || '');
      setEditType(best.type || '');
      setShowTypeGrid(false);
      setSheetOpen(true);
    } else {
      // Add new bunker at tap position
      const newId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newBunker = { id: newId, x: pos.x, y: pos.y, positionName: '', type: '', name: '' };
      
      // Center detection: X between 45-55% is center → single bunker, no mirror
      const isCenter = pos.x >= 0.45 && pos.x <= 0.55;
      
      let withAll;
      if (isCenter) {
        withAll = [...bunkers, newBunker];
      } else {
        const mirrorId = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_m`;
        const mirrorBunker = { id: mirrorId, x: 1 - pos.x, y: pos.y, positionName: '', type: '', name: '' };
        withAll = [...bunkers, newBunker, mirrorBunker];
      }
      setBunkers(withAll);
      ds.updateLayout(layoutId, { bunkers: withAll });
      // Select the new bunker
      setSelectedId(newId);
      setEditName('');
      setEditType('');
      setShowTypeGrid(true);
      setSheetOpen(true);
    }
  }, [bunkers, layoutId]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    // Update selected bunker + mirror pair
    const updated = bunkers.map(b => {
      if (b.id === selected.id) {
        return { ...b, positionName: editName, type: editType };
      }
      // Mirror pair: same name, mirrored position
      if (b.name === selected.name && 
          Math.abs(b.x - (1 - selected.x)) < 0.05 && 
          Math.abs(b.y - selected.y) < 0.05) {
        return { ...b, positionName: editName, type: editType };
      }
      return b;
    });
    setBunkers(updated);
    await ds.updateLayout(layoutId, { bunkers: updated });
    setSaving(false);
    setSheetOpen(false);
    setSelectedId(null);
  };

  const handleNextBunker = () => {
    // Save current and move to next unnamed bunker
    handleSave().then(() => {
      const unnamed = bunkers.find(b => !b.positionName && !b.type && b.id !== selectedId);
      if (unnamed) {
        setSelectedId(unnamed.id);
        setEditName(unnamed.positionName || unnamed.name || '');
        setEditType(unnamed.type || '');
        setShowTypeGrid(false);
        setSheetOpen(true);
      }
    });
  };

  if (!layout) return null;

  const unnamedCount = bunkers.filter(b => !b.positionName && !b.type).length;
  const totalCount = bunkers.length;

  // Position name suggestions based on bunker side
  const side = selected ? getBunkerSide(selected, layout.doritoSide || 'top') : null;
  const nameSuggestions = side ? (POSITION_NAMES[side] || []) : [];

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: `/layout/${layoutId}` }}
        title="Bunker names & types"
        subtitle={`${totalCount - unnamedCount}/${totalCount} NAMED`}
      />

      {/* Full-height canvas */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <FieldCanvas
          fieldImage={image}
          maxCanvasHeight={typeof window !== 'undefined' ? window.innerHeight - 160 : 500}
          bunkers={bunkers}
          showBunkers={true}
          selectedBunkerId={selectedId}
          layoutEditMode="bunker"
          onBunkerPlace={handleBunkerTap}
          onBunkerMove={(id, pos) => {
            setBunkers(prev => prev.map(b => b.id === id ? { ...b, x: pos.x, y: pos.y } : b));
          }}
          onBunkerLabelNudge={(id, delta) => {
            setBunkers(prev => prev.map(b => b.id === id ? { ...b, labelOffsetY: (b.labelOffsetY ?? 0) + delta } : b));
          }}
          players={[]} shots={[[], [], [], [], []]}
          bumpStops={[]} eliminations={[]} eliminationPositions={[]}
          editable={false}
          discoLine={layout.discoLine || 0} zeekerLine={layout.zeekerLine || 0}
        />
      </div>

      {/* Bottom bar — hint + save */}
      {!sheetOpen && (
        <div style={{
          padding: `${SPACE.sm}px ${SPACE.lg}px`, background: COLORS.surface,
          borderTop: `1px solid ${COLORS.border}`,
          display: 'flex', flexDirection: 'column', gap: SPACE.sm,
        }}>
          <div style={{ textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
            {unnamedCount > 0
              ? `Tap a bunker to name it · ${unnamedCount} unnamed`
              : 'All bunkers named ✓'}
          </div>
          <Btn variant="accent" onClick={() => navigate(`/layout/${layoutId}`)}
            style={{ width: '100%', justifyContent: 'center', minHeight: 48, fontWeight: 700 }}>
            Done
          </Btn>
        </div>
      )}

      {/* Bottom sheet — bunker editor */}
      <BottomSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setSelectedId(null); }} maxHeight="auto">
        {selected && (
          <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
              <div style={{
                width: 36, height: 36, borderRadius: RADIUS.md,
                background: side ? (side === 'dorito' ? '#ef444420' : side === 'snake' ? '#3b82f620' : COLORS.accent + '20') : COLORS.border,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 800,
                color: side === 'dorito' ? COLORS.danger : side === 'snake' ? COLORS.info : COLORS.accent,
              }}>
                {(selected.positionName || selected.name || '?').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text }}>
                  {selected.positionName || selected.name || 'Unnamed'}
                </div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>
                  {side?.toUpperCase() || 'CENTER'} side · x:{(selected.x * 100).toFixed(0)}% y:{(selected.y * 100).toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Position name */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
                POSITION NAME
              </div>
              <Input value={editName} onChange={setEditName} placeholder="e.g. D1, Snake, Hammer" />
              {/* Name suggestions */}
              {nameSuggestions.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: SPACE.xs }}>
                  {nameSuggestions.filter(n => !bunkers.some(b => b.positionName === n && b.id !== selected.id)).slice(0, 10).map(n => (
                    <div key={n} onClick={() => {
                      setEditName(n);
                      const suggested = POSITION_TYPE_SUGGEST?.[n];
                      if (suggested && !editType) setEditType(suggested);
                    }}
                      style={{
                        padding: '4px 10px', borderRadius: RADIUS.sm, cursor: 'pointer',
                        fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
                        background: editName === n ? COLORS.accent + '20' : COLORS.surfaceDark,
                        border: `1px solid ${editName === n ? COLORS.accent : COLORS.border}`,
                        color: editName === n ? COLORS.accent : COLORS.textDim,
                      }}>{n}</div>
                  ))}
                </div>
              )}
            </div>

            {/* Bunker type */}
            <div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.textMuted, letterSpacing: '0.5px', marginBottom: SPACE.xs }}>
                BUNKER TYPE
              </div>
              {/* Current type display / quick select */}
              <div style={{ display: 'flex', gap: SPACE.sm, alignItems: 'center' }}>
                {editType ? (
                  <div style={{
                    padding: '8px 14px', borderRadius: RADIUS.md, flex: 1,
                    background: GROUP_COLOR[typeData(editType)?.group] + '15',
                    border: `1px solid ${GROUP_COLOR[typeData(editType)?.group] || COLORS.border}`,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
                    color: GROUP_COLOR[typeData(editType)?.group] || COLORS.text,
                    display: 'flex', alignItems: 'center', gap: SPACE.sm,
                  }}>
                    <span style={{ fontWeight: 800 }}>{editType}</span>
                    <span style={{ fontWeight: 400, color: COLORS.textDim }}>{typeData(editType)?.name}</span>
                  </div>
                ) : (
                  <div style={{
                    padding: '8px 14px', borderRadius: RADIUS.md, flex: 1,
                    background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                    fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
                  }}>Select type...</div>
                )}
                <Btn variant="default" size="sm" onClick={() => setShowTypeGrid(v => !v)}>
                  {showTypeGrid ? '▲' : '▼'}
                </Btn>
              </div>
              {/* Type grid */}
              {showTypeGrid && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm, marginTop: SPACE.sm }}>
                  {['low', 'med', 'tall'].map(group => (
                    <div key={group}>
                      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: GROUP_COLOR[group], fontWeight: 700, marginBottom: SPACE.xs }}>
                        {GROUP_LABEL[group]}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: SPACE.xs }}>
                        {BUNKER_TYPES.filter(t => t.group === group).map(t => (
                          <div key={t.abbr}
                            onClick={() => { setEditType(t.abbr); setShowTypeGrid(false); }}
                            style={{
                              padding: '8px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
                              border: `1px solid ${editType === t.abbr ? GROUP_COLOR[group] : COLORS.border}`,
                              background: editType === t.abbr ? GROUP_COLOR[group] + '15' : COLORS.surfaceDark,
                              fontFamily: FONT, fontSize: FONT_SIZE.xs,
                            }}>
                            <strong style={{ color: editType === t.abbr ? GROUP_COLOR[group] : COLORS.text }}>{t.abbr}</strong>
                            <span style={{ color: COLORS.textMuted, marginLeft: 6 }}>{t.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: SPACE.sm }}>
              {unnamedCount > 1 && (
                <Btn variant="default" onClick={handleNextBunker} disabled={saving}
                  style={{ flex: 1, justifyContent: 'center' }}>
                  Save & next →
                </Btn>
              )}
              <Btn variant="accent" onClick={handleSave} disabled={saving}
                style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Saving...' : 'Save'}
              </Btn>
            </div>
            {/* Delete */}
            <Btn variant="ghost" onClick={async () => {
              // Remove bunker + its mirror
              const updated = bunkers.filter(b => {
                if (b.id === selected.id) return false;
                // Remove mirror pair
                if (Math.abs(b.x - (1 - selected.x)) < 0.05 && Math.abs(b.y - selected.y) < 0.05
                    && b.positionName === selected.positionName) return false;
                return true;
              });
              setBunkers(updated);
              await ds.updateLayout(layoutId, { bunkers: updated });
              setSheetOpen(false); setSelectedId(null);
            }} style={{ width: '100%', justifyContent: 'center', color: COLORS.danger }}>
              Delete bunker
            </Btn>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
