/**
 * Bunker Shape Polygons — geometric hitboxes for ballistic shadow calculation.
 * 
 * Each shape is a polygon defined as vertices relative to bunker center (0,0).
 * Coordinates are in METERS (real-world scale from SIZES in ballisticsEngine).
 * 
 * The ballistics system uses these to cast accurate shadows:
 * - Dorito → triangle (not AABB rectangle)
 * - Can → circle (handled separately)
 * - Brick → rectangle
 * - Temple → pentagon (house shape)
 * - X-Bunker → cross (two overlapping rectangles)
 * - Wing → chevron/V shape
 * 
 * Orientation: shapes face "up" by default (toward opponent's base).
 * The ballistics engine rotates based on bunker's field position.
 * 
 * REUSABLE: Used by ballisticsEngine.js (Web Worker) AND by drawBunkers.js (canvas).
 */

// Triangle (isosceles) — point facing away from base
function triangle(w, d) {
  return [
    { x: 0, y: -d / 2 },       // tip (facing opponent)
    { x: -w / 2, y: d / 2 },   // bottom-left
    { x: w / 2, y: d / 2 },    // bottom-right
  ];
}

// Rectangle
function rect(w, d) {
  const hw = w / 2, hd = d / 2;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: hd },
    { x: -hw, y: hd },
  ];
}

// Pentagon (house/temple shape) — flat bottom, peaked top
function pentagon(w, d) {
  const hw = w / 2, hd = d / 2;
  return [
    { x: 0, y: -hd },           // peak
    { x: hw, y: -hd * 0.3 },   // upper right
    { x: hw, y: hd },           // lower right
    { x: -hw, y: hd },          // lower left
    { x: -hw, y: -hd * 0.3 },  // upper left
  ];
}

// Cross / X-Bunker (plus shape)
function cross(w, d) {
  const arm = w * 0.3; // arm thickness
  const hw = w / 2, hd = d / 2;
  return [
    // Top arm
    { x: -arm / 2, y: -hd },
    { x: arm / 2, y: -hd },
    // Right notch
    { x: arm / 2, y: -arm / 2 },
    { x: hw, y: -arm / 2 },
    { x: hw, y: arm / 2 },
    { x: arm / 2, y: arm / 2 },
    // Bottom arm
    { x: arm / 2, y: hd },
    { x: -arm / 2, y: hd },
    // Left notch
    { x: -arm / 2, y: arm / 2 },
    { x: -hw, y: arm / 2 },
    { x: -hw, y: -arm / 2 },
    { x: -arm / 2, y: -arm / 2 },
  ];
}

// Chevron / Wing (V-shape, open toward base)
function chevron(w, d) {
  const hw = w / 2, hd = d / 2;
  const thickness = d * 0.35;
  return [
    { x: 0, y: -hd },                     // center tip
    { x: hw, y: hd * 0.3 },              // right outer
    { x: hw, y: hd },                     // right outer bottom
    { x: 0, y: -hd + thickness },        // center inner
    { x: -hw, y: hd },                    // left outer bottom
    { x: -hw, y: hd * 0.3 },             // left outer
  ];
}

/**
 * BUNKER_SHAPES — maps type abbreviation to { shape, polygon }
 * shape: 'polygon' | 'circle'
 * polygon: array of {x, y} vertices in meters relative to center
 * radius: for circles, in meters
 */
