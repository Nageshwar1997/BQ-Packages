import type {
  contactQueryTicketIdZodSchema,
  updateContactQueryStatusZodSchema,
} from '@beautinique/backend-zod';
import type { TInfer } from '@beautinique/shared-zod';

export type TUpdateContactQueryStatusZodSchema = TInfer<typeof updateContactQueryStatusZodSchema>;

export type TContactQueryTicketIdZodSchema = TInfer<typeof contactQueryTicketIdZodSchema>;
