import type { CATEGORY_LEVELS, CATEGORY_LEVELS_MAP } from './category.js';
import type { DRAFT_PRODUCT_STEP_MAP } from './draft.js';
import type { PRODUCT_STATUSES, PRODUCT_STATUSES_MAP } from './product.js';
import type { TRY_ON_CATEGORY_MAP, TRY_ON_MAP, TRY_ON_SUB_CATEGORY_MAP } from './tryon.js';
import type { VARIANT_TYPES, VARIANT_TYPES_MAP } from './variant.js';

// CATEGORY
export type TCategoryLevel = (typeof CATEGORY_LEVELS)[number];
export type TCategoryLevelsMap = typeof CATEGORY_LEVELS_MAP;

// DRAFT
export type TDraftProductStep = keyof typeof DRAFT_PRODUCT_STEP_MAP;

export type TDraftProductFormKeys = {
  [K in TDraftProductStep]: (typeof DRAFT_PRODUCT_STEP_MAP)[K];
}[TDraftProductStep];

// PRODUCT
export type TProductStatus = (typeof PRODUCT_STATUSES)[number];
export type TProductStatusMap = typeof PRODUCT_STATUSES_MAP;

// TRYON
export type TTryOnMap = typeof TRY_ON_MAP;

export type TTryOnCategory = keyof TTryOnMap;

export type TTryOnSubCategory<TCategory extends TTryOnCategory = TTryOnCategory> =
  TTryOnMap[TCategory][number];

export type TTryOnSelection = {
  [K in TTryOnCategory]: { category: K; subCategory: TTryOnSubCategory<K> };
}[TTryOnCategory];
export type TTryOnCategoryMap = typeof TRY_ON_CATEGORY_MAP;

export type TTryOnSubCategoryMap = typeof TRY_ON_SUB_CATEGORY_MAP;

// VARIANT
export type TVariantType = (typeof VARIANT_TYPES)[number];
export type TVariantTypesMap = typeof VARIANT_TYPES_MAP;
