/** Generate a short unique ID */
export const uid = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Polish plural form for 'mecz' */
export const plMatch = (n) =>
  n === 1 ? 'mecz' : n < 5 ? 'mecze' : 'meczy';

/** Polish plural form for 'punkt' */
export const plPoint = (n) =>
  n === 1 ? 'punkt' : n < 5 ? 'punkty' : 'punktów';

/** Score summary from array of points */
export const matchScore = (points = []) => {
  if (!points.length) return null;
  return {
    w: points.filter((p) => p.outcome === 'win').length,
    l: points.filter((p) => p.outcome === 'loss').length,
    t: points.filter((p) => p.outcome === 'timeout').length,
    total: points.length,
  };
};

/** Compress field image to reasonable size for Firestore (max ~800px wide) */
export const compressImage = (dataUrl, maxWidth = 800) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const w = img.width * ratio;
      const h = img.height * ratio;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.src = dataUrl;
  });
