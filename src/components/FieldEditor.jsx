/**
 * FieldEditor — unified field canvas with zoom/pan + layer toggles
 * Used in: MatchPage, TacticPage, LayoutsPage
 */

import React, { useState } from 'react';
import { Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, responsive, activeHeatmap } from '../utils/theme';
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

  // Visibility layer (BreakAnalyzer)
  hasVisibility = false,
  showVisibility: showVisibilityProp,
  onShowVisibility,

  // Counter-analysis layer (BreakAnalyzer)
  hasCounter = false,
  showCounter: showCounterProp,
  onShowCounter,

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
  const [intVisibility, setIntVisibility] = useState(false);
  const [intCounter, setIntCounter] = useState(false);
  const [panX,       setPanX]       = useState(50);

  const showBunkers    = showBunkersProp    !== undefined ? showBunkersProp    : intBunkers;
  const showZones      = showZonesProp      !== undefined ? showZonesProp      : intZones;
  const showLines      = showLinesProp      !== undefined ? showLinesProp      : intLines;
  const zoom           = zoomProp           !== undefined ? zoomProp           : intZoom;
  const showVisibility = showVisibilityProp !== undefined ? showVisibilityProp : intVisibility;
  const showCounter    = showCounterProp    !== undefined ? showCounterProp    : intCounter;

  const toggleBunkers    = () => onShowBunkers    ? onShowBunkers(!showBunkers)       : setIntBunkers(v => !v);
  const toggleZones      = () => onShowZones      ? onShowZones(!showZones)           : setIntZones(v => !v);
  const toggleLines      = () => onShowLines      ? onShowLines(!showLines)           : setIntLines(v => !v);
  const toggleVisibility = () => onShowVisibility ? onShowVisibility(!showVisibility) : setIntVisibility(v => !v);
  const toggleCounter    = () => onShowCounter    ? onShowCounter(!showCounter)       : setIntCounter(v => !v);
  const toggleZoom    = () => {
    const next = !zoom;
    if (onZoom) onZoom(next); else setIntZoom(next);
    setPanX(50);
  };

  // Pill style helper for focus mode
  const pill = (active) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 36, height: 36, borderRadius: 18,
    background: active ? COLORS.accent + 'cc' : 'rgba(0,0,0,0.72)',
    border: `1.5px solid ${active ? COLORS.accent : COLORS.border + '80'}`,
    color: active ? '#000' : COLORS.text,
    fontSize: 16, cursor: 'pointer', flexShrink: 0,
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>

      {/* Normal toolbar — hidden when zoomed, sticky at top */}
      {!zoom && (
        <div style={{
          padding: `4px ${R.layout.padding}px 4px`,
          display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap',
          overflow: 'hidden',
          position: 'sticky', top: 0, zIndex: 20,
          background: COLORS.surface,
          borderBottom: `1px solid ${COLORS.border}40`,
        }}>
          {toolbarLeft}
          {hasLines && (
            <Btn variant={showLines ? 'accent' : 'default'} size="sm"
              onClick={toggleLines} title="Disco/Zeeker lines" style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Wave />
            </Btn>
          )}
          {hasBunkers && (
            <Btn variant={showBunkers ? 'accent' : 'default'} size="sm"
              onClick={toggleBunkers} title="Etykiety bunkrów" style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Tag />
            </Btn>
          )}
          {hasZones && (
            <Btn variant={showZones ? 'accent' : 'default'} size="sm"
              onClick={toggleZones} title="Strefy" style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Zone />
            </Btn>
          )}
          {hasVisibility && (
            <Btn variant={showVisibility ? 'accent' : 'default'} size="sm"
              onClick={toggleVisibility} title="Widoczność" style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Flame />
            </Btn>
          )}
          {hasCounter && (
            <Btn variant={showCounter ? 'accent' : 'default'} size="sm"
              onClick={toggleCounter} title="Counter-play" style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Target />
            </Btn>
          )}
          <div style={{ flex: 1 }} />
          {toolbarRight}
          {showZoom && (
            <Btn variant="default" size="sm"
              onClick={toggleZoom} style={{ padding: '0 8px', minWidth: 32 }}>
              <Icons.Zoom />
            </Btn>
          )}
        </div>
      )}

      {/* Pan slider — only in normal mode */}
      {zoom && !true /* pan slider moved to focus mode overlay */ && (
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
          {/* Zoom wrapper */}
          <div style={{
            width: zoom ? '200%' : '100%',
            marginLeft: zoom ? `${-(panX)}%` : '0',
          }}>
            {React.Children.map(children, (child, idx) =>
              React.isValidElement(child) && idx === 0
                ? React.cloneElement(child, {
                    showBunkers,
                    showZones,
                    showVisibility,
                    showCounter,
                    discoLine:  showLines ? (child.props.discoLine  || 0) : 0,
                    zeekerLine: showLines ? (child.props.zeekerLine || 0) : 0,
                  })
                : child
            )}
          </div>
        </div>

        {/* ── Focus Mode: floating pill bar ── */}
        {zoom && (
          <div style={{
            position: 'absolute', top: 8, right: R.layout.padding + 8,
            display: 'flex', flexDirection: 'column', gap: 6,
            zIndex: 30, pointerEvents: 'auto',
          }}>
            {hasBunkers && (
              <div style={pill(showBunkers)} onClick={toggleBunkers} title="Etykiety bunkrów"><Icons.Tag /></div>
            )}
            {hasVisibility && (
              <div style={pill(showVisibility)} onClick={toggleVisibility} title="Widoczność"><Icons.Flame /></div>
            )}
            {hasCounter && (
              <div style={pill(showCounter)} onClick={toggleCounter} title="Counter-play"><Icons.Target /></div>
            )}
            {hasZones && (
              <div style={pill(showZones)} onClick={toggleZones} title="Strefy"><Icons.Zone /></div>
            )}
            {hasLines && (
              <div style={pill(showLines)} onClick={toggleLines} title="Linie"><Icons.Wave /></div>
            )}
            {/* Pan slider */}
            <div style={{
              background: 'rgba(0,0,0,0.8)', borderRadius: 12, padding: '6px 8px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              border: `1px solid ${COLORS.border}40`,
            }}>
              <span style={{ fontFamily: FONT, fontSize: 9, color: COLORS.textMuted }}>↔</span>
              <input type="range" min="0" max="100" value={panX}
                onChange={e => setPanX(Number(e.target.value))}
                style={{ width: 36, accentColor: COLORS.accent, writingMode: 'vertical-lr',
                         direction: 'rtl', height: 60, cursor: 'pointer' }} />
            </div>
            {/* Exit zoom */}
            <div style={{ ...pill(false), background: 'rgba(0,0,0,0.9)', border: `1.5px solid ${COLORS.danger}70`, color: COLORS.danger, fontWeight: 700, fontSize: 15 }}
              onClick={toggleZoom} title="Wyjdź z zoom">
              ✕
            </div>
          </div>
        )}

        {/* Freehand overlay — absolute over canvas */}
        {freehandRef && (
          <canvas ref={freehandRef}
            style={{
              position: 'absolute',
              top: 0,
              left: R.layout.padding,
              borderRadius: 10,
              touchAction: 'none',
              cursor: freehandOn ? 'crosshair' : 'default',
              pointerEvents: freehandOn ? 'auto' : 'none',
              display: 'block',
            }}
            {...freehandEvents}
          />
        )}
      </div>

      {/* Heatmap legend — visible when visibility or counter is active */}
      {(showVisibility || showCounter) && (
        <div style={{
          padding: `4px ${R.layout.padding}px`,
          display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center',
          background: COLORS.surface, borderTop: `1px solid ${COLORS.border}30`,
        }}>
          {showVisibility && <>
            <LegendDot color={activeHeatmap.legend.safe} label={activeHeatmap.legendLabels.safe} />
            <LegendDot color={activeHeatmap.legend.arc} label={activeHeatmap.legendLabels.arc} />
            <LegendDot color={activeHeatmap.legend.exposed} label={activeHeatmap.legendLabels.exposed} />
          </>}
          {showCounter && (
            <LegendDot color={activeHeatmap.legend.bump} label={activeHeatmap.legendLabels.bump} />
          )}
        </div>
      )}

    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim }}>{label}</span>
    </span>
  );
}
