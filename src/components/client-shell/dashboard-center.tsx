// Center do dashboard — denso, sem scroll, cabe em viewport.
// Hero compacto + QueueBoard presentation grande + status banner inline.
// Saldo e histórico ficam no left-sidebar / right-sidebar pra não duplicar.

import Link from "next/link";
import {
  Coins,
  Crown,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";
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
}

export function DashboardCenter({
  persona,
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosWithQueues,
  topProStats,
}: CenterProps) {
  const onlinePros = prosWithQueues.filter((p) => p.coach.filaAberta);
  const top = onlinePros[0] ?? null;

  return (
    <section className="relative flex h-full flex-col overflow-hidden">
      {/* Hero atmospheric compacto */}
      <div className="relative flex-shrink-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HEROES_FULL_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black" />

        <div className="relative z-10 px-6 py-6 text-center xl:px-12 xl:py-8">
          {top ? (
            <>
              <p className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-300">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                PRO Online · Fila Aberta
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-4xl">
                {top.coach.username ?? top.coach.slug}
              </h2>
              {topProStats && (
                <p className="mt-2 font-mono text-[11px] text-white/60">
                  {topProStats.ptsHoje} {topProStats.ptsHoje === 1 ? "PT" : "PTs"} hoje
                  {" · "}
                  {topProStats.alunosAtendidosHoje} alunos atendidos
                  {topProStats.lastPTAt &&
                    ` · última há ${minutesAgo(topProStats.lastPTAt)}m`}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--color-brand-red)]">
                FORMULADOTA HUB
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-4xl">
                Olá, {persona}
              </h2>
              <p className="mt-3 font-serif text-xs text-white/70 xl:text-sm">
                Nenhum PRO online no momento.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Conteúdo principal — QueueBoard + status (sem scroll) */}
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-4 xl:px-12 xl:py-5 min-h-0">
        {/* Status banner compacto */}
        {isAdmin ? (
          <AdminStatusBanner />
        ) : fichaBalance > 0 ? (
          <SaldoAtivoBanner balance={fichaBalance} hasProOnline={!!top} />
        ) : (
          <SemSaldoBanner
            fichaPackageId={fichaPackageId}
            fichaPreco={fichaPreco}
          />
        )}

        {/* QueueBoard presentation grande do PRO em destaque */}
        {top && (
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
          />
        )}

        {/* Outras filas em grid compacto */}
        {onlinePros.length > 1 && (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {onlinePros.slice(1).map((p) => (
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

        {/* Estado vazio quando ninguém online — mostra dica */}
        {!top && (
          <div className="flex flex-1 items-center justify-center">
            <p className="font-mono text-xs text-white/40 text-center max-w-sm">
              Você será avisado no Discord quando um PRO abrir fila.
              <br />
              Enquanto isso,{" "}
              <Link
                href="/codigo-de-conduta"
                className="text-[var(--color-brand-red)] hover:underline"
              >
                leia o código de conduta
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function AdminStatusBanner() {
  return (
    <article className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-brand-red)]/60 bg-gradient-to-r from-[var(--color-brand-red)]/15 to-transparent backdrop-blur-sm px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Crown size={16} className="text-[var(--color-brand-red)]" aria-hidden="true" />
        <div>
          <p className="font-display text-xs uppercase tracking-wide text-white">
            Acesso administrador + PRO
          </p>
          <p className="font-mono text-[10px] text-white/60 mt-0.5">
            Bypass total · gerencie fila e PTs
          </p>
        </div>
      </div>
      <Link
        href="/admin/pros"
        className="inline-flex items-center gap-1 font-sans text-[10px] uppercase tracking-widest text-white/70 hover:text-white transition-colors"
      >
        Painel PROs <ArrowRight size={10} />
      </Link>
    </article>
  );
}

function SaldoAtivoBanner({
  balance,
  hasProOnline,
}: {
  balance: number;
  hasProOnline: boolean;
}) {
  return (
    <article className="flex items-center justify-between gap-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 backdrop-blur-sm px-4 py-2.5">
      <div className="flex items-center gap-3">
        <Coins size={16} className="text-emerald-400" aria-hidden="true" />
        <div>
          <p className="font-display text-xs uppercase tracking-wide text-white">
            {balance} {balance === 1 ? "ficha disponível" : "fichas disponíveis"}
          </p>
          <p className="font-mono text-[10px] text-white/70 mt-0.5">
            {hasProOnline
              ? "Clique em Jogar Dota pra entrar na fila"
              : "Aguarde um PRO abrir fila"}
          </p>
        </div>
      </div>
    </article>
  );
}

function SemSaldoBanner({
  fichaPackageId,
  fichaPreco,
}: {
  fichaPackageId: string | null;
  fichaPreco: number | null;
}) {
  const precoTxt =
    fichaPreco !== null ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}` : "PIX";
  return (
    <article className="flex items-center justify-between gap-4 rounded-md border border-amber-500/40 bg-amber-500/5 backdrop-blur-sm px-4 py-2.5">
      <div className="flex items-center gap-3">
        <AlertCircle size={16} className="text-amber-400" aria-hidden="true" />
        <div>
          <p className="font-display text-xs uppercase tracking-wide text-white">
            Sem saldo de fichas
          </p>
          <p className="font-mono text-[10px] text-white/70 mt-0.5">
            Compre 1 ficha por {precoTxt} pra entrar em fila
          </p>
        </div>
      </div>
      {fichaPackageId && (
        <Link
          href={`/checkout/${fichaPackageId}`}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-black hover:brightness-110 transition-all"
        >
          Comprar <ArrowRight size={10} />
        </Link>
      )}
    </article>
  );
}
