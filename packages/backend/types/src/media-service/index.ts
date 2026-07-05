import type { folderZodSchema } from '@beautinique/backend-zod';
import { type TZodInfer } from '@beautinique/backend-zod';

export type TFolderZodSchema = TZodInfer<typeof folderZodSchema>;
