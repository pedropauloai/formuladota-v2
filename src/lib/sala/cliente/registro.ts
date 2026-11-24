// A sala em que a pessoa está, fora das páginas: a conexão, a voz e o batimento continuam quando ela
// navega pelo site (navegação no cliente), e o painel de voz do invólucro lê daqui. A sala fica anotada
// no sessionStorage desta aba: recarregar a página volta para ela sozinho.

import type { RoomKind } from "../tipos";
import type { Fase } from "./retrato";

export interface SalaMeta {
  roomId: string;
  titulo: string;
  tipo: RoomKind;
}

export interface SessaoDoRegistro {
  entrar(): Promise<void>;
  sair(): void;
  sairNoFechamento(): void;
  getSnapshot(): { fase: Fase; motivo: string | null };
  subscribe(listener: () => void): () => void;
}

export type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface Ativa<S> {
  meta: SalaMeta;
  sessao: S;
}

export const CHAVE_SALA = "formuladota:sala";
const CHAVE = CHAVE_SALA;
// O aviso de saída da página anterior (sendBeacon) chega ao servidor antes de a sala reabrir.
const ESPERA_AO_RECARREGAR_MS = 1500;

function metaValida(v: unknown): v is SalaMeta {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  return typeof m.roomId === "string" && typeof m.titulo === "string" && (m.tipo === "palco" || m.tipo === "mentoria" || m.tipo === "party");
}

export function criarRegistro<S extends SessaoDoRegistro>(deps: {
  armazem: () => Armazem | null;
  nova: (roomId: string) => S;
  esperar?: (ms: number) => Promise<void>;
}) {
  let ativa: Ativa<S> | null = null;
  let candidata: { roomId: string; sessao: S } | null = null;
  let soltarVigia: (() => void) | null = null;
  let retomou = false;
  const ouvintes = new Set<() => void>();
  const avisar = () => ouvintes.forEach((l) => l());
  const esperar = deps.esperar ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));

  function anotar(meta: SalaMeta | null): void {
    try {
      const a = deps.armazem();
      if (meta) a?.setItem(CHAVE, JSON.stringify(meta));
      else a?.removeItem(CHAVE);
    } catch {
      // Sem armazém (aba anônima ou bloqueada): a sala só não volta sozinha ao recarregar.
    }
  }

  function anotada(): SalaMeta | null {
    try {
      const raw = deps.armazem()?.getItem(CHAVE);
      const v: unknown = raw ? JSON.parse(raw) : null;
      return metaValida(v) ? v : null;
    } catch {
      return null;
    }
  }

  /** Saiu pelo botão: some do painel. Tirado da sala (expulso, sala encerrada): fica com o motivo até dispensar. */
  function vigiar(sessao: S): void {
    soltarVigia?.();
    soltarVigia = sessao.subscribe(() => {
      const { fase, motivo } = sessao.getSnapshot();
      if (fase === "saiu" || fase === "erro") anotar(null);
      if (fase === "saiu" && motivo === "saiu" && ativa?.sessao === sessao) {
        soltarVigia?.();
        soltarVigia = null;
        ativa = null;
      }
      avisar();
    });
  }

  function daPagina(roomId: string): S {
    if (ativa?.meta.roomId === roomId) return ativa.sessao;
    if (candidata?.roomId === roomId) return candidata.sessao;
    candidata = { roomId, sessao: deps.nova(roomId) };
    return candidata.sessao;
  }

  async function entrar(sessao: S, meta: SalaMeta): Promise<void> {
    const anterior = ativa?.sessao !== sessao ? ativa : null;
    soltarVigia?.();
    soltarVigia = null;
    ativa = { meta, sessao };
    if (candidata?.sessao === sessao) candidata = null;
    anotar(meta);
    anterior?.sessao.sair();
    vigiar(sessao);
    avisar();
    await sessao.entrar();
  }

  async function retomar(): Promise<void> {
    if (retomou) return;
    retomou = true;
    const meta = anotada();
    if (!meta) return;
    const sessao = daPagina(meta.roomId);
    if (sessao.getSnapshot().fase !== "inicial") return;
    ativa = { meta, sessao };
    avisar();
    await esperar(ESPERA_AO_RECARREGAR_MS);
    if (ativa?.sessao === sessao && sessao.getSnapshot().fase === "inicial") await entrar(sessao, meta);
  }

  function dispensar(): void {
    if (!ativa) return;
    const { fase } = ativa.sessao.getSnapshot();
    if (fase === "na_sala" || fase === "entrando") return;
    soltarVigia?.();
    soltarVigia = null;
    ativa = null;
    avisar();
  }

  return {
    atual: (): Ativa<S> | null => ativa,
    assinar: (l: () => void): (() => void) => {
      ouvintes.add(l);
      return () => ouvintes.delete(l);
    },
    daPagina,
    entrar,
    retomar,
    dispensar,
    fecharAba: (): void => ativa?.sessao.sairNoFechamento(),
  };
}
