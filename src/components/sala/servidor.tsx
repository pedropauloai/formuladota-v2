"use client";

// O servidor FORMULADOTA na /sala, como no Discord: a coluna de canais à esquerda (com a conexão de voz
// no pé) e o canal aberto ao lado, na altura da tela. A coluna mora no layout, então trocar de canal não
// pisca nem derruba a voz. A faixa de baixo fica livre para o mini perfil e o chat das mensagens.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams } from "next/navigation";
import { v2Page } from "@/components/v2";
import { semMimForaDaSala, type CanalItem, type ListaDeCanais } from "@/lib/sala/canais";
import type { SalaMeta } from "@/lib/sala/cliente/registro";
import type { SessaoSnapshot } from "@/lib/sala/cliente/sessao-sala";
import { useSalaAtiva } from "@/lib/sala/cliente/use-sala-ativa";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { ColunaCanais } from "./coluna-canais";
import { PainelVoz } from "./painel-voz";
import { PessoasDaSala } from "./pessoas-da-sala";

const RENOVA_MS = 10_000;
const AVISO_JUNTA_MS = 150;

/** Assina o aviso do servidor (Broadcast do Realtime): alguém entrou ou saiu de um canal. Os avisos que
 *  chegam colados (sair de um canal e entrar no outro) viram uma leitura só. */
function useAvisoDosCanais(topico: string | null, aoMudar: () => void): void {
  useEffect(() => {
    if (!topico) return;
    const supabase = createClient();
    let espera: number | null = null;
    const canal = supabase
      .channel(topico)
      .on("broadcast", { event: "mudou" }, () => {
        if (espera !== null) return;
        espera = window.setTimeout(() => {
          espera = null;
          aoMudar();
        }, AVISO_JUNTA_MS);
      })
      .subscribe();
    return () => {
      if (espera !== null) window.clearTimeout(espera);
      void supabase.removeChannel(canal);
    };
  }, [topico, aoMudar]);
}

/** A lista chega na hora pelo aviso do servidor; a consulta a cada 10 s (com a aba à vista), ao voltar
 *  para a aba e logo depois de entrar ou sair da voz fica como rede de segurança. */
function useLista(inicial: ListaDeCanais, fase: string | null): { lista: ListaDeCanais; renovar: () => void } {
  const [lista, setLista] = useState(inicial);
  const buscar = useCallback(async (fresco: boolean) => {
    try {
      const res = await fetch(fresco ? "/api/sala/canais?fresco=1" : "/api/sala/canais", { cache: "no-store" });
      if (res.ok) setLista((await res.json()) as ListaDeCanais);
    } catch {
      // Sem rede: fica a última lista.
    }
  }, []);
  const buscarFresca = useCallback(() => void buscar(true), [buscar]);
  useAvisoDosCanais(inicial.aviso ?? null, buscarFresca);
  useEffect(() => {
    const tick = window.setInterval(() => {
      if (document.visibilityState === "visible") void buscar(false);
    }, RENOVA_MS);
    const logo = window.setTimeout(() => void buscar(false), 1500);
    const foco = () => void buscar(false);
    window.addEventListener("focus", foco);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(logo);
      window.removeEventListener("focus", foco);
    };
  }, [fase, buscar]);
  return { lista, renovar: buscarFresca };
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
  const { lista: recebida, renovar } = useLista(inicial, ativa ? `${ativa.meta.roomId}:${snap.fase}` : null);
  const naSala = ativa && snap.fase === "na_sala" ? ativa.meta.roomId : null;
  const eu = naSala ? (snap.estado?.eu?.userId ?? null) : null;
  // Quem acabou de trocar de canal aparece só no canal em que está, sem esperar a lista nova.
  const lista = useMemo(() => semMimForaDaSala(recebida, eu, naSala), [recebida, eu, naSala]);
  const listada = [...lista.texto, ...lista.voz, ...lista.privadas].some((c) => c.id === naSala);
  const salaAtual = ativa && naSala && !listada ? salaDaSessao(ativa.meta, snap) : null;
  // Para onde o dono pode mover alguém: os outros canais de voz do servidor.
  const destinos = (id: string) => lista.voz.filter((c) => c.id !== id && c.tipo === "palco").map((c) => ({ id: c.id, titulo: c.titulo }));
  const pessoasDe = (id: string) => (ativa && naSala === id ? <PessoasDaSala sessao={ativa.sessao} snap={snap} destinos={destinos(id)} /> : null);
  return (
    <div className={cn(v2Page, "flex h-full gap-4 overflow-hidden px-4 pb-[92px] pt-4")} data-servidor="">
      <ColunaCanais
        lista={lista} atual={params.id ?? null} souDono={souDono} naSala={naSala} pessoasDe={pessoasDe} salaAtual={salaAtual}
        compartilhando={snap.compartilhando} conexao={ativa ? <PainelVoz embutido /> : null} onMudou={renovar}
      />
      {/* Contêiner de tamanho: a tela do canal de voz se mede pela altura daqui (cqh), na escala da página. */}
      <div className="relative isolate h-full min-w-0 flex-1 overflow-y-auto overflow-x-clip [container-type:size]" data-servidor-canal="">{children}</div>
    </div>
  );
}
