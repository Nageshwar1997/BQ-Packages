/* ========== PARSE FUNCTION ========== */
export const parseData = (data: string): unknown => {
  if (!data) return '';

  try {
    return JSON.parse(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to parse JSON', { cause: error });
    }
  }
};

/* ========== STRINGIFY FUNCTION ========== */
export const stringifyData = (data: unknown): string => {
  if (!data) return '';
  try {
    return JSON.stringify(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Failed to stringify JSON', { cause: error });
    }
  }
};
