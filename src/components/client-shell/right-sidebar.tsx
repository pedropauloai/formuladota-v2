// Right Sidebar do dashboard — replica panel direito do Dota 2 client (cards news/events).
// Estrutura V1:
// 1. Card news: "Bem-vindo ao HUB" / atualização semana
// 2. Card lobbies: lista 3 lobbies abertos com 1-click join
// 3. Card comunidade: Discord + Conduta
//
// V2 Pedro pode trocar conteúdo (news posts admin, eventos, torneios, etc).

import Link from "next/link";
import { Newspaper, Flame, MessageSquare, BookOpen } from "lucide-react";

const HEROES_FULL_BG =
  "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/heroes_full.jpg";
const BG2 = "https://cdn.steamstatic.com/apps/dota2/images/dota_react/home/background2.png";

interface LobbyMini {
  id: string;
  name: string;
  game_mode: string;
  status: string;
  max_players: number;
  created_at: string;
}

interface Props {
  subActive: boolean;
  nextPayment: string | null;
  isAdmin: boolean;
  lobbies: LobbyMini[];
}

export function DashboardRightSidebar({ subActive, nextPayment, isAdmin, lobbies }: Props) {
  return (
    <aside className="hidden lg:flex flex-col gap-3 border-l border-[var(--color-border)] bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
      {/* Card 1 — News destacada (estilo "Suplemento de Colecionador" do client) */}
      <NewsCard
        eyebrow="Comunidade · Brasil"
        title="HUB FORMULADOTA"
        description="O HUB Dota 2 brasileiro com cultura doutrinada. Lobbies in-house, ranking próprio, comunidade alinhada."
        bg={HEROES_FULL_BG}
        href="/codigo-de-conduta"
        cta="Ler mais"
      />

      {/* Card 2 — Status mensalidade (admin tem versão própria) */}
      {isAdmin ? (
        <CompactCard
          icon={Newspaper}
          title="Acesso administrador"
          description="Bypass total · acesso permanente"
          variant="brand"
          href="/admin/dashboard"
          cta="Painel admin"
        />
      ) : subActive ? (
        <CompactCard
          icon={Newspaper}
          title="Mensalidade ativa"
          description={
            nextPayment
              ? `Próxima cobrança: ${new Date(nextPayment).toLocaleDateString("pt-BR")}`
              : "Acesso liberado"
          }
          variant="success"
          href="/assinatura"
          cta="Gerenciar"
        />
      ) : (
        <CompactCard
          icon={Newspaper}
          title="Ative sua mensalidade"
          description="R$ 47/mês via PIX automático"
          variant="warning"
          href="/assinatura"
          cta="Ativar"
        />
      )}

      {/* Card 3 — Lobbies abertos (estilo "Atualização de Jogabilidade") */}
      <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)]/80 overflow-hidden backdrop-blur-sm">
        <div
          className="relative h-24 overflow-hidden"
          style={{
            backgroundImage: `url(${BG2})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute bottom-2 left-3 flex items-center gap-2">
            <Flame size={14} className="text-[var(--color-brand-red)]" aria-hidden="true" />
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
              Lobbies abertos
            </p>
          </div>
        </div>
        {lobbies.length === 0 ? (
          <div className="p-4 text-center">
            <p className="font-mono text-[11px] text-white/50">Nenhum lobby aberto</p>
            <Link
              href="/criar-lobby"
              className="mt-2 inline-block font-sans text-xs uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
            >
              Criar primeiro →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--color-border)]">
            {lobbies.slice(0, 3).map((l) => (
              <li key={l.id} className="px-3 py-2.5">
                <Link
                  href={`/lobbies/${l.id}`}
                  className="group flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-xs text-white truncate group-hover:text-[var(--color-brand-red)] transition-colors">
                      {l.name}
                    </p>
                    <p className="font-mono text-[10px] text-white/40 mt-0.5">
                      {l.max_players}p · {l.game_mode.replace("_", " ")}
                    </p>
                  </div>
                  <span className="text-[10px] text-white/30 group-hover:text-white transition-colors">
                    →
                  </span>
                </Link>
              </li>
            ))}
            {lobbies.length > 3 && (
              <li className="px-3 py-2 border-t border-[var(--color-border)]">
                <Link
                  href="/lobbies"
                  className="block font-sans text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors text-center"
                >
                  Ver todos ({lobbies.length}) →
                </Link>
              </li>
            )}
          </ul>
        )}
      </article>

      {/* Card 4 — Comunidade */}
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
    success: "border-[var(--color-success)]/40 bg-[var(--color-success)]/5",
    warning: "border-[var(--color-warning)]/40 bg-[var(--color-warning)]/5",
  };
  const iconColors = {
    brand: "text-[var(--color-brand-red)]",
    success: "text-[var(--color-success)]",
    warning: "text-[var(--color-warning)]",
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
