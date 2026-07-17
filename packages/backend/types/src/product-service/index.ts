import type {
  categoryUpdateZodSchema,
  categoryZodSchema,
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
  TZodInfer,
} from '@beautinique/backend-zod';

export type TL1CategoryZodSchema = TZodInfer<typeof l1CategoryZodSchema>;
export type TL2CategoryZodSchema = TZodInfer<typeof l2CategoryZodSchema>;
export type TL3CategoryZodSchema = TZodInfer<typeof l3CategoryZodSchema>;

export type TCategoryZodSchema = TZodInfer<typeof categoryZodSchema>;
export type TCategoryUpdateZodSchema = TZodInfer<typeof categoryUpdateZodSchema>;
