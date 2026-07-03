import { AuthenticationError } from '../classes/AuthenticationError.js';
import { AuthorizationError } from '../classes/AuthorizationError.js';
import { BadGatewayError } from '../classes/BadGatewayError.js';
import { BadRequestError } from '../classes/BadRequestError.js';
import { ConflictError } from '../classes/ConflictError.js';
import { GatewayTimeoutError } from '../classes/GatewayTimeoutError.js';
import { GoneError } from '../classes/GoneError.js';
import { InternalServerError } from '../classes/InternalServerError.js';
import { MethodNotAllowedError } from '../classes/MethodNotAllowedError.js';
import { NotFoundError } from '../classes/NotFoundError.js';
import { NotImplementedError } from '../classes/NotImplementedError.js';
import { PayloadTooLargeError } from '../classes/PayloadTooLargeError.js';
import { PreconditionFailedError } from '../classes/PreconditionFailedError.js';
import { RequestTimeoutError } from '../classes/RequestTimeoutError.js';
import { ServiceUnavailableError } from '../classes/ServiceUnavailableError.js';
import { TooManyRequestsError } from '../classes/TooManyRequestsError.js';
import { UnprocessableEntityError } from '../classes/UnprocessableEntityError.js';
import { UnsupportedMediaTypeError } from '../classes/UnsupportedMediaTypeError.js';
import { ValidationError } from '../classes/ValidationError.js';
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

export const ERROR_CLASS_MAP = {
  // ========================================
  // 5xx - Server Errors
  // Unexpected failures within the application
  // or infrastructure dependencies.
  // ========================================
  INTERNAL_SERVER_ERROR: InternalServerError,
  SERVICE_UNAVAILABLE: ServiceUnavailableError,
  BAD_GATEWAY: BadGatewayError,
  GATEWAY_TIMEOUT: GatewayTimeoutError,
  NOT_IMPLEMENTED: NotImplementedError,

  // ========================================
  // 401–403 - Authentication & Authorization
  // Identity verification and access control.
  // ========================================
  AUTHENTICATION_ERROR: AuthenticationError,
  AUTHORIZATION_ERROR: AuthorizationError,

  // ========================================
  // 404–410 - Resource State
  // Requested resource is missing or its current
  // state prevents the requested operation.
  // ========================================
  NOT_FOUND: NotFoundError,
  CONFLICT: ConflictError,
  GONE: GoneError,

  // ========================================
  // 405–429 - Request Constraints
  // Request violates protocol, limits, or
  // content restrictions.
  // ========================================
  PAYLOAD_TOO_LARGE: PayloadTooLargeError,
  UNSUPPORTED_MEDIA_TYPE: UnsupportedMediaTypeError,
  TOO_MANY_REQUESTS: TooManyRequestsError,
  REQUEST_TIMEOUT: RequestTimeoutError,
  METHOD_NOT_ALLOWED: MethodNotAllowedError,
  PRECONDITION_FAILED: PreconditionFailedError,

  // ========================================
  // 422 - Validation
  // Request syntax is valid but validation or
  // business rules failed.
  // ========================================
  VALIDATION_ERROR: ValidationError,
  UNPROCESSABLE_ENTITY: UnprocessableEntityError,

  // ========================================
  // 400 - Generic Client Error
  // Fallback for invalid client requests.
  // ========================================
  BAD_REQUEST: BadRequestError,
} as const;
