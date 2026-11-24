"use client";

// PROTÓTIPO (meta-previa): a barra flutuante que troca a versão (também pelas setas do teclado), sem
// perder os filtros da URL. Não faz parte do desenho: some quando a versão escolhida for para o /meta.

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Versao } from "./estado";

const VERSOES: ReadonlyArray<{ id: Versao; nome: string }> = [
  { id: "a", nome: "A, painel do patch" },
  { id: "b", nome: "B, tabela de instrumento" },
  { id: "c", nome: "C, quadro de notas" },
];

export function Seletor({ versao }: { versao: Versao }) {
  const router = useRouter();

  const ir = useCallback(
    (proxima: Versao) => {
      const url = new URL(window.location.href);
      url.searchParams.set("versao", proxima);
      router.replace(`${url.pathname}?${url.searchParams.toString()}`, { scroll: false });
    },
    [router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.closest("input, textarea, [contenteditable]") || alvo.isContentEditable)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const i = VERSOES.findIndex((x) => x.id === versao);
      const passo = e.key === "ArrowRight" ? 1 : VERSOES.length - 1;
      const proxima = VERSOES[(i + passo) % VERSOES.length];
      if (proxima) ir(proxima.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, versao]);

  return (
    <div
      role="toolbar"
      aria-label="Protótipo: versão do meta"
      className="fixed bottom-3 left-1/2 z-[var(--z-system)] flex -translate-x-1/2 items-center gap-1 rounded-sm border border-gold/50 bg-bg-deep/95 p-1 font-body text-xs shadow-[var(--shadow-cinematic)]"
    >
      {VERSOES.map((x) => (
        <button
          key={x.id}
          type="button"
          aria-pressed={x.id === versao}
          onClick={() => ir(x.id)}
          className={cn(
            "rounded-sm px-3 py-1.5 font-semibold transition-colors",
            x.id === versao ? "bg-gold text-bg-deep" : "text-text-muted hover:bg-bg-elevated hover:text-text-display"
          )}
        >
          {x.nome}
        </button>
      ))}
    </div>
  );
}
