import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

import sharedConfig from "../../eslint.config.shared.mjs";

const eslintConfig = defineConfig([
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  ...sharedConfig,
  globalIgnores(["downloads/**", ".session/**", "dist/**", "node_modules/**"]),
]);

export default eslintConfig;
