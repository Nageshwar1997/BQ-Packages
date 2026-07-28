import type { TInfer, updateUserSchema } from '@beautinique/frontend-zod';

export type TUpdateUserZodSchema = TInfer<typeof updateUserSchema>;
