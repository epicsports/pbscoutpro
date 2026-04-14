/**
 * computeCoachingStats — compute coaching statistics from heatmap points
 * 
 * All stats are per-point percentages (0-100).
 * A "point" counts as 1 regardless of how many players triggered it.
 *
 * Coordinate system (all points mirrorPointToLeft, normalized 0-1):
 *   x: 0 = home base (left), 1 = away base (right)
 *   y: 0 = top, 1 = bottom
 *   doritoSide: 'top' means dorito is y < discoLine
 *
 * @param {Array} points — heatmap points, each { players: [{x,y}...], outcome, ... }
 * @param {Object} field — { discoLine, zeekerLine, dangerZone, sajgonZone, layout }
 * @returns {Object} { dorito, snake, disco, zeeker, center, danger, sajgon, total }
 */
import { pointInPolygon } from './helpers';

export function computeCoachingStats(points, field) {
  if (!points?.length) {
    return { dorito: 0, snake: 0, disco: 0, zeeker: 0, center: 0, danger: 0, sajgon: 0, total: 0 };
  }

  const total = points.length;
  const discoLine = field?.discoLine ?? 0.30;
  const zeekerLine = field?.zeekerLine ?? 0.80;
  const doritoSide = field?.layout?.doritoSide || field?.doritoSide || 'top';
  const dangerZone = field?.dangerZone || field?.layout?.dangerZone || null;
  const sajgonZone = field?.sajgonZone || field?.layout?.sajgonZone || null;

  // Disco line check depends on doritoSide orientation:
  // doritoSide='top' → disco is at y=discoLine, crossing = y < discoLine (going UP past line)
  // doritoSide='bottom' → disco is at y=1-discoLine, crossing = y > 1-discoLine (going DOWN past line)
  // Zeeker similarly:
  // doritoSide='top' → zeeker is at y=zeekerLine, crossing = y > zeekerLine (going DOWN past line)
  // doritoSide='bottom' → zeeker is at y=1-zeekerLine, crossing = y < 1-zeekerLine (going UP past line)

  const crossedDisco = (p) => {
    if (doritoSide === 'top') return p.y < discoLine;
    return p.y > (1 - discoLine);
  };

  const crossedZeeker = (p) => {
    if (doritoSide === 'top') return p.y > zeekerLine;
    return p.y < (1 - zeekerLine);
  };

  const inCenter = (p) => {
    // Center = between disco and zeeker on Y axis, AND within 70% of field from own base on X axis
    // Points are mirroredToLeft, so x=0 is always own base, x=1 is opponent base
    const betweenLines = doritoSide === 'top'
      ? (p.y >= discoLine && p.y <= zeekerLine)
      : (p.y >= (1 - zeekerLine) && p.y <= (1 - discoLine));
    const inMidField = p.x >= 0.3 && p.x <= 0.7;
    return betweenLines && inMidField;
  };

  let doritoCount = 0;  // point where someone crossed disco (ran dorito)
  let snakeCount = 0;   // point where someone crossed zeeker (ran snake)
  let discoCount = 0;   // point where NOBODY crossed disco (stayed behind disco)
  let zeekerCount = 0;  // point where NOBODY crossed zeeker (stayed above zeeker)
  let centerCount = 0;  // point where someone played center
  let dangerCount = 0;  // point where someone entered danger polygon
  let sajgonCount = 0;  // point where someone entered sajgon polygon

  points.forEach(pt => {
    const ps = (pt.players || []).filter(Boolean);
    if (!ps.length) return;

    const anyoneCrossedDisco = ps.some(p => crossedDisco(p));
    const anyoneCrossedZeeker = ps.some(p => crossedZeeker(p));

    // Dorito: someone ran past disco line
    if (anyoneCrossedDisco) doritoCount++;
    // Snake: someone ran past zeeker line
    if (anyoneCrossedZeeker) snakeCount++;
    // Disco: nobody crossed disco line (passive/disco play)
    if (!anyoneCrossedDisco) discoCount++;
    // Zeeker: nobody crossed zeeker line (stayed above zeeker)
    if (!anyoneCrossedZeeker) zeekerCount++;
    // Center: someone in center band
    if (ps.some(p => inCenter(p))) centerCount++;
    // Danger: someone in danger polygon
    if (dangerZone?.length >= 3 && ps.some(p => pointInPolygon(p, dangerZone))) {
      dangerCount++;
    }
    // Sajgon: someone in sajgon polygon
    if (sajgonZone?.length >= 3 && ps.some(p => pointInPolygon(p, sajgonZone))) {
      sajgonCount++;
    }
  });

  // Late break: point where any player has lateBreak flag
  let lateBreakCount = 0;
  points.forEach(pt => {
    const lb = pt.lateBreak || [];
    if (lb.some(Boolean)) lateBreakCount++;
  });

  return {
    dorito: Math.round(doritoCount / total * 100),
    snake: Math.round(snakeCount / total * 100),
    disco: Math.round(discoCount / total * 100),
    zeeker: Math.round(zeekerCount / total * 100),
    center: Math.round(centerCount / total * 100),
    danger: dangerZone?.length >= 3 ? Math.round(dangerCount / total * 100) : null,
    sajgon: sajgonZone?.length >= 3 ? Math.round(sajgonCount / total * 100) : null,
    lateBreak: Math.round(lateBreakCount / total * 100),
    total,
  };
}
