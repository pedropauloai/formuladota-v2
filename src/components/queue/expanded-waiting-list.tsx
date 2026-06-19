"use client";

// ExpandedWaitingList — lista colapsável da fila do PRO além dos primeiros N
// slots ativos (filaMaxVagas). Componente puro de exibição — recebe entries
// já filtradas (só waiting, não os slots ativos da próxima PT).

import { useState } from "react";
import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/ui/avatar";
import type { BoardEntry } from "./queue-board";

interface Props {
  entries: BoardEntry[];
  startPosition: number;
  viewerUserId: string;
}

export function ExpandedWaitingList({
  entries,
  startPosition,
  viewerUserId,
}: Props) {
  // Snapshot do horário atual — evita Date.now() impure em render
  const [now] = useState(() => Date.now());
  const t = useTranslations("queue");
  return (
    <div className="mt-3 rounded-md border border-border-subtle bg-bg-deep/30 p-3">
      <p className="mb-3 font-display font-semibold text-sm uppercase tracking-wide text-warning/80">
        {t("waitingNextRound")}
      </p>
      <ul className="space-y-1.5">
        {entries.map((e, idx) => {
          const position = startPosition + idx;
          const isViewer = e.userId === viewerUserId;
          const waitingMinutes = Math.floor(
            (now - new Date(e.joinedAt).getTime()) / 60000
          );
          return (
            <li
              key={e.entryId}
              className={`flex items-center gap-3 rounded px-3 py-2 ${
                isViewer
                  ? "bg-warning/15 ring-1 ring-warning/40"
                  : "hover:bg-bg-elevated"
              }`}
            >
              <span
                className={`w-7 font-mono text-sm 2xl:text-base font-semibold tabular-nums ${
                  isViewer ? "text-warning" : "text-text-muted"
                }`}
              >
                {position}º
              </span>
              <UserAvatar
                src={e.avatarUrl ?? undefined}
                alt={e.username ?? ""}
                fallback={(e.username ?? "??").slice(0, 2)}
                size="sm"
                ringColor={isViewer ? "tier-immortal" : null}
              />
              <span
                className={`flex-1 truncate font-sans text-sm 2xl:text-base ${
                  isViewer ? "font-bold text-text-display" : "text-text-body"
                }`}
              >
                {isViewer ? t("you") : e.username ?? "—"}
              </span>
              {e.ptsToday !== undefined && e.ptsToday > 0 && (
                <span className="rounded-full bg-warning/20 px-2 py-0.5 font-mono text-sm 2xl:text-base font-semibold text-warning">
                  {t("timesToday", { count: e.ptsToday })}
                </span>
              )}
              <span className="w-10 text-right font-display text-sm 2xl:text-base font-semibold text-text-body tabular-nums">
                {waitingMinutes}m
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
