"use server";

// Server Actions de matchmaking — Fase B Phase 7.
// enterQueue: usa RLS gate has_active_subscription() (Migration 015) → erro 42501 se sem mensalidade.
// leaveQueue: marca status=cancelled (mantém histórico em vez de DELETE).
// getQueueStatus: retorna entry waiting/matched do user atual.

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { xpProgress } from "@/lib/levels";
import type { Database } from "@/types/database";

// Quantos jogadores estão buscando partida AGORA (match_queue waiting, TODOS os usuários).
// Usa service client porque match_queue tem RLS self (queue_select_self) — com o cookie
// client o count só enxergaria a própria entry. Read-only, seguro (key fica no servidor).
// Consumido pelo MatchQueuePill no topbar via polling leve.
export async function getMatchSearchingCount(): Promise<number> {
  try {
    const service = createServiceClient();
    const { count } = await service
      .from("match_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "waiting");
    return count ?? 0;
  } catch {
    return 0;
  }
}

export type QueueRole =
  | "support_dedicated"
  | "support"
  | "offlane"
  | "midlane"
  | "safelane";

// Demanda atual por função: quantos waiting filaram cada role (qualquer usuário).
// Alimenta o menu expandido — destaca as funções que FALTAM pra formar partida.
// match_queue tem RLS self (cada um só vê a própria linha) → precisa do service client.
// Read-only, seguro (key fica no servidor). Consumido por POLLING leve (~4s).
export type RoleDemand = Record<QueueRole, number>;

const EMPTY_DEMAND: RoleDemand = {
  safelane: 0,
  midlane: 0,
  offlane: 0,
  support: 0,
  support_dedicated: 0,
};

export async function getRoleDemand(): Promise<{
  demand: RoleDemand;
  total: number;
}> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("match_queue")
      .select("roles")
      .eq("status", "waiting");

    const demand: RoleDemand = { ...EMPTY_DEMAND };
    for (const row of data ?? []) {
      const roles = Array.isArray(row.roles) ? (row.roles as string[]) : [];
      for (const r of roles) {
        if (r in demand) demand[r as QueueRole] += 1;
      }
    }
    return { demand, total: data?.length ?? 0 };
  } catch {
    return { demand: { ...EMPTY_DEMAND }, total: 0 };
  }
}

export type QueueGameMode =
  | "all_pick"
  | "captains_mode"
  | "random_draft"
  | "single_draft";

// Quem está findando agora (painel acima da seleção de função). Vem do RPC
// get_queue_searchers (migration 062, SECURITY DEFINER): identidade Steam + funções
// filadas + nível/HONOR de cada waiting. Refetchado pelo realtime da fila.
export interface QueueSearcher {
  userId: string;
  name: string;
  avatar: string | null;
  roles: QueueRole[];
  level: number;
  /** Progresso de XP no nível (0-1) — preenche o anel do avatar. */
  xpPct: number;
  /** MMR FormulaDota da season — medalha na sidebar. null = sem MMR. */
  mmr: number | null;
  honorScore: number;
  joinedAt: string;
  /** Modos de jogo filados (migration 072) — multi. Mostrados no card de searchers. */
  gameModes: QueueGameMode[];
}

// Linha do RPC get_queue_searchers (Args: never → o overload do .rpc não infere o
// retorno; tipamos a linha a partir do Database gerado).
type QueueSearcherRow =
  Database["public"]["Functions"]["get_queue_searchers"]["Returns"][number];

export async function getQueueSearchers(): Promise<QueueSearcher[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_queue_searchers");
  // game_modes/mmr/total_xp são novos no RPC e ainda não estão nos tipos gerados → cast.
  const rows = (data ?? []) as (QueueSearcherRow & {
    game_modes?: unknown;
    mmr?: number | null;
    total_xp?: number | null;
  })[];
  return rows.map((r) => {
    const modes = Array.isArray(r.game_modes) ? (r.game_modes as QueueGameMode[]) : [];
    const xp = xpProgress(typeof r.total_xp === "number" ? r.total_xp : 0);
    return {
      userId: r.user_id,
      name: r.name,
      avatar: r.avatar,
      roles: Array.isArray(r.roles) ? (r.roles as QueueRole[]) : [],
      level: xp.level,
      xpPct: xp.pct,
      mmr: typeof r.mmr === "number" ? r.mmr : null,
      honorScore: r.honor_score,
      joinedAt: r.joined_at,
      gameModes: modes.length ? modes : (["all_pick"] as QueueGameMode[]),
    };
  });
}

export type QueueResult =
  | { success: true; queueId: string; matchedLobbyId?: string | null }
  | {
      success: false;
      error: string;
      code?: "need_permission" | "in_match" | "no_rank" | "rate_limited";
    };

// Rate limit anti-spam: no máximo 1 entrada na fila a cada N ms por usuário. Barra o
// padrão de entra-e-sai em rajada (que só pesa o matchmaker/DB); o custo real é ENTRAR.
const QUEUE_RATE_LIMIT_MS = 4000;

