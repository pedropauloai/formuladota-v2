"use client";

// PlayPanel — overlay direito ativado pelo botão verde JOGAR. State machine:
// - modes: 6 modos (Copa/Salas/Bots/Competitiva/Casual/Novatos)
// - salas-menu: Salas Personalizadas selecionado, mostra CRIAR + NAVEGAR
// - lobbies-list: lista de salas (substitui /lobbies)
// - lobby-room: sala individual (substitui /lobbies/[id])
// - criar-sala: form criar sala (substitui /criar-lobby)
//
// initialState permite deep-link via query string (?play=lobbies-list ou ?play=lobby&id=...).
// Click fora ou ESC fecha. Botão voltar restaura estado anterior.

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowLeft,
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
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchOpenLobbies,
  fetchLobbyRoom,
  type LobbyListItem,
  type LobbyRoomData,
} from "@/app/lobbies/fetch-actions";
import { LobbiesContent } from "@/app/lobbies/lobbies-content";
import { LobbyRoom } from "@/app/lobbies/[id]/lobby-room";
import { createLobby } from "@/app/criar-lobby/actions";

type View =
  | "modes"
  | "salas-menu"
  | "lobbies-list"
  | "criar-sala"
  | { type: "lobby-room"; lobbyId: string };

interface PlayPanelProps {
  open: boolean;
  onClose: () => void;
  initialState?: View;
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

export function PlayPanel({ open, onClose, initialState }: PlayPanelProps) {
  const [view, setView] = useState<View>(initialState ?? "modes");
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

  const isObjView = typeof view === "object";
  const viewType = isObjView ? view.type : view;
  const showModeNav = view === "modes";
  const showBack =
    view !== "modes" &&
    (viewType === "lobbies-list" ||
      viewType === "criar-sala" ||
      viewType === "lobby-room" ||
      view === "salas-menu");

  const handleBack = () => {
    if (viewType === "lobby-room") setView("lobbies-list");
    else if (view === "lobbies-list" || view === "criar-sala") setView("salas-menu");
    else if (view === "salas-menu") setView("modes");
    else setView("modes");
  };

  const handleSelectMode = (m: Mode) => {
    setMode(m);
    if (m === "salas") setView("salas-menu");
  };

  return (
    <div className="fixed inset-0 z-40">
      {/* Backdrop click-out */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar painel"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Panel direito */}
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md flex flex-col border-l-2 border-[var(--color-border)] bg-gradient-to-b from-[#0c0c0c] to-black shadow-2xl xl:max-w-[520px] 2xl:max-w-[560px]"
        role="dialog"
        aria-label="Painel de jogo"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3 shrink-0">
          <div className="flex items-center gap-2">
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Voltar"
                className="flex size-7 items-center justify-center rounded text-white/60 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ArrowLeft size={14} aria-hidden="true" />
              </button>
            )}
            <h2 className="font-display text-base uppercase tracking-[0.2em] text-white">
              {viewTitle(view)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-white/60 hover:bg-white/5 hover:text-white transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Mode list — só visível em "modes" */}
        {showModeNav && (
          <nav className="border-b border-[var(--color-border)] shrink-0">
            {MODES.map((m) => (
              <ModeButton
                key={m.id}
                mode={m}
                active={mode === m.id}
                onClick={() => handleSelectMode(m.id)}
              />
            ))}
          </nav>
        )}

        {/* Content body */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {showModeNav && mode === "competitiva" && (
            <>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <CompetitivaForm />
              </div>
              <div className="border-t border-[var(--color-border)] p-4 shrink-0">
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
            </>
          )}
          {showModeNav && mode !== "competitiva" && mode !== "salas" && (
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <ComingSoon mode={mode} />
            </div>
          )}
          {view === "salas-menu" && (
            <SalasMenuView
              onCreate={() => setView("criar-sala")}
              onNavigate={() => setView("lobbies-list")}
            />
          )}
          {view === "lobbies-list" && (
            <LobbiesListView
              onSelectLobby={(id) => setView({ type: "lobby-room", lobbyId: id })}
              onCreate={() => setView("criar-sala")}
            />
          )}
          {view === "criar-sala" && (
            <CriarSalaView
              onCreated={(id) => setView({ type: "lobby-room", lobbyId: id })}
              onCancel={() => setView("salas-menu")}
            />
          )}
          {viewType === "lobby-room" && isObjView && (
            <LobbyRoomView
              lobbyId={view.lobbyId}
              onBack={() => setView("lobbies-list")}
            />
          )}
        </div>
      </aside>
    </div>
  );
}

function viewTitle(view: View): string {
  if (typeof view === "object") return "Sala";
  switch (view) {
    case "modes":
      return "Modos de jogo";
    case "salas-menu":
      return "Salas Personalizadas";
    case "lobbies-list":
      return "Salas Personalizadas";
    case "criar-sala":
      return "Criar sala";
  }
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

// ============== Salas Menu (Criar + Navegar) ==============

function SalasMenuView({
  onCreate,
  onNavigate,
}: {
  onCreate: () => void;
  onNavigate: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
      <p className="font-sans text-xs text-white/60 leading-relaxed">
        Crie um lobby in-house ou navegue por salas abertas da comunidade.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onCreate}
          className="group rounded-md border border-[var(--color-border)] bg-black/40 p-4 text-left transition-colors hover:border-[var(--color-brand-red)]/60 hover:bg-[var(--color-brand-red)]/5"
        >
          <Plus size={20} className="text-[var(--color-brand-red)] mb-2" aria-hidden="true" />
          <p className="font-display text-sm uppercase tracking-wide text-white">Criar</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
            Nova sala
          </p>
        </button>
        <button
          type="button"
          onClick={onNavigate}
          className="group rounded-md border border-[var(--color-border)] bg-black/40 p-4 text-left transition-colors hover:border-[var(--color-brand-red)]/60 hover:bg-[var(--color-brand-red)]/5"
        >
          <Swords size={20} className="text-[var(--color-brand-red)] mb-2" aria-hidden="true" />
          <p className="font-display text-sm uppercase tracking-wide text-white">Navegar</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-white/40 mt-0.5">
            Salas abertas
          </p>
        </button>
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

// ============== Lobbies List View (fetch + renderiza LobbiesContent) ==============

function LobbiesListView({
  onSelectLobby,
  onCreate,
}: {
  onSelectLobby: (id: string) => void;
  onCreate: () => void;
}) {
  const [lobbies, setLobbies] = useState<LobbyListItem[] | null>(null);

  useEffect(() => {
    fetchOpenLobbies().then(setLobbies);
  }, []);

  if (lobbies === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <LobbiesContent
      lobbies={lobbies}
      onSelectLobby={onSelectLobby}
      onCreate={onCreate}
    />
  );
}

// ============== Lobby Room View (fetch + renderiza LobbyRoom) ==============

function LobbyRoomView({
  lobbyId,
  onBack,
}: {
  lobbyId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<LobbyRoomData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLobbyRoom(lobbyId).then((d) => {
      if (!d) setError("Sala não encontrada.");
      else setData(d);
    });
  }, [lobbyId]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="font-display text-sm uppercase tracking-wide text-white/70">{error}</p>
        <button
          type="button"
          onClick={onBack}
          className="font-sans text-xs uppercase tracking-widest text-[var(--color-brand-red)] hover:text-white transition-colors"
        >
          ← Voltar pra lista
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <LobbyRoom
      lobby={data.lobby}
      players={data.players}
      currentUserId={data.currentUserId}
      isLeader={data.isLeader}
      leaderUsername={data.leaderUsername}
      onBack={onBack}
    />
  );
}

// ============== Criar Sala View ==============

function CriarSalaView({
  onCreated,
  onCancel,
}: {
  onCreated: (lobbyId: string) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [gameMode, setGameMode] = useState<
    "all_pick" | "captains_mode" | "random_draft" | "single_draft"
  >("all_pick");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("name", name);
    fd.set("gameMode", gameMode);
    startTransition(async () => {
      const r = await createLobby(fd);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success(`Sala criada — senha: ${r.password}`);
      router.refresh();
      onCreated(r.lobbyId);
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col overflow-y-auto px-5 py-5 space-y-4"
    >
      <div className="space-y-2">
        <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Nome da sala
          <input
            type="text"
            required
            minLength={3}
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Coro do Pedro"
            className="mt-1 w-full rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 font-sans text-sm text-white placeholder:text-white/30 focus:border-[var(--color-brand-red)] focus:outline-none"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label className="block font-sans text-xs font-semibold uppercase tracking-[0.15em] text-white/70">
          Modo de jogo
          <SelectField
            value={gameMode}
            onChange={(v) =>
              setGameMode(
                v as "all_pick" | "captains_mode" | "random_draft" | "single_draft"
              )
            }
            options={[
              { value: "all_pick", label: "Escolha livre" },
              { value: "captains_mode", label: "Modo capitães" },
              { value: "random_draft", label: "Seleção aleatória" },
              { value: "single_draft", label: "Single draft" },
            ]}
          />
        </label>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        Senha gerada automaticamente · 8 chars hex
      </p>

      <div className="mt-auto flex gap-2 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="flex-1 inline-flex items-center justify-center rounded-sm border border-white/10 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:bg-white/5 hover:text-white transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending || name.length < 3}
          className="flex-1 inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-amber-400/60 bg-gradient-to-b from-amber-400 to-amber-600 px-4 font-display text-sm font-bold uppercase tracking-[0.25em] text-black hover:from-amber-300 hover:to-amber-500 transition-all disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
          {isPending ? "Criando..." : "Criar sala"}
        </button>
      </div>
    </form>
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
