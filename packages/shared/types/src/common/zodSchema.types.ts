import type {
  confirmPasswordZodSchema,
  emailZodSchema,
  imageUnionZodSchema,
  infer as Infer,
  otpZodSchema,
  passwordZodSchema,
  phoneNumberZodSchema,
  thumbnailUnionZodSchema,
  videoUnionZodSchema,
} from '@beautinique/shared-zod';

export type TEmailZodSchema = Infer<typeof emailZodSchema>;

export type TPhoneNumberZodSchema = Infer<typeof phoneNumberZodSchema>;

export type TPasswordZodSchema = Infer<typeof passwordZodSchema>;

export type TConfirmPasswordZodSchema = Infer<typeof confirmPasswordZodSchema>;

export type TOtpZodSchema = Infer<typeof otpZodSchema>;

export type TThumbnailUnionZodSchema = Infer<typeof thumbnailUnionZodSchema>;

export type TVideoUnionZodSchema = Infer<typeof videoUnionZodSchema>;

export type TImageUnionZodSchema = Infer<typeof imageUnionZodSchema>;
