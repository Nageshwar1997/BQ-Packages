import { ERROR_CODE_STATUS_MAP } from '../constants/index.js';
import type { ErrorCode, IAppError, TFieldErrors } from '../types/index.js';

export abstract class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly isOperational: boolean;
  public readonly fieldErrors?: TFieldErrors;
  public readonly globalErrors: string[];

  constructor({
    message,
    code,
    statusCode,
    isOperational = true,
    fieldErrors,
    globalErrors,
  }: IAppError) {
    super(message);

    this.name = new.target.name;

    this.statusCode = statusCode ?? ERROR_CODE_STATUS_MAP[code];
    this.code = code;
    this.isOperational = isOperational;
    this.fieldErrors = fieldErrors;
    this.globalErrors = globalErrors ?? [message];

    Object.setPrototypeOf(this, new.target.prototype);

    Error.captureStackTrace(this, new.target);
  }
}
