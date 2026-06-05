import React, { useCallback } from 'react';
import BaseCanvas, { useBaseCanvas } from './BaseCanvas';
import { drawAnalyticsField } from '../field/drawAnalyticsField';

/**
 * AnalyticsCanvas — § 64.9 migration of LayoutAnalyticsPage's bespoke raw
 * <canvas> onto BaseCanvas (the `draw` render-prop pattern, parallel to
 * HeatmapCanvas/ShotDrawer). Behavior-preserving: deaths + breaks render
 * identically, cross-filter still works, gestures stay OFF.
 *
 * BaseCanvas owns the <canvas>, runtime DPR (`window.devicePixelRatio || 2`,
 * replacing the old hardcoded ×2), sizing + ResizeObserver, and the field image
 * load. This component just supplies the mode-branched `draw` and, in deaths
 * mode, a DOM-click tap layer that emits the normalized tap position for the
 * page's cross-filter hit-test.
 *
 * Props:
 *   mode            — 'deaths' | 'breaks'
 *   fieldImage      — layout.fieldImage URL (BaseCanvas loads it)
 *   data, densityEnabled, attributionData, skullClusters, filter, linkMap
 *                   — draw feeds (see drawAnalyticsField)
 *   onTap(pos,{w,h})— deaths only; pos = normalized {x,y}, {w,h} = canvas CSS px
 */

// Deaths cross-filter tap — DOM onClick + BaseCanvas transform, gestures OFF
// (the ReasonRadial pattern). With gestures off zoom=1 / pan=0, so the math is
// the trivial px/w, py/h — identical to the old getBoundingClientRect path.
function DeathsTapLayer({ onTap }) {
  const { canvasSize, zoom, pan } = useBaseCanvas();
  if (!onTap) return null;
  return (
    <div
      onClick={(e) => {
        const { w, h } = canvasSize;
        if (w <= 0 || h <= 0) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const px = (e.clientX - rect.left - pan.x) / zoom;
        const py = (e.clientY - rect.top - pan.y) / zoom;
        onTap({ x: px / w, y: py / h }, { w, h });
      }}
      style={{ position: 'absolute', inset: 0, cursor: 'pointer', zIndex: 5 }}
    />
  );
}

export default function AnalyticsCanvas({
  mode, fieldImage,
  data, densityEnabled, attributionData, skullClusters, filter, linkMap,
  onTap,
}) {
  const draw = useCallback((ctx, w, h, st) => {
    drawAnalyticsField(ctx, w, h, {
      mode, imgObj: st.imgObj, data,
      densityEnabled, attributionData, skullClusters, filter, linkMap,
    });
  }, [mode, data, densityEnabled, attributionData, skullClusters, filter, linkMap]);

  return (
    <BaseCanvas
      fieldImage={fieldImage || null}
      draw={draw}
      pinchZoom={false}
      pan={false}
      loupe={false}
    >
      {mode === 'deaths' && <DeathsTapLayer onTap={onTap} />}
    </BaseCanvas>
  );
}
