"use client";

// Peças da mesa de operação da fila: botões, copiar o ID do Dota, menos e mais partidas, a
// etiqueta de origem da vaga e o tempo relativo ("há 12 min"). Instrumento, não vitrine.

import { useState } from "react";
import { Check, Copy, Minus, Plus } from "lucide-react";
import type { AdminFinishedEntry, AdminQueueEntry } from "@/lib/loja/fila/admin";
import { formatBRL } from "@/lib/loja/money";
import { cn } from "@/lib/utils";
import { ajustarPartidas } from "./cortesia-actions";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const DAY_TIME = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export type RowAction = (label: string, action: () => Promise<{ ok: boolean; error?: string; message?: string }>) => void;

const BUTTON = "inline-flex items-center justify-center gap-1.5 rounded-sm border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-40";
export const PRIMARY = `${BUTTON} border-play-primary bg-play-primary text-bg-deep hover:bg-play-primary-hover`;
export const SECONDARY = `${BUTTON} border-border-strong text-text-display hover:border-text-muted`;
export const DANGER = `${BUTTON} border-error/50 text-error hover:bg-error/10`;

/** Tecla de atalho mostrada no botão. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded-sm border border-current/40 px-1 font-mono text-[0.65rem] leading-4 opacity-70">{children}</kbd>;
}

/** "há 12 min", "há 3 h"; passou de um dia, a data e a hora. */
export function since(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  if (minutes < 24 * 60) return `há ${Math.floor(minutes / 60)} h`;
  return DAY_TIME.format(new Date(iso));
}

export function CopyId({ id, large = false }: { id: string; large?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async (e) => {
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(id);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border font-mono tabular-nums text-text-body hover:border-text-muted",
        copied ? "border-play-primary text-play-primary" : "border-border-subtle",
        large ? "px-2.5 py-1.5 text-sm" : "px-1.5 py-0.5 text-xs"
      )}
      title="Copiar o ID do Dota para convidar"
    >
      {copied ? <Check size={large ? 14 : 12} aria-hidden="true" /> : <Copy size={large ? 14 : 12} aria-hidden="true" />}
      {copied ? "copiado" : id}
    </button>
  );
}

type Origin = "pedido" | "battlepass" | "cortesia";

export function originOf(entry: AdminQueueEntry): Origin {
  if (entry.courtesy) return "cortesia";
  return entry.battlepass ? "battlepass" : "pedido";
}

const ORIGIN: Record<Origin, { label: string; className: string }> = {
  pedido: { label: "Pagou", className: "border-gold/50 text-gold" },
  battlepass: { label: "Battlepass", className: "border-brand-primary/60 text-brand-primary" },
  cortesia: { label: "Cortesia", className: "border-play-primary/50 text-play-primary" },
};

export function OriginBadge({ entry }: { entry: AdminQueueEntry }) {
  const origin = ORIGIN[originOf(entry)];
  return <span className={cn("inline-flex rounded-sm border px-1.5 py-0.5 text-[0.7rem] font-medium uppercase tracking-wide", origin.className)}>{origin.label}</span>;
}

/** Menos e mais uma partida: soma ou tira do que a pessoa tem para jogar (cortesia, Battlepass ou compra). */
export function MatchesStepper({ entry, busy, act }: { entry: AdminQueueEntry; busy: boolean; act: RowAction }) {
  const left = entry.matches - entry.played;
  const step = "inline-flex size-7 items-center justify-center rounded-sm border border-border-strong text-text-display hover:border-text-muted disabled:opacity-30";
  return (
    <span className="inline-flex items-center gap-1" title="Partidas que a pessoa ainda tem para jogar" onClick={(e) => e.stopPropagation()}>
      <button type="button" disabled={busy || left <= 1} aria-label={`Tirar uma partida de ${entry.name}`} className={step} onClick={() => act("Uma partida a menos", () => ajustarPartidas(entry.id, -1))}>
        <Minus size={13} aria-hidden="true" />
      </button>
      <span className="w-14 text-center text-xs tabular-nums text-text-body">{left} a jogar</span>
      <button type="button" disabled={busy || entry.matches >= 20} aria-label={`Dar mais uma partida a ${entry.name}`} className={step} onClick={() => act("Uma partida a mais", () => ajustarPartidas(entry.id, 1))}>
        <Plus size={13} aria-hidden="true" />
      </button>
    </span>
  );
}

function finishedLabel(item: AdminFinishedEntry): string {
  if (item.state === "concluido") return `jogou ${item.played} de ${item.matches}`;
  if (item.exit === "saiu") return `saiu sozinho (${item.played} de ${item.matches})`;
  if (item.exit === "cancelado") return `cancelado ou reembolsado (${item.played} de ${item.matches})`;
  return `tirado da fila (${item.played} de ${item.matches})`;
}

export function FinishedList({ items }: { items: AdminFinishedEntry[] }) {
  if (items.length === 0) return <p className="text-sm text-text-muted">Ninguém jogou nas últimas 12 horas.</p>;
  return (
    <ul className="divide-y divide-border-subtle text-sm">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-2">
          <span className="truncate text-text-display">{item.name}</span>
          <span className="shrink-0 text-right text-xs text-text-muted">
            {finishedLabel(item)}
            {item.finishedAt && ` · ${TIME.format(new Date(item.finishedAt))}`}
            {item.refundCents > 0 && <span className="block text-warning">devolver {formatBRL(item.refundCents)} no Mercado Pago</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
