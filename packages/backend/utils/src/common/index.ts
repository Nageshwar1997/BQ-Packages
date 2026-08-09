import { UnprocessableEntityError } from '@beautinique/backend-classes';
import type { TFieldErrors, TGlobalErrors } from '@beautinique/shared-types';

export const sanitizeToken = (token?: string) => {
  if (!token) {
    throw new UnprocessableEntityError('Token not found');
  }

  return token.startsWith('Bearer ') ? token.split(' ')[1] : token;
};

export const segregateErrors = (errors: { field: string; message: string }[]) => {
  const fieldErrors: TFieldErrors = {};
  const globalErrors: TGlobalErrors = [];

  errors.forEach(({ field, message }) => {
    if (!field) {
      globalErrors.push(message);
      return;
    }

    fieldErrors[field].push(message);
  });

  return { fieldErrors, globalErrors };
};
