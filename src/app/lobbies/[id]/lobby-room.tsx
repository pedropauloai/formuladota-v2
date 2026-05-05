"use client";

// LobbyRoom — sala estilo Dota 2:
// - Header: nome + líder + senha
// - 3 cols: Chat (esq) | Times + JOGADORES DE FORA (centro) | Configurações + Sair/Iniciar (dir)
// - Time 1 cyan / Time 2 red, slots em linhas finas com "ENTRAR" allcaps
// - Slot do current-user mostra X pra sair (vira espectador)
// - Click em slot vazio de outro time troca de vaga (Server Action UPDATE)

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
  const canEdit = lobby.status === "open" || lobby.status === "pending";

  return (
    <div className="flex h-full flex-col">
      {/* Header — nome + líder + senha */}
      <header className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] bg-black/50 px-6 py-3">
        <div>
          <h1 className="font-display text-xl uppercase tracking-wide text-white">
            {lobby.name}
          </h1>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/50">
            Líder: {leaderUsername}
            {lobby.status === "in_progress" && (
              <span className="ml-3 text-[var(--color-warning)]">
                · em andamento
              </span>
            )}
            {lobby.steamLobbyId?.startsWith("DEV-") && (
              <span className="ml-3 text-white/40">· modo dev (bot offline)</span>
            )}
          </p>
        </div>
        <PasswordBadge password={lobby.password} />
      </header>

      {/* Main 3-col: chat | teams+spectators | settings+actions */}
      <div className="flex-1 grid min-h-0 grid-cols-1 lg:grid-cols-[280px_1fr_320px] xl:grid-cols-[320px_1fr_360px]">
        {/* LEFT — Chat */}
        <ChatPanel lobbyName={lobby.name} />

        {/* CENTER — Times + Espectadores */}
        <main className="flex flex-col overflow-y-auto">
          <div className="grid flex-1 min-h-0 grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
            <TeamColumn
              label="Time 1"
              accent="cyan"
              team="radiant"
              players={team1}
              size={teamSize}
              lobbyId={lobby.id}
              currentUserId={currentUserId}
              leaderId={lobby.createdBy}
              currentTeam={myTeam}
              disabled={!canEdit}
            />
            <TeamColumn
              label="Time 2"
              accent="red"
              team="dire"
              players={team2}
              size={teamSize}
              lobbyId={lobby.id}
              currentUserId={currentUserId}
              leaderId={lobby.createdBy}
              currentTeam={myTeam}
              disabled={!canEdit}
            />
          </div>

          {/* JOGADORES DE FORA (espectadores) */}
          <SpectatorRow
            spectators={spectators}
            lobbyId={lobby.id}
            currentUserId={currentUserId}
            currentTeam={myTeam}
            disabled={!canEdit}
          />
        </main>

        {/* RIGHT — Configurações + Ações */}
        <aside className="hidden lg:flex flex-col border-l border-[var(--color-border)] bg-black/40 backdrop-blur-sm">
          <SettingsPanel lobby={lobby} isLeader={isLeader} />

          {/* Ações finais */}
          <div className="border-t border-[var(--color-border)] p-4 space-y-2.5">
            {inLobby ? (
              <form action={leaveLobby}>
                <input type="hidden" name="lobbyId" value={lobby.id} />
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Sair da sala
                </button>
              </form>
            ) : (
              <p className="text-center font-mono text-[10px] uppercase tracking-widest text-white/30 py-2">
                Você não está na sala
              </p>
            )}

            {isLeader && (
              <>
                <CancelLobbyButton lobbyId={lobby.id} />
                <StartMatchButton
                  lobbyId={lobby.id}
                  disabled={lobby.status !== "open"}
                />
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============== Team Column ==============

const TEAM_ACCENTS = {
  cyan: {
    border: "border-cyan-400/40",
    text: "text-cyan-300",
    bg: "bg-cyan-500/5",
    headerBg: "bg-cyan-500/10",
    rowHover: "hover:bg-cyan-500/5",
  },
  red: {
    border: "border-red-500/40",
    text: "text-red-400",
    bg: "bg-red-500/5",
    headerBg: "bg-red-500/10",
    rowHover: "hover:bg-red-500/5",
  },
} as const;

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
  accent: "cyan" | "red";
  team: "radiant" | "dire";
  players: PlayerSlot[];
  size: number;
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const a = TEAM_ACCENTS[accent];
  const slots = Array.from({ length: size }, (_, i) => players[i] ?? null);

  return (
    <section className={`flex flex-col ${a.bg}`}>
      <header
        className={`flex items-center justify-between border-b ${a.border} ${a.headerBg} px-4 py-2.5`}
      >
        <h2
          className={`font-display text-sm uppercase tracking-[0.25em] ${a.text}`}
        >
          {label}
        </h2>
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
          {players.length}/{size}
        </span>
      </header>
      <ol className="flex-1">
        {slots.map((slot, i) => (
          <PlayerSlotRow
            key={i}
            slot={slot}
            team={team}
            accent={accent}
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
  accent,
  lobbyId,
  currentUserId,
  leaderId,
  currentTeam,
  disabled,
}: {
  slot: PlayerSlot | null;
  team: "radiant" | "dire";
  accent: "cyan" | "red";
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const a = TEAM_ACCENTS[accent];

  const handleJoin = () => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team });
      if (!result.success) toast.error(result.error);
    });
  };

  const handleLeaveSlot = () => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team: "spectator" });
      if (!result.success) toast.error(result.error);
    });
  };

  // Slot vazio — mostra "ENTRAR" se permitido (não está nesse time)
  if (!slot) {
    const showJoin = !disabled && currentTeam !== team;
    return (
      <li
        className={`group flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3 min-h-[52px] ${
          showJoin ? `cursor-pointer ${a.rowHover}` : ""
        } transition-colors`}
        onClick={showJoin ? handleJoin : undefined}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
          ────
        </span>
        {showJoin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleJoin();
            }}
            disabled={isPending}
            className={`font-sans text-[11px] font-semibold uppercase tracking-[0.2em] ${a.text} opacity-60 group-hover:opacity-100 transition-opacity disabled:opacity-30`}
          >
            {isPending ? "..." : "Entrar"}
          </button>
        )}
      </li>
    );
  }

  const slotIsLeader = slot.userId === leaderId;
  const isCurrent = slot.userId === currentUserId;

  return (
    <li className="flex items-center gap-3 border-b border-white/5 px-4 py-3 min-h-[52px] group">
      {slot.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.avatarUrl}
          alt=""
          className="size-8 rounded-sm border border-white/10"
        />
      ) : (
        <div className="size-8 rounded-sm border border-white/10 bg-black/40" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm text-white truncate flex items-center gap-1.5">
          {slot.username}
          {slotIsLeader && (
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
      {isCurrent && !disabled && (
        <button
          type="button"
          onClick={handleLeaveSlot}
          disabled={isPending}
          aria-label="Sair do slot"
          title="Sair do slot (vira espectador)"
          className="opacity-0 group-hover:opacity-100 text-white/50 hover:text-white transition-all disabled:opacity-30"
        >
          {isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
        </button>
      )}
    </li>
  );
}

// ============== JOGADORES DE FORA (Spectators) ==============

function SpectatorRow({
  spectators,
  lobbyId,
  currentUserId,
  currentTeam,
  disabled,
}: {
  spectators: PlayerSlot[];
  lobbyId: string;
  currentUserId: string;
  currentTeam: string | null;
  disabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleSpectate = () => {
    startTransition(async () => {
      const r = await joinTeam({ lobbyId, team: "spectator" });
      if (!r.success) toast.error(r.error);
    });
  };

  const handleLeaveSpec = () => {
    // "Sair" do espectador = sair do lobby todo (similar ao Dota 2)
    startTransition(async () => {
      const fd = new FormData();
      fd.set("lobbyId", lobbyId);
      await leaveLobby(fd);
    });
  };

  const iAmSpectator = currentTeam === "spectator";

  return (
    <section className="bg-black/30">
      <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-black/40 px-4 py-2">
        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.25em] text-white/60">
          Jogadores de fora
        </h3>
        {!disabled && !iAmSpectator && currentTeam !== null && (
          <button
            type="button"
            onClick={handleSpectate}
            disabled={isPending}
            className="font-sans text-[10px] uppercase tracking-widest text-white/50 hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? "..." : "Assistir"}
          </button>
        )}
      </header>
      <div className="px-4 py-3 flex flex-wrap items-center gap-2 min-h-[48px]">
        {spectators.length === 0 ? (
          <span className="font-mono text-[10px] uppercase tracking-widest text-white/20">
            Nenhum
          </span>
        ) : (
          spectators.map((s) => {
            const isCurrent = s.userId === currentUserId;
            return (
              <span
                key={s.userId}
                className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 ${
                  isCurrent
                    ? "border-[var(--color-brand-red)]/40 bg-[var(--color-brand-red)]/10"
                    : "border-white/10 bg-black/40"
                }`}
              >
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatarUrl} alt="" className="size-4 rounded-sm" />
                ) : null}
                <span className="font-sans text-xs text-white/80">
                  {s.username}
                </span>
                {isCurrent && !disabled && (
                  <button
                    type="button"
                    onClick={handleLeaveSpec}
                    disabled={isPending}
                    aria-label="Sair do lobby"
                    title="Sair do lobby"
                    className="ml-1 text-white/50 hover:text-white transition-colors disabled:opacity-30"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            );
          })
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
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
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
          className="w-full rounded-sm border border-[var(--color-border)] bg-black/40 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30 focus:outline-none disabled:cursor-not-allowed"
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
    <div className="flex-1 flex flex-col gap-3 p-4 overflow-y-auto">
      <div className="flex items-center justify-between">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
          Configurações da sala
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
      <SettingRow label="Jogadores" value={`${lobby.maxPlayers}`} />

      <div className="mt-2 rounded-sm border border-[var(--color-border)] bg-black/40 p-3">
        <p className="font-mono text-[9px] uppercase tracking-widest text-white/40">
          Steam Lobby ID
        </p>
        <p className="mt-1 font-mono text-[11px] text-white/70 break-all">
          {lobby.steamLobbyId ?? "—"}
        </p>
      </div>
    </div>
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
      <span
        className={`font-sans text-xs font-medium ${valueClass ?? "text-white/80"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ============== Header / Action buttons ==============

function PasswordBadge({ password }: { password: string }) {
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center gap-2 rounded-sm border border-[var(--color-border)] bg-black/40 px-3 py-1.5">
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
        {copied ? (
          <Check size={12} aria-hidden="true" />
        ) : (
          <Copy size={12} aria-hidden="true" />
        )}
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
        className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60 hover:bg-[var(--color-danger)]/20 hover:border-[var(--color-danger)] hover:text-white transition-colors"
      >
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
      className="group relative w-full inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-sm border border-amber-400/60 bg-gradient-to-b from-amber-400 to-amber-600 px-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-black shadow-lg shadow-amber-500/30 hover:from-amber-300 hover:to-amber-500 hover:shadow-amber-400/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:from-amber-400 disabled:hover:to-amber-600"
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
