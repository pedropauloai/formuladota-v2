"use client";

import { useEffect } from "react";
import Link from "next/link";

// Error boundary global — preserva tema cyberpunk em vez de fallback default Next.
// Renderizado quando qualquer rota dispara unhandled error.
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
      <div className="w-full max-w-md space-y-6 rounded-lg border-2 border-[var(--color-danger)] bg-[var(--color-card)] p-8">
        <header className="space-y-2 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--color-danger)]">
            erro inesperado
          </p>
          <h1 className="text-2xl font-bold">Algo quebrou.</h1>
        </header>

        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          Encontramos um erro inesperado ao processar sua requisição. Você pode
          tentar novamente, ou voltar à home enquanto investigamos.
        </p>

        {error.digest && (
          <p className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)] p-3 font-mono text-xs text-[var(--color-muted-foreground)]">
            ID do erro: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-md border border-[var(--color-cyan)] px-4 py-2 font-medium text-[var(--color-cyan)] hover:bg-[var(--color-cyan)]/10 transition"
          >
            Tentar novamente
          </button>
          <Link
            href="/"
            className="font-mono text-xs uppercase tracking-widest text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition"
          >
            ← home
          </Link>
        </div>
      </div>
    </main>
  );
}
