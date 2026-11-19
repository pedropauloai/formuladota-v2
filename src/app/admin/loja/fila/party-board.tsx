"use client";

// A party agora, no topo da mesa: um cartão por lugar, como os lugares da party no Dota. Quem
// está jogando aparece grande, com o ID do Dota para convidar; lugar livre chama o próximo.
// Embaixo, o registro da partida que terminou e os botões de chamar.

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueue, AdminQueueEntry } from "@/lib/loja/fila/admin";
import { chamarProximo, completarParty, naoApareceu, partidaTerminou, tirarDaParty, ultimaPartidaDoPPA } from "./actions";
import { CopyId, Kbd, MatchesStepper, OriginBadge, PRIMARY, SECONDARY, type RowAction } from "./rows";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function SeatCard({ entry, busy, act, onSelect }: { entry: AdminQueueEntry; busy: boolean; act: RowAction; onSelect: (id: string) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(entry.id)}
      onKeyDown={(e) => e.key === "Enter" && onSelect(entry.id)}
      className="flex min-w-0 flex-col items-center gap-2 rounded-md border border-play-primary/50 bg-bg-deep p-3 text-center hover:border-play-primary"
      data-fila-lugar="ocupado"
    >
      <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={entry.name.slice(0, 2).toUpperCase()} size="lg" />
      <p className="w-full truncate text-sm font-semibold text-text-display">{entry.name}</p>
      <OriginBadge entry={entry} />
      {entry.dotaFriendId && <CopyId id={entry.dotaFriendId} large />}
      <p className="text-xs text-play-primary">partida {Math.min(entry.played + 1, entry.matches)} de {entry.matches}</p>
      <MatchesStepper entry={entry} busy={busy} act={act} />
      <div className="grid w-full gap-1.5">
        <button
          type="button"
          disabled={busy}
          className={`${SECONDARY} w-full`}
          title="Volta para a fila no mesmo lugar, sem falta: use para trocar de jogador"
          onClick={(e) => {
            e.stopPropagation();
            act(`${entry.name} voltou para a fila`, () => tirarDaParty(entry.id));
          }}
          data-fila-tirar-da-party
        >
          Tirar da party
        </button>
        <button
          type="button"
          disabled={busy}
          className="w-full py-1 text-xs text-warning underline-offset-2 hover:underline disabled:opacity-40"
          title="Conta a vez e manda para o fim da fila"
          onClick={(e) => {
            e.stopPropagation();
            act("Não apareceu", () => naoApareceu(entry.id));
          }}
        >
          Não apareceu
        </button>
      </div>
    </div>
  );
}

function EmptySeat({ canCall, busy, onCall }: { canCall: boolean; busy: boolean; onCall: () => void }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border-strong p-3 text-center" data-fila-lugar="livre">
      <UserPlus size={28} aria-hidden="true" className="text-text-faded" />
      <p className="text-xs text-text-muted">Lugar livre</p>
      {canCall && (
        <button type="button" disabled={busy} className={SECONDARY} onClick={onCall}>
          Chamar o próximo
        </button>
      )}
    </div>
  );
}

/** "Partida terminou" com o ID da partida: grava a vez de cada um no revezamento, conferida na OpenDota. */
function MatchRegister({ liveId, matchesDone, busy, act }: { liveId: string; matchesDone: number; busy: boolean; act: RowAction }) {
  const [matchId, setMatchId] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const register = () => {
    if (!matchId.trim() && !window.confirm("Marcar sem o ID da partida? A vez de cada um conta, mas sem a conferência da OpenDota.")) return;
    act("Partida marcada", async () => {
      const result = await partidaTerminou(liveId, matchesDone, matchId);
      if (result.ok) setMatchId("");
      return result;
    });
  };
  const fillLast = async () => {
    const last = await ultimaPartidaDoPPA();
    if (last.ok) {
      setMatchId(last.matchId);
      setHint(`Partida da party, terminou às ${TIME.format(new Date(last.endedAt))}. Confira e toque em "Partida terminou".`);
    } else setHint(last.error);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        id="partida-id"
        inputMode="numeric"
        placeholder="ID ou link da partida (OpenDota)"
        value={matchId}
        onChange={(e) => setMatchId(e.target.value)}
        data-fila-partida-id
        className="min-w-56 flex-1 rounded-sm border border-border-strong bg-bg-deep px-3 py-2 font-mono text-sm text-text-display"
      />
      <button type="button" disabled={busy} className={SECONDARY} onClick={fillLast}>Achar a partida da party</button>
      <button type="button" disabled={busy} className={PRIMARY} onClick={register} data-fila-partida-terminou>
        Partida {matchesDone + 1} terminou <Kbd>T</Kbd>
      </button>
      {hint && <p className="w-full text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function PartyBoard({ data, busy, act, onSelect }: { data: AdminQueue; busy: boolean; act: RowAction; onSelect: (id: string) => void }) {
  const live = data.live;
  const onAir = live?.status === "ao_vivo";
  const seats = Math.min(4, Math.max(1, live?.seatsPerMatch ?? 4));
  const party = data.entries.filter((e) => e.state === "na_party").slice(0, seats);
  const waiting = data.entries.filter((e) => e.state === "aguardando").length;
  const canCall = !!live && onAir && waiting > 0;
  const call = () => live && act("Chamado", () => chamarProximo(live.id));
  return (
    <section className="space-y-4 rounded-md border border-border-strong bg-bg-base p-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Na party agora · {party.length} de {seats}</h2>
        {onAir && live ? (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy || !canCall} className={PRIMARY} onClick={call}>
              Chamar o próximo <Kbd>C</Kbd>
            </button>
            <button type="button" disabled={busy || !canCall} className={SECONDARY} onClick={() => act("Party completa", () => completarParty(live.id))}>
              Completar a party
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Abra a live para chamar a fila.</p>
        )}
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {party.map((e) => <SeatCard key={e.id} entry={e} busy={busy} act={act} onSelect={onSelect} />)}
        {Array.from({ length: seats - party.length }, (_, i) => <EmptySeat key={`livre-${i}`} canCall={canCall} busy={busy} onCall={call} />)}
      </div>
      {onAir && live && party.length > 0 && <MatchRegister liveId={live.id} matchesDone={live.matchesDone} busy={busy} act={act} />}
    </section>
  );
}
