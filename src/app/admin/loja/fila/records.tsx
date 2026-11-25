"use client";

// O que já aconteceu, em abas: as partidas registradas (ID, resultado de quem a OpenDota conferiu)
// e quem saiu da fila nas últimas 12 horas, com o que devolver no Mercado Pago.

import { Tabs } from "@base-ui/react/tabs";
import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { panel } from "@/components/v2";
import type { AdminFinishedEntry } from "@/lib/loja/fila/admin";
import type { HistoryMatch } from "@/lib/loja/fila/admin-history";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { formatBRL } from "@/lib/loja/money";

const DAY_TIME = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const TIME = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
const TAB = "h-12 px-1 text-[15px] text-text-muted outline-none transition-colors hover:text-text-display data-[selected]:text-text-display focus-visible:text-text-display";

function Matches({ items }: { items: HistoryMatch[] }) {
  if (items.length === 0) return <p className="py-10 text-center text-[15px] text-text-muted">Nenhuma partida registrada ainda.</p>;
  return (
    <ul className="divide-y divide-white/[0.05]" data-fila-historico>
      {items.map((m) => (
        <li key={m.key} className="grid grid-cols-[9.5rem_9rem_minmax(0,1fr)] items-center gap-x-4 py-3">
          <span className="text-sm text-text-display first-letter:uppercase">{DAY_TIME.format(new Date(m.playedAt))}</span>
          {m.matchId ? (
            <a
              href={`https://www.opendota.com/matches/${m.matchId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm tabular-nums text-text-body underline-offset-2 hover:text-text-display hover:underline"
              data-fila-historico-partida={m.matchId}
            >
              {m.matchId} <ExternalLink size={13} aria-hidden="true" />
            </a>
          ) : (
            <span className="text-sm text-text-faded">sem o ID</span>
          )}
          <span className="flex min-w-0 flex-wrap gap-1.5">
            {m.players.map((p) => (
              <span
                key={`${m.key}-${p.userId}`}
                title={p.confirmed ? "Conferido na OpenDota" : "Sem a conferência da OpenDota"}
                className="inline-flex h-8 items-center gap-2 rounded-sm border border-white/[0.08] pl-1 pr-2 text-sm text-text-body"
              >
                <UserAvatar src={p.avatarUrl ?? undefined} alt="" fallback={p.name.slice(0, 2).toUpperCase()} size="xs" />
                {p.name}
                {p.confirmed ? (
                  <CheckCircle2 size={14} aria-hidden="true" className="text-play-primary" />
                ) : (
                  <CircleDashed size={14} aria-hidden="true" className="text-text-faded" />
                )}
              </span>
            ))}
          </span>
        </li>
      ))}
    </ul>
  );
}

function finishedLabel(item: AdminFinishedEntry): string {
  const count = item.dayPass ? (item.played > 0 ? `vaga do dia, jogou ${item.played}` : "vaga do dia, não jogou") : `${item.played} de ${item.matches}`;
  if (item.state === "concluido") return item.dayPass ? `jogou ${item.played} na vaga do dia` : `jogou ${count}`;
  if (item.exit === "saiu") return `saiu sozinho (${count})`;
  if (item.exit === "cancelado") return `cancelado ou reembolsado (${count})`;
  return `tirado da fila (${count})`;
}

function FinishedWho({ item }: { item: AdminFinishedEntry }) {
  const who = (
    <>
      <UserAvatar src={item.avatarUrl ?? undefined} alt={item.name} fallback={item.name.slice(0, 2).toUpperCase()} size="xs" />
      <span className="truncate">{item.name}</span>
    </>
  );
  if (!item.userId) return <span className="flex min-w-0 items-center gap-2 text-text-display">{who}</span>;
  return (
    <UserHoverCard userId={item.userId} className="flex min-w-0 items-center gap-2 text-text-display">
      {who}
    </UserHoverCard>
  );
}

function Finished({ items }: { items: AdminFinishedEntry[] }) {
  if (items.length === 0) return <p className="py-10 text-center text-[15px] text-text-muted">Ninguém saiu da fila.</p>;
  return (
    <ul className="divide-y divide-white/[0.05] text-[15px]">
      {items.map((item) => (
        <li key={item.id} className="flex items-center justify-between gap-3 py-3">
          <FinishedWho item={item} />
          <span className="shrink-0 text-right text-sm text-text-muted">
            {finishedLabel(item)}
            {item.finishedAt && ` · ${TIME.format(new Date(item.finishedAt))}`}
            {item.refundCents > 0 && <span className="block text-warning">devolver {formatBRL(item.refundCents)} no Mercado Pago</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function Records({ history, finished }: { history: HistoryMatch[]; finished: AdminFinishedEntry[] }) {
  return (
    <Tabs.Root defaultValue="partidas" className={panel()}>
      <Tabs.List className="relative flex gap-6 border-b border-white/[0.06] px-5">
        <Tabs.Tab value="partidas" className={TAB}>
          Partidas registradas <span className="tabular-nums text-text-faded">{history.length}</span>
        </Tabs.Tab>
        <Tabs.Tab value="saidas" className={TAB}>
          Saíram da fila (12 h) <span className="tabular-nums text-text-faded">{finished.length}</span>
        </Tabs.Tab>
        <Tabs.Indicator className="absolute bottom-0 left-[var(--active-tab-left)] h-0.5 w-[var(--active-tab-width)] bg-gold transition-[left,width] duration-200" />
      </Tabs.List>
      <Tabs.Panel value="partidas" className="px-5">
        <Matches items={history} />
      </Tabs.Panel>
      <Tabs.Panel value="saidas" className="px-5">
        <Finished items={finished} />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
