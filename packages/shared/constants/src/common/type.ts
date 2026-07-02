import type { COUNTRIES, COUNTRIES_MAP, STATES_AND_UTS, STATES_AND_UTS_MAP } from './address.js';
import type {
  API_METHODS,
  API_METHODS_MAP,
  SERVICE_NAMES,
  SERVICE_NAMES_MAP,
  SORT,
  SORT_MAP,
} from './common.js';
import type { CURRENCIES, CURRENCIES_MAP } from './payment.js';

// Address
export type TStateOrUT = (typeof STATES_AND_UTS)[number];
export type TStateOrUTMap = typeof STATES_AND_UTS_MAP;
export type TCountry = (typeof COUNTRIES)[number];
export type TCountryMap = typeof COUNTRIES_MAP;

// Common
export type TServiceName = (typeof SERVICE_NAMES)[number];
export type TServiceMap = typeof SERVICE_NAMES_MAP;
export type TApiMethod = (typeof API_METHODS)[number];
export type TApiMethodsMap = typeof API_METHODS_MAP;
export type TSort = (typeof SORT)[number];
export type TSortMap = typeof SORT_MAP;

// Payment
export type TCurrency = (typeof CURRENCIES)[number];
export type TCurrencyMap = typeof CURRENCIES_MAP;
