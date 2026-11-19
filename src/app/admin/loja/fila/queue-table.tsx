"use client";

// A fila como tabela densa: uma pessoa por linha, colunas fixas, busca e filtro por origem.
// Clicar na linha abre o detalhe ao lado; as ações raras (chamar fora da ordem, tirar) ficam lá.

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import { cn } from "@/lib/utils";
import { CopyId, MatchesStepper, OriginBadge, originOf, since, type RowAction } from "./rows";

type Filter = "todos" | "pedido" | "battlepass" | "cortesia";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "pedido", label: "Pagou" },
  { key: "battlepass", label: "Battlepass" },
  { key: "cortesia", label: "Cortesia" },
];

function matches(entry: AdminQueueEntry, query: string, filter: Filter): boolean {
  if (filter !== "todos" && originOf(entry) !== filter) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [entry.name, entry.steamPersona ?? "", entry.dotaFriendId ?? ""].some((v) => v.toLowerCase().includes(q));
}

function Row({ entry, selected, busy, act, onSelect }: { entry: AdminQueueEntry; selected: boolean; busy: boolean; act: RowAction; onSelect: (id: string) => void }) {
  return (
    <tr
      onClick={() => onSelect(entry.id)}
      className={cn("cursor-pointer border-b border-border-subtle hover:bg-bg-deep/70", selected && "bg-gold/10 hover:bg-gold/10")}
      data-fila-linha={entry.id}
    >
      <td className="w-10 py-2 pl-2 text-right font-display text-xl tabular-nums text-text-muted">{entry.position}</td>
      <td className="py-2 pl-3">
        <span className="flex min-w-0 items-center gap-3">
          <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={entry.name.slice(0, 2).toUpperCase()} size="md" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-text-display">{entry.name}</span>
            <span className="block truncate text-xs text-text-muted">
              {entry.steamPersona && entry.steamPersona !== entry.name ? `Steam ${entry.steamPersona}` : " "}
              {entry.noShows > 0 && <span className="text-warning"> · não apareceu {entry.noShows}x</span>}
            </span>
          </span>
        </span>
      </td>
      <td className="py-2"><OriginBadge entry={entry} /></td>
      <td className="py-2"><MatchesStepper entry={entry} busy={busy} act={act} /></td>
      <td className="py-2 text-xs text-text-muted">{entry.lastTurnAt ? since(entry.lastTurnAt) : <span className="text-play-primary">nunca jogou</span>}</td>
      <td className="py-2 text-xs text-text-muted">{since(entry.queuedAt)}</td>
      <td className="py-2 pr-2 text-right">{entry.dotaFriendId && <CopyId id={entry.dotaFriendId} />}</td>
    </tr>
  );
}

export function QueueTable({ entries, selectedId, busy, act, onSelect }: {
  entries: AdminQueueEntry[];
  selectedId: string | null;
  busy: boolean;
  act: RowAction;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const shown = useMemo(() => entries.filter((e) => matches(e, query, filter)), [entries, query, filter]);
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Fila · {entries.length}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-sm border border-border-strong" role="group" aria-label="Filtrar por origem">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={cn("px-3 py-1.5 text-xs", filter === f.key ? "bg-bg-deep text-text-display" : "text-text-muted hover:text-text-display")}
              >
                {f.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-sm border border-border-strong bg-bg-deep px-2">
            <Search size={14} aria-hidden="true" className="text-text-muted" />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nome ou ID do Dota" className="w-44 bg-transparent py-1.5 text-sm text-text-display outline-none" />
          </label>
        </div>
      </header>
      <p className="text-xs text-text-muted">Ordem do revezamento: quem nunca jogou vai na frente; depois, quem jogou na party há mais tempo. Clique numa pessoa para ver os detalhes.</p>
      {shown.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-muted">{entries.length === 0 ? "Ninguém esperando." : "Ninguém com esse filtro."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-border-strong text-[0.7rem] uppercase tracking-wide text-text-faded">
                <th className="py-2 pl-2 text-right font-medium">#</th>
                <th className="py-2 pl-3 font-medium">Jogador</th>
                <th className="py-2 font-medium">Origem</th>
                <th className="py-2 font-medium">Partidas</th>
                <th className="py-2 font-medium">Última vez na party</th>
                <th className="py-2 font-medium">Na fila</th>
                <th className="py-2 pr-2 text-right font-medium">ID do Dota</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => <Row key={e.id} entry={e} selected={e.id === selectedId} busy={busy} act={act} onSelect={onSelect} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
