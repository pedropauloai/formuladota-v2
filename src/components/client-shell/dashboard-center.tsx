// Dashboard center — feed vertical de PRO cards iguais.
// Sem destaque arbitrário; todos PROs são opções equivalentes.
// Cliente lê de cima a baixo e escolhe em qual fila entrar.

import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { ProQueueCard, UserStatusBar } from "@/components/queue/pro-queue-card";

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
            <h2 className="font-display text-2xl uppercase tracking-tight text-white xl:text-3xl">
              PROs disponíveis
            </h2>
            <p className="mt-1 font-mono text-xs text-white/60">
              {onlinePros.length === 0
                ? "Nenhum PRO online no momento"
                : `${onlinePros.length} ${onlinePros.length === 1 ? "PRO" : "PROs"} aceitando alunos agora`}
              {offlinePros.length > 0 && ` · ${offlinePros.length} offline`}
            </p>
          </div>
        </header>

        {/* Feed vertical de cards — todos PROs equivalentes */}
        {onlinePros.length === 0 ? (
          <EmptyState />
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

        {/* Offline PROs (collapsível visualmente) */}
        {offlinePros.length > 0 && (
          <details className="mt-4 rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/30 px-4 py-3">
            <summary className="cursor-pointer font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white/80">
              PROs offline ({offlinePros.length})
            </summary>
            <ul className="mt-3 space-y-1.5">
              {offlinePros.map((pro) => (
                <li
                  key={pro.coach.coachId}
                  className="flex items-center gap-3 rounded px-2 py-1.5 hover:bg-white/5"
                >
                  {pro.coach.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pro.coach.avatarUrl}
                      alt=""
                      className="size-6 rounded-full grayscale opacity-60"
                    />
                  ) : (
                    <div className="size-6 rounded-full bg-white/10" />
                  )}
                  <span className="flex-1 font-sans text-sm text-white/70 truncate">
                    {pro.coach.username ?? pro.coach.slug}
                  </span>
                  {pro.coach.mmrAtual && (
                    <span className="font-mono text-xs text-white/40">
                      {pro.coach.mmrAtual.toLocaleString("pt-BR")} MMR
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-[var(--color-border)] bg-black/20 px-8 py-12">
      <div className="text-center space-y-3">
        <p className="font-display text-lg uppercase tracking-wide text-white/60">
          Nenhum PRO online
        </p>
        <p className="max-w-sm font-mono text-xs text-white/40">
          Os PROs abrem fila quando estão prontos pra jogar. Receba o aviso no
          Discord oficial pra ser notificado quando alguém abrir.
        </p>
        <a
          href="https://discord.com/invite/v3pSuZhjBE"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
        >
          Ativar aviso no Discord →
        </a>
      </div>
    </div>
  );
}
