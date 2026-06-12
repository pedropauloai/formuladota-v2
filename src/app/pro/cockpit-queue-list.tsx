"use client";

// CockpitQueueList — lista densa da FILA AO VIVO (coluna central do cockpit).
//
// Ordenada por LRU (vem pronta do server). Os primeiros N (próxima PT) ficam
// em seção destacada "PRÓXIMA PT"; o resto em "NA ESPERA". Cada linha:
// #posição · checkbox de seleção · avatar quadrado sm · nome · medalha HONOR
// sm · MMR gold tabular · tempo de espera · botão remover [✕].
//
// Componente de apresentação + remove: a seleção (quem entra na PT) é estado
// do ProCockpit pai; removeFromQueue é a única mutação disparada daqui.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Share2, Timer, X } from "lucide-react";
import { removeFromQueue } from "@/app/admin/pros/actions";
import { UserAvatar } from "@/components/ui/avatar";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { EmptyState } from "@/components/ui/empty-state";
import { usePrompt } from "@/components/ui/confirm";
import { cn } from "@/lib/utils";
import type { CockpitQueueEntry } from "./cockpit-data";

interface QueueListProps {
  queue: CockpitQueueEntry[];
  /** Capacidade da próxima PT (min(fila_max_vagas, 4)). */
  maxPT: number;
  /** Entry ids selecionadas pra próxima PT (estado do pai). */
  selected: Set<string>;
  onToggleSelect: (entryId: string) => void;
  /** PT em curso esconde os checkboxes (não dá pra iniciar outra). */
  selectable: boolean;
  /** Relógio compartilhado do cockpit. */
  nowMs: number;
}

export function CockpitQueueList({
  queue,
  maxPT,
  selected,
  onToggleSelect,
  selectable,
  nowMs,
}: QueueListProps) {
  const router = useRouter();
  const prompt = usePrompt();
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleRemove(entry: CockpitQueueEntry) {
    const reason = await prompt({
      title: `Remover ${entry.username ?? "aluno"} da fila`,
      message: "Informe o motivo da remoção (será logado). Ficha fica intacta.",
      placeholder: "Ex: aluno desconectou, comportamento tóxico, etc",
      defaultValue: "Sem motivo específico",
      required: true,
      confirmLabel: "Remover",
      variant: "destructive",
    });
    if (reason === null) return; // cancelou
    if (reason.trim().length < 3) {
      setError("Motivo precisa ter pelo menos 3 caracteres.");
      return;
    }
    setError(null);
    setRemovingId(entry.entryId);
    startTransition(async () => {
      const res = await removeFromQueue(entry.entryId, reason);
      setRemovingId(null);
      if (!res.success) setError(res.error);
      else router.refresh();
    });
  }

  if (queue.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
        <EmptyState
          icon={Share2}
          title="Fila aberta, ninguém na pista ainda"
          description="Compartilhe sua fila — todo aluno que entrar aparece aqui em tempo real."
          principle="random"
          action={
            <a
              href="/ranked-com-pro"
              className="inline-flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:text-text-display"
            >
              Ver minha fila em /ranked-com-pro →
            </a>
          }
        />
      </div>
    );
  }

  const proximaPT = queue.slice(0, maxPT);
  const naEspera = queue.slice(maxPT);

  return (
    <div className="min-h-0 flex-1 xl:overflow-y-auto">
      {error && (
        <p className="px-4 pt-2 font-mono-ui text-sm text-error">{error}</p>
      )}

      {/* Seção PRÓXIMA PT — os primeiros da fila, visualmente destacados */}
      <SectionLabel highlight>
        Próxima PT ({proximaPT.length}/{maxPT})
      </SectionLabel>
      <ul className="border-y border-brand-primary/25 bg-brand-primary/[0.04]">
        {proximaPT.map((entry, i) => (
          <QueueRow
            key={entry.entryId}
            entry={entry}
            position={i + 1}
            checked={selected.has(entry.entryId)}
            selectable={selectable}
            onToggle={() => onToggleSelect(entry.entryId)}
            onRemove={() => handleRemove(entry)}
            removing={removingId === entry.entryId}
            nowMs={nowMs}
          />
        ))}
      </ul>

      {/* Seção NA ESPERA — resto da fila */}
      {naEspera.length > 0 && (
        <>
          <SectionLabel>Na espera ({naEspera.length})</SectionLabel>
          <ul>
            {naEspera.map((entry, i) => (
              <QueueRow
                key={entry.entryId}
                entry={entry}
                position={maxPT + i + 1}
                checked={selected.has(entry.entryId)}
                selectable={selectable}
                onToggle={() => onToggleSelect(entry.entryId)}
                onRemove={() => handleRemove(entry)}
                removing={removingId === entry.entryId}
                nowMs={nowMs}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SectionLabel — cabeçalho de seção (Teko condensed, denso)
// ---------------------------------------------------------------------------

function SectionLabel({
  children,
  highlight = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <p
      className={cn(
        "px-4 pb-1 pt-3 font-display-condensed text-base uppercase leading-none tracking-wider",
        highlight ? "text-brand-primary" : "text-text-faded"
      )}
    >
      {children}
    </p>
  );
}

// ---------------------------------------------------------------------------
// QueueRow — linha densa (~48px) estilo cliente Dota 2
// ---------------------------------------------------------------------------

interface RowProps {
  entry: CockpitQueueEntry;
  position: number;
  checked: boolean;
  selectable: boolean;
  onToggle: () => void;
  onRemove: () => void;
  removing: boolean;
  nowMs: number;
}

function QueueRow({
  entry,
  position,
  checked,
  selectable,
  onToggle,
  onRemove,
  removing,
  nowMs,
}: RowProps) {
  const name = entry.username ?? "Anônimo";
  const waitingMinutes = Math.max(
    0,
    Math.floor((nowMs - new Date(entry.joinedAt).getTime()) / 60000)
  );

  return (
    <li
      className={cn(
        "flex h-12 items-center gap-3 border-l-2 px-3 transition-colors",
        checked && selectable
          ? "border-brand-primary bg-brand-primary/10"
          : "border-transparent hover:bg-bg-elevated/40"
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="size-4 shrink-0 cursor-pointer accent-brand-primary"
          aria-label={`Selecionar ${name} pra próxima PT`}
        />
      )}

      <span className="w-6 shrink-0 text-right font-mono text-sm tabular-nums text-text-faded">
        #{position}
      </span>

      <UserAvatar size="sm" src={entry.avatarUrl ?? undefined} alt={name} fallback={name.slice(0, 2)} />

      <span className="min-w-0 flex-1 truncate font-display text-sm font-semibold text-text-body">
        {name}
      </span>

      <HonorRankMedal rank={entry.honorRank} size="sm" />

      <span className="w-14 shrink-0 text-right font-display text-sm font-bold tabular-nums text-gold">
        {entry.mmr != null ? entry.mmr.toLocaleString("pt-BR") : "—"}
      </span>

      <span className="inline-flex w-16 shrink-0 items-center justify-end gap-1 font-mono text-sm tabular-nums text-text-muted">
        <Timer size={12} className="text-text-faded" aria-hidden="true" />
        {waitingMinutes}min
      </span>

      <button
        type="button"
        onClick={onRemove}
        disabled={removing}
        aria-label={`Remover ${name} da fila`}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-text-faded transition-colors hover:bg-error/15 hover:text-error disabled:opacity-50"
      >
        {removing ? (
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
        ) : (
          <X size={14} aria-hidden="true" />
        )}
      </button>
    </li>
  );
}
