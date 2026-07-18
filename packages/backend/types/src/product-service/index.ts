import type {
  categoryUpdateZodSchema,
  categoryZodSchema,
  l1CategoryZodSchema,
  l2CategoryZodSchema,
  l3CategoryZodSchema,
  TInfer,
} from '@beautinique/backend-zod';

export type TL1CategoryZodSchema = TInfer<typeof l1CategoryZodSchema>;
export type TL2CategoryZodSchema = TInfer<typeof l2CategoryZodSchema>;
export type TL3CategoryZodSchema = TInfer<typeof l3CategoryZodSchema>;

export type TCategoryZodSchema = TInfer<typeof categoryZodSchema>;
export type TCategoryUpdateZodSchema = TInfer<typeof categoryUpdateZodSchema>;
