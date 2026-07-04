import { defineConfig } from "vitest/config";

// Testes de LÓGICA PURA (sem DOM/Next). Os arquivos *.test.ts ficam ao lado do
// código. `pnpm test` roda `vitest run`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
