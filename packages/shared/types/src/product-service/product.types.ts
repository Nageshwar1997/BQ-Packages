import type { PRODUCT_STATUSES, PRODUCT_STATUSES_MAP } from '@beautinique/shared-constants';

export type TProductStatus = (typeof PRODUCT_STATUSES)[number];
export type TProductStatusMap = typeof PRODUCT_STATUSES_MAP;
