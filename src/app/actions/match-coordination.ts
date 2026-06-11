"use server";

// Server Actions de coordenacao de partida (Phase 5 — Bot Discord V1).
//
// startCoordinatedMatch — PRO inicia sessao com 4 alunos selecionados.
//   Valida scope, cria match_session, chama bot pra criar voice channel temp.
//
// finishCoordinatedMatch — PRO finaliza sessao com dota_match_id.
//   Valida match via OpenDota, consome fichas, chama bot pra cleanup.
//
// previewMatchValidation — PRO ve resultado da validacao OpenDota antes de confirmar.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireServerEnv } from "@/lib/env";
import { validateOpendotaMatch } from "@/lib/dota/opendota";

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

/**
 * Verifica que o caller é PRO ativo e retorna { userId, coachId }.
 */
async function requireActivePro(): Promise<{ userId: string; coachId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Nao autenticado.");

  const { data: promo } = await supabase
    .from("pro_promotions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!promo) throw new Error("Acesso negado — voce nao e PRO ativo.");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (!coach) throw new Error("Perfil de coach nao encontrado.");

  return { userId: user.id, coachId: coach.id };
}

/**
 * Chama a API HTTP do bot Discord com autenticacao interna.
 * Lanca erro se BOT_API_URL ou BOT_API_KEY nao estiverem configurados.
 */
async function callBotApi(
  method: "GET" | "POST" | "DELETE",
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; data: unknown; status: number }> {
  const botUrl = requireServerEnv("BOT_API_URL");
  const botKey = requireServerEnv("BOT_API_KEY");

  const res = await fetch(`${botUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": botKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data, status: res.status };
}

// -------------------------------------------------------------------
// startCoordinatedMatch
// -------------------------------------------------------------------

const StartMatchSchema = z.object({
  studentUserIds: z
    .array(z.string().uuid("ID de aluno invalido."))
    .length(4, "Selecione exatamente 4 alunos para iniciar a partida."),
  customRoomName: z
    .string()
    .min(3, "Nome da sala deve ter ao menos 3 caracteres.")
    .max(50, "Nome da sala deve ter no maximo 50 caracteres."),
});

export type StartMatchInput = z.infer<typeof StartMatchSchema>;

export interface StartMatchResult {
  success: boolean;
  matchId?: string;
  voiceChannelId?: string;
  voiceChannelName?: string;
  error?: string;
}

/**
 * Inicia uma sessao de partida coordenada.
 *
 * Fluxo:
 *   1. Valida que caller e PRO ativo
 *   2. Valida que 4 alunos selecionados estao em fila ('waiting') com o PRO
 *   3. Insere row em matches (status='agendada', coach_id, voice_channel_name)
 *   4. Atualiza coach_queue_entries de 'waiting' pra 'in_match' + link match_id
 *   5. Garante sala geral Discord existe (cria se necessario)
 *   6. Cria sala temp Discord (chama bot /api/match-room/create)
 *   7. Atualiza matches.voice_channel_id_discord
 *   8. Revalida /pro
 */
export async function startCoordinatedMatch(
  input: StartMatchInput
): Promise<StartMatchResult> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const parsed = StartMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const { studentUserIds, customRoomName } = parsed.data;
  const service = createServiceClient();
  const supabase = await createClient();

  // Valida que os 4 alunos estao em fila 'waiting' com este coach
  const { data: queueEntries, error: queueErr } = await supabase
    .from("coach_queue_entries")
    .select("id, user_id, status")
    .eq("coach_id", proData.coachId)
    .eq("status", "waiting")
    .in("user_id", studentUserIds);

  if (queueErr) {
    console.error("[startCoordinatedMatch] Erro ao buscar fila:", queueErr.message);
    return { success: false, error: "Erro ao verificar fila de alunos." };
  }

  const foundIds = (queueEntries ?? []).map((e) => e.user_id);
  const missingIds = studentUserIds.filter((id) => !foundIds.includes(id));

  if (missingIds.length > 0) {
    return {
      success: false,
      error: `${missingIds.length} aluno(s) selecionado(s) nao estao na fila ou ja estao em partida.`,
    };
  }

  // Cria row de match (status='agendada')
  const now = new Date().toISOString();
  const { data: matchRow, error: matchErr } = await service
    .from("matches")
    .insert({
      coach_id: proData.coachId,
      status: "agendada",
      data_agendada: now,
      voice_channel_name: customRoomName,
    })
    .select("id")
    .single();

  if (matchErr || !matchRow) {
    console.error("[startCoordinatedMatch] Erro ao criar match:", matchErr?.message);
    return { success: false, error: "Erro ao registrar sessao no banco de dados." };
  }

  const matchId = matchRow.id;

  // Atualiza coach_queue_entries: waiting -> in_match + link match_id
  const entryIds = (queueEntries ?? []).map((e) => e.id);
  await service
    .from("coach_queue_entries")
    .update({ status: "in_match", match_id: matchId })
    .in("id", entryIds);

  // Busca discord_ids dos alunos + PRO para mover
  const allUserIds = [...studentUserIds, proData.userId];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, discord_id")
    .in("id", allUserIds);

  const discordIds = (profiles ?? [])
    .map((p) => p.discord_id)
    .filter((id): id is string => id !== null && id.length > 0);

  // Garante sala geral antes de criar sala temp
  try {
    await callBotApi("POST", "/api/general-room/ensure", {});
  } catch {
    // Sala geral e opcional — nao bloqueia criacao da sala temp
    console.error("[startCoordinatedMatch] Bot nao disponivel para sala geral — continuando.");
  }

  // Cria sala temp Discord
  let voiceChannelId: string | undefined;
  try {
    const botRes = await callBotApi("POST", "/api/match-room/create", {
      customName: customRoomName,
      userDiscordIds: discordIds,
    });

    if (botRes.ok && typeof (botRes.data as Record<string, unknown>).channelId === "string") {
      voiceChannelId = (botRes.data as { channelId: string }).channelId;
    } else {
      console.error("[startCoordinatedMatch] Bot retornou erro ao criar sala:", botRes.data);
    }
  } catch (err) {
    // Bot offline nao deve bloquear a sessao — registra mas continua
    console.error("[startCoordinatedMatch] Bot indisponivel:", (err as Error).message);
  }

  // Atualiza match com voice_channel_id se disponivel
  if (voiceChannelId) {
    await service
      .from("matches")
      .update({ voice_channel_id_discord: voiceChannelId })
      .eq("id", matchId);
  }

  revalidatePath("/pro");

  return {
    success: true,
    matchId,
    voiceChannelId,
    voiceChannelName: customRoomName,
  };
}

// -------------------------------------------------------------------
// finishCoordinatedMatch
// -------------------------------------------------------------------

const FinishMatchSchema = z.object({
  matchId: z.string().uuid("ID de sessao invalido."),
  dotaMatchId: z
    .string()
    .regex(/^\d{8,12}$/, "Match ID Dota deve ter entre 8 e 12 digitos numericos."),
});

export type FinishMatchInput = z.infer<typeof FinishMatchSchema>;

export interface FinishMatchResult {
  success: boolean;
  validated?: boolean;
  validationReason?: string;
  error?: string;
}

/**
 * Finaliza uma sessao de partida.
 *
 * Fluxo:
 *   1. Valida que caller e PRO ativo e dono do match_id
 *   2. Valida match via OpenDota (4/5 participantes + recencia)
 *   3. Atualiza match: status='realizada' + dota_match_id + verified
 *      (trigger trg_match_realizada_consume consome fichas automaticamente)
 *   4. Chama bot /api/match-room/:channelId (move users + apaga sala temp)
 *   5. Verifica se fila ficou vazia — se sim, apaga sala geral
 *   6. Revalida /pro
 */
export async function finishCoordinatedMatch(
  input: FinishMatchInput
): Promise<FinishMatchResult> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const parsed = FinishMatchSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const { matchId, dotaMatchId } = parsed.data;
  const supabase = await createClient();
  const service = createServiceClient();

  // Busca match e verifica que e do PRO caller
  const { data: matchRow, error: matchErr } = await supabase
    .from("matches")
    .select("id, status, coach_id, voice_channel_id_discord")
    .eq("id", matchId)
    .eq("coach_id", proData.coachId)
    .maybeSingle();

  if (matchErr || !matchRow) {
    return { success: false, error: "Sessao nao encontrada ou nao pertence a voce." };
  }

  if (matchRow.status !== "agendada") {
    return {
      success: false,
      error: `Sessao ja esta com status "${matchRow.status}" — nao pode ser finalizada novamente.`,
    };
  }

  // Busca alunos da sessao pra validar no OpenDota
  const { data: queueEntries } = await supabase
    .from("coach_queue_entries")
    .select("user_id")
    .eq("match_id", matchId)
    .eq("status", "in_match");

  const studentIds = (queueEntries ?? []).map((e) => e.user_id);
  const allParticipantIds = [...studentIds, proData.userId];

  // Busca steam_ids dos participantes
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, steam_id")
    .in("id", allParticipantIds);

  const steamIds64 = (profiles ?? [])
    .map((p) => p.steam_id)
    .filter((id): id is string => id !== null && id.length > 0);

  // Valida via OpenDota
  const validation = await validateOpendotaMatch(dotaMatchId, steamIds64);

  // Atualiza match no banco
  // status='realizada' dispara trigger trg_match_realizada_consume que consome fichas
  const { error: updateErr } = await service
    .from("matches")
    .update({
      status: "realizada",
      dota_match_id: dotaMatchId,
      dota_match_id_verified: validation.valid,
    })
    .eq("id", matchId);

  if (updateErr) {
    console.error("[finishCoordinatedMatch] Erro ao atualizar match:", updateErr.message);
    return { success: false, error: "Erro ao finalizar sessao no banco de dados." };
  }

  // Limpa voice channel temp via bot
  const voiceChannelId = matchRow.voice_channel_id_discord as string | null;

  if (voiceChannelId) {
    try {
      await callBotApi("DELETE", `/api/match-room/${voiceChannelId}`);
    } catch (err) {
      // Bot offline nao bloqueia a finalizacao — match ja foi salvo
      console.error("[finishCoordinatedMatch] Bot indisponivel para cleanup:", (err as Error).message);
    }
  }

  // Verifica se fila ficou vazia para apagar sala geral
  const { count: waitingCount } = await supabase
    .from("coach_queue_entries")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", proData.coachId)
    .eq("status", "waiting");

  const { count: activeMatchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("coach_id", proData.coachId)
    .eq("status", "agendada");

  if ((waitingCount ?? 0) === 0 && (activeMatchCount ?? 0) === 0) {
    try {
      await callBotApi("DELETE", "/api/general-room");
    } catch {
      // Ignorar erro de cleanup da sala geral
    }
  }

  revalidatePath("/pro");

  return {
    success: true,
    validated: validation.valid,
    validationReason: validation.reason,
  };
}

// -------------------------------------------------------------------
// previewMatchValidation — preview antes de confirmar (nao muta DB)
// -------------------------------------------------------------------

const PreviewValidationSchema = z.object({
  matchId: z.string().uuid(),
  dotaMatchId: z
    .string()
    .regex(/^\d{8,12}$/, "Match ID Dota deve ter entre 8 e 12 digitos numericos."),
});

export type PreviewValidationInput = z.infer<typeof PreviewValidationSchema>;

export interface PreviewValidationResult {
  success: boolean;
  valid?: boolean;
  reason?: string;
  participantsFound?: number;
  participantsExpected?: number;
  error?: string;
}

/**
 * Faz preview da validacao OpenDota sem modificar o banco.
 * Usado pelo modal de finalizacao para mostrar resultado antes de confirmar.
 */
export async function previewMatchValidation(
  input: PreviewValidationInput
): Promise<PreviewValidationResult> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const parsed = PreviewValidationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0]?.message };
  }

  const supabase = await createClient();

  // Busca participantes da sessao
  const { data: queueEntries } = await supabase
    .from("coach_queue_entries")
    .select("user_id")
    .eq("match_id", parsed.data.matchId)
    .eq("status", "in_match");

  const studentIds = (queueEntries ?? []).map((e) => e.user_id);
  const allParticipantIds = [...studentIds, proData.userId];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, steam_id")
    .in("id", allParticipantIds);

  const steamIds64 = (profiles ?? [])
    .map((p) => p.steam_id)
    .filter((id): id is string => id !== null && id.length > 0);

  const result = await validateOpendotaMatch(parsed.data.dotaMatchId, steamIds64);

  return {
    success: true,
    valid: result.valid,
    reason: result.reason,
    participantsFound: result.matchData?.participantsFound,
    participantsExpected: result.matchData?.participantsExpected,
  };
}

// -------------------------------------------------------------------
// getActiveMatchSession — busca match ativo do PRO (para o painel)
// -------------------------------------------------------------------

export interface ActiveMatchSession {
  matchId: string;
  voiceChannelId: string | null;
  voiceChannelName: string | null;
  startedAt: string;
  students: Array<{
    userId: string;
    username: string | null;
    avatarUrl: string | null;
  }>;
}

/**
 * Retorna a sessao ativa (status='agendada') do PRO logado, se existir.
 * Inclui lista de alunos vinculados via coach_queue_entries.
 */
export async function getActiveMatchSession(): Promise<{
  success: boolean;
  data?: ActiveMatchSession | null;
  error?: string;
}> {
  let proData: { userId: string; coachId: string };

  try {
    proData = await requireActivePro();
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }

  const supabase = await createClient();

  const { data: matchRow, error: matchErr } = await supabase
    .from("matches")
    .select("id, status, voice_channel_id_discord, voice_channel_name, created_at")
    .eq("coach_id", proData.coachId)
    .eq("status", "agendada")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (matchErr) {
    return { success: false, error: "Erro ao buscar sessao ativa." };
  }

  if (!matchRow) {
    return { success: true, data: null };
  }

  // Busca alunos da sessao
  const { data: queueEntries } = await supabase
    .from("coach_queue_entries")
    .select("user_id")
    .eq("match_id", matchRow.id)
    .eq("status", "in_match");

  const studentIds = (queueEntries ?? []).map((e) => e.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", studentIds.length > 0 ? studentIds : ["00000000-0000-0000-0000-000000000000"]);

  const students = (profiles ?? []).map((p) => ({
    userId: p.id,
    username: p.username,
    avatarUrl: p.avatar_url,
  }));

  return {
    success: true,
    data: {
      matchId: matchRow.id,
      voiceChannelId: matchRow.voice_channel_id_discord as string | null,
      voiceChannelName: matchRow.voice_channel_name as string | null,
      startedAt: matchRow.created_at,
      students,
    },
  };
}
