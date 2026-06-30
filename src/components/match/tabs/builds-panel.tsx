// Aba Builds — por jogador: timeline de compra de itens (com minuto) e a ordem de
// evolução de habilidades (skill build). Itens triviais já filtrados no parser.

import Image from "next/image";
import type { PlayerFull, BuildPurchase, BuildSkill } from "@/lib/dota/match-stats";
import { splitTeams, mmss, PlayerLabel, TeamHeader } from "@/components/match/shared";

function PurchaseIcon({ buy }: { buy: BuildPurchase }) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      {buy.img ? (
        <Image
          src={buy.img}
          alt={buy.dname}
          title={`${buy.dname} — ${mmss(buy.t)}`}
          width={36}
          height={27}
          unoptimized
          className="h-[27px] w-9 rounded-sm object-cover ring-1 ring-border-subtle/60"
        />
      ) : (
        <span className="h-[27px] w-9 rounded-sm bg-bg-surface" aria-hidden="true" />
      )}
      <span className="font-mono text-[0.6rem] tabular-nums text-text-faded">{mmss(buy.t)}</span>
    </div>
  );
}

function SkillIcon({ skill, level }: { skill: BuildSkill; level: number }) {
  return (
    <div className="relative shrink-0" title={`Nível ${level}: ${skill.dname}`}>
      {skill.img ? (
        <Image
          src={skill.img}
          alt={skill.dname}
          width={26}
          height={26}
          unoptimized
          className="size-[26px] rounded-sm object-cover"
        />
      ) : (
        <span className="flex size-[26px] items-center justify-center rounded-sm bg-gold/20 font-display text-[0.6rem] font-bold text-gold">
          T
        </span>
      )}
      <span className="absolute -bottom-1 -right-1 rounded-sm bg-bg-base px-0.5 font-mono text-[0.55rem] tabular-nums text-text-muted ring-1 ring-border-subtle">
        {level}
      </span>
    </div>
  );
}

function PlayerBuild({ p }: { p: PlayerFull }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-3">
      <div className="mb-2.5 border-b border-border-subtle/60 pb-2">
        <PlayerLabel p={p} />
      </div>

      <p className="mb-1 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
        Itens
      </p>
      {p.purchases.length ? (
        <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1">
          {p.purchases.map((buy, i) => (
            <PurchaseIcon key={i} buy={buy} />
          ))}
        </div>
      ) : (
        <p className="mb-3 font-body text-xs text-text-faded">Sem dados de compra.</p>
      )}

      <p className="mb-1.5 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
        Skills
      </p>
      {p.skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {p.skills.map((skill, i) => (
            <SkillIcon key={i} skill={skill} level={i + 1} />
          ))}
        </div>
      ) : (
        <p className="font-body text-xs text-text-faded">Sem dados de skill build.</p>
      )}
    </div>
  );
}

export function BuildsPanel({ players }: { players: PlayerFull[] }) {
  const { radiant, dire } = splitTeams(players);
  return (
    <div className="space-y-5">
      {(["radiant", "dire"] as const).map((team) => {
        const list = team === "radiant" ? radiant : dire;
        return (
          <div key={team}>
            <TeamHeader team={team} />
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {list.map((p, i) => (
                <PlayerBuild key={p.userId ?? `${team}-${i}`} p={p} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
