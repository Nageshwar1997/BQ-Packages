export const CATEGORY_LEVELS = [1, 2, 3] as const;

export const CATEGORY_LEVELS_MAP = Object.fromEntries(
  CATEGORY_LEVELS.map((level) => [`L${level.toString()}`, level]),
) as { [K in (typeof CATEGORY_LEVELS)[number] as `L${K}`]: K };
