// Aba Builds — por jogador, estilo STRATZ: ordem de skills · botas (com timing) ·
// itens importantes (com timing) · item neutro.

import Image from "next/image";
import { useTranslations } from "next-intl";
import type { PlayerFull, BuildPurchase, BuildSkill } from "@/lib/dota/match-stats";
import { splitTeams, mmss, PlayerLabel, TeamHeader } from "@/components/match/shared";

function SkillIcons({ skills }: { skills: BuildSkill[] }) {
  if (!skills.length) return <span className="text-text-faded">—</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {skills.map((s, i) => (
        <span key={i} className="relative" title={`Nível ${i + 1}: ${s.dname}`}>
          {s.img ? (
            <Image
              src={s.img}
              alt={s.dname}
              width={20}
              height={20}
              unoptimized
              className="size-5 rounded-sm object-cover"
            />
          ) : (
            <span className="flex size-5 items-center justify-center rounded-sm bg-gold/20 font-display text-[0.55rem] font-bold text-gold">
              T
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

function ItemWithTime({ buy }: { buy: BuildPurchase }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5" title={`${buy.dname} — ${mmss(buy.t)}`}>
      {buy.img ? (
        <Image
          src={buy.img}
          alt={buy.dname}
          width={32}
          height={24}
          unoptimized
          className="h-6 w-8 rounded-sm object-cover ring-1 ring-border-subtle/60"
        />
      ) : (
        <span className="h-6 w-8 rounded-sm bg-bg-surface" aria-hidden="true" />
      )}
      <span className="font-mono text-[0.58rem] tabular-nums text-text-faded">{mmss(buy.t)}</span>
    </div>
  );
}

function PlayerRow({ p }: { p: PlayerFull }) {
  return (
    <tr className="align-top hover:bg-bg-surface/40">
      <td className="px-3 py-2.5">
        <PlayerLabel p={p} />
      </td>
      <td className="px-2 py-2.5">
        <SkillIcons skills={p.skills} />
      </td>
      <td className="px-2 py-2.5">
        {p.boots ? <ItemWithTime buy={p.boots} /> : <span className="text-text-faded">—</span>}
      </td>
      <td className="px-2 py-2.5">
        {p.importantItems.length ? (
          <div className="flex flex-wrap gap-1.5">
            {p.importantItems.map((buy, i) => (
              <ItemWithTime key={i} buy={buy} />
            ))}
          </div>
        ) : (
          <span className="text-text-faded">—</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        {p.neutralItem?.img ? (
          <Image
            src={p.neutralItem.img}
            alt={p.neutralItem.dname}
            title={p.neutralItem.dname}
            width={28}
            height={28}
            unoptimized
            className="size-7 rounded-full object-cover ring-1 ring-gold/40"
          />
        ) : (
          <span className="text-text-faded">—</span>
        )}
      </td>
    </tr>
  );
}

function TeamBuilds({ players, team }: { players: PlayerFull[]; team: "radiant" | "dire" }) {
  const t = useTranslations("scoreboard");
  const headers = ["colPlayer", "colBuildSkills", "colBuildBoots", "colBuildKeyItems", "colBuildNeutral"];
  return (
    <div>
      <TeamHeader team={team} />
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40">
        <table className="w-full min-w-[720px] border-collapse">
          <thead>
            <tr className="border-b border-border-subtle/60 text-left">
              {headers.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded"
                >
                  {t(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/40">
            {players.map((p, i) => (
              <PlayerRow key={p.userId ?? `${team}-${i}`} p={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BuildsPanel({ players }: { players: PlayerFull[] }) {
  const { radiant, dire } = splitTeams(players);
  return (
    <div className="space-y-5">
      <TeamBuilds players={radiant} team="radiant" />
      <TeamBuilds players={dire} team="dire" />
    </div>
  );
}
