// Quais itens o botão direito mostra na sala, como no Discord: numa pessoa, num canal da árvore e numa
// mensagem. Regra pura, a mesma dos botões que aparecem ao passar o mouse; quem decide de verdade é o
// servidor, que confere de novo cada ação.

import type { MemberRole, RoomKind } from "../tipos";

export type AcaoPessoa = "volume" | "chamar" | "devolver" | "mutar" | "liberar" | "expulsar" | "banir" | "bloquear" | "denunciar";

export interface PessoaDoMenu {
  /** A linha é de quem olha: a sala não tem ação, ficam só as do perfil. */
  propria: boolean;
  souDono: boolean;
  /** Canal de voz em modo palco: existe chamar e devolver. */
  palco: boolean;
  papel: MemberRole;
  mutadoPeloDono: boolean;
  bloqueado: boolean;
}

export function acoesDaPessoa(p: PessoaDoMenu): AcaoPessoa[] {
  if (p.propria) return [];
  const out: AcaoPessoa[] = ["volume"];
  if (p.souDono && p.papel !== "dono") {
    if (p.palco && p.papel === "ouvinte") out.push("chamar");
    if (p.palco && p.papel === "falante") out.push("devolver");
    if (p.papel !== "ouvinte") out.push(p.mutadoPeloDono ? "liberar" : "mutar");
    out.push("expulsar", "banir");
  }
  if (!p.bloqueado) out.push("bloquear");
  out.push("denunciar");
  return out;
}

export type AcaoCanal = "entrar" | "copiarLink" | "editar" | "modo" | "beneficio" | "subir" | "descer" | "apagar";

export interface CanalDoMenu {
  tipo: RoomKind;
  souDono: boolean;
  /** Quem olha está conectado à voz deste canal. */
  naSala: boolean;
  /** Canal do servidor (texto ou voz); sala privada de mentoria ou party não é. */
  listado: boolean;
  /** Primeiro e último da sua categoria (texto ou voz), para subir e descer. */
  primeiro: boolean;
  ultimo: boolean;
}

export function acoesDoCanal(c: CanalDoMenu): AcaoCanal[] {
  const out: AcaoCanal[] = [];
  if (c.tipo === "texto" || !c.naSala) out.push("entrar");
  out.push("copiarLink");
  if (!c.souDono || !c.listado) return out;
  out.push("editar");
  if (c.tipo !== "texto") out.push("modo");
  out.push("beneficio");
  if (!c.primeiro) out.push("subir");
  if (!c.ultimo) out.push("descer");
  out.push("apagar");
  return out;
}

export type AcaoMensagem = "copiar" | "perfil" | "apagar" | "banirAutor" | "denunciar";

export interface MensagemDoMenu {
  souDono: boolean;
  eu: string | null;
  /** Quem escreveu; nulo quando a conta foi apagada. */
  autor: string | null;
  donoId: string | null;
}

export function acoesDaMensagem(m: MensagemDoMenu): AcaoMensagem[] {
  const out: AcaoMensagem[] = ["copiar"];
  if (m.autor) out.push("perfil");
  if (m.souDono) out.push("apagar");
  if (m.souDono && m.autor && m.autor !== m.donoId) out.push("banirAutor");
  if (m.autor && m.autor !== m.eu) out.push("denunciar");
  return out;
}
