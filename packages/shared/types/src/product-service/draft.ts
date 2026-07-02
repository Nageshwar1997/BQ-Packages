import type { DRAFT_PRODUCT_STEP_MAP } from '@beautinique/shared-constants';

export type TDraftProductStep = keyof typeof DRAFT_PRODUCT_STEP_MAP;

export type TDraftProductFormKeys = {
  [K in TDraftProductStep]: (typeof DRAFT_PRODUCT_STEP_MAP)[K];
}[TDraftProductStep];
