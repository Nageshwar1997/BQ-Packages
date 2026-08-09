import { CONTACT_QUERY_TYPES } from '@beautinique/shared-constants';
import { enum as enum_z, object, string } from 'zod';

import { emailValidation, nameValidation, phoneNumberValidation } from '../constants/index.js';

export const createContactQueryZodSchema = object({
  name: nameValidation,
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  queryType: enum_z(CONTACT_QUERY_TYPES, 'Invalid query type'),
  message: string('Message is required')
    .trim()
    .nonempty('Message is required')
    .min(10, 'Message must be at least 10 characters long')
    .max(1000, 'Message must be at most 1000 characters long'),
});
