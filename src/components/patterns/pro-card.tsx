"use client";
/**
 * ProCard — FormulaDota V2.5-F7 (DF7.2)
 *
 * Composição de nível Pattern sobre primitives F6:
 *   Card (hero variant) + Badge (tier-{1..8}) + PresenceDot (6 estados)
 *
 * Mandamentos obedecidos:
 *   C14 — zero hex hardcoded; apenas tokens semânticos via var() ou classes Tailwind mapeadas
 *   C16 — sound via hook useSound(), nunca diretamente no onClick
 *   C17 — z-index via var(--z-*), nunca numérico ad-hoc
 *   B6  — ZERO nome próprio do admin em strings user-facing (ver REQUIREMENTS.md §B6)
 *   DF7.2 — hero portrait ≥96px + tier badge proeminente + recent matches inline + presence dot
 *
 * Voz: Mestre — autoritativa, sem jargão startup, sem giria de vendedor.
 */

import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Badge, type Tier, TIER_NAMES } from "@/components/ui/badge";
import { PresenceDot, type PresenceStatus, STATUS_LABELS } from "@/components/ui/presence-dot";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Uma partida recente do PRO — resultado + variação de MMR */
export interface RecentMatch {
  /** Resultado da partida */
  result: "win" | "loss";
  /** Variação de MMR (positivo = ganho, negativo = perda) */
  mmrDelta: number;
}

