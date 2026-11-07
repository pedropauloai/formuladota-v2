import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Testes de LÓGICA PURA (sem DOM/Next). Os arquivos *.test.ts ficam ao lado do
// código. `pnpm test` roda `vitest run`.
export default defineConfig({
  // Mesmo atalho do tsconfig: o teste importa como o código importa.
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
