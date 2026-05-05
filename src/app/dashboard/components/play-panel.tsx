"use client";

// PlayPanel — overlay direito que aparece ao clicar "Jogar" no bottom-bar.
// Estrutura inspirada em painéis de matchmaking de jogos competitivos:
// - Lista vertical de modos no topo (Competitiva, Salas Personalizadas, etc.)
// - Sub-painel com form do modo selecionado embaixo
// - Botão verde grande "BUSCAR PARTIDA" no rodapé do painel
//
// Click fora ou ESC fecha.
// Esse arquivo só renderiza UI — Server Action de matchmaking entra na Fase B.

import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  LayoutGrid,
  Bot,
  Swords,
  Coffee,
  GraduationCap,
  Crosshair,
  Heart,
  Shield,
  Sword,
  Cross,
  ChevronDown,
} from "lucide-react";

interface PlayPanelProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "copa" | "salas" | "bots" | "competitiva" | "casual" | "novatos";

const MODES: { id: Mode; label: string; icon: typeof Trophy; v2?: boolean }[] = [
  { id: "copa", label: "Copa de Batalhas", icon: Trophy, v2: true },
  { id: "salas", label: "Salas Personalizadas", icon: LayoutGrid },
  { id: "bots", label: "Jogar Contra Bots", icon: Bot, v2: true },
  { id: "competitiva", label: "Competitiva", icon: Swords },
  { id: "casual", label: "Casual", icon: Coffee, v2: true },
  { id: "novatos", label: "Modo para Novatos", icon: GraduationCap, v2: true },
];

