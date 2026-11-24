"use client";

// Mesa de operação da fila da party, feita para o computador do PPA durante a live (1920 e 3440).
// A tela cabe inteira na janela, sem rolar a página: à esquerda a party (o próximo passo em verde
// no topo dela) e o histórico; à direita a fila, que rola por dentro. Na tela de 1440 de altura,
// cresce 1,33x como o resto do site (v2Page). Atalhos: C completa a party,
// T marca a partida, A põe alguém na fila sem pagamento, / busca na fila e Esc cancela a troca.
// Os avisos são do sonner, e não os do site, porque os do site tocam som (vazaria para a live) e
// não têm o "Desfazer"; ficam embaixo e no centro, como os do site, acima do JOGAR DOTA.

import { useRef, useState } from "react";
import { Toaster } from "sonner";
import { ExternalLink } from "lucide-react";
import { panel, v2Page } from "@/components/v2";
import type { AdminQueue } from "@/lib/loja/fila/admin";
import type { HistoryMatch } from "@/lib/loja/fila/admin-history";
import { nextStep } from "@/lib/loja/fila/mesa";
import { cn } from "@/lib/utils";
import { completarParty } from "./actions";
import { LiveSettings } from "./live-settings";
import { PartyHeader } from "./party-header";
import { PartySlots } from "./party-slots";
import { QueueList } from "./queue-list";
import { Records } from "./records";
import { useAction, useArrivals, useAutoRefresh, useNow, useShortcuts } from "./use-console";

function clock(fromIso: string, now: number): string {
  const minutes = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 60_000));
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, "0")}`;
}

function Stat({ label, value, tone = "text-text-display" }: { label: string; value: string | number; tone?: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={cn("font-display-condensed text-[1.875rem] leading-none tabular-nums", tone)}>{value}</span>
      <span className="text-sm text-text-muted">{label}</span>
    </span>
  );
}

function LiveBadge({ data, now }: { data: AdminQueue; now: number }) {
  const live = data.live;
  if (live?.status === "ao_vivo") {
    return (
      <span className="inline-flex h-8 items-center gap-2 rounded-sm border border-brand-primary/50 bg-brand-primary/10 px-2.5 text-sm font-semibold text-brand-primary" suppressHydrationWarning>
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-brand-primary" />
        <span className="uppercase tracking-wide">Ao vivo</span>
        <span className="tabular-nums text-brand-primary/80">{clock(live.onAirAt ?? live.startsAt, now)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex h-8 items-center rounded-sm border border-white/10 px-2.5 text-sm font-medium text-text-muted">
      {live?.status === "fila" ? "Sem live, a fila segue vendendo" : "Sem live"}
    </span>
  );
}

function Header({ data, now }: { data: AdminQueue; now: number }) {
  const live = data.live;
  const open = live ? Math.max(0, live.queueSize - live.occupied) : 0;
  return (
    <header className="flex flex-wrap items-center gap-x-8 gap-y-3">
      <div className="flex items-center gap-4">
        <h1 className="font-display-condensed text-[2.5rem] uppercase leading-none tracking-wide text-text-display">Fila da party</h1>
        <LiveBadge data={data} now={now} />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
        <Stat label={open === 1 ? "vaga à venda" : "vagas à venda"} value={open} tone="text-gold" />
        {live?.status === "ao_vivo" && <Stat label={live.matchesDone === 1 ? "partida na live" : "partidas na live"} value={live.matchesDone} />}
      </div>
      <div className="ml-auto flex items-center gap-1">
        <LiveSettings data={data} />
        <a
          href="/party"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-button)] px-3 text-sm text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-display"
        >
          Página pública <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
    </header>
  );
}

export function AdminQueuePanel({ data, history }: { data: AdminQueue; history: HistoryMatch[] }) {
  const live = data.live;
  const party = data.entries.filter((e) => e.state === "na_party");
  const waiting = data.entries.filter((e) => e.state === "aguardando");
  const [swapId, setSwapId] = useState<string | null>(null);
  const [matchEndOpen, setMatchEndOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fill = useAction();
  const now = useNow(30_000);
  useAutoRefresh(5000);
  useArrivals(data.entries);

  const step = nextStep(data);
  // Quem ia sair da party e já não está nela (outra ação, ou a mesa atualizou) cancela a troca sozinho.
  const swapFor = party.find((e) => e.id === swapId) ?? null;
  const doFill = () => live && fill.run({ action: () => completarParty(live.id), success: "Party completa. Convide cada um pelo ID do Dota." });

  useShortcuts({
    c: step === "completar" ? doFill : null,
    t: live?.status === "ao_vivo" && party.length > 0 ? () => setMatchEndOpen(true) : null,
    a: () => setAddOpen(true),
    "/": () => searchRef.current?.focus(),
    Escape: swapFor ? () => setSwapId(null) : null,
  });

  return (
    <div className={cn(v2Page, "mx-auto flex max-w-[2560px] flex-col gap-5 overflow-x-clip p-4 md:p-6 xl:h-full xl:min-h-0")}>
      <Toaster
        theme="dark"
        position="bottom-center"
        offset={{ bottom: 128 }}
        visibleToasts={4}
        toastOptions={{
          classNames: {
            toast: "!rounded-md !border !border-white/10 !bg-bg-elevated !text-[15px] !text-text-display !shadow-[0_16px_40px_rgba(0,0,0,0.6)]",
            success: "[&_[data-icon]]:!text-play-primary",
            error: "[&_[data-icon]]:!text-error",
            description: "!text-sm !text-text-muted",
            actionButton: "!h-8 !bg-play-primary !px-3 !text-sm !font-semibold !text-bg-deep",
          },
        }}
      />
      <Header data={data} now={now} />
      <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_minmax(540px,640px)] xl:grid-rows-[minmax(0,1fr)]">
        <div className="min-w-0 space-y-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <section className={panel()} aria-label="Party">
            <PartyHeader data={data} fill={fill} onFill={doFill} matchEndOpen={matchEndOpen} setMatchEndOpen={setMatchEndOpen} />
            <PartySlots live={live} party={party} waiting={waiting} swapFor={swapFor?.id ?? null} onSwap={setSwapId} />
          </section>
          <Records history={history} finished={data.finished} />
        </div>
        <QueueList
          live={live}
          waiting={waiting}
          partyCount={party.length}
          swapFor={swapFor}
          onCancelSwap={() => setSwapId(null)}
          now={now}
          searchRef={searchRef}
          addOpen={addOpen}
          setAddOpen={setAddOpen}
          className="xl:h-full"
        />
      </div>
    </div>
  );
}
