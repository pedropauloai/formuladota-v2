"use server";

// Server Actions admin PROs — MVP fichas com lifecycle correto.
//
// Lifecycle:
//   entry.status:  waiting -> in_match -> consumed (ficha sai)
//                              ↓
//                          cancelled
//
//   match.status:  agendada -> realizada (trigger consome fichas)
//                          -> cancelada (sem cobrança)
//
// Ficha só é cobrada quando match vira realizada (via trigger PG).

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchOpenDotaMatch, normalizePlayers } from "@/lib/dota/opendota";
import { sendPTConfirmedEmail } from "@/lib/resend";

const STEAM_64_OFFSET = 76561197960265728n;
function steam64To32(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_64_OFFSET);
}

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

async function requireCoach(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, coach: null, error: "Não autenticado." } as const;
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, ativo, profile_id")
    .eq("profile_id", user.id)
    .single();
  if (!coach) return { user, coach: null, error: "Você não é PRO." } as const;
  return { user, coach, error: null } as const;
}

// ============== togglePROFila ==============
// Ao fechar fila, cancela todas entries waiting do coach (cascade).

export async function togglePROFila(
  open: boolean
): Promise<ActionResult<{ filaAberta: boolean; cancelledEntries: number }>> {
  const supabase = await createClient();
  const { coach, error: authErr } = await requireCoach(supabase);
  if (!coach) return { success: false, error: authErr };
  if (!coach.ativo) return { success: false, error: "Seu perfil PRO está inativo." };

  const { error } = await supabase
    .from("coaches")
    .update({
      fila_aberta: open,
      fila_aberta_em: open ? new Date().toISOString() : null,
    })
    .eq("id", coach.id);
  if (error) return { success: false, error: "Erro ao atualizar fila." };

  let cancelledEntries = 0;
  if (!open) {
    // Fechando: cancelar todas entries waiting via função PG
    const { data, error: cancelErr } = await supabase.rpc(
      "cancel_pro_waiting_entries",
      { p_coach_id: coach.id, p_reason: "Fila fechada pelo PRO" }
    );
    if (cancelErr) {
      console.error("[togglePROFila] cancel waiting falhou", cancelErr.message);
    } else {
      cancelledEntries = (data as number) ?? 0;
    }
  }

  revalidatePath("/");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  revalidatePath("/admin/pros");
  return { success: true, data: { filaAberta: open, cancelledEntries } };
}

// ============== startPT ==============
// Marca entries como 'in_match' (não consume ainda). Match status='agendada'.
// Ficha só sai quando PRO confirma como realizada via confirmPTRealized
// ou enrichMatchFromOpenDota.

export async function startPT(
  entryIds: string[]
): Promise<ActionResult<{ matchId: string }>> {
  if (entryIds.length === 0) {
    return { success: false, error: "Selecione ao menos 1 aluno." };
  }
  if (entryIds.length > 4) {
    return { success: false, error: "Máximo 4 alunos por PT." };
  }

  const supabase = await createClient();
  const { coach, error: authErr } = await requireCoach(supabase);
  if (!coach) return { success: false, error: authErr };

  const { data: entries, error: entriesErr } = await supabase
    .from("coach_queue_entries")
    .select("id, user_id, status, coach_id")
    .in("id", entryIds);
  if (entriesErr || !entries || entries.length !== entryIds.length) {
    return { success: false, error: "Entries inválidas." };
  }
  for (const e of entries) {
    if (e.coach_id !== coach.id) {
      return { success: false, error: "Uma das entries não pertence à sua fila." };
    }
    if (e.status !== "waiting") {
      return { success: false, error: "Uma das entries não está mais aguardando." };
    }
  }

  // Cria match com status='agendada' (ficha sai quando virar 'realizada')
  const nowISO = new Date().toISOString();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert({
      coach_id: coach.id,
      data_agendada: nowISO,
      status: "agendada",
    } as never)
    .select("id")
    .single();
  if (matchErr || !match) {
    return {
      success: false,
      error: "Erro ao criar PT: " + (matchErr?.message ?? "desconhecido"),
    };
  }

  // Marcar entries como in_match + link ao match (sem cobrar ficha ainda)
  const { error: updErr } = await supabase
    .from("coach_queue_entries")
    .update({
      status: "in_match",
      match_id: match.id,
    } as never)
    .in("id", entryIds);
  if (updErr) {
    return { success: false, error: "PT criada mas erro ao marcar entries." };
  }

  revalidatePath("/");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  revalidatePath("/admin/pros");
  return { success: true, data: { matchId: match.id } };
}

