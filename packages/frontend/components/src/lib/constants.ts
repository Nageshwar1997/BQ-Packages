export const TOOLTIP_GAP = 15 as const;
export const TOOLTIP_ANIMATION_DURATION = 400 as const;
/** The least space a tooltip keeps between itself and the edge of the window. */
export const TOOLTIP_VIEWPORT_MARGIN = 8 as const;
/** The arrow stays at least this far from the ends of the tooltip (its own size and the rounded corner). */
export const TOOLTIP_ARROW_INSET = 16 as const;

export const TOAST_TYPES = [
  'success',
  'error',
  'warning',
  'progress',
  'uploads',
  'loading',
  'default',
  'custom',
] as const;

export const TOAST_TYPE = Object.fromEntries(TOAST_TYPES.map((type) => [type, type])) as {
  [K in (typeof TOAST_TYPES)[number]]: K;
};
