"use server";

// Server Actions — CRUD de seasons (/admin/temporadas). Migration 012.
//
// Invariante do banco: índice único parcial `seasons_only_one_active`
// (no máximo 1 row com active=true). Ordem segura na ativação: desativa a
// ativa atual ANTES de ativar a alvo — pior caso (segunda query falha) é
// ficar momentaneamente sem season ativa (estado válido; admin re-tenta).
// O índice único é a última linha de defesa contra 2 ativas.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import {
  requireAdmin,
  logAdmin,
  type ActionResult,
} from "@/app/admin/pros/admin-gate";

const SeasonIdSchema = z.number().int().positive("ID de season inválido.");

const CreateSeasonSchema = z.object({
  name: z.string().trim().min(3, "Nome mínimo 3 caracteres.").max(80, "Nome máximo 80."),
  startedAt: z.string().trim().optional(),
  prizePool: z.number().min(0, "Prize pool não pode ser negativo.").max(1_000_000).optional(),
});

function revalidateSeasonRoutes(): void {
  revalidatePath("/admin/temporadas");
  revalidatePath("/ranking");
}

/** Cria season INATIVA (ativação é ação separada — nunca viola a unique). */
export async function createSeason(input: {
  name: string;
  startedAt?: string;
  prizePool?: number;
}): Promise<ActionResult> {
  const parsed = CreateSeasonSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Input inválido." };
  }
  const { name, startedAt, prizePool } = parsed.data;

  let startedISO: string | undefined;
  if (startedAt) {
    const d = new Date(startedAt);
    if (Number.isNaN(d.getTime())) return { success: false, error: "Data de início inválida." };
    startedISO = d.toISOString();
  }

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: created, error } = await service
    .from("seasons")
    .insert({
      name,
      active: false,
      ...(startedISO ? { started_at: startedISO } : {}),
      ...(prizePool !== undefined ? { prize_pool: prizePool } : {}),
    })
    .select("id")
    .single();
  if (error) return { success: false, error: "Erro ao criar season: " + error.message };

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "create_season",
    reason: `Season criada: ${name}`,
    payload: { season_id: created?.id, name, started_at: startedISO, prize_pool: prizePool },
  });

  revalidateSeasonRoutes();
  return { success: true };
}

/** Ativa uma season (desativando a atual antes). Season encerrada não reabre. */
export async function activateSeason(input: { seasonId: number }): Promise<ActionResult> {
  const parsedId = SeasonIdSchema.safeParse(input.seasonId);
  if (!parsedId.success) return { success: false, error: parsedId.error.issues[0]?.message ?? "ID inválido." };
  const seasonId = parsedId.data;

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();

  const { data: target } = await service
    .from("seasons")
    .select("id, name, active, ended_at")
    .eq("id", seasonId)
    .maybeSingle();
  if (!target) return { success: false, error: "Season não encontrada." };
  if (target.active) return { success: false, error: "Season já está ativa." };
  if (target.ended_at) {
    return { success: false, error: "Season encerrada não pode ser reativada." };
  }

  // 1. Desativa a ativa atual (se houver) — garante a unique antes do passo 2.
  const { error: deactErr } = await service
    .from("seasons")
    .update({ active: false })
    .eq("active", true);
  if (deactErr) return { success: false, error: "Erro ao desativar season atual: " + deactErr.message };

  // 2. Ativa a alvo.
  const { error: actErr } = await service
    .from("seasons")
    .update({ active: true })
    .eq("id", seasonId);
  if (actErr) {
    return {
      success: false,
      error: "Erro ao ativar (a anterior já foi desativada — re-tente): " + actErr.message,
    };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "activate_season",
    reason: `Season ativada: ${target.name}`,
    payload: { season_id: seasonId },
  });

  revalidateSeasonRoutes();
  return { success: true };
}

/** Desativa a season (sem encerrar — pode ser reativada depois). */
export async function deactivateSeason(input: { seasonId: number }): Promise<ActionResult> {
  const parsedId = SeasonIdSchema.safeParse(input.seasonId);
  if (!parsedId.success) return { success: false, error: parsedId.error.issues[0]?.message ?? "ID inválido." };
  const seasonId = parsedId.data;

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: updated, error } = await service
    .from("seasons")
    .update({ active: false })
    .eq("id", seasonId)
    .eq("active", true)
    .select("id, name");
  if (error) return { success: false, error: "Erro ao desativar: " + error.message };
  if (!updated || updated.length === 0) {
    return { success: false, error: "Season não estava ativa." };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "deactivate_season",
    reason: `Season desativada: ${updated[0]?.name ?? seasonId}`,
    payload: { season_id: seasonId },
  });

  revalidateSeasonRoutes();
  return { success: true };
}

/** Encerra a season (ended_at = now, active = false). Irreversível. */
export async function endSeason(input: { seasonId: number }): Promise<ActionResult> {
  const parsedId = SeasonIdSchema.safeParse(input.seasonId);
  if (!parsedId.success) return { success: false, error: parsedId.error.issues[0]?.message ?? "ID inválido." };
  const seasonId = parsedId.data;

  const gate = await requireAdmin();
  if (!gate.ok) return { success: false, error: gate.error };

  const service = createServiceClient();
  const { data: updated, error } = await service
    .from("seasons")
    .update({ ended_at: new Date().toISOString(), active: false })
    .eq("id", seasonId)
    .is("ended_at", null)
    .select("id, name");
  if (error) return { success: false, error: "Erro ao encerrar: " + error.message };
  if (!updated || updated.length === 0) {
    return { success: false, error: "Season não encontrada ou já encerrada." };
  }

  await logAdmin({
    adminId: gate.adminId,
    targetUserId: null,
    action: "end_season",
    reason: `Season encerrada: ${updated[0]?.name ?? seasonId}`,
    payload: { season_id: seasonId },
  });

  revalidateSeasonRoutes();
  return { success: true };
}