// ============== confirmPTRealized ==============
// PRO confirma que partida ocorreu sem buscar dados OpenDota. Trigger PG
// dispara consume_pt_fichas e cobra todas entries in_match desse match.

export async function confirmPTRealized(
  matchId: string
): Promise<ActionResult<{ matchId: string }>> {
  const supabase = await createClient();
  const { coach, error: authErr } = await requireCoach(supabase);
  if (!coach) return { success: false, error: authErr };

  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, status")
    .eq("id", matchId)
    .single();
  if (!match) return { success: false, error: "PT não encontrada." };
  if (match.coach_id !== coach.id) {
    return { success: false, error: "PT não pertence a você." };
  }
  if (match.status !== "agendada") {
    return { success: false, error: `PT já está ${match.status}.` };
  }

  // Trigger trg_match_realizada vai chamar consume_pt_fichas
  const { error } = await supabase
    .from("matches")
    .update({
      status: "realizada",
      enriched_at: new Date().toISOString(),
      match_dataset: "manual",
    })
    .eq("id", matchId);
  if (error) {
    return { success: false, error: "Erro ao confirmar PT: " + error.message };
  }

  // Email não-crítico: notificar alunos que a PT foi confirmada e fichas debitadas.
  void sendPTEmailsToParticipants(supabase, matchId);

  revalidatePath("/admin/pros");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, data: { matchId } };
}

// Busca alunos do match e envia email de confirmação pra cada um (fire-and-forget).
async function sendPTEmailsToParticipants(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string
): Promise<void> {
  try {
    const { data: entries } = await supabase
      .from("coach_queue_entries")
      .select("user_id")
      .eq("match_id", matchId)
      .eq("status", "consumed");

    if (!entries || entries.length === 0) return;

    const userIds = entries.map((e) => e.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, username")
      .in("id", userIds);

    if (!profiles) return;

    await Promise.all(
      profiles.map((p) => {
        if (!p.email) return Promise.resolve();
        return sendPTConfirmedEmail({
          matchId,
          customerEmail: p.email,
          customerName: p.username ?? undefined,
          fichasConsumidas: 1,
        });
      })
    );
  } catch (err) {
    console.error("[confirmPTRealized] email PT falhou:", err);
  }
}

// ============== cancelPT ==============
// PRO desiste da PT antes de confirmar. Marca match=cancelada, entries=cancelled.
// Nenhuma ficha foi cobrada (estavam em in_match), nenhum refund necessário.

export async function cancelPT(
  matchId: string,
  reason: string
): Promise<ActionResult<{ cancelledEntries: number }>> {
  if (!reason || reason.trim().length < 3) {
    return { success: false, error: "Razão obrigatória (mín 3 caracteres)." };
  }

  const supabase = await createClient();
  const { coach, error: authErr } = await requireCoach(supabase);
  if (!coach) return { success: false, error: authErr };

  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, status")
    .eq("id", matchId)
    .single();
  if (!match) return { success: false, error: "PT não encontrada." };
  if (match.coach_id !== coach.id) {
    return { success: false, error: "PT não pertence a você." };
  }
  if (match.status !== "agendada") {
    return {
      success: false,
      error: `Não pode cancelar PT em status ${match.status}.`,
    };
  }

  // Cancelar entries vinculadas (in_match -> cancelled)
  const { error: entriesErr, count } = await supabase
    .from("coach_queue_entries")
    .update({ status: "cancelled" } as never, { count: "exact" })
    .eq("match_id", matchId)
    .eq("status", "in_match");
  if (entriesErr) {
    return { success: false, error: "Erro ao cancelar entries: " + entriesErr.message };
  }

  // Marcar match como cancelada
  const { error: matchErr } = await supabase
    .from("matches")
    .update({
      status: "cancelada",
      notas_pedro: reason.trim(),
    })
    .eq("id", matchId);
  if (matchErr) {
    return { success: false, error: "Erro ao cancelar match: " + matchErr.message };
  }

  revalidatePath("/admin/pros");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, data: { cancelledEntries: count ?? 0 } };
}

// ============== removeFromQueue ==============
// PRO remove aluno específico da própria fila. Ficha fica intacta.

