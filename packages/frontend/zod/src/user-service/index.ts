import { baseUserZodSchema, imageUnionZodSchema } from '@beautinique/shared-zod';

export const updateUserSchema = baseUserZodSchema.extend({ avatar: imageUnionZodSchema }).partial();
