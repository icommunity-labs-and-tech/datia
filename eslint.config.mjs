import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore generated and test scaffolding from lint
  { ignores: [
    "src/generated/**",
    "src/test/**",
    "tests/**",
    "src/**/__tests__/**",
  ]},
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "off",
    }
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          "paths": [
            {
              "name": "@prisma/client",
              "message": "Prisma imports are only allowed in the infrastructure layer. Use repository interfaces instead."
            },
            {
              "name": "prisma",
              "message": "Prisma imports are only allowed in the infrastructure layer. Use repository interfaces instead."
            }
          ]
        }
      ]
    }
  },
  {
    files: ["src/domain/**/*.{ts,tsx}", "src/actions/**/*.{ts,tsx}"],
    rules: {
      // Temporarily disabled due to regex parsing issue in ESLint
      // "no-restricted-syntax": [
      //   "error",
      //   {
      //     selector: "CallExpression[callee.name='fetch'] Literal[value=/^https?:\\/\\//]",
      //     message: "Use Effect service instead of direct external fetch"
      //   }
      // ]
    }
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off"
    }
  }
];

export default eslintConfig;
