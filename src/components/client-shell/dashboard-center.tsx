// Center do dashboard — 1 foco central (HeroState) + QueueBoard de apoio.
// Removidas duplicações: status banner inline, hero texto solto, quick action
// cards. HeroState concentra mensagem + CTA dominante.

import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { HeroState } from "@/components/queue/hero-state";
import { QueueBoard } from "@/components/queue/queue-board";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface CenterProps {
  persona: string;
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosWithQueues: ProWithQueue[];
  topProStats: ProRecentStats | null;
  myQueue: MyQueueEntry | null;
}

export function DashboardCenter({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  topProStats,
  myQueue,
}: CenterProps) {
  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const top = onlinePros[0] ?? null;
  const otherPros = onlinePros.slice(1);

  return (
    <section className="relative flex h-full flex-col overflow-hidden">
      {/* Backdrop atmospheric atrás de todo center */}
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: `url(${HEROES_FULL_BG})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black"
        aria-hidden="true"
      />

      {/* Conteúdo — HeroState + QueueBoard de apoio (scroll interno se passar) */}
      <div className="relative z-10 flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 min-h-0 xl:px-12 xl:py-8">
        <HeroState
          viewerUserId={viewerUserId}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          fichaPreco={fichaPreco}
          topPro={top}
          myQueue={myQueue}
        />

        {/* QueueBoard como evidência visual do estado — fica subordinado ao Hero */}
        {top && (
          <div className="opacity-90 transition-opacity hover:opacity-100">
            <QueueBoard
              coach={{
                coachId: top.coach.coachId,
                username: top.coach.username,
                avatarUrl: top.coach.avatarUrl,
                mmrAtual: top.coach.mmrAtual,
                headline: top.coach.headline,
                filaAberta: top.coach.filaAberta,
                filaAbertaEm: top.coach.filaAbertaEm,
                filaMaxVagas: top.coach.filaMaxVagas,
              }}
              entries={top.entries}
              variant="presentation"
              viewerUserId={viewerUserId}
              showHeadline={false}
            />
          </div>
        )}

        {/* Stats do PRO destaque (1 linha discreta) */}
        {top && topProStats && (
          <p className="text-center font-mono text-[11px] uppercase tracking-widest text-white/40">
            {topProStats.ptsHoje} {topProStats.ptsHoje === 1 ? "PT" : "PTs"} hoje
            {" · "}
            {topProStats.alunosAtendidosHoje} alunos atendidos
            {topProStats.lastPTAt &&
              ` · última há ${minutesAgo(topProStats.lastPTAt)}m`}
          </p>
        )}

        {/* Outras filas em grid compacto se houver */}
        {otherPros.length > 0 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 opacity-80">
            {otherPros.map((p) => (
              <QueueBoard
                key={p.coach.coachId}
                coach={{
                  coachId: p.coach.coachId,
                  username: p.coach.username,
                  avatarUrl: p.coach.avatarUrl,
                  mmrAtual: p.coach.mmrAtual,
                  headline: p.coach.headline,
                  filaAberta: p.coach.filaAberta,
                  filaAbertaEm: p.coach.filaAbertaEm,
                  filaMaxVagas: p.coach.filaMaxVagas,
                }}
                entries={p.entries}
                variant="compact"
                viewerUserId={viewerUserId}
                showHeadline={false}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}
