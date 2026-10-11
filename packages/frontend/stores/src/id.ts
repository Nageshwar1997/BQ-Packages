let idCounter = 0;

/**
 * A new id, unique in the page. `crypto.randomUUID` exists only on pages served over https (and
 * localhost), so there is a fallback for the others.
 */
export const createId = (prefix: string) =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${prefix}-${Date.now().toString(36)}-${(idCounter += 1).toString(36)}`;
