"use client";

// LobbyRoom — painel lateral direito (~520px) que espelha o cliente Dota 2:
// header → 2 cols times → JOGADORES DE FORA → CONFIGURAÇÕES → SAIR/INICIAR.
// Renderiza dentro de <ClientShell rightSidebar={<LobbyRoom />} wideRightSidebar />.
//
// Mecânica: click slot vazio entra/troca; X no seu slot vira espectador; X no chip
// espectador sai do lobby. router.refresh() após cada Server Action sucesso pra
// re-fetch dos dados (revalidatePath sozinho não rerender client component).

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
  ArrowLeft,
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
  /** Quando providenciado, mostra botão voltar no header (uso embedded no PlayPanel). */
  onBack?: () => void;
  /**
   * Callback após cada Server Action sucesso (join/leave/start). Usado quando
   * o LobbyRoom é embedded em PlayPanel (Client) — re-fetcha via fetch action
   * pq router.refresh sozinho não re-roda useEffect+SA.
   */
  onMutate?: () => void;
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
  onBack,
  onMutate,
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
      <header className="border-b border-[var(--color-border)] bg-black/60 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className="mt-0.5 text-white/50 hover:text-white transition-colors shrink-0"
              >
                <ArrowLeft size={16} />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="font-display text-base uppercase tracking-wide text-white truncate">
                {lobby.name}
              </h1>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-white/50 truncate">
                Líder: {leaderUsername}
              </p>
            </div>
          </div>
          <PasswordBadge password={lobby.password} />
        </div>
        {(lobby.status === "in_progress" || lobby.steamLobbyId?.startsWith("DEV-")) && (
          <p className="mt-1 font-mono text-[9px] uppercase tracking-widest">
            {lobby.status === "in_progress" && (
              <span className="text-[var(--color-warning)]">Em andamento</span>
            )}
            {lobby.steamLobbyId?.startsWith("DEV-") && (
              <span className="text-white/40 ml-2">Modo dev (bot offline)</span>
            )}
          </p>
        )}
      </header>

      {/* Times — 2 cols */}
      <section className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-b border-[var(--color-border)]">
        <TeamColumn
          label="Os Iluminados"
          accent="cyan"
          team="radiant"
          players={team1}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
        />
        <TeamColumn
          label="Os Temidos"
          accent="red"
          team="dire"
          players={team2}
          size={teamSize}
          lobbyId={lobby.id}
          currentUserId={currentUserId}
          leaderId={lobby.createdBy}
          currentTeam={myTeam}
          disabled={!canEdit}
          onMutate={onMutate}
        />
      </section>

      {/* JOGADORES DE FORA */}
      <SpectatorRow
        spectators={spectators}
        lobbyId={lobby.id}
        currentUserId={currentUserId}
        currentTeam={myTeam}
        disabled={!canEdit}
        onMutate={onMutate}
      />

      {/* Configurações da sala (read-only) */}
      <SettingsPanel lobby={lobby} isLeader={isLeader} />

      {/* Ações finais.
          Leader: "Sair da sala" (transfere capitania se houver outros) +
                  "Encerrar sala" (força descarte com confirm) +
                  "Iniciar partida"
          Member: "Sair da sala" simples. */}
      <div className="mt-auto border-t border-[var(--color-border)] bg-black/60 p-3 space-y-2">
        {!inLobby && (
          <p className="text-center font-mono text-[10px] uppercase tracking-widest text-white/30 py-2">
            Você não está na sala
          </p>
        )}

        {inLobby && (
          <LeaveLobbyButton lobbyId={lobby.id} isLeader={isLeader} />
        )}

        {isLeader && (
          <>
            <EndLobbyButton lobbyId={lobby.id} />
            <StartMatchButton
              lobbyId={lobby.id}
              disabled={lobby.status !== "open"}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ============== Team Column ==============

const TEAM_ACCENTS = {
  cyan: {
    border: "border-cyan-400/40",
    text: "text-cyan-300",
    bg: "bg-cyan-500/[0.04]",
    headerBg: "bg-cyan-500/10",
    rowHover: "hover:bg-cyan-500/10",
  },
  red: {
    border: "border-red-500/40",
    text: "text-red-400",
    bg: "bg-red-500/[0.04]",
    headerBg: "bg-red-500/10",
    rowHover: "hover:bg-red-500/10",
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
  onMutate,
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
  onMutate?: () => void;
}) {
  const a = TEAM_ACCENTS[accent];
  const slots = Array.from({ length: size }, (_, i) => players[i] ?? null);

  return (
    <section className={`flex flex-col ${a.bg}`}>
      <header
        className={`flex items-center justify-between border-b ${a.border} ${a.headerBg} px-3 py-2`}
      >
        <h2
          className={`font-display text-xs uppercase tracking-[0.25em] ${a.text}`}
        >
          {label}
        </h2>
        <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
          {players.length}/{size}
        </span>
      </header>
      <ol>
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
            onMutate={onMutate}
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
  onMutate,
}: {
  slot: PlayerSlot | null;
  team: "radiant" | "dire";
  accent: "cyan" | "red";
  lobbyId: string;
  currentUserId: string;
  leaderId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const a = TEAM_ACCENTS[accent];

  const handleJoin = () => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      onMutate?.();
    });
  };

  const handleLeaveSlot = () => {
    startTransition(async () => {
      const result = await joinTeam({ lobbyId, team: "spectator" });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      router.refresh();
      onMutate?.();
    });
  };

  // Slot vazio — "ENTRAR" se não está nesse time
  if (!slot) {
    const showJoin = !disabled && currentTeam !== team;
    return (
      <li
        className={`group flex items-center justify-between gap-2 border-b border-white/5 px-3 py-2.5 min-h-[44px] ${
          showJoin ? `cursor-pointer ${a.rowHover}` : ""
        } transition-colors`}
        onClick={showJoin && !isPending ? handleJoin : undefined}
      >
        <span className="font-mono text-[10px] uppercase tracking-widest text-white/15">
          ────
        </span>
        {showJoin && (
          <span
            className={`font-sans text-[10px] font-semibold uppercase tracking-[0.2em] ${a.text} opacity-50 group-hover:opacity-100 transition-opacity`}
          >
            {isPending ? "..." : "Entrar"}
          </span>
        )}
      </li>
    );
  }

  const slotIsLeader = slot.userId === leaderId;
  const isCurrent = slot.userId === currentUserId;

  return (
    <li className="flex items-center gap-2 border-b border-white/5 px-3 py-2.5 min-h-[44px] group">
      {slot.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slot.avatarUrl}
          alt=""
          className="size-7 rounded-sm border border-white/10 shrink-0"
        />
      ) : (
        <div className="size-7 rounded-sm border border-white/10 bg-black/40 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-xs text-white truncate flex items-center gap-1">
          {slot.username}
          {slotIsLeader && (
            <Crown
              size={10}
              className="text-amber-400 shrink-0"
              aria-label="Líder"
            />
          )}
        </p>
        {isCurrent && (
          <p className="font-mono text-[9px] uppercase tracking-widest text-[var(--color-brand-red)]">
            você
          </p>
        )}
      </div>
      {isCurrent && !disabled && (
        <button
          type="button"
          onClick={handleLeaveSlot}
          disabled={isPending}
          aria-label="Sair do slot"
          title="Sair do slot (vira espectador)"
          className="shrink-0 text-white/40 hover:text-white transition-colors disabled:opacity-30"
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

// ============== JOGADORES DE FORA ==============

function SpectatorRow({
  spectators,
  lobbyId,
  currentUserId,
  currentTeam,
  disabled,
  onMutate,
}: {
  spectators: PlayerSlot[];
  lobbyId: string;
  currentUserId: string;
  currentTeam: string | null;
  disabled: boolean;
  onMutate?: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleSpectate = () => {
    startTransition(async () => {
      const r = await joinTeam({ lobbyId, team: "spectator" });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      router.refresh();
      onMutate?.();
    });
  };

  const handleLeaveLobby = () => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("lobbyId", lobbyId);
      await leaveLobby(fd);
      router.refresh();
      onMutate?.();
    });
  };

  const iAmSpectator = currentTeam === "spectator";

  return (
    <section className="border-b border-[var(--color-border)] bg-black/30">
      <header className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <h3 className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
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
      <div className="px-3 py-2.5 flex flex-wrap items-center gap-1.5 min-h-[40px]">
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
                className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 ${
                  isCurrent
                    ? "border-[var(--color-brand-red)]/40 bg-[var(--color-brand-red)]/10"
                    : "border-white/10 bg-black/40"
                }`}
              >
                {s.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.avatarUrl} alt="" className="size-3.5 rounded-sm" />
                ) : null}
                <span className="font-sans text-[11px] text-white/80">
                  {s.username}
                </span>
                {isCurrent && !disabled && (
                  <button
                    type="button"
                    onClick={handleLeaveLobby}
                    disabled={isPending}
                    aria-label="Sair do lobby"
                    title="Sair do lobby"
                    className="ml-0.5 text-white/50 hover:text-white transition-colors disabled:opacity-30"
                  >
                    <X size={11} />
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

// ============== Configurações ==============

function SettingsPanel({
  lobby,
  isLeader,
}: {
  lobby: LobbyData;
  isLeader: boolean;
}) {
  return (
    <section className="border-b border-[var(--color-border)] bg-black/30 px-3 py-3">
      <div className="mb-2 flex items-center justify-between">
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
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
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
      </div>
      {lobby.steamLobbyId && (
        <p className="mt-2 font-mono text-[9px] uppercase tracking-widest text-white/30 truncate">
          Steam: {lobby.steamLobbyId}
        </p>
      )}
    </section>
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
    <div className="flex items-center justify-between gap-1 border-b border-white/5 pb-1 last:border-0 last:pb-0">
      <span className="font-mono text-[9px] uppercase tracking-widest text-white/40">
        {label}
      </span>
      <span
        className={`font-sans text-[11px] font-medium truncate ${valueClass ?? "text-white/80"}`}
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
    <div className="flex shrink-0 items-center gap-1.5 rounded-sm border border-[var(--color-border)] bg-black/40 px-2 py-1">
      <Lock size={10} className="text-white/40" aria-hidden="true" />
      <code className="font-mono text-[10px] text-[var(--color-brand-red)]">
        {reveal ? password : "••••••"}
      </code>
      <button
        type="button"
        onClick={() => setReveal(!reveal)}
        aria-label={reveal ? "Ocultar senha" : "Revelar senha"}
        className="text-white/40 hover:text-white transition-colors"
      >
        {reveal ? (
          <EyeOff size={10} aria-hidden="true" />
        ) : (
          <Eye size={10} aria-hidden="true" />
        )}
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar senha"
        className="text-white/40 hover:text-white transition-colors"
      >
        {copied ? (
          <Check size={10} aria-hidden="true" />
        ) : (
          <Copy size={10} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function LeaveLobbyButton({
  lobbyId,
  isLeader,
}: {
  lobbyId: string;
  isLeader: boolean;
}) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      isLeader &&
      !confirm(
        "Você é o líder. Ao sair, a capitania passa pro próximo jogador mais antigo. Se estiver sozinho, a sala é descartada. Confirmar?"
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={leaveLobby} onSubmit={handleSubmit}>
      <input type="hidden" name="lobbyId" value={lobbyId} />
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-white/10 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:bg-white/5 hover:text-white transition-colors"
      >
        Sair da sala
      </button>
    </form>
  );
}

function EndLobbyButton({ lobbyId }: { lobbyId: string }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (
      !confirm(
        "Encerrar a sala? Como líder, sua saída descarta a sala e remove todos os jogadores. Não é possível desfazer."
      )
    ) {
      e.preventDefault();
    }
  };

  return (
    <form action={cancelLobby} onSubmit={handleSubmit}>
      <input type="hidden" name="lobbyId" value={lobbyId} />
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 rounded-sm border border-[var(--color-danger)]/30 bg-black/40 px-4 py-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70 hover:bg-[var(--color-danger)]/20 hover:border-[var(--color-danger)] hover:text-white transition-colors"
      >
        Encerrar sala
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
      className="group relative w-full inline-flex h-12 items-center justify-center gap-2 overflow-hidden rounded-sm border border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-6 font-display text-sm font-bold uppercase tracking-[0.3em] text-white shadow-lg shadow-[var(--color-play-green)]/30 hover:brightness-110 hover:shadow-[var(--color-play-green)]/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:brightness-100"
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
