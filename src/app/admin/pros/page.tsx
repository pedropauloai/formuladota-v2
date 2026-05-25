// /admin/pros — painel PRO pra abrir/fechar fila, iniciar PT, confirmar
// como realizada (cobra fichas) ou cancelar (zero cobrança).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToggleFilaButton } from "./toggle-fila-button";
import { QueueList, type QueueEntry } from "./queue-list";
import { PendingMatches } from "./pending-matches";
import { EnrichForm } from "./enrich-form";

export const metadata = { title: "PROs — Admin FORMULADOTA" };
export const revalidate = 5;

// Helper externo — isola Date.now() do contexto de render do component
function getNowMs(): number {
  return Date.now();
}

export default async function AdminProsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: coach } = await supabase
    .from("coaches")
    .select("id, slug, headline, fila_aberta, fila_aberta_em, fila_max_vagas")
    .eq("profile_id", user.id)
    .single();

  if (!coach) {
    return (
      <div className="p-8">
        <p className="rounded-md border border-dashed border-border-subtle bg-bg-elevated/30 p-6 font-display text-sm font-semibold text-text-body">
          Você não é PRO ainda. Fale com o admin pra ser certificado.
        </p>
      </div>
    );
  }

  // Entries waiting da fila
  const { data: rawEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, joined_at, user_id")
    .eq("coach_id", coach.id)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  const entriesList = rawEntries ?? [];

  const userIds = entriesList.map((e) => e.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)
    : { data: [] };
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  // Snapshot fora do map para evitar Date.now() impure em render context
  const nowMs = getNowMs();
  const queueEntries: QueueEntry[] = entriesList.map((e) => {
    const prof = profileById.get(e.user_id);
    const waitingMinutes = Math.floor(
      (nowMs - new Date(e.joined_at).getTime()) / 60000
    );
    return {
      id: e.id,
      username: prof?.username ?? null,
      avatarUrl: prof?.avatar_url ?? null,
      joinedAt: e.joined_at,
      waitingMinutes,
    };
  });

  // PTs agendadas (in_match entries) — aguardam confirmação ou cancelamento
  const { data: pendingMatchesRaw } = await supabase
    .from("matches")
    .select("id, created_at")
    .eq("coach_id", coach.id)
    .eq("status", "agendada")
    .order("created_at", { ascending: false })
    .limit(20);

  const pendingIds = (pendingMatchesRaw ?? []).map((m) => m.id);
  const { data: pendingMatchEntries } = pendingIds.length
    ? await supabase
        .from("coach_queue_entries")
        .select("match_id")
        .in("match_id", pendingIds)
        .eq("status", "in_match")
    : { data: [] };

  const countByMatch = new Map<string, number>();
  for (const me of pendingMatchEntries ?? []) {
    if (me.match_id) {
      countByMatch.set(me.match_id, (countByMatch.get(me.match_id) ?? 0) + 1);
    }
  }

  const pendingMatches = (pendingMatchesRaw ?? []).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    alunoCount: countByMatch.get(m.id) ?? 0,
  }));

  // PTs realizadas (pra histórico/enrich pós-fato)
  const { data: realizedMatchesRaw } = await supabase
    .from("matches")
    .select("id, created_at, enriched_at, dota_match_id")
    .eq("coach_id", coach.id)
    .eq("status", "realizada")
    .is("enriched_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  const realizedIds = (realizedMatchesRaw ?? []).map((m) => m.id);
  const { data: realizedEntries } = realizedIds.length
    ? await supabase
        .from("coach_queue_entries")
        .select("match_id")
        .in("match_id", realizedIds)
        .eq("status", "consumed")
    : { data: [] };

  const realizedCountByMatch = new Map<string, number>();
  for (const me of realizedEntries ?? []) {
    if (me.match_id) {
      realizedCountByMatch.set(me.match_id, (realizedCountByMatch.get(me.match_id) ?? 0) + 1);
    }
  }

  const realizedNoData = (realizedMatchesRaw ?? []).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    alunoCount: realizedCountByMatch.get(m.id) ?? 0,
    enrichedAt: m.enriched_at,
    dotaMatchId: m.dota_match_id,
  }));

  return (
    <div className="space-y-10 p-8">
      <header>
        <p className="font-sans text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary">
          PROs · Painel
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-text-display">
          Gerenciar fila e PTs
        </h1>
        <p className="mt-2 font-display text-sm font-semibold text-text-body">
          Slug: {coach.slug} · {coach.headline ?? "(sem headline)"}
        </p>
        <div className="mt-4 brand-divider" />
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="font-display text-xl uppercase tracking-wide text-text-display">
            1. Status da fila
          </h2>
          <ToggleFilaButton
            filaAberta={coach.fila_aberta}
            filaAbertaEm={coach.fila_aberta_em}
          />

          <h2 className="mt-8 font-display text-xl uppercase tracking-wide text-text-display">
            2. Alunos na fila
          </h2>
          <p className="font-display text-sm font-semibold text-text-body">
            {queueEntries.length} aguardando · máx {coach.fila_max_vagas} por PT
          </p>
          <QueueList entries={queueEntries} filaAberta={coach.fila_aberta} />
        </div>

        <div className="space-y-6">
          <h2 className="font-display text-xl uppercase tracking-wide text-text-display">
            3. PTs agendadas
          </h2>
          <p className="font-display text-sm font-semibold text-text-body">
            Confirme quando a partida ocorrer (cobra fichas) ou cancele se não rolar.
          </p>
          <PendingMatches matches={pendingMatches} />

          {realizedNoData.length > 0 && (
            <>
              <h2 className="mt-8 font-display text-xl uppercase tracking-wide text-text-display">
                4. Realizadas sem dados OpenDota
              </h2>
              <p className="font-display text-sm font-semibold text-text-body">
                Submeta o match_id Dota pra enriquecer com KDA, GPM, etc.
              </p>
              <EnrichForm matches={realizedNoData} />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
