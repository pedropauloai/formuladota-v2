"use client";

// Dashboard center — feed de PROs em grid de cards verticais hero.
// Cada card é um <ProCard> canônico (mesmo do design system /components),
// com bloco de fila ao vivo (mini-slots + waiting + stats) e CTA contextual
// composto via prop `action`.
//
// Refatorado 2026-05-25:
//   - ProQueueCard → ProCard (componente único, canônico no design system)
//   - Grid responsivo 1/2/3 colunas pra suportar layout vertical
//   - QueueActionButton encapsula optimistic UI + server actions
//   - UserStatusBar e helpers movidos pra módulos próprios

import { useState } from "react";
import { Radio, ChevronDown, ChevronUp } from "lucide-react";
import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { ProCard } from "@/components/patterns/pro-card";
import { QueueActionButton } from "@/components/queue/queue-action-button";
import { UserStatusBar } from "@/components/queue/user-status-bar";
import { mmrToDotaRank, coachHonorRank } from "@/components/queue/queue-helpers";
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

  const myEntriesByCoach = new Map(myQueues.map((q) => [q.coachId, q.entryId]));
  const inAnyQueue = myQueues[0] ?? null;

  const [offlineExpanded, setOfflineExpanded] = useState(false);

  return (
    <section className="relative flex h-full flex-col overflow-hidden">
      <div className="relative z-[var(--z-elevated)] flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 min-h-0 xl:px-10 xl:py-8 max-w-7xl mx-auto w-full">
        <UserStatusBar
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          fichaPreco={fichaPreco}
          myQueueCount={myQueues.length}
          prosOnlineCount={onlinePros.length}
        />

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
                className="inline-flex items-center gap-2 font-display font-semibold text-sm uppercase tracking-wide text-brand-primary hover:text-text-display transition-colors"
              >
                Ativar aviso no Discord →
              </a>
            }
          />
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {onlinePros.map((pro) => {
              const myEntryHere =
                myEntriesByCoach.get(pro.coach.coachId) ?? null;
              const myEntryElsewhere =
                inAnyQueue && inAnyQueue.coachId !== pro.coach.coachId
                  ? inAnyQueue.entryId
                  : null;
              const stats = statsByCoach.get(pro.coach.coachId);

              const slotsCount = pro.coach.filaMaxVagas;
              const activeSlots = pro.entries.slice(0, slotsCount);
              const waitingList = pro.entries.slice(slotsCount);
              const waitingExtra = waitingList.length;

              const borderAccent = myEntryHere
                ? "warning"
                : pro.coach.filaAberta
                  ? "success"
                  : "default";

              return (
                <ProCard
                  key={pro.coach.coachId}
                  proName={pro.coach.username ?? "PRO"}
                  portraitUrl={pro.coach.avatarUrl ?? undefined}
                  mmr={pro.coach.mmrAtual ?? 0}
                  rank={mmrToDotaRank(pro.coach.mmrAtual)}
                  honorRank={coachHonorRank(pro.coach)}
                  presence={pro.coach.filaAberta ? "online" : "offline"}
                  headline={pro.coach.headline ?? undefined}
                  membershipTier="consagrado"
                  ringColor={pro.coach.filaAberta ? "play" : "brand"}
                  filaAberta={pro.coach.filaAberta}
                  borderAccent={borderAccent}
                  queueSlots={activeSlots}
                  maxQueueSlots={slotsCount}
                  waitingExtra={waitingExtra}
                  waitingList={waitingList}
                  viewerUserId={viewerUserId}
                  queueStats={{
                    entriesCount: pro.entries.length,
                    ptsHoje: stats?.ptsHoje ?? 0,
                    alunosHoje: stats?.alunosAtendidosHoje ?? 0,
                  }}
                  defaultExpanded={!!myEntryHere}
                  action={
                    <QueueActionButton
                      coachId={pro.coach.coachId}
                      filaAberta={pro.coach.filaAberta}
                      isAdmin={isAdmin}
                      fichaBalance={fichaBalance}
                      fichaPackageId={fichaPackageId}
                      myEntryIdHere={myEntryHere}
                      myEntryIdElsewhere={myEntryElsewhere}
                      otherCoachUsername={inAnyQueue?.coachUsername ?? null}
                    />
                  }
                />
              );
            })}
          </div>
        )}

        {/* PROs offline — collapsível */}
        {offlinePros.length > 0 && (
          <Card variant="flat" className="mt-4">
            <button
              type="button"
              onClick={() => setOfflineExpanded((v) => !v)}
              className="flex w-full items-center justify-between gap-2 font-display font-semibold text-sm uppercase tracking-wide text-text-muted hover:text-text-body transition-colors"
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
