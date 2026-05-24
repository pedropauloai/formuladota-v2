// Right Sidebar — enxuta: só news + doutrina + comunidade.
// PROs e status de fila ficam SOMENTE no center (sem duplicação).
//
// VISITANTE DESLOGADO (task #63 — 2026-05-24): sem mudança comportamental.
// Conteúdo (news/comunidade/primeira regra) é 100% público — visitante vê
// igual a usuário logado. Discord oficial é convite aberto.

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

      <article className="rounded-md border border-border-subtle bg-bg-elevated/80 backdrop-blur-sm overflow-hidden">
        <p className="border-b border-border-subtle px-3 py-2 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-text-body">
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

      <article className="rounded-md border border-border-subtle bg-bg-elevated/40 p-3 backdrop-blur-sm">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80 mb-2">
          A primeira regra
        </p>
        <p className="font-serif text-sm italic text-text-body leading-relaxed">
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
    <article className="rounded-md border border-border-subtle bg-bg-elevated/80 overflow-hidden backdrop-blur-sm">
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
          <p className="font-sans text-[9px] font-semibold uppercase tracking-[0.3em] text-brand-primary">
            {eyebrow}
          </p>
          <p className="mt-1 font-display text-base uppercase tracking-wide text-text-display drop-shadow-md leading-tight">
            {title}
          </p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="font-sans text-[12px] leading-relaxed text-text-body">
          {description}
        </p>
        <Link
          href={href}
          className="inline-block font-sans text-[11px] uppercase tracking-widest text-brand-primary hover:text-text-display transition-colors"
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
    "flex items-center gap-2 rounded px-2 py-2 font-sans text-sm text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={14} aria-hidden="true" />
        {label}
        <span className="ml-auto text-[10px] text-text-faded">↗</span>
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
