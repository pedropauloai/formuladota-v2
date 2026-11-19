"use client";

// Quem está na party do Pedro agora e a fila com os próximos. Nome e avatar públicos (a página
// recebe só isso do servidor); a linha de quem está olhando ganha a marca "você".

import { useTranslations } from "next-intl";
import { UserAvatar } from "@/components/ui/avatar";
import type { PublicEntry, PublicQueue, PublicQueuedEntry } from "@/lib/loja/fila/model";

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

function Who({ entry, mine }: { entry: PublicEntry; mine: boolean }) {
  const t = useTranslations("fila");
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={initials(entry.name)} size="sm" />
      <span className="truncate text-sm font-medium text-text-display">{entry.name}</span>
      {mine && <span className="shrink-0 rounded-sm bg-gold/15 px-1.5 py-0.5 text-xs font-medium text-gold">{t("you")}</span>}
    </span>
  );
}

function Card({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border border-border-strong bg-bg-base p-4 md:p-5">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl uppercase leading-none tracking-wide text-text-display">{title}</h2>
        {aside && <span className="text-xs text-text-muted">{aside}</span>}
      </header>
      {children}
    </section>
  );
}

function QueueRow({ entry, mine }: { entry: PublicQueuedEntry; mine: boolean }) {
  const t = useTranslations("fila");
  return (
    <li className={`flex items-center gap-3 py-2 ${mine ? "rounded-sm bg-gold/5 px-2 -mx-2" : ""}`}>
      <span className="w-6 shrink-0 text-right font-display text-lg leading-none tabular-nums text-text-muted">{entry.position}</span>
      <Who entry={entry} mine={mine} />
      <span className="ml-auto shrink-0 text-right text-xs leading-tight text-text-muted">
        <span className="block">{entry.matchesUntilTurn === 0 ? t("queueNext") : t("queueIn", { count: entry.matchesUntilTurn })}</span>
        <span className="block text-text-faded">{t("queueMatches", { count: entry.matches })}</span>
      </span>
    </li>
  );
}

export function PartyRoster({ queue, mine }: { queue: PublicQueue; mine: ReadonlySet<string> }) {
  const t = useTranslations("fila");
  const onAir = queue.live?.status === "ao_vivo";
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card title={t("partyTitle")}>
        {queue.party.length === 0 ? (
          <p className="text-sm text-text-muted">{onAir ? t("partyEmptyOnAir") : t("partyEmptyOff")}</p>
        ) : (
          <ul className="divide-y divide-border-subtle">
            {queue.party.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2">
                <Who entry={entry} mine={mine.has(entry.id)} />
                <span className="ml-auto shrink-0 text-xs text-play-primary">
                  {t("partyMatch", { current: Math.min(entry.played + 1, entry.matches), total: entry.matches })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title={t("queueTitle")} aside={t("queueCount", { count: queue.queue.length })}>
        {queue.queue.length === 0 ? (
          <p className="text-sm text-text-muted">{t("queueEmpty")}</p>
        ) : (
          <ol className="divide-y divide-border-subtle">
            {queue.queue.map((entry) => (
              <QueueRow key={entry.id} entry={entry} mine={mine.has(entry.id)} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
