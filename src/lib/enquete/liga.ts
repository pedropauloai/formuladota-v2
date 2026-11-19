// Enquete da Liga do FORMULADOTA: as regras puras (sem banco nem Next), testadas em liga.test.ts.
// A coluna direita mostra Sim, Talvez e Não; depois do voto aparece quantos disseram Sim e a barra
// até a meta. Banco em server.ts; voto na server action src/actions/enquete.ts.

export const ENQUETE_LIGA = "liga_formuladota";

/** A liga volta com 50 "Sim" (pedido do Pedro em 19/11/2026). */
export const META_LIGA = 50;

export const RESPOSTAS = ["sim", "talvez", "nao"] as const;
export type Resposta = (typeof RESPOSTAS)[number];

export interface Contagem {
  sim: number;
  talvez: number;
  nao: number;
}

/** O que a tela recebe. Talvez e Não só chegam para o admin; para os demais vêm null. */
export interface EnqueteEstado {
  minha: Resposta | null;
  sim: number;
  talvez: number | null;
  nao: number | null;
}

export function isResposta(valor: unknown): valor is Resposta {
  return typeof valor === "string" && (RESPOSTAS as readonly string[]).includes(valor);
}

/** Recorta a contagem para quem está vendo: só o admin leva Talvez e Não. */
export function estadoParaQuemVe(contagem: Contagem, minha: Resposta | null, isAdmin: boolean): EnqueteEstado {
  return {
    minha,
    sim: contagem.sim,
    talvez: isAdmin ? contagem.talvez : null,
    nao: isAdmin ? contagem.nao : null,
  };
}

/** Voto otimista: marca a resposta nova e passa o voto da resposta antiga para ela na contagem visível. */
export function aplicarVoto(estado: EnqueteEstado, resposta: Resposta): EnqueteEstado {
  if (estado.minha === resposta) return estado;
  const delta = (r: Resposta) => (r === resposta ? 1 : 0) - (r === estado.minha ? 1 : 0);
  const mover = (valor: number | null, r: Resposta) => (valor === null ? null : Math.max(0, valor + delta(r)));
  return {
    minha: resposta,
    sim: Math.max(0, estado.sim + delta("sim")),
    talvez: mover(estado.talvez, "talvez"),
    nao: mover(estado.nao, "nao"),
  };
}

/** Largura da barra em %: arredonda para baixo (nunca mostra mais do que tem) e para em 100. */
export function progressoDaMeta(sim: number, meta: number = META_LIGA): number {
  if (meta <= 0 || sim <= 0) return 0;
  return Math.min(100, Math.floor((sim * 100) / meta));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Id do aparelho guardado no cookie; fora do formato é ignorado e o visitante ganha um novo. */
export function lerIdDoAparelho(valor: string | null | undefined): string | null {
  return valor && UUID.test(valor) ? valor : null;
}

/** Chave do voto, no formato que o check da migration 180 exige: a conta ou o aparelho. */
export function chaveDoVoto(quem: { userId: string } | { aparelhoId: string }): string {
  return "userId" in quem ? `u:${quem.userId}` : `d:${quem.aparelhoId}`;
}

/** O voto que vale para quem vê: o da conta; sem ele, o que o aparelho deu antes de entrar. */
export function votoDeQuemVe(
  linhas: { voter_key: string; answer: string }[],
  chaveConta: string | null,
  chaveAparelho: string | null
): Resposta | null {
  const resposta = (chave: string | null) => (chave ? linhas.find((l) => l.voter_key === chave)?.answer : undefined);
  const valor = resposta(chaveConta) ?? resposta(chaveAparelho);
  return isResposta(valor) ? valor : null;
}
