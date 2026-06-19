// QueueStatusPill — pílula compacta no centro da topbar com status "Na fila".
//
// Pedro pediu (2026-05-26): o sticky banner ANTIGO ficava ACIMA da topbar e
// forçava scroll de página, quebrando a experiência "client" do Dota 2.
// Solução: pílula que SUBSTITUI o indicador "X PROs online" quando o user
// está em alguma fila — zero overhead de layout, sempre visível, integrada.
//
// Comportamento:
//   - 0 filas → renderiza null (TopBar mostra "X PROs online" no lugar)
//   - 1+ filas → renderiza pílula com posição + tempo + extra count
//
// Server Component — busca de filas vem do shell.tsx via prop.

import Link from "next/link";
import { Hourglass } from "lucide-react";
import { TabTitleUpdater } from "./tab-title-updater";
import { LeaveQueueButton } from "./leave-queue-button";
import type { MyQueueEntry } from "@/lib/queries/queue";

interface Props {
  queues: MyQueueEntry[];
}

export function QueueStatusPill({ queues }: Props) {
  if (queues.length === 0) return null;
  const q = queues[0];
  if (!q) return null;
  const extra = queues.length - 1;

  return (
    <>
      {/* Tab title browser (sem UI): "Na fila · 2º — FORMULADOTA" */}
      <TabTitleUpdater
        inQueue={true}
        position={q.position}
        total={q.total}
        coachUsername={q.coachUsername}
      />

      {/* Pílula visual — link pro dashboard com info + botão sair fila */}
      <div
        role="status"
        aria-live="polite"
        className="hidden xl:flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-1"
      >
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>

        <Link
          href="/dashboard"
          className="flex items-center gap-1.5 font-display text-sm 2xl:text-base font-semibold text-emerald-200 hover:text-white transition-colors"
          aria-label={`Na fila de ${q.coachUsername ?? "PRO"}, posição ${q.position} de ${q.total}, ${q.waitingMinutes} minutos aguardando`}
        >
          <Hourglass size={12} className="text-emerald-300" aria-hidden="true" />
          <span>
            Na fila ·{" "}
            <span className="font-mono">
              {q.position}º
            </span>
            {extra > 0 && (
              <span className="ml-1.5 rounded bg-emerald-500/20 px-1 text-sm 2xl:text-base">
                +{extra}
              </span>
            )}
          </span>
          <span className="font-mono text-sm 2xl:text-base text-emerald-300/70">
            · {q.waitingMinutes}m
          </span>
        </Link>

        <LeaveQueueButton entryId={q.entryId} />
      </div>
    </>
  );
}
