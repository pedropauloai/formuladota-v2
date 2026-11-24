// Top Bar: réplica da barra superior do cliente do Dota 2 com a pele do FORMULADOTA.
// Ref: "dota 2 menu.png" (medidas em docs/foundations/DOTA2_CLIENT_REFERENCE.md).
//
// Esquerda: engrenagem + placa do logo (desce abaixo da barra, com brilho) + abas em placas
// chanfradas. Centro: status da fila ou PROs online. Direita: contadores da comunidade +
// atalhos em placas (Planos na placa dourada, no lugar do Dota Plus) + CONDUTA e ENTRAR em
// placas vermelhas.
//
// Abas principais: visíveis para todos, inclusive visitante (Pedro 2026-06-18). "Subir MMR"
// e "Loja" obedecem às flags ranked_com_pro e loja, que são autoritativas (top-bar-tabs.ts).
// Abas contextuais: PRO (isPro) e ADMIN (isAdmin). JOGAR é o logo, que leva a /dashboard.

import { Link } from "@/i18n/navigation";
import {
  LogIn,
  Shield,
  Eye,
  EyeOff,
  Radio,
  Swords,
  Palette,
  Crown,
  Bell,
  type LucideIcon,
} from "lucide-react";
import { signInWithDiscord } from "@/app/login/actions";
import { togglePreviewMode } from "@/lib/auth/preview-mode";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { QueueStatusPill } from "@/components/queue/queue-status-pill";
import { MatchQueuePill } from "@/components/queue/match-queue-pill";
import { CommunityCountersBar } from "./community-counters";
import { MobileNav } from "./mobile-nav";
import type { MyQueueEntry } from "@/lib/queries/queue";
import type { CommunityCounters } from "@/actions/community";
import { useTranslations } from "next-intl";
import { SettingsPopup } from "./settings-popup";
import { principalTabDefs } from "./top-bar-tabs";
import {
  LogoPlate,
  PlateIconLink,
  PlateTab,
  plateClass,
  topBarEndcap,
  topBarNavMain,
  topBarSkin,
} from "./top-bar-chrome";

