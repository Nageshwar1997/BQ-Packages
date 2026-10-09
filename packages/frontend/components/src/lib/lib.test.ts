import { describe, expect, it } from 'vitest';

import { getButtonCss } from './button.js';
import { TOAST_TYPE, TOAST_TYPES, TOOLTIP_ANIMATION_DURATION, TOOLTIP_GAP } from './constants.js';
import { getTooltipArrowCss, getTooltipPosition, getTooltipTransform } from './tooltip.js';

const rect = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 } as DOMRect;

describe('getButtonCss', () => {
  it('has its own look for each pattern', () => {
    const looks = (['primary', 'secondary', 'tertiary', 'outline', 'transparent'] as const).map(
      getButtonCss,
    );

    expect(new Set(looks).size).toBe(5);
    expect(looks[0]).toContain('bg-sky-blue-burst');
    expect(looks[1]).toContain('bg-secondary');
    expect(looks[2]).toContain('bg-tertiary');
    expect(looks[3]).toContain('border-primary');
    expect(looks[4]).toContain('bg-transparent');
  });

  it('gives the transparent button no shadow, and does not turn it around', () => {
    const css = getButtonCss('transparent');

    expect(css).toBe('bg-transparent border border-primary/30 text-secondary');
    expect(css).not.toContain('shadow');
    expect(css).not.toContain('rotate'); // turning the button around would turn its content too
  });

  it('gives every look but the transparent one a shadow and a hover shadow', () => {
    for (const pattern of ['primary', 'secondary', 'tertiary', 'outline'] as const) {
      const css = getButtonCss(pattern);

      expect(css).toMatch(/(^| )shadow-\w+-btn( |$)/);
      expect(css).toMatch(/hover:shadow-\w+-btn-hover/);
    }
  });
});

describe('getTooltipPosition', () => {
  it('puts the anchor in the middle of the side the tooltip opens on', () => {
    expect(getTooltipPosition(rect, 'top')).toEqual({ top: 100, left: 250 });
    expect(getTooltipPosition(rect, 'bottom')).toEqual({ top: 140, left: 250 });
    expect(getTooltipPosition(rect, 'left')).toEqual({ top: 120, left: 200 });
    expect(getTooltipPosition(rect, 'right')).toEqual({ top: 120, left: 300 });
  });
});

describe('getTooltipTransform', () => {
  it('moves the tooltip away from its anchor by the gap once it is visible', () => {
    const gap = String(TOOLTIP_GAP);

    expect(getTooltipTransform('top', true)).toBe(`translate(-50%, calc(-100% - ${gap}px))`);
    expect(getTooltipTransform('bottom', true)).toBe(`translate(-50%, ${gap}px)`);
    expect(getTooltipTransform('left', true)).toBe(`translate(calc(-100% - ${gap}px), -50%)`);
    expect(getTooltipTransform('right', true)).toBe(`translate(${gap}px, -50%)`);
  });

  it('starts at the anchor itself, so it slides out when it appears', () => {
    expect(getTooltipTransform('top', false)).toBe('translate(-50%, calc(-100% - 0px))');
    expect(getTooltipTransform('bottom', false)).toBe('translate(-50%, 0px)');
    expect(getTooltipTransform('left', false)).toBe('translate(calc(-100% - 0px), -50%)');
    expect(getTooltipTransform('right', false)).toBe('translate(0px, -50%)');
  });
});

describe('getTooltipArrowCss', () => {
  it('draws the arrow on the side that faces the anchor', () => {
    expect(getTooltipArrowCss('top')).toContain('after:top-full');
    expect(getTooltipArrowCss('top')).toContain('after:border-t-silver-jet-2');
    expect(getTooltipArrowCss('bottom')).toContain('after:bottom-full');
    expect(getTooltipArrowCss('bottom')).toContain('after:border-b-silver-jet-2');
    expect(getTooltipArrowCss('left')).toContain('after:left-full');
    expect(getTooltipArrowCss('left')).toContain('after:border-l-silver-jet-2');
    expect(getTooltipArrowCss('right')).toContain('after:right-full');
    expect(getTooltipArrowCss('right')).toContain('after:border-r-silver-jet-2');
  });
});

describe('constants', () => {
  it('keeps the numbers the tooltip animation is built on', () => {
    expect(TOOLTIP_GAP).toBe(15);
    expect(TOOLTIP_ANIMATION_DURATION).toBe(400);
  });

  it('has a toast type for every name in the list', () => {
    expect(Object.keys(TOAST_TYPE)).toEqual([...TOAST_TYPES]);
    expect(TOAST_TYPE.uploads).toBe('uploads');
    expect(TOAST_TYPES).toEqual([
      'success',
      'error',
      'warning',
      'progress',
      'uploads',
      'loading',
      'default',
      'custom',
    ]);
  });
});
