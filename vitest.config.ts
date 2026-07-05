import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testes de LÓGICA PURA (sem DOM/Next). Os arquivos *.test.ts ficam ao lado do
// código. `pnpm test` roda `vitest run`.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
  resolve: {
    // Alias "@/..." → src/ (espelha o tsconfig) pra testar módulos que usam o alias.
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
