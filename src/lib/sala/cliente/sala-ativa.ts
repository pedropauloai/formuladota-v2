// A sala ativa desta aba do navegador: um registro só para o site inteiro (página da sala e painel de
// voz leem daqui). Fechar ou recarregar a aba avisa a saída pelo sendBeacon; recarregar volta sozinho.
// O código da conexão (partytracks) não vem junto: a página da sala registra a classe da sessão, e a
// volta ao recarregar carrega o código só quando há sala anotada na aba.

import { CHAVE_SALA, criarRegistro } from "./registro";
import type { SessaoSala } from "./sessao-sala";

type ClasseDaSessao = new (roomId: string) => SessaoSala;

const noNavegador = typeof window !== "undefined";
let classe: ClasseDaSessao | null = null;

export function registrarSessao(c: ClasseDaSessao): void {
  classe ??= c;
}

export const salaAtiva = criarRegistro<SessaoSala>({
  armazem: () => (noNavegador ? window.sessionStorage : null),
  nova: (roomId) => {
    if (!classe) throw new Error("a sessão da sala ainda não carregou");
    return new classe(roomId);
  },
});

export function temSalaAnotada(): boolean {
  try {
    return noNavegador && !!window.sessionStorage.getItem(CHAVE_SALA);
  } catch {
    return false;
  }
}

if (noNavegador) window.addEventListener("pagehide", () => salaAtiva.fecharAba());
