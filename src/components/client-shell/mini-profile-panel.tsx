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
// Painel fecha pelo ícone OU por clique-fora — EXCETO na rota principal ("/"),
// onde fica travado aberto (lockedExpanded). Pedro 2026-07-04.

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Crown, LogIn, Users, ShieldCheck, TrendingUp } from "lucide-react";
import { type DotaRank } from "@/components/ui/dota-rank-medal";
import { type HonorRank } from "@/components/ui/honor-rank-medal";
import { MedalPair } from "@/components/ui/medal-pair";
import { signInWithDiscord } from "@/app/login/actions";
import { toggleSidebar } from "@/lib/auth/sidebar-preference";
import { FriendsList } from "@/components/profile/friends-list";
import { PartyFrame } from "@/components/party/party-frame";
import { Tooltip } from "@/components/ui/tooltip";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { QUESTIONS_PER_PERMISSION } from "@/lib/quiz/permissions";
import type { FriendListEntry } from "@/lib/queries/friends";
import type { PartyView } from "@/lib/queries/party";
import type { RingAsset, FrameAsset } from "@/lib/cosmetics";

interface Props {
  isVisitor: boolean;
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  /** Nível da conta (0-30) pro avatar-ring. */
  level: number;
  /** Progresso de XP dentro do nível (0-1) — barra na borda do avatar. */
  xpPct: number;
  /** Saldo de permissões de partida (5 acertos = 1). */
  permissions: number;
  /** Medalha SKILL (Valve) — calculada no shell (rank Valve real > MMR), igual ao /me. */
  dotaRank: DotaRank;
  /** Estrelas (1-5) da medalha SKILL — sem isso a medalha vinha sem estrela. */
  skillStars?: number;
  /** Medalha HONOR (nível) — calculada no shell (getGatedTierForLevel), igual ao /me. */
  honorRank: HonorRank;
  /** Rank FormulaDota sazonal (Eixo 2) — 3º selo opcional, igual ao /me. */
  seasonRank?: DotaRank;
  /** Estrelas (1-5) da medalha SEASON — igual ao /me. */
  seasonStars?: number;
  /** Número (#N) na placa da medalha SEASON — só top-30 Imortal, igual ao /ranking. */
  seasonLeaderboardNumber?: number;
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
  /** Grupo atual — renderiza os 4 slots ao lado do card (estilo Dota). */
  party?: PartyView | null;
  /** Amigos aceitos — pra lista de convite dos slots do grupo. */
  friends?: FriendListEntry[];
  /** Cosmético de ring equipado (glow) — null = default por tier. */
  ringVariant?: RingAsset | null;
  /** Cosmético de moldura equipado. */
  frame?: FrameAsset | null;
}

