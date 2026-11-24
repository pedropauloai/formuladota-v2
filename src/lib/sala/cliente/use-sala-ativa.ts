"use client";

// Gancho do painel de voz: a sala em que a pessoa está (ou a que acabou de tirá-la, com o motivo).
// Leve para ir em todas as páginas: o código da conexão só carrega se houver sala anotada para retomar.

import { useEffect, useSyncExternalStore } from "react";
import type { Ativa } from "./registro";
import { SNAPSHOT_INICIAL } from "./retrato";
import { registrarSessao, salaAtiva, temSalaAnotada } from "./sala-ativa";
import type { SessaoSala, SessaoSnapshot } from "./sessao-sala";

const inicial = () => SNAPSHOT_INICIAL;
const nenhuma = () => null;
const semAssinatura = () => () => undefined;

export function useSalaAtiva(): { ativa: Ativa<SessaoSala> | null; snap: SessaoSnapshot } {
  const ativa = useSyncExternalStore(salaAtiva.assinar, salaAtiva.atual, nenhuma);
  const snap = useSyncExternalStore(ativa?.sessao.subscribe ?? semAssinatura, ativa?.sessao.getSnapshot ?? inicial, inicial);
  useEffect(() => {
    if (!temSalaAnotada()) return;
    void import("./sessao-sala").then(({ SessaoSala }) => {
      registrarSessao(SessaoSala);
      return salaAtiva.retomar();
    });
  }, []);
  return { ativa, snap };
}
