import type { TUserRole } from '../user-service/constants.types.js';
import type { TServiceName } from './common.types.js';

export interface TApiResponse {
  statusCode: number;
  message: string;
  data?: unknown;
  [key: string]: unknown;
}

export interface ICreateHeaders<TUser = unknown> {
  user?: TUser;
  token?: string;
  loginRole?: TUserRole;
  contentType?: string;
  serviceSecret?: TServiceName;
}
