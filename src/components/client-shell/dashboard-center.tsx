// Center do dashboard — réplica do center panel Dota 2 client.
// Estrutura: Hero showcase com background atmospheric + título grande + sub-tabs + items grid.
// V1: showcase da temporada atual + 3 cards CTA (Lobbies, Ranking, Pacotes).
// V2 Pedro pode substituir conteúdo (ex: torneio em curso, season pass, etc).

import Link from "next/link";
import { Trophy, Flame, Crown, ShoppingBag, Calendar } from "lucide-react";
import { TierBadge } from "@/components/dota/tier-badge";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface CenterProps {
  persona: string;
  isAdmin: boolean;
  subActive: boolean;
  season: { name: string; prizePool: number } | null;
  mmr: { mmr: number; vitorias: number; derrotas: number; partidas_total: number } | null;
}

export function DashboardCenter({ persona, isAdmin, subActive, season, mmr }: CenterProps) {
  return (
    <section className="relative overflow-y-auto">
      {/* Hero — image atmospheric heroes_full + gradient + título grande */}
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
          {season && (
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.4em] text-[var(--color-brand-red)]">
              Temporada Atual
            </p>
          )}
          <h2 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white drop-shadow-2xl xl:text-6xl 2xl:text-7xl">
            {season?.name ?? "FORMULADOTA HUB"}
          </h2>
          <div className="mx-auto mt-6 brand-divider" />
          {mmr && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <TierBadge mmr={mmr.mmr} size="lg" showName />
              <span className="font-mono text-sm text-white/70">
                {mmr.partidas_total} {mmr.partidas_total === 1 ? "partida" : "partidas"} ·{" "}
                {mmr.partidas_total > 0
                  ? `${Math.round((mmr.vitorias / mmr.partidas_total) * 100)}% win`
                  : "primeira partida em breve"}
              </span>
            </div>
          )}
          {!mmr && (
            <p className="mt-8 font-serif text-base text-white/70 xl:text-lg">
              Bem-vindo ao HUB, <span className="text-white">{persona}</span>. Crie seu primeiro lobby pra começar a jogar.
            </p>
          )}
        </div>
      </div>

      {/* Sub-tabs / Quick actions */}
      <div className="px-6 py-8 xl:px-12 xl:py-10 space-y-6">
        {/* Status banner — admin / sub status */}
        {isAdmin ? (
          <AdminStatusBanner />
        ) : !subActive ? (
          <NoSubBanner />
        ) : (
          <SubActiveBanner />
        )}

        {/* Quick action cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <QuickActionCard
            icon={Flame}
            title="Lobbies abertos"
            description="Entre em uma partida com a comunidade alinhada"
            href="/lobbies"
            featured
          />
          <QuickActionCard
            icon={Trophy}
            title="Ranking"
            description="Top jogadores da temporada"
            href="/ranking"
          />
          <QuickActionCard
            icon={ShoppingBag}
            title="Pacotes"
            description="Mentoria 1-1 com coach Immortal"
            href="/pacotes"
          />
        </div>

        {/* Season info card */}
        {season && (
          <article className="flex items-center justify-between gap-6 rounded-md border border-[var(--color-brand-red)]/40 bg-gradient-to-r from-[var(--color-brand-red)]/10 to-transparent p-6 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="rounded-md border border-[var(--color-brand-red)] p-2">
                <Calendar size={18} className="text-[var(--color-brand-red)]" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-base uppercase tracking-wide text-white">
                  {season.name}
                </p>
                <p className="mt-1 font-mono text-xs text-white/60">
                  {season.prizePool > 0
                    ? `Premiação: R$ ${season.prizePool.toLocaleString("pt-BR")}`
                    : "Premiação por patrocinadores em breve"}
                </p>
              </div>
            </div>
          </article>
        )}
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
  icon: typeof Flame;
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
          ? "border-[var(--color-brand-red)]/50 bg-gradient-to-b from-[var(--color-brand-red)]/15 to-[var(--color-card)]/80 hover:border-[var(--color-brand-red)] hover:from-[var(--color-brand-red)]/25"
          : "border-[var(--color-border)] bg-[var(--color-card)]/80 hover:border-[var(--color-brand-red)]/60"
      }`}
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
            Acesso administrador
          </p>
          <p className="font-mono text-[11px] text-white/60 mt-0.5">
            Bypass total · sem mensalidade necessária
          </p>
        </div>
      </div>
      <Link
        href="/admin/dashboard"
        className="font-sans text-xs uppercase tracking-widest text-white/70 hover:text-white transition-colors"
      >
        Painel admin →
      </Link>
    </article>
  );
}

function NoSubBanner() {
  return (
    <article className="flex items-center justify-between gap-4 rounded-md border border-[var(--color-warning)]/40 bg-[var(--color-warning)]/10 backdrop-blur-sm p-5">
      <div>
        <p className="font-display text-sm uppercase tracking-wide text-white">
          Mensalidade inativa
        </p>
        <p className="font-mono text-[11px] text-white/70 mt-0.5">
          R$ 47/mês via PIX recorrente · cancele quando quiser
        </p>
      </div>
      <Link
        href="/assinatura"
        className="rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--color-brand-red)] transition-colors"
      >
        Ativar agora
      </Link>
    </article>
  );
}

function SubActiveBanner() {
  return (
    <article className="flex items-center gap-3 rounded-md border border-[var(--color-success)]/40 bg-[var(--color-success)]/5 backdrop-blur-sm px-5 py-3">
      <span className="size-2 rounded-full bg-[var(--color-success)] animate-pulse" aria-hidden="true" />
      <p className="font-display text-xs uppercase tracking-widest text-white">
        Mensalidade ativa
      </p>
      <span className="font-mono text-[11px] text-white/50">· acesso liberado</span>
    </article>
  );
}
