// HeroState — bloco central do dashboard com 1 mensagem grande + 1 CTA dominante.
// Substituí o triplete (hero texto + status banner + quick action cards) por
// 1 elemento contextual baseado no estado do user.
//
// Estados (mutuamente exclusivos):
//   admin            → painel PROs
//   in_queue         → mostrar posição + botão sair (outline)
//   ready_to_play    → PRO online + você tem ficha → ENTRAR NA FILA (cinematic)
//   needs_ficha_urg  → PRO online MAS sem ficha → COMPRAR (warning)
//   waiting_pro      → sem PRO online + tem ficha → aguardar (secondary)
//   needs_ficha      → sem PRO + sem ficha → comprar (warning)
//
// Refactor V2.5 — DF7.5:
//   - Tokens: semantic.css V2.5 via Tailwind (zero hex hardcoded)
//   - Primitives: Card (elevated/hero), Button, Badge, PresenceDot
//   - Motion: AnimatePresence + m.div via presets DF4
//   - Sound: useSound() nos CTA interativos
//   - API pública preservada (props names inalterados)

"use client";

import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { m, AnimatePresence } from "motion/react";
import {
  Crown,
  Hourglass,
  Play,
  Coins,
  Bell,
  Radio,
  ArrowRight,
} from "lucide-react";
import type { ProWithQueue } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { useMotionSafe } from "@/lib/motion/hooks";
import { fadeInUp, scaleIn } from "@/lib/motion/presets";
import { HeroStateJoinCta } from "./hero-state-join-cta";
import { HeroStateLeaveCta } from "./hero-state-leave-cta";

// ---------------------------------------------------------------------------
// Props públicas — inalteradas para compatibilidade com callsites
// ---------------------------------------------------------------------------

interface Props {
  viewerUserId: string;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  fichaPreco: number | null;
  topPro: ProWithQueue | null;
  myQueue: MyQueueEntry | null;
}

// ---------------------------------------------------------------------------
// Lógica de estado — inalterada
// ---------------------------------------------------------------------------

type HeroStateKind =
  | "admin"
  | "in_queue"
  | "ready_to_play"
  | "needs_ficha_urgent"
  | "waiting_pro"
  | "needs_ficha";

