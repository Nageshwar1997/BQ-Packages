import { object, string } from '@beautinique/shared-zod';

export const folderZodSchema = object({
  folder: string('Folder name is required.')
    .trim()
    .nonempty('Folder name is required.')
    .min(3, 'Folder name must be at least 3 characters long.')
    .max(200, 'Folder name must be at most 200 characters long.'),
});
