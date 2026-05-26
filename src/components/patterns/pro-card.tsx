"use client";
/**
 * ProCard — FormulaDota V2.5 (F8 → F9 → F10 fila)
 *
 * Card vertical hero canônico do PRO. Compõe primitives F9:
 *   Card + UserAvatar + MembershipBadge + BadgeStack + AchievementBadge
 *   + DotaRankMedal + HonorRankMedal (par SKILL+HONOR)
 *
 * Blocos opcionais (todos podem ser desligados):
 *   1. Hero portrait + membership + ring colorido
 *   2. Identidade: nome + medalhas SKILL/HONOR + MMR + headline + achievements
 *   3. Bio longa (italic)
 *   4. Bloco de fila ao vivo (mini-slots 2x2 + waiting count + slot pra waiting list)
 *   5. Recent matches pills (V/D)
 *   6. Action slot (CTA contextual passado pelo caller)
 *
 * Composição flexível por design — cada uso (showcase, feed de fila, perfil) liga
 * apenas o que faz sentido. Lógica de domínio (join/leave) fica fora — caller
 * passa <QueueActionButton> via prop `action`.
 *
 * Voz: Mestre — autoritativa, sem jargão startup.
 * B6 — ZERO nome próprio do admin em strings user-facing.
 * C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.
 */

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Radio, Users, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UserAvatar, type PresenceStatus, type RingColor } from "@/components/ui/avatar";
import { MembershipBadge, type MembershipTier } from "@/components/ui/membership-badge";
import { BadgeStack, type BadgeItem } from "@/components/ui/badge-stack";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BoardEntry } from "@/components/queue/queue-board";
import { ExpandedWaitingList } from "@/components/queue/expanded-waiting-list";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface RecentMatch {
  result: "win" | "loss";
  /** Variação de MMR — positivo = ganho, negativo = perda */
  mmrDelta: number;
}

export interface QueueStats {
  /** Total na fila (slots ativos + waiting list) */
  entriesCount: number;
  ptsHoje?: number;
  alunosHoje?: number;
}

/** Estado visual da borda do card — reflete posição do viewer em relação à fila */
export type ProCardBorderAccent = "default" | "warning" | "success";

export interface ProCardProps {
  /**
   * Nome de exibição do PRO (Steam persona ou username).
   * NUNCA usar nome próprio real — usar identidade de plataforma. (B6)
   */
  proName: string;

  portraitUrl?: string;

  /** Tier MMR em texto legível — fallback CSS-only se `rank` não fornecido */
  tierLabel?: string;

  /** MMR atual — exibido em tabular nums */
  mmr: number;

  presence: PresenceStatus;

  /** Bio longa em voz Mestre — máximo 200 chars, line-clamp-3 */
  bio?: string;

  /** Subtítulo curto italic — 1 linha, estilo "especialista em mid-lane" */
  headline?: string;

  recentMatches?: RecentMatch[];

  /** Slot principal de ação — ex: <QueueActionButton /> ou <Button>Entrar</Button> */
  action?: ReactNode;

  /** @default "aluno" */
  membershipTier?: MembershipTier;

  /** Conquistas abaixo do nome (BadgeStack max=3) */
  achievements?: BadgeItem[];

  /** @default "brand" */
  ringColor?: RingColor;

  /**
   * Rank oficial Dota 2 — exibe DotaRankMedal (imagem PNG real).
   * Se fornecido, substitui o tierLabel CSS-only por medalha visual.
   */
  rank?: DotaRank;

  /**
   * Rank de HONOR — exibido lado a lado com SKILL (par canônico V2.5).
   * Aparece apenas se `rank` também estiver definido.
   */
  honorRank?: HonorRank;

  // -------------------------------------------------------------------------
  // Bloco de fila ao vivo (V2.5-F10) — todos opcionais; aparecem quando fornecidos
  // -------------------------------------------------------------------------

  /**
   * Slots ocupados da próxima PT (top N pelo algoritmo LRU).
   * Renderiza grid 2x2 quando maxQueueSlots=4.
   */
  queueSlots?: BoardEntry[];

