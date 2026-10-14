/**
 * Whether the photo is light or dark behind a piece of Home's text, so the text can take the ink that reads on it
 * whatever the theme: the theme's ink alone turns grey on grey over a dark corner of a light-theme photo.
 * Pure functions; Home measures the photo once it loads and when the window is resized.
 */

export type PhotoTone = 'light' | 'dark';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The part of the image under `rect` (in the box's pixels) when the image covers the box, centred, as
 * `object-fit: cover` lays it out.
 */
export function coverSource(
  imageWidth: number,
  imageHeight: number,
  boxWidth: number,
  boxHeight: number,
  rect: Rect,
): Rect {
  const scale = Math.max(boxWidth / imageWidth, boxHeight / imageHeight);
  const offsetX = (imageWidth * scale - boxWidth) / 2;
  const offsetY = (imageHeight * scale - boxHeight) / 2;
  return {
    x: (rect.x + offsetX) / scale,
    y: (rect.y + offsetY) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

/** Mean relative luminance (0 black to 1 white) of RGBA pixels. */
export function luminance(pixels: Uint8ClampedArray): number {
  const channel = (value: number) => {
    const c = value / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  let total = 0;
  let count = 0;
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    total += 0.2126 * channel(pixels[i]) + 0.7152 * channel(pixels[i + 1]) + 0.0722 * channel(pixels[i + 2]);
    count++;
  }
  return count ? total / count : 1;
}

/**
 * Light when dark ink reads better on it than light ink: above 0.18, where black and white text have the same
 * contrast (√(1.05 × 0.05) − 0.05).
 */
export function toneOf(pixels: Uint8ClampedArray): PhotoTone {
  return luminance(pixels) > 0.18 ? 'light' : 'dark';
}

/**
 * The tone of `image` under `rect`, `image` covering a `boxWidth` × `boxHeight` box and `veil` (a CSS colour, the
 * scrim over it there) laid on top; null when it cannot be read.
 */
export function measureTone(
  image: HTMLImageElement,
  boxWidth: number,
  boxHeight: number,
  rect: Rect,
  veil = '',
): PhotoTone | null {
  if (!image.naturalWidth || !rect.width || !rect.height) {
    return null;
  }
  const source = coverSource(image.naturalWidth, image.naturalHeight, boxWidth, boxHeight, rect);
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 12;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    return null;
  }
  try {
    context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
    if (veil) {
      context.fillStyle = veil;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    return toneOf(context.getImageData(0, 0, canvas.width, canvas.height).data);
  } catch {
    // A photo from another origin without CORS taints the canvas: keep the theme's ink.
    return null;
  }
}