// Tamanho da partida (X): a fila FORMA a partida ao juntar este número de jogadores.
// Produção (Pedro 2026-06-28): 10 — exige composição completa das 5 funções (2 cada).
// Pra voltar a testar 1v1, defina QUEUE_MATCH_SIZE=2 no ambiente (tem prioridade).
const MATCH_SIZE = (() => {
  const n = Number(process.env.QUEUE_MATCH_SIZE);
  return Number.isFinite(n) && n >= 2 ? Math.floor(n) : 10;
})();

export interface QueueStatus {
  inQueue: boolean;
  queueId: string | null;
  status: "waiting" | "matched" | "cancelled" | null;
  matchedLobbyId: string | null;
  joinedAt: string | null;
  waitingSeconds: number;
}

export async function enterQueue(input: {
  roles: QueueRole[];
  /** Modos selecionados (multi). Uma linha por user com o array → casar remove de todas. */
  gameModes?: QueueGameMode[];
}): Promise<QueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  if (input.roles.length === 0) {
    return { success: false, error: "Selecione pelo menos 1 função." };
  }

  // GATE anti-smurf: precisa de medalha Valve LEGÍVEL (perfil Dota público +
  // calibrado). Perfil privado ou conta descalibrada → rankTier nulo → não joga.
  const { data: ext } = await supabase
    .from("user_stats_extended")
    .select("career")
    .eq("user_id", user.id)
    .maybeSingle();
  const rankTier = (ext?.career as { rankTier?: number | null } | null)?.rankTier ?? null;
  if (rankTier == null) {
    return {
      success: false,
      error: "Deixe seu perfil Dota PÚBLICO e calibrado pra entrar na fila — a medalha é a prova do seu nível.",
      code: "no_rank",
    };
  }

  // TRAVA DE VERDADE (servidor): já está em partida ativa? Não pode buscar outra.
  // Fonte única is_in_active_match (mesma regra do getQueueStatus). O botão opaco/
  // "Voltar à partida" na UI é só o espelho — a proteção real é aqui.
  const { data: inMatch } = await supabase.rpc("is_in_active_match", { p_user: user.id });
  if (inMatch === true) {
    return {
      success: false,
      error: "Você já está em partida. Termine a atual antes de buscar outra.",
      code: "in_match",
    };
  }

  // Em grupo? A fila solo racharia a party — o líder busca pelo painel do grupo
  // (enterPartyQueue, migration 076). Bloqueia a fila solo de qualquer membro.
  const { data: partyMembership } = await supabase
    .from("party_members")
    .select("party_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (partyMembership) {
    return {
      success: false,
      error: "Você está em grupo — a busca é iniciada pelo líder no painel do grupo.",
    };
  }

  // Cooldown de fila (recusou/ignorou um ready check — migration 067).
  const { data: prof } = await supabase
    .from("profiles")
    .select("match_cooldown_until")
    .eq("id", user.id)
    .maybeSingle();
  if (prof?.match_cooldown_until && new Date(prof.match_cooldown_until) > new Date()) {
    const mins = Math.ceil(
      (new Date(prof.match_cooldown_until).getTime() - Date.now()) / 60000
    );
    return {
      success: false,
      error: `Em cooldown de fila por ~${mins} min (você recusou ou ignorou uma partida).`,
    };
  }

  // Rate limit (anti-spam de entra-e-sai): checa o joined_at mais recente do user
  // (qualquer status). Dentro da janela → recusa antes de fazer qualquer escrita.
  const { data: lastEntry } = await supabase
    .from("match_queue")
    .select("joined_at")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (
    lastEntry?.joined_at &&
    Date.now() - new Date(lastEntry.joined_at).getTime() < QUEUE_RATE_LIMIT_MS
  ) {
    return {
      success: false,
      error: "Aguarde alguns segundos antes de buscar de novo.",
      code: "rate_limited",
    };
  }

  // Cancela entries waiting anteriores antes de criar nova (idempotência)
  await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("user_id", user.id)
    .eq("status", "waiting");

  // Modos selecionados (ao menos 1). game_modes (array, migration 072) é o que vale;
  // game_mode (coluna antiga, NOT NULL) recebe o primeiro pra compat. game_modes é
  // coluna nova fora dos tipos gerados → cast no insert.
  const modes =
    input.gameModes && input.gameModes.length ? input.gameModes : (["all_pick"] as QueueGameMode[]);
  // region NÃO vai no insert: o trigger trg_set_queue_region (migration 121)
  // SEMPRE grava a região do perfil — cliente não escolhe região de fila.
  const insertRow = {
    user_id: user.id,
    roles: input.roles,
    game_mode: modes[0],
    game_modes: modes,
    status: "waiting",
  };
  const { data, error } = await supabase
    .from("match_queue")
    .insert(insertRow as never)
    .select("id")
    .single();

  if (error) {
    // RLS barra quem não tem permissão nem doutrina → dispara o pop-up de perguntas.
    if (error.code === "42501") {
      return {
        success: false,
        error: "Responda 5 perguntas pra liberar 1 partida.",
        code: "need_permission",
      };
    }
    console.error("[enterQueue] insert falhou:", error.message);
    return { success: false, error: "Erro ao entrar na fila." };
  }

  // NÃO consome permissão aqui: buscar exige ter permissão (RLS), mas o consumo
  // acontece na FORMAÇÃO da partida (confirm_match_proposal, migration 125) —
  // antes era consumida na entrada e sumia quando o usuário cancelava a busca.

  // Tenta FECHAR uma partida agora mesmo (auto ao juntar X). A função é SECURITY DEFINER
  // no banco: forma os 2 times por role e marca a fila como matched. Os demais jogadores
  // que já estavam na fila descobrem via realtime do getQueueStatus (use-queue-status-realtime).
  const { data: formed } = await supabase.rpc("try_form_match", {
    p_match_size: MATCH_SIZE,
  });
  const matchedLobbyId = typeof formed === "string" ? formed : null;

  // Revalida tanto a rota dedicada (feed PROs) quanto o HUB (badges/contadores).
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, queueId: data.id, matchedLobbyId };
}

