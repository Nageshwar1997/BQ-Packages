import { defineConfig } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';

import frontendConfig from '../../../configs/eslint/eslint.frontend.config.mjs';

/* Components use hooks: this package needs the rules of hooks (rules-of-hooks, exhaustive-deps). */
export default defineConfig(frontendConfig, reactHooks.configs.flat.recommended);