export const BUNKER_SHAPES = {
  // Doritos — triangles
  SD:  { shape: 'polygon', polygon: triangle(1.0, 1.2) },
  MD:  { shape: 'polygon', polygon: triangle(1.2, 1.8) },
  Dorito: { shape: 'polygon', polygon: triangle(1.2, 1.8) },

  // Cans/Rollies — circles
  C:   { shape: 'circle', radius: 0.45 },
  Tr:  { shape: 'circle', radius: 0.3 },
  R:   { shape: 'circle', radius: 0.45 },
  Can: { shape: 'circle', radius: 0.5 },
  Rollie: { shape: 'circle', radius: 0.45 },
  Pn:  { shape: 'circle', radius: 0.25 },

  // Rectangles — bricks, beams
  SB:  { shape: 'polygon', polygon: rect(3.0, 0.76) },
  Br:  { shape: 'polygon', polygon: rect(1.5, 0.9) },
  GB:  { shape: 'polygon', polygon: rect(3.0, 1.5) },
  MW:  { shape: 'polygon', polygon: rect(1.5, 0.8) },
  Mn:  { shape: 'polygon', polygon: rect(2.0, 0.6) },
  Snake: { shape: 'polygon', polygon: rect(3.0, 0.76) },
  Beam:  { shape: 'polygon', polygon: rect(3.0, 0.76) },
  Brick: { shape: 'polygon', polygon: rect(1.5, 0.9) },

  // Cakes — squares
  Ck:  { shape: 'polygon', polygon: rect(1.5, 1.5) },
  TCK: { shape: 'polygon', polygon: rect(1.5, 1.5) },
  'Small Cake': { shape: 'polygon', polygon: rect(1.5, 1.5) },
  'Tall Cake':  { shape: 'polygon', polygon: rect(1.5, 1.5) },

  // Temple — pentagon
  T:   { shape: 'polygon', polygon: pentagon(1.8, 1.5) },
  Temple: { shape: 'polygon', polygon: pentagon(1.8, 1.5) },

  // Maya temple — pentagon
  MT:  { shape: 'polygon', polygon: pentagon(2.5, 2.0) },
  Maya: { shape: 'polygon', polygon: pentagon(2.5, 2.0) },

  // X-Bunker / Giant Pin — cross
  GP:  { shape: 'polygon', polygon: cross(2.5, 2.5) },
  'X-Bunker': { shape: 'polygon', polygon: cross(1.5, 1.5) },

  // Wings — chevron
  Wg:  { shape: 'polygon', polygon: chevron(2.0, 1.0) },
  GW:  { shape: 'polygon', polygon: chevron(2.4, 1.5) },
  Wing: { shape: 'polygon', polygon: chevron(2.4, 1.5) },

  // Dollhouse, Carwash — rectangles
  Dollhouse: { shape: 'polygon', polygon: rect(1.5, 1.5) },
  Carwash:   { shape: 'polygon', polygon: rect(2.0, 1.2) },
  Az:  { shape: 'polygon', polygon: rect(1.5, 1.5) },
  GD:  { shape: 'polygon', polygon: rect(1.5, 2.2) },

  // Tower
  Tower: { shape: 'circle', radius: 0.9 },

  // Fallback
  Inne: { shape: 'polygon', polygon: rect(1.2, 1.2) },
};

/**
 * Get shape for a bunker type, with fallback to rectangle from SIZES
 */
export function getBunkerShape(type) {
  if (BUNKER_SHAPES[type]) return BUNKER_SHAPES[type];
  // Fallback: rectangle from known SIZES or default
  return { shape: 'polygon', polygon: rect(1.2, 1.2) };
}

/**
 * Ray-polygon intersection test.
 * Returns distance to first hit, or -1 if no hit.
 * polygon: array of {x, y} vertices (in world coords, already translated to bunker position)
 */
export function rayPolygon(ax, ay, bx, by, polygon) {
  const dx = bx - ax, dy = by - ay;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 0.001) return -1;

  let minT = Infinity;
  const n = polygon.length;
  for (let i = 0; i < n; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % n];
    // Edge: p1 → p2
    const ex = p2.x - p1.x, ey = p2.y - p1.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-10) continue;
    const t = ((p1.x - ax) * ey - (p1.y - ay) * ex) / denom;
    const u = ((p1.x - ax) * dy - (p1.y - ay) * dx) / denom;
    if (t > 0.001 && t <= 1 && u >= 0 && u <= 1) {
      if (t < minT) minT = t;
    }
  }
  return minT < Infinity ? minT * len : -1;
}

/**
 * Translate polygon vertices to world position
 */
export function translatePolygon(polygon, cx, cy) {
  return polygon.map(p => ({ x: p.x + cx, y: p.y + cy }));
}
