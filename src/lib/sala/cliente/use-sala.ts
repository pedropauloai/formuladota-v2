"use client";

// Gancho da página da sala: pega a sessão do registro da sala ativa (a mesma enquanto a pessoa estiver
// nela, mesmo navegando pelo site) e abre a tela. Sair da página não sai da sala: só fechar a aba, o
// botão Sair ou entrar em outra sala.

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { RoomKind } from "../tipos";
import { registrarSessao, salaAtiva } from "./sala-ativa";
import { SessaoSala, SNAPSHOT_INICIAL, type SessaoSnapshot } from "./sessao-sala";

registrarSessao(SessaoSala);

const inicial = () => SNAPSHOT_INICIAL;
const nenhuma = () => null;

export function useSala(roomId: string, titulo: string, tipo: RoomKind): { snap: SessaoSnapshot; sessao: SessaoSala; entrar: () => void; retomando: boolean } {
  // No servidor, uma sessão solta que nunca entra; no navegador, a do registro (a mesma ao voltar à página).
  const [sessao] = useState(() => (typeof window === "undefined" ? new SessaoSala(roomId) : salaAtiva.daPagina(roomId)));
  const snap = useSyncExternalStore(sessao.subscribe, sessao.getSnapshot, inicial);
  const ativa = useSyncExternalStore(salaAtiva.assinar, salaAtiva.atual, nenhuma);

  useEffect(() => {
    sessao.setVistaAberta(true);
    return () => sessao.setVistaAberta(false);
  }, [sessao]);

  const entrar = useCallback(() => void salaAtiva.entrar(sessao, { roomId, titulo, tipo }), [sessao, roomId, titulo, tipo]);
  return { snap, sessao, entrar, retomando: ativa?.sessao === sessao && snap.fase === "inicial" };
}
