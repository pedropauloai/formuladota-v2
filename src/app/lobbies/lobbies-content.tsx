"use client";

// LobbiesContent — Client Component com tabela de lobbies + filtros + botão "Criar Sala"
// que abre modal de criação. Estrutura inspirada em painéis de salas personalizadas
// de jogos competitivos: colunas (nome, vagas, modo, região), filtros embaixo (região,
// modo, busca), CTA criar/entrar.

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Search, Users, Lock, Globe2 } from "lucide-react";
import { CreateLobbyModal } from "./create-lobby-modal";

interface LobbyRow {
  id: string;
  name: string;
  game_mode: string;
  status: string;
  max_players: number;
  created_at: string;
  player_count: number;
}

const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Single draft",
};

export function LobbiesContent({ lobbies }: { lobbies: LobbyRow[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [filterMode, setFilterMode] = useState("all");
  const [filterRegion, setFilterRegion] = useState("brasil");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return lobbies.filter((l) => {
      if (filterMode !== "all" && l.game_mode !== filterMode) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [lobbies, filterMode, search]);

  return (
    <>
      <div className="px-6 py-8 xl:px-12 xl:py-10">
        <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-red)]">
              Salas Personalizadas
            </p>
            <h1 className="mt-2 font-display text-3xl uppercase tracking-tight text-white md:text-4xl">
              Lobbies abertos
            </h1>
            <div className="mt-4 brand-divider" />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Atualizar lista"
              onClick={() => window.location.reload()}
              className="flex h-10 items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-3 font-sans text-xs font-semibold uppercase tracking-wide text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <RefreshCw size={14} aria-hidden="true" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex h-10 items-center gap-2 rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-4 font-sans text-xs font-semibold uppercase tracking-wide text-white hover:bg-[var(--color-brand-red)] transition-colors"
            >
              <Plus size={14} aria-hidden="true" />
              Criar sala
            </button>
          </div>
        </header>

        {/* Tabela de lobbies */}
        <div className="overflow-x-auto rounded-md border border-[var(--color-border)] bg-black/50 backdrop-blur-sm">
          <table className="w-full">
            <thead className="border-b border-[var(--color-border)] bg-black/40">
              <tr>
                <Th>Nome da sala</Th>
                <Th align="center">Vagas</Th>
                <Th>Modo</Th>
                <Th>Região</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center">
                    <Users
                      size={20}
                      className="mx-auto mb-2 text-white/30"
                      aria-hidden="true"
                    />
                    <p className="font-mono text-xs text-white/50">
                      Nenhum lobby aberto agora
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreate(true)}
                      className="mt-3 font-sans text-xs uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
                    >
                      Criar o primeiro →
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((lobby) => (
                  <tr
                    key={lobby.id}
                    className="border-b border-[var(--color-border)] last:border-0 hover:bg-white/[0.02] transition-colors"
                  >
                    <Td>
                      <Link
                        href={`/lobbies/${lobby.id}`}
                        className="group flex items-center gap-2"
                      >
                        <Lock
                          size={12}
                          className="text-white/40 group-hover:text-[var(--color-brand-red)] transition-colors"
                          aria-hidden="true"
                        />
                        <span className="font-display text-sm uppercase tracking-wide text-white group-hover:text-[var(--color-brand-red)] transition-colors">
                          {lobby.name}
                        </span>
                      </Link>
                    </Td>
                    <Td align="center">
                      <span className="font-mono text-xs text-white/70">
                        {lobby.player_count}/{lobby.max_players}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-sans text-xs text-white/70">
                        {GAME_MODE_LABELS[lobby.game_mode] ?? lobby.game_mode}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-sans text-xs text-white/70">Brasil</span>
                    </Td>
                    <Td align="right">
                      <StatusPill status={lobby.status} />
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Filtros */}
        <section className="mt-8 rounded-md border border-[var(--color-border)] bg-black/40 backdrop-blur-sm p-5">
          <p className="mb-4 font-sans text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            Filtrar salas
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <FilterField label="Região" icon={Globe2}>
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full appearance-none bg-transparent font-sans text-xs text-white focus:outline-none"
              >
                <option value="brasil" className="bg-black">Brasil</option>
                <option value="south_america" className="bg-black">América do Sul</option>
                <option value="any" className="bg-black">Qualquer</option>
              </select>
            </FilterField>
            <FilterField label="Modo de jogo">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full appearance-none bg-transparent font-sans text-xs text-white focus:outline-none"
              >
                <option value="all" className="bg-black">Todos os modos</option>
                <option value="all_pick" className="bg-black">Escolha livre</option>
                <option value="captains_mode" className="bg-black">Modo capitães</option>
                <option value="random_draft" className="bg-black">Seleção aleatória</option>
              </select>
            </FilterField>
            <FilterField label="Nome da sala" icon={Search}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar salas..."
                className="w-full bg-transparent font-sans text-xs text-white placeholder:text-white/40 focus:outline-none"
              />
            </FilterField>
          </div>
        </section>
      </div>

      {/* Modal Criar Sala */}
      <CreateLobbyModal open={showCreate} onClose={() => setShowCreate(false)} />
    </>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return (
    <th
      className={`px-4 py-3 font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50 ${alignCls}`}
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
  align?: "left" | "center" | "right";
}) {
  const alignCls =
    align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";
  return <td className={`px-4 py-3 ${alignCls}`}>{children}</td>;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open: {
      label: "Abertos",
      cls: "border-[var(--color-success)]/40 text-[var(--color-success)]",
    },
    in_progress: {
      label: "Em andamento",
      cls: "border-[var(--color-warning)]/40 text-[var(--color-warning)]",
    },
  };
  const conf = map[status] ?? {
    label: status,
    cls: "border-[var(--color-border)] text-white/50",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${conf.cls}`}
    >
      {conf.label}
    </span>
  );
}

function FilterField({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: typeof Globe2;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
        {label}
      </span>
      <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2">
        {Icon && <Icon size={12} className="text-white/40 shrink-0" aria-hidden="true" />}
        {children}
      </div>
    </label>
  );
}
