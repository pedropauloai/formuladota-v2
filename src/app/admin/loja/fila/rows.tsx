"use client";

// Linhas do painel da fila: quem está na party (com o ID do Dota para o convite) e quem espera.

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminFinishedEntry, AdminQueueEntry } from "@/lib/loja/fila/admin";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export type RowAction = (label: string, action: () => Promise<{ ok: boolean; error?: string }>) => void;

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
        </p>
      </div>
    </div>
  );
}

export function PartyRow({ entry, busy, act, played, noShow }: {
  entry: AdminQueueEntry;
  busy: boolean;
  act: RowAction;
  played: (id: string) => Promise<{ ok: boolean; error?: string }>;
  noShow: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <Identity entry={entry} />
      <div className="flex shrink-0 items-center gap-2">
        <span className="text-xs text-play-primary">partida {Math.min(entry.played + 1, entry.matches)} de {entry.matches}</span>
        <button type="button" disabled={busy} className={PRIMARY} onClick={() => act("Jogou", () => played(entry.id))}>Jogou</button>
        <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Não apareceu", () => noShow(entry.id))}>Não apareceu</button>
      </div>
    </li>
  );
}

export function WaitingRow({ entry, busy, act, callThis, remove }: {
  entry: AdminQueueEntry;
  busy: boolean;
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
          {entry.matches} partida{entry.matches > 1 ? "s" : ""} · pagou {TIME.format(new Date(entry.queuedAt))}
        </span>
        <button type="button" disabled={busy} className={SECONDARY} onClick={() => act("Chamar agora", () => callThis(entry.id))}>Chamar agora</button>
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

export function FinishedList({ items }: { items: AdminFinishedEntry[] }) {
  if (items.length === 0) return <p className="text-sm text-text-muted">Ninguém jogou nas últimas 12 horas.</p>;
  return (
    <ul className="divide-y divide-border-subtle text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <span className="text-text-display">{item.name}</span>
          <span className="text-xs text-text-muted">
            {item.state === "concluido" ? `jogou ${item.played} de ${item.matches}` : `saiu da fila (${item.played} de ${item.matches})`}
            {item.finishedAt && ` · ${TIME.format(new Date(item.finishedAt))}`}
          </span>
        </li>
      ))}
    </ul>
  );
}
