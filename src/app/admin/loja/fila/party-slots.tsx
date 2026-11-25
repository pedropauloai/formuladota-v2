"use client";

// Os lugares da party como no cliente do Dota: o PPA no primeiro, de aro dourado, e um lugar para
// cada jogador, de aro verde. Em cada lugar, o nome que aparece no Dota (o da Steam) e o ID para
// copiar e convidar; "Trocar" escolhe quem entra da fila e o resto (falta, tirar, partidas, perfil)
// fica no menu. O lugar livre mostra quem é o próximo da fila e o Chamar, que abre a live se ela
// estiver fora do ar.

import Image from "next/image";
import { ArrowLeftRight, ExternalLink, Minus, Plus, UserMinus } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import type { QueueLive } from "@/lib/loja/fila/model";
import { OWNER } from "@/lib/loja/owner";
import { cn } from "@/lib/utils";
import { chamarProximo, tirarDaParty } from "./actions";
import { ajustarPartidas } from "./cortesia-actions";
import { ContextMenuActions } from "@/components/ui/context-menu";
import { ActionMenu, type MenuAction } from "./action-menu";
import { CopyId, MatchPips, OpButton } from "./ui";
import { useAction } from "./use-console";

const SLOT = "flex min-h-[13.5rem] flex-col rounded-md border p-3.5";
const MEMBER_RIM = "rounded-sm shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-play-primary)_60%,transparent),0_2px_6px_rgb(0_0_0/0.5)]";

function seatActions(entry: AdminQueueEntry, run: ReturnType<typeof useAction>["run"]): MenuAction[] {
  const left = entry.matches - entry.played;
  return [
    {
      key: "sair",
      label: "Tirar da party",
      icon: <UserMinus size={16} />,
      run: () => run({ action: () => tirarDaParty(entry.id), success: `${entry.name} voltou para a fila.`, undo: () => chamarProximo(entry.id) }),
      testId: "tirar-da-party",
    },
    // A vaga do dia não tem saldo de partidas: joga a live inteira no revezamento.
    ...(entry.dayPass
      ? []
      : [
          {
            key: "mais",
            label: "Dar mais uma partida",
            icon: <Plus size={16} />,
            separatorBefore: true,
            disabled: entry.matches >= 20,
            run: () => run({ action: () => ajustarPartidas(entry.id, 1), success: `${entry.name}: ${left + 1} partidas a jogar.` }),
            testId: "mais-partida",
          },
          {
            key: "menos",
            label: "Tirar uma partida",
            icon: <Minus size={16} />,
            disabled: left <= 1,
            run: () => run({ action: () => ajustarPartidas(entry.id, -1), success: `${entry.name}: ${left - 1} partida${left - 1 === 1 ? "" : "s"} a jogar.` }),
            testId: "menos-partida",
          },
        ]),
    // Sem "Tirar da fila" aqui: quem está na party tem saldo, e sair da party nunca tira da fila.
    ...(entry.steamProfileUrl ? [{ key: "steam", label: "Perfil na Steam", icon: <ExternalLink size={16} />, href: entry.steamProfileUrl, separatorBefore: true }] : []),
  ];
}

