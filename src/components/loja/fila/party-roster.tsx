"use client";

// Quem está na party do Pedro agora e a fila com os próximos, no design 2.0. A party aparece como
// a barra de grupo do cliente (o PPA, quem está jogando e as vagas); embaixo, a lista com a partida
// de cada um. Nome e avatar públicos (a página recebe só isso do servidor); a linha de quem está
// olhando ganha a marca "você".

import { useTranslations } from "next-intl";
import { Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/ui/avatar";
import { Panel, PartyLineup, plate } from "@/components/v2";
import { OWNER } from "@/lib/loja/owner";
import { partySeatsView, type PublicEntry, type PublicQueue, type PublicQueuedEntry } from "@/lib/loja/fila/model";

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** Avatar e nome com a linha de detalhe embaixo: o nome fica com a largura toda do cartão. */
function Who({ entry, mine, detail }: { entry: PublicEntry; mine: boolean; detail: React.ReactNode }) {
  const t = useTranslations("fila");
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2.5">
      <UserAvatar src={entry.avatarUrl ?? undefined} alt={entry.name} fallback={initials(entry.name)} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-text-display">{entry.name}</span>
          {entry.battlepass && (
            <span data-fila-selo className={cn(plate({ kind: "tag", tone: "neutral" }), "shrink-0 gap-1")} title={t("battlepass.badgeTitle")}>
              <Crown size={11} className="text-gold" aria-hidden="true" /> Battlepass
            </span>
          )}
          {mine && <span className={cn(plate({ kind: "tag", tone: "gold" }), "shrink-0")}>{t("you")}</span>}
        </span>
        <span className="block truncate text-xs text-text-muted">{detail}</span>
      </span>
    </span>
  );
}

function Card({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <Panel as="section" className="h-full space-y-3 p-4 md:p-5" wrapperClassName="h-full">
      <header className="flex items-baseline justify-between gap-3 border-b-2 border-brand-primary/70 pb-2">
        <h2 className="font-display-condensed text-[1.9rem] uppercase leading-none text-text-display">{title}</h2>
        {aside && <span className="text-xs text-text-muted">{aside}</span>}
      </header>
      {children}
    </Panel>
  );
}

function QueueRow({ entry, mine }: { entry: PublicQueuedEntry; mine: boolean }) {
  const t = useTranslations("fila");
  const turn = entry.matchesUntilTurn === 0 ? t("queueNext") : t("queueIn", { count: entry.matchesUntilTurn });
  return (
    <li className={cn("flex items-center gap-3 py-2", mine && "-mx-2 rounded-sm bg-gold/5 px-2")}>
      <span className="w-7 shrink-0 text-right font-display-condensed text-[1.6rem] leading-none text-gold">{entry.position}</span>
      <Who entry={entry} mine={mine} detail={`${turn} · ${t("queueMatches", { count: entry.matches })}`} />
    </li>
  );
}

function PartyCard({ queue, mine }: { queue: PublicQueue; mine: ReadonlySet<string> }) {
  const t = useTranslations("fila");
  const tl = useTranslations("loja");
  const onAir = queue.live?.status === "ao_vivo";
  const seats = Math.min(4, Math.max(1, queue.live?.seatsPerMatch ?? 4));
  // Lugar livre que já é de quem está com a vez não aparece como vaga, e as vagas à venda não
  // passam das vagas abertas da fila: o mesmo número dos overlays da live.
  const view = queue.live ? partySeatsView(queue) : null;
  const held = view ? [...Array<string>(view.reserved).fill(t("queueNext")), ...Array<string>(view.closed).fill(t("partySeatClosed"))] : [];
  // Convida só com live no ar, vaga à venda na party e quem olha ainda fora da fila.
  const viewerIn = [...queue.party, ...queue.queue].some((e) => mine.has(e.id));
  const invite = onAir && (view?.forSale ?? 0) > 0 && !viewerIn;
  return (
    <Card title={t("partyTitle")}>
      <PartyLineup
        owner={{ avatarUrl: OWNER.avatar, label: OWNER.short }}
        members={queue.party.map((e) => ({ label: e.name, avatarUrl: e.avatarUrl }))}
        youLabel={tl("partyYou")}
        openLabel={tl("partyOpen")}
        ariaLabel={tl("partyAria", { nick: OWNER.nick })}
        seats={seats}
        invite={invite}
        held={held}
        size={48}
        className="py-1"
      />
      {queue.party.length === 0 ? (
        <p className="text-sm text-text-muted">{onAir ? t("partyEmptyOnAir") : t("partyEmptyOff")}</p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {queue.party.map((entry) => (
            <li key={entry.id} className="flex items-center gap-3 py-2">
              <Who
                entry={entry}
                mine={mine.has(entry.id)}
                detail={<span className="text-play-primary">{t("partyMatch", { current: Math.min(entry.played + 1, entry.matches), total: entry.matches })}</span>}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PartyRoster({ queue, mine }: { queue: PublicQueue; mine: ReadonlySet<string> }) {
  const t = useTranslations("fila");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PartyCard queue={queue} mine={mine} />
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
