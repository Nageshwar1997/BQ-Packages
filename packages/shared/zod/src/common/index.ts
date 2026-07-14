import { object } from 'zod';

import {
  confirmPasswordValidation,
  emailValidation,
  otpValidation,
  passwordValidation,
  phoneNumberValidation,
} from '../constants/index.js';

export const emailZodSchema = object({ email: emailValidation });

export const phoneNumberZodSchema = object({ phoneNumber: phoneNumberValidation });

export const passwordZodSchema = object({ password: passwordValidation });

export const confirmPasswordZodSchema = object({ password: confirmPasswordValidation });

export const otpZodSchema = object({ otp: otpValidation });
