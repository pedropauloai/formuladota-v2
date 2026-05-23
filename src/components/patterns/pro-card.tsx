"use client";
/**
 * ProCard — FormulaDota V2.5-F9 (refatorado de F8)
 *
 * Composição de nível Pattern sobre primitives F9:
 *   Card + UserAvatar + MembershipBadge + BadgeStack + AchievementBadge
 *   + DotaRankMedal (NOVO F9)
 *
 * Novidades F9:
 *   - Tier agora pode ser exibido como imagem oficial via <DotaRankMedal>
 *   - Nova prop `rank` (DotaRank) — se fornecida, exibe medalha em vez de texto
 *   - Props novas são opcionais — compat com ProCardProps existente mantida
 *
 * Novidades F8:
 *   - Retrato agora usa <UserAvatar size="xl"> com badge overlay e ring colorido
 *   - <BadgeStack> exibe conquistas do PRO abaixo do nome
 *
 * Voz: Mestre — autoritativa, sem jargão startup, sem giria de vendedor.
 * B6 — ZERO nome próprio do admin em strings user-facing.
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { UserAvatar, type PresenceStatus, type RingColor } from "@/components/ui/avatar";
import { MembershipBadge, type MembershipTier } from "@/components/ui/membership-badge";
import { BadgeStack, type BadgeItem } from "@/components/ui/badge-stack";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Resultado de uma partida recente do PRO */
export interface RecentMatch {
  /** Vitória ou derrota */
  result: "win" | "loss";
  /** Variação de MMR — positivo = ganho, negativo = perda */
  mmrDelta: number;
}

export interface ProCardProps {
  /**
   * Nome de exibição do PRO (Steam persona ou username).
   * NUNCA usar nome próprio real — usar identidade de plataforma. (B6)
   */
  proName: string;

  /** URL do retrato/avatar do PRO — idealmente hero portrait Dota 2 */
  portraitUrl?: string;

  /**
   * Tier MMR interno em texto legível.
   * Ex: "Immortal", "Divine", "Ancient"
   */
  tierLabel?: string;

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

  /**
   * [F8 NOVO] Tier de membership do PRO — renderizado como overlay no avatar.
   * @default "aluno"
   */
  membershipTier?: MembershipTier;

  /**
   * [F8 NOVO] Conquistas do PRO para exibição em BadgeStack abaixo do nome.
   * Cada item tem a variante da conquista.
   */
  achievements?: BadgeItem[];

  /**
   * [F8 NOVO] Cor do ring externo do avatar.
   * "brand" = vermelho FORMULADOTA | "tier-immortal" = âmbar (Immortal) | null = sem ring
   * @default "brand"
   */
  ringColor?: RingColor;

