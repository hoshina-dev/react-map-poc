import { createESLintConfig } from "@leomotors/config";
import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 * */
export const config = [
  ...createESLintConfig(),
  {
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
