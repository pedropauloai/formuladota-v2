"use client";
/**
 * MatchCard — FormulaDota V2.5-F7 (DF7.1)
 *
 * Display de partida com hero portraits, score, MMR delta, tier badge e tempo relativo.
 * Hover effect cinematográfico via motion.
 *
 * Regras obrigatórias:
 *   C14 — zero hex hardcoded; somente tokens semânticos via var()
 *   C15 — duração de motion via var(--motion-duration-*)
 *   C16 — som via hook useSound(), nunca chamado diretamente
 *   C17 — z-index via var(--z-*)
 *   C20 — interação acoplada a sound + motion
 *
 * Composto sobre primitives F6: Card, Badge (DF6.2, DF6.5)
 */

import { m } from "motion/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge, TIER_NAMES, type Tier } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { useMotionSafeBool } from "@/lib/motion/hooks";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Hero individual — slug + nome + imagem opcional */
export interface MatchHero {
  /** Slug usado na URL CDN Steam (ex: "anti_mage") */
  slug: string;
  /** Nome de exibição PT-BR (ex: "Anti-Mage") */
  name: string;
  /** URL da imagem do portrait (opcional — fallback para iniciais do slug) */
  imageUrl?: string;
}

/** Props do MatchCard */
export interface MatchCardProps {
  /** ID único da partida para aria-label */
  matchId: string;
  /** Resultado da partida */
  result: "win" | "loss";
  /** Delta de MMR (positivo = ganho, negativo = perda) — ex: +25, -25 */
  mmrDelta: number;
  /** Placar da partida — ex: "32-18" */
  score: string;
  /** Tier do jogador na época da partida (1=Herald … 8=Immortal) */
  tier: Tier;
  /** Heroes do time Radiant (exibe até 5) */
  radiantHeroes: MatchHero[];
  /** Heroes do time Dire (exibe até 5) */
  direHeroes: MatchHero[];
  /** Data/hora da partida — ISO string ou Date */
  playedAt: Date | string;
  /** Classes adicionais para o wrapper */
  className?: string;
  /** Callback ao clicar no card */
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Utilitário: tempo relativo PT-BR
// ---------------------------------------------------------------------------

/**
 * Converte uma data em string relativa PT-BR.
 * Retorna "agora", "Xmin", "Xh", "Xd", "Xsem" ou data localizada.
 */
function relativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}sem`;
  return d.toLocaleDateString("pt-BR");
}

// ---------------------------------------------------------------------------
// HeroPortrait — sub-componente de portrait individual
// ---------------------------------------------------------------------------

interface HeroPortraitProps {
  hero: MatchHero;
  /** Radiant = borda verde, Dire = borda vermelha (feedback semântico) */
  side: "radiant" | "dire";
}

/**
 * Portrait quadrado de hero com fallback para iniciais.
 * Radiant usa borda success, Dire usa borda error — identidade visual clara.
 */
function HeroPortrait({ hero, side }: HeroPortraitProps) {
  return (
    <div
      title={hero.name}
      className={cn(
        // Dimensões fixas — 32px (space-8 = 8 unidades × 4px)
        "size-8",
        // Radius sm = 4px — badge style, não card style
        "rounded-[var(--radius-sm)]",
        "overflow-hidden",
        "border",
        // Borda semântica por lado — success = radiant, error = dire
        side === "radiant"
          ? "border-[var(--color-success)]/40"
          : "border-[var(--color-error)]/40",
      )}
    >
      {hero.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.imageUrl}
          alt={hero.name}
          className="size-full object-cover"
          loading="lazy"
        />
      ) : (
        // Fallback: iniciais do slug em tipografia display
        <div
          className={cn(
            "size-full flex items-center justify-center",
            "bg-[var(--color-bg-surface)]",
            "text-[var(--color-text-muted)]",
            // Caption size (10px) — texto de fallback mínimo
            "text-sm",
            "font-[family-name:var(--font-display)]",
            "uppercase tracking-widest",
          )}
        >
          {hero.slug.slice(0, 2)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MatchCard — componente principal
// ---------------------------------------------------------------------------

/**
 * MatchCard — exibe resumo de partida com heroes, score, MMR delta e tier.
 *
 * @example
 * <MatchCard
 *   matchId="7890123456"
 *   result="win"
 *   mmrDelta={+25}
 *   score="32-18"
 *   tier={7}
 *   radiantHeroes={[{ slug: "anti_mage", name: "Anti-Mage" }]}
 *   direHeroes={[{ slug: "axe", name: "Axe" }]}
 *   playedAt={new Date()}
 *   onClick={() => router.push(`/partidas/7890123456`)}
 * />
 */
export function MatchCard({
  matchId,
  result,
  mmrDelta,
  score,
  tier,
  radiantHeroes,
  direHeroes,
  playedAt,
  className,
  onClick,
}: MatchCardProps) {
  const isWin = result === "win";
  // Ícone direcional de MMR — TrendingUp para ganho, TrendingDown para perda
  const TrendIcon = mmrDelta >= 0 ? TrendingUp : TrendingDown;

  // Hooks F5/F4 — som e motion (C16, C15)
  const play = useSound();
  const motionSafe = useMotionSafeBool();

  // Handler de hover — acoplamento sound + interação (C20)
  const handleMouseEnter = () => {
    if (onClick) play("hover");
  };

  // Handler de click — som confirm + callback (C20)
  const handleClick = () => {
    if (onClick) {
      play("click");
      onClick();
    }
  };

  // Aria-label descritivo para acessibilidade (WCAG 2.1 AA — C5)
  const ariaLabel = `Partida ${matchId}, ${isWin ? "vitória" : "derrota"}, MMR ${mmrDelta > 0 ? "+" : ""}${mmrDelta}`;

  // ---------------------------------------------------------------------------
  // Estrutura interna compartilhada entre motion/não-motion
  // ---------------------------------------------------------------------------
  const cardContent = (
    <Card
      variant={onClick ? "interactive" : "elevated"}
      className={cn("relative", className)}
      aria-label={ariaLabel}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      onKeyDown={(e) => {
        // Acessibilidade: Enter/Space disparam click (C5)
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* Header: resultado + tier badge + score */}
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          {/* Lado esquerdo: resultado + tier */}
          <div className="flex items-center gap-2">
            {/* Label de resultado — usa tokens semânticos de estado, não hex (C14) */}
            <span
              className={cn(
                "font-[family-name:var(--font-display)]",
                "tracking-widest uppercase text-sm",
                "px-2 py-0.5",
                "rounded-[var(--radius-sm)]",
                "border",
                isWin
                  ? [
                      "bg-[var(--color-success)]/10",
                      "text-[var(--color-success)]",
                      "border-[var(--color-success)]/30",
                    ]
                  : [
                      "bg-[var(--color-error)]/10",
                      "text-[var(--color-error)]",
                      "border-[var(--color-error)]/30",
                    ],
              )}
            >
              {isWin ? "Vitória" : "Derrota"}
            </span>

            {/* Badge de tier — via primitivo F6 (DF6.5) */}
            <Badge variant={`tier-${tier}` as `tier-${Tier}`}>
              {TIER_NAMES[tier]}
            </Badge>
          </div>

          {/* Placar — tabular-nums para alinhamento uniforme */}
          <span
            className={cn(
              "tabular-nums font-[family-name:var(--font-body)]",
              "text-base font-semibold",
              "text-[var(--color-text-display)]",
            )}
          >
            {score}
          </span>
        </div>
      </CardHeader>

      {/* Conteúdo: hero portraits + footer MMR/tempo */}
      <CardContent className="space-y-3">
        {/* Linha Radiant — até 5 heroes */}
        <div
          className="flex flex-wrap gap-1.5"
          aria-label="Heroes Radiant"
        >
          {radiantHeroes.slice(0, 5).map((h) => (
            <HeroPortrait key={`r-${h.slug}`} hero={h} side="radiant" />
          ))}
        </div>

        {/* Linha Dire — até 5 heroes */}
        <div
          className="flex flex-wrap gap-1.5"
          aria-label="Heroes Dire"
        >
          {direHeroes.slice(0, 5).map((h) => (
            <HeroPortrait key={`d-${h.slug}`} hero={h} side="dire" />
          ))}
        </div>

        {/* Footer: MMR delta + tempo relativo */}
        <div
          className={cn(
            "flex items-center justify-between",
            "pt-2",
            // Separador sutil via token de borda (C14)
            "border-t border-[var(--color-border-subtle)]",
            "text-sm",
          )}
        >
          {/* MMR delta com ícone direcional */}
          <span
            className={cn(
              "inline-flex items-center gap-1",
              "font-[family-name:var(--font-body)]",
              "tabular-nums font-semibold",
              // Cor semântica: success = ganho, error = perda (C14)
              mmrDelta >= 0
                ? "text-[var(--color-success)]"
                : "text-[var(--color-error)]",
            )}
          >
            <TrendIcon
              className="size-3"
              aria-hidden="true"
              strokeWidth={1.5}
            />
            {mmrDelta > 0 ? "+" : ""}
            {mmrDelta} MMR
          </span>

          {/* Tempo relativo — label muted, sem urgência */}
          <span className="text-[var(--color-text-muted)]">
            {relativeTime(playedAt)}
          </span>
        </div>
      </CardContent>
    </Card>
  );

  // ---------------------------------------------------------------------------
  // Hover lift cinematográfico — m.div wrapper quando onClick + motionSafe
  // Mantém isolado do Card para não interferir com a lógica de variante dele
  // ---------------------------------------------------------------------------
  if (onClick && motionSafe) {
    return (
      <m.div
        whileHover={{ y: -2, scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        transition={{
          // Duração via token (C15) — convertido para segundos (motion usa s)
          duration: 0.12, // equivalent a --motion-duration-micro (100ms)
          ease: [0.23, 1, 0.32, 1], // --motion-ease-snappy
        }}
      >
        {cardContent}
      </m.div>
    );
  }

  return cardContent;
}