function Seat({ entry, swapping, onSwap }: { entry: AdminQueueEntry; swapping: boolean; onSwap: (id: string | null) => void }) {
  const { pending, run } = useAction();
  return (
    // O botão direito no lugar abre as mesmas ações do "⋯".
    <ContextMenuActions actions={() => seatActions(entry, run)} testAttr="data-fila-menu" className="w-72">
      <article
        aria-busy={pending || undefined}
        aria-label={entry.name}
        className={cn(SLOT, "gap-3 transition-colors", swapping ? "border-gold/70 bg-gold/[0.07]" : "border-white/[0.06] bg-black/20", pending && "opacity-60")}
        data-fila-lugar="ocupado"
      >
        <div className="flex items-start gap-3">
          <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={entry.name.slice(0, 2).toUpperCase()} size="md" className={MEMBER_RIM} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-5 text-text-display" title={entry.name}>
              {entry.name}
            </p>
            <p className="truncate text-sm leading-5 text-text-muted" title={entry.steamPersona ?? undefined}>
              {entry.steamPersona ? `no Dota: ${entry.steamPersona}` : "sem Steam vinculada"}
            </p>
          </div>
        </div>
        <MatchPips played={entry.played} matches={entry.matches} dayPass={entry.dayPass} />
        <div className="mt-auto space-y-1.5">
          {entry.dotaFriendId ? <CopyId id={entry.dotaFriendId} variant="large" /> : <p className="py-2.5 text-sm text-warning">Sem ID do Dota: convide pela Steam.</p>}
          <div className="flex items-center gap-1">
            <OpButton
              tone="quiet"
              size="sm"
              className={cn("flex-1", swapping && "bg-gold/10 text-gold hover:bg-gold/15 hover:text-gold-bright")}
              icon={<ArrowLeftRight size={15} aria-hidden="true" />}
              onClick={() => onSwap(swapping ? null : entry.id)}
              aria-pressed={swapping}
              data-fila-trocar
            >
              {swapping ? "Cancelar a troca" : "Trocar"}
            </OpButton>
            <ActionMenu label={`Ações de ${entry.name}`} actions={seatActions(entry, run)} />
          </div>
        </div>
      </article>
    </ContextMenuActions>
  );
}

function EmptySeat({ next }: { next: AdminQueueEntry | null }) {
  const { pending, run } = useAction();
  return (
    <div className={cn(SLOT, "items-center justify-center gap-3 border-dashed border-white/[0.12] text-center")} data-fila-lugar="livre">
      {next ? (
        <>
          <p className="text-sm text-text-muted">Próximo da fila</p>
          <UserAvatar src={next.avatarUrl ?? undefined} alt={next.name} fallback={next.name.slice(0, 2).toUpperCase()} size="md" className="opacity-70" />
          <p className="max-w-full truncate text-[15px] font-medium text-text-display">{next.name}</p>
          <OpButton
            size="sm"
            pending={pending}
            onClick={() => run({ action: () => chamarProximo(next.id), success: `${next.name} entrou na party.`, undo: () => tirarDaParty(next.id) })}
            data-fila-chamar
          >
            Chamar
          </OpButton>
        </>
      ) : (
        <p className="text-sm text-text-muted">Lugar livre</p>
      )}
    </div>
  );
}

function OwnerSeat() {
  return (
    <div className={cn(SLOT, "items-center justify-center gap-2.5 border-white/[0.04] bg-black/10 text-center")} aria-label={`${OWNER.nick}, dono da party`}>
      <Image
        src={OWNER.avatar}
        alt=""
        width={64}
        height={64}
        className="size-16 rounded-sm object-cover object-top shadow-[0_0_0_1px_var(--color-gold),0_0_16px_var(--fd-raw-gold-glow)]"
      />
      <p className="font-display-condensed text-2xl uppercase leading-none text-gold">{OWNER.short}</p>
    </div>
  );
}

interface PartySlotsProps {
  live: QueueLive | null;
  party: AdminQueueEntry[];
  waiting: AdminQueueEntry[];
  swapFor: string | null;
  onSwap: (id: string | null) => void;
}

export function PartySlots({ live, party, waiting, swapFor, onSwap }: PartySlotsProps) {
  const seats = Math.min(4, Math.max(1, live?.seatsPerMatch ?? 4));
  const members = party.slice(0, seats);
  return (
    <div className="grid gap-3 p-4" style={{ gridTemplateColumns: `7.5rem repeat(${seats}, minmax(0, 1fr))` }}>
      <OwnerSeat />
      {members.map((e) => (
        <Seat key={e.id} entry={e} swapping={swapFor === e.id} onSwap={onSwap} />
      ))}
      {Array.from({ length: seats - members.length }, (_, i) => (
        <EmptySeat key={`livre-${i}`} next={waiting[i] ?? null} />
      ))}
    </div>
  );
}
