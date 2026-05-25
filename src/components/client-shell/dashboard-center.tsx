"use client";

// Dashboard center — feed vertical de PRO cards iguais.
// Sem destaque arbitrário; todos PROs são opções equivalentes.
// Cliente lê de cima a baixo e escolhe em qual fila entrar.
//
// Refatorado para Design System V2.5 (task #70 — 2026-05-25):
//   - <EmptyState> primitive (substituiu função local)
//   - <Card variant="flat"> envolve lista de PROs offline
//   - <UserAvatar size="sm"> em cada PRO offline (substituiu <img> cru)
//   - "use client" adicionado: EmptyState primitive é Client Component
//     (passar icon LucideIcon de Server quebra — mesmo problema do HubCenter)
//   - /ranked-com-pro/page.tsx é o único importador; Server renderiza Client OK

import { useState } from "react";
import { Radio, ChevronDown, ChevronUp } from "lucide-react";
import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { ProQueueCard, UserStatusBar } from "@/components/queue/pro-queue-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Card } from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";

interface CenterProps {
  persona: string;
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosWithQueues: ProWithQueue[];
  /** Stats por coachId — opcional. Hoje carrega só pro top, mas é flexível. */
  statsByCoach: Map<string, ProRecentStats>;
  myQueues: MyQueueEntry[];
}

export function DashboardCenter({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  statsByCoach,
  myQueues,
}: CenterProps) {
  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const offlinePros = prosWithQueues.filter((p) => !p.coach.filaAberta);

  // Mapas pra calcular estado por coach (em fila aqui? em outra?)
  const myEntriesByCoach = new Map(myQueues.map((q) => [q.coachId, q.entryId]));
  const inAnyQueue = myQueues[0] ?? null;

  // Estado collapsível da lista de PROs offline (antes era <details>)
  const [offlineExpanded, setOfflineExpanded] = useState(false);

  return (
    <section className="relative flex h-full flex-col overflow-hidden">
      {/* Conteúdo principal scrollável */}
      <div className="relative z-[var(--z-elevated)] flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 min-h-0 xl:px-10 xl:py-8 max-w-5xl mx-auto w-full">
        {/* Status do user (1 linha) */}
        <UserStatusBar
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          fichaPreco={fichaPreco}
          myQueueCount={myQueues.length}
          prosOnlineCount={onlinePros.length}
        />

        {/* Header da seção PROs */}
        <header className="flex items-end justify-between gap-4 pt-2">
          <div>
            <h2 className="font-display text-2xl uppercase tracking-tight text-text-display xl:text-3xl">
              PROs disponíveis
            </h2>
            <p className="mt-1 font-display text-sm font-semibold text-text-body">
              {onlinePros.length === 0
                ? "Nenhum PRO online no momento"
                : `${onlinePros.length} ${onlinePros.length === 1 ? "PRO" : "PROs"} aceitando alunos agora`}
              {offlinePros.length > 0 && ` · ${offlinePros.length} offline`}
            </p>
          </div>
        </header>

        {/* Feed vertical de cards — todos PROs equivalentes */}
        {onlinePros.length === 0 ? (
          <EmptyState
            icon={Radio}
            title="Nenhum PRO online"
            description="Os PROs abrem fila quando estão prontos. Ative aviso no Discord pra saber quando alguém abrir."
            principle="random"
            action={
              <a
                href="https://discord.com/invite/v3pSuZhjBE"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-brand-primary hover:text-text-display transition-colors"
              >
                Ativar aviso no Discord →
              </a>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {onlinePros.map((pro) => {
              const myEntryHere = myEntriesByCoach.get(pro.coach.coachId) ?? null;
              const myEntryElsewhere =
                inAnyQueue && inAnyQueue.coachId !== pro.coach.coachId
                  ? inAnyQueue.entryId
                  : null;
              const stats = statsByCoach.get(pro.coach.coachId);
              return (
                <ProQueueCard
                  key={pro.coach.coachId}
                  coach={{
                    coachId: pro.coach.coachId,
                    username: pro.coach.username,
                    avatarUrl: pro.coach.avatarUrl,
                    mmrAtual: pro.coach.mmrAtual,
                    headline: pro.coach.headline,
                    filaAberta: pro.coach.filaAberta,
                    filaAbertaEm: pro.coach.filaAbertaEm,
                    filaMaxVagas: pro.coach.filaMaxVagas,
                  }}
                  entries={pro.entries}
                  viewerUserId={viewerUserId}
                  fichaBalance={fichaBalance}
                  fichaPackageId={fichaPackageId}
                  myEntryIdHere={myEntryHere}
                  myEntryIdElsewhere={myEntryElsewhere}
                  otherCoachUsername={inAnyQueue?.coachUsername ?? null}
                  isAdmin={isAdmin}
                  ptsHoje={stats?.ptsHoje ?? 0}
                  alunosHoje={stats?.alunosAtendidosHoje ?? 0}
                />
              );
            })}
          </div>
        )}

        {/* PROs offline (collapsível) — agora wrappado em Card primitive */}
        {offlinePros.length > 0 && (
          <Card variant="flat" className="mt-4">
            <button
              type="button"
              onClick={() => setOfflineExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-2 font-mono text-sm uppercase tracking-widest text-text-muted hover:text-text-body transition-colors"
              aria-expanded={offlineExpanded}
            >
              <span>PROs offline ({offlinePros.length})</span>
              {offlineExpanded ? (
                <ChevronUp size={14} aria-hidden="true" />
              ) : (
                <ChevronDown size={14} aria-hidden="true" />
              )}
            </button>
            {offlineExpanded && (
              <ul className="mt-3 space-y-1.5">
                {offlinePros.map((pro) => (
                  <li
                    key={pro.coach.coachId}
                    className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-bg-elevated"
                  >
                    <UserAvatar
                      size="sm"
                      src={pro.coach.avatarUrl ?? undefined}
                      alt={pro.coach.username ?? pro.coach.slug}
                      fallback={(pro.coach.username ?? pro.coach.slug).slice(0, 2)}
                      className="opacity-60 grayscale"
                    />
                    <span className="flex-1 font-sans text-sm text-text-body truncate">
                      {pro.coach.username ?? pro.coach.slug}
                    </span>
                    {pro.coach.mmrAtual && (
                      <span className="font-mono text-sm text-text-faded">
                        {pro.coach.mmrAtual.toLocaleString("pt-BR")} MMR
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>
    </section>
  );
}
