import { ERROR_CLASS_MAP, ERROR_PRIORITY } from '../constants/index.js';
import type { TErrorCode, TErrorPayload } from '../types/index.js';
import type { AppError } from './AppError.js';

export interface IErrorBuilderResult extends TErrorPayload {
  code?: TErrorCode;
}

export class ErrorBuilder {
  private fieldErrors: NonNullable<TErrorPayload['fieldErrors']> = {};
  private globalErrors: NonNullable<TErrorPayload['globalErrors']> = [];

  private code?: TErrorCode;

  /**
   * Sets the highest priority error code.
   */
  public setCode(code: TErrorCode): this {
    if (!this.code || ERROR_PRIORITY[code] > ERROR_PRIORITY[this.code]) {
      this.code = code;
    }

    return this;
  }

  /**
   * Returns the current highest priority error code.
   */
  public getCode(): TErrorCode | undefined {
    return this.code;
  }

  /**
   * Adds a field error.
   */
  public addField(field: string, message: string, code?: TErrorCode): this {
    const errors = (this.fieldErrors[field] ??= []);

    if (!errors.includes(message)) {
      errors.push(message);
    }

    if (code) {
      this.setCode(code);
    }

    return this;
  }

  /**
   * Adds multiple field errors.
   */
  public addFields(field: string, messages: readonly string[], code?: TErrorCode): this {
    for (const message of messages) {
      this.addField(field, message);
    }

    if (code) {
      this.setCode(code);
    }

    return this;
  }

  /**
   * Adds a global error.
   */
  public addGlobal(message: string, code?: TErrorCode): this {
    if (!this.globalErrors.includes(message)) {
      this.globalErrors.push(message);
    }

    if (code) {
      this.setCode(code);
    }

    return this;
  }

  /**
   * Adds multiple global errors.
   */
  public addGlobals(messages: readonly string[], code?: TErrorCode): this {
    for (const message of messages) {
      this.addGlobal(message);
    }

    if (code) {
      this.setCode(code);
    }

    return this;
  }

  /**
   * Merges another ErrorBuilder or built error payload.
   */
  public merge(errors?: ErrorBuilder | IErrorBuilderResult): this {
    if (!errors) {
      return this;
    }

    const payload = errors instanceof ErrorBuilder ? errors.build() : errors;

    if (payload.fieldErrors) {
      for (const [field, messages] of Object.entries(payload.fieldErrors)) {
        this.addFields(field, messages, payload.code);
      }
    }

    if (payload.globalErrors) {
      this.addGlobals(payload.globalErrors, payload.code);
    }

    if (payload.code) {
      this.setCode(payload.code);
    }

    return this;
  }

  /**
   * Returns true if at least one error exists.
   */
  public hasErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0 || this.globalErrors.length > 0;
  }

  /**
   * Returns true if no errors exist.
   */
  public isEmpty(): boolean {
    return !this.hasErrors();
  }

  /**
   * Clears all collected errors.
   */
  public clear(): this {
    this.fieldErrors = {};
    this.globalErrors = [];
    this.code = undefined;

    return this;
  }

  /**
   * Alias of clear().
   */
  public reset(): this {
    return this.clear();
  }

  /**
   * Builds an immutable error payload.
   */
  public build(): Readonly<IErrorBuilderResult> {
    return Object.freeze({
      code: this.code,
      fieldErrors:
        Object.keys(this.fieldErrors).length > 0 ? structuredClone(this.fieldErrors) : undefined,
      globalErrors: this.globalErrors.length > 0 ? [...this.globalErrors] : undefined,
    });
  }

  /**
   * Creates the appropriate AppError instance based on the
   * highest priority collected error code.
   */
  public toError(message: string): AppError {
    const payload = this.build();

    const ErrorClass = ERROR_CLASS_MAP[payload.code ?? 'INTERNAL_SERVER_ERROR'];

    return new ErrorClass(message, payload);
  }

  /**
   * Allows JSON.stringify(builder).
   */
  public toJSON(): Readonly<IErrorBuilderResult> {
    return this.build();
  }
}
