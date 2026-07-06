// Cards do feed de partidas (/partidas). Server components (só links, sem estado).
//   HistoryMatchCard → partida realizada: por jogador, herói + avatar + ±MMR, 5×5.
//   LiveMatchCard    → "acontecendo agora": jogadores por time + AO VIVO (sem herói).

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Clock, Radio, Ban } from "lucide-react";
import { getHeroById } from "@/lib/queries/heroes";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { MvpBadge } from "@/components/ui/mvp-badge";
import { DotaRankMedal } from "@/components/ui/dota-rank-medal";
import { mmrToDotaRank } from "@/components/queue/queue-helpers";
import { mmrToTier } from "@/lib/mmr";
import type { HistoryMatch, HistoryPlayer, LiveMatch, LivePlayer } from "@/lib/queries/matches-feed";

// Chip de jogador: o AVATAR + NÍVEL da conta são o destaque (identidade = o produto;
// anti-anonimato). O herói é badge secundário (canto superior, longe do badge de
// nível que fica embaixo do anel). Nick + ±MMR embaixo.
function PlayerChip({ player, isMvp }: { player: HistoryPlayer; isMvp?: boolean }) {
  const hero = player.heroId ? getHeroById(player.heroId) : null;
  const mmr = player.mmrChange;
  return (
    <span
      className="flex w-16 shrink-0 flex-col items-center gap-0.5"
      title={`${player.name}${isMvp ? " · MVP" : ""}${player.banned ? " · BANIDO" : ""}${hero ? ` · ${hero.name_pt}` : ""}`}
    >
      <span className={`relative isolate ${player.banned ? "opacity-90" : ""}`}>
        {/* Avatar + anel de XP com o NÍVEL da conta (identidade, sempre com o jogador). */}
        <XpAvatarRing
          src={player.avatar ?? undefined}
          alt={player.name}
          fallback={player.name.slice(0, 2).toUpperCase()}
          level={player.level}
          pct={player.xpPct}
          size={44}
        />
        {/* Herói — badge secundário no canto superior direito. */}
        {hero && (
          <span className="absolute -right-1 top-0 rounded-sm">
            <Image
              src={hero.image_icon}
              alt={hero.name_pt}
              width={22}
              height={22}
              unoptimized
              className="size-[22px] rounded-sm object-cover"
            />
          </span>
        )}
        {/* Marca de BANIDO — accountability pública (Mural da Vergonha). */}
        {player.banned && <BannedMark />}
        {/* MVP — selo "MVP" (SVG vermelho+dourado, sem WebGL) no topo do avatar. */}
        {isMvp && <MvpBadge />}
      </span>
      {/* Medalha do rank FormulaDota (representa o MMR atual). */}
      {player.mmr != null && (
        <DotaRankMedal
          rank={mmrToDotaRank(player.mmr)}
          stars={mmrToTier(player.mmr).stars}
          variant="formuladota"
          size="sm"
          tooltip={false}
          className="mt-1"
        />
      )}
      <span
        className={`mt-0.5 block w-full truncate text-center font-display text-[0.65rem] font-medium leading-none ${
          player.banned ? "text-error line-through" : "text-text-body"
        }`}
      >
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

/** Selo de BANIDO sobre o avatar (canto inferior esquerdo, longe do herói). */
function BannedMark() {
  return (
    <span
      className="absolute -bottom-0.5 -left-1 flex size-[18px] items-center justify-center rounded-sm border border-bg-deep bg-error text-bg-deep shadow"
      title="Banido"
      aria-label="Banido"
    >
      <Ban className="size-3" strokeWidth={3} aria-hidden="true" />
    </span>
  );
}

/** Barra central com a média de MMR de cada time (favorito destacado em dourado). */
function TeamAvgRow({ radiantAvg, direAvg }: { radiantAvg: number | null; direAvg: number | null }) {
  if (radiantAvg == null || direAvg == null) return null;
  const rFav = radiantAvg >= direAvg;
  return (
    <div
      className="mt-1 flex items-center justify-center gap-1.5 font-mono text-[0.65rem] tabular-nums text-text-faded"
      title="MMR médio de cada time"
    >
      <span className={rFav ? "font-bold text-gold" : ""}>{radiantAvg}</span>
      <span className="uppercase tracking-wide">méd</span>
      <span className={!rFav ? "font-bold text-gold" : ""}>{direAvg}</span>
    </div>
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
      className="block rounded-[var(--radius-md)] border border-border-subtle bg-bg-deep/70 p-3 backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-brand hover:shadow-lg active:translate-y-0"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Iluminados */}
        <div className="flex flex-1 items-start justify-end gap-1.5">
          {radiant.map((p, i) => (
            <PlayerChip key={`r${i}`} player={p} isMvp={p.userId != null && p.userId === match.mvpUserId} />
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
          <TeamAvgRow radiantAvg={match.radiantAvg} direAvg={match.direAvg} />
        </div>

        {/* Temidos */}
        <div className="flex flex-1 items-start justify-start gap-1.5">
          {dire.map((p, i) => (
            <PlayerChip key={`d${i}`} player={p} isMvp={p.userId != null && p.userId === match.mvpUserId} />
          ))}
        </div>
      </div>
    </Link>
  );
}

function LiveTeam({ players, align }: { players: LivePlayer[]; align: "end" | "start" }) {
  return (
    <div
      className={`flex flex-1 flex-wrap items-center gap-2 ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
    >
      {players.map((p, i) => (
        <span key={i} className="relative" title={`${p.name}${p.banned ? " · BANIDO" : ""}`}>
          <XpAvatarRing
            src={p.avatar ?? undefined}
            alt={p.name}
            fallback={p.name.slice(0, 2).toUpperCase()}
            level={p.level}
            pct={p.xpPct}
            size={36}
          />
          {p.banned && <BannedMark />}
        </span>
      ))}
    </div>
  );
}

export function LiveMatchCard({ match }: { match: LiveMatch }) {
  const radiant = match.players.filter((p) => p.team === "radiant");
  const dire = match.players.filter((p) => p.team === "dire");

  return (
    <Link
      href={`/partida/${match.dotaMatchId}`}
      className="block rounded-[var(--radius-md)] border border-play-primary/40 bg-bg-deep/70 p-3 backdrop-blur-sm transition-[transform,border-color,box-shadow] duration-150 ease-out hover:-translate-y-0.5 hover:border-play-primary hover:shadow-lg active:translate-y-0"
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
        <LiveTeam players={radiant} align="end" />
        <div className="flex shrink-0 flex-col items-center">
          <span className="font-display text-sm font-bold uppercase tracking-wide text-text-muted">
            vs
          </span>
          <TeamAvgRow radiantAvg={match.radiantAvg} direAvg={match.direAvg} />
        </div>
        <LiveTeam players={dire} align="start" />
      </div>
    </Link>
  );
}
