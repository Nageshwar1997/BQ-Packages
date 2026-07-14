import type { RefinementCtx } from 'zod';

export const appendCustomIssue = (
  ctx: RefinementCtx,
  message: string,
  fieldPath?: string | number | (string | number)[],
) => {
  const path = fieldPath !== undefined ? (Array.isArray(fieldPath) ? fieldPath : [fieldPath]) : [];

  ctx.addIssue({ path, code: 'custom', message });
};
