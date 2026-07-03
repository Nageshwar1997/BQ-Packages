import type { ERROR_CODE_STATUS_MAP } from '../constants/index.js';

export type TFieldErrors = Record<string, string[]>;

export type ErrorCode = keyof typeof ERROR_CODE_STATUS_MAP;

export interface TErrorPayload {
  fieldErrors?: TFieldErrors;
  globalErrors?: string[];
  statusCode?: number;
  isOperational?: boolean;
  cause?: unknown;
}

export interface IAppError extends TErrorPayload {
  message: string;
  code: ErrorCode;
  statusCode?: number;
  isOperational?: boolean;
}
