// StickyBanner — banner persistente sticky no topo (visível em todas as rotas)
// quando user está em fila de algum PRO. Mostra resumo + botão sair + tab title.
//
// Server Component que busca status; renderiza wrapper client (LeaveButton + Tab updater).

import Link from "next/link";
import { Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyQueueStatus } from "@/lib/queries/queue";
import { TabTitleUpdater } from "./tab-title-updater";
import { LeaveQueueButton } from "./leave-queue-button";

export async function StickyQueueBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const queues = await getMyQueueStatus(user.id);
  if (queues.length === 0) return null;

  // Banner mostra a primeira fila (usuário pode estar em N)
  const q = queues[0];
  if (!q) return null;
  const extra = queues.length - 1;

  return (
    <>
      <TabTitleUpdater
        inQueue={true}
        position={q.position}
        total={q.total}
        coachUsername={q.coachUsername}
      />
      <div
        role="status"
        aria-live="polite"
        className="sticky top-0 z-50 flex items-center gap-3 border-b border-emerald-500/40 bg-emerald-500/10 px-4 py-2 backdrop-blur-md"
      >
        <span className="relative flex size-2.5" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>

        <Hourglass size={14} className="text-emerald-300" aria-hidden="true" />

        <p className="flex-1 font-sans text-sm uppercase tracking-widest text-emerald-200">
          Na fila de <strong className="font-semibold text-white">{q.coachUsername ?? "PRO"}</strong>
          {" · "}
          <span className="font-mono">{q.position}º de {q.total}</span>
          {" · "}
          <span className="font-mono text-emerald-300/80">{q.waitingMinutes}m aguardando</span>
          {extra > 0 && (
            <span className="ml-2 rounded-md bg-emerald-500/20 px-1.5 py-0.5 font-mono text-sm">
              +{extra} {extra === 1 ? "outra fila" : "outras filas"}
            </span>
          )}
        </p>

        <Link
          href="/dashboard"
          className="hidden sm:inline-flex items-center font-mono text-sm uppercase tracking-widest text-emerald-300/80 hover:text-white transition-colors"
        >
          Ver dashboard →
        </Link>

        <LeaveQueueButton entryId={q.entryId} />
      </div>
    </>
  );
}
