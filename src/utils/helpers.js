// ─── Utility helpers ───

export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const plMatch = (n) =>
  n === 1 ? 'mecz' : n < 5 ? 'mecze' : 'meczy';

export const plPoint = (n) =>
  n === 1 ? 'punkt' : n < 5 ? 'punkty' : 'punktów';

export const plPlayer = (n) =>
  n === 1 ? 'zawodnik' : n < 5 ? 'zawodników' : 'zawodników';

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

/** Clamp value between min and max */
export const clamp = (val, min, max) => Math.min(max, Math.max(min, val));

/** Get current year */
export const currentYear = () => new Date().getFullYear();

/** Year options for tournament selector */
export const yearOptions = () => {
  const cur = currentYear();
  return Array.from({ length: 10 }, (_, i) => cur - i);
};
