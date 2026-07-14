/* ========== PARSE FUNCTION ========== */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const parseData = <T = object>(data: string): T | null => {
  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to parse JSON', { cause: error });
  }
};

/* ========== STRINGIFY FUNCTION ========== */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
export const stringifyData = <T = object>(data: T): string => {
  if (!data) return '';
  try {
    return JSON.stringify(data);
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Failed to stringify JSON', { cause: error });
  }
};