  /**
   * [F9 NOVO] Rank oficial Dota 2 — exibe <DotaRankMedal> com imagem real.
   * Se fornecido, substitui o tierLabel CSS-only por medalha visual.
   * Para labels compactos inline use Badge tier-N diretamente.
   */
  rank?: DotaRank;

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
 * Compõe Card, UserAvatar (com MembershipBadge overlay), BadgeStack de achievements
 * e recent matches em layout vertical centrado.
 *
 * @example
 * // Com medalha oficial Dota 2 (F9 — recomendado para hero cards)
 * <ProCard
 *   proName="Coach Immortal"
 *   mmr={7200}
 *   presence="online"
 *   rank="immortal"
 *   membershipTier="elite"
 *   achievements={[
 *     { variant: "champion-s1" },
 *     { variant: "comendado" },
 *     { variant: "fundador" },
 *   ]}
 *   bio="Top 0.5% — 15 anos de Dota. Metodologia FORMULADOTA."
 *   action={<Button>Entrar na Fila</Button>}
 * />
 *
 * @example
 * // Fallback CSS-only (compat F8 — sem prop rank)
 * <ProCard proName="Coach" mmr={7200} presence="online" tierLabel="Immortal" />
 */
export function ProCard({
  proName,
  portraitUrl,
  tierLabel,
  mmr,
  presence,
  bio,
  recentMatches = [],
  action,
  membershipTier = "aluno",
  achievements = [],
  ringColor = "brand",
  rank,
  className,
}: ProCardProps) {
  /* Máximo 5 partidas recentes exibidas inline */
  const visibleMatches = recentMatches.slice(0, 5);

  /* Iniciais de fallback — primeira letra do proName */
  const fallbackInitials = proName.charAt(0).toUpperCase();

  return (
    <Card
      className={cn(
        "max-w-sm w-full",
        /* Estilo hero: borda brand, fundo deep, padding generoso */
        "bg-bg-base border border-border-strong",
        "p-6",
        className
      )}
    >
      {/* ----------------------------------------------------------------
          Layout vertical centrado — 5 blocos:
          portrait → identidade + badges → bio → matches → action
      ---------------------------------------------------------------- */}
      <div className="flex flex-col items-center gap-6 text-center">

        {/* ---- BLOCO 1: Hero Portrait via UserAvatar ---- */}
        {/* F8: substituído div manual por <UserAvatar size="xl"> com badge overlay */}
        <UserAvatar
          src={portraitUrl}
          alt={`Retrato de ${proName}`}
          fallback={fallbackInitials}
          size="xl"
          presence={presence}
          badge={<MembershipBadge tier={membershipTier} />}
          ringColor={ringColor}
        />

        {/* ---- BLOCO 2: Nome + Tier + MMR + Achievements ---- */}
        <div className="space-y-2 w-full">
          {/* Nome do PRO — font-display, uppercase, peso máximo */}
          <h2
            className={cn(
              "font-display",
              "text-2xl font-bold",
              "text-text-display",
              "tracking-[0.08em] uppercase",
              "leading-tight",
            )}
          >
            {proName}
          </h2>

          {/* Tier — medalha oficial (F9) ou label texto (compat F8) + MMR */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {/*
             * F9: se `rank` fornecido, usa DotaRankMedal com imagem oficial.
             * Fallback: tierLabel CSS-only (compat F8 — sem quebra de API).
             */}
            {rank ? (
              /* Medalha oficial Dota 2 — imagem PNG real com glow Immortal */
              <DotaRankMedal
                rank={rank}
                size="md"
                glow={rank === "immortal" || rank === "immortal-top-100"}
                showLabel
              />
            ) : tierLabel ? (
              /* Fallback CSS-only para quando rank não é fornecido */
              <span
                className={cn(
                  "text-xs font-bold uppercase tracking-widest",
                  "text-brand-primary",
                  "font-display-condensed",
                )}
              >
                {tierLabel}
              </span>
            ) : null}

            {/* MMR em tabular nums — leitura rápida */}
            <span
              className={cn(
                "font-mono text-sm tabular-nums",
                "text-text-muted",
              )}
            >
              {mmr.toLocaleString("pt-BR")} MMR
            </span>
          </div>

          {/* [F8 NOVO] BadgeStack de achievements abaixo do nome */}
          {achievements.length > 0 && (
            <div className="flex justify-center pt-1">
              <BadgeStack badges={achievements} max={3} />
            </div>
          )}
        </div>

        {/* ---- BLOCO 3: Bio (condicional) ---- */}
        {bio && (
          <p
            className={cn(
              "max-w-xs",
              "text-sm leading-relaxed",
              "text-text-muted",
              "italic",
              /* Limita overflow de bio excessivamente longa */
              "line-clamp-3",
            )}
          >
            {bio}
          </p>
        )}

        {/* ---- BLOCO 4: Recent Matches (condicional) ---- */}
        {visibleMatches.length > 0 && (
          <div className="w-full space-y-2">
            {/* Label de seção — tracking widest, uppercase, voz informativa */}
            <p
              className={cn(
                "font-display",
                "text-[10px] uppercase tracking-[0.18em]",
                "text-text-faded",
              )}
            >
              Últimas partidas
            </p>

            {/* Row de pílulas de resultado — vitória/derrota + delta MMR */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {visibleMatches.map((match, index) => {
                const isWin = match.result === "win";
                return (
                  <div
                    key={index}
                    className={cn(
                      /* Dimensões mínimas pra legibilidade — ≥24px */
                      "min-w-[3.5rem] h-7",
                      "rounded-sm",
                      "border",
                      "flex items-center justify-center gap-1",
                      "font-mono text-[11px] font-semibold tabular-nums",
                      /* Cores semânticas via tokens (C14) */
                      isWin
                        ? "bg-success/10 border-success/30 text-success"
                        : "bg-error/10 border-error/30 text-error",
                    )}
                    title={`${isWin ? "Vitória" : "Derrota"} — ${formatDelta(match.mmrDelta)} MMR`}
                    aria-label={`${isWin ? "Vitória" : "Derrota"} ${formatDelta(match.mmrDelta)} MMR`}
                  >
                    {/* Letra de resultado */}
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
              "pt-4",
              "border-t border-border-subtle",
            )}
          >
            {action}
          </div>
        )}
      </div>
    </Card>
  );
}