export async function removeFromQueue(
  entryId: string,
  reason: string
): Promise<ActionResult<{ entryId: string }>> {
  const supabase = await createClient();
  const { coach, error: authErr } = await requireCoach(supabase);
  if (!coach) return { success: false, error: authErr };

  const { data: entry } = await supabase
    .from("coach_queue_entries")
    .select("id, coach_id, status")
    .eq("id", entryId)
    .single();
  if (!entry) return { success: false, error: "Entry não encontrada." };
  if (entry.coach_id !== coach.id) {
    return { success: false, error: "Entry não pertence à sua fila." };
  }
  if (entry.status !== "waiting") {
    return { success: false, error: `Entry já está ${entry.status}.` };
  }

  const { error } = await supabase
    .from("coach_queue_entries")
    .update({ status: "cancelled" } as never)
    .eq("id", entryId);
  if (error) {
    return { success: false, error: "Erro ao remover: " + error.message };
  }

  revalidatePath("/");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  revalidatePath("/admin/pros");
  return { success: true, data: { entryId } };
}

// ============== enrichMatchFromOpenDota ==============
// Busca dados OpenDota e popula match_players. Se match ainda está em
// status='agendada', dispara trigger que consome fichas.

export async function enrichMatchFromOpenDota(
  matchId: string,
  dotaMatchId: string
): Promise<ActionResult<{ playersInserted: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, enriched_at, status")
    .eq("id", matchId)
    .single();
  if (!match) return { success: false, error: "Match não encontrado." };

  if (!isAdmin) {
    const { data: coach } = await supabase
      .from("coaches")
      .select("id")
      .eq("profile_id", user.id)
      .single();
    if (!coach || coach.id !== match.coach_id) {
      return { success: false, error: "Sem permissão pra enriquecer essa PT." };
    }
  }

  if (match.enriched_at) {
    return { success: false, error: "Match já foi enriquecido anteriormente." };
  }
  if (match.status === "cancelada") {
    return { success: false, error: "PT cancelada — não há o que enriquecer." };
  }

  let opendotaMatch;
  try {
    opendotaMatch = await fetchOpenDotaMatch(dotaMatchId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return { success: false, error: "Erro OpenDota: " + msg };
  }

  const normalized = normalizePlayers(opendotaMatch);

  const accountIds = normalized.map((p) => p.steam_account_id).filter((id) => id > 0);
  const steamId64Strings = accountIds.map((aid) =>
    (BigInt(aid) + STEAM_64_OFFSET).toString()
  );

  const { data: links } = await supabase
    .from("steam_links")
    .select("user_id, steam_id_64")
    .in("steam_id_64", steamId64Strings);

  const steamToUserId = new Map<number, string>();
  for (const link of links ?? []) {
    const account32 = steam64To32(link.steam_id_64);
    steamToUserId.set(account32, link.user_id);
  }

  const { data: coachWithProfile } = await supabase
    .from("coaches")
    .select("profile_id")
    .eq("id", match.coach_id ?? "")
    .single();
  const proProfileId = coachWithProfile?.profile_id ?? null;

  const playerRows = normalized.map((p) => {
    const userId = steamToUserId.get(p.steam_account_id) ?? null;
    return {
      match_id: matchId,
      steam_account_id: p.steam_account_id,
      user_id: userId,
      is_pro: userId !== null && userId === proProfileId,
      team: p.team,
      player_slot: p.player_slot,
      is_winner: p.is_winner,
      hero_id: p.hero_id,
      kills: p.kills,
      deaths: p.deaths,
      assists: p.assists,
      gold_per_min: p.gold_per_min,
      xp_per_min: p.xp_per_min,
      last_hits: p.last_hits,
      denies: p.denies,
      net_worth: p.net_worth,
      level: p.level,
      hero_damage: p.hero_damage,
      hero_healing: p.hero_healing,
      tower_damage: p.tower_damage,
      items: p.items,
      raw_opendota: p.raw_opendota as unknown as Record<string, unknown>,
    };
  });

  const { error: insErr } = await supabase
    .from("match_players")
    .insert(playerRows as never);
  if (insErr) {
    return { success: false, error: "Erro ao inserir players: " + insErr.message };
  }

  // Atualizar match. Se status era 'agendada', trigger PG consome fichas.
  const { error: matchUpdErr } = await supabase
    .from("matches")
    .update({
      dota_match_id: String(opendotaMatch.match_id),
      radiant_win: opendotaMatch.radiant_win,
      enriched_at: new Date().toISOString(),
      match_dataset: "opendota",
      duracao_min: Math.round(opendotaMatch.duration / 60),
      status: "realizada",
    })
    .eq("id", matchId);
  if (matchUpdErr) {
    return { success: false, error: "Players salvos mas erro ao atualizar match." };
  }

  revalidatePath("/admin/pros");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, data: { playersInserted: playerRows.length } };
}
