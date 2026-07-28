import type { TInfer, updateUserSchema } from '@beautinique/backend-zod';

export type TUpdateUserZodSchema = TInfer<typeof updateUserSchema>;