function resolveState({
  isAdmin,
  fichaBalance,
  topPro,
  myQueue,
}: {
  isAdmin: boolean;
  fichaBalance: number;
  topPro: ProWithQueue | null;
  myQueue: MyQueueEntry | null;
}): HeroStateKind {
  if (isAdmin) return "admin";
  if (myQueue) return "in_queue";
  if (topPro && fichaBalance > 0) return "ready_to_play";
  if (topPro && fichaBalance === 0) return "needs_ficha_urgent";
  if (!topPro && fichaBalance > 0) return "waiting_pro";
  return "needs_ficha";
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function HeroState({
  viewerUserId,
  isAdmin,
  fichaBalance,
  fichaPackageId,
  fichaPreco,
  topPro,
  myQueue,
}: Props) {
  const state = resolveState({ isAdmin, fichaBalance, topPro, myQueue });
  const t = useTranslations("queue");
  const precoTxt =
    fichaPreco !== null ? `R$ ${fichaPreco.toFixed(2).replace(".", ",")}` : "PIX";

  // Som para CTAs de link (apenas HeroState gerencia os seus; sub-componentes
  // gerenciam os deles internamente via Button primitive)
  const play = useSound();

  // Variante de entrada — respeita prefers-reduced-motion
  const entryVariant = useMotionSafe(fadeInUp, scaleIn);

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={state}
        variants={entryVariant}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        {renderState()}
      </m.div>
    </AnimatePresence>
  );

  // ---------------------------------------------------------------------------
  // Renderização por estado
  // ---------------------------------------------------------------------------

  function renderState() {
    switch (state) {
      case "admin":
        return (
          <HeroFrame variant="brand">
            <HeroEyebrow icon={Crown}>
              <Badge variant="tier-8">{t("badgeAdmin")}</Badge>
              {t("adminEyebrow")}
            </HeroEyebrow>
            <HeroTitle>{t("adminTitle")}</HeroTitle>
            <HeroSub>
              {topPro
                ? t("adminSubOnline", {
                    name: topPro.coach.username ?? t("youName"),
                    count: topPro.entries.length,
                  })
                : t("adminSubNoQueue")}
            </HeroSub>
            <CtaLink
              href="/admin/pros"
              onNavigate={() => play("click")}
            >
              <Radio size={20} aria-hidden="true" />
              {t("goToProPanel")}
            </CtaLink>
          </HeroFrame>
        );

      case "in_queue":
        return (
          <HeroFrame variant="play">
            <HeroEyebrow icon={Hourglass}>
              <Badge variant="success">{t("badgeInQueue")}</Badge>
              {t("inQueueEyebrow")}
            </HeroEyebrow>
            <HeroTitle>
              {t.rich("inQueueTitle", {
                position: myQueue!.position,
                total: myQueue!.total,
                name: myQueue!.coachUsername ?? "PRO",
                pro: (chunks) => (
                  <span className="text-[var(--color-play-primary)]">{chunks}</span>
                ),
              })}
            </HeroTitle>
            <HeroSub>
              {t("inQueueSub", { minutes: myQueue!.waitingMinutes })}
            </HeroSub>
            <HeroStateLeaveCta entryId={myQueue!.entryId} />
          </HeroFrame>
        );

      case "ready_to_play": {
        const vagas = topPro!.coach.vagasProximaPT;
        const waiting = topPro!.coach.waitingCount;
        return (
          <HeroFrame variant="play" pulse>
            <HeroEyebrow icon={Radio} pulse>
              <Badge variant="success">{t("badgeOnline")}</Badge>
              {t("proOnlineQueueOpen", { name: topPro!.coach.username ?? "PRO" })}
            </HeroEyebrow>
            <HeroTitle>
              {vagas > 0
                ? t("freeSlotsCount", { count: vagas })
                : t("inQueueCount", { count: waiting })}
            </HeroTitle>
            <HeroSub>
              {topPro!.coach.mmrAtual
                ? `${topPro!.coach.mmrAtual.toLocaleString("pt-BR")} MMR · `
                : ""}
              {t("readyToPlaySub", {
                balance: fichaBalance,
                hasSlots: vagas > 0 ? "yes" : "no",
              })}
            </HeroSub>
            <HeroStateJoinCta
              coachId={topPro!.coach.coachId}
              viewerUserId={viewerUserId}
              prosOnline={[topPro!.coach]}
              fichaBalance={fichaBalance}
            />
          </HeroFrame>
        );
      }

      case "needs_ficha_urgent": {
        const vagas = topPro!.coach.vagasProximaPT;
        const waiting = topPro!.coach.waitingCount;
        return (
          <HeroFrame variant="warning" pulse>
            <HeroEyebrow icon={Radio} pulse>
              <Badge variant="warning">{t("badgeOnline")}</Badge>
              {t("proOnline", { name: topPro!.coach.username ?? "PRO" })}
            </HeroEyebrow>
            <HeroTitle>{t("needFichaTitle")}</HeroTitle>
            <HeroSub>
              {vagas > 0
                ? t("needFichaSubSlots", { count: vagas })
                : t("needFichaSubWaiting", { count: waiting })}
            </HeroSub>
            {fichaPackageId && (
              <CtaLink
                href={`/checkout/${fichaPackageId}`}
                onNavigate={() => play("click")}
                warning
              >
                <Coins size={20} aria-hidden="true" />
                {t("buyFichaPrice", { price: precoTxt })}
              </CtaLink>
            )}
          </HeroFrame>
        );
      }

      case "waiting_pro":
        return (
          <HeroFrame variant="neutral">
            <HeroEyebrow icon={Hourglass}>
              <Badge variant="default">{t("badgeWaiting")}</Badge>
              {t("waitingProEyebrow")}
            </HeroEyebrow>
            <HeroTitle>{t("waitingProTitle")}</HeroTitle>
            <HeroSub>
              {t("waitingProSub", { count: fichaBalance })}
            </HeroSub>
            <CtaLink
              href="https://discord.com/invite/USntaFRS6x"
              external
              onNavigate={() => play("click")}
            >
              <Bell size={18} aria-hidden="true" />
              {t("enableDiscordAlert")}
            </CtaLink>
          </HeroFrame>
        );

      case "needs_ficha":
      default:
        return (
          <HeroFrame variant="warning">
            <HeroEyebrow icon={Coins}>
              <Badge variant="warning">{t("badgeStart")}</Badge>
              {t("startEyebrow")}
            </HeroEyebrow>
            <HeroTitle>{t("startTitle")}</HeroTitle>
            <HeroSub>
              {t("startSub")}
            </HeroSub>
            {fichaPackageId && (
              <CtaLink
                href={`/checkout/${fichaPackageId}`}
                onNavigate={() => play("click")}
                warning
              >
                <Coins size={20} aria-hidden="true" />
                {t("buyFichaPrice", { price: precoTxt })}
              </CtaLink>
            )}
          </HeroFrame>
        );
    }
  }
}

