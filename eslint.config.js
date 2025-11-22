// @ts-check

/**
 * Fully combined ESLint config for your Next.js project.
 * This merges:
 * - eslint-base.js
 * - eslint-next.js
 * - eslint.config.js
 */

import pluginNext from "@next/eslint-plugin-next";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import turboPlugin from "eslint-plugin-turbo";
import globals from "globals";
import { createESLintConfig } from "@leomotors/config";

/** @type {import("eslint").Linter.Config[]} */
export default [
  // -----------------------------
  // Base config from createESLintConfig()
  // -----------------------------
  ...createESLintConfig(),

  // -----------------------------
  // Additional base rules (from eslint-base.js)
  // -----------------------------
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

  // -----------------------------
  // React recommended config
  // (from eslint-next.js)
  // -----------------------------
  {
    ...pluginReact.configs.flat.recommended,
    languageOptions: {
      ...pluginReact.configs.flat.recommended.languageOptions,
      globals: {
        ...globals.serviceworker,
      },
    },
  },

  // -----------------------------
  // Next.js recommended + Core Web Vitals rules
  // -----------------------------
  {
    plugins: {
      "@next/next": pluginNext,
    },
    rules: {
      ...pluginNext.configs.recommended.rules,
      ...pluginNext.configs["core-web-vitals"].rules,
    },
  },

  // -----------------------------
  // React Hooks rules
  // -----------------------------
  {
    plugins: {
      "react-hooks": pluginReactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,

      // Not needed with modern JSX transform
      "react/react-in-jsx-scope": "off",
    },
  },

  // -----------------------------
  // Type definition file overrides
  // -----------------------------
  {
    files: ["*.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];
