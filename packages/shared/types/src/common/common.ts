import type {
  API_METHODS,
  API_METHODS_MAP,
  SERVICE_NAMES,
  SERVICE_NAMES_MAP,
  SORT,
  SORT_MAP,
} from '@beautinique/shared-constants';

export type TServiceName = (typeof SERVICE_NAMES)[number];
export type TServiceMap = typeof SERVICE_NAMES_MAP;
export type TApiMethod = (typeof API_METHODS)[number];
export type TApiMethodsMap = typeof API_METHODS_MAP;
export type TSort = (typeof SORT)[number];
export type TSortMap = typeof SORT_MAP;
