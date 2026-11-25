// Mover alguém de canal (pedido da central em 25/11/2026): só o dono move, só quem está na sala agora, e
// só para outro canal de voz aberto do mesmo dono em que a pessoa pode entrar (o acesso dela ao destino
// vem da mesma regra da entrada). Regra pura; o servidor lê os fatos e grava o destino.

import type { AccessDecision, MemberRole, RoomKind, RoomStatus } from "./tipos";

export type MoverResultado = { ok: true } | { ok: false; code: string };

export interface MoverFatos {
  atorPapel: MemberRole;
  origemId: string;
  donoDaOrigem: string;
  alvoId: string;
  /** A pessoa está na sala de origem agora (ativa, com batimento recente). */
  alvoPresente: boolean;
  destino: { id: string; kind: RoomKind; status: RoomStatus; ownerId: string; canal: boolean } | null;
  /** A regra da entrada aplicada à pessoa no destino. */
  acessoDoAlvo: AccessDecision | null;
}

export function decidirMover(f: MoverFatos): MoverResultado {
  if (f.atorPapel !== "dono") return { ok: false, code: "so_o_dono" };
  if (f.alvoId === f.donoDaOrigem || !f.alvoPresente) return { ok: false, code: "fora_da_sala" };
  const d = f.destino;
  if (!d || d.id === f.origemId || d.kind !== "palco" || !d.canal || d.status !== "aberta" || d.ownerId !== f.donoDaOrigem) {
    return { ok: false, code: "destino_invalido" };
  }
  if (!f.acessoDoAlvo?.ok) return { ok: false, code: f.acessoDoAlvo?.code ?? "destino_invalido" };
  return { ok: true };
}
