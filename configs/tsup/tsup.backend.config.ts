import { defineConfig } from "tsup";
import { baseConfig } from "./tsup.base.config";

export default defineConfig({
  ...baseConfig,

  /* Target Node.js runtime */
  platform: "node",
});
