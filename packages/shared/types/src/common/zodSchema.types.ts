import type {
  confirmPasswordZodSchema,
  emailZodSchema,
  infer as Infer,
  otpZodSchema,
  passwordZodSchema,
  phoneNumberZodSchema,
} from '@beautinique/shared-zod';

export type TEmailZodSchema = Infer<typeof emailZodSchema>;

export type TPhoneNumberZodSchema = Infer<typeof phoneNumberZodSchema>;

export type TPasswordZodSchema = Infer<typeof passwordZodSchema>;

export type TConfirmPasswordZodSchema = Infer<typeof confirmPasswordZodSchema>;

export type TOtpZodSchema = Infer<typeof otpZodSchema>;
