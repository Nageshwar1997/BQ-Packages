import { describe, expect, it } from 'vitest';

import { getFaceDetectionStatus, getObjectFitContentRect, hexToRGBA } from './index.js';

// `getFaceDetectionStatus` only ever reads `x`/`y` - `z`/`visibility` are filled with inert
// values purely to satisfy `NormalizedLandmark`'s shape.
const point = (x: number, y: number) => ({ x, y, z: 0, visibility: 1 });

describe('getFaceDetectionStatus', () => {
  it('returns not-in-frame when there is no face at all', () => {
    expect(getFaceDetectionStatus(undefined)).toBe('not-in-frame');
  });

  it('returns not-in-frame for an empty landmark array', () => {
    expect(getFaceDetectionStatus([])).toBe('not-in-frame');
  });

  it('returns not-in-frame when a landmark sits at/past the left or top edge margin', () => {
    const face = [point(0.001, 0.5), point(0.5, 0.5), point(0.9, 0.6)];
    expect(getFaceDetectionStatus(face)).toBe('not-in-frame');
  });

  it('returns not-in-frame when a landmark sits at/past the right or bottom edge margin', () => {
    const face = [point(0.1, 0.4), point(0.5, 0.5), point(0.999, 0.6)];
    expect(getFaceDetectionStatus(face)).toBe('not-in-frame');
  });

  it('returns not-clear for a face well inside the frame but under the size floor', () => {
    // Bounding box spans ~10% on each axis - under the 15% minimum, nowhere near an edge.
    const face = [point(0.4, 0.4), point(0.5, 0.45), point(0.5, 0.5)];
    expect(getFaceDetectionStatus(face)).toBe('not-clear');
  });

  it('returns detected for a well-framed, appropriately sized face', () => {
    // Bounding box spans 40% on each axis - comfortably past both the edge margin and the size
    // floor.
    const face = [
      point(0.3, 0.3),
      point(0.7, 0.3),
      point(0.7, 0.7),
      point(0.3, 0.7),
      point(0.5, 0.5),
    ];
    expect(getFaceDetectionStatus(face)).toBe('detected');
  });
});

describe('getObjectFitContentRect', () => {
  it('falls back to the full box when any dimension is zero', () => {
    expect(getObjectFitContentRect(0, 100, 100, 100, 'cover')).toEqual({
      leftPercent: 0,
      widthPercent: 100,
    });
    expect(getObjectFitContentRect(100, 100, 0, 100, 'contain')).toEqual({
      leftPercent: 0,
      widthPercent: 100,
    });
  });

  it('contain: letterboxes a portrait photo inside a landscape box, centered horizontally', () => {
    // 100x200 content inside a 400x200 box - height is the binding constraint (scale 1x), so
    // the content renders at its native 100px width, centered with 150px empty on each side.
    const rect = getObjectFitContentRect(400, 200, 100, 200, 'contain');
    expect(rect.widthPercent).toBeCloseTo(25); // 100/400
    expect(rect.leftPercent).toBeCloseTo(37.5); // (400-100)/2 / 400 * 100
  });

  it('cover: crops a landscape photo to fill a square box, overflowing past both sides', () => {
    // 200x100 content inside a 100x100 box - height is again the binding constraint, but for
    // `cover` that means the *width* scales up past the box and gets center-cropped.
    const rect = getObjectFitContentRect(100, 100, 200, 100, 'cover');
    expect(rect.widthPercent).toBeCloseTo(200); // rendered at 2x the box width
    expect(rect.leftPercent).toBeCloseTo(-50); // half hangs off each side
  });

  it('fill: always renders at exactly the box width with no offset, any content shape', () => {
    const rect = getObjectFitContentRect(400, 200, 100, 300, 'fill');
    expect(rect.widthPercent).toBeCloseTo(100);
    expect(rect.leftPercent).toBeCloseTo(0);
  });

  it('none: renders at native size - offset goes negative once content exceeds the box', () => {
    const rect = getObjectFitContentRect(400, 200, 600, 200, 'none');
    expect(rect.widthPercent).toBeCloseTo(150); // 600/400, unscaled
    expect(rect.leftPercent).toBeCloseTo(-25); // (400-600)/2 / 400 * 100
  });

  it('scale-down: matches contain when the content is larger than the box', () => {
    const scaleDown = getObjectFitContentRect(400, 200, 800, 400, 'scale-down');
    const contain = getObjectFitContentRect(400, 200, 800, 400, 'contain');
    expect(scaleDown).toEqual(contain);
  });

  it('scale-down: never upscales - matches native size when content is already smaller', () => {
    // Both axes would upscale under `contain` (4x) - `scale-down` caps at 1x instead.
    const rect = getObjectFitContentRect(400, 200, 100, 50, 'scale-down');
    expect(rect.widthPercent).toBeCloseTo(25); // 100/400, unscaled
    expect(rect.leftPercent).toBeCloseTo(37.5);
  });
});

describe('hexToRGBA', () => {
  it('parses a 6-digit hex with the default alpha', () => {
    expect(hexToRGBA('#ff0080')).toEqual([255, 0, 128, 1]);
  });

  it('parses a 6-digit hex without the leading #', () => {
    expect(hexToRGBA('ff0080')).toEqual([255, 0, 128, 1]);
  });

  it('parses a 3-digit shorthand hex by doubling each digit', () => {
    expect(hexToRGBA('#f08')).toEqual([255, 0, 136, 1]);
  });

  it('applies a custom alpha', () => {
    expect(hexToRGBA('#000000', 0.5)).toEqual([0, 0, 0, 0.5]);
  });
});
