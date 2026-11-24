// Canais do servidor FORMULADOTA pelo painel do PPA: criar, renomear, ordenar, mudar o modo de voz, o
// público e quem escreve, e apagar. Quem chama confere antes que é admin; o nome passa pela mesma regra
// da tela (normalizarNome). Apagar encerra a sala: quem está dentro sai, e o chat segue o prazo de guarda.

import "server-only";
import { closeRoom } from "./admin";
import { categoriaDe, moverCanal, normalizarNome, proximaPosicao, type CanalOrdem, type Categoria } from "./canais";
import { getSettings, type Db } from "./dados-sala";
import { forgetRoomState } from "./estado";
import { esquecerCanais } from "./lista-canais";
import type { RoomKind, VoiceMode } from "./tipos";

/** Canal fica aberto até o PPA apagar. */
export const CANAL_FECHA_EM = "2100-01-01T00:00:00.000Z";
const TEXTO_LUGARES = 200;

export type Resultado = { ok: true; id?: string } | { ok: false; erro: string };

const ERRO_NOME = {
  nome_curto: "O nome precisa de 2 letras ou mais.",
  nome_longo: "O nome cabe em 40 letras.",
  nome_invalido: "Use só letras, números e espaço (no canal de texto, hífen no lugar do espaço).",
} as const;

export interface CanalAdmin {
  id: string;
  titulo: string;
  categoria: Categoria;
  modo: VoiceMode;
  beneficio: boolean;
  chatAberto: boolean;
  posicao: number;
}

type Linha = { id: string; kind: string; title: string; voice_mode: string; audience: string; chat_open: boolean; channel_position: number | null; is_test: boolean };

function canal(r: Linha): CanalAdmin {
  return {
    id: r.id, titulo: r.title, categoria: categoriaDe(r.kind as RoomKind), modo: r.voice_mode as VoiceMode,
    beneficio: r.audience === "beneficio", chatAberto: r.chat_open, posicao: r.channel_position ?? 0,
  };
}

export async function listChannels(db: Db, isTest: boolean): Promise<CanalAdmin[]> {
  const { data, error } = await db
    .from("voice_rooms")
    .select("id, kind, title, voice_mode, audience, chat_open, channel_position, is_test")
    .eq("status", "aberta")
    .eq("is_test", isTest)
    .not("channel_position", "is", null)
    .order("channel_position")
    .order("created_at");
  if (error) throw new Error(`ler os canais: ${error.message}`);
  return (data ?? []).map(canal);
}

async function channelById(db: Db, id: string): Promise<Linha | null> {
  const { data } = await db
    .from("voice_rooms")
    .select("id, kind, title, voice_mode, audience, chat_open, channel_position, is_test")
    .eq("id", id)
    .eq("status", "aberta")
    .not("channel_position", "is", null)
    .maybeSingle();
  return data;
}

function mudou(id: string): void {
  esquecerCanais();
  forgetRoomState(id);
}

export interface NovoCanal {
  nome: string;
  categoria: Categoria;
  modo: VoiceMode;
  beneficio: boolean;
  isTest?: boolean;
}

export async function createChannel(db: Db, adminId: string, input: NovoCanal): Promise<Resultado> {
  const nome = normalizarNome(input.nome, input.categoria);
  if (!nome.ok) return { ok: false, erro: ERRO_NOME[nome.erro] };
  const isTest = input.isTest ?? false;
  const [atuais, settings] = await Promise.all([listChannels(db, isTest), getSettings(db)]);
  const texto = input.categoria === "texto";
  const { data, error } = await db
    .from("voice_rooms")
    .insert({
      kind: texto ? "texto" : "palco", title: nome.nome, owner_id: adminId, voice_mode: texto ? "palco" : input.modo,
      max_members: texto ? TEXTO_LUGARES : settings.palcoMaxMembers, audience: input.beneficio ? "beneficio" : "todos",
      closes_at: CANAL_FECHA_EM, channel_position: proximaPosicao(atuais, input.categoria), is_test: isTest,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: `Não deu para criar o canal: ${error?.message ?? "sem retorno"}` };
  await db.from("voice_room_members").insert({ room_id: data.id, user_id: adminId, role: "dono", joined_via: "dono" });
  esquecerCanais();
  return { ok: true, id: data.id };
}

export async function renameChannel(db: Db, id: string, bruto: string): Promise<Resultado> {
  const atual = await channelById(db, id);
  if (!atual) return { ok: false, erro: "Canal não encontrado." };
  const nome = normalizarNome(bruto, categoriaDe(atual.kind as RoomKind));
  if (!nome.ok) return { ok: false, erro: ERRO_NOME[nome.erro] };
  const { error } = await db.from("voice_rooms").update({ title: nome.nome }).eq("id", id);
  if (error) return { ok: false, erro: `Não deu para renomear: ${error.message}` };
  mudou(id);
  return { ok: true };
}

export async function moveChannel(db: Db, id: string, direcao: "cima" | "baixo"): Promise<Resultado> {
  const atual = await channelById(db, id);
  if (!atual) return { ok: false, erro: "Canal não encontrado." };
  const ordem: CanalOrdem[] = (await listChannels(db, atual.is_test)).map((c) => ({ id: c.id, categoria: c.categoria, posicao: c.posicao }));
  for (const p of moverCanal(ordem, id, direcao)) {
    const { error } = await db.from("voice_rooms").update({ channel_position: p.posicao }).eq("id", p.id);
    if (error) return { ok: false, erro: `Não deu para mover: ${error.message}` };
  }
  esquecerCanais();
  return { ok: true };
}

/** Palco: a plateia ouve e o dono chama. Livre: todo mundo fala. A linha de quem está dentro muda junto. */
export async function setChannelMode(db: Db, id: string, modo: VoiceMode): Promise<Resultado> {
  const atual = await channelById(db, id);
  if (!atual || atual.kind !== "palco") return { ok: false, erro: "Só canal de voz tem modo." };
  const { error } = await db.from("voice_rooms").update({ voice_mode: modo }).eq("id", id);
  if (error) return { ok: false, erro: `Não deu para mudar o modo: ${error.message}` };
  const [de, para] = modo === "livre" ? ["ouvinte", "falante"] : ["falante", "ouvinte"];
  await db.from("voice_room_members").update({ role: para, hand_raised_at: null }).eq("room_id", id).eq("status", "ativo").eq("role", de);
  mudou(id);
  return { ok: true };
}

export async function setChannelAudience(db: Db, id: string, beneficio: boolean): Promise<Resultado> {
  const { data, error } = await db.from("voice_rooms").update({ audience: beneficio ? "beneficio" : "todos" }).eq("id", id).eq("status", "aberta").not("channel_position", "is", null).select("id");
  if (error || !data?.length) return { ok: false, erro: "Canal não encontrado." };
  mudou(id);
  return { ok: true };
}

/** Chat fechado: só o dono escreve (um canal de avisos, por exemplo). */
export async function setChannelChat(db: Db, id: string, aberto: boolean): Promise<Resultado> {
  const { data, error } = await db.from("voice_rooms").update({ chat_open: aberto }).eq("id", id).eq("status", "aberta").not("channel_position", "is", null).select("id");
  if (error || !data?.length) return { ok: false, erro: "Canal não encontrado." };
  mudou(id);
  return { ok: true };
}

export async function deleteChannel(db: Db, id: string, now: Date): Promise<Resultado> {
  const atual = await channelById(db, id);
  if (!atual) return { ok: false, erro: "Canal não encontrado." };
  await closeRoom(db, id, now);
  mudou(id);
  return { ok: true };
}
