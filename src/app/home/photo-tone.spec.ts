import { describe, expect, it } from 'vitest';
import { coverSource, luminance, toneOf } from './photo-tone';

const pixels = (...colours: [number, number, number][]) =>
  new Uint8ClampedArray(colours.flatMap(([r, g, b]) => [r, g, b, 255]));

describe('coverSource', () => {
  it('maps a box rect to the image when the image is wider than the box (cropped left and right)', () => {
    // 2000×1000 into 1000×1000: scale 1, 500px cut off each side.
    expect(coverSource(2000, 1000, 1000, 1000, { x: 0, y: 900, width: 1000, height: 100 })).toEqual({
      x: 500,
      y: 900,
      width: 1000,
      height: 100,
    });
  });

  it('maps a box rect to the image when the image is taller than the box (cropped top and bottom)', () => {
    // 1000×2000 into 2000×1000: scale 2, the image is 2000×4000 on screen, 1500px cut off at the top.
    expect(coverSource(1000, 2000, 2000, 1000, { x: 0, y: 900, width: 2000, height: 100 })).toEqual({
      x: 0,
      y: 1200,
      width: 1000,
      height: 50,
    });
  });
});

describe('toneOf', () => {
  it('is light on white and dark on black', () => {
    expect(luminance(pixels([255, 255, 255]))).toBeCloseTo(1);
    expect(luminance(pixels([0, 0, 0]))).toBe(0);
    expect(toneOf(pixels([255, 255, 255]))).toBe('light');
    expect(toneOf(pixels([0, 0, 0]))).toBe('dark');
  });

  it('calls a mid grey dark: white text reads better on it than black', () => {
    // sRGB 110 is a luminance of about 0.16, under the 0.18 where both inks have the same contrast.
    expect(toneOf(pixels([110, 110, 110]))).toBe('dark');
    expect(toneOf(pixels([130, 130, 130]))).toBe('light');
  });

  it('averages the area: a dark photo with a few bright spots stays dark', () => {
    expect(
      toneOf(pixels(...Array.from({ length: 7 }, (): [number, number, number] => [20, 25, 30]), [250, 250, 250])),
    ).toBe('dark');
  });
});
