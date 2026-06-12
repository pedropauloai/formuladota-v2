"use client";

// AdminPendingStrip — SEÇÃO GLOBAL do /admin/pros: PTs agendadas de TODOS os
// PROs aguardando decisão (confirmar/cancelar), mais antiga primeiro.
// É o "o que precisa de atenção primeiro": clicar num card seleciona o coach
// no master-detail, onde ficam as ações de emergência.

import { AlertTriangle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AdminCoachSummary, AdminPendingPT } from "./admin-pros-types";
import { formatAge } from "./format";

interface Props {
  pending: AdminPendingPT[];
  coaches: AdminCoachSummary[];
  nowMs: number;
  selectedCoachId: string | null;
  onSelectCoach: (coachId: string) => void;
}

export function AdminPendingStrip({
  pending,
  coaches,
  nowMs,
  selectedCoachId,
  onSelectCoach,
}: Props) {
  const coachById = new Map(coaches.map((c) => [c.coachId, c]));

  return (
    <section
      aria-label="PTs aguardando decisão"
      className="shrink-0 border-b border-warning/30 bg-warning/5"
    >
      <div className="flex items-center gap-2 px-4 pt-2 xl:px-6">
        <AlertTriangle size={14} className="text-warning" aria-hidden="true" />
        <h2 className="font-display-condensed text-lg uppercase leading-none tracking-wider text-warning">
          Atenção primeiro — {pending.length} PT{pending.length === 1 ? "" : "s"}{" "}
          aguardando decisão
        </h2>
      </div>

      <ul className="flex gap-2 overflow-x-auto px-4 py-2 xl:px-6">
        {pending.map((pt) => {
          const coach = coachById.get(pt.coachId);
          const selected = selectedCoachId === pt.coachId;
          return (
            <li key={pt.matchId} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelectCoach(pt.coachId)}
                className={cn(
                  "flex items-center gap-3 rounded-sm border px-3 py-2 text-left transition-colors",
                  selected
                    ? "border-warning/60 bg-warning/15"
                    : "border-border-subtle bg-bg-elevated hover:border-warning/50"
                )}
              >
                <div>
                  <p className="font-display text-sm font-semibold text-text-display">
                    {coach?.username ?? coach?.slug ?? "PRO"}
                  </p>
                  <p className="font-mono text-sm text-text-muted">
                    {pt.students.length} aluno{pt.students.length === 1 ? "" : "s"}{" "}
                    · há{" "}
                    <span className="tabular-nums text-warning">
                      {formatAge(pt.createdAt, nowMs)}
                    </span>
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="text-text-faded"
                  aria-hidden="true"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
