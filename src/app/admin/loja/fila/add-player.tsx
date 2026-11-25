"use client";

// Cortesia (tecla A): o PPA acha o jogador pelo nome do Discord, pelo nome da Steam ou pelo ID do
// Dota e põe na fila sem pagamento, com as partidas que quiser. Quem já tem cortesia na fila ganha
// as partidas a mais na mesma entrada.

import { useEffect, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { Minus, Plus, Search, UserPlus } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { PlayerHit } from "@/lib/loja/fila/admin-search";
import { cn } from "@/lib/utils";
import { buscarJogadores, darCortesia } from "./cortesia-actions";
import { OpButton, POPUP } from "./ui";
import { useAction } from "./use-console";

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const step = "inline-flex size-9 items-center justify-center rounded-[var(--radius-button)] border border-white/10 text-text-display hover:border-white/25 disabled:opacity-30";
  return (
    <div className="flex items-center gap-2">
      <button type="button" className={step} disabled={value <= 1} onClick={() => onChange(value - 1)} aria-label="Uma partida a menos">
        <Minus size={15} aria-hidden="true" />
      </button>
      <output aria-label="Partidas de cortesia" className="w-9 text-center font-display-condensed text-[1.75rem] leading-none tabular-nums text-gold">
        {value}
      </output>
      <button type="button" className={step} disabled={value >= 20} onClick={() => onChange(value + 1)} aria-label="Uma partida a mais">
        <Plus size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

function Finder({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<{ query: string; list: PlayerHit[] } | null>(null);
  const [chosen, setChosen] = useState<PlayerHit | null>(null);
  const [matches, setMatches] = useState(1);
  const { pending, run } = useAction();
  const q = query.trim();

  // Busca enquanto digita, com uma pausa curta para não consultar a cada letra.
  useEffect(() => {
    if (q.length < 2) return;
    let alive = true;
    const timer = setTimeout(async () => {
      const list = await buscarJogadores(q).catch((): PlayerHit[] => []);
      if (alive) setHits({ query: q, list });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [q]);
  const list = q.length >= 2 && hits?.query === q ? hits.list : [];
  const searching = q.length >= 2 && hits?.query !== q;

  if (chosen) {
    return (
      <div className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <UserAvatar src={chosen.avatarUrl ?? undefined} alt={chosen.name} fallback={chosen.name.slice(0, 2).toUpperCase()} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-text-display">{chosen.name}</p>
            <p className="truncate text-sm text-text-muted">ID do Dota {chosen.dotaId}</p>
          </div>
          <button type="button" className="text-sm text-text-muted underline-offset-2 hover:text-text-display hover:underline" onClick={() => setChosen(null)}>
            trocar
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] text-text-body">Partidas</span>
          <Stepper value={matches} onChange={setMatches} />
        </div>
        <OpButton
          tone="go"
          size="md"
          className="w-full"
          pending={pending}
          onClick={() => run({ action: () => darCortesia(chosen.userId, matches), success: `${chosen.name} está na fila (cortesia).`, onDone: onClose })}
          data-fila-dar-cortesia
        >
          Pôr na fila sem pagamento
        </OpButton>
      </div>
    );
  }

  return (
    <div className="p-2">
      <label className="flex h-10 items-center gap-2 rounded-[var(--radius-button)] border border-white/10 bg-bg-deep px-2.5 focus-within:border-white/25">
        <Search size={15} aria-hidden="true" className="text-text-muted" />
        <input
          autoFocus
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nome do Discord, nome da Steam ou ID do Dota"
          aria-label="Buscar jogador"
          className="min-w-0 flex-1 bg-transparent text-sm text-text-display placeholder:text-text-faded focus:outline-none"
        />
      </label>
      <div className="mt-1 max-h-72 overflow-y-auto">
        {list.map((h) => (
          <button
            key={h.userId}
            type="button"
            onClick={() => setChosen(h)}
            className="flex w-full items-center gap-3 rounded-[4px] px-2 py-2 text-left hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none"
          >
            <UserAvatar src={h.avatarUrl ?? undefined} alt={h.name} fallback={h.name.slice(0, 2).toUpperCase()} size="sm" />
            <span className="min-w-0 flex-1 truncate text-[15px] text-text-display">{h.name}</span>
            <span className="truncate text-sm text-text-muted">{h.steamPersona ? `Steam ${h.steamPersona} · ` : ""}ID {h.dotaId}</span>
          </button>
        ))}
        {q.length >= 2 && (
          <p className={cn("px-2 py-3 text-sm leading-relaxed text-text-muted", list.length > 0 && "hidden")}>
            {searching ? "Buscando…" : "Ninguém com a Steam vinculada com esse nome ou ID."}
          </p>
        )}
      </div>
    </div>
  );
}

export function AddPlayer({ open, setOpen }: { open: boolean; setOpen: (open: boolean) => void }) {
  return (
    <Popover.Root open={open} onOpenChange={(next) => setOpen(next)}>
      <Popover.Trigger render={<OpButton tone="neutral" size="sm" kbd="A" icon={<UserPlus size={15} aria-hidden="true" />} data-fila-por-na-fila />}>
        Pôr na fila
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-[var(--z-system)]">
          <Popover.Popup className={cn(POPUP, "w-[420px] max-w-[calc(100vw-2rem)] p-0")}>{open && <Finder onClose={() => setOpen(false)} />}</Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
