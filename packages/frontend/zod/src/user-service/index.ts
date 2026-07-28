import { baseUserZodSchema, imageUnionZodSchema } from '@beautinique/shared-zod';

export const updateUserZodSchema = baseUserZodSchema
  .extend({ avatar: imageUnionZodSchema })
  .partial();
