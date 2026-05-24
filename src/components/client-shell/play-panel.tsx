"use client";

// PlayPanel — overlay direito ativado pelo botão verde JOGAR.
// Estados internos:
// - modes: 6 modos sempre visíveis. Selecionando "Salas Personalizadas" expande
//   um sub-menu inline (CRIAR + NAVEGAR) abaixo do botão (estilo accordion).
// - lobbies-list: lista de salas (substitui /lobbies)
// - lobby-room: sala individual (substitui /lobbies/[id])
//
// CRIAR abre um modal centralizado (CreateLobbyModal). Backdrop transparente
// (sem dimming) — captura click-out mas mantém o background visível.

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
  RefreshCw,
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
import {
  enterQueue,
  leaveQueue,
  getQueueStatus,
  type QueueRole,
  type QueueGameMode,
} from "@/app/queue/actions";

type View =
  | "modes"
  | "lobbies-list"
  | { type: "lobby-room"; lobbyId: string };

interface PlayPanelProps {
  open: boolean;
  onClose: () => void;
  initialState?: View | "salas-menu" | "criar-sala";
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
  // Normaliza estados legados (salas-menu/criar-sala) pra novo modelo
  const normalizedInitial: View =
    initialState === undefined ||
    initialState === "salas-menu" ||
    initialState === "criar-sala"
      ? "modes"
      : initialState;

  const [view, setView] = useState<View>(normalizedInitial);
  const [mode, setMode] = useState<Mode>(
    initialState === "salas-menu" || initialState === "criar-sala"
      ? "salas"
      : "competitiva"
  );
  const [showCreateModal, setShowCreateModal] = useState(
    initialState === "criar-sala"
  );

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
    (viewType === "lobbies-list" || viewType === "lobby-room");

  const handleBack = () => {
    if (viewType === "lobby-room") setView("lobbies-list");
    else if (view === "lobbies-list") setView("modes");
    else setView("modes");
  };

  return (
    <>
      <div className="fixed inset-0 z-[var(--z-modal)]">
        {/* Backdrop transparente — captura click-out mas mantém background visível */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar painel"
          className="absolute inset-0 bg-transparent"
        />

        {/* Panel direito — largura aumentada pra ultra-wide */}
        <aside
          className="absolute right-0 top-0 h-full w-full max-w-[560px] flex flex-col border-l-2 border-border-strong bg-gradient-to-b from-bg-deep/95 to-bg-deep/95 backdrop-blur-md shadow-2xl xl:max-w-[640px] 2xl:max-w-[720px]"
          role="dialog"
          aria-label="Painel de jogo"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3 2xl:py-4 shrink-0">
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Voltar"
                  className="flex size-7 items-center justify-center rounded text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
                >
                  <ArrowLeft size={14} aria-hidden="true" />
                </button>
              )}
              <h2 className="font-display text-base 2xl:text-lg uppercase tracking-[0.2em] text-text-display">
                {viewTitle(view)}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Mode list — só visível em "modes". Salas expande inline abaixo */}
          {showModeNav && (
            <nav className="border-b border-border-subtle shrink-0">
              {MODES.map((m) => (
                <div key={m.id}>
                  <ModeButton
                    mode={m}
                    active={mode === m.id}
                    onClick={() => setMode(m.id)}
                  />
                  {/* Sub-menu inline pra "Salas Personalizadas" */}
                  {m.id === "salas" && mode === "salas" && (
                    <div className="border-t border-border-subtle bg-bg-deep/40 px-5 py-3 2xl:py-4 grid grid-cols-2 gap-2">
                      <SubAction
                        label="Criar"
                        icon={Plus}
                        onClick={() => setShowCreateModal(true)}
                      />
                      <SubAction
                        label="Navegar"
                        icon={Swords}
                        onClick={() => setView("lobbies-list")}
                      />
                    </div>
                  )}
                </div>
              ))}
            </nav>
          )}

          {/* Content body */}
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
            {showModeNav && mode === "competitiva" && (
              <CompetitivaForm
                onMatched={(lobbyId) =>
                  setView({ type: "lobby-room", lobbyId })
                }
              />
            )}
            {showModeNav && mode === "salas" && (
              <div className="flex-1 overflow-y-auto px-5 py-5 2xl:px-7 2xl:py-7">
                <SalasInfo />
              </div>
            )}
            {showModeNav &&
              mode !== "competitiva" &&
              mode !== "salas" && (
                <div className="flex-1 overflow-y-auto px-5 py-5 2xl:px-7 2xl:py-7">
                  <ComingSoon mode={mode} />
                </div>
              )}
            {view === "lobbies-list" && (
              <LobbiesListView
                onSelectLobby={(id) =>
                  setView({ type: "lobby-room", lobbyId: id })
                }
                onCreate={() => setShowCreateModal(true)}
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

        {/* Modal Criar Sala — popup centralizado */}
        {showCreateModal && (
          <CreateLobbyDialog
            onClose={() => setShowCreateModal(false)}
            onCreated={(id) => {
              setShowCreateModal(false);
              setView({ type: "lobby-room", lobbyId: id });
            }}
          />
        )}
      </div>

      {/* Chat overlay no centro — só visível quando em lobby-room */}
      {viewType === "lobby-room" && isObjView && (
        <LobbyChatOverlay lobbyId={view.lobbyId} />
      )}
    </>
  );
}

