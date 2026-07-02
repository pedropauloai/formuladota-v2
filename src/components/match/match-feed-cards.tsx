// Cards do feed de partidas (/partidas). Server components (só links, sem estado).
//   HistoryMatchCard → partida realizada: heróis 5×5 + placar + resultado.
//   LiveMatchCard    → "acontecendo agora": jogadores por time + AO VIVO (sem herói).

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Clock, Radio } from "lucide-react";
import { getHeroById } from "@/lib/queries/heroes";
import { UserAvatar } from "@/components/ui/avatar";
import type { HistoryMatch, LiveMatch } from "@/lib/queries/matches-feed";

function HeroIcon({ heroId }: { heroId: number | null }) {
  const hero = heroId ? getHeroById(heroId) : null;
  if (!hero) {
    return <span className="size-8 shrink-0 rounded-sm bg-bg-elevated" aria-hidden="true" />;
  }
  return (
    <Image
      src={hero.image_icon}
      alt={hero.name_pt}
      title={hero.name_pt}
      width={32}
      height={32}
      unoptimized
      className="size-8 shrink-0 rounded-sm border border-border-subtle object-cover"
    />
  );
}

export function HistoryMatchCard({ match }: { match: HistoryMatch }) {
  const radiant = match.players.filter((p) => p.team === "radiant");
  const dire = match.players.filter((p) => p.team === "dire");
  const radiantWin = match.radiantWin;
  const dateStr = match.date
    ? new Date(match.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
    : null;

  return (
    <Link
      href={`/partida/historico/${match.dotaMatchId}`}
      className="block rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-3 transition-colors hover:border-border-brand"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Iluminados (heróis) */}
        <div className="flex flex-1 items-center justify-end gap-1">
          {radiant.map((p, i) => (
            <HeroIcon key={`r${i}`} heroId={p.heroId} />
          ))}
        </div>

        {/* Placar central */}
        <div className="shrink-0 text-center">
          <div className="flex items-center gap-1.5 font-display text-xl font-bold tabular-nums">
            <span className={radiantWin ? "text-[#00C466]" : "text-text-muted"}>
              {match.radiantScore ?? 0}
            </span>
            <span className="text-text-faded">:</span>
            <span className={radiantWin === false ? "text-brand-primary" : "text-text-muted"}>
              {match.direScore ?? 0}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 font-mono text-[0.65rem] tabular-nums text-text-faded">
            {dateStr && <span>{dateStr}</span>}
            {match.durationMin != null && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="size-3" aria-hidden="true" />
                {match.durationMin}min
              </span>
            )}
          </div>
        </div>

        {/* Temidos (heróis) */}
        <div className="flex flex-1 items-center justify-start gap-1">
          {dire.map((p, i) => (
            <HeroIcon key={`d${i}`} heroId={p.heroId} />
          ))}
        </div>
      </div>
    </Link>
  );
}

export function LiveMatchCard({ match }: { match: LiveMatch }) {
  const radiant = match.players.filter((p) => p.team === "radiant");
  const dire = match.players.filter((p) => p.team === "dire");

  const Team = ({ players, align }: { players: LiveMatch["players"]; align: "end" | "start" }) => (
    <div className={`flex flex-1 flex-wrap items-center gap-1.5 ${align === "end" ? "justify-end" : "justify-start"}`}>
      {players.map((p, i) => (
        <span key={i} title={p.name} className="inline-flex items-center gap-1">
          <UserAvatar src={p.avatar ?? undefined} alt={p.name} fallback={p.name.slice(0, 2).toUpperCase()} size="sm" />
        </span>
      ))}
    </div>
  );

  return (
    <Link
      href={`/partida/${match.dotaMatchId}`}
      className="block rounded-[var(--radius-md)] border border-play-primary/40 bg-play-primary/5 p-3 transition-colors hover:border-play-primary"
    >
      <div className="mb-2 flex items-center justify-center gap-2">
        <span className="relative flex size-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-play-primary opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-play-primary" />
        </span>
        <span className="font-display text-xs font-bold uppercase tracking-[0.2em] text-play-primary">
          Ao vivo
        </span>
        <Radio size={12} className="text-play-primary/80" aria-hidden="true" />
      </div>
      <div className="flex items-center justify-between gap-3">
        <Team players={radiant} align="end" />
        <span className="shrink-0 font-display text-sm font-bold uppercase tracking-wide text-text-faded">
          vs
        </span>
        <Team players={dire} align="start" />
      </div>
    </Link>
  );
}
