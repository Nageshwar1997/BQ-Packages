export const TRY_ON_MAP = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as (keyof typeof TRY_ON_MAP)[];

export const TRY_ON_CATEGORY_MAP = Object.fromEntries(
  TRY_ON_CATEGORIES.map((category) => [category, category] as const),
) as { readonly [K in keyof typeof TRY_ON_MAP]: K };

export const TRY_ON_ALL_SUB_CATEGORIES = Object.values(TRY_ON_MAP).flat();

export const TRY_ON_SUB_CATEGORY_MAP = Object.fromEntries(
  TRY_ON_ALL_SUB_CATEGORIES.map((subCategory) => [subCategory, subCategory] as const),
) as { readonly [K in (typeof TRY_ON_ALL_SUB_CATEGORIES)[number]]: K };
