"use client";

// Linhas do painel da fila: quem está na party (com o ID do Dota para o convite) e quem espera.

import { useState } from "react";
import { Check, Copy, ExternalLink, Minus, Plus } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminFinishedEntry, AdminQueueEntry } from "@/lib/loja/fila/admin";
import { ajustarPartidas } from "./cortesia-actions";
import { formatBRL } from "@/lib/loja/money";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
// Com a fila aberta fora da live, a compra pode ser de outro dia: a hora vem com o dia.
const PAID_AT = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export type RowAction = (label: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void;

const BUTTON = "rounded-sm border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50";
export const PRIMARY = `${BUTTON} border-play-primary bg-play-primary text-bg-deep hover:bg-play-primary-hover`;
export const SECONDARY = `${BUTTON} border-border-strong text-text-display hover:border-text-muted`;
export const DANGER = `${BUTTON} border-error/50 text-error hover:bg-error/10`;

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1 rounded-sm border border-border-subtle px-1.5 py-0.5 font-mono text-xs text-text-body hover:border-text-muted"
      title="Copiar o ID do Dota"
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />} {id}
    </button>
  );
}

function Identity({ entry }: { entry: AdminQueueEntry }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={entry.name.slice(0, 2).toUpperCase()} size="md" />
      <div className="min-w-0 space-y-1">
        <p className="truncate text-sm font-medium text-text-display">
          {entry.name}
          {entry.steamPersona && entry.steamPersona !== entry.name && <span className="text-text-muted"> · Steam {entry.steamPersona}</span>}
        </p>
        <p className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
          {entry.dotaFriendId && <CopyId id={entry.dotaFriendId} />}
          {entry.steamProfileUrl && (
            <a href={entry.steamProfileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-2 hover:underline">
              perfil Steam <ExternalLink size={11} aria-hidden="true" />
            </a>
          )}
          {entry.noShows > 0 && <span className="text-warning">não apareceu {entry.noShows}x</span>}
          {entry.carriedOver && <span className="text-gold">de live anterior</span>}
          {entry.boughtOffline && <span className="text-gold">comprou fora da live</span>}
          {entry.battlepass && <span className="text-gold">Battlepass</span>}
          {entry.courtesy && <span className="text-gold">cortesia</span>}
          <span>{entry.lastTurnAt ? `última vez na party ${PAID_AT.format(new Date(entry.lastTurnAt))}` : "nunca jogou na party"}</span>
        </p>
      </div>
    </div>
  );
}

/** Menos e mais uma partida: soma ou tira do que a pessoa tem para jogar (cortesia, Battlepass ou compra). */
function MatchesStepper({ entry, busy, act }: { entry: AdminQueueEntry; busy: boolean; act: RowAction }) {
  const left = entry.matches - entry.played;
  return (
    <span className="inline-flex items-center gap-1" title="Partidas que a pessoa ainda tem para jogar">
      <button type="button" disabled={busy || left <= 1} aria-label={`Tirar uma partida de ${entry.name}`} className={`${SECONDARY} px-2`} onClick={() => act("Uma partida a menos", () => ajustarPartidas(entry.id, -1))}>
        <Minus size={14} aria-hidden="true" />
      </button>
      <span className="w-14 text-center text-xs tabular-nums text-text-body">{left} a jogar</span>
      <button type="button" disabled={busy || entry.matches >= 20} aria-label={`Dar mais uma partida a ${entry.name}`} className={`${SECONDARY} px-2`} onClick={() => act("Uma partida a mais", () => ajustarPartidas(entry.id, 1))}>
        <Plus size={14} aria-hidden="true" />
      </button>
    </span>
  );
}

export function PartyRow({ entry, busy, act, noShow }: {
  entry: AdminQueueEntry;
  busy: boolean;
  act: RowAction;
  noShow: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Identity entry={entry} />
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-play-primary">partida {Math.min(entry.played + 1, entry.matches)} de {entry.matches}</span>
        <MatchesStepper entry={entry} busy={busy} act={act} />
        <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Não apareceu", () => noShow(entry.id))}>Não apareceu</button>
      </div>
    </li>
  );
}

export function WaitingRow({ entry, busy, canCall, act, callThis, remove }: {
  entry: AdminQueueEntry;
  busy: boolean;
  /** Só com a live no ar dá para chamar; tirar da fila vale sempre. */
  canCall: boolean;
  act: RowAction;
  callThis: (id: string) => Promise<{ ok: boolean; error?: string }>;
  remove: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span className="w-6 shrink-0 text-right font-display text-xl tabular-nums text-text-muted">{entry.position}</span>
        <Identity entry={entry} />
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="text-xs text-text-muted">
          {entry.matches} partida{entry.matches > 1 ? "s" : ""} · {entry.battlepass || entry.courtesy ? "entrou" : "pagou"} {PAID_AT.format(new Date(entry.queuedAt))}
        </span>
        <MatchesStepper entry={entry} busy={busy} act={act} />
        <button type="button" disabled={busy || !canCall} className={SECONDARY} onClick={() => act("Chamar agora", () => callThis(entry.id))}>Chamar agora</button>
        <button
          type="button"
          disabled={busy}
          className={DANGER}
          onClick={() => {
            if (window.confirm(`Tirar ${entry.name} da fila? O reembolso, se houver, é à parte, no Mercado Pago.`)) act("Tirar da fila", () => remove(entry.id));
          }}
        >
          Tirar
        </button>
      </div>
    </li>
  );
}

function finishedLabel(item: AdminFinishedEntry): string {
  if (item.state === "concluido") return `jogou ${item.played} de ${item.matches}`;
  if (item.exit === "saiu") return `saiu da fila sozinho (${item.played} de ${item.matches})`;
  if (item.exit === "cancelado") return `pedido cancelado ou reembolsado (${item.played} de ${item.matches})`;
  return `tirado da fila (${item.played} de ${item.matches})`;
}

export function FinishedList({ items }: { items: AdminFinishedEntry[] }) {
  if (items.length === 0) return <p className="text-sm text-text-muted">Ninguém jogou nas últimas 12 horas.</p>;
  return (
    <ul className="divide-y divide-border-subtle text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-text-display">{item.name}</span>
          <span className="text-right text-xs text-text-muted">
            {finishedLabel(item)}
            {item.finishedAt && ` · ${TIME.format(new Date(item.finishedAt))}`}
            {item.refundCents > 0 && <span className="block text-warning">devolver {formatBRL(item.refundCents)} no Mercado Pago</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
