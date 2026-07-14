import type {
  changePasswordZodSchema,
  infer as Infer,
  loginZodSchema,
  passwordsZodSchema,
  registerZodSchema,
  setPasswordZodSchema,
  updateUserSchema,
} from '@beautinique/shared-zod';

export type TLoginZodSchema = Infer<typeof loginZodSchema>;

export type TPasswordsZodSchema = Infer<typeof passwordsZodSchema>;

export type TRegisterZodSchema = Infer<typeof registerZodSchema>;

export type TSetPasswordZodSchema = Infer<typeof setPasswordZodSchema>;

export type TChangePasswordZodSchema = Infer<typeof changePasswordZodSchema>;

export type TUpdateUserZodSchema = Infer<typeof updateUserSchema>;
