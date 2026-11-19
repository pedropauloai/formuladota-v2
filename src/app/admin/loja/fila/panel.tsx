"use client";

// Mesa de operação da fila da party, feita para o computador (1920 e 3440): a party no topo em
// cartões, a fila em tabela, o detalhe de quem você clicar ao lado e a live na coluna da direita.
// Atualiza sozinha a cada 5 s. Atalhos: C chama o próximo, T marca a partida que terminou, Esc
// fecha o detalhe (nenhum atalho vale com o cursor num campo de texto).

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import { cn } from "@/lib/utils";
import { chamarProximo } from "./actions";
import { AddToQueue } from "./add-to-queue";
import { EntryDetail } from "./entry-detail";
import { LiveControls } from "./live-controls";
import { PartyBoard } from "./party-board";
import { QueueTable } from "./queue-table";
import { FinishedList, Kbd, type RowAction } from "./rows";

const REFRESH_MS = 5000;

function typing(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
}

function StatusStrip({ data, notice }: { data: AdminQueue; notice: { ok: boolean; text: string } | null }) {
  const live = data.live;
  const onAir = live?.status === "ao_vivo";
  const party = data.entries.filter((e) => e.state === "na_party").length;
  const waiting = data.entries.length - party;
  const open = live ? Math.max(0, live.queueSize - live.occupied) : 0;
  const stat = (label: string, value: string | number, tone = "text-text-display") => (
    <span className="flex items-baseline gap-1.5">
      <span className={cn("font-display text-2xl tabular-nums", tone)}>{value}</span>
      <span className="text-xs uppercase tracking-wide text-text-muted">{label}</span>
    </span>
  );
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-border-strong bg-bg-base px-4 py-3">
      <h1 className="font-display text-2xl uppercase tracking-wide text-text-display">Fila da party</h1>
      <span className={cn("rounded-sm border px-2 py-0.5 text-xs font-semibold uppercase", onAir ? "border-brand-primary text-brand-primary" : "border-border-strong text-text-muted")}>
        {onAir ? "Ao vivo" : live?.status === "fila" ? "Fila aberta, sem live" : "Sem live"}
      </span>
      {stat("na party", `${party}/${live?.seatsPerMatch ?? 4}`, "text-play-primary")}
      {stat("na fila", waiting)}
      {stat("vagas à venda", open, "text-gold")}
      {onAir && live && stat("partidas", live.matchesDone)}
      <span className="ml-auto flex items-center gap-3 text-xs text-text-muted">
        <span><Kbd>C</Kbd> chamar · <Kbd>T</Kbd> partida terminou · <Kbd>Esc</Kbd> fechar</span>
        <a href="/party" target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">ver a página pública</a>
      </span>
      {notice && (
        <p role="status" className={cn("w-full rounded-sm border px-3 py-1.5 text-sm", notice.ok ? "border-play-primary/40 text-play-primary" : "border-error/40 text-error")}>{notice.text}</p>
      )}
    </header>
  );
}

/** Tela muito larga (3440): o detalhe ganha coluna própria; abaixo disso, vai para o topo da coluna da live. */
function useWide(): boolean {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 2200px)");
    const update = () => setWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

function useShortcuts(data: AdminQueue, busy: boolean, act: RowAction, close: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const live = data.live;
      if (e.key === "Escape") close();
      if (busy || !live || live.status !== "ao_vivo") return;
      if (e.key === "c" || e.key === "C") act("Chamado", () => chamarProximo(live.id));
      if (e.key === "t" || e.key === "T") document.querySelector<HTMLButtonElement>("[data-fila-partida-terminou]")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, busy, act, close]);
}

export function AdminQueuePanel({ data }: { data: AdminQueue }) {
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [router]);

  const act: RowAction = (label, action) =>
    startTransition(async () => {
      const result = await action();
      setNotice(result.ok ? { ok: true, text: result.message ?? label } : { ok: false, text: result.error ?? "Não deu certo." });
      router.refresh();
    });
  useShortcuts(data, busy, act, () => setSelectedId(null));
  const wide = useWide();

  const live = data.live;
  const onAir = live?.status === "ao_vivo";
  const waiting = data.entries.filter((e) => e.state === "aguardando");
  // Quem saiu da fila enquanto estava aberto no detalhe some sozinho na próxima atualização.
  const selected = data.entries.find((e) => e.id === selectedId) ?? null;
  const toggle = (id: string) => setSelectedId((cur) => (cur === id ? null : id));
  const detail = selected && (
    <EntryDetail entry={selected} liveId={live?.id ?? null} onAir={onAir} busy={busy} act={act} onClose={() => setSelectedId(null)} />
  );

  return (
    <div className="mx-auto max-w-[2600px] space-y-4 p-4 md:p-6">
      <StatusStrip data={data} notice={notice} />
      <div className="grid items-start gap-4 xl:max-[2199px]:grid-cols-[minmax(0,1fr)_400px] min-[2200px]:grid-cols-[minmax(0,1fr)_400px_400px]">
        <div className="min-w-0 space-y-4">
          <PartyBoard data={data} busy={busy} act={act} onSelect={toggle} />
          <QueueTable entries={waiting} selectedId={selectedId} busy={busy} act={act} onSelect={toggle} />
        </div>
        {wide && (
          <div className="sticky top-4 space-y-4">
            {detail ?? <p className="rounded-md border border-dashed border-border-strong p-6 text-center text-sm text-text-muted">Clique em alguém da party ou da fila para ver os detalhes.</p>}
          </div>
        )}
        <div className="space-y-4 xl:sticky xl:top-4">
          {!wide && detail}
          <LiveControls key={live?.id ?? "sem-live"} data={data} busy={busy} act={act} />
          <AddToQueue busy={busy} act={act} />
          <section className="space-y-2 rounded-md border border-border-strong bg-bg-base p-4">
            <h2 className="font-display text-lg uppercase tracking-wide text-text-display">Jogaram nas últimas 12 horas</h2>
            <FinishedList items={data.finished} />
          </section>
        </div>
      </div>
    </div>
  );
}