export function PlayPanel({ open, onClose }: PlayPanelProps) {
  const [mode, setMode] = useState<Mode>("competitiva");

  // ESC fecha o painel
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop click-out */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar painel"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Panel direito (320 mobile / 380 lg / 420 xl) */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md flex flex-col border-l-2 border-[var(--color-border)] bg-gradient-to-b from-[#0c0c0c] to-black shadow-2xl xl:max-w-lg"
        role="dialog"
        aria-label="Painel de jogo"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
          <h2 className="font-display text-base uppercase tracking-[0.2em] text-white">
            Modos de jogo
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Mode list */}
        <nav className="border-b border-[var(--color-border)]">
          {MODES.map((m) => (
            <ModeButton
              key={m.id}
              mode={m}
              active={mode === m.id}
              onClick={() => setMode(m.id)}
            />
          ))}
        </nav>

        {/* Mode detail (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {mode === "competitiva" && <CompetitivaForm />}
          {mode === "salas" && <SalasForm />}
          {mode !== "competitiva" && mode !== "salas" && <ComingSoon mode={mode} />}
        </div>

        {/* Footer com botão verde — só mostra em competitiva */}
        {mode === "competitiva" && (
          <div className="border-t border-[var(--color-border)] p-4">
            <button
              type="button"
              disabled
              aria-label="Buscar partida (matchmaking V2 — Fase B)"
              className="group relative flex w-full h-12 items-center justify-center gap-2 overflow-hidden rounded-md border-2 border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-6 font-display text-base font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[var(--color-play-green)]/30 transition-all hover:scale-[1.01] hover:shadow-[var(--color-play-green)]/50 disabled:cursor-not-allowed disabled:opacity-90"
            >
              <Crosshair size={16} aria-hidden="true" />
              <span>Buscar partida</span>
            </button>
            <p className="mt-2 text-center font-mono text-[10px] uppercase tracking-widest text-white/40">
              Matchmaking funcional · Fase B
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}

// ============== Mode list button ==============

function ModeButton({
  mode,
  active,
  onClick,
}: {
  mode: { id: Mode; label: string; icon: typeof Trophy; v2?: boolean };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 px-5 py-2.5 text-left font-sans text-xs font-semibold uppercase tracking-[0.15em] transition-colors ${
        active
          ? "bg-[var(--color-brand-red)]/15 text-white border-l-2 border-[var(--color-brand-red)]"
          : "text-white/55 hover:bg-white/5 hover:text-white border-l-2 border-transparent"
      }`}
    >
      <mode.icon size={14} aria-hidden="true" />
      <span className="flex-1">{mode.label}</span>
      {mode.v2 && (
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/30">
          V2
        </span>
      )}
    </button>
  );
}

// ============== Form Competitiva ==============

interface RoleDef {
  id: string;
  label: string;
  icon: typeof Sword;
  color: string;
}

const ROLES: RoleDef[] = [
  { id: "support_dedicated", label: "Suporte dedicado", icon: Cross, color: "text-blue-400" },
  { id: "support", label: "Suporte", icon: Heart, color: "text-cyan-400" },
  { id: "offlane", label: "Trilha lateral", icon: Shield, color: "text-emerald-400" },
  { id: "midlane", label: "Trilha do meio", icon: Crosshair, color: "text-amber-400" },
  { id: "safelane", label: "Trilha segura", icon: Sword, color: "text-rose-400" },
];

function CompetitivaForm() {
  const [searchType, setSearchType] = useState<"role" | "classic">("role");
  const [roles, setRoles] = useState<Record<string, boolean>>({
    support_dedicated: true,
    support: false,
    offlane: false,
    midlane: false,
    safelane: false,
  });
  const [pickMode, setPickMode] = useState<string>("ranked_all_pick");

  return (
    <div className="space-y-5">
      {/* Search type tabs */}
      <div className="grid grid-cols-2 rounded-md border border-[var(--color-border)] overflow-hidden">
        <SearchTab
          label="Busca por funções"
          active={searchType === "role"}
          onClick={() => setSearchType("role")}
        />
        <SearchTab
          label="Clássico"
          active={searchType === "classic"}
          onClick={() => setSearchType("classic")}
        />
      </div>

      {/* Tier badge atual placeholder */}
      <div className="rounded-md border border-[var(--color-brand-red)]/30 bg-gradient-to-r from-[var(--color-brand-red)]/10 to-transparent px-4 py-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
            Sua medalha
          </p>
          <p className="font-display text-sm uppercase tracking-wide text-white">
            Não classificado
          </p>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-brand-red)]">
          Calibrar →
        </span>
      </div>

      {/* Roles checkboxes — só visível em "busca por funções" */}
      {searchType === "role" && (
        <div className="space-y-2">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
            Busca com função
          </p>
          <p className="font-sans text-[11px] text-white/50">
            Selecione 1 ou mais funções pra encontrar partidas mais rápido.
          </p>
          <div className="space-y-1.5 mt-2">
            {ROLES.map((r) => (
              <RoleCheckbox
                key={r.id}
                role={r}
                checked={roles[r.id] ?? false}
                onChange={(v) => setRoles({ ...roles, [r.id]: v })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modo de jogo */}
      <div className="space-y-2">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Modo de jogo
        </p>
        <SelectField
          value={pickMode}
          onChange={setPickMode}
          options={[
            { value: "ranked_all_pick", label: "Escolha livre competitivo" },
            { value: "random_draft", label: "Seleção aleatória" },
            { value: "captains_mode", label: "Modo capitães" },
          ]}
        />
      </div>

      {/* Toggles extras */}
      <div className="space-y-2 border-t border-[var(--color-border)] pt-4">
        <ToggleRow label="Casual" disabled />
        <ToggleRow label="Modo para novatos" disabled />
      </div>
    </div>
  );
}

function SearchTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-2 font-sans text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
        active
          ? "bg-[var(--color-brand-red)]/15 text-white"
          : "text-white/50 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

function RoleCheckbox({
  role,
  checked,
  onChange,
}: {
  role: RoleDef;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
        checked
          ? "border-[var(--color-brand-red)]/50 bg-[var(--color-brand-red)]/8"
          : "border-[var(--color-border)] bg-black/30 hover:bg-white/5"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 accent-[var(--color-brand-red)]"
      />
      <role.icon size={14} className={role.color} aria-hidden="true" />
      <span className="font-sans text-xs text-white/85">{role.label}</span>
    </label>
  );
}

function SelectField({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 pr-8 font-sans text-xs text-white focus:border-[var(--color-brand-red)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-black">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/40"
        aria-hidden="true"
      />
    </div>
  );
}

function ToggleRow({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 cursor-pointer hover:bg-white/5">
      <span className="font-sans text-xs text-white/70">{label}</span>
      <input
        type="checkbox"
        disabled={disabled}
        className="size-4 accent-[var(--color-brand-red)]"
      />
    </label>
  );
}

// ============== Form Salas Personalizadas ==============

function SalasForm() {
  return (
    <div className="space-y-5">
      <p className="font-sans text-xs text-white/60 leading-relaxed">
        Crie um lobby in-house com bot Steam ou navegue por lobbies abertos da comunidade.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <ActionTile
          label="Criar"
          subLabel="Novo lobby"
          icon={LayoutGrid}
          href="/criar-lobby"
        />
        <ActionTile
          label="Navegar"
          subLabel="Lobbies abertos"
          icon={Swords}
          href="/lobbies"
        />
      </div>

      <div className="rounded-md border border-[var(--color-border)] bg-black/30 p-4 space-y-2">
        <p className="font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Como funciona
        </p>
        <ul className="font-sans text-[11px] text-white/55 leading-relaxed space-y-1">
          <li>· Você cria a sala e o bot Steam abre o lobby Dota 2</li>
          <li>· Senha gerada automaticamente — compartilhe com 9 jogadores</li>
          <li>· Match ID capturado ao fim da partida</li>
        </ul>
      </div>
    </div>
  );
}

function ActionTile({
  label,
  subLabel,
  icon: Icon,
  href,
}: {
  label: string;
  subLabel: string;
  icon: typeof Swords;
  href: string;
}) {
  return (
    <a
      href={href}
      className="group rounded-md border border-[var(--color-border)] bg-black/40 p-4 transition-colors hover:border-[var(--color-brand-red)]/60 hover:bg-[var(--color-brand-red)]/5"
    >
      <Icon size={20} className="text-[var(--color-brand-red)] mb-2" aria-hidden="true" />
      <p className="font-display text-sm uppercase tracking-wide text-white">{label}</p>
      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
        {subLabel}
      </p>
    </a>
  );
}

// ============== Coming Soon (placeholder pra modos V2) ==============

function ComingSoon({ mode }: { mode: Mode }) {
  const labels: Record<Mode, string> = {
    copa: "Copa de Batalhas",
    bots: "Jogar Contra Bots",
    casual: "Casual",
    novatos: "Modo para Novatos",
    competitiva: "",
    salas: "",
  };
  return (
    <div className="flex h-full flex-col items-center justify-center text-center py-12 space-y-3">
      <p className="font-display text-lg uppercase tracking-wide text-white">
        {labels[mode]}
      </p>
      <p className="font-mono text-[11px] uppercase tracking-widest text-white/40">
        Em desenvolvimento — V2
      </p>
      <p className="font-sans text-xs text-white/50 max-w-xs">
        Esse modo entra em uma fase futura. Por enquanto use Competitiva ou Salas Personalizadas.
      </p>
    </div>
  );
}