// ===========================================================================
// Subcomponentes de apresentação — internos ao módulo
// ===========================================================================

// MotionLink — motion wrapper de next/link criado no nível de módulo.
// DEVE estar fora dos componentes para não recriar o componente a cada render.
const MotionLink = m.create(Link);

// ---------------------------------------------------------------------------
// HeroFrame — wrapper de seção com variante de cor via tokens V2.5
// Substitui o inline style e hex hardcoded do design anterior
// ---------------------------------------------------------------------------

type FrameVariant = "brand" | "play" | "warning" | "neutral";

// Mapeamento de variante → classes de borda e fundo via tokens semânticos
// Zero hex — todos via var() de semantic.css
const FRAME_BORDER: Record<FrameVariant, string> = {
  brand:   "border-[var(--color-border-brand)]",
  play:    "border-[var(--color-play-primary)]/50",
  warning: "border-[var(--color-warning)]/50",
  neutral: "border-[var(--color-border-subtle)]",
};

const FRAME_BG: Record<FrameVariant, string> = {
  brand:   "bg-gradient-to-br from-[var(--color-brand-primary-glow)] via-[var(--color-bg-elevated)]/80 to-transparent",
  play:    "bg-gradient-to-br from-[var(--color-play-primary-glow)] via-[var(--color-bg-elevated)]/80 to-transparent",
  warning: "bg-gradient-to-br from-[var(--color-warning)]/10 via-[var(--color-bg-elevated)]/80 to-transparent",
  neutral: "bg-[var(--color-bg-elevated)]/60",
};

const FRAME_GLOW: Record<FrameVariant, string> = {
  brand:   "shadow-[var(--glow-brand)]",
  play:    "shadow-[var(--glow-play)]",
  warning: "",
  neutral: "",
};

function HeroFrame({
  children,
  variant,
  pulse,
}: {
  children: React.ReactNode;
  variant: FrameVariant;
  pulse?: boolean;
}) {
  // Selecionar variante de motion com base em prefers-reduced-motion
  const motionVariant = useMotionSafe(scaleIn, fadeInUp);

  return (
    <m.section
      variants={motionVariant}
      initial="hidden"
      animate="visible"
      // aria-live="polite" garante anúncio de mudança de estado a leitores de tela
      aria-live="polite"
      className={[
        "relative flex flex-col items-center justify-center",
        "rounded-[var(--radius-lg)] border-2",
        "px-[var(--space-6)] py-[var(--space-8)]",
        "text-center backdrop-blur-md",
        "xl:px-[var(--space-12)] xl:py-[var(--space-10)]",
        FRAME_BORDER[variant],
        FRAME_BG[variant],
        pulse ? FRAME_GLOW[variant] : "",
      ].join(" ")}
    >
      {children}
    </m.section>
  );
}

