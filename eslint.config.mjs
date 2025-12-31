// @ts-check

import { createESLintConfig } from "@leomotors/config";
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import globals from "globals";

const eslintConfig = defineConfig([
  ...createESLintConfig(),
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "graphql/generated/**",
  ]),
  {
    files: ["*.cjs"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);

export default eslintConfig;
