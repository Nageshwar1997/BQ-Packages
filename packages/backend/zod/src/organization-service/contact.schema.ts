import { CONTACT_QUERY_STATUS, REGEX } from '@beautinique/shared-constants';
import { enum as enum_z, object, string } from 'zod';

export const updateContactQueryStatusZodSchema = object({
  status: enum_z(CONTACT_QUERY_STATUS, 'Invalid status'),
});

export const contactQueryTicketIdZodSchema = object({
  ticketId: string('Contact ticket id is required')
    .trim()
    .nonempty('Contact ticket id is required')
    .regex(REGEX.MONGODB_ID, 'Invalid contact ticket id'),
});
