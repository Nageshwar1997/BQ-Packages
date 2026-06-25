export const REGEX = {
  PHONE_START: /^[6-9]/, // Starts with 6, 7, 8, or 9
  PHONE_EXACT_LENGTH: /^\d{10}$/, // Exactly 10 digits
  PHONE: /^[6-9][0-9]{9}$/, // Phone number e.g. 9876543210
  NO_SPACE: /^\S+$/, // No spaces allowed
  SINGLE_SPACE: /^(?!.* {2,}).*$/s, // Single space allowed
  DATE: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|([+-]\d{2}:\d{2}))?)?$/, // Date e.g. 2022-01-01T12:00:00Z
  NAME: /^(?!.*\d)(?!.* {2})([A-Za-z]+( [A-Za-z]+)*)$/, // Only letters & single space
  EMAIL: /^[a-zA-Z0-9]+([._%+-]?[a-zA-Z0-9]+)*@[a-zA-Z0-9]+(-?[a-zA-Z0-9]+)*(\.[a-zA-Z]{2,})+$/, // Email e.g. 3oYQK@example.com
  PASSWORD: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&#])(?=\S.*$).{6,20}$/, // Password must contain at least one uppercase letter, one lowercase letter, one number, one special character, and be at least 6 characters long
  HEX_CODE: /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, // Hex color code
  ESCAPE_SPECIAL_CHARS: /[.*+?^${}()|[\]\\]/g,
  GST: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i, // Check valid GST number
  PIN_CODE: /^[1-9][0-9]{5}$/, // Check valid pin code
  OTP: /^[0-9]{6}$/, // OTP e.g. 123456
  URL: /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/[\w\-._~:/?#[\]@!$&'()*+,;=%]*)?$/i,
  PAN: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]$/,
  AT_LEAST_ONE_UPPERCASE_LETTER: /[A-Z]/, // At least one uppercase letter
  AT_LEAST_ONE_LOWERCASE_LETTER: /[a-z]/, // At least one lowercase letter
  AT_LEAST_ONE_DIGIT: /\d/, // At least one digit
  AT_LEAST_ONE_SPECIAL_CHARACTER: /[@$!%*?&#]/, // At least one special character
  ONLY_DIGITS: /^\d+$/, // All characters are digits
  ONLY_UPPERCASE: /^[A-Z]+$/, // All characters are uppercase
  ONLY_LOWERCASE: /^[a-z]+$/, // All characters are lowercase
  ONLY_LETTERS: /^[a-zA-Z]+$/, // All characters are letters
  ONLY_LETTERS_AND_SPACES: /^[a-zA-Z\s]+$/, // All characters are letters and spaces
  ONLY_LETTERS_AND_SPACES_AND_DOTS: /^[a-zA-Z\s.]+$/, // Only letters, spaces, and dots
  MONGODB_ID: /^[a-f\d]{24}$/i, // MongoDB _id
} as const;
