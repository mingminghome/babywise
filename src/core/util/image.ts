/**
 * Client-side image prep for Ask (resize + JPEG compress).
 * Keeps payload small for Worker / vision APIs.
 */

export type PreparedImage = {
  /** image/jpeg | image/png | image/webp */
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  /** Raw base64 (no data: prefix) */
  data: string;
  /** data URL for local preview */
  dataUrl: string;
  width: number;
  height: number;
  /** Approximate decoded byte size */
  byteLength: number;
};

const MAX_EDGE = 1280;
/** Soft target after compress (decoded bytes) */
const TARGET_BYTES = 750_000;
/** Hard cap before send */
export const MAX_IMAGE_BYTES = 1_000_000;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image_load_failed'));
    };
    img.src = url;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('image_encode_failed'));
        else resolve(blob);
      },
      type,
      quality
    );
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/**
 * Resize and compress a user photo for Ask.
 * Converts HEIC/odd formats to JPEG when the browser can decode them.
 */
export async function prepareAskImage(file: File): Promise<PreparedImage> {
  if (!file || !file.type.startsWith('image/')) {
    // Some mobile browsers omit type for camera shots
    if (!file?.type && !file?.name) throw new Error('not_image');
    if (file.type && !ALLOWED.has(file.type) && !file.type.startsWith('image/')) {
      throw new Error('not_image');
    }
  }

  const img = await loadImage(file);
  let { width, height } = img;
  if (!width || !height) throw new Error('image_load_failed');

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('image_encode_failed');
  ctx.drawImage(img, 0, 0, width, height);

  // Prefer JPEG for size; keep PNG only if tiny and already PNG
  let quality = 0.82;
  let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  while (blob.size > TARGET_BYTES && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, 'image/jpeg', quality);
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    // Last resort: shrink further
    const shrink = Math.sqrt(MAX_IMAGE_BYTES / blob.size) * 0.9;
    canvas.width = Math.max(1, Math.round(width * shrink));
    canvas.height = Math.max(1, Math.round(height * shrink));
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    blob = await canvasToBlob(canvas, 'image/jpeg', 0.7);
  }

  if (blob.size > MAX_IMAGE_BYTES) {
    throw new Error('image_too_large');
  }

  const data = await blobToBase64(blob);
  const mimeType = 'image/jpeg' as const;
  return {
    mimeType,
    data,
    dataUrl: `data:${mimeType};base64,${data}`,
    width: canvas.width,
    height: canvas.height,
    byteLength: blob.size,
  };
}
