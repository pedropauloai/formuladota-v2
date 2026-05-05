"use client";

// LobbyRoom — Client Component que renderiza sala aberta no estilo lobby de jogo competitivo:
// header com nome + líder, grid 2 times (5 slots cada), painel chat à esquerda do center,
// painel configurações à direita, e bottom-bar com botões (Sair / Iniciar Partida).
//
// Slots vazios renderizam botão "Entrar" — clica e Server Action joinTeam coloca o user
// no time. Slot ocupado mostra avatar + username. Líder marcado com coroa.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Loader2,
  Play,
  LogOut,
  Shuffle,
  Scale,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { joinTeam, leaveLobby, startMatch, cancelLobby } from "./actions";

interface PlayerSlot {
  userId: string;
  team: "radiant" | "dire" | "spectator";
  joinedAt: string;
  username: string;
  avatarUrl: string | null;
}

interface LobbyData {
  id: string;
  name: string;
  password: string;
  gameMode: string;
  status: string;
  maxPlayers: number;
  steamLobbyId: string | null;
  createdBy: string;
  startedAt: string | null;
}

interface Props {
  lobby: LobbyData;
  players: PlayerSlot[];
  currentUserId: string;
  isLeader: boolean;
  leaderUsername: string;
}

const GAME_MODE_LABELS: Record<string, string> = {
  all_pick: "Escolha livre",
  captains_mode: "Modo capitães",
  random_draft: "Seleção aleatória",
  single_draft: "Single draft",
};

