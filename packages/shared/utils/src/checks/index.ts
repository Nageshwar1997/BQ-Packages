/* ========== NULL CHECK FUNCTION ========== */
export const isNull = (value: unknown): value is null => value === null;

/* ========== UNDEFINED CHECK FUNCTION ========== */
export const isUndefined = (value: unknown): value is undefined => value === undefined;

/* ========== NULL/UNDEFINED CHECK FUNCTION ========== */
export const isNullOrUndefined = (value: unknown): value is null | undefined => {
  return isNull(value) || isUndefined(value);
};
