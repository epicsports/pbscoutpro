/**
 * VisionScan — sends field image to Claude Vision API, detects bunkers,
 * mirrors results, displays review UI.
 */
import React, { useState, useEffect } from 'react';
import { Btn, Input, Icons } from './ui';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, POSITION_NAMES, POSITION_TYPE_SUGGEST, bunkerByAbbr } from '../utils/theme';
import { getBunkerSide, uid } from '../utils/helpers';

// ── Vision prompt ──
function VISION_PROMPT(calibration, doritoSide) {
  return `You are analyzing a paintball field layout image. Identify INDIVIDUAL inflatable bunkers.

CRITICAL: Each inflatable = one bunker. Bunkers placed next to each other form structures (like "snake") but each piece is SEPARATE. Break down clusters into individual inflatables.

The field is symmetric — analyze ONLY the LEFT HALF (left edge to center line).

BUNKER TYPES (only use these):
- SD: Baby Dorito — small triangle/pyramid (smallest dorito)
- MD: Medium Dorito — medium triangle/pyramid (larger than SD, same shape)
- Tr: Tree — tall thin cylinder (on 2D: small red/dark circle)
- C: Cylinder — barrel shape (on 2D: blue circle, larger than Tr)
- Ck: Cake — low flat disc/puck (short, wide)
- Br: Brick — small upright rectangle (on 2D: blue rectangle)
- GB: Giant Brick — large upright rectangle (clearly bigger than Br)
- MW: Mini Wedge — small wedge/W shape
- GP: Giant Plus — cross/plus shape (often center field)
- T: Temple — stepped pyramid (stairs from side)
- MT: Maya Temple — large stepped pyramid
- Wg: Wing — small angled panel
- GW: Giant Wing — large rectangle with characteristic cut/bevel
- SB: Snake Beam — long horizontal bar (part of snake structures)

RECOGNITION HINTS:
- Triangles = Doritos (SD if small, MD if larger)
- Blue circles = Cylinder (C)
- Small red/dark circles = Tree (Tr) — NOT cylinder
- Blue rectangles = Brick (Br) or Giant Brick (GB) by size
- Long horizontal bars = Snake Beam (SB) — even if touching other bunkers
- Cross shape = Giant Plus (GP)
- Stepped shapes = Temple (T) or Maya Temple (MT) by size

IGNORE: logos, branding, grid lines, base markers, text, watermarks.

The ${doritoSide === 'top' ? 'top' : 'bottom'} half is DORITO side (doritos/pyramids).
The ${doritoSide === 'top' ? 'bottom' : 'top'} half is SNAKE side (beams + other bunkers).

For each bunker return:
- type: abbreviation from above
- x: 0-0.5 (0=left edge, 0.5=center)
- y: 0-1 (0=top, 1=bottom)
- confidence: "high" or "low"

Respond with ONLY a JSON array:
[{"type":"MD","x":0.15,"y":0.30,"confidence":"high"}, ...]`;
}

// ── Position name suggestion ──
function suggestPositionName(x, y, side, existingBunkers) {
  const used = new Set(existingBunkers.map(b => b.positionName));
  const candidates = [];

  if (side === 'dorito') {
    if (y < 0.2 && x < 0.15) candidates.push('Palma');
    if (y > 0.2 && y < 0.4 && x < 0.2) candidates.push('Dog');
    if (y > 0.3 && y < 0.5 && x > 0.15 && x < 0.28) candidates.push('Dexter');
    if (y < 0.3 && x > 0.2 && x < 0.35) candidates.push('Dallas');
    if (y > 0.35 && x > 0.25) candidates.push('Dreams', 'Dykta');
    if (x > 0.4) candidates.push('Dorito50', 'Drago');
  } else if (side === 'snake') {
    if (y > 0.8 && x < 0.15) candidates.push('Cobra');
    if (y > 0.6 && y < 0.75 && x < 0.18) candidates.push('Snoop');
    if (y > 0.6 && y < 0.75 && x > 0.15) candidates.push('Ring');
    if (y > 0.7 && x > 0.2 && x < 0.3) candidates.push('Snake1');
    if (y > 0.7 && x > 0.28 && x < 0.38) candidates.push('Snake2');
    if (y > 0.7 && x > 0.36) candidates.push('Snake3', 'Snake50');
    if (y > 0.5 && y < 0.65) candidates.push('Sweet', 'Soda', 'Suka');
  } else {
    if (x > 0.4 && y < 0.45) candidates.push('Drago');
    if (x > 0.45 && y > 0.45 && y < 0.55) candidates.push('Gwiazda');
    if (x > 0.35 && y > 0.55) candidates.push('Hiena');
    if (x < 0.25 && y > 0.45 && y < 0.6) candidates.push('Hammer');
  }

  return candidates.find(c => !used.has(c)) || '';
}

