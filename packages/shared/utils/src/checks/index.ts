/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;

/* ========== UNDEFINED CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

/* ========== NULL/UNDEFINED CHECK FUNCTION ========== */
export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};


/** Fails fast at startup with a clear message instead of a confusing downstream crash. */

/* ========== REQUIRED ENV CHECK FUNCTION ========== */
export const requireEnv = (value: string | undefined, name: string): string => {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
};

/* ========== REQUIRED PORT CHECK FUNCTION ========== */
export const requirePort = (value: string | undefined, name: string): number => {
  const port = Number(requireEnv(value, name));

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(
      `Environment variable ${name} must be a positive integer, got: ${String(value)}`,
    );
  }

  return port;
};