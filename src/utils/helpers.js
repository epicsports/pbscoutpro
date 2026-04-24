// ─── Utility helpers ───

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const plMatch = (n) =>
  n === 1 ? 'match' : 'matches';

export const plPoint = (n) =>
  n === 1 ? 'point' : 'points';

export const plPlayer = (n) =>
  n === 1 ? 'player' : 'players';

/**
 * matchScore — count side-A vs side-B point wins from the canonical
 * outcome enum (`win_a` / `win_b`). Single source of truth for both
 * MatchPage's detail header and ScoutTabContent / CoachTabContent
 * card list. Mirrors what mergeMatchPoints writes to match.scoreA/B at
 * end-of-match, so live (pre-merge) computation matches post-merge value.
 *
 * Returns `null` for empty points so callers can distinguish "no data"
 * from "0:0 draw".
 */
export const matchScore = (points = []) => {
  if (!points?.length) return null;
  const a = points.filter((p) => p.outcome === 'win_a').length;
  const b = points.filter((p) => p.outcome === 'win_b').length;
  return { a, b };
};

/** Compress field image for Firestore (max ~1000px wide, JPEG 70%) */
export const compressImage = (dataUrl, maxWidth = 1000) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });

/** Get display name for a player */
export const playerDisplayName = (player) => {
  if (!player) return '?';
  if (player.nickname) return player.nickname;
  return player.name || `#${player.number}`;
};

/** Get short label for player chip (number + nick) */
export const playerChipLabel = (player) => {
  if (!player) return '?';
  const nick = player.nickname || player.name || '';
  return `#${player.number} ${nick}`.trim();
};

/** Mirror x coordinate (for showing opponent breakout on mirrored field) */
export const mirrorX = (pos) => pos ? { ...pos, x: 1 - pos.x } : null;

/** Mirror an array of positions (players, elimPositions) */
export const mirrorPositions = (arr) => (arr || []).map(p => mirrorX(p));

/** Mirror bump stops (have x,y,duration) */
export const mirrorBumps = (arr) => (arr || []).map(b => b ? { ...b, x: 1 - b.x } : null);

/** Mirror shots object/array — each shot has {x, y, isKill} */
export const mirrorShotsObj = (shotsObj) => {
  if (!shotsObj) return {};
  if (Array.isArray(shotsObj)) {
    const o = {};
    shotsObj.forEach((arr, i) => { o[String(i)] = (arr || []).map(s => ({ ...s, x: 1 - s.x })); });
    return o;
  }
  const o = {};
  [0,1,2,3,4].forEach(i => {
    o[String(i)] = (shotsObj[String(i)] || []).map(s => ({ ...s, x: 1 - s.x }));
  });
  return o;
};

/** Clamp value between min and max */
export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

/** Get current year */
export const currentYear = () => new Date().getFullYear();

/** Year options for tournament selector */
export const yearOptions = () => {
  const cur = currentYear();
  return Array.from({ length: 10 }, (_, i) => cur - i);
};

/**
 * Resolve field image + Disco/Zeeker lines for a tournament.
 * Priority: tournament.layoutId → layout data. Fallback: tournament's own fieldImage.
 * Disco/Zeeker: tournament override → layout → defaults.
 */
export const resolveField = (tournament, layouts) => {
  const layout = tournament?.layoutId ? layouts?.find(l => l.id === tournament.layoutId) : null;
  const fieldImage = layout?.fieldImage || tournament?.fieldImage || null;
  const discoLine = tournament?.discoLineOverride ?? layout?.discoLine ?? tournament?.discoLine ?? 0.30;
  const zeekerLine = tournament?.zeekerLineOverride ?? layout?.zeekerLine ?? tournament?.zeekerLine ?? 0.80;
  return { fieldImage, discoLine, zeekerLine, layout, hasLayout: !!layout };
};

// ─── Point-in-polygon (ray casting) ───
// polygon: [{ x, y }, ...] — normalized 0-1 coordinates
export const pointInPolygon = (point, polygon) => {
  if (!polygon || polygon.length < 3) return false;
  const { x, y } = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

// ─── Nearest bunker to a position ───
// Returns bunker object or null if none within threshold (normalized distance)
export const nearestBunker = (pos, bunkers, threshold = 0.08) => {
  if (!pos || !bunkers?.length) return null;
  let best = null, bestDist = threshold;
  bunkers.forEach(b => {
    const dx = b.x - pos.x, dy = b.y - pos.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) { bestDist = d; best = b; }
  });
  return best;
};

// ─── Resolve field with bunkers + zones + calibration ───
export const resolveFieldFull = (tournament, layouts) => {
  const base = resolveField(tournament, layouts);
  const layout = base.layout;
  return {
    ...base,
    bunkers: layout?.bunkers || tournament?.bunkers || [],
    dangerZone: layout?.dangerZone || tournament?.dangerZone || null,
    sajgonZone: layout?.sajgonZone || tournament?.sajgonZone || null,
    fieldCalibration: layout?.fieldCalibration || null,
  };
};

