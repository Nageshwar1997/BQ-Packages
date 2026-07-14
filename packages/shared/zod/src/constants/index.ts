import { REGEX } from '@beautinique/shared-constants';
import { object, string } from 'zod';

export const emailValidation = string('Email is required')
  .trim()
  .lowercase()
  .nonempty('Email is required')
  .regex(REGEX.EMAIL, 'Email is invalid. e.g. example@me.com');

export const phoneNumberValidation = string('Phone number is required')
  .trim()
  .nonempty('Phone number is required')
  .regex(REGEX.PHONE, 'Phone number is invalid. e.g. 9876543210');

export const passwordValidation = string('Password is required')
  .trim()
  .nonempty('Password is required')
  .regex(REGEX.AT_LEAST_ONE_UPPERCASE_LETTER, 'Password must contain at least one uppercase letter')
  .regex(REGEX.AT_LEAST_ONE_LOWERCASE_LETTER, 'Password must contain at least one lowercase letter')
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Password must contain at least one number')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Password must contain at least one special character e.g. @$!%*?&#',
  )
  .regex(
    REGEX.PASSWORD,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  );

export const confirmPasswordValidation = string('Confirm password is required')
  .trim()
  .nonempty('Confirm password is required')
  .regex(
    REGEX.AT_LEAST_ONE_UPPERCASE_LETTER,
    'Confirm password must contain at least one uppercase letter',
  )
  .regex(
    REGEX.AT_LEAST_ONE_LOWERCASE_LETTER,
    'Confirm password must contain at least one lowercase letter',
  )
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Confirm password must contain at least one number')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Confirm password must contain at least one special character e.g. @$!%*?&#',
  )
  .regex(
    REGEX.PASSWORD,
    'Confirm password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  );

export const currentPasswordValidation = string('Current password is required')
  .trim()
  .nonempty('Current password is required')
  .regex(
    REGEX.AT_LEAST_ONE_UPPERCASE_LETTER,
    'Current password must contain at least one uppercase letter',
  )
  .regex(
    REGEX.AT_LEAST_ONE_LOWERCASE_LETTER,
    'Current password must contain at least one lowercase letter',
  )
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Current password must contain at least one number')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Current password must contain at least one special character e.g. @$!%*?&#',
  )
  .regex(
    REGEX.PASSWORD,
    'Current password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  );

export const firstNameValidation = string('First name is required')
  .trim()
  .nonempty('First name is required')
  .regex(REGEX.SINGLE_SPACE, "First name can't contain multiple spaces")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'First name is invalid. e.g. John');

export const lastNameValidation = string('Last name is required')
  .trim()
  .nonempty('Last name is required')
  .regex(REGEX.SINGLE_SPACE, "Last name can't contain multiple spaces")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Last name is invalid. e.g. John');

export const passwordsValidation = object({
  password: passwordValidation,
  confirmPassword: confirmPasswordValidation,
});

export const otpValidation = string('OTP is required')
  .trim()
  .nonempty('OTP is required')
  .length(6, 'OTP must be 6 digits long');
