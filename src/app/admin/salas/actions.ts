"use server";

// Ações do painel de salas de voz: só admin, com a flag ligada (a flag é autoritativa).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/app/admin/pros/admin-gate";
import { salaVozOn } from "@/lib/sala/flag";
import { canaisDeTeste } from "@/lib/sala/flag-chave";
import { closeRoom, createMentoriaRoom, createPartyRoom, regenerateInvite, unban, type CriarResultado } from "@/lib/sala/admin";
import { createChannel, deleteChannel, moveChannel, renameChannel, setChannelAudience, setChannelChat, setChannelLimit, setChannelMode, type Resultado } from "@/lib/sala/admin-canais";
import { createServiceClient } from "@/lib/supabase/service";

const Uuid = z.string().uuid();

async function gate(): Promise<{ ok: true; adminId: string } | { ok: false; erro: string }> {
  const admin = await requireAdmin();
  if (!admin.ok) return { ok: false, erro: admin.error };
  if (!(await salaVozOn())) return { ok: false, erro: "A flag sala_voz está desligada." };
  return { ok: true, adminId: admin.adminId };
}

export async function criarSalaMentoria(bookingId: string, alunoCompartilha: boolean): Promise<CriarResultado> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(bookingId).success) return { ok: false, erro: "Horário inválido." };
  const res = await createMentoriaRoom(createServiceClient(), g.adminId, bookingId, alunoCompartilha ? "um_por_vez" : "dono", new Date());
  revalidatePath("/admin/salas");
  return res;
}

export async function criarSalaParty(): Promise<CriarResultado> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  const res = await createPartyRoom(createServiceClient(), g.adminId, new Date());
  revalidatePath("/admin/salas");
  return res;
}

export async function novoConvite(roomId: string): Promise<{ ok: true; convite: string } | { ok: false; erro: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(roomId).success) return { ok: false, erro: "Sala inválida." };
  const convite = await regenerateInvite(createServiceClient(), roomId);
  return convite ? { ok: true, convite } : { ok: false, erro: "Só sala de mentoria aberta tem convite." };
}

export async function encerrarSala(roomId: string): Promise<{ ok: boolean; erro?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(roomId).success) return { ok: false, erro: "Sala inválida." };
  await closeRoom(createServiceClient(), roomId, new Date());
  revalidatePath("/admin/salas");
  return { ok: true };
}

export async function desbanir(userId: string): Promise<{ ok: boolean; erro?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(userId).success) return { ok: false, erro: "Pessoa inválida." };
  await unban(createServiceClient(), g.adminId, userId);
  revalidatePath("/admin/salas");
  return { ok: true };
}

// Canais do servidor (a coluna da esquerda da /sala): criar, renomear, ordenar, modo, público, chat e apagar.

const NovoCanalForm = z.object({ nome: z.string().max(200), tipo: z.enum(["texto", "palco", "livre"]), soBeneficio: z.boolean(), limite: z.number().int().min(2).max(200) });
const Limite = z.number().int().min(2).max(200);

async function comCanal(id: string, fazer: (db: ReturnType<typeof createServiceClient>) => Promise<Resultado>): Promise<Resultado> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(id).success) return { ok: false, erro: "Canal inválido." };
  const res = await fazer(createServiceClient());
  revalidatePath("/admin/salas");
  return res;
}

export async function criarCanal(nome: string, tipo: "texto" | "palco" | "livre", soBeneficio: boolean, limite: number): Promise<Resultado> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  const f = NovoCanalForm.safeParse({ nome, tipo, soBeneficio, limite });
  if (!f.success) return { ok: false, erro: "Preencha o nome e o tipo do canal." };
  const res = await createChannel(createServiceClient(), g.adminId, {
    nome: f.data.nome, categoria: f.data.tipo === "texto" ? "texto" : "voz", modo: f.data.tipo === "livre" ? "livre" : "palco", beneficio: f.data.soBeneficio, limite: f.data.limite,
    // No servidor local do e2e, canal de teste: o painel nunca cria canal de produção num teste.
    isTest: canaisDeTeste({ NODE_ENV: process.env.NODE_ENV, SALA_FLAG_KEY: process.env.SALA_FLAG_KEY }),
  });
  revalidatePath("/admin/salas");
  return res;
}

export async function renomearCanal(id: string, nome: string): Promise<Resultado> {
  return comCanal(id, (db) => renameChannel(db, id, String(nome).slice(0, 200)));
}

export async function moverCanalNaLista(id: string, direcao: "cima" | "baixo"): Promise<Resultado> {
  return comCanal(id, (db) => moveChannel(db, id, direcao === "cima" ? "cima" : "baixo"));
}

export async function mudarModoDoCanal(id: string, modo: "palco" | "livre"): Promise<Resultado> {
  return comCanal(id, (db) => setChannelMode(db, id, modo === "livre" ? "livre" : "palco"));
}

export async function mudarPublicoDoCanal(id: string, soBeneficio: boolean): Promise<Resultado> {
  return comCanal(id, (db) => setChannelAudience(db, id, soBeneficio === true));
}

export async function mudarLimiteDoCanal(id: string, limite: number): Promise<Resultado> {
  const l = Limite.safeParse(limite);
  if (!l.success) return { ok: false, erro: "O limite vai de 2 a 200 pessoas." };
  return comCanal(id, (db) => setChannelLimit(db, id, l.data));
}

export async function mudarChatDoCanal(id: string, aberto: boolean): Promise<Resultado> {
  return comCanal(id, (db) => setChannelChat(db, id, aberto === true));
}

export async function apagarCanal(id: string): Promise<Resultado> {
  return comCanal(id, (db) => deleteChannel(db, id, new Date()));
}
