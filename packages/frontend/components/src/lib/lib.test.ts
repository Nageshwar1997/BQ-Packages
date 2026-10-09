import { describe, expect, it } from 'vitest';

import { getButtonCss } from './button.js';
import {
  TOAST_TYPE,
  TOAST_TYPES,
  TOOLTIP_ANIMATION_DURATION,
  TOOLTIP_ARROW_INSET,
  TOOLTIP_GAP,
  TOOLTIP_VIEWPORT_MARGIN,
} from './constants.js';
import {
  getTooltipArrowCss,
  getTooltipLayout,
  getTooltipPosition,
  getTooltipTransform,
  isSameTooltipLayout,
} from './tooltip.js';

const plainRect = { top: 100, bottom: 140, left: 200, right: 300, width: 100, height: 40 };
const rect = plainRect as DOMRect;

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

  it('gives a pattern nobody knows (from code that is not type checked) the transparent look', () => {
    expect(getButtonCss('glass' as never)).toBe(getButtonCss('transparent'));
    expect(getButtonCss('constructor' as never)).toBe(getButtonCss('transparent')); // not from Object
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
  it('puts the arrow in the middle of its side, plus the shift the tooltip sets', () => {
    for (const placement of ['top', 'bottom', 'left', 'right'] as const) {
      expect(getTooltipArrowCss(placement)).toContain('50%_+_var(--tooltip-arrow-shift,0px)');
    }
  });

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

describe('getTooltipLayout', () => {
  const viewport = { width: 1000, height: 800 };
  const size = { width: 100, height: 40 };
  const at = (box: Partial<typeof plainRect>) => ({ ...plainRect, ...box }) as DOMRect;

  it('puts the tooltip where it was asked to when it is not on the page yet (no size)', () => {
    expect(getTooltipLayout({ rect, placement: 'top', viewport })).toEqual({
      placement: 'top',
      position: { top: 100, left: 250 },
      arrowShift: 0,
    });
  });

  it('puts it where it was asked to when it fits, on each side', () => {
    const box = at({ top: 300, bottom: 340, left: 400, right: 500 });

    for (const placement of ['top', 'bottom', 'left', 'right'] as const) {
      const layout = getTooltipLayout({ rect: box, placement, size, viewport });

      expect(layout.placement).toBe(placement);
      expect(layout.position).toEqual(getTooltipPosition(box, placement));
      expect(layout.arrowShift).toBe(0);
    }
  });

  describe('flips to the opposite side when the asked one has no room and the other has', () => {
    it.each([
      ['top', at({ top: 20, bottom: 60 }), 'bottom'],
      ['bottom', at({ top: 740, bottom: 780 }), 'top'],
      ['left', at({ left: 10, right: 60, width: 50 }), 'right'],
      ['right', at({ left: 940, right: 990, width: 50 }), 'left'],
    ] as const)('%s', (placement, box, expected) => {
      expect(getTooltipLayout({ rect: box, placement, size, viewport }).placement).toBe(expected);
    });
  });

  describe('counts the margin from the edge of the window as room it needs', () => {
    // one pixel short of the 8px margin on the asked side, with plenty of room on the other
    it.each([
      ['top', at({ top: 62, bottom: 102 }), 'bottom'], // 62 - 15 - 40 = 7
      ['bottom', at({ top: 698, bottom: 738 }), 'top'], // 738 + 15 + 40 = 793, the margin ends at 792
      ['left', at({ left: 122, right: 222 }), 'right'], // 122 - 15 - 100 = 7
      ['right', at({ left: 778, right: 878 }), 'left'], // 878 + 15 + 100 = 993, the margin ends at 992
    ] as const)('%s', (placement, box, expected) => {
      expect(getTooltipLayout({ rect: box, placement, size, viewport }).placement).toBe(expected);
    });
  });

  it('keeps the asked side when neither side has room', () => {
    const tall = { width: 100, height: 700 };
    const box = at({ top: 300, bottom: 340 });

    expect(getTooltipLayout({ rect: box, placement: 'top', size: tall, viewport }).placement).toBe(
      'top',
    );
  });

  it('keeps the asked side when it just fits', () => {
    // exactly the gap and the margin: 40 (tooltip) + 15 (gap) + 8 (margin) above the content
    const top = size.height + TOOLTIP_GAP + TOOLTIP_VIEWPORT_MARGIN;
    const layout = getTooltipLayout({
      rect: at({ top, bottom: top + 40 }),
      placement: 'top',
      size,
      viewport,
    });

    expect(layout.placement).toBe('top');
  });

  describe('is pushed in along its side to keep the margin from the edge of the window', () => {
    it('on the left', () => {
      // content centred on 10: the tooltip (100 wide) would start at -40, it starts at 8
      const layout = getTooltipLayout({
        rect: at({ left: 0, right: 20, width: 20 }),
        placement: 'top',
        size,
        viewport,
      });

      expect(layout.position.left).toBe(10 + 48);
      expect(layout.position.top).toBe(100);
    });

    it('on the right', () => {
      // content centred on 990: it would end at 1040, it ends at 992 (1000 - 8)
      const layout = getTooltipLayout({
        rect: at({ left: 980, right: 1000, width: 20 }),
        placement: 'bottom',
        size,
        viewport,
      });

      expect(layout.position.left).toBe(990 - 48);
    });

    it('along the height, for a tooltip on the left or the right', () => {
      // content centred on 5: the tooltip (40 high) would start at -15, it starts at 8
      const layout = getTooltipLayout({
        rect: at({ top: 0, bottom: 10, height: 10, left: 400, right: 500 }),
        placement: 'right',
        size,
        viewport,
      });

      expect(layout.position.top).toBe(5 + 23);
      expect(layout.position.left).toBe(500);
    });

    it('not at all when the tooltip is bigger than the window', () => {
      const layout = getTooltipLayout({
        rect: at({ left: 0, right: 20, width: 20 }),
        placement: 'top',
        size: { width: 2000, height: 40 },
        viewport,
      });

      expect(layout.position.left).toBe(10);
      expect(layout.arrowShift).toBe(0);
    });
  });

  describe('moves the arrow back so it keeps pointing at the content', () => {
    it('by as much as the tooltip was pushed', () => {
      // pushed 20 to the right (starts at 8 instead of -12): the arrow goes 20 back
      const layout = getTooltipLayout({
        rect: at({ left: 38, right: 38, width: 0 }),
        placement: 'top',
        size,
        viewport,
      });

      expect(layout.position.left).toBe(38 + 20);
      expect(layout.arrowShift).toBe(-20);
    });

    it('but never out of the tooltip: it stays the arrow inset from its ends', () => {
      const layout = getTooltipLayout({
        rect: at({ left: 0, right: 20, width: 20 }),
        placement: 'top',
        size,
        viewport,
      });

      // pushed 48, the arrow could go 48 back but the tooltip is 100 wide: 50 - the inset
      expect(layout.arrowShift).toBe(-(50 - TOOLTIP_ARROW_INSET));
    });
  });
});

describe('isSameTooltipLayout', () => {
  const layout = { placement: 'top', position: { top: 10, left: 20 }, arrowShift: 5 } as const;

  it('is true for a layout that puts the tooltip in the same place', () => {
    expect(isSameTooltipLayout(layout, { ...layout, position: { top: 10, left: 20 } })).toBe(true);
  });

  it.each([
    ['side', { ...layout, placement: 'bottom' }],
    ['top', { ...layout, position: { top: 11, left: 20 } }],
    ['left', { ...layout, position: { top: 10, left: 21 } }],
    ['arrow', { ...layout, arrowShift: 6 }],
  ] as const)('is false when the %s is not the same', (_name, other) => {
    expect(isSameTooltipLayout(layout, other)).toBe(false);
  });
});

describe('constants', () => {
  it('keeps the numbers the tooltip animation is built on', () => {
    expect(TOOLTIP_GAP).toBe(15);
    expect(TOOLTIP_ANIMATION_DURATION).toBe(400);
    expect(TOOLTIP_VIEWPORT_MARGIN).toBe(8);
    expect(TOOLTIP_ARROW_INSET).toBe(16);
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
