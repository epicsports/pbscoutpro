/**
 * BallisticsPage — ballistics system viewer for a layout
 * Route: /layout/:layoutId/ballistics
 *
 * Full-height canvas. Tap anywhere on field to place a shooter.
 * System shows visibility overlay: where can you shoot from that position.
 * Phase 1: direct shot only (top-down 2D ray casting, no height).
 */
import React, { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDevice } from '../hooks/useDevice';
import FieldCanvas from '../components/FieldCanvas';
import PageHeader from '../components/PageHeader';
import { Btn, SectionLabel } from '../components/ui';
import { useLayouts } from '../hooks/useFirestore';
import { useField } from '../hooks/useField';
import { useVisibility } from '../hooks/useVisibility';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, responsive } from '../utils/theme';

export default function BallisticsPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const device = useDevice();
  const R = responsive(device.type);
  const { layouts } = useLayouts();
  const layout = layouts?.find(l => l.id === layoutId);

  const [shooterPos, setShooterPos] = useState(null);
  const [selectedBunker, setSelectedBunker] = useState(null);

  // Field data
  const image = layout?.fieldImage;
  const bunkers = layout?.bunkers || [];
  const calibration = layout?.fieldCalibration;

  // Visibility computation
  const { visData, isReady, progress, queryVis, initField } = useVisibility();

  // Initialize field when layout loads
  React.useEffect(() => {
    if (!layout || !bunkers.length) return;
    initField(
      bunkers.map(b => ({
        id: b.id, x: b.x, y: b.y, type: b.type || 'Br',
        shape: b.shape || 'rect',
      })),
      45.72, // NXL field: 150ft = 45.72m
      36.58, // NXL field: 120ft = 36.58m
      3,
    );
  }, [layout?.id, bunkers.length]);

  // Tap field to place shooter
  const handleFieldTap = useCallback((pos) => {
    if (!isReady) return;
    setShooterPos(pos);
    setSelectedBunker(null);
    queryVis(null, { x: pos.x, y: pos.y });
  }, [isReady, queryVis]);

  // Tap bunker to query from that bunker
  const handleBunkerTap = useCallback((pos) => {
    if (!isReady) return;
    // Find nearest bunker
    let best = null, bestDist = 0.08;
    bunkers.forEach(b => {
      const dx = b.x - pos.x, dy = b.y - pos.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) { bestDist = d; best = b; }
    });
    if (best) {
      setSelectedBunker(best);
      setShooterPos({ x: best.x, y: best.y });
      queryVis(best.id);
    } else {
      handleFieldTap(pos);
    }
  }, [bunkers, isReady, queryVis, handleFieldTap]);

  if (!layout) return null;

  return (
    <div style={{ minHeight: '100vh', maxWidth: R.layout.maxWidth || 640, margin: '0 auto', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        back={{ to: `/layout/${layoutId}` }}
        title="Ballistics"
        subtitle={selectedBunker ? `FROM ${selectedBunker.positionName || selectedBunker.name || selectedBunker.type}` : shooterPos ? 'FROM FREE POINT' : 'TAP FIELD TO PLACE SHOOTER'}
      />

      {/* Canvas with visibility overlay */}
      <div style={{ flex: 1, overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch' }}>
        <FieldCanvas
          fieldImage={image}
          maxCanvasHeight={typeof window !== 'undefined' ? window.innerHeight - 140 : 500}
          bunkers={bunkers}
          showBunkers={false}
          selectedBunkerId={selectedBunker?.id || null}
          visibilityData={visData}
          showVisibility={!!visData}
          layoutEditMode="bunker"
          onBunkerPlace={handleBunkerTap}
          players={shooterPos ? [shooterPos] : []}
          shots={[[], [], [], [], []]}
          bumpStops={[]} eliminations={[]} eliminationPositions={[]}
          editable={false}
          discoLine={layout.discoLine || 0}
          zeekerLine={layout.zeekerLine || 0}
          fieldCalibration={calibration}
        />
      </div>

      {/* Status bar */}
      <div style={{
        padding: `${SPACE.sm}px ${SPACE.lg}px`, background: COLORS.surface,
        borderTop: `1px solid ${COLORS.border}`,
        fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, textAlign: 'center',
      }}>
        {progress ? `Computing... ${progress.pct || 0}%` :
         visData ? '3-channel: green=safe · orange=arc · blue=exposed' :
         isReady ? 'Tap a bunker or any point on the field' :
         'Initializing field...'}
      </div>
    </div>
  );
}