function viewTitle(view: View): string {
  if (typeof view === "object") return "Sala";
  switch (view) {
    case "modes":
      return "Modos de jogo";
    case "lobbies-list":
      return "Salas Personalizadas";
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
      className={`flex w-full items-center gap-3 px-5 py-2.5 2xl:py-3 text-left font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] transition-colors ${
        active
          ? "bg-brand-primary/15 text-text-display border-l-2 border-brand-primary"
          : "text-text-muted hover:bg-bg-elevated hover:text-text-display border-l-2 border-transparent"
      }`}
    >
      <mode.icon size={14} aria-hidden="true" />
      <span className="flex-1">{mode.label}</span>
      {mode.v2 && (
        <span className="font-mono text-[9px] 2xl:text-[10px] uppercase tracking-widest text-text-faded">
          V2
        </span>
      )}
    </button>
  );
}

// ============== Sub-action (Criar / Navegar) ==============

function SubAction({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: typeof Plus;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-sm border border-border-subtle bg-bg-deep/40 px-3 py-2.5 2xl:py-3 font-sans text-[11px] 2xl:text-xs font-semibold uppercase tracking-[0.2em] text-text-body hover:bg-brand-primary/15 hover:border-brand-primary/60 hover:text-text-display transition-colors"
    >
      <Icon size={13} aria-hidden="true" />
      {label}
    </button>
  );
}

// ============== Salas Info (mostrado ao selecionar modo Salas no nav) ==============

