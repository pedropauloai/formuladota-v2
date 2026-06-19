"use client";

// Mini-Profile Panel — Phase 9 refator 2026-05-26 (fidelidade Dota 2 client).
//
// LAYOUT:
//
//   ESTADO FECHADO (sempre visível):
//     ┌────────────────────────┐ ┌───┐
//     │ Avatar | Nome [tag]    │ │ U │  ← card retraído + ícone AO LADO direito
//     └────────────────────────┘ └───┘     (ícone é trigger, card é Link → /me)
//
//   ESTADO ABERTO (panel cresce ACIMA do card retraído):
//     ┌──────────────────────────┐
//     │ Painel grande            │
//     │ avatar + nome + saldo    │
//     │ AMIGOS lista             │
//     │ atalhos                  │
//     └──────────────────────────┘
//     ┌────────────────────────┐ ┌───┐
//     │ Avatar | Nome [tag]    │ │ U │  ← continuam visíveis
//     └────────────────────────┘ └───┘     (ícone com estado ativo brand)
//
// Click no ícone alterna abrir/fechar.
// Avatar+nome no card retraído (e no header do painel) são Link → /me.
// Painel só fecha pelo ícone (sem click-outside, sem X interno).

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import {
  Coins,
  Crown,
  ExternalLink,
  MessageSquare,
  BookOpen,
  LogIn,
  Users,
  UserPlus,
  ShieldCheck,
} from "lucide-react";
import { type DotaRank } from "@/components/ui/dota-rank-medal";
import { type HonorRank } from "@/components/ui/honor-rank-medal";
import { MedalPair } from "@/components/ui/medal-pair";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { getGatedTierForLevel } from "@/lib/levels";
import { signInWithDiscord } from "@/app/login/actions";
import { toggleSidebar } from "@/lib/auth/sidebar-preference";
import { FriendsList } from "@/components/profile/friends-list";
import { Tooltip } from "@/components/ui/tooltip";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { QUESTIONS_PER_PERMISSION } from "@/lib/quiz/permissions";
import type { FriendListEntry } from "@/lib/queries/friends";

interface Props {
  isVisitor: boolean;
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  /** Nível da conta (0-30) pro avatar-ring. */
  level: number;
  /** Progresso de XP dentro do nível (0-1) — barra na borda do avatar. */
  xpPct: number;
  /** Saldo de permissões de partida (5 acertos = 1). */
  permissions: number;
  /** MMR atual (profiles.mmr_atual) — par de medalhas SKILL+HONOR. */
  mmr: number | null;
  /** Estado inicial do cookie sidebar_expanded — passado do shell SSR. */
  initialExpanded: boolean;
  /**
   * Página principal (/): mini-perfil SEMPRE expandido — sem botão de
   * expandir/retrair e sem toggle no card (Pedro 2026-06-12).
   */
  lockedExpanded?: boolean;
  /** UUID do user logado — pra usePresenceChannel. Null se visitante. */
  currentUserId: string | null;
  /** Amigos aceitos — fetched no shell.tsx (server-side). */
  initialFriends: FriendListEntry[];
  /** Pedidos pendentes (recebidos + enviados) — fetched no shell.tsx. */
  initialPending?: FriendListEntry[];
  /** Sala ABERTA em que o user está — habilita "Convidar pra sala". */
  currentLobbyId?: string | null;
}

