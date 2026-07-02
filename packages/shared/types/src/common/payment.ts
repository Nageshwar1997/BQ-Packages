import type { CURRENCIES, CURRENCIES_MAP } from '@beautinique/shared-constants';

export type TCurrency = (typeof CURRENCIES)[number];
export type TCurrencyMap = typeof CURRENCIES_MAP;
