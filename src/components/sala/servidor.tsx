"use client";

// O servidor FORMULADOTA na /sala, como no Discord: a coluna de canais à esquerda (com a conexão de voz
// no pé) e o canal aberto ao lado, na altura da tela. A coluna mora no layout, então trocar de canal não
// pisca nem derruba a voz. A faixa de baixo fica livre para o mini perfil e o chat das mensagens.

import { useEffect, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { v2Page } from "@/components/v2";
import type { CanalItem, ListaDeCanais } from "@/lib/sala/canais";
import type { SalaMeta } from "@/lib/sala/cliente/registro";
import type { SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { useSalaAtiva } from "@/lib/sala/cliente/use-sala-ativa";
import { cn } from "@/lib/utils";
import { ColunaCanais } from "./coluna-canais";
import { PainelVoz } from "./painel-voz";
import { PessoasDaSala } from "./pessoas-da-sala";

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

/** A sala conectada que não é canal da lista (uma sala de palco antiga): aparece à parte, com as pessoas. */
function salaDaSessao(meta: SalaMeta, snap: SessaoSnapshot): CanalItem {
  const online = (snap.estado?.membros ?? []).filter((m) => m.online).length;
  return {
    id: meta.roomId, titulo: meta.titulo, tipo: meta.tipo, modo: snap.estado?.sala?.modo ?? "palco", beneficio: false, chatAberto: true,
    online, lugares: null, cheio: false, pessoas: [], aoVivo: false, donoId: "",
  };
}

export function Servidor({ inicial, souDono, children }: { inicial: ListaDeCanais; souDono: boolean; children: ReactNode }) {
  const params = useParams<{ id?: string }>();
  const { ativa, snap } = useSalaAtiva();
  const lista = useLista(inicial, ativa ? `${ativa.meta.roomId}:${snap.fase}` : null);
  const naSala = ativa && snap.fase === "na_sala" ? ativa.meta.roomId : null;
  const listada = [...lista.texto, ...lista.voz, ...lista.privadas].some((c) => c.id === naSala);
  const salaAtual = ativa && naSala && !listada ? salaDaSessao(ativa.meta, snap) : null;
  const pessoasDe = (id: string) => (ativa && naSala === id ? <PessoasDaSala sessao={ativa.sessao} snap={snap} /> : null);
  return (
    <div className={cn(v2Page, "flex h-full gap-4 overflow-hidden px-4 pb-[92px] pt-4")} data-servidor="">
      <ColunaCanais
        lista={lista} atual={params.id ?? null} souDono={souDono} naSala={naSala} pessoasDe={pessoasDe} salaAtual={salaAtual}
        compartilhando={snap.compartilhando} conexao={ativa ? <PainelVoz embutido /> : null}
      />
      {/* Contêiner de tamanho: a tela do canal de voz se mede pela altura daqui (cqh), na escala da página. */}
      <div className="relative isolate h-full min-w-0 flex-1 overflow-y-auto overflow-x-clip [container-type:size]" data-servidor-canal="">{children}</div>
    </div>
  );
}
