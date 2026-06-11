// Top Bar — réplica do header do Dota 2 client (M2 reformulado 2026-05-26).
// Esquerda: settings + logo branca + tabs principais + tabs contextuais
// Centro: status PROs online em tempo real
// Direita: badge CONDUTA (brand cinematic) + (ENTRAR se visitante / Logout se logado)
//
// Tabs principais (visíveis por role):
//   - SUBIR MMR   → sempre visível (visitante/user/admin) — jornada principal
//   - Progresso, Ranking, Times, Torneios → SÓ admin (em desenvolvimento)
//   - PRO (se isPro), ADMIN (se isAdmin) → tabs contextuais
//
// JOGAR é implícito — clique no logo FORMULADOTA leva pra /dashboard.
// Ref: docs/foundations/DOTA2_CLIENT_REFERENCE.md #2.
//
// CTA dominante na direita (2026-05-26): "CONDUTA" → /codigo-de-conduta.
// Mensagem institucional sempre visível (filosofia, manifesto). Substitui
// "SUBIR DE MMR" cinematic que virou tab simples na nav principal.
//
// VISITANTE DESLOGADO: vê CONDUTA + ENTRAR lado a lado na direita. Tabs
// PRO/ADMIN/Progresso/etc são filtrados naturalmente por role.

import Image from "next/image";
import Link from "next/link";
import { Settings, LogOut, LogIn, Shield, Eye, EyeOff, Radio, Swords } from "lucide-react";
import { signOut, signInWithDiscord } from "@/app/login/actions";
import { togglePreviewMode } from "@/lib/auth/preview-mode";
import { cn } from "@/lib/utils";
import { QueueStatusPill } from "@/components/queue/queue-status-pill";
import type { MyQueueEntry } from "@/lib/queries/queue";

type TopBarTabDef = {
  href: string;
  label: string;
  /** Prefixo usado pra match active state. Omitido = usa href. */
  matchPrefix?: string;
};

// Tab sempre visível pra todos (visitante/user/admin) — jornada principal
const SUBIR_MMR_TAB: TopBarTabDef = {
  href: "/ranked-com-pro",
  label: "Subir MMR",
};

// Tabs em desenvolvimento — só admin testa enquanto features não estão prontas.
// Progresso saiu daqui: agora é tab pública do perfil (/me?tab=progresso).
const ADMIN_ONLY_TABS: TopBarTabDef[] = [
  { href: "/ranking", label: "Ranking" },
  { href: "/times", label: "Times" },
  { href: "/torneios", label: "Torneios" },
];

interface Props {
  currentRoute?: string;
  /** Visitante deslogado: esconde logout, troca botão direita por Entrar, esconde PreviewToggle. */
  isVisitor: boolean;
  /** Effective admin (false se admin tá em preview mode). Usado pra UI condicional. */
  isAdmin: boolean;
  /** Admin real no banco (não muda com preview). Usado só pra mostrar toggle. */
  realIsAdmin: boolean;
  /** Preview mode ativo (admin vendo como user comum). */
  previewActive: boolean;
  /** User tem pro_promotion ativa/pausada — exibe tab contextual PRO. */
  isPro: boolean;
  prosOnlineCount: number;
  /** Jogadores buscando partida agora (entries waiting na fila). */
  searchingCount: number;
  /** Filas do user — quando >0, substitui a pílula "PROs online" por "Na fila".
   *  Pedro 2026-05-26: solução pro StickyBanner que forçava scroll. */
  myQueues: MyQueueEntry[];
}