// Heartbeat de liveness: o cliente pinga enquanto busca (~15s) pra provar que
// ainda está ativo. Sem ping por ~45-60s → o pg_cron (migration 063) cancela a
// entrada (anti-fantasma). UPDATE da PRÓPRIA entry waiting (RLS queue_update_self).
export async function heartbeatQueue(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("match_queue")
    .update({ last_heartbeat: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("status", "waiting");
}

// Troca de função SEM sair da fila: atualiza a entry waiting EM VEZ de recriar —
// preserva joined_at (posição na fila) e o tempo de busca, e mantém last_heartbeat.
// A nova composição pode fechar partida na hora (try_form_match).
export async function updateQueueRoles(
  roles: QueueRole[]
): Promise<QueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };
  if (roles.length === 0) {
    return { success: false, error: "Selecione pelo menos 1 função." };
  }

  const { data, error } = await supabase
    .from("match_queue")
    .update({ roles })
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { success: false, error: "Erro ao trocar de função." };
  }

  const { data: formed } = await supabase.rpc("try_form_match", {
    p_match_size: MATCH_SIZE,
  });
  const matchedLobbyId = typeof formed === "string" ? formed : null;

  revalidatePath("/dashboard");
  return { success: true, queueId: data.id, matchedLobbyId };
}

export async function leaveQueue(): Promise<QueueResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data: existing } = await supabase
    .from("match_queue")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "waiting")
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "Você não está na fila." };
  }

  const { error } = await supabase
    .from("match_queue")
    .update({ status: "cancelled" })
    .eq("id", existing.id);

  if (error) {
    return { success: false, error: "Erro ao sair da fila." };
  }

  // Revalida tanto a rota dedicada (feed PROs) quanto o HUB (badges/contadores).
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  return { success: true, queueId: existing.id };
}

export async function getQueueStatus(): Promise<QueueStatus> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      inQueue: false,
      queueId: null,
      status: null,
      matchedLobbyId: null,
      joinedAt: null,
      waitingSeconds: 0,
    };
  }

  // Pega entry waiting OU matched (recente). Cancelled é histórico, ignora.
  const { data } = await supabase
    .from("match_queue")
    .select("id, status, matched_lobby_id, joined_at")
    .eq("user_id", user.id)
    .in("status", ["waiting", "matched"])
    .order("joined_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      inQueue: false,
      queueId: null,
      status: null,
      matchedLobbyId: null,
      joinedAt: null,
      waitingSeconds: 0,
    };
  }

  // Entry 'matched' só vale enquanto o lobby existe e está ATIVO (open/in_progress).
  // Se foi cancelado/encerrado (ex.: admin descartou), trata como fora da fila — assim o
  // usuário não fica preso no "Voltar à partida" e o botão volta pro "Jogar Dota".
  if (data.status === "matched" && data.matched_lobby_id) {
    const { data: lob } = await supabase
      .from("lobbies")
      .select("status")
      .eq("id", data.matched_lobby_id)
      .maybeSingle();
    const ativo = !!lob && (lob.status === "open" || lob.status === "in_progress");
    if (!ativo) {
      return {
        inQueue: false,
        queueId: null,
        status: null,
        matchedLobbyId: null,
        joinedAt: null,
        waitingSeconds: 0,
      };
    }
  }

  const joinedAt = data.joined_at ? new Date(data.joined_at) : null;
  const waitingSeconds = joinedAt
    ? Math.floor((Date.now() - joinedAt.getTime()) / 1000)
    : 0;

  return {
    inQueue: true,
    queueId: data.id,
    status: data.status,
    matchedLobbyId: data.matched_lobby_id,
    joinedAt: data.joined_at,
    waitingSeconds,
  };
}