export interface ProCardProps {
  /**
   * Nome de exibição do PRO (Steam persona ou username).
   * NUNCA usar nome próprio real — usar identidade de plataforma.
   */
  proName: string;
  /** URL do retrato/avatar do PRO — idealmente hero portrait Dota 2 */
  portraitUrl?: string;
  /** Tier MMR interno (1=Herald … 8=Immortal) */
  tier: Tier;
  /** MMR atual — exibido em tabular nums */
  mmr: number;
  /** Estado de presença do PRO */
  presence: PresenceStatus;
  /**
   * Bio curta em voz Mestre — máximo 200 caracteres.
   * Sem giria de startup. Sem menção a nome próprio.
   */
  bio?: string;
  /**
   * Últimas partidas para exibição inline (máximo 5 renderizados).
   * Ordem: mais recente primeiro.
   */
  recentMatches?: RecentMatch[];
  /**
   * Slot de ação principal — ex: botão "Entrar na Fila".
   * Renderizado na área inferior separada por divisor.
   */
  action?: ReactNode;
  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formata o delta de MMR com sinal explícito para exibição legível.
 * Ex: 30 → "+30" | -25 → "-25"
 */
function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * ProCard — card cinematográfico de perfil do PRO.
 *
 * Compõe Card (hero variant), Badge tier, PresenceDot e recent matches
 * em layout vertical centrado. Peso visual AAA: portrait ≥96px,
 * tier badge proeminente, motion de hover herdado do Card hero variant.
 *
 * @example
 * <ProCard
 *   proName="Coach Immortal"
 *   tier={8}
 *   mmr={7200}
 *   presence="online"
 *   bio="Top 0.5% — 15 anos de Dota. Metodologia FORMULADOTA."
 *   recentMatches={[{ result: "win", mmrDelta: 30 }, { result: "loss", mmrDelta: -25 }]}
 *   action={<Button variant="primary">Entrar na Fila</Button>}
 * />
 */
export function ProCard({
  proName,
  portraitUrl,
  tier,
  mmr,
  presence,
  bio,
  recentMatches = [],
  action,
  className,
}: ProCardProps) {
  // Sound hook — C16: nunca chamar diretamente; hook gerencia mute global
  const play = useSound();

  // Máximo 5 partidas recentes exibidas inline (requisito DF7.2 pede ≤3, suporta até 5)
  const visibleMatches = recentMatches.slice(0, 5);

  // Indica se o PRO está em estado ativo (online, in-queue, in-match)
  const isActive = presence === "online" || presence === "in-queue" || presence === "in-match";

  return (
    <Card
      variant="hero"
      className={cn("max-w-sm w-full", className)}
      // Sound acoplado: hover no card hero reproduz som sutil (C20)
      onMouseEnter={() => play("hover")}
    >
      {/* ----------------------------------------------------------------
          Layout vertical centrado — 4 blocos: portrait → identidade → bio → matches → action
      ---------------------------------------------------------------- */}
      <div className="flex flex-col items-center gap-[var(--space-6)] text-center">

        {/* ---- BLOCO 1: Hero Portrait + PresenceDot ---- */}
        <div className="relative">
          {/* Portrait ≥96px — success criteria DF7.2 */}
          <div
            className={cn(
              "size-32 overflow-hidden",
              // Borda circular com cor brand quando ativo, borda sutil quando offline
              "rounded-[var(--radius-full)]",
              isActive
                ? "border-2 border-[var(--color-border-brand)]"
                : "border-2 border-[var(--color-border-strong)]",
            )}
            style={{
              // Glow brand apenas quando ativo (C14: via token, não hex)
              boxShadow: isActive ? "var(--glow-brand)" : "var(--shadow-elevated)",
            }}
          >
            {portraitUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portraitUrl}
                alt={`Retrato de ${proName}`}
                className="size-full object-cover object-top"
                draggable={false}
              />
            ) : (
              /* Placeholder com inicial — fallback sem imagem */
              <div
                className={cn(
                  "size-full",
                  "bg-[var(--color-bg-elevated)]",
                  "flex items-center justify-center",
                  "font-[family-name:var(--font-display)]",
                  "text-4xl font-bold",
                  "text-[var(--color-text-display)]",
                  "select-none",
                )}
                aria-hidden="true"
              >
                {proName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* PresenceDot posicionado no canto inferior-direito do portrait */}
          <div
            className={cn(
              "absolute bottom-1 right-1",
              // Fundo opaco pra dot ser legível sobre a borda colorida
              "rounded-[var(--radius-full)] p-[var(--space-1)]",
              "bg-[var(--color-bg-deep)]",
              "border border-[var(--color-border-subtle)]",
            )}
            style={{
              // Z elevado para dot ficar sobre a borda do portrait (C17: token)
              zIndex: "var(--z-elevated)",
            }}
          >
            <PresenceDot
              status={presence}
              size="lg"
              aria-label={`Status: ${STATUS_LABELS[presence]}`}
            />
          </div>
        </div>

        {/* ---- BLOCO 2: Nome + Tier Badge + MMR ---- */}
        <div className="space-y-[var(--space-2)]">
          {/* Nome do PRO — Cinzel, uppercase, peso máximo */}
          <h2
            className={cn(
              "font-[family-name:var(--font-display)]",
              "text-2xl font-bold",
              "text-[var(--color-text-display)]",
              "tracking-[0.08em] uppercase",
              "leading-tight",
            )}
          >
            {proName}
          </h2>

          {/* Tier badge proeminente + MMR — lado a lado */}
          <div className="flex items-center justify-center gap-[var(--space-3)] flex-wrap">
            {/* Badge tier — "lg" via className customizado pra peso visual AAA */}
            <Badge
              variant={`tier-${tier}` as `tier-${Tier}`}
              className="px-3 py-1 text-sm tracking-widest"
            >
              {TIER_NAMES[tier]}
            </Badge>

            {/* MMR em tabular nums — leitura rápida de número */}
            <span
              className={cn(
                "font-[family-name:var(--font-mono)]",
                "text-sm tabular-nums",
                "text-[var(--color-text-muted)]",
              )}
            >
              {mmr.toLocaleString("pt-BR")} MMR
            </span>
          </div>
        </div>

        {/* ---- BLOCO 3: Bio (condicional) ---- */}
        {bio && (
          <p
            className={cn(
              "max-w-xs",
              "text-sm leading-relaxed",
              "text-[var(--color-text-muted)]",
              "italic",
              // Limita overflow de bio excessivamente longa
              "line-clamp-3",
            )}
          >
            {bio}
          </p>
        )}

        {/* ---- BLOCO 4: Recent Matches (condicional) ---- */}
        {visibleMatches.length > 0 && (
          <div className="w-full space-y-[var(--space-2)]">
            {/* Label de seção — tracking widest, uppercase, voz informativa */}
            <p
              className={cn(
                "font-[family-name:var(--font-display)]",
                "text-[10px] uppercase tracking-[0.18em]",
                "text-[var(--color-text-faded)]",
              )}
            >
              Últimas partidas
            </p>

            {/* Row de pílulas de resultado — vitória/derrota + delta MMR */}
            <div className="flex items-center justify-center gap-[var(--space-2)] flex-wrap">
              {visibleMatches.map((match, index) => {
                const isWin = match.result === "win";
                return (
                  <div
                    key={index}
                    className={cn(
                      // Dimensões mínimas pra legibilidade — ≥24px
                      "min-w-[3.5rem] h-7",
                      "rounded-[var(--radius-sm)]",
                      "border",
                      "flex items-center justify-center gap-[var(--space-1)]",
                      "font-[family-name:var(--font-mono)]",
                      "text-[11px] font-semibold tabular-nums",
                      // Cores semânticas via tokens (C14)
                      isWin
                        ? "bg-success/10 border-success/30 text-success"
                        : "bg-error/10 border-error/30 text-error",
                    )}
                    // Tooltip acessível com detalhe da partida
                    title={`${isWin ? "Vitória" : "Derrota"} — ${formatDelta(match.mmrDelta)} MMR`}
                    aria-label={`${isWin ? "Vitória" : "Derrota"} ${formatDelta(match.mmrDelta)} MMR`}
                  >
                    {/* Letra de resultado — V (Vitória) ou D (Derrota) */}
                    <span className="font-bold">{isWin ? "V" : "D"}</span>
                    {/* Delta de MMR com sinal */}
                    <span className="opacity-80">{formatDelta(match.mmrDelta)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- BLOCO 5: Action slot (condicional) ---- */}
        {action && (
          <div
            className={cn(
              "w-full",
              "pt-[var(--space-4)]",
              "border-t border-[var(--color-border-subtle)]",
            )}
          >
            {action}
          </div>
        )}
      </div>
    </Card>
  );
}
