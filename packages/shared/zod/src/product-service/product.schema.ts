import { REGEX } from '@beautinique/shared-constants';
import { number, object, string } from 'zod';

export const productBasicInfoSchema = object({
  title: string('Title is required.')
    .nonempty('Title is required.')
    .min(2, 'Title must be at least 2 characters.')
    .max(150, 'Title cannot exceed 150 characters.')
    .regex(REGEX.SINGLE_SPACE, 'Title cannot contain consecutive spaces.'),

  brand: string('Brand is required.')
    .nonempty('Brand is required.')
    .min(2, 'Brand must be at least 2 characters.')
    .max(80, 'Brand cannot exceed 80 characters.')
    .regex(REGEX.SINGLE_SPACE, 'Brand cannot contain consecutive spaces.'),

  originalPrice: number('Original price is required.')
    .nonnegative('Original price cannot be negative.')
    .positive('Original price must be greater than 0.'),

  sellingPrice: number('Selling price is required.')
    .nonnegative('Selling price cannot be negative.')
    .positive('Selling price must be greater than 0.'),

  l1Category: object(
    {
      _id: string('(L1) Main category is required.')
        .nonempty('(L1) Main category is required.')
        .regex(REGEX.MONGODB_ID, '(L1) Main category must be a valid ID.'),
      name: string('(L1) Main category is required.')
        .nonempty('(L1) Main category is required.')
        .regex(REGEX.SINGLE_SPACE, '(L1) Main category cannot contain consecutive spaces.'),
    },
    '(L1) Main category is required.',
  ),

  l2Category: object(
    {
      _id: string('(L2) Sub-category is required.')
        .nonempty('(L2) Sub-category is required.')
        .regex(REGEX.MONGODB_ID, '(L2) Sub-category must be a valid ID.'),
      name: string('(L2) Sub-category is required.')
        .nonempty('(L2) Sub-category is required.')
        .regex(REGEX.SINGLE_SPACE, '(L2) Sub-category cannot contain consecutive spaces.'),
    },
    '(L2) Sub-category is required.',
  ),

  l3Category: object(
    {
      _id: string('(L3) Product category is required.')
        .nonempty('(L3) Product category is required.')
        .regex(REGEX.MONGODB_ID, '(L3) Product category must be a valid ID.'),
      name: string('(L3) Product category is required.')
        .nonempty('(L3) Product category is required.')
        .regex(REGEX.SINGLE_SPACE, '(L3) Product category cannot contain consecutive spaces.'),
    },
    '(L3) Product category is required.',
  ),
}).refine((data) => !data.sellingPrice || data.sellingPrice <= data.originalPrice, {
  path: ['sellingPrice'],
  message: 'Selling price cannot be greater than original price.',
});