  /** Capacidade máxima da PT (default 4) */
  maxQueueSlots?: number;

  /** Quantos estão aguardando além dos slots ativos */
  waitingExtra?: number;

  /** Lista completa de waiting pra expandir (se ausente, expand fica desligado) */
  waitingList?: BoardEntry[];

  /** ID do viewer pra destacar slot dele em warning */
  viewerUserId?: string;

  /** Stats inline: total na fila, PTs hoje, alunos hoje */
  queueStats?: QueueStats;

  /** Indica fila aberta visualmente (ring pulsante no canto + label "Fila aberta") */
  filaAberta?: boolean;

  /**
   * Acento de borda da card pra refletir estado:
   *   warning = viewer na fila aqui | success = fila aberta | default = neutra
   */
  borderAccent?: ProCardBorderAccent;

  /** Default expanded — útil quando viewer está na fila pra ele ver sua posição */
  defaultExpanded?: boolean;

  className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

const BORDER_ACCENT_CLASSES: Record<ProCardBorderAccent, string> = {
  default: "border-border-strong",
  warning: "border-warning/60 bg-warning/5",
  success: "border-success/40 bg-success/[0.03]",
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

/**
 * ProCard — card cinematográfico de perfil do PRO.
 *
 * @example
 * // Hero card (showcase /components)
 * <ProCard
 *   proName="IMMORTAL_PRO"
 *   mmr={9200}
 *   rank="immortal-top-100"
 *   presence="online"
 *   membershipTier="consagrado"
 *   achievements={[{ variant: "champion-s1" }, { variant: "comendado" }]}
 *   bio="Top 0.5% — 15 anos de Dota. Metodologia FORMULADOTA."
 *   action={<Button>Entrar na Fila</Button>}
 * />
 *
 * @example
 * // Card de fila ao vivo (/ranked-com-pro)
 * <ProCard
 *   proName="PETERPRA"
 *   mmr={7200}
 *   rank="immortal"
 *   honorRank="mestre"
 *   headline="Especialista em mid-lane"
 *   presence="online"
 *   filaAberta
 *   borderAccent="success"
 *   queueSlots={entries.slice(0, 4)}
 *   maxQueueSlots={4}
 *   waitingExtra={2}
 *   waitingList={entries.slice(4)}
 *   viewerUserId={userId}
 *   queueStats={{ entriesCount: 6, ptsHoje: 3 }}
 *   action={<QueueActionButton ... />}
 * />
 */
export function ProCard({
  proName,
  portraitUrl,
  tierLabel,
  mmr,
  presence,
  bio,
  headline,
  recentMatches = [],
  action,
  membershipTier = "aluno",
  achievements = [],
  ringColor = "brand",
  rank,
  honorRank,
  queueSlots,
  maxQueueSlots = 4,
  waitingExtra = 0,
  waitingList,
  viewerUserId,
  queueStats,
  filaAberta,
  borderAccent = "default",
  defaultExpanded = false,
  className,
}: ProCardProps) {
  const visibleMatches = recentMatches.slice(0, 5);
  const fallbackInitials = proName.charAt(0).toUpperCase();
  const hasQueueBlock = queueSlots !== undefined;
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card
      className={cn(
        "relative max-w-sm w-full",
        "bg-bg-base border p-6",
        BORDER_ACCENT_CLASSES[borderAccent],
        className
      )}
    >
      {/* Ring pulsante "ao vivo" — marca fila aberta no canto */}
      {filaAberta && (
        <span
          className="absolute -top-1.5 -right-1.5 flex size-3.5"
          aria-hidden="true"
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex size-3.5 rounded-full bg-success" />
        </span>
      )}

      <div className="flex flex-col items-center gap-6 text-center">
        {/* ---- BLOCO 1: Hero Portrait ---- */}
        <UserAvatar
          src={portraitUrl}
          alt={`Retrato de ${proName}`}
          fallback={fallbackInitials}
          size="xl"
          presence={presence}
          badge={<MembershipBadge tier={membershipTier} />}
          ringColor={ringColor}
        />

        {/* ---- BLOCO 2: Identidade ---- */}
        <div className="w-full space-y-2">
          <h2
            className={cn(
              "font-display text-2xl font-bold",
              "text-text-display",
              "tracking-[0.08em] uppercase leading-tight",
            )}
          >
            {proName}
          </h2>

          {/* Par canônico SKILL + HONOR (V2.5 mandamento M12) — ou fallback CSS */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {rank ? (
              <div className="flex items-center gap-3">
                <DotaRankMedal
                  rank={rank}
                  size="md"
                  glow={rank === "immortal" || rank === "immortal-top-100"}
                  showLabel={!honorRank}
                />
                {honorRank && (
                  <HonorRankMedal
                    rank={honorRank}
                    size="md"
                    glow={honorRank === "imortal-da-formula"}
                  />
                )}
              </div>
            ) : tierLabel ? (
              <span
                className={cn(
                  "text-sm font-bold uppercase tracking-widest",
                  "text-brand-primary font-display-condensed",
                )}
              >
                {tierLabel}
              </span>
            ) : null}

            <span className="font-mono text-sm tabular-nums text-text-muted">
              {mmr.toLocaleString("pt-BR")} MMR
            </span>
          </div>

          {/* Headline curto italic */}
          {headline && (
            <p className="font-display text-sm italic text-text-muted line-clamp-1 border-l-2 border-brand-primary/30 pl-3 mx-auto inline-block">
              {headline}
            </p>
          )}

          {achievements.length > 0 && (
            <div className="flex justify-center pt-1">
              <BadgeStack badges={achievements} max={3} />
            </div>
          )}
        </div>

        {/* ---- BLOCO 3: Bio ---- */}
        {bio && (
          <p
            className={cn(
              "max-w-xs text-sm leading-relaxed",
              "text-text-muted italic line-clamp-3",
            )}
          >
            {bio}
          </p>
        )}

        {/* ---- BLOCO 4: Fila ao vivo (mini-slots + waiting + stats) ---- */}
        {hasQueueBlock && (
          <QueueBlock
            queueSlots={queueSlots!}
            maxQueueSlots={maxQueueSlots}
            waitingExtra={waitingExtra}
            waitingList={waitingList}
            viewerUserId={viewerUserId}
            queueStats={queueStats}
            filaAberta={filaAberta}
            expanded={expanded}
            onToggleExpanded={() => setExpanded((v) => !v)}
          />
        )}

        {/* ---- BLOCO 5: Recent matches pills ---- */}
        {visibleMatches.length > 0 && (
          <div className="w-full space-y-2">
            <p className="font-display text-sm uppercase tracking-[0.18em] text-text-faded">
              Últimas partidas
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {visibleMatches.map((match, index) => {
                const isWin = match.result === "win";
                return (
                  <div
                    key={index}
                    className={cn(
                      "min-w-[3.5rem] h-7 rounded-sm border",
                      "flex items-center justify-center gap-1",
                      "font-mono text-sm font-semibold tabular-nums",
                      isWin
                        ? "bg-success/10 border-success/30 text-success"
                        : "bg-error/10 border-error/30 text-error",
                    )}
                    title={`${isWin ? "Vitória" : "Derrota"} — ${formatDelta(match.mmrDelta)} MMR`}
                    aria-label={`${isWin ? "Vitória" : "Derrota"} ${formatDelta(match.mmrDelta)} MMR`}
                  >
                    <span className="font-bold">{isWin ? "V" : "D"}</span>
                    <span className="opacity-80">{formatDelta(match.mmrDelta)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ---- BLOCO 6: Action slot ---- */}
        {action && (
          <div className="w-full pt-4 border-t border-border-subtle">{action}</div>
        )}
      </div>
    </Card>
  );
}

// ===========================================================================
// QueueBlock — sub-componente interno: mini-slots 2x2 + waiting + stats
// ===========================================================================

interface QueueBlockProps {
  queueSlots: BoardEntry[];
  maxQueueSlots: number;
  waitingExtra: number;
  waitingList?: BoardEntry[];
  viewerUserId?: string;
  queueStats?: QueueStats;
  filaAberta?: boolean;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function QueueBlock({
  queueSlots,
  maxQueueSlots,
  waitingExtra,
  waitingList,
  viewerUserId,
  queueStats,
  filaAberta,
  expanded,
  onToggleExpanded,
}: QueueBlockProps) {
  // Padroniza grid: max=4 → 2x2 (mais legível em card vertical estreito)
  const gridCols = maxQueueSlots === 4 ? "grid-cols-2" : "grid-cols-2";
  const slotsToRender = Array.from({ length: maxQueueSlots }).map(
    (_, idx) => queueSlots[idx] ?? null
  );

  return (
    <div className="w-full space-y-3">
      <p className="font-display text-sm uppercase tracking-[0.18em] text-text-faded">
        Próxima PT
      </p>

      <div className={cn("grid gap-2", gridCols)}>
        {slotsToRender.map((slot, idx) => {
          if (!slot) {
            return (
              <div
                key={`empty-${idx}`}
                className="flex h-12 items-center justify-center rounded border border-dashed border-border-subtle bg-bg-deep/30"
                title={`Slot ${idx + 1} livre`}
              >
                <span className="font-display font-semibold text-sm uppercase text-text-faded">
                  livre
                </span>
              </div>
            );
          }
          const isViewer = slot.userId === viewerUserId;
          return (
            <div
              key={slot.entryId}
              className={cn(
                "flex h-12 items-center gap-1.5 rounded px-2",
                isViewer
                  ? "bg-warning/15 ring-1 ring-warning/50"
                  : "bg-success/10 ring-1 ring-success/30",
              )}
              title={isViewer ? "VOCÊ" : slot.username ?? ""}
            >
              <UserAvatar
                src={slot.avatarUrl ?? undefined}
                alt={slot.username ?? ""}
                fallback={(slot.username ?? "??").slice(0, 2)}
                size="sm"
                ringColor={isViewer ? "tier-immortal" : null}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-sans text-sm text-left",
                  isViewer ? "font-bold text-warning" : "text-text-body",
                )}
              >
                {isViewer ? "VOCÊ" : slot.username ?? "—"}
              </span>
            </div>
          );
        })}
      </div>

      {/* +N espera */}
      {waitingExtra > 0 && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/15 px-3 py-1 font-display text-sm font-bold uppercase tracking-wide text-warning">
            +{waitingExtra} aguardando
          </span>
        </div>
      )}

      {/* Stats inline */}
      {queueStats && (
        <div className="flex flex-wrap items-center justify-center gap-3 font-display text-sm font-semibold text-text-body">
          <span className="inline-flex items-center gap-1">
            <Users size={12} aria-hidden="true" />
            {queueStats.entriesCount} na fila
          </span>
          {filaAberta && (
            <span className="inline-flex items-center gap-1 text-success">
              <Radio size={12} aria-hidden="true" />
              Fila aberta
            </span>
          )}
          {queueStats.ptsHoje !== undefined && queueStats.ptsHoje > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock size={12} aria-hidden="true" />
              {queueStats.ptsHoje} PT{queueStats.ptsHoje > 1 ? "s" : ""} hoje
              {queueStats.alunosHoje !== undefined &&
                queueStats.alunosHoje > 0 &&
                ` · ${queueStats.alunosHoje} alunos`}
            </span>
          )}
        </div>
      )}

      {/* Toggle expand — só se houver waiting list expandível */}
      {waitingExtra > 0 && waitingList && waitingList.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleExpanded}
          className="w-full"
        >
          {expanded ? (
            <>
              <ChevronUp size={14} aria-hidden="true" />
              Recolher fila
            </>
          ) : (
            <>
              <ChevronDown size={14} aria-hidden="true" />
              Ver fila completa ({waitingExtra} aguardando)
            </>
          )}
        </Button>
      )}

      {/* Waiting list expandida */}
      {expanded && waitingList && waitingList.length > 0 && viewerUserId && (
        <ExpandedWaitingList
          entries={waitingList}
          startPosition={maxQueueSlots + 1}
          viewerUserId={viewerUserId}
        />
      )}
    </div>
  );
}
