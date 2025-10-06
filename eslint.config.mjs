import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend recommended configurations
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  
  // Global ignores for generated files
  {
    ignores: ["src/generated/**"],
  },
  
  // Main configuration for TypeScript files
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      // The specific rules that were causing build errors
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Use standard ESLint rules instead of TypeScript-specific ones
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  
  // Override rules for generated files
  {
    files: ["src/generated/**/*.js", "src/generated/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;