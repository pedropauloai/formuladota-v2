import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: ["node_modules/**", ".next/**", "bot/**", "supabase/**", ".claude/**"],
  },
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      // react-hooks/purity v7 é muito agressiva com Date.now() / new Date() em render —
      // esses casos são aceitáveis no projeto (cálculos determinísticos de minutesOpen).
      // Downgrade pra warn até migrar pra useServerInsertedHTML ou useSWR.
      "react-hooks/purity": "warn",
    },
  },
];

export default config;
