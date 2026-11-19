"use client";

// Cortesia: o Pedro acha o jogador (nome do Discord, nome da Steam ou ID do Dota) e põe na fila sem
// pagamento, com as partidas que quiser. Quem já tem cortesia na fila ganha as partidas a mais.

import { useEffect, useState } from "react";
import { Gift, Search } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { PlayerHit } from "@/lib/loja/fila/admin-search";
import { buscarJogadores, darCortesia } from "./cortesia-actions";
import { PRIMARY, type RowAction } from "./rows";

const FIELD = "rounded-sm border border-border-strong bg-bg-deep px-3 py-2 text-sm text-text-display";

export function AddToQueue({ busy, act }: { busy: boolean; act: RowAction }) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PlayerHit[]>([]);
  const [chosen, setChosen] = useState<PlayerHit | null>(null);
  const [matches, setMatches] = useState(1);

  // Busca enquanto digita, com uma pausa curta para não consultar a cada letra.
  const searching = !chosen && query.trim().length >= 2;
  useEffect(() => {
    if (!searching) return;
    let live = true;
    const timer = setTimeout(async () => {
      const found = await buscarJogadores(query);
      if (live) setHits(found);
    }, 300);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, searching]);
  const shown = searching ? hits : [];

  const give = () => {
    if (!chosen) return;
    act(`${chosen.name} na fila`, async () => {
      const result = await darCortesia(chosen.userId, matches);
      if (result.ok) {
        setChosen(null);
        setQuery("");
        setMatches(1);
      }
      return result;
    });
  };

  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4 md:p-5">
      <header className="space-y-1">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Pôr na fila sem pagamento</h2>
        <p className="text-xs text-text-muted">Cortesia: entra no fim da fila com as partidas que você escolher e não ocupa vaga à venda. Precisa da Steam vinculada.</p>
      </header>
      {chosen ? (
        <div className="flex flex-wrap items-center gap-3">
          <UserAvatar src={chosen.avatarUrl ?? undefined} alt={chosen.name} fallback={chosen.name.slice(0, 2).toUpperCase()} size="md" />
          <span className="min-w-0 flex-1 text-sm text-text-display">
            {chosen.name} <span className="text-text-muted">· ID do Dota {chosen.dotaId}</span>
          </span>
          <label className="flex items-center gap-2 text-sm text-text-body">
            Partidas de cortesia
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={20}
              value={matches}
              onChange={(e) => setMatches(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className={`${FIELD} w-20 text-right tabular-nums`}
            />
          </label>
          <button type="button" disabled={busy} className={PRIMARY} onClick={give}>
            <Gift size={14} aria-hidden="true" className="mr-1 inline" /> Pôr na fila
          </button>
          <button type="button" className="text-sm text-text-muted underline-offset-2 hover:underline" onClick={() => setChosen(null)}>
            trocar
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <Search size={16} aria-hidden="true" className="text-text-muted" />
            <input
              type="search"
              placeholder="Nome do Discord, nome da Steam ou ID do Dota"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={`${FIELD} w-full`}
            />
          </label>
          {shown.length > 0 && (
            <ul className="divide-y divide-border-subtle rounded-sm border border-border-subtle">
              {shown.map((h) => (
                <li key={h.userId}>
                  <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-bg-deep" onClick={() => setChosen(h)}>
                    <UserAvatar src={h.avatarUrl ?? undefined} alt={h.name} fallback={h.name.slice(0, 2).toUpperCase()} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-display">{h.name}</span>
                    <span className="text-xs text-text-muted">{h.steamPersona ? `Steam ${h.steamPersona} · ` : ""}ID {h.dotaId}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && shown.length === 0 && <p className="text-xs text-text-muted">Ninguém com Steam vinculada encontrado ainda.</p>}
        </div>
      )}
    </section>
  );
}