function SalasInfo() {
  return (
    <div className="space-y-4">
      <p className="font-sans text-xs 2xl:text-sm text-text-muted leading-relaxed">
        Escolha <span className="text-text-display">CRIAR</span> pra abrir uma sala
        in-house ou <span className="text-text-display">NAVEGAR</span> pra entrar em
        salas abertas da comunidade.
      </p>
      <div className="rounded-md border border-border-subtle bg-bg-deep/30 p-4 2xl:p-5 space-y-2">
        <p className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] text-text-body">
          Como funciona
        </p>
        <ul className="font-sans text-[11px] 2xl:text-xs text-text-muted leading-relaxed space-y-1">
          <li>· Você cria a sala e o bot Steam abre o lobby Dota 2</li>
          <li>· Senha gerada automaticamente — compartilhe com 9 jogadores</li>
          <li>· Match ID capturado ao fim da partida</li>
        </ul>
      </div>
    </div>
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

function CompetitivaForm({
  onMatched,
}: {
  onMatched: (lobbyId: string) => void;
}) {
  const [searchType, setSearchType] = useState<"role" | "classic">("role");
  const [roles, setRoles] = useState<Record<string, boolean>>({
    support_dedicated: true,
    support: false,
    offlane: false,
    midlane: false,
    safelane: false,
  });
  const [pickMode, setPickMode] = useState<QueueGameMode>("all_pick");
  const [isPending, startTransition] = useTransition();
  const [inQueue, setInQueue] = useState(false);
  const [waitingSeconds, setWaitingSeconds] = useState(0);

  // Carrega status atual no mount + polling enquanto na fila
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const status = await getQueueStatus();
      if (cancelled) return;
      if (status.status === "matched" && status.matchedLobbyId) {
        setInQueue(false);
        toast.success("Partida encontrada!");
        onMatched(status.matchedLobbyId);
        return;
      }
      if (status.status === "waiting") {
        setInQueue(true);
        setWaitingSeconds(status.waitingSeconds);
      } else {
        setInQueue(false);
        setWaitingSeconds(0);
      }
    };
    void poll();
    const interval = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [onMatched]);

  // Tick local do timer (cada segundo) enquanto na fila
  useEffect(() => {
    if (!inQueue) return;
    const tick = setInterval(() => {
      setWaitingSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, [inQueue]);

  const handleSearch = () => {
    const selectedRoles = (Object.keys(roles) as QueueRole[]).filter(
      (r) => roles[r]
    );
    if (selectedRoles.length === 0) {
      toast.error("Selecione pelo menos 1 função.");
      return;
    }
    startTransition(async () => {
      const r = await enterQueue({
        roles: selectedRoles,
        gameMode: pickMode,
        region: "brasil",
      });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setInQueue(true);
      setWaitingSeconds(0);
      toast.success("Procurando partida...");
    });
  };

  const handleCancel = () => {
    startTransition(async () => {
      const r = await leaveQueue();
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      setInQueue(false);
      setWaitingSeconds(0);
    });
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 py-5 2xl:px-7 2xl:py-7 space-y-5 2xl:space-y-6">
        <div className="grid grid-cols-2 rounded-md border border-border-subtle overflow-hidden">
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

        <div className="rounded-md border border-brand-primary/30 bg-gradient-to-r from-brand-primary/10 to-transparent px-4 py-3 2xl:px-5 2xl:py-4 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-text-muted">
              Sua medalha
            </p>
            <p className="font-display text-sm 2xl:text-base uppercase tracking-wide text-text-display">
              Não classificado
            </p>
          </div>
          <span className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-brand-primary">
            Calibrar →
          </span>
        </div>

        {searchType === "role" && (
          <div className="space-y-2">
            <p className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] text-text-body">
              Busca com função
            </p>
            <p className="font-sans text-[11px] 2xl:text-xs text-text-muted">
              Selecione 1 ou mais funções pra encontrar partidas mais rápido.
            </p>
            <div className="space-y-1.5 mt-2">
              {ROLES.map((r) => (
                <RoleCheckbox
                  key={r.id}
                  role={r}
                  checked={roles[r.id] ?? false}
                  onChange={(v) => setRoles({ ...roles, [r.id]: v })}
                  disabled={inQueue}
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] text-text-body">
            Modo de jogo
          </p>
          <SelectField
            value={pickMode}
            onChange={(v) => setPickMode(v as QueueGameMode)}
            options={[
              { value: "all_pick", label: "Escolha livre competitivo" },
              { value: "random_draft", label: "Seleção aleatória" },
              { value: "captains_mode", label: "Modo capitães" },
            ]}
          />
        </div>

        <div className="space-y-2 border-t border-border-subtle pt-4">
          <ToggleRow label="Casual" disabled />
          <ToggleRow label="Modo para novatos" disabled />
        </div>
      </div>

      {/* Footer — botão verde Buscar/Cancelar */}
      <div className="border-t border-border-subtle p-4 2xl:p-5 shrink-0">
        {inQueue ? (
          <>
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="group relative flex w-full h-12 2xl:h-14 items-center justify-center gap-2 overflow-hidden rounded-md border-2 border-error bg-gradient-to-b from-error/40 to-error/20 px-6 font-display text-base 2xl:text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg transition-all hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <X size={16} aria-hidden="true" />
              )}
              <span>Cancelar busca</span>
            </button>
            <p className="mt-2 text-center font-mono text-xs 2xl:text-sm uppercase tracking-widest text-warning">
              Procurando partida · {formatTime(waitingSeconds)}
            </p>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleSearch}
              disabled={isPending}
              className="group relative flex w-full h-12 2xl:h-14 items-center justify-center gap-2 overflow-hidden rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-6 font-display text-base 2xl:text-lg font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.01] hover:shadow-[var(--color-play-primary-glow)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
              ) : (
                <Crosshair size={16} aria-hidden="true" />
              )}
              <span>{isPending ? "Entrando..." : "Buscar partida"}</span>
            </button>
            <p className="mt-2 text-center font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-text-faded">
              Matchmaking via fila · Fase B
            </p>
          </>
        )}
      </div>
    </>
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
      className={`px-3 py-2 2xl:py-2.5 font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.1em] transition-colors ${
        active
          ? "bg-brand-primary/15 text-text-display"
          : "text-text-muted hover:bg-bg-elevated hover:text-text-display"
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
  disabled,
}: {
  role: RoleDef;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-3 rounded-md border px-3 py-2 2xl:py-2.5 transition-colors ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      } ${
        checked
          ? "border-brand-primary/50 bg-brand-primary/[0.08]"
          : "border-border-subtle bg-bg-deep/30 hover:bg-bg-elevated"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="size-4 accent-brand-primary"
      />
      <role.icon size={14} className={role.color} aria-hidden="true" />
      <span className="font-sans text-xs 2xl:text-sm text-text-body">
        {role.label}
      </span>
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
        className="w-full appearance-none rounded-md border border-border-subtle bg-bg-deep/40 px-3 py-2 2xl:py-2.5 pr-8 font-sans text-xs 2xl:text-sm text-text-display focus:border-brand-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-bg-deep">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-faded"
        aria-hidden="true"
      />
    </div>
  );
}

function ToggleRow({ label, disabled }: { label: string; disabled?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 2xl:py-2 cursor-pointer hover:bg-bg-elevated">
      <span className="font-sans text-xs 2xl:text-sm text-text-body">{label}</span>
      <input
        type="checkbox"
        disabled={disabled}
        className="size-4 accent-brand-primary"
      />
    </label>
  );
}

// ============== Lobbies List View ==============

function LobbiesListView({
  onSelectLobby,
  onCreate,
}: {
  onSelectLobby: (id: string) => void;
  onCreate: () => void;
}) {
  const [lobbies, setLobbies] = useState<LobbyListItem[] | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchOpenLobbies().then(setLobbies);
  }, [refreshKey]);

  if (lobbies === null) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-faded" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <button
        type="button"
        aria-label="Atualizar lista"
        onClick={() => setRefreshKey((k) => k + 1)}
        title="Atualizar"
        className="absolute right-3 top-3 z-[var(--z-elevated)] inline-flex items-center justify-center size-8 rounded-md text-text-muted hover:text-text-display hover:bg-bg-elevated transition-colors"
      >
        <RefreshCw size={13} aria-hidden="true" />
      </button>
      <LobbiesContent
        lobbies={lobbies}
        onSelectLobby={onSelectLobby}
        onCreate={onCreate}
      />
    </div>
  );
}

// ============== Lobby Room View ==============

function LobbyRoomView({
  lobbyId,
  onBack,
}: {
  lobbyId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<LobbyRoomData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    fetchLobbyRoom(lobbyId).then((d) => {
      if (!d) setError("Sala não encontrada.");
      else setData(d);
    });
  }, [lobbyId, refreshKey]);

  const handleMutate = () => setRefreshKey((k) => k + 1);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-3">
        <p className="font-display text-sm 2xl:text-base uppercase tracking-wide text-text-body">
          {error}
        </p>
        <button
          type="button"
          onClick={onBack}
          className="font-sans text-xs uppercase tracking-widest text-brand-primary hover:text-text-display transition-colors"
        >
          ← Voltar pra lista
        </button>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-text-faded" />
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
      onMutate={handleMutate}
    />
  );
}

// ============== Criar Sala Dialog (modal centralizado) ==============

function CreateLobbyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (lobbyId: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [gameMode, setGameMode] = useState<
    "all_pick" | "captains_mode" | "random_draft" | "single_draft"
  >("all_pick");

  // ESC fecha
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

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
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center px-4">
      {/* Backdrop com dimming */}
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />
      {/* Dialog */}
      <div
        role="dialog"
        aria-label="Criar sala"
        className="relative w-full max-w-lg 2xl:max-w-2xl rounded-md border border-border-subtle bg-gradient-to-b from-bg-deep to-bg-deep shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-border-subtle px-5 py-3 2xl:py-4">
          <h2 className="font-display text-base 2xl:text-lg uppercase tracking-[0.25em] text-text-display">
            Configurações da sala
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-display transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>

        <form
          onSubmit={handleSubmit}
          className="px-5 py-5 2xl:px-7 2xl:py-7 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] text-text-body mb-1.5">
                Nome da sala
              </label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={60}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Coro do Pedro"
                className="w-full rounded-md border border-border-subtle bg-bg-deep/40 px-3 py-2 2xl:py-2.5 font-sans text-sm 2xl:text-base text-text-display placeholder:text-text-faded focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.15em] text-text-body mb-1.5">
                Modo
              </label>
              <SelectField
                value={gameMode}
                onChange={(v) =>
                  setGameMode(
                    v as
                      | "all_pick"
                      | "captains_mode"
                      | "random_draft"
                      | "single_draft"
                  )
                }
                options={[
                  { value: "all_pick", label: "Escolha livre" },
                  { value: "captains_mode", label: "Modo capitães" },
                  { value: "random_draft", label: "Seleção aleatória" },
                  { value: "single_draft", label: "Single draft" },
                ]}
              />
            </div>
          </div>

          <div className="rounded-md border border-border-subtle bg-bg-deep/30 px-4 py-3 2xl:px-5 2xl:py-4">
            <p className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-text-muted">
              Senha
            </p>
            <p className="mt-1 font-sans text-xs 2xl:text-sm text-text-body">
              Gerada automaticamente · 8 caracteres hexadecimais
            </p>
          </div>

          <div className="rounded-md border border-border-subtle bg-bg-deep/30 px-4 py-3 2xl:px-5 2xl:py-4 space-y-1">
            <p className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-text-muted">
              Padrões V1
            </p>
            <ul className="font-sans text-xs 2xl:text-sm text-text-muted leading-relaxed">
              <li>· Servidor: Brasil</li>
              <li>· Visibilidade: Pública</li>
              <li>· Trapaças: Não</li>
              <li>· Espectadores: Permitido</li>
              <li>· 10 jogadores (5 vs 5)</li>
            </ul>
          </div>

          <footer className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="inline-flex items-center justify-center rounded-sm border border-border-subtle bg-bg-deep/40 px-5 py-2.5 2xl:py-3 font-sans text-[11px] 2xl:text-xs font-semibold uppercase tracking-[0.2em] text-text-body hover:bg-bg-elevated hover:text-text-display transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || name.length < 3}
              className="inline-flex h-11 2xl:h-12 items-center justify-center gap-2 rounded-sm border border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-6 font-display text-sm 2xl:text-base font-bold uppercase tracking-[0.25em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] hover:brightness-110 hover:shadow-[var(--color-play-primary-glow)] transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {isPending ? "Criando..." : "Criar sala"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

// ============== Lobby Chat Overlay (centro inferior) ==============

function LobbyChatOverlay({ lobbyId }: { lobbyId: string }) {
  const [tab, setTab] = useState<"sala" | "grupo">("sala");
  return (
    <div className="hidden lg:flex pointer-events-none fixed left-[320px] xl:left-[340px] 2xl:left-[360px] right-[560px] xl:right-[640px] 2xl:right-[720px] bottom-[80px] xl:bottom-[96px] 2xl:bottom-[112px] z-[var(--z-overlay)] justify-center">
      <div className="pointer-events-auto w-full max-w-md xl:max-w-lg 2xl:max-w-xl rounded-md border border-border-subtle bg-bg-deep/85 backdrop-blur-md shadow-2xl">
        <header className="flex items-center border-b border-border-subtle">
          <ChatTab label="Sala" active={tab === "sala"} onClick={() => setTab("sala")} />
          <ChatTab label="Grupo" active={tab === "grupo"} onClick={() => setTab("grupo")} />
          <span className="ml-auto px-3 font-mono text-[9px] 2xl:text-[10px] uppercase tracking-widest text-text-faded truncate max-w-[180px]">
            {lobbyId.slice(0, 8)}
          </span>
        </header>
        <div className="px-4 py-3 2xl:py-4 min-h-[120px] 2xl:min-h-[160px] max-h-[200px] 2xl:max-h-[260px] overflow-y-auto">
          <p className="font-mono text-[10px] 2xl:text-[11px] uppercase tracking-widest text-text-faded text-center mt-2">
            Chat em breve · V2
          </p>
        </div>
        <div className="border-t border-border-subtle p-2 2xl:p-3">
          <input
            type="text"
            disabled
            placeholder={`Para [Sala] · digite uma mensagem...`}
            className="w-full bg-transparent font-sans text-xs 2xl:text-sm text-text-display placeholder:text-text-faded focus:outline-none disabled:cursor-not-allowed"
            aria-label="Chat (em breve)"
          />
        </div>
      </div>
    </div>
  );
}

function ChatTab({
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
      className={`px-4 py-2 font-sans text-[11px] 2xl:text-xs font-semibold uppercase tracking-[0.2em] transition-colors border-b-2 ${
        active
          ? "border-brand-primary text-text-display"
          : "border-transparent text-text-muted hover:text-text-display"
      }`}
    >
      {label}
    </button>
  );
}

// ============== Coming Soon ==============

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
      <p className="font-display text-lg 2xl:text-xl uppercase tracking-wide text-text-display">
        {labels[mode]}
      </p>
      <p className="font-mono text-[11px] 2xl:text-xs uppercase tracking-widest text-text-faded">
        Em desenvolvimento — V2
      </p>
      <p className="font-sans text-xs 2xl:text-sm text-text-muted max-w-xs">
        Esse modo entra em uma fase futura. Por enquanto use Competitiva ou Salas Personalizadas.
      </p>
    </div>
  );
}
