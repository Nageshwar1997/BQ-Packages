/* -------------------------------------------------------------------------- */
/*                           CONFIRM DETAILS SCHEMA                           */
/* -------------------------------------------------------------------------- */

import { boolean, object } from '@beautinique/shared-zod';

export const confirmDetailsZodSchema = object({
  confirm: boolean().refine(Boolean, 'Please confirm details before saving.'),
});
