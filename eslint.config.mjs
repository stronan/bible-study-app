import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist", "node_modules", "*.config.*"]
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended
    ],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "react/react-in-jsx-scope": "off"
    }
  }
);