// ─── Field Calibration helpers ───

/**
 * Build a coordinate transform between image-space (0-1) and field-space (0-1).
 * Returns null if no calibration data.
 * 
 * Image-space: (0,0) = top-left of image, (1,1) = bottom-right
 * Field-space: (0,0) = home base corner, (1,1) = away base corner
 *              Worker uses field-space × fieldW/fieldH to get meters.
 */
export function makeFieldTransform(calibration) {
  if (!calibration?.homeBase || !calibration?.awayBase) return null;

  const hx = calibration.homeBase.x, hy = calibration.homeBase.y;
  const ax = calibration.awayBase.x, ay = calibration.awayBase.y;

  // Field axis in image-space
  const fieldLenImg = Math.sqrt((ax - hx) ** 2 + (ay - hy) ** 2);
  if (fieldLenImg < 0.01) return null; // degenerate

  const angle = Math.atan2(ay - hy, ax - hx);
  const cosA = Math.cos(-angle), sinA = Math.sin(-angle);
  const cosB = Math.cos(angle), sinB = Math.sin(angle);

  // NXL field: 150ft × 120ft = aspect 1.25:1
  const fieldWidthImg = fieldLenImg * (36.6 / 45.7);

  return {
    // Image (0-1) → Field normalized (0-1)
    toField(imgX, imgY) {
      const dx = imgX - hx, dy = imgY - hy;
      const fx = dx * cosA - dy * sinA;   // along field axis
      const fy = dx * sinA + dy * cosA;   // perpendicular
      return {
        x: fx / fieldLenImg,
        y: fy / fieldWidthImg + 0.5,
      };
    },

    // Field normalized (0-1) → Image (0-1)
    toImage(fieldX, fieldY) {
      const fx = fieldX * fieldLenImg;
      const fy = (fieldY - 0.5) * fieldWidthImg;
      return {
        x: hx + fx * cosB - fy * sinB,
        y: hy + fx * sinB + fy * cosB,
      };
    },

    // For heatmap rendering: field bounds in canvas pixel coordinates
    // Call with canvas width/height to get pixel positions
    canvasBounds(canvasW, canvasH) {
      const x0 = hx * canvasW, y0_center = ((hy + ay) / 2) * canvasH;
      const x1 = ax * canvasW;
      const fieldW_px = Math.sqrt((x1 - x0) ** 2 + ((ay - hy) * canvasH) ** 2);
      const fieldH_px = fieldW_px * (36.6 / 45.7);
      return {
        x: x0,                          // left edge of field in pixels
        y: y0_center - fieldH_px / 2,   // top edge of field in pixels
        w: fieldW_px,                    // field width in pixels (along axis)
        h: fieldH_px,                    // field height in pixels (perpendicular)
        angle,                           // rotation angle (radians)
      };
    },

    fieldLenImg,
    fieldWidthImg,
    angle,
  };
}

/** Simple position transform: image-normalized → meters (no rotation) */
export const calibrationToMeters = (normPos, calibration) => {
  const t = makeFieldTransform(calibration);
  if (!t) return { x: normPos.x * 45.7, y: normPos.y * 36.6 };
  const f = t.toField(normPos.x, normPos.y);
  return { x: f.x * 45.7, y: f.y * 36.6 };
};

/** Mirror a position from right side to left (flip X axis). */
export function mirrorPos(pos) {
  if (!pos) return pos;
  return { ...pos, x: 1 - pos.x };
}

/** Mirror all player positions/shots in point data to LEFT side. */
export function mirrorPointToLeft(pointData, fieldSide) {
  if (!pointData || fieldSide === 'left' || !fieldSide) return pointData;
  // shots may be Firestore object {0:[...], 1:[...]} or array — normalize
  const shotsArr = Array.isArray(pointData.shots)
    ? pointData.shots
    : pointData.shots
      ? [0, 1, 2, 3, 4].map(i => pointData.shots[String(i)] || [])
      : [];
  return {
    ...pointData,
    players: (pointData.players || []).map(p => p ? mirrorPos(p) : null),
    shots: shotsArr.map(arr => Array.isArray(arr) ? arr.map(s => s ? mirrorPos(s) : null) : arr),
    bumpStops: (pointData.bumpStops || []).map(b => b ? mirrorPos(b) : null),
    eliminationPositions: (pointData.eliminationPositions || []).map(p => p ? mirrorPos(p) : null),
  };
}

