import {
  IMAGE_FORMATS,
  IMAGE_MIMES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  REGEX,
  VIDEO_FORMATS,
  VIDEO_MIMES,
} from '@beautinique/shared-constants';
import { formatFileSize } from '@beautinique/shared-utils';
import { file, object, string, url } from 'zod';

import { appendCustomIssue } from '../utils/index.js';

export const emailValidation = string('Email is required.')
  .trim()
  .lowercase()
  .nonempty('Email is required.')
  .regex(REGEX.EMAIL, 'Email is invalid. e.g. "example@me.com".');

export const phoneNumberValidation = string('Phone number is required.')
  .trim()
  .nonempty('Phone number is required.')
  .regex(REGEX.PHONE, 'Phone number is invalid. e.g. "9876543210".');

export const passwordValidation = string('Password is required.')
  .trim()
  .nonempty('Password is required.')
  .regex(
    REGEX.AT_LEAST_ONE_UPPERCASE_LETTER,
    'Password must contain at least one uppercase letter.',
  )
  .regex(
    REGEX.AT_LEAST_ONE_LOWERCASE_LETTER,
    'Password must contain at least one lowercase letter.',
  )
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Password must contain at least one number.')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Password must contain at least one special character e.g. "@$!%*?&#".',
  )
  .regex(
    REGEX.PASSWORD,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  );

export const confirmPasswordValidation = string('Confirm password is required.')
  .trim()
  .nonempty('Confirm password is required.')
  .regex(
    REGEX.AT_LEAST_ONE_UPPERCASE_LETTER,
    'Confirm password must contain at least one uppercase letter.',
  )
  .regex(
    REGEX.AT_LEAST_ONE_LOWERCASE_LETTER,
    'Confirm password must contain at least one lowercase letter.',
  )
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Confirm password must contain at least one number.')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Confirm password must contain at least one special character e.g. "@$!%*?&#".',
  )
  .regex(
    REGEX.PASSWORD,
    'Confirm password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  );

export const currentPasswordValidation = string('Current password is required.')
  .trim()
  .nonempty('Current password is required.')
  .regex(
    REGEX.AT_LEAST_ONE_UPPERCASE_LETTER,
    'Current password must contain at least one uppercase letter.',
  )
  .regex(
    REGEX.AT_LEAST_ONE_LOWERCASE_LETTER,
    'Current password must contain at least one lowercase letter.',
  )
  .regex(REGEX.AT_LEAST_ONE_DIGIT, 'Current password must contain at least one number.')
  .regex(
    REGEX.AT_LEAST_ONE_SPECIAL_CHARACTER,
    'Current password must contain at least one special character e.g. "@$!%*?&#".',
  )
  .regex(
    REGEX.PASSWORD,
    'Current password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
  );

export const nameValidation = string('Name is required.')
  .trim()
  .nonempty('Name is required.')
  .min(2, 'Name must be at least 2 characters long.')
  .max(100, 'Name must be at most 100 characters long.')
  .regex(REGEX.SINGLE_SPACE, "Name can't contain multiple spaces.")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Name is invalid. e.g. "John Doe".');

export const firstNameValidation = string('First name is required.')
  .trim()
  .nonempty('First name is required.')
  .min(2, 'First name must be at least 2 characters long.')
  .max(50, 'First name must be at most 50 characters long.')
  .regex(REGEX.SINGLE_SPACE, "First name can't contain multiple spaces.")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'First name is invalid. e.g. "John".');

export const lastNameValidation = string('Last name is required.')
  .trim()
  .nonempty('Last name is required.')
  .min(2, 'Last name must be at least 2 characters long.')
  .max(50, 'Last name must be at most 50 characters long.')
  .regex(REGEX.SINGLE_SPACE, "Last name can't contain multiple spaces.")
  .regex(REGEX.ONLY_LETTERS_AND_SPACES, 'Last name is invalid. e.g. "John".');

export const passwordsValidation = object({
  password: passwordValidation,
  confirmPassword: confirmPasswordValidation,
}).superRefine((data, ctx) => {
  if (data.password !== data.confirmPassword) {
    appendCustomIssue(ctx, 'Passwords do not match.', 'confirmPassword');
  }
});

export const otpValidation = string('OTP is required.')
  .trim()
  .nonempty('OTP is required.')
  .length(6, 'OTP must be 6 digits long.');

export const thumbnailFileValidation = file('Thumbnail is required.')
  .mime(
    IMAGE_MIMES as never,
    `Invalid thumbnail type. type must be one of: ${IMAGE_FORMATS.join(', ')}.`,
  )
  .max(
    MAX_IMAGE_SIZE,
    `Thumbnail size exceed. Max allowed thumbnail size is ${formatFileSize(MAX_IMAGE_SIZE)}.`,
  );

export const thumbnailUrlValidation = url('Thumbnail is required.').regex(
  REGEX.URL,
  'Invalid thumbnail URL.',
);

export const videoFileValidation = file('Video is required.')
  .mime(
    VIDEO_MIMES as never,
    `Invalid video type. type must be one of: ${VIDEO_FORMATS.join(', ')}.`,
  )
  .max(
    MAX_VIDEO_SIZE,
    `Video size exceed. Max allowed video size is ${formatFileSize(MAX_VIDEO_SIZE)}.`,
  );

export const videoUrlValidation = url('Video is required.').regex(REGEX.URL, 'Invalid video URL.');

export const imageFileValidation = file('Image is required.')
  .mime(
    IMAGE_MIMES as never,
    `Invalid image type. type must be one of: ${IMAGE_FORMATS.join(', ')}.`,
  )
  .max(
    MAX_IMAGE_SIZE,
    `Image size exceed. Max allowed image size is ${formatFileSize(MAX_IMAGE_SIZE)}.`,
  );

export const imageUrlValidation = url('Image is required.').regex(REGEX.URL, 'Invalid image URL.');
