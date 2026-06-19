"use client";

// AdminProsMasterDetail — orquestrador do painel ADMIN de PROs (/admin/pros).
//
// Visão de suporte/emergência sobre TODOS os PROs (≠ cockpit do PRO em
// /ranked-com-pro, que é o card do próprio coach):
//   - topo: contexto global + botão Atualizar + faixa "atenção primeiro"
//     (PTs agendadas de todos os PROs, mais antiga primeiro)
//   - esquerda (xl+): lista densa de coaches; telas menores viram chips
//   - centro: detalhe do coach selecionado (fila, PT em curso, histórico)
//
// Sem rolagem de página — listas rolam internamente (padrão pro-master-detail).
// Realtime: reusa useProQueueRealtime com filtro no coach SELECIONADO; o resto
// atualiza via botão Atualizar (refetch admin-gated).

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Radio, RefreshCw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { useProQueueRealtime } from "@/app/pro/use-pro-queue-realtime";
import { fetchAdminProsData } from "./admin-actions";
import type { AdminProsData } from "./admin-pros-types";
import { AdminCoachChip, AdminCoachListRow } from "./admin-coach-list";
import { AdminCoachDetail } from "./admin-coach-detail";
import { AdminPendingStrip } from "./admin-pending-strip";

// uuid válido que não bate com nenhum coach — mantém o hook incondicional
const NIL_UUID = "00000000-0000-0000-0000-000000000000";

export function AdminProsMasterDetail({ initial }: { initial: AdminProsData }) {
  const t = useTranslations("misc2");
  const [data, setData] = useState(initial);
  const [refreshing, startTransition] = useTransition();

  // Relógio compartilhado (tempos de espera/fila aberta) — tick a cada 15s
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);

  // Default: coach da PT pendente mais antiga > primeiro com fila aberta > primeiro
  const defaultId =
    data.pending[0]?.coachId ??
    data.coaches.find((c) => c.filaAberta)?.coachId ??
    data.coaches[0]?.coachId ??
    null;
  const [selectedId, setSelectedId] = useState<string | null>(defaultId);
  const selected =
    data.coaches.find((c) => c.coachId === selectedId) ??
    data.coaches.find((c) => c.coachId === defaultId) ??
    null;

  function refetch() {
    startTransition(async () => {
      const d = await fetchAdminProsData();
      if (d) setData(d);
    });
  }

  useProQueueRealtime(selected?.coachId ?? NIL_UUID, refetch);

  const pendingByCoach = new Set(data.pending.map((p) => p.coachId));
  const totalWaiting = data.coaches.reduce((sum, c) => sum + c.waitingCount, 0);
  const onlineCount = data.coaches.filter((c) => c.filaAberta).length;

  if (data.coaches.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={ShieldAlert}
          title={t("noProsTitle")}
          description={t("noProsDesc")}
          principle="random"
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- TOPO: contexto global + atualizar ---- */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3 xl:px-6">
        <div>
          <h1 className="font-display-condensed text-2xl uppercase leading-none tracking-wider text-text-display">
            {t("prosCentralTitle")}
          </h1>
          <p className="mt-1 font-display text-sm font-semibold text-text-muted">
            {t("supportEmergency")} ·{" "}
            <span className="text-success">
              <Radio size={11} className="mr-0.5 inline" aria-hidden="true" />
              {t("withQueueOpen", { count: onlineCount })}
            </span>
            {" · "}
            <span className="tabular-nums text-gold">{totalWaiting}</span> {t("inQueueWord")}
            {" · "}
            {t("ptsAwaitingDecision", { count: data.pending.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={refetch}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated px-3 py-2 font-display text-sm font-semibold uppercase tracking-wide text-text-body transition-colors hover:border-brand-primary/60 hover:text-text-display disabled:opacity-60"
        >
          <RefreshCw
            size={14}
            className={cn(refreshing && "animate-spin")}
            aria-hidden="true"
          />
          {t("refresh")}
        </button>
      </header>

      {/* ---- SEÇÃO GLOBAL: o que precisa de atenção primeiro ---- */}
      {data.pending.length > 0 && (
        <AdminPendingStrip
          pending={data.pending}
          coaches={data.coaches}
          nowMs={nowMs}
          selectedCoachId={selected?.coachId ?? null}
          onSelectCoach={setSelectedId}
        />
      )}

      {/* ---- Telas < xl: lista vira faixa de chips ---- */}
      <div className="flex shrink-0 gap-2 overflow-x-auto px-4 py-2 xl:hidden">
        {data.coaches.map((coach) => (
          <AdminCoachChip
            key={coach.coachId}
            coach={coach}
            hasPendingPT={pendingByCoach.has(coach.coachId)}
            selected={selected?.coachId === coach.coachId}
            onSelect={() => setSelectedId(coach.coachId)}
          />
        ))}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* ---- ESQUERDA: lista densa de coaches (xl+) ---- */}
        <aside className="hidden min-h-0 w-[300px] shrink-0 flex-col border-r border-border-subtle bg-bg-base/60 xl:flex">
          <ul className="min-h-0 flex-1 overflow-y-auto py-1">
            {data.coaches.map((coach) => (
              <li key={coach.coachId}>
                <AdminCoachListRow
                  coach={coach}
                  hasPendingPT={pendingByCoach.has(coach.coachId)}
                  selected={selected?.coachId === coach.coachId}
                  nowMs={nowMs}
                  onSelect={() => setSelectedId(coach.coachId)}
                />
              </li>
            ))}
          </ul>
        </aside>

        {/* ---- CENTRO: detalhe do coach selecionado ---- */}
        <section className="min-h-0 flex-1">
          {selected ? (
            <AdminCoachDetail
              key={selected.coachId}
              coach={selected}
              queue={data.queues[selected.coachId] ?? []}
              pending={data.pending.filter((p) => p.coachId === selected.coachId)}
              history={data.history[selected.coachId] ?? []}
              nowMs={nowMs}
              onChanged={refetch}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                icon={ShieldAlert}
                title={t("selectProTitle")}
                description={t("selectProDesc")}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