export function MiniProfilePanel({
  isVisitor,
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  level,
  xpPct,
  permissions,
  mmr,
  initialExpanded,
  lockedExpanded = false,
  currentUserId,
  initialFriends,
  initialPending = [],
  currentLobbyId = null,
}: Props) {
  // Par canônico de medalhas (mandamento M12): SKILL (Valve/MMR) + HONOR (nível).
  const dotaRank = mmrToDotaRank(mmr);
  const honorRank = getGatedTierForLevel(level, mmr);
  // Pedidos RECEBIDOS pedem ação — badge visível mesmo com o painel fechado.
  const pendingIncomingCount = initialPending.filter(
    (p) => p.direction === "incoming"
  ).length;
  // Estado client-side pra UX instant (sem reload). Cookie persiste async.
  const [expandedState, setExpanded] = useState(initialExpanded);
  const expanded = lockedExpanded || expandedState;
  const [, startTransition] = useTransition();

  function handleToggle() {
    setExpanded((prev) => !prev);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  // Visitante: card minimal com CTA entrar (não tem painel de amigos)
  if (isVisitor) {
    return (
      <div className="pointer-events-auto fixed left-4 bottom-4 z-[var(--z-overlay)] hidden w-[280px] sm:block">
        <VisitorCardCompact />
      </div>
    );
  }

  return (
    <div className="pointer-events-auto fixed left-4 bottom-4 z-[var(--z-overlay)] hidden flex-col items-start sm:flex">
      {/* Painel expandido — cresce A PARTIR do card retraído (conectado, sem gap).
          Quando expanded=true, borda inferior do painel + borda superior do card
          são planas, formando um único componente visual contínuo. */}
      {expanded && (
        <ExpandedPanel
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          level={level}
          xpPct={xpPct}
          dotaRank={dotaRank}
          honorRank={honorRank}
          currentUserId={currentUserId}
          initialFriends={initialFriends}
          initialPending={initialPending}
          currentLobbyId={currentLobbyId}
        />
      )}

      {/* Linha inferior — card retraído + ícone toggle SEMPRE visíveis.
          Card conecta visualmente ao painel quando expanded (sem gap, bordas planas).
          Ícone fica FORA (externo ao card) na lateral direita. */}
      <div className="flex items-stretch gap-2">
        <CollapsedCard
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          level={level}
          xpPct={xpPct}
          permissions={permissions}
          pendingCount={pendingIncomingCount}
          connectedTop={expanded}
          onToggle={handleToggle}
          locked={lockedExpanded}
        />
        {!lockedExpanded && (
          <ToggleIcon
            expanded={expanded}
            onToggle={handleToggle}
            pendingCount={pendingIncomingCount}
          />
        )}
      </div>
    </div>
  );
}

// ===========================================================================
// CollapsedCard — card avatar+nome, sempre visível na linha base.
// Pedro 2026-06-12: o card retraído EXPANDE o mini-perfil (não navega mais
// pro perfil — o link pro /me vive no header do painel expandido).
// ===========================================================================

function CollapsedCard({
  persona,
  avatar,
  tag,
  isAdmin,
  level,
  xpPct,
  permissions,
  pendingCount = 0,
  connectedTop = false,
  onToggle,
  locked = false,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  level: number;
  xpPct: number;
  permissions: number;
  /** Pedidos de amizade RECEBIDOS — badge visível sem abrir o painel. */
  pendingCount?: number;
  /** Quando true (painel expandido aberto), borda superior + canto superior
      ficam planos pra conectar visualmente ao ExpandedPanel acima. */
  connectedTop?: boolean;
  onToggle: () => void;
  /** Página principal: card é base fixa do painel — sem ação de retrair. */
  locked?: boolean;
}) {
  const t = useTranslations("shell");
  const name = persona ?? t("anon");
  const baseCls = `flex w-[340px] xl:w-[380px] items-center gap-3 border border-brand-primary/30 bg-bg-deep/90 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60 transition-colors ${
    connectedTop ? "rounded-b-md rounded-t-none border-t-0" : "rounded-md"
  }`;
  const inner = (
    <>
      <XpAvatarRing
        src={avatar}
        alt={t("avatarAlt", { name })}
        fallback={(persona ?? "??").slice(0, 2)}
        level={level}
        pct={xpPct}
        size={36}
      />
      <div className="flex-1 min-w-0 text-left">
        <p className="font-display text-sm font-semibold text-text-display truncate">
          {name}
        </p>
        <p className="font-display text-sm font-semibold text-brand-primary/80 leading-tight">
          [{tag}]
          {isAdmin && (
            <Crown size={11} className="ml-1 inline text-gold" aria-label={t("admin")} />
          )}
        </p>
      </div>
      {pendingCount > 0 && <PendingRequestsBadge count={pendingCount} />}
      <PermissionsBadge permissions={permissions} />
    </>
  );

  // Página principal: sempre expandido — o card é só a base visual do painel.
  if (locked) return <div className={baseCls}>{inner}</div>;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={connectedTop ? t("collapseProfile") : t("expandProfile")}
      aria-expanded={connectedTop}
      className={`${baseCls} hover:border-brand-primary/60 hover:bg-bg-elevated/80`}
    >
      {inner}
    </button>
  );
}

