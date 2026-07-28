import type {
  confirmPasswordZodSchema,
  emailZodSchema,
  imageUnionZodSchema,
  otpZodSchema,
  passwordZodSchema,
  phoneNumberZodSchema,
  thumbnailUnionZodSchema,
  TInfer,
  videoUnionZodSchema,
} from '@beautinique/shared-zod';

export type TEmailZodSchema = TInfer<typeof emailZodSchema>;

export type TPhoneNumberZodSchema = TInfer<typeof phoneNumberZodSchema>;

export type TPasswordZodSchema = TInfer<typeof passwordZodSchema>;

export type TConfirmPasswordZodSchema = TInfer<typeof confirmPasswordZodSchema>;

export type TOtpZodSchema = TInfer<typeof otpZodSchema>;

export type TThumbnailUnionZodSchema = TInfer<typeof thumbnailUnionZodSchema>;

export type TVideoUnionZodSchema = TInfer<typeof videoUnionZodSchema>;

export type TImageUnionZodSchema = TInfer<typeof imageUnionZodSchema>;
