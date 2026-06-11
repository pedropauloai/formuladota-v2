"use client";

// ProListRow / ProChip — itens de seleção do master-detail de /ranked-com-pro.
//
// ProListRow: linha DENSA (~48px) da coluna direita estilo cliente Dota 2:
//   avatar quadrado pequeno + nome + MMR em dourado + ocupação da próxima PT
//   ("3/4" com dot verde se fila aberta, cinza se fechada).
//   Linha selecionada: border-l-2 brand + bg sutil.
//
// ProChip: variante horizontal compacta pra telas < xl (faixa scroll-x no topo).
//
// Componentes puros de seleção — zero lógica de domínio.
// C14 — zero hex hardcoded; apenas tokens semânticos via Tailwind.

import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import type { ProWithQueue } from "@/lib/queries/pros";

export interface ProSelectItemProps {
  pro: ProWithQueue;
  selected: boolean;
  /** Viewer está na fila DESTE PRO — exibe marcador âmbar. */
  viewerInQueue: boolean;
  onSelect: () => void;
}

/** Ocupação da PRÓXIMA PT: slots ativos ocupados / capacidade (ex: 3/4). */
function occupancy(pro: ProWithQueue): { occupied: number; max: number } {
  const max = pro.coach.filaMaxVagas;
  return { occupied: Math.min(pro.entries.length, max), max };
}

/** Dot de status da fila + contagem "3/4" — compartilhado entre row e chip. */
function OccupancyBadge({ pro }: { pro: ProWithQueue }) {
  const { occupied, max } = occupancy(pro);
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums text-text-muted">
      <span
        className={cn(
          "size-1.5 rounded-full",
          pro.coach.filaAberta ? "bg-success" : "bg-text-faded"
        )}
        aria-hidden="true"
      />
      {occupied}/{max}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ProListRow — linha densa da lista master (coluna direita, xl+)
// ---------------------------------------------------------------------------

export function ProListRow({
  pro,
  selected,
  viewerInQueue,
  onSelect,
}: ProSelectItemProps) {
  const { coach } = pro;
  const name = coach.username ?? coach.slug;
  const offline = !coach.filaAberta;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex h-12 w-full items-center gap-3 border-l-2 px-3 text-left transition-colors",
        selected
          ? "border-brand-primary bg-bg-elevated/70"
          : "border-transparent hover:bg-bg-elevated/40"
      )}
    >
      <UserAvatar
        size="sm"
        src={coach.avatarUrl ?? undefined}
        alt={name}
        fallback={name.slice(0, 2)}
        className={cn(offline && "opacity-60 grayscale")}
      />

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate font-display text-sm font-semibold",
            selected ? "text-text-display" : "text-text-body"
          )}
        >
          {name}
        </span>
        {viewerInQueue && (
          /* Teko tem x-height baixo — text-sm aqui equivale a label minúscula */
          <span className="block font-display-condensed text-sm uppercase leading-none tracking-wider text-warning">
            você está nesta fila
          </span>
        )}
      </span>

      <span className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="font-display text-sm font-bold tabular-nums text-gold">
          {coach.mmrAtual != null ? coach.mmrAtual.toLocaleString("pt-BR") : "—"}
        </span>
        <OccupancyBadge pro={pro} />
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// ProChip — seleção horizontal compacta (telas < xl, faixa scroll-x no topo)
// ---------------------------------------------------------------------------

export function ProChip({
  pro,
  selected,
  viewerInQueue,
  onSelect,
}: ProSelectItemProps) {
  const { coach } = pro;
  const name = coach.username ?? coach.slug;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-sm border px-2.5 py-1.5 transition-colors",
        selected
          ? "border-brand-primary bg-bg-elevated"
          : "border-border-subtle bg-bg-base/60 hover:bg-bg-elevated/50",
        viewerInQueue && !selected && "border-warning/50"
      )}
    >
      <UserAvatar
        size="sm"
        src={coach.avatarUrl ?? undefined}
        alt={name}
        fallback={name.slice(0, 2)}
        className={cn(!coach.filaAberta && "opacity-60 grayscale")}
      />
      <span className="max-w-28 truncate font-display text-sm font-semibold text-text-body">
        {name}
      </span>
      <OccupancyBadge pro={pro} />
    </button>
  );
}
