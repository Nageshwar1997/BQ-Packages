import {
  type AppError,
  AuthenticationError,
  AuthorizationError,
  BadGatewayError,
  BadRequestError,
  ConflictError,
  ErrorBuilder,
  GatewayTimeoutError,
  GoneError,
  InternalServerError,
  MethodNotAllowedError,
  NotFoundError,
  NotImplementedError,
  PayloadTooLargeError,
  PreconditionFailedError,
  RequestTimeoutError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnprocessableEntityError,
  UnsupportedMediaTypeError,
  ValidationError,
} from '../classes/index.js';
import type { TCreateErrorOptions } from '../types/index.js';

const ERROR_CLASS_MAP = {
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

/**
 * Creates the appropriate AppError instance from an ErrorBuilder
 * or an already built error payload.
 */
export function createError({ message, payload }: TCreateErrorOptions): AppError {
  const errorPayload = payload instanceof ErrorBuilder ? payload.build() : payload;

  const ErrorClass = ERROR_CLASS_MAP[errorPayload.code ?? 'INTERNAL_SERVER_ERROR'];

  return new ErrorClass(message, errorPayload);
}
