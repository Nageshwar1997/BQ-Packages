import { baseUserZodSchema, imageUrlValidation } from '@beautinique/shared-zod';

export const updateUserSchema = baseUserZodSchema.extend({ avatar: imageUrlValidation }).partial();
