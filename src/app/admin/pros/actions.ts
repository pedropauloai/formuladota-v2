"use server";

// Server Actions admin PROs — MVP fichas.
//   - togglePROFila: PRO logado abre/fecha sua fila pública
//   - startPT: PRO consome N fichas selecionadas, cria 1 match (PT)
//   - enrichMatchFromOpenDota: chama OpenDota e popula match_players (10 linhas)
//
// Permissões: PRO atual = profile com row em coaches. Validação via auth.uid()
// + lookup em coaches.profile_id. Admin sempre passa.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fetchOpenDotaMatch, normalizePlayers } from "@/lib/dota/opendota";

// Steam ID 64 → account_id 32 (OpenDota usa o 32-bit form)
const STEAM_64_OFFSET = 76561197960265728n;
function steam64To32(steamId64: string): number {
  return Number(BigInt(steamId64) - STEAM_64_OFFSET);
}

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

// ============== togglePROFila ==============

export async function togglePROFila(open: boolean): Promise<ActionResult<{ filaAberta: boolean }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Achar coach do user
  const { data: coach, error: coachErr } = await supabase
    .from("coaches")
    .select("id, ativo")
    .eq("profile_id", user.id)
    .single();
  if (coachErr || !coach) {
    return { success: false, error: "Você não é PRO." };
  }
  if (!coach.ativo) {
    return { success: false, error: "Seu perfil PRO está inativo." };
  }

  const { error } = await supabase
    .from("coaches")
    .update({
      fila_aberta: open,
      fila_aberta_em: open ? new Date().toISOString() : null,
    })
    .eq("id", coach.id);
  if (error) return { success: false, error: "Erro ao atualizar fila." };

  revalidatePath("/");
  revalidatePath("/admin/pros");
  return { success: true, data: { filaAberta: open } };
}

// ============== startPT ==============

export async function startPT(entryIds: string[]): Promise<ActionResult<{ matchId: string }>> {
  if (entryIds.length === 0) {
    return { success: false, error: "Selecione ao menos 1 aluno." };
  }
  if (entryIds.length > 4) {
    return { success: false, error: "Máximo 4 alunos por PT." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Achar coach do user logado
  const { data: coach } = await supabase
    .from("coaches")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!coach) return { success: false, error: "Você não é PRO." };

  // Buscar entries selecionadas — todas devem pertencer ao coach e estar waiting
  const { data: entries, error: entriesErr } = await supabase
    .from("coach_queue_entries")
    .select("id, user_id, purchase_id, status, coach_id")
    .in("id", entryIds);
  if (entriesErr || !entries || entries.length !== entryIds.length) {
    return { success: false, error: "Entries inválidas." };
  }
  for (const e of entries) {
    if (e.coach_id !== coach.id) {
      return { success: false, error: "Uma das entries não pertence à sua fila." };
    }
    if (e.status !== "waiting") {
      return { success: false, error: "Uma das fichas já foi consumida ou cancelada." };
    }
  }

  // Criar 1 match agregado (sem user_id/purchase_id — entries linkam via match_id)
  const nowISO = new Date().toISOString();
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .insert({
      coach_id: coach.id,
      data_agendada: nowISO,
      status: "agendada",
      // user_id e purchase_id ficam NULL (multi-aluno via coach_queue_entries.match_id)
    } as never)
    .select("id")
    .single();
  if (matchErr || !match) {
    return { success: false, error: "Erro ao criar PT: " + (matchErr?.message ?? "desconhecido") };
  }

  // Consumir 1 ficha de cada purchase
  for (const e of entries) {
    const { data: p } = await supabase
      .from("purchases")
      .select("partidas_usadas")
      .eq("id", e.purchase_id)
      .single();
    if (p) {
      await supabase
        .from("purchases")
        .update({ partidas_usadas: p.partidas_usadas + 1 })
        .eq("id", e.purchase_id);
    }
  }

  // Marcar entries como consumed + link ao match
  const { error: updErr } = await supabase
    .from("coach_queue_entries")
    .update({
      status: "consumed",
      consumed_at: nowISO,
      match_id: match.id,
    })
    .in("id", entryIds);
  if (updErr) {
    return { success: false, error: "PT criada mas erro ao marcar fichas consumidas." };
  }

  revalidatePath("/");
  revalidatePath("/admin/pros");
  return { success: true, data: { matchId: match.id } };
}

// ============== enrichMatchFromOpenDota ==============

export async function enrichMatchFromOpenDota(
  matchId: string,
  dotaMatchId: string
): Promise<ActionResult<{ playersInserted: number }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Validar permissão: admin OU PRO dono do match
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  const isAdmin = profile?.is_admin === true;

  const { data: match } = await supabase
    .from("matches")
    .select("id, coach_id, enriched_at")
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

  // Buscar dados na OpenDota
  let opendotaMatch;
  try {
    opendotaMatch = await fetchOpenDotaMatch(dotaMatchId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return { success: false, error: "Erro OpenDota: " + msg };
  }

  const normalized = normalizePlayers(opendotaMatch);

  // Mapear steam_account_id → user_id via steam_links
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

  // Achar profile_id do PRO desse match pra marcar is_pro=true na linha dele
  const { data: coachWithProfile } = await supabase
    .from("coaches")
    .select("profile_id")
    .eq("id", match.coach_id ?? "")
    .single();
  const proProfileId = coachWithProfile?.profile_id ?? null;

  // Montar payload pra insert
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

  // Atualizar match com metadados
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
  revalidatePath(`/admin/pros/${matchId}`);
  return { success: true, data: { playersInserted: playerRows.length } };
}
