// /admin/pros — painel PRO pra abrir/fechar fila, iniciar PT e submeter
// match_id pra enriquecimento via OpenDota.
//
// Server-rendered; componentes interativos são client islands.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ToggleFilaButton } from "./toggle-fila-button";
import { QueueList, type QueueEntry } from "./queue-list";
import { EnrichForm } from "./enrich-form";

export const metadata = { title: "PROs — Admin FORMULADOTA" };

export default async function AdminProsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Achar coach do user (PRO)
  const { data: coach } = await supabase
    .from("coaches")
    .select("id, slug, headline, fila_aberta, fila_aberta_em, fila_max_vagas")
    .eq("profile_id", user.id)
    .single();

  if (!coach) {
    return (
      <div className="p-8">
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/30 p-6 font-mono-ui text-sm text-[var(--color-muted-foreground)]">
          Você não é PRO ainda. Fale com o admin pra ser certificado.
        </p>
      </div>
    );
  }

  // Buscar entries waiting da fila desse coach
  const { data: rawEntries } = await supabase
    .from("coach_queue_entries")
    .select("id, joined_at, user_id")
    .eq("coach_id", coach.id)
    .eq("status", "waiting")
    .order("joined_at", { ascending: true });

  const entriesList = rawEntries ?? [];

  // Buscar dados dos alunos
  const userIds = entriesList.map((e) => e.user_id);
  const { data: profiles } = userIds.length
    ? await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const profileById = new Map(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const queueEntries: QueueEntry[] = entriesList.map((e) => {
    const prof = profileById.get(e.user_id);
    const waitingMinutes = Math.floor(
      (Date.now() - new Date(e.joined_at).getTime()) / 60000
    );
    return {
      id: e.id,
      username: prof?.username ?? null,
      avatarUrl: prof?.avatar_url ?? null,
      joinedAt: e.joined_at,
      waitingMinutes,
    };
  });

  // Matches do coach (pra enriquecimento)
  const { data: matchesRaw } = await supabase
    .from("matches")
    .select("id, created_at, enriched_at, dota_match_id")
    .eq("coach_id", coach.id)
    .order("created_at", { ascending: false })
    .limit(20);

  // Contar alunos por match
  const matchIds = (matchesRaw ?? []).map((m) => m.id);
  const { data: matchEntries } = matchIds.length
    ? await supabase
        .from("coach_queue_entries")
        .select("match_id")
        .in("match_id", matchIds)
        .eq("status", "consumed")
    : { data: [] };

  const countByMatch = new Map<string, number>();
  for (const me of matchEntries ?? []) {
    if (me.match_id) {
      countByMatch.set(me.match_id, (countByMatch.get(me.match_id) ?? 0) + 1);
    }
  }

  const matches = (matchesRaw ?? []).map((m) => ({
    id: m.id,
    createdAt: m.created_at,
    alunoCount: countByMatch.get(m.id) ?? 0,
    enrichedAt: m.enriched_at,
    dotaMatchId: m.dota_match_id,
  }));

  return (
    <div className="space-y-10 p-8">
      <header>
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
          PROs · Painel
        </p>
        <h1 className="mt-3 font-display text-3xl uppercase tracking-tight text-[var(--color-foreground)]">
          Gerenciar fila e PTs
        </h1>
        <p className="mt-2 font-mono-ui text-xs text-[var(--color-muted-foreground)]">
          Slug: {coach.slug} · headline: {coach.headline ?? "(sem headline)"}
        </p>
        <div className="mt-4 brand-divider" />
      </header>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <h2 className="font-display text-xl uppercase tracking-wide text-white">
            1. Status da fila
          </h2>
          <ToggleFilaButton
            filaAberta={coach.fila_aberta}
            filaAbertaEm={coach.fila_aberta_em}
          />

          <h2 className="mt-8 font-display text-xl uppercase tracking-wide text-white">
            2. Alunos na fila
          </h2>
          <p className="font-mono-ui text-xs text-[var(--color-muted-foreground)]">
            {queueEntries.length} esperando · máx {coach.fila_max_vagas} por PT
          </p>
          <QueueList entries={queueEntries} filaAberta={coach.fila_aberta} />
        </div>

        <div className="space-y-6">
          <h2 className="font-display text-xl uppercase tracking-wide text-white">
            3. Submeter Dota Match ID
          </h2>
          <p className="font-mono-ui text-xs text-[var(--color-muted-foreground)]">
            Depois da PT terminar, cole o ID da partida pra puxar todos os dados via
            OpenDota (10 jogadores, KDA, GPM, items, hero, vitória).
          </p>
          <EnrichForm matches={matches} />

          {matches.filter((m) => m.enrichedAt).length > 0 && (
            <div className="mt-8 space-y-2">
              <h3 className="font-display text-sm uppercase tracking-wide text-white/70">
                PTs já enriquecidas
              </h3>
              <ul className="space-y-1 font-mono-ui text-xs text-[var(--color-muted-foreground)]">
                {matches
                  .filter((m) => m.enrichedAt)
                  .slice(0, 5)
                  .map((m) => (
                    <li key={m.id}>
                      {new Date(m.createdAt).toLocaleString("pt-BR")} · #{m.dotaMatchId}
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
