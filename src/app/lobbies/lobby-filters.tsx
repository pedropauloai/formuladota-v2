"use client";

// LobbyFilters — seção "FILTRAR SALAS" do browser (ref: lobbys criados.png):
// região + modo de jogo + busca por nome, compacto. Controlado pelo pai.

import { Search } from "lucide-react";

interface LobbyFiltersProps {
  region: string;
  onRegionChange: (v: string) => void;
  mode: string;
  onModeChange: (v: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  modeLabels: Record<string, string>;
}

export function LobbyFilters({
  region,
  onRegionChange,
  mode,
  onModeChange,
  search,
  onSearchChange,
  modeLabels,
}: LobbyFiltersProps) {
  return (
    <section className="border-t border-border-subtle bg-bg-base px-3 py-2.5">
      <p className="mb-1.5 font-display-condensed text-lg uppercase tracking-wide text-text-muted">
        Filtrar salas
      </p>
      <div className="grid grid-cols-2 gap-2">
        <FilterField label="Região">
          <select
            value={region}
            onChange={(e) => onRegionChange(e.target.value)}
            className="w-full appearance-none bg-transparent font-body text-sm 2xl:text-base text-text-body focus:outline-none"
          >
            <option value="brasil" className="bg-bg-deep">
              Brasil
            </option>
            <option value="south_america" className="bg-bg-deep">
              América do Sul
            </option>
            <option value="any" className="bg-bg-deep">
              Qualquer
            </option>
          </select>
        </FilterField>
        <FilterField label="Modo de jogo">
          <select
            value={mode}
            onChange={(e) => onModeChange(e.target.value)}
            className="w-full appearance-none bg-transparent font-body text-sm 2xl:text-base text-text-body focus:outline-none"
          >
            <option value="all" className="bg-bg-deep">
              Todos os modos
            </option>
            {Object.entries(modeLabels).map(([k, v]) => (
              <option key={k} value={k} className="bg-bg-deep">
                {v}
              </option>
            ))}
          </select>
        </FilterField>
      </div>
      <div className="mt-2">
        <FilterField label="Nome da sala">
          <div className="flex items-center gap-1.5">
            <Search size={12} className="shrink-0 text-text-faded" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar salas"
              className="w-full bg-transparent font-body text-sm 2xl:text-base text-text-body placeholder:text-text-faded focus:outline-none"
            />
          </div>
        </FilterField>
      </div>
    </section>
  );
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
      <span className="mb-1 block font-display text-sm font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </span>
      <div className="rounded-sm border border-border-strong bg-bg-elevated px-2 py-1.5">
        {children}
      </div>
    </label>
  );
}
