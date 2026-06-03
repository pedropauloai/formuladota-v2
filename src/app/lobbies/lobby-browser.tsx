"use client";

// LobbyBrowser — lista de Salas de Dota no estilo do cliente (ref: lobbys criados.png):
// tabela Nome/Vagas/Modo/Região + painel de filtros + Criar/Entrar no rodapé.
// Seleciona uma linha e "Entrar na sala", ou clica duas vezes pra entrar direto.

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Plus, LogIn, Search } from "lucide-react";
import type { LobbyListItem } from "./fetch-actions";

const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha Livre",
  captains_mode: "Modo Capitães",
  random_draft: "Seleção Aleatória",
  single_draft: "Escolha Única",
};

interface Props {
  lobbies: LobbyListItem[];
}

export function LobbyBrowser({ lobbies }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [modo, setModo] = useState("todos");
  const [nome, setNome] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return lobbies.filter((l) => {
      if (modo !== "todos" && l.game_mode !== modo) return false;
      if (nome.trim() && !l.name.toLowerCase().includes(nome.trim().toLowerCase()))
        return false;
      return true;
    });
  }, [lobbies, modo, nome]);

  function entrar(id: string) {
    router.push(`/lobbies/${id}`);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-base font-bold uppercase tracking-[0.2em] text-text-display">
            Salas de Dota
          </h2>
          <span className="rounded-sm bg-bg-elevated px-2 py-0.5 font-mono text-sm text-text-faded">
            {filtered.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => startTransition(() => router.refresh())}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-elevated px-3 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-text-body hover:border-brand-primary/50 transition-colors disabled:opacity-60"
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : ""} aria-hidden="true" />
          Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-base">
        <table className="w-full text-left">
          <thead className="border-b border-border-subtle bg-bg-elevated">
            <tr>
              <Th>Nome da sala</Th>
              <Th align="center">Vagas</Th>
              <Th>Modo de jogo</Th>
              <Th>Região</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center">
                  <p className="font-display text-sm uppercase tracking-wide text-text-faded">
                    Nenhuma sala aberta
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((l) => {
                const isSel = selected === l.id;
                const full = l.player_count >= l.max_players;
                return (
                  <tr
                    key={l.id}
                    onClick={() => setSelected(l.id)}
                    onDoubleClick={() => entrar(l.id)}
                    className={`cursor-pointer border-b border-white/5 last:border-0 transition-colors ${
                      isSel ? "bg-brand-primary/15" : "hover:bg-bg-elevated/60"
                    }`}
                  >
                    <Td>
                      <span className="font-body text-sm text-text-display">{l.name}</span>
                      {l.status === "in_progress" && (
                        <span className="ml-2 font-display text-sm font-semibold uppercase tracking-wide text-amber-400">
                          em jogo
                        </span>
                      )}
                    </Td>
                    <Td align="center">
                      <span className={`font-mono text-sm ${full ? "text-error" : "text-text-body"}`}>
                        {l.player_count}/{l.max_players}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-body text-sm text-text-muted">
                        {GAME_MODE_LABELS[l.game_mode] ?? l.game_mode}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-body text-sm text-text-muted">Brasil</span>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Filtros */}
      <div className="rounded-md border border-border-subtle bg-bg-elevated/40 p-4">
        <p className="mb-3 font-display text-sm font-semibold uppercase tracking-[0.2em] text-text-faded">
          Filtrar salas
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Região">
            <select
              disabled
              className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-body text-sm text-text-body disabled:opacity-70"
            >
              <option>Brasil</option>
            </select>
          </Field>
          <Field label="Modo de jogo">
            <select
              value={modo}
              onChange={(e) => setModo(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-body text-sm text-text-body"
            >
              <option value="todos">Todos os modos</option>
              {Object.entries(GAME_MODE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome da sala">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faded" aria-hidden="true" />
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Buscar salas"
                className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 pl-8 font-body text-sm text-text-body placeholder:text-text-faded"
              />
            </div>
          </Field>
        </div>
      </div>

      {/* Rodapé — Criar / Entrar */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/criar-lobby")}
          className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-5 py-2.5 font-display text-sm font-bold uppercase tracking-wide text-text-body hover:border-brand-primary/50 transition-colors"
        >
          <Plus size={15} aria-hidden="true" />
          Criar sala
        </button>
        <button
          type="button"
          disabled={!selected}
          onClick={() => selected && entrar(selected)}
          className="inline-flex items-center gap-2 rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-6 py-2.5 font-display text-sm font-bold uppercase tracking-[0.15em] text-text-display transition-all hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100"
        >
          <LogIn size={15} aria-hidden="true" />
          Entrar na sala
        </button>
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return (
    <th
      className={`px-4 py-2.5 font-display text-sm font-semibold uppercase tracking-[0.15em] text-text-faded ${
        align === "center" ? "text-center" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center";
}) {
  return <td className={`px-4 py-2.5 ${align === "center" ? "text-center" : "text-left"}`}>{children}</td>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </span>
      {children}
    </label>
  );
}