export function LobbyRoom({
  lobby,
  players,
  currentUserId,
  isLeader,
  leaderUsername,
}: Props) {
  const teamSize = Math.floor(lobby.maxPlayers / 2);
  const team1 = players.filter((p) => p.team === "radiant");
  const team2 = players.filter((p) => p.team === "dire");
  const spectators = players.filter((p) => p.team === "spectator");
  const inLobby = players.some((p) => p.userId === currentUserId);
  const myTeam = players.find((p) => p.userId === currentUserId)?.team ?? null;

  return (
    <div className="flex h-full flex-col">
      {/* Header da sala — nome + líder */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-black/40 px-6 py-3">
        <div>
          <h1 className="font-display text-xl uppercase tracking-wide text-white">{lobby.name}</h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
            Líder: {leaderUsername}
            {lobby.status === "in_progress" && (
              <span className="ml-3 text-[var(--color-warning)]">· em andamento</span>
            )}
            {lobby.steamLobbyId?.startsWith("DEV-") && (
              <span className="ml-3 text-white/40">· modo dev (bot offline)</span>
            )}
          </p>
        </div>
        <PasswordBadge password={lobby.password} />
      </header>

      {/* Main 2-col: chat (left) + teams+config (center+right) */}
      <div className="flex-1 grid min-h-0 grid-cols-1 lg:grid-cols-[280px_1fr_300px] xl:grid-cols-[300px_1fr_340px]">
        {/* LEFT — Chat */}
        <ChatPanel lobbyName={lobby.name} />

        {/* CENTER — Teams */}
        <main className="flex flex-col overflow-y-auto p-4 xl:p-6">
          <div className="grid flex-1 min-h-0 gap-4 md:grid-cols-2">
            <TeamColumn
              label="Time 1"
              accent="rose"
              team="radiant"
              players={team1}
              size={teamSize}
              lobbyId={lobby.id}
              currentUserId={currentUserId}
              leaderId={lobby.createdBy}
              currentTeam={myTeam}
              disabled={lobby.status !== "open" && lobby.status !== "pending"}
            />
            <TeamColumn
              label="Time 2"
              accent="emerald"
              team="dire"
              players={team2}
              size={teamSize}
              lobbyId={lobby.id}
              currentUserId={currentUserId}
              leaderId={lobby.createdBy}
              currentTeam={myTeam}
              disabled={lobby.status !== "open" && lobby.status !== "pending"}
            />
          </div>

          {/* Botões de balanceamento (líder) */}
          {isLeader && (
            <div className="mt-4 flex items-center gap-2">
              <ActionButton
                icon={Scale}
                label="Equilibrar times"
                disabled
                hint="V2"
              />
              <ActionButton
                icon={Shuffle}
                label="Trocar times"
                disabled
                hint="V2"
              />
            </div>
          )}

          {/* Espectadores */}
          <SpectatorRow
            spectators={spectators}
            lobbyId={lobby.id}
            currentTeam={myTeam}
            disabled={lobby.status !== "open" && lobby.status !== "pending"}
          />
        </main>

        {/* RIGHT — Configurações da sala */}
        <SettingsPanel lobby={lobby} isLeader={isLeader} />
      </div>

      {/* Bottom bar — Sair / Iniciar */}
      <footer className="flex items-center justify-between gap-3 border-t border-[var(--color-border)] bg-black/40 px-6 py-3">
        {inLobby ? (
          <form action={leaveLobby}>
            <input type="hidden" name="lobbyId" value={lobby.id} />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              <LogOut size={14} aria-hidden="true" />
              Sair da sala
            </button>
          </form>
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
            Você não está na sala — entre num time pra participar
          </span>
        )}

        {isLeader && (
          <div className="flex items-center gap-2">
            <CancelLobbyButton lobbyId={lobby.id} />
            <StartMatchButton lobbyId={lobby.id} disabled={lobby.status !== "open"} />
          </div>
        )}
      </footer>
    </div>
  );
}

// ============== Team Column ==============

function TeamColumn({
  label,
  accent,
  team,
  players,
  size,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam,
  disabled,
}: {
  label: string;
  accent: "rose" | "emerald";
  team: "radiant" | "dire";
  players: PlayerSlot[];
  size: number;
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const accentCls =
    accent === "rose"
      ? "border-rose-500/40 text-rose-400"
      : "border-emerald-500/40 text-emerald-400";
  const slots = Array.from({ length: size }, (_, i) => players[i] ?? null);

  return (
    <section
      className={`flex flex-col rounded-md border ${accentCls.split(" ")[0]} bg-black/50 backdrop-blur-sm overflow-hidden`}
    >
      <header
        className={`flex items-center justify-between border-b ${accentCls.split(" ")[0]} px-4 py-2`}
      >
        <h2
          className={`font-display text-sm uppercase tracking-[0.2em] ${accentCls.split(" ")[1]}`}
        >
          {label}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {players.length}/{size}
        </span>
      </header>
      <ol className="flex-1 divide-y divide-white/5">
        {slots.map((slot, i) => (
          <PlayerSlotRow
            key={i}
            slot={slot}
            team={team}
            lobbyId={lobbyId}
            currentUserId={currentUserId}
            leaderId={leaderId}
            currentTeam={currentTeam}
            disabled={disabled}
          />
        ))}
      </ol>
    </section>
  );
}

function PlayerSlotRow({
  slot,
  team,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam,
  disabled,
}: {
  slot: PlayerSlot | null;
  team: "radiant" | "dire";
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team });
      if (!result.success) toast.error(result.error);
    });
  };

  if (!slot) {
    const showJoinButton = !disabled && currentTeam !== team;
    return (
      <li className="flex items-center justify-between gap-3 px-4 py-3 min-h-[52px]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/30">
          Vaga aberta
        </span>
        {showJoinButton && (
          <button
            type="button"
            onClick={handleJoin}
            disabled={isPending}
            className="rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-1 font-sans text-[10px] font-semibold uppercase tracking-widest text-white/70 hover:border-[var(--color-brand-red)] hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Entrar"}
          </button>
        )}
      </li>
    );
  }

  const isLeader = slot.userId === leaderId;
  const isCurrent = slot.userId === currentUserId;

  return (
    <li className="flex items-center gap-3 px-4 py-3 min-h-[52px]">
      {slot.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.avatarUrl}
          alt=""
          className="size-8 rounded-full border border-white/10"
        />
      ) : (
        <div className="size-8 rounded-full border border-white/10 bg-black/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm text-white truncate flex items-center gap-1.5">
          {slot.username}
          {isLeader && (
            <Crown
              size={11}
              className="text-amber-400 shrink-0"
              aria-label="Líder"
            />
          )}
          {isCurrent && (
            <span className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-brand-red)]">
              · você
            </span>
          )}
        </p>
      </div>
    </li>
  );
}

// ============== Spectators ==============

function SpectatorRow({
  spectators,
  lobbyId,
  currentTeam,
  disabled,
}: {
  spectators: PlayerSlot[];
  lobbyId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <section className="mt-4 rounded-md border border-[var(--color-border)] bg-black/40 backdrop-blur-sm">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Espectadores
        </h3>
        {!disabled && currentTeam !== "spectator" && (
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                const r = await joinTeam({ lobbyId, team: "spectator" });
                if (!r.success) toast.error(r.error);
              })
            }
            disabled={isPending}
            className="font-sans text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Assistir →"}
          </button>
        )}
      </header>
      <div className="px-4 py-2.5 flex flex-wrap items-center gap-2 min-h-[40px]">
        {spectators.length === 0 ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
            Nenhum
          </span>
        ) : (
          spectators.map((s) => (
            <span
              key={s.userId}
              className="inline-flex items-center gap-1.5 rounded-full bg-black/40 border border-white/10 px-2 py-0.5"
            >
              {s.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.avatarUrl} alt="" className="size-4 rounded-full" />
              ) : null}
              <span className="font-sans text-xs text-white/70">{s.username}</span>
            </span>
          ))
        )}
      </div>
    </section>
  );
}

// ============== Chat panel (left) ==============

