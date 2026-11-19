"use client";

// PROTÓTIPO (descartável): barra flutuante para trocar de versão (setas na tela ou no teclado).
// Só existe no servidor local; em produção não renderiza.

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface OpcaoVersao {
  key: string;
  nome: string;
}

export function SeletorVersao({ opcoes, atual }: { opcoes: OpcaoVersao[]; atual: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const index = Math.max(0, opcoes.findIndex((o) => o.key === atual));

  const ir = useCallback(
    (delta: number) => {
      const next = opcoes[(index + delta + opcoes.length) % opcoes.length];
      if (!next) return;
      const query = new URLSearchParams(params.toString());
      query.set("versao", next.key);
      router.replace(`${pathname}?${query}`, { scroll: false });
    },
    [index, opcoes, params, pathname, router]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return;
      if (e.key === "ArrowLeft") ir(-1);
      if (e.key === "ArrowRight") ir(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir]);

  const atualOpcao = opcoes[index];
  if (process.env.NODE_ENV === "production" || !atualOpcao) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-[300] flex -translate-x-1/2 items-center gap-1 rounded-full border border-[#ffffff33] bg-[#fafafa] p-1 text-[#111] shadow-[0_8px_30px_rgba(0,0,0,0.55)] md:bottom-6">
      <button type="button" onClick={() => ir(-1)} aria-label="Versão anterior" className="grid size-9 place-items-center rounded-full hover:bg-[#e5e5e5]">
        <ChevronLeft size={18} />
      </button>
      <span className="min-w-[15rem] px-2 text-center font-body text-sm font-bold">
        {atualOpcao.key.toUpperCase()} · {atualOpcao.nome}
        <span className="ml-2 font-normal text-[#666]">
          {index + 1}/{opcoes.length}
        </span>
      </span>
      <button type="button" onClick={() => ir(1)} aria-label="Próxima versão" className="grid size-9 place-items-center rounded-full hover:bg-[#e5e5e5]">
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
