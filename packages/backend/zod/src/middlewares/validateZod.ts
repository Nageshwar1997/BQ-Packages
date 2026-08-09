import { createError, ErrorBuilder } from '@beautinique/backend-classes';
import type { ZodError, ZodType } from '@beautinique/shared-zod';
import type { Request, RequestHandler } from 'express';

/** Which part of the request a schema validates. */
export type TZodTarget = 'headers' | 'params' | 'query' | 'body' | 'file' | 'files';

/**
 * One Zod schema per request part to validate - every key is optional, so
 * a call only checks the parts it actually passes a schema for.
 *
 * `file`/`files` validate `req.file`/`req.files` (as populated by
 * `@beautinique/backend-multer`, or `multer` directly) - pass whatever
 * shape you expect, e.g. mirroring `TFile` from `@beautinique/backend-multer`.
 */
export type TZodSchemas = Partial<Record<TZodTarget, ZodType>>;

/** Reads the raw, unvalidated value for `target` off the request. */
function getTargetValue(req: Request, target: TZodTarget): unknown {
  switch (target) {
    case 'headers':
      return req.headers;
    case 'params':
      return req.params;
    case 'query':
      return req.query;
    case 'body':
      return req.body;
    case 'file':
    case 'files':
      return (req as unknown as Record<'file' | 'files', unknown>)[target];
  }
}

/**
 * Overwrites `req[target]` with Zod's parsed value, via `defineProperty`
 * rather than plain assignment - Express defines some request properties
 * (e.g. `query`) as getter-only accessors, which a direct `req.query = x`
 * assignment throws against in strict mode (every ESM file). `defineProperty`
 * works regardless, since Express's own request properties are always
 * declared `configurable: true`.
 */
function setTargetValue(req: Request, target: TZodTarget, value: unknown): void {
  Object.defineProperty(req, target, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  });
}

/** Adds one target's Zod issues to `errors`, prefixed with the target so e.g. `body.email` and `query.email` never collide. */
function collectZodErrors(errors: ErrorBuilder, target: TZodTarget, error: ZodError): void {
  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? `${target}.${issue.path.join('.')}` : target;

    errors.addField(field, issue.message, 'VALIDATION_ERROR');
  }
}

/**
 * Creates an Express middleware that validates one or more parts of a
 * request against Zod schemas - `headers`, `params`, `query`, `body`,
 * `file`, `files` - each independently optional, so a route only passes
 * the schemas it actually needs.
 *
 * Every schema provided is checked before failing - a request with both
 * a bad `query` and a bad `body` reports both at once - then, on failure,
 * `next(error)` is called once with a single `ValidationError` (422),
 * built via `@beautinique/backend-classes`'s `ErrorBuilder`: one field
 * entry per failed Zod issue, prefixed with its target (e.g. `body.email`,
 * `query.page`).
 *
 * On success, `req[target]` is overwritten with Zod's *parsed* value for
 * every target that was validated - so coercions/transforms/defaults
 * defined on the schema (e.g. `z.coerce.number()` for a query param) are
 * what the route handler actually sees, not the raw input.
 *
 * @param schemas - One Zod schema per request part to validate.
 * @returns An Express request handler.
 */
export const validateZod = (schemas: TZodSchemas): RequestHandler => {
  const targets = Object.keys(schemas) as TZodTarget[];

  return (req, _res, next) => {
    const errors = new ErrorBuilder();
    const parsed: Partial<Record<TZodTarget, unknown>> = {};

    for (const target of targets) {
      const schema = schemas[target];

      if (!schema) {
        continue;
      }

      const result = schema.safeParse(getTargetValue(req, target));

      if (!result.success) {
        collectZodErrors(errors, target, result.error);
        continue;
      }

      parsed[target] = result.data;
    }

    if (!errors.isEmpty()) {
      next(createError({ message: 'Request validation failed.', payload: errors }));
      return;
    }

    for (const target of targets) {
      if (target in parsed) {
        setTargetValue(req, target, parsed[target]);
      }
    }

    next();
  };
};