type TopBarTabDef = {
  href: string;
  label: string;
  /** Prefixo usado pra match active state. Omitido = usa href. */
  matchPrefix?: string;
  /** Ponto de ao vivo (aba Loja com a live do Pedro no ar). */
  live?: boolean;
};

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
  /** Contadores públicos (online + banidos) — estilo GamersClub, sempre visíveis. */
  communityCounters: CommunityCounters;
  /** Feature flag: mostra a aba "Subir MMR / Ranked com PRO". Off = esconde. */
  showRankedComPro: boolean;
  /** Feature flag loja: mostra a aba "Loja". Off = esconde para todos. */
  showLoja: boolean;
  /** Flag fila_competitiva (a liga): sem ela, somem as abas da liga e o contador mostra só o online. */
  showLiga: boolean;
  /** Flag sala_voz: a aba da sala de voz pública da live. */
  showSala: boolean;
  /** Live do PPA no ar: a aba Fila ganha o ponto vermelho. */
  lojaLive: boolean;
  /** Novidades publicadas depois da última visita do user (badge do sino). */
  changelogUnread: number;
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
  communityCounters,
  showRankedComPro,
  showLoja,
  showLiga,
  showSala,
  lojaLive,
  changelogUnread,
}: Props) {
  const t = useTranslations();
  const inQueue = myQueues.length > 0;
  const principalTabs: TopBarTabDef[] = principalTabDefs({ showRankedComPro, showLoja, showLiga, showSala }).map(
    (d) => ({ href: d.href, label: t(`nav.${d.key}`), live: d.key === "fila" && lojaLive })
  );

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

  const isActive = (tab: TopBarTabDef) =>
    currentRoute?.startsWith(tab.matchPrefix ?? tab.href) ?? false;

  return (
    <header
      className={cn(
        topBarSkin,
        // Sem padding à direita: a última placa encosta na borda da tela, como no cliente.
        "relative z-[var(--z-overlay)] flex h-12 shrink-0 items-center justify-between gap-2 pl-3 xl:h-14 xl:gap-3 xl:pl-5",
      )}
    >
      {/* Esquerda: hambúrguer (mobile) + engrenagem + placa do logo + abas em placas */}
      <div className="flex h-full shrink-0 items-center gap-1.5 xl:gap-2">
        <MobileNav
          principalTabs={principalTabs}
          contextualTabs={contextualTabs}
          isVisitor={isVisitor}
        />
        {!isVisitor && (
          <>
            <SettingsPopup />
            <div className="h-5 w-px bg-text-display/15 xl:h-6" aria-hidden="true" />
          </>
        )}

        {/* Visitante vai para a home; o /dashboard o mandaria para lá com um desvio a mais. */}
        <LogoPlate label={t("topbar.homeAria")} href={isVisitor ? "/" : "/dashboard"} />

        {/* A primeira aba encaixa no ombro do logo, com o mesmo sulco fino entre as abas. */}
        <nav
          aria-label={t("topbar.mainNavAria")}
          className={cn(topBarNavMain, "hidden h-full items-stretch gap-1 lg:flex")}
        >
          {principalTabs.map((tab) => (
            <PlateTab key={tab.href} href={tab.href} label={tab.label} active={isActive(tab)} live={tab.live} liveLabel={t("topbar.lojaLive")} />
          ))}
        </nav>

        {contextualTabs.length > 0 && (
          <nav
            aria-label={t("topbar.contextNavAria")}
            className="ml-2 hidden h-full items-stretch gap-1 lg:flex"
          >
            {contextualTabs.map((tab) => (
              <PlateTab key={tab.href} href={tab.href} label={tab.label} active={isActive(tab)} />
            ))}
          </nav>
        )}
      </div>

      {/* Centro: em fila mostra a pílula "Na fila" (Pedro 2026-05-26); fora dela, quem
          busca partida e os PROs online. O estado do user vem antes da contagem de PROs.
          Fora da fila as pílulas ocupam a sobra da barra numa linha só: a que não cabe
          quebra para uma segunda linha escondida, em vez de passar por cima das abas. */}
      {inQueue ? (
        <div className="flex min-w-0 flex-1 justify-center">
          <QueueStatusPill queues={myQueues} />
        </div>
      ) : (
        <div className="hidden h-8 min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-10 overflow-hidden xl:flex">
          {/* Item vazio na primeira linha: assim até a primeira pílula quebra (e some) quando
              não cabe, em vez de aparecer cortada. A margem negativa anula o espaço do gap. */}
          <span aria-hidden="true" className="-mr-2 h-0 w-0" />
          {/* Jogadores buscando partida agora (match_queue, tempo real via polling). */}
          <MatchQueuePill />
          {prosOnlineCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/5 px-3 py-1">
              <span className="relative flex size-2" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-success" />
              </span>
              <span className="font-display text-sm font-semibold text-success/90">
                {t("topbar.prosOnline", { count: prosOnlineCount })}
              </span>
              <Radio size={12} className="text-success/80" aria-hidden="true" />
            </div>
          )}
          {searchingCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-info/30 bg-info/5 px-3 py-1">
              <Swords size={12} className="text-info/80" aria-hidden="true" />
              <span className="font-display text-sm font-semibold text-info/90">
                {t("topbar.searching", { count: searchingCount })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Direita: contadores da comunidade + preview do admin + placas de atalho e chamadas */}
      <div className="flex h-full shrink-0 items-center gap-1.5 xl:gap-2">
        {/* Online + banidos empilhados num só bloco sutil, clicável para /mural. */}
        <CommunityCountersBar initial={communityCounters} isLoggedIn={!isVisitor} showMural={showLiga} />
        {realIsAdmin && <PreviewModeToggle previewActive={previewActive} />}
        <div className={cn(topBarEndcap, "flex h-full items-stretch gap-1")}>
          {/* Atalhos do jogador: só ícone, com o nome no hover. */}
          {!isVisitor && (
            <div className="hidden h-full items-stretch gap-1 sm:flex">
              <ChangelogBell unread={changelogUnread} label={t("shell.news")} />
              <TopBarIconTip icon={Palette} label={t("shell.collection")} href="/colecao" />
              <TopBarIconTip icon={Crown} label={t("shell.plans")} href="/planos" tone="gold" />
            </div>
          )}
          {/* Conduta fica fora no mobile (vive na gaveta MobileNav) para caber na barra. */}
          <div className="hidden h-full sm:flex">
            <CondutaBadge />
          </div>
          {isVisitor && <EntrarBadge />}
        </div>
      </div>
    </header>
  );
}

function PreviewModeToggle({ previewActive }: { previewActive: boolean }) {
  const t = useTranslations("topbar");
  return (
    <form action={togglePreviewMode}>
      <button
        type="submit"
        aria-label={previewActive ? t("previewBackAria") : t("previewAsUserAria")}
        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display text-sm font-semibold transition-colors xl:px-3 ${
          previewActive
            ? "border-amber-500/60 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
            : "border-white/15 bg-white/5 text-white/60 hover:border-white/30 hover:text-white"
        }`}
      >
        {/* Rótulo longo só a partir de 2400px: abaixo disso a barra do admin não cabe inteira. */}
        {previewActive ? (
          <>
            <EyeOff size={11} aria-hidden="true" />
            <span className="hidden min-[150rem]:inline">{t("previewBack")}</span>
            <span className="min-[150rem]:hidden">Admin</span>
          </>
        ) : (
          <>
            <Eye size={11} aria-hidden="true" />
            <span className="hidden min-[150rem]:inline">{t("previewAsUser")}</span>
            <span className="min-[150rem]:hidden">User</span>
          </>
        )}
      </button>
    </form>
  );
}

// Texto das chamadas vermelhas: Ubuntu caixa-alta espaçada, como os botões grandes do cliente.
const CTA_TEXT =
  "font-display text-sm font-bold uppercase tracking-[0.12em] xl:tracking-[0.15em] 2xl:tracking-[0.2em]";

function CondutaBadge() {
  // CTA institucional sempre visível: manifesto e filosofia da plataforma, lido antes da
  // primeira PT. Placa vermelha da marca. O link já é focável, então o tooltip não é.
  const t = useTranslations();
  return (
    <Tooltip
      content={t("topbar.condutaTooltip")}
      side="bottom"
      align="end"
      focusable={false}
      className="h-full"
    >
      <Link
        href="/codigo-de-conduta"
        aria-label={t("nav.conduta")}
        className={cn(plateClass("cta", "brand"), CTA_TEXT)}
      >
        <Shield size={12} aria-hidden="true" />
        <span>{t("nav.conduta")}</span>
      </Link>
    </Tooltip>
  );
}

function EntrarBadge() {
  // Entrada pelo Discord para visitante: mesma placa vermelha da Conduta, ao lado dela.
  const t = useTranslations("nav");
  return (
    <form action={signInWithDiscord} className="flex h-full">
      <button
        type="submit"
        aria-label="Entrar com Discord"
        className={cn(plateClass("cta", "brand"), CTA_TEXT)}
      >
        <LogIn size={12} aria-hidden="true" />
        <span>{t("entrar")}</span>
      </button>
    </form>
  );
}

// Sino de novidades: ícone + selo vermelho com o nº de não-lidas. Leva a /novidades,
// onde a visita zera o contador (mark_changelog_seen). O selo some quando unread=0.
function ChangelogBell({ unread, label }: { unread: number; label: string }) {
  const has = unread > 0;
  return (
    <Tooltip content={label} side="bottom" focusable={false} className="h-full">
      <PlateIconLink href="/novidades" label={has ? `${label} (${unread})` : label} icon={Bell}>
        {has && (
          <span className="absolute right-1 top-2 flex min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 font-display text-[0.6rem] font-bold leading-4 text-text-display xl:top-2.5">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PlateIconLink>
    </Tooltip>
  );
}

// Atalho no topbar: só o ícone na placa, com o nome no hover (Tooltip).
function TopBarIconTip({
  icon,
  label,
  href,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  tone?: "neutral" | "gold";
}) {
  return (
    <Tooltip content={label} side="bottom" focusable={false} className="h-full">
      <PlateIconLink href={href} label={label} icon={icon} tone={tone} />
    </Tooltip>
  );
}
