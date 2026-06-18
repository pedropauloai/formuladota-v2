"use client";

// ProCockpit — orquestrador do Cockpit do PRO (aprovado Pedro 2026-06-11).
// UMA tela, sem rolagem de página: centro = A FILA AO VIVO (status + lista
// densa + rodapé do dia), direita = painel de AÇÃO guiado por estado
// (fila fechada → abrir; aberta → montar/iniciar PT; PT em curso → finalizar).
//
// Realtime: coach_queue_entries já está na publication — aluno entra/sai e o
// PRO vê na hora (refetch via Server Action, mesmo padrão da sala de lobby).

import { useEffect, useState, useTransition, type ReactNode } from "react";
import { CockpitStatusBar, QueueClosedHero } from "./cockpit-status-bar";
import { CockpitQueueList } from "./cockpit-queue-list";
import { CockpitActionPanel } from "./cockpit-action-panel";
import { useProQueueRealtime } from "./use-pro-queue-realtime";
import { fetchCockpitData } from "./cockpit-refetch";
import type { CockpitData } from "./cockpit-data";

interface Props {
  initial: CockpitData;
  /** Conteúdo extra do rodapé (revenue do mês, ações de status, links). */
  footerExtras?: ReactNode;
}

export function ProCockpit({ initial, footerExtras }: Props) {
  const [data, setData] = useState(initial);
  const [, startTransition] = useTransition();

  // Relógio compartilhado (tempo de espera/cronômetro) — tick a cada 15s.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const maxPT = Math.min(data.filaMaxVagas, 4);

  // Seleção da próxima PT — default: top da fila (ordem LRU). Quando a fila
  // muda (realtime), poda quem saiu e completa do topo até maxPT.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial.queue.slice(0, maxPT).map((e) => e.entryId))
  );
  useEffect(() => {
    // Reconcilia a seleção local com a fila que muda via realtime: poda quem saiu,
    // completa do topo até maxPT. Sincronizar dado externo→estado local é o caso
    // legítimo de setState-em-effect; o updater é idempotente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected((prev) => {
      const valid = new Set(
        data.queue.filter((e) => prev.has(e.entryId)).map((e) => e.entryId)
      );
      for (const e of data.queue) {
        if (valid.size >= maxPT) break;
        valid.add(e.entryId);
      }
      return valid;
    });
  }, [data.queue, maxPT]);

  function toggleSelect(entryId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) next.delete(entryId);
      else if (next.size < maxPT) next.add(entryId);
      return next;
    });
  }

  function refetch() {
    startTransition(async () => {
      const d = await fetchCockpitData();
      if (d) setData(d);
    });
  }

  useProQueueRealtime(data.coachId, refetch);

  const selectedEntries = data.queue.filter((e) => selected.has(e.entryId));

  return (
    <div className="flex h-full min-h-0 flex-col xl:flex-row xl:overflow-hidden">
      {/* ---- CENTRO: A FILA AO VIVO ---- */}
      <section className="flex min-h-0 flex-1 flex-col">
        {data.filaAberta ? (
          <CockpitStatusBar
            filaAbertaEm={data.filaAbertaEm}
            waitingCount={data.queue.length}
            nowMs={nowMs}
          />
        ) : (
          <QueueClosedHero />
        )}

        {/* Só a lista rola — a página não */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <CockpitQueueList
            queue={data.queue}
            maxPT={maxPT}
            selected={selected}
            onToggleSelect={toggleSelect}
            selectable={data.filaAberta && data.activePT === null}
            nowMs={nowMs}
          />
        </div>

        {/* Rodapé: o caixa do dia sempre visível */}
        <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-border-subtle bg-bg-base px-4 py-2.5">
          <p className="font-display text-sm font-semibold uppercase tracking-wide text-text-muted">
            Hoje:{" "}
            <span className="tabular-nums text-text-display">{data.hoje.pts} PTs</span>
            {" · "}
            <span className="tabular-nums text-text-display">
              {data.hoje.alunos} alunos
            </span>
            {" · "}
            <span className="tabular-nums text-gold">
              R${" "}
              {data.hoje.ganhoBrl.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </span>
          </p>
          {footerExtras}
        </footer>
      </section>

      {/* ---- DIREITA: AÇÃO (guiada por estado) ---- */}
      <aside className="shrink-0 border-t border-border-subtle xl:w-[320px] xl:border-l xl:border-t-0">
        <CockpitActionPanel
          filaAberta={data.filaAberta}
          activePT={data.activePT}
          selectedEntries={selectedEntries}
          maxPT={maxPT}
          nowMs={nowMs}
          onPTStarted={refetch}
        />
      </aside>
    </div>
  );
}
