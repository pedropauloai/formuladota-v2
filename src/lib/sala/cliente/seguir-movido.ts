"use client";

// Movido pelo dono para outro canal (R20): quem está na página do canal de origem vai junto para a do
// destino, que entra sozinha (como o clique na árvore); em qualquer outra página, só a voz troca de canal
// e a pessoa continua onde estava, como no Discord.

import { useEffect } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { Ativa } from "./registro";
import { salaAtiva } from "./sala-ativa";
import type { SessaoSala, SessaoSnapshot } from "./sessao-sala";

// Uma vez por sessão: o painel de voz aparece em mais de um lugar da página, e a origem é deixada ao seguir.
const seguiram = new WeakSet<SessaoSala>();

async function tituloDoCanal(id: string): Promise<string | null> {
  try {
    const res = await fetch("/api/sala/canais", { cache: "no-store" });
    if (!res.ok) return null;
    const lista = (await res.json()) as { voz?: Array<{ id: string; titulo: string }> };
    return lista.voz?.find((c) => c.id === id)?.titulo ?? null;
  } catch {
    return null;
  }
}

async function seguir(destino: string, naOrigem: boolean, abrir: (href: string) => void): Promise<void> {
  const href = `/sala/${destino}?entrar=1`;
  if (naOrigem) return abrir(href);
  // Sem o nome do canal para o painel, a página do destino resolve.
  const titulo = await tituloDoCanal(destino);
  if (!titulo) return abrir(href);
  await salaAtiva.entrar(salaAtiva.daPagina(destino), { roomId: destino, titulo, tipo: "palco" });
}

export function useSeguirMovido(ativa: Ativa<SessaoSala> | null, snap: SessaoSnapshot): void {
  const router = useRouter();
  const pathname = usePathname();
  const destino = snap.fase === "na_sala" ? (snap.estado?.eu?.movidoPara ?? null) : null;
  useEffect(() => {
    if (!ativa || !destino || seguiram.has(ativa.sessao)) return;
    seguiram.add(ativa.sessao);
    void seguir(destino, pathname === `/sala/${ativa.meta.roomId}`, (href) => router.push(href));
  }, [ativa, destino, pathname, router]);
}
