/**
 * FieldEditor — unified field canvas with zoom/pan + layer toggles
 *
 * Używany w: MatchPage (editor + heatmap), TacticPage, LayoutsPage (annotation)
 *
 * Props:
 *   field         — { fieldImage, discoLine, zeekerLine, bunkers, dangerZone, sajgonZone }
 *   mode          — 'scouting' | 'heatmap' | 'strategy'
 *   children      — canvas rendered inside the zoom container (FieldCanvas or HeatmapCanvas)
 *
 *   // Layer toggles (controlled externally OR internal)
 *   showBunkers / onShowBunkers
 *   showZones   / onShowZones
 *   showLines   / onShowLines
 *   hasBunkers, hasZones, hasLines  — which toggles to show
 *
 *   // Zoom
 *   showZoom      — show zoom button (default true)
 *
 *   // Extra toolbar items (rendered left of zoom btn)
 *   toolbarLeft   — JSX
 *   toolbarRight  — JSX
 *
 *   // Freehand overlay (TacticPage)
 *   freehandRef   — ref for freehand canvas
 *   freehandOn    — bool
 *   freehandEvents — { onMouseDown, onMouseMove, onMouseUp, onMouseLeave,
 *                      onTouchStart, onTouchMove, onTouchEnd }
 */

import React, { useState } from 'react';
import { Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function FieldEditor({
  // Layer toggle controls (uncontrolled — manage internally if no handler passed)
  showBunkers: showBunkersProp,   onShowBunkers,
  showZones:   showZonesProp,     onShowZones,
  showLines:   showLinesProp,     onShowLines,
  hasBunkers = false,
  hasZones   = false,
  hasLines   = true,

  // Zoom
  showZoom = true,

  // Toolbars
  toolbarLeft,
  toolbarRight,

  // Freehand overlay (TacticPage)
  freehandRef,
  freehandOn = false,
  freehandEvents = {},

  // Children = the actual canvas component
  children,
  style,
}) {
  const device = useDevice();
  const R = responsive(device.type);

  // Internal state (used when no external handler)
  const [intBunkers, setIntBunkers] = useState(false);
  const [intZones,   setIntZones]   = useState(false);
  const [intLines,   setIntLines]   = useState(false);
  const [zoom,       setZoom]       = useState(false);
  const [panX,       setPanX]       = useState(50);
  const [panY,       setPanY]       = useState(50);

  const showBunkers = showBunkersProp !== undefined ? showBunkersProp : intBunkers;
  const showZones   = showZonesProp   !== undefined ? showZonesProp   : intZones;
  const showLines   = showLinesProp   !== undefined ? showLinesProp   : intLines;

  const toggleBunkers = () => onShowBunkers ? onShowBunkers(!showBunkers) : setIntBunkers(v => !v);
  const toggleZones   = () => onShowZones   ? onShowZones(!showZones)     : setIntZones(v => !v);
  const toggleLines   = () => onShowLines   ? onShowLines(!showLines)      : setIntLines(v => !v);
  const toggleZoom    = () => { setZoom(v => !v); setPanX(50); setPanY(50); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>

      {/* ── Toolbar ── */}
      <div style={{
        padding: `4px ${R.layout.padding}px 4px`,
        display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
      }}>
        {/* Left slot */}
        {toolbarLeft}

        {/* Layer toggles — icon-only to save space */}
        {hasLines && (
          <Btn variant={showLines ? 'accent' : 'default'} size="sm"
            onClick={toggleLines} title="Disco/Zeeker lines" style={{ padding: '0 8px' }}>
            〰️
          </Btn>
        )}
        {hasBunkers && (
          <Btn variant={showBunkers ? 'accent' : 'default'} size="sm"
            onClick={toggleBunkers} title="Bunker labels" style={{ padding: '0 8px' }}>
            🏷️
          </Btn>
        )}
        {hasZones && (
          <Btn variant={showZones ? 'accent' : 'default'} size="sm"
            onClick={toggleZones} title="Danger/Sajgon zones" style={{ padding: '0 8px' }}>
            ⚠️
          </Btn>
        )}

        <div style={{ flex: 1 }} />

        {/* Right slot */}
        {toolbarRight}

        {/* Zoom */}
        {showZoom && (
          <Btn variant={zoom ? 'accent' : 'default'} size="sm"
            onClick={toggleZoom} style={{ padding: '0 8px' }}>
            🔍{zoom ? '×2' : ''}
          </Btn>
        )}
      </div>

      {/* ── Canvas container ── */}
      <div style={{ padding: `0 ${R.layout.padding}px 0`, position: 'relative' }}>
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{
            width: zoom ? '200%' : '100%',
            marginLeft: zoom ? `${-(panX)}%` : '0',
            marginTop: zoom ? `${-(panY * 0.4)}%` : '0',
          }}>
            {/* Pass layer state to children via React.cloneElement */}
            {React.Children.map(children, child =>
              React.isValidElement(child)
                ? React.cloneElement(child, {
                    showBunkers,
                    showZones,
                    discoLine: showLines ? child.props.discoLine : 0,
                    zeekerLine: showLines ? child.props.zeekerLine : 0,
                  })
                : child
            )}
          </div>
        </div>

        {/* Freehand overlay canvas */}
        {freehandRef && (
          <canvas ref={freehandRef}
            style={{
              position: 'absolute', top: 0, left: R.layout.padding, right: R.layout.padding,
              width: `calc(100% - ${R.layout.padding * 2}px)`, height: '100%',
              borderRadius: 10, touchAction: 'none',
              cursor: freehandOn ? 'crosshair' : 'default',
              pointerEvents: freehandOn ? 'auto' : 'none',
            }}
            {...freehandEvents}
          />
        )}
      </div>

      {/* ── Pan sliders (shown when zoomed) ── */}
      {zoom && (
        <div style={{ padding: `4px ${R.layout.padding}px 6px`, display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, width: 12 }}>↔</span>
            <input type="range" min="0" max="100" value={panX}
              onChange={e => setPanX(Number(e.target.value))}
              style={{ flex: 1, accentColor: COLORS.accent }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, width: 12 }}>↕</span>
            <input type="range" min="0" max="100" value={panY}
              onChange={e => setPanY(Number(e.target.value))}
              style={{ flex: 1, accentColor: COLORS.accent }} />
          </div>
        </div>
      )}
    </div>
  );
}