export function DashboardTopBar({
  currentRoute,
  isVisitor,
  isAdmin,
  realIsAdmin,
  previewActive,
  isPro,
  prosOnlineCount,
  searchingCount,
  myQueues,
}: Props) {
  const inQueue = myQueues.length > 0;
  // Compõe nav principal: SUBIR MMR sempre + (Progresso/Ranking/Times/Torneios só admin)
  const principalTabs: TopBarTabDef[] = [SUBIR_MMR_TAB];
  if (isAdmin) {
    principalTabs.push(...ADMIN_ONLY_TABS);
  }

  const contextualTabs: TopBarTabDef[] = [];
  if (isPro) {
    contextualTabs.push({ href: "/pro", label: "Pro" });
  }
  if (isAdmin) {
    contextualTabs.push({
      href: "/admin/dashboard",
      label: "Admin",
      matchPrefix: "/admin",
    });
  }

  const isActive = (t: TopBarTabDef) =>
    currentRoute?.startsWith(t.matchPrefix ?? t.href) ?? false;

  return (
    <header
      className={cn(
        "relative z-[var(--z-overlay)] flex h-12 shrink-0 items-center justify-between px-4 xl:h-14 xl:px-6",
        // Glassmorphism — mesma cor do bg-deep (conteúdo) com leve transparência + blur
        "bg-bg-deep/75 backdrop-blur-xl",
        // Border accent brand — única "régua" visual marcando fim do header
        "border-b border-brand-primary/60",
      )}
    >
      {/* Esquerda — settings + logo + tabs (configurações só pra logado) */}
      <div className="flex items-center gap-2 xl:gap-4">
        {!isVisitor && (
          <>
            <TopBarIcon icon={Settings} label="Configurações" href="/me" />
            <div
              className="h-5 w-px bg-white/15 xl:h-6 xl:mx-1"
              aria-hidden="true"
            />
          </>
        )}

        <Link
          href="/dashboard"
          aria-label="FORMULADOTA — dashboard"
          className="shrink-0"
        >
          <Image
            src="/brand/logo-horizontal-white.png"
            alt="FORMULADOTA"
            width={1933}
            height={400}
            priority
            className="h-7 w-auto xl:h-9"
          />
        </Link>

        <div
          className="h-5 w-px bg-white/15 xl:h-6 xl:mx-1"
          aria-hidden="true"
        />

        <nav
          aria-label="Navegação principal"
          className="hidden lg:flex items-center gap-1"
        >
          {principalTabs.map((t) => (
            <TopBarTab
              key={t.href}
              href={t.href}
              label={t.label}
              active={isActive(t)}
            />
          ))}
        </nav>

        {contextualTabs.length > 0 && (
          <>
            <div
              className="hidden lg:block h-5 w-px bg-white/15 xl:h-6 xl:mx-1"
              aria-hidden="true"
            />
            <nav
              aria-label="Navegação contextual"
              className="hidden lg:flex items-center gap-1"
            >
              {contextualTabs.map((t) => (
                <TopBarTab
                  key={t.href}
                  href={t.href}
                  label={t.label}
                  active={isActive(t)}
                />
              ))}
            </nav>
          </>
        )}
      </div>

      {/* Centro — XOR:
            - Em fila → pílula "Na fila · 2º · sair" (Pedro 2026-05-26)
            - Fora de fila → status "X PROs online"
          A pílula de fila substitui a de PROs porque a info mais relevante no
          momento é o estado atual do user, não a quantidade de PROs disponíveis. */}
      {inQueue ? (
        <QueueStatusPill queues={myQueues} />
      ) : (
        <div className="hidden xl:flex items-center gap-2">
          {prosOnlineCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-1">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-display text-sm font-semibold text-success/90">
                {prosOnlineCount}{" "}
                {prosOnlineCount === 1 ? "PRO online" : "PROs online"}
              </span>
              <Radio size={12} className="text-success/80" aria-hidden="true" />
            </div>
          )}
          {searchingCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-1">
              <Swords size={12} className="text-info/80" aria-hidden="true" />
              <span className="font-display text-sm font-semibold text-info/90">
                {searchingCount}{" "}
                {searchingCount === 1 ? "jogador buscando" : "jogadores buscando"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Direita — CONDUTA cinematic (todos) + (Entrar/Logout) + PreviewToggle (admin real) */}
      <div className="flex items-center gap-1.5 xl:gap-2">
        {realIsAdmin && <PreviewModeToggle previewActive={previewActive} />}
        <CondutaBadge />
        {isVisitor ? (
          <EntrarBadge />
        ) : (
          <form action={signOut}>
            <button
              type="submit"
              aria-label="Sair"
              className="flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </header>
  );
}

function PreviewModeToggle({ previewActive }: { previewActive: boolean }) {
  return (
    <form action={togglePreviewMode}>
      <button
        type="submit"
        aria-label={previewActive ? "Voltar pra modo admin" : "Ver como usuário comum"}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display text-sm font-semibold transition-colors xl:px-3 ${
          previewActive
            ? "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
        }`}
      >
        {previewActive ? (
          <>
            <EyeOff size={11} aria-hidden="true" />
            <span className="hidden xl:inline">Voltar pra admin</span>
            <span className="xl:hidden">Admin</span>
          </>
        ) : (
          <>
            <Eye size={11} aria-hidden="true" />
            <span className="hidden xl:inline">Ver como user</span>
            <span className="xl:hidden">User</span>
          </>
        )}
      </button>
    </form>
  );
}

function CondutaBadge() {
  // CTA institucional sempre visível — manifesto/filosofia da plataforma.
  // Estética cinematic brand (vermelho + glow) — antes ocupada pelo SUBIR MMR.
  // Conduta é gate cultural: lido por todos antes de jogar a primeira PT.
  return (
    <Link
      href="/codigo-de-conduta"
      aria-label="Código de Conduta — manifesto FORMULADOTA"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md",
        "px-2.5 py-1 xl:px-3 xl:py-1.5",
        "border-2 border-brand-primary",
        "bg-gradient-to-b from-brand-primary to-brand-primary-hover",
        "font-display text-sm xl:text-sm font-bold uppercase",
        "tracking-[0.15em] xl:tracking-[0.2em] text-text-display",
        "shadow-[0_0_12px_var(--color-brand-primary-glow)]",
        "hover:shadow-[0_0_24px_var(--color-brand-primary-glow)]",
        "hover:brightness-110 transition-all",
      )}
    >
      <Shield size={12} aria-hidden="true" />
      <span>Conduta</span>
    </Link>
  );
}

function EntrarBadge() {
  // CTA Discord OAuth pra visitante — estética cinematic igual ao CondutaBadge
  // pra consistência visual; aparece AO LADO da Conduta.
  return (
    <form action={signInWithDiscord}>
      <button
        type="submit"
        aria-label="Entrar com Discord"
        className={cn(
          "group inline-flex items-center gap-1.5 rounded-md",
          "px-2.5 py-1 xl:px-3 xl:py-1.5",
          "border-2 border-brand-primary",
          "bg-gradient-to-b from-brand-primary to-brand-primary-hover",
          "font-display text-sm xl:text-sm font-bold uppercase",
          "tracking-[0.15em] xl:tracking-[0.2em] text-text-display",
          "shadow-[0_0_12px_var(--color-brand-primary-glow)]",
          "hover:shadow-[0_0_24px_var(--color-brand-primary-glow)]",
          "hover:brightness-110 transition-all"
        )}
      >
        <LogIn size={12} aria-hidden="true" />
        <span>Entrar</span>
      </button>
    </form>
  );
}

function TopBarTab({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      /* Teko condensed na nav (liberada 2026-06-11) — feel Dota 2/GamersClub.
         text-lg porque condensed tem x-height baixo: 18px Teko ≈ 14px Ubuntu. */
      className={`rounded-md px-2.5 py-1 font-display-condensed text-lg leading-none font-medium uppercase tracking-[0.08em] transition-colors xl:px-3 xl:tracking-[0.12em] ${
        active
          ? "bg-brand-primary/15 text-text-display border-b-2 border-brand-primary rounded-b-none"
          : "text-text-body hover:bg-bg-elevated hover:text-text-display"
      }`}
    >
      {label}
    </Link>
  );
}

function TopBarIcon({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Settings;
  label: string;
  href?: string;
}) {
  const cls =
    "flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors";
  if (href) {
    return (
      <Link href={href} aria-label={label} className={cls}>
        <Icon size={16} aria-hidden="true" />
      </Link>
    );
  }
  return (
    <button type="button" aria-label={label} className={cls}>
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
