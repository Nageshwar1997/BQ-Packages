import type {
  MEDIA_RESOURCE_MAP,
  MEDIA_RESOURCES,
  MEDIA_STATUS_MAP,
  MEDIA_STATUSES,
} from '@beautinique/shared-constants';

export type TMediaStatus = (typeof MEDIA_STATUSES)[number];
export type TMediaStatusMap = typeof MEDIA_STATUS_MAP;

export type TMediaResource = (typeof MEDIA_RESOURCES)[number];
export type TMediaResourceMap = typeof MEDIA_RESOURCE_MAP;
