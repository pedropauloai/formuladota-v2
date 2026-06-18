"use client";

// ProDetail — painel central do master-detail de /ranked-com-pro.
//
// Exibe o PRO SELECIONADO em destaque (60% da atenção), sem rolagem própria:
//   1. Identidade: avatar quadrado grande + nome Teko uppercase + par de
//      medalhas SKILL/HONOR + MMR grande em dourado + headline
//   2. PRÓXIMA PT: os N slots da fila (ativos pelo algoritmo LRU)
//   3. Stats do dia: na fila / fila aberta há Xm / PTs e alunos hoje
//   4. Últimas partidas (pills V/D) — slot pronto, sem fonte de dados hoje
//   5. Waiting list além dos slots — ÚNICA sub-área com scroll interno
//
// Componente puro de exibição — CTA e join/leave moram no parent.
// C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.

import { useState } from "react";
import { Clock, Radio, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import { MedalPair } from "@/components/ui/medal-pair";
import {
  HeroVideoBackdrop,
  type SignatureHero,
} from "@/components/dota/hero-video-backdrop";
import { ExpandedWaitingList } from "@/components/queue/expanded-waiting-list";
import { mmrToDotaRank, coachHonorRank } from "@/components/queue/queue-helpers";
import type { BoardEntry } from "@/components/queue/queue-board";
import type { ProWithQueue, ProRecentStats } from "@/lib/queries/pros";

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

export interface DetailRecentMatch {
  result: "win" | "loss";
  /** Variação de MMR — positivo = ganho, negativo = perda */
  mmrDelta: number;
}

interface ProDetailProps {
  pro: ProWithQueue;
  stats?: ProRecentStats;
  viewerUserId: string;
  /** Herói de assinatura do PRO (nº 1 da carreira) — backdrop vivo da identidade. */
  signatureHero?: SignatureHero | null;
  /** Pills V/D — opcional; hoje sem fonte de dados, slot pronto pro futuro. */
  recentMatches?: DetailRecentMatch[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta);
}

/** Grid estático por capacidade — Tailwind não compila classes dinâmicas. */
function slotGridCols(max: number): string {
  if (max >= 4) return "grid-cols-2 sm:grid-cols-4";
  if (max === 3) return "grid-cols-3";
  return "grid-cols-2";
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function ProDetail({
  pro,
  stats,
  viewerUserId,
  signatureHero = null,
  recentMatches = [],
}: ProDetailProps) {
  const { coach, entries } = pro;
  const name = coach.username ?? coach.slug;
  const maxSlots = coach.filaMaxVagas;
  const activeSlots = entries.slice(0, maxSlots);
  const waitingList = entries.slice(maxSlots);
  const rank = mmrToDotaRank(coach.mmrAtual);
  const honor = coachHonorRank(coach);

  // Snapshot do relógio ao montar — useState lazy init evita Date.now() impuro em render
  const [now] = useState(() => Date.now());
  const minutesOpen = coach.filaAbertaEm
    ? Math.floor((now - new Date(coach.filaAbertaEm).getTime()) / 60000)
    : 0;

  return (
    <div className="flex h-full min-h-0 flex-col gap-5 px-4 py-4 xl:px-8 xl:py-6">
      {/* ---- BLOCO 1: Identidade ----
          Herói de assinatura do PRO como backdrop VIVO (vídeo Valve sutil) —
          atmosfera atrás da identidade, gradiente garante a leitura. */}
      <header className="relative shrink-0 overflow-hidden rounded-sm">
        {signatureHero && (
          <HeroVideoBackdrop
            heroSlug={signatureHero.slug}
            heroName={signatureHero.name}
            videoOpacityClass="opacity-15"
            gradientClass="bg-gradient-to-r from-bg-deep/70 via-bg-deep/25 to-bg-deep/80"
          />
        )}
        {/* p-3 SEMPRE: o header tem overflow-hidden (backdrop) — sem padding,
            o anel/dot de presença do avatar era cortado na esquerda. */}
        <div className="relative flex items-center gap-5 p-3">
          <UserAvatar
            size="xl"
            src={coach.avatarUrl ?? undefined}
            alt={`Retrato de ${name}`}
            fallback={name.slice(0, 2)}
            presence={coach.filaAberta ? "online" : "offline"}
            ringColor={coach.filaAberta ? "play" : null}
          />
          <div className="min-w-0 flex-1 space-y-1.5">
            {/* Teko (x-height baixo) — text-5xl/6xl pra equivaler a Ubuntu menor */}
            <h1 className="truncate font-display-condensed text-5xl font-semibold uppercase leading-[0.9] text-text-display xl:text-6xl">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {/* Par canônico SKILL + HONOR (mandamento M12) */}
              <MedalPair dotaRank={rank} honorRank={honor} size="md" />
              <p className="font-display-condensed text-4xl leading-none tabular-nums text-gold">
                {(coach.mmrAtual ?? 0).toLocaleString("pt-BR")}
                <span className="ml-1.5 text-xl text-gold-muted">MMR</span>
              </p>
            </div>
            {coach.headline && (
              <p className="truncate border-l-2 border-brand-primary/40 pl-3 font-display text-sm italic text-text-muted">
                {coach.headline}
              </p>
            )}
            {coach.filaAberta && coach.queueMode && (
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1 rounded-sm px-2 py-0.5 font-display text-xs font-semibold uppercase tracking-wide",
                  coach.queueMode === "coached"
                    ? "bg-success/10 text-success"
                    : "bg-brand-primary/10 text-brand-primary"
                )}
              >
                {coach.queueMode === "coached"
                  ? "PRO observa + análise"
                  : "PRO joga junto"}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* ---- BLOCO 2: Próxima PT (slots) ---- */}
      <section className="shrink-0 space-y-2.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display-condensed text-xl uppercase leading-none tracking-wider text-text-muted">
            Próxima PT
          </h2>
          {waitingList.length > 0 && (
            <span className="inline-flex items-center rounded-sm bg-warning/15 px-3 py-0.5 font-display text-sm font-bold uppercase tracking-wide text-warning">
              +{waitingList.length} aguardando
            </span>
          )}
        </div>
        <div className={cn("grid gap-2", slotGridCols(maxSlots))}>
          {Array.from({ length: maxSlots }).map((_, idx) => {
            const slot = activeSlots[idx] ?? null;
            return (
              <QueueSlot
                key={slot?.entryId ?? `empty-${idx}`}
                slot={slot}
                index={idx}
                isViewer={slot?.userId === viewerUserId}
                now={now}
              />
            );
          })}
        </div>
      </section>

      {/* ---- BLOCO 3: Stats do dia ---- */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 font-display text-sm font-semibold text-text-body">
        <span className="inline-flex items-center gap-1.5">
          <Users size={13} aria-hidden="true" />
          {entries.length} na fila
        </span>
        {coach.filaAberta ? (
          <span className="inline-flex items-center gap-1.5 text-success">
            <Radio size={13} aria-hidden="true" />
            Fila aberta{minutesOpen > 0 && ` há ${minutesOpen}m`}
          </span>
        ) : (
          <span className="uppercase tracking-wide text-text-faded">
            Fila fechada
          </span>
        )}
        {stats && stats.ptsHoje > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} aria-hidden="true" />
            {stats.ptsHoje} PT{stats.ptsHoje > 1 ? "s" : ""} hoje
            {stats.alunosAtendidosHoje > 0 &&
              ` · ${stats.alunosAtendidosHoje} alunos`}
          </span>
        )}
      </div>

      {/* ---- BLOCO 4: Últimas partidas (pills V/D) ---- */}
      {recentMatches.length > 0 && (
        <div className="shrink-0 space-y-2">
          <p className="font-display-condensed text-lg uppercase leading-none tracking-wider text-text-faded">
            Últimas partidas
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {recentMatches.slice(0, 5).map((match, index) => {
              const isWin = match.result === "win";
              return (
                <div
                  key={index}
                  className={cn(
                    "flex h-7 min-w-[3.5rem] items-center justify-center gap-1 rounded-sm border font-mono text-sm font-semibold tabular-nums",
                    isWin
                      ? "border-success/30 bg-success/10 text-success"
                      : "border-error/30 bg-error/10 text-error"
                  )}
                  title={`${isWin ? "Vitória" : "Derrota"} — ${formatDelta(match.mmrDelta)} MMR`}
                >
                  <span className="font-bold">{isWin ? "V" : "D"}</span>
                  <span className="opacity-80">{formatDelta(match.mmrDelta)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- BLOCO 5: Waiting list — única sub-área com scroll interno ---- */}
      {waitingList.length > 0 && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ExpandedWaitingList
            entries={waitingList}
            startPosition={maxSlots + 1}
            viewerUserId={viewerUserId}
          />
        </div>
      )}
    </div>
  );
}

// ===========================================================================
// QueueSlot — slot individual da próxima PT (livre ou ocupado)
// ===========================================================================

interface QueueSlotProps {
  slot: BoardEntry | null;
  index: number;
  isViewer: boolean;
  /** Snapshot de Date.now() do parent — evita relógios divergentes entre slots. */
  now: number;
}

function QueueSlot({ slot, index, isViewer, now }: QueueSlotProps) {
  if (!slot) {
    return (
      <div
        className="flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-sm border border-dashed border-border-subtle bg-bg-deep/30 p-3"
        title={`Slot ${index + 1} livre`}
      >
        <span className="font-display-condensed text-lg uppercase leading-none tracking-widest text-text-faded">
          livre
        </span>
        <span className="font-mono text-xs text-text-faded">
          slot {index + 1}
        </span>
      </div>
    );
  }

  const waitingMinutes = Math.floor(
    (now - new Date(slot.joinedAt).getTime()) / 60000
  );

  return (
    <div
      className={cn(
        "flex min-h-[88px] flex-col items-center justify-center gap-1 rounded-sm border p-3",
        isViewer
          ? "border-warning/60 bg-warning/10"
          : "border-success/30 bg-success/5"
      )}
      title={isViewer ? "VOCÊ" : (slot.username ?? "")}
    >
      <UserAvatar
        size="md"
        src={slot.avatarUrl ?? undefined}
        alt={slot.username ?? ""}
        fallback={(slot.username ?? "??").slice(0, 2)}
        ringColor={isViewer ? "tier-immortal" : null}
      />
      <span
        className={cn(
          "max-w-full truncate font-sans text-sm",
          isViewer ? "font-bold text-warning" : "text-text-body"
        )}
      >
        {isViewer ? "VOCÊ" : (slot.username ?? "—")}
      </span>
      <span className="inline-flex items-center gap-1 font-mono text-xs tabular-nums text-text-muted">
        <Clock size={10} aria-hidden="true" />
        {waitingMinutes}m
      </span>
    </div>
  );
}