function ChatPanel({ lobbyName }: { lobbyName: string }) {
  return (
    <aside className="hidden lg:flex flex-col border-r border-[var(--color-border)] bg-black/40 backdrop-blur-sm">
      <header className="border-b border-[var(--color-border)] px-4 py-3">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Chat — {lobbyName}
        </p>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/30 text-center mt-4">
          Chat em breve · V2
        </p>
      </div>
      <div className="border-t border-[var(--color-border)] p-2">
        <input
          type="text"
          placeholder="Digite uma mensagem..."
          disabled
          className="w-full rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30 focus:outline-none disabled:cursor-not-allowed"
          aria-label="Chat (em breve)"
        />
      </div>
    </aside>
  );
}

// ============== Settings panel (right) ==============

function SettingsPanel({
  lobby,
  isLeader,
}: {
  lobby: LobbyData;
  isLeader: boolean;
}) {
  return (
    <aside className="hidden lg:flex flex-col gap-3 border-l border-[var(--color-border)] bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-white/60">
          Configurações
        </p>
        {isLeader && (
          <button
            type="button"
            disabled
            className="font-sans text-[10px] uppercase tracking-widest text-white/40 hover:text-white transition-colors disabled:cursor-not-allowed"
            title="Editar (V2)"
          >
            Editar
          </button>
        )}
      </div>

      <SettingRow
        label="Modo"
        value={GAME_MODE_LABELS[lobby.gameMode] ?? lobby.gameMode}
      />
      <SettingRow label="Servidor" value="Brasil" />
      <SettingRow
        label="Trapaças"
        value="Não"
        valueClass="text-[var(--color-success)]"
      />
      <SettingRow label="Visibilidade" value="Pública" />
      <SettingRow label="Liga" value="Nenhuma" />
      <SettingRow label="Espectadores" value="Permitido" />
      <SettingRow label="Atraso da TV" value="2 minutos" />
      <SettingRow label="Pausas" value="Ilimitadas" />
      <SettingRow label="Formato" value="Partida única" />

      <div className="mt-2 rounded-md border border-[var(--color-border)] bg-black/30 p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">
          Steam Lobby ID
        </p>
        <p className="mt-1 font-mono text-[11px] text-white/70 break-all">
          {lobby.steamLobbyId ?? "—"}
        </p>
      </div>
    </aside>
  );
}

function SettingRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      <span className={`font-sans text-xs font-medium ${valueClass ?? "text-white/80"}`}>
        {value}
      </span>
    </div>
  );
}

// ============== Bottom action buttons ==============

function ActionButton({
  icon: Icon,
  label,
  disabled,
  hint,
  onClick,
}: {
  icon: typeof Scale;
  label: string;
  disabled?: boolean;
  hint?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-1.5 font-sans text-[10px] font-semibold uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon size={12} aria-hidden="true" />
      {label}
      {hint && <span className="font-mono text-[8px] text-white/30">· {hint}</span>}
    </button>
  );
}

function PasswordBadge({ password }: { password: string }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-3 py-1.5">
      <Lock size={12} className="text-white/40" aria-hidden="true" />
      <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
        Senha:
      </span>
      <code className="font-mono text-xs text-[var(--color-brand-red)]">
        {reveal ? password : "••••••••"}
      </code>
      <button
        type="button"
        onClick={() => setReveal(!reveal)}
        aria-label={reveal ? "Ocultar senha" : "Revelar senha"}
        className="text-white/40 hover:text-white transition-colors"
      >
        {reveal ? (
          <EyeOff size={12} aria-hidden="true" />
        ) : (
          <Eye size={12} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar senha"
        className="text-white/40 hover:text-white transition-colors"
      >
        {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      </button>
    </div>
  );
}

function CancelLobbyButton({ lobbyId }: { lobbyId: string }) {
  return (
    <form action={cancelLobby}>
      <input type="hidden" name="lobbyId" value={lobbyId} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-black/40 px-4 py-2 font-sans text-xs font-semibold uppercase tracking-wide text-white/70 hover:bg-[var(--color-danger)]/20 hover:border-[var(--color-danger)] hover:text-white transition-colors"
      >
        <X size={14} aria-hidden="true" />
        Cancelar sala
      </button>
    </form>
  );
}

function StartMatchButton({
  lobbyId,
  disabled,
}: {
  lobbyId: string;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleStart = () => {
    startTransition(async () => {
      const r = await startMatch({ lobbyId });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Partida iniciada!");
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={disabled || isPending}
      className="group relative inline-flex h-11 items-center gap-2 overflow-hidden rounded-md border-2 border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-6 font-display text-sm font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[var(--color-play-green)]/30 hover:scale-[1.02] hover:shadow-[var(--color-play-green)]/50 transition-all disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {isPending ? (
        <Loader2 size={14} className="animate-spin" aria-hidden="true" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
      <span>{isPending ? "Iniciando..." : "Iniciar partida"}</span>
    </button>
  );
}
