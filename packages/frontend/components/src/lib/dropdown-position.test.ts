import { describe, expect, it } from 'vitest';

import { DROPDOWN_GAP, getDropdownPlacement, getDropdownStyle } from './dropdown-position.js';

const VIEWPORT = 800;
// a field of 40px at `top`
const field = (top: number) => ({ top, bottom: top + 40 });

describe('getDropdownPlacement', () => {
  it('opens where it was asked to when there is room there', () => {
    expect(
      getDropdownPlacement({
        rect: field(100),
        viewportHeight: VIEWPORT,
        desired: 'bottom',
        needed: 250,
      }),
    ).toBe('bottom');
    expect(
      getDropdownPlacement({
        rect: field(500),
        viewportHeight: VIEWPORT,
        desired: 'top',
        needed: 250,
      }),
    ).toBe('top');
  });

  it('opens on the other side when there is no room on the one asked for, and more on the other', () => {
    expect(
      getDropdownPlacement({
        rect: field(600),
        viewportHeight: VIEWPORT,
        desired: 'bottom',
        needed: 250,
      }),
    ).toBe('top');
    expect(
      getDropdownPlacement({
        rect: field(50),
        viewportHeight: VIEWPORT,
        desired: 'top',
        needed: 250,
      }),
    ).toBe('bottom');
  });

  it('stays where it was asked when the other side has no more room', () => {
    // 800px high window, field at 260 to 300: 492 below and 252 above... both fit 250: bottom stays
    expect(
      getDropdownPlacement({
        rect: field(260),
        viewportHeight: VIEWPORT,
        desired: 'bottom',
        needed: 250,
      }),
    ).toBe('bottom');
    // a window too small for the list on either side: it stays where it was asked
    expect(
      getDropdownPlacement({
        rect: field(150),
        viewportHeight: 340,
        desired: 'bottom',
        needed: 250,
      }),
    ).toBe('bottom');
  });

  it('counts the gap between the field and the list', () => {
    // exactly `needed` of room once the gap is taken away: it fits
    const rect = field(100);
    const viewportHeight = rect.bottom + DROPDOWN_GAP + 250;

    expect(getDropdownPlacement({ rect, viewportHeight, desired: 'bottom', needed: 250 })).toBe(
      'bottom',
    );
    expect(
      getDropdownPlacement({
        rect: field(520),
        viewportHeight: 520 + 40 + DROPDOWN_GAP + 249,
        desired: 'bottom',
        needed: 250,
      }),
    ).toBe('top');
  });
});

describe('getDropdownStyle', () => {
  const rect = { top: 100, bottom: 140, left: 30, width: 200 };

  it('puts a list under the field, as wide as it', () => {
    expect(getDropdownStyle(rect, 'bottom', VIEWPORT)).toEqual({
      left: 30,
      width: 200,
      top: 140 + DROPDOWN_GAP,
    });
  });

  it('puts a list over the field by its bottom edge, so it grows upwards', () => {
    expect(getDropdownStyle(rect, 'top', VIEWPORT)).toEqual({
      left: 30,
      width: 200,
      bottom: VIEWPORT - 100 + DROPDOWN_GAP,
    });
  });
});