// ── Process Vision results ──
function processVisionResults(detected, doritoSide) {
  const bunkers = [];

  detected.forEach(d => {
    const side = getBunkerSide(d.x, d.y, doritoSide);
    const suggestedName = suggestPositionName(d.x, d.y, side, bunkers);
    const suggestedType = d.type || 'Br';
    const masterId = uid();

    bunkers.push({
      id: masterId, positionName: suggestedName, type: suggestedType,
      x: d.x, y: d.y, confidence: d.confidence, role: 'master', accepted: d.confidence === 'high',
    });

    if (Math.abs(d.x - 0.5) > 0.02) {
      bunkers.push({
        id: uid(), positionName: suggestedName, type: suggestedType,
        x: 1 - d.x, y: d.y, confidence: d.confidence, role: 'mirror', masterId, accepted: d.confidence === 'high',
      });
    }
  });

  return bunkers;
}

// ── Bunker review row ──
function BunkerReviewRow({ bunker, onAccept }) {
  const typeInfo = bunkerByAbbr(bunker.type) || {};
  const needsReview = bunker.confidence === 'low' || !bunker.positionName;

  if (bunker.role === 'mirror') return null; // Only show masters

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.sm,
      padding: `${SPACE.sm}px ${SPACE.md}px`, borderBottom: `1px solid ${COLORS.border}30`,
      minHeight: TOUCH.minTarget,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: '50%',
        background: bunker.accepted ? COLORS.success : needsReview ? COLORS.accent : COLORS.success,
      }} />
      <span style={{ fontFamily: FONT, color: COLORS.text, fontSize: FONT_SIZE.sm, fontWeight: 600, flex: 1 }}>
        {typeInfo.name || bunker.type}
      </span>
      <span style={{ fontFamily: FONT, color: COLORS.accent, fontSize: FONT_SIZE.xs }}>
        {bunker.positionName ? `-> ${bunker.positionName}` : '-> ?'}
      </span>
      {bunker.accepted ? (
        <span style={{ color: COLORS.success, fontSize: FONT_SIZE.xs, fontWeight: 700, fontFamily: FONT }}>ok</span>
      ) : (
        <Btn variant="ghost" size="sm" onClick={() => onAccept(bunker.id)}>
          accept
        </Btn>
      )}
    </div>
  );
}

