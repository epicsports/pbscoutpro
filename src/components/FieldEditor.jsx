/**
 * FieldEditor — field canvas wrapper with layer toggles + heatmap legend
 */
import React, { useState, useReducer } from 'react';
import { Btn, Icons } from './ui';
import { COLORS, FONT, TOUCH, responsive, activeHeatmap, HEATMAP, setHeatmapScheme } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

export default function FieldEditor({
  // Layer toggles
  showBunkers: showBunkersProp, onShowBunkers,
  showZones: showZonesProp, onShowZones,
  showLines: showLinesProp, onShowLines,
  hasBunkers = false, hasZones = false, hasLines = true,

  // Visibility layer
  hasVisibility = false, showVisibility: showVisibilityProp, onShowVisibility,

  // Counter-analysis layer
  hasCounter = false, showCounter: showCounterProp, onShowCounter,

  // Toolbars
  toolbarLeft, toolbarRight,

  // Freehand overlay
  freehandRef, freehandOn = false, freehandEvents = {},

  // Canvas child
  children, style,
}) {
  const device = useDevice();
  const R = responsive(device.type);

  const [intBunkers, setIntBunkers] = useState(false);
  const [intZones, setIntZones] = useState(false);
  const [intLines, setIntLines] = useState(false);
  const [intVisibility, setIntVisibility] = useState(false);
  const [intCounter, setIntCounter] = useState(false);
  const [, forceUpdate] = useReducer(x => x + 1, 0);

  const showBunkers = showBunkersProp !== undefined ? showBunkersProp : intBunkers;
  const showZones = showZonesProp !== undefined ? showZonesProp : intZones;
  const showLines = showLinesProp !== undefined ? showLinesProp : intLines;
  const showVisibility = showVisibilityProp !== undefined ? showVisibilityProp : intVisibility;
  const showCounter = showCounterProp !== undefined ? showCounterProp : intCounter;

  const toggleBunkers = () => onShowBunkers ? onShowBunkers(!showBunkers) : setIntBunkers(v => !v);
  const toggleZones = () => onShowZones ? onShowZones(!showZones) : setIntZones(v => !v);
  const toggleLines = () => onShowLines ? onShowLines(!showLines) : setIntLines(v => !v);
  const toggleVisibility = () => onShowVisibility ? onShowVisibility(!showVisibility) : setIntVisibility(v => !v);
  const toggleCounter = () => onShowCounter ? onShowCounter(!showCounter) : setIntCounter(v => !v);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, ...style }}>

      {/* Toolbar — always visible */}
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
            onClick={toggleLines} title="Lines" style={{ padding: '0 8px', minWidth: 32 }}>
            <Icons.Wave />
          </Btn>
        )}
        {hasBunkers && (
          <Btn variant={showBunkers ? 'accent' : 'default'} size="sm"
            onClick={toggleBunkers} title="Bunker labels" style={{ padding: '0 8px', minWidth: 32 }}>
            <Icons.Tag />
          </Btn>
        )}
        {hasZones && (
          <Btn variant={showZones ? 'accent' : 'default'} size="sm"
            onClick={toggleZones} title="Zones" style={{ padding: '0 8px', minWidth: 32 }}>
            <Icons.Zone />
          </Btn>
        )}
        {hasVisibility && (
          <Btn variant={showVisibility ? 'accent' : 'default'} size="sm"
            onClick={toggleVisibility} title="Visibility" style={{ padding: '0 8px', minWidth: 32 }}>
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
      </div>

      {/* Canvas container */}
      <div style={{ padding: `0 ${R.layout.padding}px 0`, position: 'relative' }}>
        <div style={{ overflow: 'hidden', position: 'relative' }}>
          {React.Children.map(children, (child, idx) =>
            React.isValidElement(child) && idx === 0
              ? React.cloneElement(child, {
                  showBunkers, showZones, showVisibility, showCounter,
                  discoLine: showLines ? (child.props.discoLine || 0) : 0,
                  zeekerLine: showLines ? (child.props.zeekerLine || 0) : 0,
                })
              : child
          )}
        </div>

        {/* Freehand overlay */}
        {freehandRef && (
          <canvas ref={freehandRef}
            style={{
              position: 'absolute', top: 0, left: R.layout.padding,
              borderRadius: 10, touchAction: 'none',
              cursor: freehandOn ? 'crosshair' : 'default',
              pointerEvents: freehandOn ? 'auto' : 'none',
              display: 'block',
            }}
            {...freehandEvents}
          />
        )}
      </div>

      {/* Heatmap legend */}
      {(showVisibility || showCounter) && (
        <div style={{
          padding: `4px ${R.layout.padding}px`,
          display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center',
          background: COLORS.surface, borderTop: `1px solid ${COLORS.border}30`,
          flexWrap: 'wrap',
        }}>
          {showVisibility && <>
            <LegendDot color={activeHeatmap.legend.safe} label={activeHeatmap.legendLabels.safe} />
            <LegendDot color={activeHeatmap.legend.arc} label={activeHeatmap.legendLabels.arc} />
            <LegendDot color={activeHeatmap.legend.exposed} label={activeHeatmap.legendLabels.exposed} />
          </>}
          {showCounter && (
            <LegendDot color={activeHeatmap.legend.bump} label={activeHeatmap.legendLabels.bump} />
          )}
          <span onClick={() => {
            const next = activeHeatmap === HEATMAP.default ? 'colorblind' : 'default';
            setHeatmapScheme(next);
            forceUpdate();
          }} style={{
            fontFamily: FONT, fontSize: 10, color: COLORS.textMuted,
            cursor: 'pointer', padding: '2px 6px', borderRadius: 4,
            border: `1px solid ${COLORS.border}60`,
          }} title="Toggle color scheme (colorblind)">
            {activeHeatmap === HEATMAP.colorblind ? '👁️ Standard' : '👁️ Colorblind'}
          </span>
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