/** Determine which side of the field a bunker is on (dorito/snake/center). */
export function getBunkerSide(x, y, doritoSide = 'top') {
  // Accept bunker object or raw x,y
  if (typeof x === 'object') { const b = x; doritoSide = y || 'top'; x = b.x; y = b.y; }
  // Center: X 30-65% AND Y 25-75%
  if (x >= 0.30 && x <= 0.65 && y >= 0.25 && y <= 0.75) return 'center';
  // Dorito/Snake based on Y position relative to midline
  const isTop = y < 0.5;
  if (doritoSide === 'top') return isTop ? 'dorito' : 'snake';
  return isTop ? 'snake' : 'dorito';
}

/**
 * Recompute mirror bunker positions using field calibration.
 *
 * Bunkers are stored in image-space (0..1 of the canvas/image). The original
 * mirror logic uses `x' = 1 - x` which is correct only when the field is
 * perfectly centered in the image. When the field photo is cropped off-center
 * (e.g. with logos/branding around the actual play area), this `1-x` mirror
 * lands the mirror in the wrong spot.
 *
 * This helper takes the bunker array + calibration and re-projects every
 * `role:'mirror'` entry: master image-pos → field-space → flip x → image-pos.
 * Returns the same array with corrected mirror positions.
 *
 * No-op if calibration is missing or transform is degenerate.
 */
export function recomputeMirrorsWithCalibration(bunkers, calibration) {
  if (!Array.isArray(bunkers) || !calibration?.homeBase || !calibration?.awayBase) return bunkers;
  const transform = makeFieldTransform(calibration);
  if (!transform) return bunkers;

  // Index masters by id for explicit master-mirror pairs
  const masterById = new Map();
  bunkers.forEach(b => {
    if (b.role !== 'mirror') masterById.set(b.id, b);
  });

  // Heuristic: legacy data has no `role` field — pair bunkers by mirrored
  // position. For each bunker on the right (field-x > 0.5), find the left-side
  // counterpart with the closest mirrored position and treat it as master.
  // This lets us correct positions even on older layouts created before
  // role/masterId were tracked.
  const findLegacyMaster = (b) => {
    const bField = transform.toField(b.x, b.y);
    if (bField.x <= 0.5) return null; // only right-side bunkers are "mirrors"
    let best = null; let bestDist = 0.06; // tolerance
    bunkers.forEach(o => {
      if (o.id === b.id) return;
      const oField = transform.toField(o.x, o.y);
      if (oField.x >= 0.5) return;
      const d = Math.hypot((1 - oField.x) - bField.x, oField.y - bField.y);
      if (d < bestDist) { bestDist = d; best = o; }
    });
    return best;
  };

  return bunkers.map(b => {
    let master = null;
    if (b.role === 'mirror' && b.masterId) {
      master = masterById.get(b.masterId);
    } else if (!b.role) {
      master = findLegacyMaster(b);
    }
    if (!master) return b;
    const fieldPos = transform.toField(master.x, master.y);
    const mirroredField = { x: 1 - fieldPos.x, y: fieldPos.y };
    const mirroredImage = transform.toImage(mirroredField.x, mirroredField.y);
    return { ...b, x: mirroredImage.x, y: mirroredImage.y };
  });
}

/**
 * Compute mirrored bunkers from masters + centers.
 * Masters are on left half; mirrors computed symmetrically.
 * @param {Array} masters - bunkers on left half (x < 0.42)
 * @param {Array} centerBunkers - bunkers near center (0.42 < x < 0.58)
 * @param {'y'|'diag'} mirrorMode - 'y' = Y-axis only, 'diag' = X+Y diagonal
 */
export function computeMirrors(masters, centerBunkers, mirrorMode = 'y') {
  const mirror = (x, y) => mirrorMode === 'diag'
    ? { x: 1 - x, y: 1 - y }
    : { x: 1 - x, y };

  const all = [];

  masters.forEach(b => {
    all.push({ ...b, role: 'master' });
    const m = mirror(b.x, b.y);
    all.push({ ...b, id: b.id + '_mirror', x: m.x, y: m.y, role: 'mirror', masterId: b.id });
  });

  centerBunkers.forEach(b => {
    all.push({ ...b, role: 'center' });
    if (Math.abs(b.x - 0.5) > 0.02) {
      const m = mirror(b.x, b.y);
      all.push({ ...b, id: b.id + '_mirror', x: m.x, y: m.y, role: 'center', masterId: b.id });
    }
  });

  return all;
}

/** Mirror shots to RIGHT side of field. Players stay on left. */
export function mirrorShotsToRight(shotsArr, fieldSide) {
  if (!shotsArr) return [];
  const normalized = Array.isArray(shotsArr)
    ? shotsArr
    : [0, 1, 2, 3, 4].map(i => shotsArr[String(i)] || []);
  // If scouted from left, shots are already on right half (opponent side) — keep as is
  // If scouted from right, shots need to be mirrored to right
  if (fieldSide === 'right' || !fieldSide) {
    return normalized.map(arr => Array.isArray(arr) ? arr.map(s => s ? mirrorPos(s) : null) : arr);
  }
  return normalized;
}
