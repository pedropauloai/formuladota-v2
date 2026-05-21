// Center do dashboard — MVP fichas.
//   - Hero dinâmico: status PRO online ou saudação
//   - Status banner: admin / saldo / sem saldo
//   - 3 quick actions: PROs Online · Saldo · Histórico

import Link from "next/link";
import {
  Coins,
  Crown,
  History,
  Radio,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface CenterProps {
  persona: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosOnline: ProLiveStatus[];
}

export function DashboardCenter({
  persona,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosOnline,
}: CenterProps) {
  const onlinePros = prosOnline.filter((p) => p.filaAberta);
  const topPro = onlinePros[0] ?? null;

  return (
    <section className="relative overflow-y-auto">
      {/* Hero — atmospheric heroes_full + gradient + status dinâmico */}
      <div className="relative min-h-[420px] flex items-center justify-center overflow-hidden">
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
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

        <div className="relative z-10 px-6 text-center xl:px-12">
          {topPro ? (
            <>
              <p className="inline-flex items-center gap-2 font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-emerald-300">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                </span>
                PRO online agora
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-6xl 2xl:text-7xl">
                {topPro.username ?? topPro.slug}
              </h2>
              <p className="mt-4 font-mono text-sm text-white/70">
                {topPro.vagasRestantes}{" "}
                {topPro.vagasRestantes === 1 ? "vaga restante" : "vagas restantes"}
                {topPro.mmrAtual ? ` · ${topPro.mmrAtual.toLocaleString("pt-BR")} MMR` : ""}
              </p>
              {topPro.headline && (
                <p className="mx-auto mt-2 max-w-lg font-serif text-sm text-white/60 italic">
                  {topPro.headline}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--color-brand-red)]">
                FORMULADOTA HUB
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-6xl 2xl:text-7xl">
                Olá, {persona}
              </h2>
              <div className="mx-auto mt-6 brand-divider" />
              <p className="mt-6 font-serif text-base text-white/70 xl:text-lg">
                Nenhum PRO online no momento. Você será avisado no Discord quando abrir.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Status + Quick actions */}
      <div className="px-6 py-8 xl:px-12 xl:py-10 space-y-6">
        {/* Status banner */}
        {isAdmin ? (
          <AdminStatusBanner />
        ) : fichaBalance > 0 ? (
          <SaldoAtivoBanner balance={fichaBalance} hasProOnline={!!topPro} />
        ) : (
          <SemSaldoBanner
            fichaPackageId={fichaPackageId}
            fichaPreco={fichaPreco}
          />
        )}

        {/* Quick action cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={Radio}
            title={
              onlinePros.length === 0
                ? "Nenhum PRO online"
                : `${onlinePros.length} ${onlinePros.length === 1 ? "PRO online" : "PROs online"}`
            }
            description={
              topPro
                ? `${topPro.vagasRestantes} ${topPro.vagasRestantes === 1 ? "vaga" : "vagas"} restantes`
                : "Será avisado quando abrir"
            }
            href="#pros-online"
            featured={!!topPro}
          />
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

function QuickActionCard({
  icon: Icon,
  title,
  description,
  href,
  featured,
}: {
  icon: typeof Radio;
  title: string;
  description: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group block rounded-md border p-5 transition-all backdrop-blur-sm ${
        featured
          ? "border-emerald-500/50 bg-gradient-to-b from-emerald-500/15 to-[var(--color-card)]/80 hover:border-emerald-400 hover:from-emerald-500/25"
          : "border-[var(--color-border)] bg-[var(--color-card)]/80 hover:border-[var(--color-brand-red)]/60"
      }`}
    >
      <Icon
        size={22}
        className={`transition-transform group-hover:scale-110 ${
          featured ? "text-emerald-400" : "text-[var(--color-brand-red)]"
        }`}
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
              ? "PRO online — entre na fila agora"
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
