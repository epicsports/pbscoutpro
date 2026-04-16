import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Client-side image processing + upload to Firebase Storage.
 *
 * Resize happens in the browser (canvas 2d) before upload — avoids
 * needing Firebase Storage "Resize Images" extension (which requires
 * Blaze plan). Trade-off: users upload the already-resized file, so
 * full-resolution original is not kept. Good enough for avatars.
 *
 * Typical use:
 *   const file = e.target.files[0];
 *   const cropped = await cropAndResizeSquare(file, 400);  // 400x400 JPEG blob
 *   const url = await uploadAvatar(cropped, userId);
 */

/**
 * Read a File/Blob into an Image element for canvas processing.
 */
function loadImage(fileOrBlob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

/**
 * Resize + center-crop to a square JPEG blob.
 * @param {File|Blob} fileOrBlob - input image
 * @param {number} size - target width/height in px (default 400)
 * @param {number} quality - JPEG quality 0..1 (default 0.85)
 * @returns {Promise<Blob>}
 */
export async function cropAndResizeSquare(fileOrBlob, size = 400, quality = 0.85) {
  const img = await loadImage(fileOrBlob);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Center-crop source to square
  const srcSize = Math.min(img.width, img.height);
  const sx = (img.width - srcSize) / 2;
  const sy = (img.height - srcSize) / 2;

  ctx.fillStyle = '#1a2234';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, size, size);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Crop with explicit source rectangle (for custom crop UI).
 * @param {File|Blob} fileOrBlob
 * @param {{x:number,y:number,size:number}} cropRect - source px coords (square)
 * @param {number} targetSize - output size in px
 */
export async function cropToSquare(fileOrBlob, cropRect, targetSize = 400, quality = 0.85) {
  const img = await loadImage(fileOrBlob);
  const canvas = document.createElement('canvas');
  canvas.width = targetSize;
  canvas.height = targetSize;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1a2234';
  ctx.fillRect(0, 0, targetSize, targetSize);
  ctx.drawImage(
    img,
    cropRect.x, cropRect.y, cropRect.size, cropRect.size,
    0, 0, targetSize, targetSize
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('canvas.toBlob failed')),
      'image/jpeg',
      quality
    );
  });
}

/**
 * Upload blob to Firebase Storage at `avatars/{userId}.jpg`.
 * Returns the public download URL.
 */
export async function uploadAvatar(blob, userId) {
  const r = ref(storage, `avatars/${userId}.jpg`);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

/**
 * Upload player photo. Path: `players/{workspaceSlug}/{playerId}.jpg`.
 */
export async function uploadPlayerPhoto(blob, workspaceSlug, playerId) {
  const r = ref(storage, `players/${workspaceSlug}/${playerId}.jpg`);
  await uploadBytes(r, blob, { contentType: 'image/jpeg' });
  return getDownloadURL(r);
}

/**
 * Delete player photo (if exists).
 */
export async function deletePlayerPhoto(workspaceSlug, playerId) {
  const r = ref(storage, `players/${workspaceSlug}/${playerId}.jpg`);
  try { await deleteObject(r); } catch (e) {
    if (e.code !== 'storage/object-not-found') throw e;
  }
}
