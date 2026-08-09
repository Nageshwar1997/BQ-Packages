import { baseUserZodSchema, imageUrlValidation } from '@beautinique/shared-zod';

export const updateUserZodSchema = baseUserZodSchema
  .extend({ avatar: imageUrlValidation })
  .partial();