// ---------------------------------------------------------------------------
// HeroEyebrow — linha de label acima do título
// Substitui p com classes inline por componente semântico
// ---------------------------------------------------------------------------

function HeroEyebrow({
  icon: Icon,
  children,
  pulse,
}: {
  icon: typeof Radio;
  children: React.ReactNode;
  pulse?: boolean;
}) {
  return (
    <p className="inline-flex items-center gap-2 font-[family-name:var(--font-body)] text-sm font-semibold uppercase tracking-[0.35em] text-[var(--color-text-muted)]">
      {pulse ? (
        // Indicador de presença pulsante — online / fila aberta
        // Tokens CSS via bg-[var(--token)] é a forma canônica no Tailwind v4
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-play-primary)] opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-play-primary)]" />
        </span>
      ) : (
        <Icon size={12} aria-hidden="true" />
      )}
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// HeroTitle — título principal do estado
// ---------------------------------------------------------------------------

function HeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-[var(--space-3)] font-[family-name:var(--font-display)] text-3xl font-bold uppercase tracking-tight text-[var(--color-text-display)] drop-shadow-2xl xl:text-5xl 2xl:text-6xl">
      {children}
    </h2>
  );
}

// ---------------------------------------------------------------------------
// HeroSub — subtítulo / descrição abaixo do título
// ---------------------------------------------------------------------------

function HeroSub({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-[var(--space-3)] max-w-xl font-[family-name:var(--font-mono)] text-sm 2xl:text-base text-[var(--color-text-muted)] xl:text-sm">
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// CtaLink — link de navegação estilizado como CTA de alta hierarquia.
// Usa buttonVariants do Button F6 para tokens de tamanho/tipografia.
// Sound via useSound() acoplado ao click — regra C16/M10.
// m.* garante scale 1.02 hover e 0.97 press sem animate-spin (C19).
// ---------------------------------------------------------------------------

function CtaLink({
  href,
  children,
  external,
  warning,
  onNavigate,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  /** Quando true aplica paleta âmbar (aviso de urgência) */
  warning?: boolean;
  onNavigate?: () => void;
}) {
  const play = useSound();
  const canAnimate = useMotionSafe(true, false);

  // Classes comuns: tokens de tamanho e tipografia via buttonVariants (F6)
  // Overrides de cor via tokens semânticos — zero hex
  const cls = cn(
    buttonVariants({ variant: "secondary", size: "lg" }),
    "mt-[var(--space-6)] border-2",
    warning
      ? [
          "border-[var(--color-warning)]/60",
          "bg-[var(--color-warning)]/10",
          "text-[var(--color-warning)]",
          "hover:bg-[var(--color-warning)]/20",
        ].join(" ")
      : [
          "border-[var(--color-border-strong)]",
          "text-[var(--color-text-body)]",
          "hover:border-[var(--color-border-brand)]",
          "hover:text-[var(--color-text-display)]",
        ].join(" ")
  );

  const motionProps = canAnimate
    ? { whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 } }
    : {};

  const handleClick = () => {
    play("click");
    onNavigate?.();
  };

  const content = (
    <>
      {children}
      {external && <ArrowRight size={16} aria-hidden="true" />}
    </>
  );

  if (external) {
    return (
      <m.a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cls}
        onClick={handleClick}
        {...motionProps}
      >
        {content}
      </m.a>
    );
  }

  // Link interno — usa MotionLink definido no nível de módulo (evita recriar)
  return (
    <MotionLink
      href={href}
      className={cls}
      onClick={handleClick}
      {...motionProps}
    >
      {content}
    </MotionLink>
  );
}

// Re-export para hero-state-join-cta poder marcar a UI como ocupada visualmente
export const HeroPlayIcon = Play;
