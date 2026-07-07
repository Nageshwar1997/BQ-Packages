import type { TCustomSuccessMessage } from '../types/index.js';

export const customSuccessMessage: TCustomSuccessMessage = (_request, response) => {
  return `Request completed with status ${String(response.statusCode)}`;
};
