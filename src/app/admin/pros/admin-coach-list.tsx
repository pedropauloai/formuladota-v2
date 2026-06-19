"use client";

// AdminCoachListRow / AdminCoachChip — itens da lista MASTER do /admin/pros.
// Linha densa (coluna esquerda, xl+) e chip horizontal (telas menores),
// mesmo padrão do pro-list-row de /ranked-com-pro.
//
// Cada linha responde: fila aberta? há quanto tempo? quantos esperando?
// PT em curso? quanto rendeu hoje? — tudo que o admin precisa pra triagem.

import { useTranslations } from "next-intl";
import { Radio, Swords, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminCoachSummary } from "./admin-pros-types";
import { formatAge, formatBRL } from "./format";

interface ItemProps {
  coach: AdminCoachSummary;
  hasPendingPT: boolean;
  selected: boolean;
  nowMs: number;
  onSelect: () => void;
}

export function AdminCoachListRow({
  coach,
  hasPendingPT,
  selected,
  nowMs,
  onSelect,
}: ItemProps) {
  const t = useTranslations("misc2");
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-center gap-2.5 border-l-2 px-3 py-2 text-left transition-colors",
        selected
          ? "border-brand-primary bg-bg-elevated"
          : "border-transparent hover:bg-bg-elevated/60"
      )}
    >
      <UserAvatar
        size="sm"
        src={coach.avatarUrl ?? undefined}
        alt={coach.username ?? coach.slug}
        fallback={(coach.username ?? coach.slug).slice(0, 2)}
        presence={coach.filaAberta ? "online" : "offline"}
      />

      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm font-semibold text-text-display">
          {coach.username ?? coach.slug}
          {!coach.ativo && (
            <span className="ml-1.5 font-mono text-sm text-text-faded">
              {t("coachInactive")}
            </span>
          )}
        </p>
        <p className="font-mono text-sm text-text-muted">
          {coach.filaAberta && coach.filaAbertaEm ? (
            <span className="text-success">
              {t("queueOpenFor", { age: formatAge(coach.filaAbertaEm, nowMs) })}
            </span>
          ) : (
            <span className="text-text-faded">{t("queueClosed")}</span>
          )}
          {" · "}
          {t("coachPtsToday", { count: coach.hoje.pts })} ·{" "}
          <span className="tabular-nums text-gold">
            R$ {formatBRL(coach.hoje.ganhoBrl)}
          </span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {hasPendingPT && (
          <span
            className="inline-flex items-center gap-1 font-display-condensed text-base uppercase leading-none tracking-wider text-warning"
            title={t("ptInProgressTitle")}
          >
            <Swords size={12} aria-hidden="true" />
            PT
          </span>
        )}
        <span
          className={cn(
            "inline-flex items-center gap-1 font-display text-sm font-bold tabular-nums",
            coach.waitingCount > 0 ? "text-text-display" : "text-text-faded"
          )}
          title={t("inQueueTitle", { count: coach.waitingCount })}
        >
          <Users size={12} aria-hidden="true" />
          {coach.waitingCount}
        </span>
      </div>
    </button>
  );
}

// ─── Chip horizontal (telas < xl) ────────────────────────────────────────────

export function AdminCoachChip({
  coach,
  hasPendingPT,
  selected,
  onSelect,
}: Omit<ItemProps, "nowMs">) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-sm border px-2.5 py-1.5 transition-colors",
        selected
          ? "border-brand-primary bg-bg-elevated"
          : "border-border-subtle bg-bg-base hover:border-brand-primary/50"
      )}
    >
      {coach.filaAberta ? (
        <Radio size={12} className="text-success" aria-hidden="true" />
      ) : (
        <Radio size={12} className="text-text-faded" aria-hidden="true" />
      )}
      <span className="font-display text-sm font-semibold text-text-display">
        {coach.username ?? coach.slug}
      </span>
      <span className="font-display text-sm font-bold tabular-nums text-text-muted">
        {coach.waitingCount}
      </span>
      {hasPendingPT && (
        <Swords size={12} className="text-warning" aria-hidden="true" />
      )}
    </button>
  );
}
