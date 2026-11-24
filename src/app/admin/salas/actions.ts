"use server";

// Ações do painel de salas de voz: só admin, com a flag ligada (a flag é autoritativa).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/app/admin/pros/admin-gate";
import { salaVozOn } from "@/lib/sala/flag";
import { closeRoom, createMentoriaRoom, createPalcoRoom, createPartyRoom, regenerateInvite, unban, type CriarResultado } from "@/lib/sala/admin";
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

export async function abrirSalaPublica(soBeneficio: boolean): Promise<CriarResultado> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  const res = await createPalcoRoom(createServiceClient(), g.adminId, soBeneficio ? "beneficio" : "todos", new Date());
  revalidatePath("/admin/salas");
  return res;
}

export async function desbanir(userId: string): Promise<{ ok: boolean; erro?: string }> {
  const g = await gate();
  if (!g.ok) return { ok: false, erro: g.erro };
  if (!Uuid.safeParse(userId).success) return { ok: false, erro: "Pessoa inválida." };
  await unban(createServiceClient(), g.adminId, userId);
  revalidatePath("/admin/salas");
  return { ok: true };
}
