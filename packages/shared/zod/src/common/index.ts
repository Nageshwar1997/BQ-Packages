import { object, union } from 'zod';

import {
  confirmPasswordValidation,
  emailValidation,
  imageFileValidation,
  imageUrlValidation,
  otpValidation,
  passwordValidation,
  phoneNumberValidation,
  thumbnailFileValidation,
  thumbnailUrlValidation,
  videoFileValidation,
  videoUrlValidation,
} from '../constants/index.js';

export const emailZodSchema = object({ email: emailValidation });

export const phoneNumberZodSchema = object({ phoneNumber: phoneNumberValidation });

export const passwordZodSchema = object({ password: passwordValidation });

export const confirmPasswordZodSchema = object({ password: confirmPasswordValidation });

export const otpZodSchema = object({ otp: otpValidation });

export const thumbnailUnionZodSchema = union([thumbnailFileValidation, thumbnailUrlValidation]);

export const videoUnionZodSchema = union([videoFileValidation, videoUrlValidation]);

export const imageUnionZodSchema = union([imageFileValidation, imageUrlValidation]);
