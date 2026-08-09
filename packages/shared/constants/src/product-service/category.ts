export const CATEGORY_LEVELS = [1, 2, 3] as const;

export const CATEGORY_LEVELS_MAP = Object.fromEntries(
  CATEGORY_LEVELS.map((level) => [`L${String(level)}`, level] as const),
) as {
  readonly [
    K in `L${(typeof CATEGORY_LEVELS)[number]}`
  ]: K extends `L${infer L extends (typeof CATEGORY_LEVELS)[number]}` ? L : never;
};
