import { ADMIN_STATUS_MAP, REGEX, STATES_AND_UTS } from '@beautinique/shared-constants';
import { array, discriminatedUnion, enum as enum_z, literal, object, string } from 'zod';

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

export const baseUserZodSchema = object({
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

/* ================== ADMIN TERRITORY (state-wise assignment) ================== */

// MASTER assigns/reassigns which state(s) an `ADMIN`/`SUPER_ADMIN` owns, and
// optionally who covers for them when `ON_LEAVE`.
export const assignAdminTerritoryZodSchema = object({
  states: array(enum_z(STATES_AND_UTS, 'Invalid state'))
    .min(1, 'At least one state is required')
    .refine((states) => new Set(states).size === states.length, 'Duplicate states are not allowed'),
  priority: string('Priority is required')
    .trim()
    .nonempty('Priority is required')
    .regex(REGEX.ONLY_DIGITS, 'Priority must be a number')
    .optional(),
  backupAdmin: string('Backup admin id is required')
    .trim()
    .regex(REGEX.MONGODB_ID, 'Invalid backup admin id')
    .optional(),
});

// `PATCH /admin/territory/:adminId/status` - an admin toggling themselves
// (or MASTER toggling someone else). `ON_LEAVE` keeps ownership (see
// "covering" in the assignment plan doc); `SUSPENDED` is MASTER-only and
// triggers immediate bulk reassignment - that authorization check happens
// in the controller, not here.
export const updateAdminStatusZodSchema = discriminatedUnion('status', [
  object({ status: literal(ADMIN_STATUS_MAP.ACTIVE) }).strict(),
  object({
    status: literal(ADMIN_STATUS_MAP.ON_LEAVE),
    reason: string('Leave reason is required').trim().nonempty('Leave reason is required'),
    leaveUntil: string('Leave until date is required')
      .trim()
      .regex(REGEX.DATE, 'Enter a valid date')
      .optional(),
  }).strict(),
  object({
    status: literal(ADMIN_STATUS_MAP.SUSPENDED),
    reason: string('Suspension reason is required')
      .trim()
      .nonempty('Suspension reason is required'),
  }).strict(),
]);
