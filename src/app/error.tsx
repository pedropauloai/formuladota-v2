"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Error boundary global — preserva tema cyberpunk em vez de fallback default Next.
// Renderizado quando qualquer rota dispara unhandled error.
// Refatorado V2.5 (DF8.4 cleanup — 2026-05-24):
//   - <Card variant="elevated"> + tokens V2.5
//   - <Button variant="primary"> para Tentar Novamente
//   - Mantém reset/digest contract do Next.js
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error.tsx]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Card variant="elevated" className="w-full max-w-md border-error">
        <CardContent className="space-y-6">
          <header className="space-y-2 text-center">
            <p className="font-mono text-sm uppercase tracking-widest text-error">
              erro inesperado
            </p>
            <h1 className="font-display text-2xl uppercase tracking-tight text-text-display">
              Algo quebrou.
            </h1>
          </header>

          <p className="text-sm leading-relaxed text-text-muted">
            Encontramos um erro inesperado ao processar sua requisição. Você pode
            tentar novamente, ou voltar à home enquanto investigamos.
          </p>

          {error.digest && (
            <p className="rounded-md border border-border-subtle bg-bg-base p-3 font-mono text-sm text-text-muted">
              ID do erro: {error.digest}
            </p>
          )}

          <div className="flex items-center justify-between gap-4 pt-2">
            <Button type="button" variant="primary" size="md" onClick={reset}>
              Tentar novamente
            </Button>
            <Link
              href="/"
              className="font-mono text-sm uppercase tracking-widest text-text-muted hover:text-text-display transition-colors"
            >
              ← home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