export function MiniProfilePanel({
  isVisitor,
  persona,
  avatar,
  tag,
  isAdmin,
  level,
  xpPct,
  permissions,
  dotaRank,
  skillStars,
  honorRank,
  seasonRank,
  seasonStars,
  seasonLeaderboardNumber,
  initialExpanded,
  lockedExpanded = false,
  currentUserId,
  initialFriends,
  initialPending = [],
  currentLobbyId = null,
  party = null,
  friends = [],
  ringVariant = null,
  frame = null,
}: Props) {
  // Par canônico de medalhas (mandamento M12): SKILL (Valve) + HONOR (nível).
  // dotaRank/honorRank vêm prontos do shell — MESMA fonte do /me e do hover-card.
  // Pedidos RECEBIDOS pedem ação — badge visível mesmo com o painel fechado.
  const pendingIncomingCount = initialPending.filter(
    (p) => p.direction === "incoming"
  ).length;
  // Estado client-side pra UX instant (sem reload). Cookie persiste async.
  const [expandedState, setExpanded] = useState(initialExpanded);
  const expanded = lockedExpanded || expandedState;
  const [, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  function collapse() {
    setExpanded(false);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  function handleToggle() {
    setExpanded((prev) => !prev);
    startTransition(() => {
      void toggleSidebar();
    });
  }

  // Clique-fora retrai o painel — mas NUNCA na rota principal (lockedExpanded) nem
  // quando já está fechado. Ignora cliques em overlays portados (tooltips/menus/
  // popovers Radix, toasts), que vivem fora da árvore do painel mas são interação
  // dele. Pedro 2026-07-04.
  useEffect(() => {
    if (lockedExpanded || !expandedState) return;
    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      const target = e.target as Node | null;
      if (!root || (target && root.contains(target))) return;
      if (
        target instanceof Element &&
        target.closest(
          '[data-radix-popper-content-wrapper],[role="menu"],[role="dialog"],[role="listbox"],[data-sonner-toast]'
        )
      ) {
        return;
      }
      collapse();
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [expandedState, lockedExpanded]);

  // Visitante: card minimal com CTA entrar (não tem painel de amigos)
  if (isVisitor) {
    return (
      <div className="pointer-events-auto fixed left-4 bottom-4 z-[var(--z-overlay)] hidden w-[280px] sm:block">
        <VisitorCardCompact />
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="pointer-events-auto fixed left-4 bottom-4 z-[var(--z-overlay)] hidden flex-col items-start sm:flex"
    >
      {/* Painel expandido — cresce A PARTIR do card retraído (conectado, sem gap).
          Quando expanded=true, borda inferior do painel + borda superior do card
          são planas, formando um único componente visual contínuo. */}
      {expanded && (
        <ExpandedPanel
          persona={persona}
          avatar={avatar}
          tag={tag}
          isAdmin={isAdmin}
          level={level}
          xpPct={xpPct}
          dotaRank={dotaRank}
          skillStars={skillStars}
          honorRank={honorRank}
          seasonRank={seasonRank}
          seasonStars={seasonStars}
          seasonLeaderboardNumber={seasonLeaderboardNumber}
          currentUserId={currentUserId}
          initialFriends={initialFriends}
          initialPending={initialPending}
          currentLobbyId={currentLobbyId}
          ringVariant={ringVariant}
          frame={frame}
        />
      )}

      {/* Linha inferior — card retraído + ícone toggle SEMPRE visíveis.
          Card conecta visualmente ao painel quando expanded (sem gap, bordas planas).
          Ícone fica FORA (externo ao card) na lateral direita. */}
      <div className="flex items-stretch gap-2">
        <CollapsedCard
          persona={persona}
          avatar={avatar}
          level={level}
          xpPct={xpPct}
          permissions={permissions}
          currentUserId={currentUserId}
          party={party}
          friends={friends}
          ringVariant={ringVariant}
          frame={frame}
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
  level,
  xpPct,
  permissions,
  currentUserId,
  party,
  friends,
  ringVariant,
  frame,
  connectedTop = false,
  onToggle,
  locked = false,
}: {
  persona: string | null;
  avatar: string | null;
  level: number;
  xpPct: number;
  permissions: number;
  currentUserId: string | null;
  party: PartyView | null;
  friends: FriendListEntry[];
  ringVariant: RingAsset | null;
  frame: FrameAsset | null;
  /** Quando true (painel expandido aberto), borda superior + canto superior
      ficam planos pra conectar visualmente ao ExpandedPanel acima. */
  connectedTop?: boolean;
  onToggle: () => void;
  /** Página principal: card é base fixa do painel — sem ação de retrair. */
  locked?: boolean;
}) {
  const t = useTranslations("shell");
  const name = persona ?? t("anon");
  // Largura casada com o respiro da right-sidebar (12px): pl do main (360/380 em
  // xl/2xl) − 16px (âncora left-4) − 12px (gap alvo) = 332/352. Deixa o espaçamento
  // conteúdo↔mini igual ao conteúdo↔cards (Pedro 2026-07-05). Piso ~314px pelos 4
  // slots de grupo — por isso o lg fica em 332 (não encolhe mais).
  const baseCls = `flex w-[332px] 2xl:w-[352px] items-center gap-2 border border-brand-primary/30 bg-bg-deep/90 backdrop-blur-md px-3 py-2 shadow-lg shadow-black/60 transition-colors ${
    connectedTop ? "rounded-b-md rounded-t-none border-t-0" : "rounded-md"
  }`;
  // Foto de perfil (40px). Sem nome/tag no card retraído (Pedro 2026-06-30): os
  // slots do grupo ocupam essa região, no MESMO tamanho da foto.
  const avatarEl = (
    <XpAvatarRing
      src={avatar}
      alt={t("avatarAlt", { name })}
      fallback={(persona ?? "??").slice(0, 2)}
      level={level}
      pct={xpPct}
      size={40}
      ringVariant={ringVariant}
      frame={frame}
      premiumEffect
    />
  );
  return (
    <div className={baseCls}>
      {locked ? (
        avatarEl
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-label={connectedTop ? t("collapseProfile") : t("expandProfile")}
          aria-expanded={connectedTop}
          title={name}
          className="shrink-0 rounded-sm transition-opacity hover:opacity-90"
        >
          {avatarEl}
        </button>
      )}
      {/* Slots do grupo — colados na foto (estilo cliente Dota 2). */}
      {currentUserId && (
        <PartyFrame currentUserId={currentUserId} initialParty={party} friends={friends} />
      )}
      <div className="flex-1" />
      <PermissionsBadge permissions={permissions} />
    </div>
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
  level,
  xpPct,
  dotaRank,
  skillStars,
  honorRank,
  seasonRank,
  seasonStars,
  seasonLeaderboardNumber,
  currentUserId,
  initialFriends,
  initialPending,
  currentLobbyId,
  ringVariant,
  frame,
}: {
  persona: string | null;
  avatar: string | null;
  tag: string;
  isAdmin: boolean;
  level: number;
  xpPct: number;
  dotaRank: DotaRank;
  skillStars?: number;
  honorRank: HonorRank;
  seasonRank?: DotaRank;
  seasonStars?: number;
  seasonLeaderboardNumber?: number;
  currentUserId: string | null;
  initialFriends: FriendListEntry[];
  initialPending: FriendListEntry[];
  currentLobbyId: string | null;
  ringVariant: RingAsset | null;
  frame: FrameAsset | null;
}) {
  const t = useTranslations("shell");
  const name = persona ?? t("anon");
  return (
    <aside
      aria-label={t("miniProfileAria")}
      className="flex w-[332px] 2xl:w-[352px] flex-col gap-3 rounded-t-md rounded-b-none border border-b-0 border-brand-primary/40 bg-bg-deep/95 backdrop-blur-xl p-4 shadow-2xl shadow-black/80 h-[calc(100dvh-152px)] xl:h-[calc(100dvh-168px)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200"
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
            ringVariant={ringVariant}
            frame={frame}
            premiumEffect
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
          {/* Só rank sazonal + honra inline; a Valve fica no showcase do hover
              (skillInline=false), pra não competir com a nossa medalha. */}
          <MedalPair
            dotaRank={dotaRank}
            dotaStars={skillStars}
            honorRank={honorRank}
            seasonRank={seasonRank}
            seasonStars={seasonStars}
            seasonLeaderboardNumber={seasonLeaderboardNumber}
            skillInline={false}
            // Só o rank sazonal (MMR) inline. A honra sai do par: já está no nível
            // (anel do avatar + card de progresso) — mostrar as duas é redundante.
            // Com 1 medalha só, cabe voltar pro lg (72px) e o nick ainda tem ~15+
            // chars. A honra segue no showcase do hover. Pedro 2026-07-05.
            honorInline={false}
            size="lg"
            side="right"
            align="start"
            className="shrink-0 self-center"
          />
        </Link>
      </header>

      {/* Progresso de nível (fideliza — eixo lealdade). Substituiu o card de fichas,
          que pertence ao ranked-com-pro/fichas (feature flag off). Pedro 2026-07-02. */}
      <LevelProgressCard level={level} xpPct={xpPct} />

      {/* Lista de amigos (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <FriendsList
          currentUserId={currentUserId ?? ""}
          initialFriends={initialFriends}
          initialPending={initialPending}
          currentLobbyId={currentLobbyId}
        />
      </div>

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

// Progresso de nível (eixo lealdade): barra de XP pro próximo nível. Usa dados que
// o mini-perfil já tem (level + xpPct), sem query nova. No nível 30 (Místico) = máximo.
function LevelProgressCard({ level, xpPct }: { level: number; xpPct: number }) {
  const t = useTranslations("shell");
  const maxed = level >= 30;
  const pct = Math.max(0, Math.min(100, Math.round(xpPct * 100)));
  return (
    <div className="rounded border border-border-subtle bg-bg-elevated/40 px-3 py-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-semibold text-text-body">
          <TrendingUp size={12} className="text-brand-primary" aria-hidden="true" />
          {t("levelCardTitle")}
        </span>
        <span className="font-display-condensed text-lg font-bold tabular-nums text-gold">
          {level}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-deep">
        <div
          className="h-full rounded-full bg-brand-primary transition-all"
          style={{ width: `${maxed ? 100 : pct}%` }}
        />
      </div>
      <p className="mt-1 font-display text-xs text-text-faded">
        {maxed ? t("levelMaxed") : t("levelToNext", { pct, next: level + 1 })}
      </p>
    </div>
  );
}

