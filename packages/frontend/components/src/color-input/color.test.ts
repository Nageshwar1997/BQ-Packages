import { describe, expect, it } from 'vitest';

import { FALLBACK_COLOR, isHexColor, isSameHex, toColor } from './color.js';

describe('isHexColor', () => {
  it.each(['#fff', '#FFF', '#ffff', '#ff00aa', '#FF00AA', '#ff00aa80', '#0a0'])(
    'is true for %s',
    (value) => {
      expect(isHexColor(value)).toBe(true);
    },
  );

  it.each([
    '',
    'fff',
    'ff00aa',
    '#ff',
    '#fffff',
    '#fffffff',
    '#ff00aa8',
    '#ff00aa801',
    '#ggg',
    'red',
    'rgb(1,2,3)',
    '# fff',
    ' #fff',
    '#fff ',
  ])('is false for "%s"', (value) => {
    expect(isHexColor(value)).toBe(false);
  });

  it('is false for nothing', () => {
    expect(isHexColor(undefined)).toBe(false);
  });
});

describe('toColor', () => {
  it('gives the colour of a hexadecimal text, in the other forms too', () => {
    const color = toColor('#ff8000');

    expect(color.hex).toBe('#ff8000');
    expect(color.rgb).toMatchObject({ r: 255, g: 128, b: 0 });
    expect(color.hsv.s).toBe(100);
    expect(color.hsv.v).toBe(100);
  });

  it('understands the short form', () => {
    expect(toColor('#f00').rgb).toMatchObject({ r: 255, g: 0, b: 0 });
  });

  it('is black for nothing', () => {
    expect(toColor(undefined).hex).toBe(FALLBACK_COLOR);
    expect(toColor(undefined).rgb).toMatchObject({ r: 0, g: 0, b: 0 });
  });

  it('is black for a text that is not a colour', () => {
    expect(toColor('not a colour').hex).toBe(FALLBACK_COLOR);
    expect(toColor('#12').hex).toBe(FALLBACK_COLOR);
    expect(toColor('').hex).toBe(FALLBACK_COLOR);
  });

  it('keeps the transparency of an eight digit colour', () => {
    expect(toColor('#ff000080').rgb.a).toBeCloseTo(0.5, 1);
  });
});

describe('isSameHex', () => {
  it('is true for the same text, whatever the case', () => {
    expect(isSameHex('#ABCDEF', '#abcdef')).toBe(true);
    expect(isSameHex('#abc', '#abc')).toBe(true);
  });

  it('is false for another colour, and for the short form of the same one', () => {
    expect(isSameHex('#abcdef', '#abcdee')).toBe(false);
    expect(isSameHex('#aabbcc', '#abc')).toBe(false);
  });

  it('is true for two of nothing, and false for nothing and a colour', () => {
    expect(isSameHex(undefined, undefined)).toBe(true);
    expect(isSameHex(undefined, '#fff')).toBe(false);
    expect(isSameHex('#fff', undefined)).toBe(false);
  });
});
