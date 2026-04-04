// ─── Utility helpers ───

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const plMatch = (n) =>
  n === 1 ? 'match' : 'matches';

export const plPoint = (n) =>
  n === 1 ? 'point' : 'points';

export const plPlayer = (n) =>
  n === 1 ? 'player' : 'players';

export const matchScore = (points = []) => {
  if (!points.length) return null;
  return {
    w: points.filter((p) => p.outcome === 'win').length,
    l: points.filter((p) => p.outcome === 'loss').length,
    t: points.filter((p) => p.outcome === 'timeout').length,
    total: points.length,
  };
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
