export const PRODUCT_STATUSES = ['DELETED', 'PENDING', 'PUBLISHED', 'REJECTED', 'BLOCKED'] as const;
export type TProductStatus = (typeof PRODUCT_STATUSES)[number];

export const PRODUCT_STATUSES_MAP = Object.fromEntries(
  PRODUCT_STATUSES.map((status) => [status, status] as const),
) as { readonly [K in TProductStatus]: K };

export const TRY_ON_MAP = {
  LIP: ['MATTE', 'GLOSS', 'SHIMMER', 'CRAYON'],
  EYE: ['EYEBROW', 'EYELINER', 'KAJAL', 'EYESHADOW'],
  HAIR: ['COLOR'],
  FACE: ['CONCEALER', 'FOUNDATION', 'HIGHLIGHTER', 'BLUSH'],
  NAIL: ['GEL', 'LIQUID'],
  SKIN: ['MOISTURIZER', 'SERUM', 'TONER', 'CLEANSER'],
} as const;

export type TTryOnMap = typeof TRY_ON_MAP;

export type TTryOnCategory = keyof TTryOnMap;

export type TTryOnSubCategory<TCategory extends TTryOnCategory = TTryOnCategory> =
  TTryOnMap[TCategory][number];

export type TTryOnSelection = {
  [K in TTryOnCategory]: { category: K; subCategory: TTryOnSubCategory<K> };
}[TTryOnCategory];

export const TRY_ON_CATEGORIES = Object.keys(TRY_ON_MAP) as TTryOnCategory[];

export const TRY_ON_CATEGORY_MAP = Object.fromEntries(
  TRY_ON_CATEGORIES.map((category) => [category, category] as const),
) as { readonly [K in TTryOnCategory]: K };
export type TTryOnCategoryMap = typeof TRY_ON_CATEGORY_MAP;

export const TRY_ON_ALL_SUB_CATEGORIES = Object.values(TRY_ON_MAP).flat();

export const DRAFT_PRODUCT_STEP_MAP = {
  0: 'basicInfo',
  1: 'mediaAndGallery',
  2: 'descriptionAndContent',
  3: 'stockAndVariants',
  4: 'tryOnConfiguration',
} as const;

export type TDraftProductStep = keyof typeof DRAFT_PRODUCT_STEP_MAP;

export type TDraftProductFormKeys = {
  [K in TDraftProductStep]: (typeof DRAFT_PRODUCT_STEP_MAP)[K];
}[TDraftProductStep];

export const CATEGORY_LEVELS = [1, 2, 3] as const;
export type TCategoryLevel = (typeof CATEGORY_LEVELS)[number];

export const CATEGORY_LEVELS_MAP = Object.fromEntries(
  CATEGORY_LEVELS.map((level) => [`L${String(level)}`, level] as const),
) as {
  readonly [K in `L${TCategoryLevel}`]: K extends `L${infer L extends TCategoryLevel}` ? L : never;
};
export type TCategoryLevelsMap = typeof CATEGORY_LEVELS_MAP;

export const VARIANT_TYPES = ['Color', 'Text'] as const;
export type TVariantType = (typeof VARIANT_TYPES)[number];

export const VARIANT_TYPES_MAP = Object.fromEntries(
  VARIANT_TYPES.map((type) => [type, type] as const),
) as { readonly [K in TVariantType]: K };
export type TVariantTypesMap = typeof VARIANT_TYPES_MAP;
