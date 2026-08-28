export const TRY_ON_MAP = {
  LIP: [
    'MATTE',
    'SATIN',
    'GLOSS',
    'SHIMMER',
    'STAIN',
    'BALM',
    'LINER',
    'CRAYON',
    'OIL',
    'METALLIC',
    'PLUMPER',
  ],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW', 'MASCARA', 'LASHES', 'BROWGEL'],
  HAIR: ['COLOR', 'HIGHLIGHTS', 'HENNA', 'OMBRE'],
  FACE: [
    'CONCEALER',
    'FOUNDATION',
    'HIGHLIGHTER',
    'BLUSH',
    'CONTOUR',
    'BRONZER',
    'BBCREAM',
    'COMPACTPOWDER',
  ],
  NAIL: ['GEL', 'LIQUID', 'DIPPOWDER', 'GLITTER', 'CHROME'],
  SKIN: [
    'MOISTURIZER',
    'SERUM',
    'TONER',
    'CLEANSER',
    'SUNSCREEN',
    'MASK',
    'EYECREAM',
    'EXFOLIATOR',
  ],
} as const;

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as (keyof typeof TRY_ON_MAP)[];

export const TRY_ON_CATEGORY_MAP = Object.fromEntries(
  TRY_ON_CATEGORIES.map((category) => [category, category] as const),
) as { readonly [K in keyof typeof TRY_ON_MAP]: K };

export const TRY_ON_ALL_SUB_CATEGORIES = Object.values(TRY_ON_MAP).flat();

export const TRY_ON_SUB_CATEGORY_MAP = Object.fromEntries(
  TRY_ON_ALL_SUB_CATEGORIES.map((subCategory) => [subCategory, subCategory] as const),
) as { readonly [K in (typeof TRY_ON_ALL_SUB_CATEGORIES)[number]]: K };
