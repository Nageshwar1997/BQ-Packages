import { discriminatedUnion, literal, object, type RefinementCtx } from 'zod';

import { passwordsValidation } from '../common/index.js';
import {
  currentPasswordValidation,
  emailValidation,
  firstNameValidation,
  lastNameValidation,
  passwordValidation,
  phoneNumberValidation,
} from '../constants/index.js';
import { appendCustomIssue } from '../utils/index.js';

const passwordMatchValidation = (
  data: { password: string; confirmPassword: string; oldPassword?: string },
  ctx: RefinementCtx,
) => {
  if (data.password !== data.confirmPassword) {
    appendCustomIssue(ctx, 'Passwords do not match', 'confirmPassword');
  }
  if ('oldPassword' in data && data.password === data.oldPassword) {
    appendCustomIssue(ctx, 'New password cannot be same as old password', 'password');
  }
};

export const loginZodSchema = discriminatedUnion('loginMethod', [
  object({
    loginMethod: literal('email', 'Invalid login method, must be email'),
    email: emailValidation,
    password: passwordValidation,
  }).strict(),

  object({
    loginMethod: literal('phoneNumber', 'Invalid login method, must be phoneNumber'),
    phoneNumber: phoneNumberValidation,
    password: passwordValidation,
  }).strict(),
]);

export const passwordsZodSchema = passwordsValidation.superRefine(passwordMatchValidation);

const baseUserZodSchema = object({
  email: emailValidation,
  phoneNumber: phoneNumberValidation,
  firstName: firstNameValidation,
  lastName: lastNameValidation,
});

export const registerZodSchema = passwordsZodSchema
  .and(baseUserZodSchema)
  .superRefine(passwordMatchValidation);

export const setPasswordZodSchema = passwordsValidation.superRefine(passwordMatchValidation);

export const changePasswordSchema = passwordsValidation
  .extend({ currentPassword: currentPasswordValidation })
  .superRefine(passwordMatchValidation);

export const updateUserSchema = baseUserZodSchema.partial();
