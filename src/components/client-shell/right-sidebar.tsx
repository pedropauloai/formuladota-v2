// Right Sidebar — news + status saldo + PROs online + comunidade (MVP).
// V2 vai trocar lista de PROs por feed de notícias/eventos/torneios.

import Link from "next/link";
import { Newspaper, Radio, Crown, AlertCircle, MessageSquare, BookOpen } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface Props {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  prosOnline: ProLiveStatus[];
  /** Modo flutuante (immersive shell). */
  floating?: boolean;
}

export function DashboardRightSidebar({
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  prosOnline,
  floating,
}: Props) {
  const wrapperCls = floating
    ? "flex w-full flex-col gap-3 p-3 overflow-y-auto"
    : "hidden lg:flex flex-col gap-3 bg-gradient-to-l from-black/70 via-black/40 to-transparent p-4 pb-[80px] xl:pb-[96px] 2xl:pb-[112px] backdrop-blur-sm overflow-y-auto";

  const onlinePros = prosOnline.filter((p) => p.filaAberta);

  return (
    <aside className={wrapperCls}>
      {/* News card */}
      <NewsCard
        eyebrow="Boost de MMR · Brasil"
        title="EVOLUA SEU MMR"
        description="Compre fichas, jogue PT ranked oficial com um PRO da Fórmula do Dota de Corrida. Ou você ganha, ou você aprende."
        bg={HEROES_FULL_BG}
        href="/codigo-de-conduta"
        cta="Ler manifesto"
      />

      {/* Status: admin / saldo */}
      {isAdmin ? (
        <CompactCard
          icon={Crown}
          title="Acesso admin"
          description="Bypass total · acesso PRO + admin"
          variant="brand"
          href="/admin/pros"
          cta="Painel PROs"
        />
      ) : fichaBalance > 0 ? (
        <CompactCard
          icon={Newspaper}
          title={`${fichaBalance} ${fichaBalance === 1 ? "ficha disponível" : "fichas disponíveis"}`}
          description="Entre na fila de um PRO online"
          variant="success"
          href="/dashboard"
          cta="Ver PROs online"
        />
      ) : (
        <CompactCard
          icon={AlertCircle}
          title="Sem fichas"
          description={
            fichaPreco
              ? `Compre 1 ficha · R$ ${fichaPreco.toFixed(2).replace(".", ",")}`
              : "Compre fichas pra entrar em fila"
          }
          variant="warning"
          href={fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta"}
          cta="Comprar ficha"
        />
      )}

      {/* PROs Online */}
      <ProsOnlineCard pros={onlinePros} />

      {/* Comunidade */}
      <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm overflow-hidden">
        <p className="border-b border-[var(--color-border)] px-3 py-2 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Comunidade
        </p>
        <div className="space-y-1 p-2">
          <CommunityLink
            icon={MessageSquare}
            label="Discord oficial"
            href="https://discord.com/invite/v3pSuZhjBE"
            external
          />
          <CommunityLink icon={BookOpen} label="Código de Conduta" href="/codigo-de-conduta" />
        </div>
      </article>
    </aside>
  );
}

function ProsOnlineCard({ pros }: { pros: ProLiveStatus[] }) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <Radio size={12} className="text-emerald-400" aria-hidden="true" />
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
          PROs online
        </p>
        <span className="ml-auto font-mono text-[10px] text-white/40">
          {pros.length}
        </span>
      </div>
      {pros.length === 0 ? (
        <div className="p-4 text-center space-y-2">
          <p className="font-mono text-[11px] text-white/50">Nenhum PRO online</p>
          <p className="font-mono text-[10px] text-white/30">
            Você será avisado quando abrir
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {pros.slice(0, 4).map((p) => (
            <li key={p.coachId} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.avatarUrl}
                    alt=""
                    className="size-7 rounded-full border border-emerald-500/40"
                  />
                ) : (
                  <div className="size-7 rounded-full border border-emerald-500/40 bg-[var(--color-card)]" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-xs text-white truncate">
                    {p.username ?? p.slug}
                  </p>
                  <p className="font-mono text-[10px] text-white/40 mt-0.5">
                    {p.vagasRestantes}{" "}
                    {p.vagasRestantes === 1 ? "vaga" : "vagas"}
                    {p.mmrAtual ? ` · ${p.mmrAtual.toLocaleString("pt-BR")} MMR` : ""}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function NewsCard({
  eyebrow,
  title,
  description,
  bg,
  href,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  bg: string;
  href: string;
  cta: string;
}) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 overflow-hidden backdrop-blur-sm">
      <div
        className="relative h-32 overflow-hidden"
        style={{
          backgroundImage: `url(${bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
            {eyebrow}
          </p>
          <p className="mt-1 font-display text-base uppercase tracking-wide text-white drop-shadow-md leading-tight">
            {title}
          </p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="font-sans text-[11px] leading-relaxed text-white/70">{description}</p>
        <Link
          href={href}
          className="inline-block font-sans text-[10px] uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
        >
          {cta} →
        </Link>
      </div>
    </article>
  );
}

function CompactCard({
  icon: Icon,
  title,
  description,
  variant,
  href,
  cta,
}: {
  icon: typeof Newspaper;
  title: string;
  description: string;
  variant: "brand" | "success" | "warning";
  href: string;
  cta: string;
}) {
  const variants = {
    brand: "border-[var(--color-brand-red)]/40 bg-[var(--color-brand-red)]/5",
    success: "border-emerald-500/40 bg-emerald-500/5",
    warning: "border-amber-500/40 bg-amber-500/5",
  };
  const iconColors = {
    brand: "text-[var(--color-brand-red)]",
    success: "text-emerald-400",
    warning: "text-amber-400",
  };
  return (
    <Link
      href={href}
      className={`block rounded-md border ${variants[variant]} p-3 backdrop-blur-sm transition-colors hover:bg-white/5`}
    >
      <div className="flex items-start gap-3">
        <Icon size={16} className={iconColors[variant]} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm uppercase tracking-wide text-white truncate">
            {title}
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-white/60">{description}</p>
        </div>
      </div>
      <p className="mt-2 font-sans text-[10px] uppercase tracking-widest text-white/50">
        {cta} →
      </p>
    </Link>
  );
}

function CommunityLink({
  icon: Icon,
  label,
  href,
  external,
}: {
  icon: typeof MessageSquare;
  label: string;
  href: string;
  external?: boolean;
}) {
  const cls =
    "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={12} aria-hidden="true" />
        {label}
        <span className="ml-auto text-[9px] text-white/40">↗</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={12} aria-hidden="true" />
      {label}
    </Link>
  );
}