// ── Main component ──
export default function VisionScan({ image, calibration, doritoSide, onComplete, onSkip }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [bunkers, setBunkers] = useState([]);
  const [scanned, setScanned] = useState(false);

  const masterCount = bunkers.filter(b => b.role === 'master').length;
  const totalCount = bunkers.length;

  const handleScan = async () => {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    if (!apiKey) {
      setError('Vision API key not configured. Add VITE_ANTHROPIC_API_KEY to .env');
      return;
    }

    setScanning(true); setError(null);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 2000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.split(',')[1] } },
              { type: 'text', text: VISION_PROMPT(calibration, doritoSide) },
            ],
          }],
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error.message || 'API error');
        setScanning(false);
        return;
      }

      const text = data.content?.[0]?.text || '';
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        setError('Could not parse bunker data from response');
        setScanning(false);
        return;
      }

      const detected = JSON.parse(jsonMatch[0]);
      const processed = processVisionResults(detected, doritoSide);
      setBunkers(processed);
      setScanned(true);
    } catch (e) {
      setError(e.message || 'Scan failed');
    }
    setScanning(false);
  };

  const handleAccept = (id) => {
    setBunkers(prev => prev.map(b => {
      if (b.id === id) return { ...b, accepted: true };
      if (b.masterId === id) return { ...b, accepted: true };
      return b;
    }));
  };

  const handleAcceptAll = () => {
    setBunkers(prev => prev.map(b => ({ ...b, accepted: true })));
  };

  const handleFinish = () => {
    const accepted = bunkers.filter(b => b.accepted).map(b => ({
      id: b.id, positionName: b.positionName, name: b.positionName,
      type: b.type, baType: b.type, x: b.x, y: b.y,
      role: b.role, masterId: b.masterId,
      heightM: bunkerByAbbr(b.type)?.height || 1.2,
      widthM: bunkerByAbbr(b.type)?.w || 1.5,
      depthM: bunkerByAbbr(b.type)?.d || 1.0,
    }));
    onComplete(accepted);
  };

  // Auto-scan on mount
  useEffect(() => { if (!scanned && !scanning) handleScan(); }, []);

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: SPACE.lg }}>
      {/* Section label */}
      <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, padding: `${SPACE.md}px ${SPACE.lg}px` }}>
        Scan bunkers
      </div>

      {/* Scanning state */}
      {scanning && (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: SPACE.xxl, gap: SPACE.md,
        }}>
          <div style={{ fontSize: 48, animation: 'spin 1.5s linear infinite' }}>🔍</div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, color: COLORS.text }}>Scanning field...</div>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted }}>
            Analyzing bunker positions with AI
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: SPACE.lg }}>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger, marginBottom: SPACE.md }}>
            {error}
          </div>
          <Btn variant="default" onClick={handleScan}>Retry scan</Btn>
        </div>
      )}

      {/* Results */}
      {scanned && !scanning && (
        <>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, padding: `0 ${SPACE.lg}px`, marginBottom: SPACE.sm }}>
            AI detected {masterCount} bunkers → mirrored to {totalCount}
          </div>

          {/* Field preview with dots */}
          {image && (
            <div style={{ position: 'relative', margin: `0 ${SPACE.lg}px`, borderRadius: RADIUS.md, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
              <img src={image} alt="Field" style={{ width: '100%', display: 'block' }} />
              {bunkers.filter(b => b.accepted).map(b => (
                <div key={b.id} style={{
                  position: 'absolute',
                  left: `${b.x * 100}%`, top: `${b.y * 100}%`,
                  transform: 'translate(-50%,-50%)',
                  width: b.role === 'mirror' ? 6 : 8, height: b.role === 'mirror' ? 6 : 8,
                  borderRadius: '50%',
                  background: b.confidence === 'high' ? COLORS.success : COLORS.accent,
                  border: `1px solid ${b.role === 'mirror' ? COLORS.textMuted : COLORS.text}`,
                  opacity: b.role === 'mirror' ? 0.5 : 1,
                }} />
              ))}
            </div>
          )}

          {/* Detected bunkers list */}
          <div style={{
            margin: `${SPACE.md}px ${SPACE.lg}px`, borderRadius: RADIUS.md,
            border: `1px solid ${COLORS.border}`, background: COLORS.surfaceLight, overflow: 'hidden',
          }}>
            {bunkers.filter(b => b.role === 'master').map(b => (
              <BunkerReviewRow key={b.id} bunker={b} onAccept={handleAccept} />
            ))}
          </div>

          {/* Actions */}
          <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
            <Btn variant="accent" onClick={handleFinish}
              style={{ width: '100%', justifyContent: 'center', minHeight: 52, fontSize: FONT_SIZE.lg, fontWeight: 800 }}>
              <Icons.Check /> Accept all and finish
            </Btn>
          </div>
        </>
      )}

      {/* Skip option */}
      <div style={{ padding: `0 ${SPACE.lg}px` }}>
        <Btn variant="ghost" onClick={onSkip}
          style={{ width: '100%', justifyContent: 'center', marginTop: SPACE.sm, color: COLORS.textMuted }}>
          Skip — add bunkers manually
        </Btn>
      </div>
    </div>
  );
}
