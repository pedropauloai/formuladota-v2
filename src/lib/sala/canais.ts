// Lista de canais do servidor FORMULADOTA (a coluna da esquerda, como no Discord): o nome do canal, a
// ordem dentro da categoria, a lista pronta para a tela e para onde vai quem abre /sala. Funções puras.

import { displayAvatar, displayName } from "@/lib/identity";
import type { CanalBruto, PrivadaBruta } from "./contratos";
import type { MemberRole, RoomKind, VoiceMode } from "./tipos";

export type Categoria = "texto" | "voz";
export const NOME_MIN = 2;
export const NOME_MAX = 40;
const TEXTO_OK = /^[\p{L}\p{N}_-]+$/u;
const VOZ_OK = /^[\p{L}\p{N} _\-.,:!?'()&]+$/u;

export type NomeCanal = { ok: true; nome: string } | { ok: false; erro: "nome_curto" | "nome_longo" | "nome_invalido" };

/** Canal de texto: minúsculo, com hífen no lugar do espaço (como no Discord). Canal de voz: como foi escrito. */
export function normalizarNome(bruto: string, categoria: Categoria): NomeCanal {
  const limpo = bruto.normalize("NFC").replace(/\s+/g, " ").trim();
  const nome = categoria === "texto" ? limpo.toLocaleLowerCase("pt-BR").replace(/ /g, "-").replace(/-{2,}/g, "-") : limpo;
  if (nome.length < NOME_MIN) return { ok: false, erro: "nome_curto" };
  if (nome.length > NOME_MAX) return { ok: false, erro: "nome_longo" };
  if (!(categoria === "texto" ? TEXTO_OK : VOZ_OK).test(nome)) return { ok: false, erro: "nome_invalido" };
  return { ok: true, nome };
}

export interface CanalOrdem {
  id: string;
  categoria: Categoria;
  posicao: number;
}

export function categoriaDe(kind: RoomKind): Categoria {
  return kind === "texto" ? "texto" : "voz";
}

/** Sobe ou desce um canal dentro da categoria e renumera de 10 em 10 (posições empatadas também trocam).
 *  Devolve só as posições que mudaram; na ponta, nada. */
export function moverCanal(canais: CanalOrdem[], id: string, direcao: "cima" | "baixo"): Array<{ id: string; posicao: number }> {
  const alvo = canais.find((c) => c.id === id);
  if (!alvo) return [];
  const mesma = canais.filter((c) => c.categoria === alvo.categoria).sort((a, b) => a.posicao - b.posicao);
  const i = mesma.findIndex((c) => c.id === id);
  const j = direcao === "cima" ? i - 1 : i + 1;
  const a = mesma[i];
  const b = mesma[j];
  if (!a || !b) return [];
  mesma[i] = b;
  mesma[j] = a;
  return mesma.flatMap((c, k) => (c.posicao === (k + 1) * 10 ? [] : [{ id: c.id, posicao: (k + 1) * 10 }]));
}

/** Canal novo vai para o fim da própria categoria. */
export function proximaPosicao(canais: CanalOrdem[], categoria: Categoria): number {
  const posicoes = canais.filter((c) => c.categoria === categoria).map((c) => c.posicao);
  return posicoes.length ? Math.max(...posicoes) + 10 : 10;
}

export interface PessoaNoCanal {
  userId: string;
  nome: string;
  avatarUrl: string | null;
  papel: MemberRole;
  mutado: boolean;
  tela: boolean;
}

export interface CanalItem {
  id: string;
  titulo: string;
  tipo: RoomKind;
  modo: VoiceMode;
  beneficio: boolean;
  chatAberto: boolean;
  online: number;
  pessoas: PessoaNoCanal[];
  /** Alguém compartilha a tela agora. */
  aoVivo: boolean;
  donoId: string;
}

export interface ListaDeCanais {
  texto: CanalItem[];
  voz: CanalItem[];
  privadas: CanalItem[];
}

function pessoa(m: NonNullable<CanalBruto["m"]>[number]): PessoaNoCanal {
  // Mesma regra de nome do resto do site: nome do Discord primeiro, avatar da Steam primeiro.
  const src = { steamPersona: m.sp, steamAvatar: m.sa, discordUsername: m.nm, discordAvatar: m.av };
  return { userId: m.u, nome: displayName(src), avatarUrl: displayAvatar(src), papel: m.r, mutado: m.mu, tela: !!m.s };
}

function item(c: CanalBruto): CanalItem {
  const pessoas = (c.m ?? []).map(pessoa);
  return {
    id: c.id, titulo: c.t, tipo: c.k, modo: c.v, beneficio: c.a === "beneficio", chatAberto: c.c,
    online: c.n, pessoas, aoVivo: pessoas.some((p) => p.tela), donoId: c.o,
  };
}

function privada(p: PrivadaBruta): CanalItem {
  return { id: p.id, titulo: p.t, tipo: p.k, modo: "palco", beneficio: false, chatAberto: false, online: p.n, pessoas: [], aoVivo: false, donoId: p.o };
}

export function montarLista(canais: CanalBruto[], privadas: PrivadaBruta[]): ListaDeCanais {
  const itens = canais.map(item);
  return { texto: itens.filter((c) => c.tipo === "texto"), voz: itens.filter((c) => c.tipo !== "texto"), privadas: privadas.map(privada) };
}

/** Quem abre /sala vai para o canal de voz em modo palco onde o dono está (a live); senão, para o
 *  primeiro canal de texto; sem ele, o primeiro de voz. Sala privada nunca é o destino. */
export function destinoInicial(lista: ListaDeCanais): string | null {
  const live = lista.voz.find((c) => c.modo === "palco" && c.pessoas.some((p) => p.papel === "dono"));
  return live?.id ?? lista.texto[0]?.id ?? lista.voz[0]?.id ?? null;
}
