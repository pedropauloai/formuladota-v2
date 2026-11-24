"use client";

// O servidor FORMULADOTA na /sala, como no Discord: a coluna de canais à esquerda (com a conexão de voz
// no pé) e o canal aberto ao lado, na altura da tela. A coluna mora no layout, então trocar de canal não
// pisca nem derruba a voz. A faixa de baixo fica livre para o mini perfil e o chat das mensagens.

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { v2Page } from "@/components/v2";
import type { ListaDeCanais } from "@/lib/sala/canais";
import { useSalaAtiva } from "@/lib/sala/cliente/use-sala-ativa";
import { cn } from "@/lib/utils";
import { ColunaCanais } from "./coluna-canais";
import { PainelVoz } from "./painel-voz";

const RENOVA_MS = 10_000;

/** A lista se renova a cada 10 s com a aba à vista, ao voltar para a aba e logo depois de entrar ou sair da voz. */
function useLista(inicial: ListaDeCanais, fase: string | null): ListaDeCanais {
  const [lista, setLista] = useState(inicial);
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const res = await fetch("/api/sala/canais", { cache: "no-store" });
        if (res.ok && vivo) setLista((await res.json()) as ListaDeCanais);
      } catch {
        // Sem rede: fica a última lista.
      }
    };
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") void buscar();
    }, RENOVA_MS);
    const logo = window.setTimeout(() => void buscar(), 1500);
    const foco = () => void buscar();
    window.addEventListener("focus", foco);
    return () => {
      vivo = false;
      window.clearInterval(tick);
      window.clearTimeout(logo);
      window.removeEventListener("focus", foco);
    };
  }, [fase]);
  return lista;
}

export function Servidor({ inicial, souDono, children }: { inicial: ListaDeCanais; souDono: boolean; children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const { ativa, snap } = useSalaAtiva();
  const lista = useLista(inicial, ativa ? `${ativa.meta.roomId}:${snap.fase}` : null);
  const falando = ativa && snap.fase === "na_sala" ? { roomId: ativa.meta.roomId, ids: snap.falando } : null;
  return (
    <div className={cn(v2Page, "flex h-full gap-4 overflow-hidden px-4 pb-[92px] pt-4")} data-servidor="">
      <ColunaCanais lista={lista} atual={params.id ?? null} souDono={souDono} falando={falando} conexao={ativa ? <PainelVoz embutido /> : null} />
      {/* Contêiner de tamanho: a tela do canal de voz se mede pela altura daqui (cqh), na escala da página. */}
      <div className="relative isolate h-full min-w-0 flex-1 overflow-y-auto overflow-x-clip [container-type:size]" data-servidor-canal="">{children}</div>
    </div>
  );
}
