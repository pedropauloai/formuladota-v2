"use client";

// Histórico das partidas da party na mesa do Pedro: quando acabou, o ID com o link da OpenDota e
// quem jogou, com a marca de quem a OpenDota conferiu no time do PPA.

import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import type { HistoryMatch } from "@/lib/loja/fila/admin-history";
import { cn } from "@/lib/utils";

const DAY_TIME = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function Player({ p }: { p: HistoryMatch["players"][number] }) {
  const Icon = p.confirmed ? CheckCircle2 : CircleDashed;
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-xs", p.kind === "nao_apareceu" ? "border-warning/40 text-warning" : "border-border-subtle text-text-body")}
      title={p.kind === "nao_apareceu" ? "Não apareceu (a vez conta)" : p.confirmed ? "Conferido na OpenDota" : "Sem a conferência da OpenDota"}
    >
      <UserAvatar src={p.avatarUrl ?? undefined} alt={p.name} fallback={p.name.slice(0, 2).toUpperCase()} size="sm" />
      {p.name}
      {p.kind === "nao_apareceu" ? " · não apareceu" : <Icon size={13} aria-hidden="true" className={p.confirmed ? "text-play-primary" : "text-text-faded"} />}
    </span>
  );
}

export function MatchHistory({ items }: { items: HistoryMatch[] }) {
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4" data-fila-historico>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-xl uppercase tracking-wide text-text-display">Partidas registradas</h2>
        <p className="text-xs text-text-muted">Verde: a OpenDota mostrou a pessoa no seu time. Vale com a sua conta principal ou com smurf.</p>
      </header>
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-muted">Nenhuma partida registrada ainda. Use &ldquo;Partida terminou&rdquo; com o ID da partida.</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {items.map((m) => (
            <li key={m.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-36 shrink-0 text-sm text-text-display first-letter:uppercase">{DAY_TIME.format(new Date(m.playedAt))}</span>
              {m.matchId ? (
                <a
                  href={`https://www.opendota.com/matches/${m.matchId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-36 shrink-0 items-center gap-1 font-mono text-xs text-text-body underline-offset-2 hover:underline"
                  data-fila-historico-partida={m.matchId}
                >
                  {m.matchId} <ExternalLink size={11} aria-hidden="true" />
                </a>
              ) : (
                <span className="w-36 shrink-0 text-xs text-text-muted">sem o ID</span>
              )}
              <span className="flex flex-wrap gap-2">
                {m.players.map((p) => <Player key={`${m.key}-${p.userId}`} p={p} />)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
