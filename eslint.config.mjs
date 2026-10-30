import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // The vendored VISR shell + its demo layer: no-build browser scripts sharing one global
    // scope, not this app's code (scripts/vendor-visr-demo.mjs).
    "public/visr-demo/**",
  ]),
]);

export default eslintConfig;
