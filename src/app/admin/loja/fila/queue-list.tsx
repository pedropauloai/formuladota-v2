"use client";

// A fila na mesa, em grupos pela vez de cada um (entram agora, na próxima partida, depois), com
// busca (tecla /), filtro por origem e o "Pôr na fila" sem pagamento (tecla A). Numa troca, o topo
// diz quem sai e cada linha oferece "Entrar no lugar".

import { useMemo, useState, type RefObject } from "react";
import { Search } from "lucide-react";
import { panel } from "@/components/v2";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import { turnGroup } from "@/lib/loja/fila/mesa";
import type { QueueLive } from "@/lib/loja/fila/model";
import { cn } from "@/lib/utils";
import { AddPlayer } from "./add-player";
import { QueueRow, type RowContext } from "./queue-row";
import { Kbd, OpButton, SectionTitle, originOf, type Origin } from "./ui";

type Filter = "todos" | Origin;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pedido", label: "Pagou" },
  { key: "battlepass", label: "Battlepass" },
  { key: "cortesia", label: "Cortesia" },
];

/** Títulos dos grupos pela vez (turnGroup): agora, na próxima partida, depois. */
const GROUPS = {
  onAir: ["Entram agora", "Entram na próxima partida", "Depois"],
  offAir: ["Entram na primeira partida da live", "Na segunda partida", "Depois"],
} as const;

function visible(entry: AdminQueueEntry, query: string, filter: Filter): boolean {
  if (filter !== "todos" && originOf(entry) !== filter) return false;
  const q = query.trim().toLowerCase();
  return !q || [entry.name, entry.steamPersona ?? "", entry.dotaFriendId ?? ""].some((v) => v.toLowerCase().includes(q));
}

function Group({ title, entries, ctx, expandedId, onToggle }: { title: string; entries: AdminQueueEntry[]; ctx: RowContext; expandedId: string | null; onToggle: (id: string) => void }) {
  if (entries.length === 0) return null;
  return (
    <div>
      <p className="sticky top-0 z-[var(--z-elevated)] border-b border-white/[0.05] bg-bg-base/95 px-4 py-2 text-sm text-text-muted backdrop-blur-sm">
        {title} <span className="tabular-nums text-text-faded">· {entries.length}</span>
      </p>
      <ol>
        {entries.map((e) => (
          <QueueRow key={e.id} entry={e} ctx={ctx} expanded={expandedId === e.id} onToggle={() => onToggle(e.id)} />
        ))}
      </ol>
    </div>
  );
}

function Toolbar({ query, setQuery, filter, setFilter, searchRef }: { query: string; setQuery: (q: string) => void; filter: Filter; setFilter: (f: Filter) => void; searchRef: RefObject<HTMLInputElement | null> }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex h-9 min-w-52 flex-1 items-center gap-2 rounded-[var(--radius-button)] border border-white/10 bg-bg-deep px-2.5 focus-within:border-white/25">
        <Search size={15} aria-hidden="true" className="text-text-muted" />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Escape") return;
            setQuery("");
            e.currentTarget.blur();
          }}
          placeholder="Buscar por nome ou ID do Dota"
          aria-label="Buscar na fila"
          className="min-w-0 flex-1 bg-transparent text-sm text-text-display placeholder:text-text-faded focus:outline-none"
        />
        <Kbd className="text-text-muted">/</Kbd>
      </label>
      <div className="flex rounded-[var(--radius-button)] border border-white/10 p-0.5" role="group" aria-label="Filtrar por origem">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn("h-8 rounded-[4px] px-2.5 text-sm transition-colors", filter === f.key ? "bg-white/[0.1] text-text-display" : "text-text-muted hover:text-text-display")}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

interface QueueListProps {
  live: QueueLive | null;
  waiting: AdminQueueEntry[];
  partyCount: number;
  swapFor: AdminQueueEntry | null;
  onCancelSwap: () => void;
  now: number;
  searchRef: RefObject<HTMLInputElement | null>;
  addOpen: boolean;
  setAddOpen: (open: boolean) => void;
  className?: string;
}

export function QueueList({ live, waiting, partyCount, swapFor, onCancelSwap, now, searchRef, addOpen, setAddOpen, className }: QueueListProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const onAir = live?.status === "ao_vivo";
  const ctx: RowContext = { liveId: live?.id ?? null, canPut: !!live && partyCount < live.seatsPerMatch, swapFor, onSwapDone: onCancelSwap, now };
  const shown = useMemo(() => waiting.filter((e) => visible(e, query, filter)), [waiting, query, filter]);
  const titles = onAir ? GROUPS.onAir : GROUPS.offAir;
  const toggle = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <section className={cn(panel(), "flex min-h-0 flex-col", className)} aria-label="Fila" data-fila-lista>
      <header className="space-y-3 border-b border-white/[0.06] p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>
            Fila <span className="tabular-nums text-gold">{waiting.length}</span>
          </SectionTitle>
          <AddPlayer open={addOpen} setOpen={setAddOpen} />
        </div>
        <Toolbar query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} searchRef={searchRef} />
      </header>
      {swapFor && (
        <div className="flex items-center justify-between gap-3 border-b border-gold/30 bg-gold/[0.08] px-4 py-2.5 text-[15px] text-gold" role="status">
          <span className="min-w-0 truncate">
            Quem entra no lugar de <b className="font-semibold">{swapFor.name}</b>?
          </span>
          <OpButton tone="quiet" size="sm" kbd="Esc" onClick={onCancelSwap} className="text-gold hover:text-gold-bright">
            Cancelar
          </OpButton>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {waiting.length === 0 ? (
          <p className="px-4 py-12 text-center text-[15px] text-text-muted">Ninguém esperando.</p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-12 text-center text-[15px] text-text-muted">Ninguém com essa busca ou filtro.</p>
        ) : (
          ([0, 1, 2] as const).map((g) => (
            <Group key={g} title={titles[g]} entries={shown.filter((e) => turnGroup(e) === g)} ctx={ctx} expandedId={expandedId} onToggle={toggle} />
          ))
        )}
      </div>
    </section>
  );
}
