"use client";

// Gancho da tela da sala: uma sessão do navegador por sala, lida como loja externa. Fechar a aba ou
// sair da página avisa o servidor (sendBeacon) e solta microfone e conexão.

import { useEffect, useState, useSyncExternalStore } from "react";
import { SessaoSala, SNAPSHOT_INICIAL, type SessaoSnapshot } from "./sessao-sala";

const inicial = () => SNAPSHOT_INICIAL;

export function useSala(roomId: string): { snap: SessaoSnapshot; sessao: SessaoSala } {
  const [sessao] = useState(() => new SessaoSala(roomId));
  const snap = useSyncExternalStore(sessao.subscribe, sessao.getSnapshot, inicial);

  useEffect(() => {
    const onHide = () => sessao.sairNoFechamento();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      sessao.sairNoFechamento();
    };
  }, [sessao]);

  return { snap, sessao };
}
