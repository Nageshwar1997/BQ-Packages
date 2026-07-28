import type {
  changePasswordZodSchema,
  loginZodSchema,
  passwordsZodSchema,
  registerZodSchema,
  setPasswordZodSchema,
  TInfer,
} from '@beautinique/shared-zod';

export type TLoginZodSchema = TInfer<typeof loginZodSchema>;

export type TPasswordsZodSchema = TInfer<typeof passwordsZodSchema>;

export type TRegisterZodSchema = TInfer<typeof registerZodSchema>;

export type TSetPasswordZodSchema = TInfer<typeof setPasswordZodSchema>;

export type TChangePasswordZodSchema = TInfer<typeof changePasswordZodSchema>;
