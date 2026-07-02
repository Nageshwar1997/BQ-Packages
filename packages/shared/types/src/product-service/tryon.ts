import type {
  TRY_ON_CATEGORY_MAP,
  TRY_ON_MAP,
  TRY_ON_SUB_CATEGORY_MAP,
} from '@beautinique/shared-constants';

export type TTryOnMap = typeof TRY_ON_MAP;
export type TTryOnCategory = keyof TTryOnMap;

export type TTryOnSubCategory<TCategory extends TTryOnCategory = TTryOnCategory> =
  TTryOnMap[TCategory][number];

export type TTryOnCategoryMap = typeof TRY_ON_CATEGORY_MAP;
export type TTryOnSubCategoryMap = typeof TRY_ON_SUB_CATEGORY_MAP;

export type TTryOnSelection = {
  [K in TTryOnCategory]: { category: K; subCategory: TTryOnSubCategory<K> };
}[TTryOnCategory];
