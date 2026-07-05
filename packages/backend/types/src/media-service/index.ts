import type { folderZodSchema, TZodInfer } from '@beautinique/backend-zod';

export type TFolderZodSchema = TZodInfer<typeof folderZodSchema>;
