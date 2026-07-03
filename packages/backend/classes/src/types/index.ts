import type { ErrorBuilder } from '../classes/index.js';
import type { ERROR_CODE_STATUS_MAP } from '../constants/index.js';

export type TFieldErrors = Record<string, string[]>;

export type TErrorCode = keyof typeof ERROR_CODE_STATUS_MAP;

export interface TErrorPayload {
  fieldErrors?: TFieldErrors;
  globalErrors?: string[];
  statusCode?: number;
  isOperational?: boolean;
  cause?: unknown;
}

export interface IAppError extends TErrorPayload {
  message: string;
  code: TErrorCode;
  statusCode?: number;
  isOperational?: boolean;
}

export interface IErrorBuilderResult extends TErrorPayload {
  code?: TErrorCode;
}

export interface TCreateErrorOptions {
  message: string;
  payload: ErrorBuilder | IErrorBuilderResult;
}
