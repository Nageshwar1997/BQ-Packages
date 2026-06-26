import { defineConfig } from "tsup";

import { baseConfig } from "./tsup.base.config";

export default defineConfig({
  ...baseConfig,

  /* Target browser runtime */
  platform: "browser",
});
