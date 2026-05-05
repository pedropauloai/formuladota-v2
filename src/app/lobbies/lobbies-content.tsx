"use client";

// LobbiesContent — painel lateral direito (~520px) que espelha o cliente Dota 2:
// header → tabela compacta → filtros → CRIAR SALA / ENTRAR NA SALA (amarelo).
// Renderizado dentro de <ClientShell rightSidebar={...} wideRightSidebar />.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
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

interface LobbiesContentProps {
  lobbies: LobbyRow[];
  /** Callback ao selecionar/entrar numa sala. Se omitido, usa router.push. */
  onSelectLobby?: (id: string) => void;
  /** Callback ao clicar "Criar sala". Se omitido, abre CreateLobbyModal interno. */
  onCreate?: () => void;
}

export function LobbiesContent({ lobbies, onSelectLobby, onCreate }: LobbiesContentProps) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState("all");
  const [filterRegion, setFilterRegion] = useState("brasil");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return lobbies.filter((l) => {
      if (filterMode !== "all" && l.game_mode !== filterMode) return false;
      if (search && !l.name.toLowerCase().includes(search.toLowerCase()))
        return false;
      return true;
    });
  }, [lobbies, filterMode, search]);

  const handleEnter = () => {
    if (!selected) return;
    if (onSelectLobby) onSelectLobby(selected);
    else router.push(`/lobbies/${selected}`);
  };

  const handleCreate = () => {
    if (onCreate) onCreate();
    else setShowCreate(true);
  };

  const handleRowClick = (id: string) => {
    setSelected(id);
  };

  const handleRowDoubleClick = (id: string) => {
    if (onSelectLobby) onSelectLobby(id);
    else router.push(`/lobbies/${id}`);
  };

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-black/60 px-4 py-3">
          <h1 className="font-display text-sm uppercase tracking-[0.25em] text-white">
            Salas Personalizadas
          </h1>
          <button
            type="button"
            aria-label="Atualizar lista"
            onClick={() => router.refresh()}
            className="inline-flex items-center gap-1.5 font-sans text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors"
          >
            <RefreshCw size={11} aria-hidden="true" />
            Atualizar
          </button>
        </header>

        {/* Tabela */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <table className="w-full text-left">
            <thead className="border-b border-[var(--color-border)] bg-black/40 sticky top-0">
              <tr>
                <Th>Nome da sala</Th>
                <Th align="center">Vagas</Th>
                <Th>Modo</Th>
                <Th>Região</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-10 text-center">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                      Nenhuma sala aberta
                    </p>
                    <button
                      type="button"
                      onClick={handleCreate}
                      className="mt-2 font-sans text-[10px] uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
                    >
                      Criar a primeira →
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((lobby) => {
                  const isSel = selected === lobby.id;
                  return (
                    <tr
                      key={lobby.id}
                      onClick={() => handleRowClick(lobby.id)}
                      onDoubleClick={() => handleRowDoubleClick(lobby.id)}
                      className={`cursor-pointer border-b border-white/5 transition-colors ${
                        isSel
                          ? "bg-[var(--color-brand-red)]/15"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <Td>
                        <span className="font-sans text-xs text-white truncate block max-w-[160px]">
                          {lobby.name}
                        </span>
                      </Td>
                      <Td align="center">
                        <span className="font-mono text-[11px] text-white/70">
                          {lobby.player_count}/{lobby.max_players}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-sans text-[11px] text-white/70 truncate block max-w-[90px]">
                          {GAME_MODE_LABELS[lobby.game_mode] ?? lobby.game_mode}
                        </span>
                      </Td>
                      <Td>
                        <span className="font-sans text-[11px] text-white/70">
                          Brasil
                        </span>
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Filtros */}
        <section className="border-t border-[var(--color-border)] bg-black/40 px-4 py-3">
          <p className="mb-2 font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
            Filtrar salas
          </p>
          <div className="grid grid-cols-2 gap-2">
            <FilterField label="Região">
              <select
                value={filterRegion}
                onChange={(e) => setFilterRegion(e.target.value)}
                className="w-full appearance-none bg-transparent font-sans text-[11px] text-white focus:outline-none"
              >
                <option value="brasil" className="bg-black">
                  Brasil
                </option>
                <option value="south_america" className="bg-black">
                  América do Sul
                </option>
                <option value="any" className="bg-black">
                  Qualquer
                </option>
              </select>
            </FilterField>
            <FilterField label="Modo de jogo">
              <select
                value={filterMode}
                onChange={(e) => setFilterMode(e.target.value)}
                className="w-full appearance-none bg-transparent font-sans text-[11px] text-white focus:outline-none"
              >
                <option value="all" className="bg-black">
                  Todos
                </option>
                <option value="all_pick" className="bg-black">
                  Escolha livre
                </option>
                <option value="captains_mode" className="bg-black">
                  Modo capitães
                </option>
                <option value="random_draft" className="bg-black">
                  Seleção aleatória
                </option>
              </select>
            </FilterField>
          </div>
          <div className="mt-2">
            <FilterField label="Nome da sala">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-transparent font-sans text-[11px] text-white placeholder:text-white/30 focus:outline-none"
              />
            </FilterField>
          </div>
        </section>

        {/* Ações finais — Criar + Entrar */}
        <div className="border-t border-[var(--color-border)] bg-black/60 p-3 space-y-2">
          <button
            type="button"
            onClick={handleCreate}
            className="w-full inline-flex items-center justify-center rounded-sm border border-white/10 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80 hover:bg-white/5 hover:text-white transition-colors"
          >
            Criar sala
          </button>
          <button
            type="button"
            onClick={handleEnter}
            disabled={!selected}
            className="w-full inline-flex h-12 items-center justify-center overflow-hidden rounded-sm border border-amber-400/60 bg-gradient-to-b from-amber-400 to-amber-600 px-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-black shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-amber-500 hover:shadow-amber-400/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-amber-400 disabled:hover:to-amber-600"
          >
            Entrar na sala
          </button>
        </div>
      </div>

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
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return (
    <th
      className={`px-3 py-2 font-sans text-[9px] font-semibold uppercase tracking-[0.2em] text-white/40 ${alignCls}`}
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
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : "text-left";
  return <td className={`px-3 py-2 ${alignCls}`}>{children}</td>;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block mb-1 font-mono text-[9px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      <div className="rounded-sm border border-[var(--color-border)] bg-black/40 px-2 py-1.5">
        {children}
      </div>
    </label>
  );
}
