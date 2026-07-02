// Cards do feed de partidas (/partidas). Server components (só links, sem estado).
//   HistoryMatchCard → partida realizada: por jogador, herói + avatar + ±MMR, 5×5.
//   LiveMatchCard    → "acontecendo agora": jogadores por time + AO VIVO (sem herói).

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Clock, Radio } from "lucide-react";
import { getHeroById } from "@/lib/queries/heroes";
import { UserAvatar } from "@/components/ui/avatar";
import type { HistoryMatch, HistoryPlayer, LiveMatch } from "@/lib/queries/matches-feed";

// Chip de jogador: o AVATAR é o destaque (identidade = o produto; anti-anonimato),
// com o herói como badge no canto + o nick e o ±MMR embaixo.
function PlayerChip({ player }: { player: HistoryPlayer }) {
  const hero = player.heroId ? getHeroById(player.heroId) : null;
  const mmr = player.mmrChange;
  return (
    <span
      className="flex w-14 shrink-0 flex-col items-center gap-1"
      title={`${player.name}${hero ? ` · ${hero.name_pt}` : ""}`}
    >
      <span className="relative block size-14">
        {/* Avatar do jogador — elemento principal (quadrado, padrão Steam/Dota). */}
        {player.avatar ? (
          <Image
            src={player.avatar}
            alt={player.name}
            width={56}
            height={56}
            unoptimized
            className="size-14 rounded-sm border border-border-subtle object-cover"
          />
        ) : (
          <span className="flex size-14 items-center justify-center rounded-sm border border-border-subtle bg-bg-elevated font-display text-sm font-bold text-text-muted">
            {player.name.slice(0, 2).toUpperCase()}
          </span>
        )}
        {/* Herói — badge secundário no canto inferior direito. */}
        {hero && (
          <span className="absolute -bottom-1 -right-1 rounded-sm ring-1 ring-bg-deep">
            <Image
              src={hero.image_icon}
              alt={hero.name_pt}
              width={24}
              height={24}
              unoptimized
              className="size-6 rounded-sm object-cover"
            />
          </span>
        )}
      </span>
      <span className="block w-full truncate text-center font-display text-[0.65rem] font-medium leading-none text-text-body">
        {player.name}
      </span>
      {mmr != null ? (
        <span
          className={`font-display text-xs font-bold tabular-nums leading-none ${
            mmr >= 0 ? "text-play-primary" : "text-error"
          }`}
        >
          {mmr >= 0 ? `+${mmr}` : mmr}
        </span>
      ) : (
        <span className="text-xs leading-none text-text-faded">—</span>
      )}
    </span>
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
      className="block rounded-[var(--radius-md)] border border-border-subtle bg-bg-deep/70 p-3 backdrop-blur-sm transition-colors hover:border-border-brand"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Iluminados */}
        <div className="flex flex-1 items-start justify-end gap-1.5">
          {radiant.map((p, i) => (
            <PlayerChip key={`r${i}`} player={p} />
          ))}
        </div>

        {/* Placar central */}
        <div className="shrink-0 self-start text-center">
          <div className="flex items-center gap-1.5 font-display text-xl font-bold tabular-nums">
            <span className={radiantWin ? "text-[#00C466]" : "text-text-body"}>
              {match.radiantScore ?? 0}
            </span>
            <span className="text-text-faded">:</span>
            <span className={radiantWin === false ? "text-brand-primary" : "text-text-body"}>
              {match.direScore ?? 0}
            </span>
          </div>
          <div className="mt-0.5 flex items-center justify-center gap-1.5 font-mono text-[0.65rem] tabular-nums text-text-muted">
            {dateStr && <span>{dateStr}</span>}
            {match.durationMin != null && (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="size-3" aria-hidden="true" />
                {match.durationMin}min
              </span>
            )}
          </div>
        </div>

        {/* Temidos */}
        <div className="flex flex-1 items-start justify-start gap-1.5">
          {dire.map((p, i) => (
            <PlayerChip key={`d${i}`} player={p} />
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
    <div
      className={`flex flex-1 flex-wrap items-center gap-1.5 ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      {players.map((p, i) => (
        <UserAvatar
          key={i}
          src={p.avatar ?? undefined}
          alt={p.name}
          fallback={p.name.slice(0, 2).toUpperCase()}
          size="sm"
        />
      ))}
    </div>
  );

  return (
    <Link
      href={`/partida/${match.dotaMatchId}`}
      className="block rounded-[var(--radius-md)] border border-play-primary/40 bg-bg-deep/70 p-3 backdrop-blur-sm transition-colors hover:border-play-primary"
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
        <span className="shrink-0 font-display text-sm font-bold uppercase tracking-wide text-text-muted">
          vs
        </span>
        <Team players={dire} align="start" />
      </div>
    </Link>
  );
}
