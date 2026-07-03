import type { TErrorCode } from '../types/index.js';

export const ERROR_CODE_STATUS_MAP = {
  // 4xx
  BAD_REQUEST: 400,
  VALIDATION_ERROR: 422,
  AUTHENTICATION_ERROR: 401,
  AUTHORIZATION_ERROR: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // 5xx
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export const ERROR_PRIORITY: Readonly<Record<TErrorCode, number>> = {
  // ========================================
  // 5xx - Server Errors (Highest Priority)
  // ========================================
  INTERNAL_SERVER_ERROR: 7,
  SERVICE_UNAVAILABLE: 7,
  BAD_GATEWAY: 7,
  GATEWAY_TIMEOUT: 7,
  NOT_IMPLEMENTED: 7,

  // ========================================
  // Authentication & Authorization
  // ========================================
  AUTHENTICATION_ERROR: 6,
  AUTHORIZATION_ERROR: 6,

  // ========================================
  // Resource State
  // ========================================
  NOT_FOUND: 5,
  CONFLICT: 5,
  GONE: 5,

  // ========================================
  // Request Constraints
  // ========================================
  PAYLOAD_TOO_LARGE: 4,
  UNSUPPORTED_MEDIA_TYPE: 4,
  TOO_MANY_REQUESTS: 4,
  REQUEST_TIMEOUT: 4,
  METHOD_NOT_ALLOWED: 4,
  PRECONDITION_FAILED: 4,

  // ========================================
  // Validation
  // ========================================
  VALIDATION_ERROR: 3,
  UNPROCESSABLE_ENTITY: 3,

  // ========================================
  // Generic Client Error (Lowest)
  // ========================================
  BAD_REQUEST: 2,
} as const;
