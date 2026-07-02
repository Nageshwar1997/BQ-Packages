import {
  type COUNTRIES,
  type COUNTRIES_MAP,
  type STATES_AND_UTS,
  type STATES_AND_UTS_MAP,
} from '@beautinique/shared-constants';

export type TStateOrUT = (typeof STATES_AND_UTS)[number];
export type TStateOrUTMap = typeof STATES_AND_UTS_MAP;
export type TCountry = (typeof COUNTRIES)[number];
export type TCountryMap = typeof COUNTRIES_MAP;
