/**
 * FieldEditor — unified field canvas with zoom/pan + layer toggles
 * Used in: MatchPage, TacticPage, LayoutsPage
 */

import React, { useState } from 'react';
import { Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function FieldEditor({
  // Layer toggles — external control OR internal
  showBunkers: showBunkersProp,  onShowBunkers,
  showZones:   showZonesProp,    onShowZones,
  showLines:   showLinesProp,    onShowLines,
  hasBunkers = false,
  hasZones   = false,
  hasLines   = true,

  // Zoom — external control OR internal
  zoom: zoomProp, onZoom,
  showZoom = true,

  // Toolbars
  toolbarLeft,
  toolbarRight,

  // Freehand overlay (TacticPage only)
  freehandRef,
  freehandOn = false,
  freehandEvents = {},

  // The canvas child — passed directly, not cloneElement'd
  children,
  style,
  
  // When zoomed, hide extra UI (MatchPage)
  hideWhenZoomed,
}) {
  const device = useDevice();
  const R = responsive(device.type);

  const [intBunkers, setIntBunkers] = useState(false);
  const [intZones,   setIntZones]   = useState(false);
  const [intLines,   setIntLines]   = useState(false);
  const [intZoom,    setIntZoom]    = useState(false);
  const [panX,       setPanX]       = useState(50);

  const showBunkers = showBunkersProp !== undefined ? showBunkersProp : intBunkers;
  const showZones   = showZonesProp   !== undefined ? showZonesProp   : intZones;
  const showLines   = showLinesProp   !== undefined ? showLinesProp   : intLines;
  const zoom        = zoomProp        !== undefined ? zoomProp        : intZoom;

  const toggleBunkers = () => onShowBunkers ? onShowBunkers(!showBunkers) : setIntBunkers(v => !v);
  const toggleZones   = () => onShowZones   ? onShowZones(!showZones)     : setIntZones(v => !v);
  const toggleLines   = () => onShowLines   ? onShowLines(!showLines)     : setIntLines(v => !v);
  const toggleZoom    = () => {
    const next = !zoom;
    if (onZoom) onZoom(next); else setIntZoom(next);
    setPanX(50);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>

      {/* Toolbar */}
      <div style={{
        padding: `4px ${R.layout.padding}px 4px`,
        display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
        overflow: 'hidden',
      }}>
        {toolbarLeft}
        {hasLines && (
          <Btn variant={showLines ? 'accent' : 'default'} size="sm"
            onClick={toggleLines} title="Disco/Zeeker lines" style={{ padding: '0 8px', minWidth: 32 }}>
            〰️
          </Btn>
        )}
        {hasBunkers && (
          <Btn variant={showBunkers ? 'accent' : 'default'} size="sm"
            onClick={toggleBunkers} title="Bunker labels" style={{ padding: '0 8px', minWidth: 32 }}>
            🏷️
          </Btn>
        )}
        {hasZones && (
          <Btn variant={showZones ? 'accent' : 'default'} size="sm"
            onClick={toggleZones} title="Danger/Sajgon zones" style={{ padding: '0 8px', minWidth: 32 }}>
            ⚠️
          </Btn>
        )}
        <div style={{ flex: 1 }} />
        {toolbarRight}
        {showZoom && (
          <Btn variant={zoom ? 'accent' : 'default'} size="sm"
            onClick={toggleZoom} style={{ padding: '0 8px', minWidth: 32 }}>
            {zoom ? '🔍×2' : '🔍'}
          </Btn>
        )}
      </div>

      {/* Pan slider X — above layout, only when zoomed */}
      {zoom && (
        <div style={{ padding: `2px ${R.layout.padding}px 4px`, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, width: 12 }}>↔</span>
          <input type="range" min="0" max="100" value={panX}
            onChange={e => setPanX(Number(e.target.value))}
            style={{ flex: 1, accentColor: COLORS.accent, height: 20 }} />
        </div>
      )}

      {/* Canvas container */}
      <div style={{ padding: `0 ${R.layout.padding}px 0`, position: 'relative' }}>
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          {/* Zoom wrapper — width:200% pushes canvas outside overflow:hidden */}
          <div style={{
            width: zoom ? '200%' : '100%',
            marginLeft: zoom ? `${-(panX)}%` : '0',
          }}>
            {/* Render children directly — layer state injected via cloneElement
                BUT only for the first child (the canvas), not freehand overlay */}
            {React.Children.map(children, (child, idx) =>
              React.isValidElement(child) && idx === 0
                ? React.cloneElement(child, {
                    showBunkers,
                    showZones,
                    discoLine:  showLines ? (child.props.discoLine  || 0) : 0,
                    zeekerLine: showLines ? (child.props.zeekerLine || 0) : 0,
                  })
                : child
            )}
          </div>
        </div>

        {/* Freehand overlay — absolute over canvas */}
        {freehandRef && (
          <canvas ref={freehandRef}
            style={{
              position: 'absolute', top: 0,
              left: R.layout.padding, right: R.layout.padding,
              width: `calc(100% - ${R.layout.padding * 2}px)`,
              height: '100%',
              borderRadius: 10, touchAction: 'none',
              cursor: freehandOn ? 'crosshair' : 'default',
              pointerEvents: freehandOn ? 'auto' : 'none',
            }}
            {...freehandEvents}
          />
        )}
      </div>


    </div>
  );
}
