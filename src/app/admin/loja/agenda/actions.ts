"use server";

// Ações do painel da agenda: disponibilidade semanal, bloqueios, lives, horários marcados e entrega
// dos produtos sem horário. O layout /admin já barra quem não é admin, e cada ação confere de novo
// (ação de servidor é endpoint público).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminResult = { ok: true } | { ok: false; error: string };

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  return data?.is_admin === true;
}

const PATH = "/admin/loja/agenda";
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use o formato 19:00.");
const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Data e hora inválidas.");
const uuid = z.string().uuid();

/** "2026-11-20T19:00" no horário de Brasília (UTC-3 o ano todo) para ISO em UTC. */
function brasiliaToIso(local: string): string {
  return new Date(`${local}:00-03:00`).toISOString();
}

async function run(write: () => PromiseLike<{ error: { message: string } | null }>, what: string): Promise<AdminResult> {
  if (!(await isAdmin())) return { ok: false, error: "Só o admin mexe na agenda." };
  const { error } = await write();
  if (error) {
    console.error(`[admin/agenda] ${what} falhou:`, error.message);
    return { ok: false, error: `Não deu para ${what}.` };
  }
  revalidatePath(PATH);
  return { ok: true };
}

export async function adicionarJanela(weekday: number, start: string, end: string): Promise<AdminResult> {
  const parsed = z.object({ weekday: z.number().int().min(0).max(6), start: hhmm, end: hhmm }).safeParse({ weekday, start, end });
  if (!parsed.success || end <= start) return { ok: false, error: "Confira o dia e os horários (o fim vem depois do início)." };
  return run(() => createServiceClient().from("store_availability").insert({ weekday, start_time: start, end_time: end }), "salvar o horário");
}

export async function removerJanela(id: string): Promise<AdminResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Horário inválido." };
  return run(() => createServiceClient().from("store_availability").delete().eq("id", id), "remover o horário");
}

export async function bloquearPeriodo(start: string, end: string, reason: string): Promise<AdminResult> {
  const parsed = z.object({ start: localDateTime, end: localDateTime, reason: z.string().max(120) }).safeParse({ start, end, reason });
  if (!parsed.success || end <= start) return { ok: false, error: "Confira o começo e o fim do bloqueio." };
  return run(
    () => createServiceClient().from("store_blocked_periods").insert({ starts_at: brasiliaToIso(start), ends_at: brasiliaToIso(end), reason: reason.trim() }),
    "salvar o bloqueio"
  );
}

export async function removerBloqueio(id: string): Promise<AdminResult> {
  if (!uuid.safeParse(id).success) return { ok: false, error: "Bloqueio inválido." };
  return run(() => createServiceClient().from("store_blocked_periods").delete().eq("id", id), "remover o bloqueio");
}

export async function marcarLive(input: { start: string; end: string; partySeats: number; replaySeats: number; notes: string }): Promise<AdminResult> {
  const parsed = z
    .object({ start: localDateTime, end: localDateTime, partySeats: z.number().int().min(0).max(100), replaySeats: z.number().int().min(0).max(100), notes: z.string().max(200) })
    .safeParse(input);
  if (!parsed.success || input.end <= input.start) return { ok: false, error: "Confira o horário e as vagas da live." };
  return run(
    () =>
      createServiceClient().from("store_live_sessions").insert({
        starts_at: brasiliaToIso(input.start),
        ends_at: brasiliaToIso(input.end),
        party_seats: input.partySeats,
        replay_seats: input.replaySeats,
        notes: input.notes.trim(),
      }),
    "marcar a live"
  );
}

export async function cancelarLive(id: string): Promise<AdminResult> {
  if (!uuid.safeParse(id).success || !(await isAdmin())) return { ok: false, error: "Live inválida." };
  const { count } = await createServiceClient()
    .from("store_bookings")
    .select("id", { count: "exact", head: true })
    .eq("live_session_id", id)
    .in("status", ["reservado", "confirmado"]);
  // Vaga vendida não some calada: o Pedro resolve com quem comprou antes de cancelar a live.
  if ((count ?? 0) > 0) return { ok: false, error: "Esta live tem vaga vendida. Cancele ou conclua as vagas antes." };
  return run(() => createServiceClient().from("store_live_sessions").update({ status: "cancelada" }).eq("id", id), "cancelar a live");
}

export async function mudarAgendamento(id: string, status: "concluido" | "cancelado"): Promise<AdminResult> {
  if (!uuid.safeParse(id).success || (status !== "concluido" && status !== "cancelado")) return { ok: false, error: "Horário inválido." };
  return run(
    () => createServiceClient().from("store_bookings").update({ status, updated_at: new Date().toISOString() }).eq("id", id).in("status", ["reservado", "confirmado"]),
    status === "concluido" ? "concluir o horário" : "cancelar o horário"
  );
}

export async function salvarEntrega(orderId: string, url: string, note: string): Promise<AdminResult> {
  const parsed = z.object({ orderId: uuid, url: z.union([z.literal(""), z.string().url().startsWith("https://")]), note: z.string().max(1000) }).safeParse({ orderId, url: url.trim(), note });
  if (!parsed.success) return { ok: false, error: "O link precisa começar com https://." };
  const now = new Date().toISOString();
  return run(
    () =>
      createServiceClient()
        .from("store_orders")
        .update({ delivery_url: url.trim() || null, delivery_note: note.trim() || null, fulfilled_at: now, updated_at: now })
        .eq("id", orderId)
        .eq("status", "pago"),
    "salvar a entrega"
  );
}
