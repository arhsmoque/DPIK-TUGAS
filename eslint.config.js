import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["dist", "node_modules", "coverage"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        URL: "readonly",
        __dirname: "readonly",
        fetch: "readonly",
        setTimeout: "readonly"
      }
    }
  },
  {
    // Cloudflare Workers runtime globals -- this file runs under workerd, not Node.
    files: ["apps/jobs/src/worker.mjs"],
    languageOptions: {
      globals: {
        Response: "readonly",
        Request: "readonly"
      }
    }
  },
  {
    files: ["apps/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        document: "readonly",
        window: "readonly",
        JSX: "readonly",
        crypto: "readonly",
        TextEncoder: "readonly",
        TextDecoder: "readonly",
        FormData: "readonly",
        HTMLFormElement: "readonly",
        localStorage: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint,
      "react-hooks": reactHooks
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@modules/*/domain/*",
                "@modules/*/application/*",
                "@modules/*/adapters/*",
                "@modules/*/ports/*"
              ],
              message:
                "Cross-module imports must go through a module's public index.ts only (see tests/architecture)."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["tests/**/*.{ts,tsx}", "scripts/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: { console: "readonly", process: "readonly" }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }]
    }
  }
];
