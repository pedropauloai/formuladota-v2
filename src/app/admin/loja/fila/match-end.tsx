"use client";

// "Partida terminou" em dois toques: o botão já procura a partida da party na OpenDota (funciona
// com o PPA numa smurf) e mostra o ID, o resultado e quem foi conferido; o PPA só confirma. Sem a
// partida, conta sem o ID ou cola outro.

import { useEffect, useState, type FormEvent } from "react";
import { Popover } from "@base-ui/react/popover";
import { CheckCircle2, CircleDashed, ExternalLink, Flag, Search, TriangleAlert } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { AdminQueueEntry } from "@/lib/loja/fila/admin";
import type { QueueLive } from "@/lib/loja/fila/model";
import { cn } from "@/lib/utils";
import { partidaTerminou } from "./actions";
import { previewPartida, type PartidaPreview } from "./mesa-actions";
import { OpButton, POPUP, since } from "./ui";
import { useAction, useNow } from "./use-console";

const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

export type Found = Extract<PartidaPreview, { ok: true }>;
const OFFLINE: PartidaPreview = { ok: false, error: "Sem conexão com o site agora. Conte sem o ID ou tente de novo." };

/** A partida que a OpenDota achou: ID, resultado e quem da party apareceu nela. */
export function FoundMatch({ match, party }: { match: Found; party: AdminQueueEntry[] }) {
  const now = useNow();
  const confirmed = new Set(match.confirmed);
  return (
    <div className="space-y-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={`https://www.opendota.com/matches/${match.matchId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-base font-semibold tabular-nums text-text-display underline-offset-2 hover:underline"
          >
            Partida {match.matchId} <ExternalLink size={14} aria-hidden="true" />
          </a>
          <p className="text-sm text-text-muted" suppressHydrationWarning>
            terminou às {TIME.format(new Date(match.endedAt))} · {since(match.endedAt, now)}
          </p>
        </div>
        {match.won !== null && (
          <span className={cn("font-display-condensed text-[1.75rem] uppercase leading-none", match.won ? "text-play-primary" : "text-error")}>
            {match.won ? "Vitória" : "Derrota"}
          </span>
        )}
      </div>
      {match.beforeLive && (
        <p className="flex gap-2 rounded-sm border border-warning/40 bg-warning/10 p-2.5 text-sm leading-relaxed text-warning">
          <TriangleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
          Essa partida terminou antes de a live abrir. Cole o ID certo abaixo.
        </p>
      )}
      <ul className="space-y-1.5">
        {party.map((p) => {
          const ok = confirmed.has(p.id);
          return (
            <li key={p.id} className="flex items-center gap-2.5 text-[15px]">
              <UserAvatar src={p.avatarUrl ?? undefined} alt={p.name} fallback={p.name.slice(0, 2).toUpperCase()} size="sm" />
              <span className="min-w-0 flex-1 truncate text-text-display">{p.name}</span>
              <span className={cn("inline-flex items-center gap-1.5 text-sm", ok ? "text-play-primary" : "text-text-faded")}>
                {ok ? <CheckCircle2 size={15} aria-hidden="true" /> : <CircleDashed size={15} aria-hidden="true" />}
                {ok ? "na partida" : "não aparece"}
              </span>
            </li>
          );
        })}
      </ul>
      {match.hidden > 0 && (
        <p className="text-sm text-text-muted">
          {match.hidden} do seu time com o perfil do Dota fechado.
        </p>
      )}
    </div>
  );
}

function MatchEndPanel({ live, party, onClose }: { live: QueueLive; party: AdminQueueEntry[]; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [manual, setManual] = useState("");
  const [preview, setPreview] = useState<{ query: string; result: PartidaPreview } | null>(null);
  const count = useAction();
  const noId = useAction();
  const loading = preview?.query !== query;

  useEffect(() => {
    let alive = true;
    void previewPartida(live.id, query)
      .catch(() => OFFLINE)
      .then((result) => {
        if (alive) setPreview({ query, result });
      });
    return () => {
      alive = false;
    };
  }, [live.id, query]);

  const lookUp = (e: FormEvent) => {
    e.preventDefault();
    if (manual.trim()) setQuery(manual.trim());
  };
  const result = loading ? null : preview?.result ?? null;
  const found = result?.ok ? result : null;
  const n = live.matchesDone + 1;

  return (
    <div data-fila-partida-previa>
      {loading ? (
        <div className="space-y-2 p-4" aria-live="polite">
          <p className="animate-pulse text-[15px] text-text-muted">Procurando a partida da party na OpenDota…</p>
          <div className="h-3 w-2/3 animate-pulse rounded-sm bg-white/[0.06]" />
          <div className="h-3 w-1/2 animate-pulse rounded-sm bg-white/[0.06]" />
        </div>
      ) : found ? (
        <FoundMatch match={found} party={party} />
      ) : (
        <p className="p-4 text-[15px] leading-relaxed text-text-body">{result && !result.ok ? result.error : ""}</p>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 p-3">
        <OpButton
          tone="go"
          size="sm"
          disabled={!found || found.beforeLive || noId.pending}
          pending={count.pending}
          onClick={() => found && count.run({ action: () => partidaTerminou(live.id, live.matchesDone, found.matchId), success: `Partida ${n} contada.`, onDone: onClose })}
          data-fila-contar-partida
        >
          Contar a partida {n}
        </OpButton>
        <OpButton
          tone="quiet"
          size="sm"
          disabled={count.pending}
          pending={noId.pending}
          onClick={() => noId.run({ action: () => partidaTerminou(live.id, live.matchesDone, ""), success: `Partida ${n} contada sem o ID.`, onDone: onClose })}
          data-fila-contar-sem-id
        >
          Contar sem o ID
        </OpButton>
      </div>
      <form onSubmit={lookUp} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={manual}
          onChange={(e) => setManual(e.target.value)}
          inputMode="numeric"
          placeholder="Outro ID ou link da partida"
          aria-label="Outro ID ou link da partida"
          className="h-9 min-w-0 flex-1 rounded-[var(--radius-button)] border border-white/10 bg-bg-deep px-2.5 text-sm tabular-nums text-text-display placeholder:text-text-faded focus:border-white/25 focus:outline-none"
        />
        <OpButton type="submit" size="sm" icon={<Search size={15} aria-hidden="true" />} disabled={!manual.trim() || loading}>
          Buscar
        </OpButton>
      </form>
    </div>
  );
}

interface MatchEndButtonProps {
  live: QueueLive;
  party: AdminQueueEntry[];
  tone: "go" | "neutral";
  size: "md" | "xl";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MatchEndButton({ live, party, tone, size, open, onOpenChange }: MatchEndButtonProps) {
  return (
    <Popover.Root open={open} onOpenChange={(next) => onOpenChange(next)}>
      <Popover.Trigger
        render={<OpButton tone={tone} size={size} kbd="T" icon={<Flag size={size === "xl" ? 18 : 15} aria-hidden="true" />} data-fila-partida-terminou />}
      >
        Partida {live.matchesDone + 1} terminou
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner side="bottom" align="end" sideOffset={8} className="z-[var(--z-system)]">
          <Popover.Popup className={cn(POPUP, "w-[420px] max-w-[calc(100vw-2rem)] p-0")}>
            {open && <MatchEndPanel live={live} party={party} onClose={() => onOpenChange(false)} />}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
