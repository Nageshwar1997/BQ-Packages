import type {
  CONTACT_QUERY_STATUS,
  CONTACT_QUERY_STATUS_MAP,
  CONTACT_QUERY_TYPE_MAP,
  CONTACT_QUERY_TYPES,
} from '@beautinique/shared-constants';

import type { IPagination } from '../common/index.js';

export type TContactQueryType = (typeof CONTACT_QUERY_TYPES)[number];
export type TContactQueryTypeMap = typeof CONTACT_QUERY_TYPE_MAP;

export type TContactQueryStatus = (typeof CONTACT_QUERY_STATUS)[number];
export type TContactQueryStatusMap = typeof CONTACT_QUERY_STATUS_MAP;

export interface IListContactQueriesQuery extends IPagination {
  status?: TContactQueryStatus;
  queryType?: TContactQueryType;
}
