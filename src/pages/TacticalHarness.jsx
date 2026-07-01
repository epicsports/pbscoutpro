// TacticalHarness — EMULATOR-ONLY render rig for the new DrawingCanvas engine
// (STAGE 1). Dead in prod (gated by VITE_USE_EMULATOR in App.jsx). Mounts the
// engine with a seeded scene so the render harness can screenshot it + verify the
// typed elements (player/entry/shot/bounce/stroke/pin) paint correctly.
import React from 'react';
import DrawingCanvas from '../components/tactical/DrawingCanvas';
import { COLORS, FONT } from '../utils/theme';

const SEED = [
  { id: 'p1', type: 'player', x: 32, y: 30, phase: 'breakout' },
  { id: 'en1', type: 'entry', playerId: 'p1', base: { x: 5, y: 50 }, mid: { x: 18, y: 40 }, to: { x: 32, y: 30 }, color: '#38bdf8', phase: 'breakout' },
  { id: 'p2', type: 'player', x: 60, y: 62, phase: 'breakout' },
  { id: 'en2', type: 'entry', playerId: 'p2', base: { x: 5, y: 50 }, mid: { x: 32, y: 56 }, to: { x: 60, y: 62 }, color: '#38bdf8', phase: 'breakout' },
  { id: 's1', type: 'shot', playerId: 'p1', kind: 'toward', from: { x: 32, y: 30 }, to: { x: 78, y: 22 }, color: '#ef4444', phase: 'breakout', time: 3 },
  { id: 'b1', type: 'bounce', playerId: 'p2', from: { x: 60, y: 62 }, via: { x: 74, y: 48 }, to: { x: 88, y: 66 }, color: '#a855f7', phase: 'breakout', time: null },
  { id: 'pin1', type: 'pin', x: 46, y: 78, color: '#22c55e', name: 'Cover left', phase: 'breakout' },
];

export default function TacticalHarness() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, padding: '10px 16px', fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: '1px', color: COLORS.textMuted }} data-testid="tactical-harness">
        TACTICAL DRAWINGCANVAS — HARNESS
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DrawingCanvas seed={SEED} base={{ x: 0.05, y: 0.5 }} onSave={() => {}} />
      </div>
    </div>
  );
}