// Pedidos de amizade recebidos — pedido tem que ser visível SEM abrir o painel
// (pacote social 2026-06-12). Dot/contador pode ser redondo (não é avatar).
function PendingRequestsBadge({ count }: { count: number }) {
  const t = useTranslations("shell");
  return (
    <Tooltip
      content={t("pendingRequestsTooltip", { count })}
      side="top"
      align="end"
      className="shrink-0"
    >
      <span className="flex items-center gap-1 rounded-sm border border-success/40 bg-success/10 px-1.5 py-1 font-display text-sm font-bold text-success">
        <UserPlus size={13} aria-hidden="true" />
        <span className="tabular-nums">{count}</span>
      </span>
    </Tooltip>
  );
}

// Indicador de permissões de partida (5 acertos = 1). Hover educacional explica.
function PermissionsBadge({ permissions }: { permissions: number }) {
  const t = useTranslations("shell");
  return (
    <Tooltip
      content={t("permissionsTooltip", { count: QUESTIONS_PER_PERMISSION })}
      side="top"
      align="end"
      className="shrink-0"
    >
      <span className="flex items-center gap-1 rounded-sm border border-brand-primary/30 bg-brand-primary/10 px-1.5 py-1 font-display text-sm font-bold text-brand-primary">
        <ShieldCheck size={13} aria-hidden="true" />
        <span className="tabular-nums">{permissions}</span>
      </span>
    </Tooltip>
  );
}

// ===========================================================================
// ToggleIcon — botão Users à direita do card retraído (trigger único)
// ===========================================================================

function ToggleIcon({
  expanded,
  onToggle,
  pendingCount = 0,
}: {
  expanded: boolean;
  onToggle: () => void;
  /** Pedidos de amizade recebidos — bolha numérica sobre o ícone. */
  pendingCount?: number;
}) {
  const t = useTranslations("shell");
  const pendingLabel =
    pendingCount > 0 ? t("pendingSuffix", { count: pendingCount }) : "";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={
        (expanded ? t("closeFriends") : t("openFriends")) + pendingLabel
      }
      aria-expanded={expanded}
      title={expanded ? t("closeFriendsShort") : t("openFriendsShort")}
      className={`relative flex w-12 shrink-0 items-center justify-center rounded-md border backdrop-blur-md transition-all shadow-lg shadow-black/60 ${
        expanded
          ? "border-brand-primary bg-brand-primary/20 text-text-display shadow-[0_0_16px_var(--color-brand-primary-glow)]"
          : "border-brand-primary/30 bg-bg-deep/90 text-text-muted hover:border-brand-primary/60 hover:text-text-display"
      }`}
    >
      <Users size={20} aria-hidden="true" />
      {pendingCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 flex min-w-5 h-5 items-center justify-center rounded-full border border-bg-deep bg-brand-primary px-1 font-display text-[11px] font-bold tabular-nums text-text-display"
        >
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      )}
    </button>
  );
}

// ===========================================================================
// ExpandedPanel — slideup overlay ~340x600px com user + amigos + atalhos.
// Aparece ACIMA do card retraído + ícone quando expanded=true.
// ===========================================================================

