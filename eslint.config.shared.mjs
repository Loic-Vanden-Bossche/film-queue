import { defineConfig } from "eslint/config";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";

const sharedConfig = defineConfig([
  {
    plugins: {
      prettier: prettierPlugin,
      "simple-import-sort": simpleImportSort,
    },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
      "prettier/prettier": "error",
    },
  },
  prettierConfig,
]);

export default sharedConfig;
