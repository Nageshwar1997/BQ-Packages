export const TOOLTIP_GAP = 15 as const;
export const TOOLTIP_ANIMATION_DURATION = 400 as const;

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