function ExpandedPanel({
  persona,
  avatar,
  tag,
  isAdmin,
  fichaBalance,
  level,
  xpPct,
  dotaRank,
  honorRank,
  currentUserId,
  initialFriends,
  initialPending,
  currentLobbyId,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  fichaBalance: number;
  level: number;
  xpPct: number;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  currentUserId: string | null;
  initialFriends: FriendListEntry[];
  initialPending: FriendListEntry[];
  currentLobbyId: string | null;
}) {
  const t = useTranslations("shell");
  const name = persona ?? t("anon");
  return (
    <aside
      aria-label={t("miniProfileAria")}
      className="flex w-[340px] xl:w-[380px] flex-col gap-3 rounded-t-md rounded-b-none border border-b-0 border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 h-[calc(100dvh-152px)] xl:h-[calc(100dvh-168px)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
    >
      {/* Header — avatar + nome = Link pra /me */}
      <header>
        <Link
          href="/me"
          aria-label={t("viewProfile")}
          className="flex items-start gap-3 rounded hover:bg-bg-elevated/40 transition-colors p-1 -m-1"
        >
          <XpAvatarRing
            src={avatar}
            alt={t("avatarAlt", { name })}
            fallback={(persona ?? "??").slice(0, 2)}
            level={level}
            pct={xpPct}
            size={52}
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg font-semibold text-text-display truncate">
              {name}
            </p>
            <p className="font-display text-sm font-semibold text-brand-primary/80 mt-0.5">
              [{tag}]
              {isAdmin && (
                <Crown size={12} className="ml-1 inline text-gold" aria-label={t("admin")} />
              )}
            </p>
          </div>
          {/* Par canônico SKILL + HONOR — hover combinado abre SUTILMENTE pra
              DIREITA do mini-perfil (Pedro 2026-06-12), não pra cima. */}
          <MedalPair
            dotaRank={dotaRank}
            honorRank={honorRank}
            size="md"
            side="right"
            align="start"
            className="shrink-0 self-center"
          />
        </Link>
      </header>

      {/* Saldo de fichas compact */}
      <FichasCard balance={fichaBalance} isAdmin={isAdmin} />

      {/* Lista de amigos (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FriendsList
          currentUserId={currentUserId ?? ""}
          initialFriends={initialFriends}
          initialPending={initialPending}
          currentLobbyId={currentLobbyId}
        />
      </div>

      {/* Atalhos compactos no fim */}
      <nav aria-label={t("shortcuts")} className="space-y-1 border-t border-border-subtle pt-3">
        <CompactLink href="/codigo-de-conduta" label={t("codeOfConduct")} icon={BookOpen} />
        <CompactLink
          href="https://discord.com/invite/v3pSuZhjBE"
          label={t("discordOfficial")}
          icon={MessageSquare}
          external
        />
      </nav>
    </aside>
  );
}

// ===========================================================================
// Subcomponentes
// ===========================================================================

function VisitorCardCompact() {
  const t = useTranslations("shell");
  return (
    <div className="rounded-md border border-border-subtle bg-bg-deep/95 backdrop-blur-md p-3 shadow-lg shadow-black/60">
      <div className="flex items-center gap-3">
        <div className="size-10 shrink-0 rounded-sm border-2 border-border-subtle bg-bg-deep/80 flex items-center justify-center">
          <LogIn size={14} className="text-text-muted" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-sm font-semibold text-text-display">{t("visitor")}</p>
          <p className="font-display text-sm text-text-muted">{t("visitorSubtitle")}</p>
        </div>
      </div>
      <form action={signInWithDiscord} className="mt-2">
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-1.5 rounded border border-brand-primary/60 bg-brand-primary/10 px-2 py-1.5 font-display text-sm font-semibold text-brand-primary hover:bg-brand-primary/20 transition-colors"
        >
          <LogIn size={11} aria-hidden="true" />
          <span>{t("signInDiscord")}</span>
        </button>
      </form>
    </div>
  );
}

// Moeda = dourado (família GOLD, Pedro 2026-06-11): número em text-gold,
// label associado em text-gold-muted, chrome do card em border-gold.
function FichasCard({ balance, isAdmin }: { balance: number; isAdmin: boolean }) {
  const t = useTranslations("shell");
  return (
    <div className="rounded border border-border-gold/40 bg-gradient-to-br from-gold/10 to-transparent px-3 py-2">
      {/* Hover educacional: o que é 1 ficha e quanto custa */}
      <Tooltip
        content={t("fichasTooltip")}
        side="top"
        align="start"
      >
        <span className="flex items-center gap-2">
          <Coins size={12} className="text-gold" aria-hidden="true" />
          <span className="font-display text-sm font-semibold text-gold-muted">
            {t("fichasBalance")}
          </span>
        </span>
      </Tooltip>
      <p className="mt-1 font-display text-xl font-bold tabular-nums text-gold">
        {isAdmin ? "∞" : balance}
        <span className="ml-2 font-display text-sm font-semibold text-gold-muted">
          {isAdmin ? t("adminUnit") : t("fichaUnit", { count: balance })}
        </span>
      </p>
    </div>
  );
}

function CompactLink({
  href,
  label,
  icon: Icon,
  external,
}: {
  href: string;
  label: string;
  icon: typeof BookOpen;
  external?: boolean;
}) {
  const cls =
    "flex items-center gap-2 rounded px-2 py-1.5 font-sans text-sm text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        <Icon size={12} aria-hidden="true" />
        {label}
        <ExternalLink size={9} className="ml-auto text-text-faded" aria-hidden="true" />
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
