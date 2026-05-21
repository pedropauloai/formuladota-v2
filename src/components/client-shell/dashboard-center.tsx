// Center do dashboard — MVP fichas com QueueBoard presentation embed.
//
// Layout:
//   - Hero: status PRO destaque OU saudação
//   - QueueBoard presentation do PRO em destaque (se algum online)
//   - Status banner (admin / saldo / sem saldo)
//   - Quick actions

import Link from "next/link";
import {
  Coins,
  Crown,
  History,
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
    <section className="relative overflow-y-auto">
      {/* Hero atmospheric */}
      <div className="relative min-h-[260px] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${HEROES_FULL_BG})`,
            backgroundSize: "cover",
            backgroundPosition: "center 30%",
          }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 px-6 text-center xl:px-12 py-8">
          {top ? (
            <>
              <p className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-300">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                PRO Online · Fila Aberta
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-5xl">
                {top.coach.username ?? top.coach.slug}
              </h2>
              {topProStats && (
                <p className="mt-3 font-mono text-xs text-white/60">
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
              <h2 className="mt-3 font-display text-3xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-5xl">
                Olá, {persona}
              </h2>
              <div className="mx-auto mt-5 brand-divider" />
              <p className="mt-5 font-serif text-sm text-white/70 xl:text-base">
                Nenhum PRO online no momento. Você será avisado quando abrir.
              </p>
            </>
          )}
        </div>
      </div>

      {/* QueueBoard presentation do PRO em destaque */}
      <div className="px-6 py-6 xl:px-12 space-y-6">
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

        {/* Outras filas além da destaque */}
        {onlinePros.length > 1 && (
          <div>
            <p className="mb-3 font-sans text-xs font-semibold uppercase tracking-[0.3em] text-white/60">
              + {onlinePros.length - 1} outras filas
            </p>
            <div className="grid gap-3 md:grid-cols-2">
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
                  variant="presentation"
                  viewerUserId={viewerUserId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Status banner */}
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

        {/* Quick actions */}
        <div className="grid gap-4 md:grid-cols-2">
          <QuickActionCard
            icon={Coins}
            title={isAdmin ? "Saldo ∞" : `${fichaBalance} ${fichaBalance === 1 ? "ficha" : "fichas"}`}
            description="Cada ficha vale 1 vaga em PT ranked"
            href="/me"
          />
          <QuickActionCard
            icon={History}
            title="Histórico de PTs"
            description="Veja suas partidas e análises"
            href="/me"
          />
        </div>
      </div>
    </section>
  );
}

function minutesAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
}

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: typeof Coins;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 p-5 transition-all backdrop-blur-sm hover:border-[var(--color-brand-red)]/60"
    >
      <Icon
        size={22}
        className="text-[var(--color-brand-red)] transition-transform group-hover:scale-110"
        aria-hidden="true"
      />
      <p className="mt-3 font-display text-base uppercase tracking-wide text-white">
        {title}
      </p>
      <p className="mt-1 font-sans text-xs text-white/60">{description}</p>
    </Link>
  );
}

function AdminStatusBanner() {
  return (
    <article className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-brand-red)]/60 bg-gradient-to-r from-[var(--color-brand-red)]/15 to-transparent backdrop-blur-sm p-5">
      <div className="flex items-center gap-3">
        <Crown size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Acesso administrador + PRO
          </p>
          <p className="font-mono text-[11px] text-white/60 mt-0.5">
            Bypass total · gerencie fila e PTs no painel
          </p>
        </div>
      </div>
      <Link
        href="/admin/pros"
        className="inline-flex items-center gap-1 font-sans text-xs uppercase tracking-widest text-white/70 hover:text-white transition-colors"
      >
        Painel PROs <ArrowRight size={12} />
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
    <article className="flex items-center justify-between gap-4 rounded-md border border-emerald-500/40 bg-emerald-500/5 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3">
        <Coins size={18} className="text-emerald-400" aria-hidden="true" />
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            {balance} {balance === 1 ? "ficha disponível" : "fichas disponíveis"}
          </p>
          <p className="font-mono text-[11px] text-white/70 mt-0.5">
            {hasProOnline
              ? "PRO online — clique em Jogar Dota pra entrar na fila"
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
    <article className="flex items-center justify-between gap-4 rounded-md border border-amber-500/40 bg-amber-500/5 backdrop-blur-sm p-5">
      <div className="flex items-center gap-3">
        <AlertCircle size={18} className="text-amber-400" aria-hidden="true" />
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Sem saldo de fichas
          </p>
          <p className="font-mono text-[11px] text-white/70 mt-0.5">
            Compre 1 ficha por {precoTxt} pra entrar em fila com um PRO
          </p>
        </div>
      </div>
      {fichaPackageId && (
        <Link
          href={`/checkout/${fichaPackageId}`}
          className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-black hover:brightness-110 transition-all"
        >
          Comprar ficha
          <ArrowRight size={12} />
        </Link>
      )}
    </article>
  );
}
