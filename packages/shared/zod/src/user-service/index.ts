import { discriminatedUnion, literal, object } from 'zod';

import {
  currentPasswordValidation,
  emailValidation,
  firstNameValidation,
  lastNameValidation,
  passwordsValidation,
  passwordValidation,
  phoneNumberValidation,
} from '../constants/index.js';
import { appendCustomIssue } from '../utils/index.js';

export const loginZodSchema = discriminatedUnion('loginMethod', [
  object({
    loginMethod: literal('email', 'Invalid login method, must be email.'),
    email: emailValidation,
    password: passwordValidation,
  }).strict(),

  object({
    loginMethod: literal('phoneNumber', 'Invalid login method, must be phoneNumber.'),
    phoneNumber: phoneNumberValidation,
    password: passwordValidation,
  }).strict(),
]);

export const passwordsZodSchema = passwordsValidation;

const baseUserZodSchema = object({
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  firstName: firstNameValidation,
  lastName: lastNameValidation,
});

export const registerZodSchema = passwordsZodSchema.and(baseUserZodSchema);

export const setPasswordZodSchema = passwordsValidation;

export const changePasswordZodSchema = passwordsValidation
  .extend({ currentPassword: currentPasswordValidation })
  .superRefine((data, ctx) => {
    if (data.password === data.currentPassword) {
      appendCustomIssue(ctx, 'New password cannot be same as current password.', 'password');
    }
  });

export const updateUserSchema = baseUserZodSchema.partial();
