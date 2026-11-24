"use client";

// PROTÓTIPO descartável (home-previa): troca de versão e de estado pela URL (?v=a|b|c&estado=agora|
// marcada|aovivo), pelo seletor flutuante e pelas setas do teclado. O seletor não faz parte do desenho.

import { useCallback, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PublicQueue } from "@/lib/loja/fila/model";
import { cn } from "@/lib/utils";
import { filaDoEstado, type Estado } from "./dados";
import { VersaoA } from "./versao-a";
import { VersaoB } from "./versao-b";
import { VersaoC } from "./versao-c";
import s from "./previa.module.css";

const VERSOES = [
  { id: "a", nome: "A, Cliente" },
  { id: "b", nome: "B, Arena" },
  { id: "c", nome: "C, Cartaz" },
] as const;

const ESTADOS: ReadonlyArray<{ id: Estado; nome: string }> = [
  { id: "agora", nome: "Agora (banco)" },
  { id: "marcada", nome: "Live marcada (exemplo)" },
  { id: "aovivo", nome: "Ao vivo (exemplo)" },
];

type VersaoId = (typeof VERSOES)[number]["id"];

export function Previa({ real, rank, rankTier, fontes }: { real: PublicQueue; rank: number | null; rankTier: number | null; fontes: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const v = (VERSOES.find((x) => x.id === params.get("v"))?.id ?? "a") as VersaoId;
  const estado = (ESTADOS.find((x) => x.id === params.get("estado"))?.id ?? "agora") as Estado;
  const fila = filaDoEstado(estado, real);

  const ir = useCallback(
    (proxima: { v?: VersaoId; estado?: Estado }) => {
      const q = new URLSearchParams(params.toString());
      if (proxima.v) q.set("v", proxima.v);
      if (proxima.estado) q.set("estado", proxima.estado);
      router.replace(`${pathname}?${q.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (alvo && (alvo.closest("input, textarea, [contenteditable]") || alvo.isContentEditable)) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const i = VERSOES.findIndex((x) => x.id === v);
      const passo = e.key === "ArrowRight" ? 1 : VERSOES.length - 1;
      const proxima = VERSOES[(i + passo) % VERSOES.length];
      if (proxima) ir({ v: proxima.id });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ir, v]);

  return (
    <div className={cn(s.pagina, fontes)}>
      <div className={s.escala}>
        {v === "a" && <VersaoA fila={fila} rank={rank} rankTier={rankTier} />}
        {v === "b" && <VersaoB fila={fila} rank={rank} rankTier={rankTier} />}
        {v === "c" && <VersaoC fila={fila} rank={rank} rankTier={rankTier} />}
      </div>
      <div className={s.seletor} role="toolbar" aria-label="Protótipo: versão e estado">
        {VERSOES.map((x) => (
          <button key={x.id} type="button" className={cn(x.id === v && s.ativo)} aria-pressed={x.id === v} onClick={() => ir({ v: x.id })}>
            {x.nome}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-black/20" aria-hidden="true" />
        {ESTADOS.map((x) => (
          <button key={x.id} type="button" className={cn(x.id === estado && s.ativo)} aria-pressed={x.id === estado} onClick={() => ir({ estado: x.id })}>
            {x.nome}
          </button>
        ))}
      </div>
    </div>
  );
}
