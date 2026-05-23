// Right Sidebar — enxuta: só news + doutrina + comunidade.
// PROs e status de fila ficam SOMENTE no center (sem duplicação).

import Link from "next/link";
import { MessageSquare, BookOpen } from "lucide-react";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";

interface Props {
  floating?: boolean;
}

export function DashboardRightSidebar({ floating }: Props) {
  const wrapperCls = floating
    ? "flex w-full flex-col gap-3 p-3 overflow-y-auto"
    : "hidden lg:flex flex-col gap-3 bg-gradient-to-l from-black/70 via-black/40 to-transparent p-4 pb-[80px] xl:pb-[96px] 2xl:pb-[112px] backdrop-blur-sm overflow-y-auto";

  return (
    <aside className={wrapperCls}>
      <NewsCard
        eyebrow="Boost de MMR · Brasil"
        title="EVOLUA SEU MMR"
        description="Compre fichas, jogue PT ranked oficial com um PRO da Fórmula. Ou você ganha, ou você aprende."
        bg={HEROES_FULL_BG}
        href="/codigo-de-conduta"
        cta="Ler manifesto"
      />

      <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 backdrop-blur-sm overflow-hidden">
        <p className="border-b border-[var(--color-border)] px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">
          Comunidade
        </p>
        <div className="space-y-1 p-2">
          <CommunityLink
            icon={MessageSquare}
            label="Discord oficial"
            href="https://discord.com/invite/v3pSuZhjBE"
            external
          />
          <CommunityLink
            icon={BookOpen}
            label="Código de Conduta"
            href="/codigo-de-conduta"
          />
        </div>
      </article>

      <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/40 p-3 backdrop-blur-sm">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80 mb-2">
          A primeira regra
        </p>
        <p className="font-serif text-sm italic text-white/70 leading-relaxed">
          A culpa nunca é do outro. A responsabilidade é sempre sua, 100% das
          vezes.
        </p>
      </article>
    </aside>
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
        <p className="font-sans text-[12px] leading-relaxed text-white/70">
          {description}
        </p>
        <Link
          href={href}
          className="inline-block font-sans text-[11px] uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
        >
          {cta} →
        </Link>
      </div>
    </article>
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
    "flex items-center gap-2 rounded px-2 py-2 font-sans text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={14} aria-hidden="true" />
        {label}
        <span className="ml-auto text-[10px] text-white/40">↗</span>
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      <Icon size={14} aria-hidden="true" />
      {label}
    </Link>
  );
}
