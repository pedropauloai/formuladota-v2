// Aba Combate — dano causado/recebido, cura, maior golpe, melhor multi-kill/streak,
// e a matriz "quem matou quem" (assinatura do OpenDota).

import Image from "next/image";
import type { PlayerFull } from "@/lib/dota/match-stats";
import { StatTable, splitTeams, fmtK, type StatColumn } from "@/components/match/shared";

const COLUMNS: StatColumn[] = [
  { label: "Dano heróis", render: (p) => fmtK(p.combat.heroDamage), accent: "text-brand-primary" },
  { label: "Dano recebido", render: (p) => fmtK(p.combat.damageTaken) },
  { label: "Cura", render: (p) => fmtK(p.combat.heroHealing), accent: "text-[#00C466]" },
  { label: "Maior hit", render: (p) => fmtK(p.combat.maxHeroHit) },
  { label: "Hits em heróis", render: (p) => p.combat.heroHits },
  { label: "Multi-kill", render: (p) => (p.combat.bestMultiKill > 1 ? `${p.combat.bestMultiKill}x` : "—") },
  { label: "Streak", render: (p) => (p.combat.bestKillStreak > 2 ? p.combat.bestKillStreak : "—") },
];

function HeroIconCell({ p }: { p: PlayerFull }) {
  return p.heroIcon ? (
    <Image
      src={p.heroIcon}
      alt={p.heroName}
      title={p.heroName}
      width={22}
      height={22}
      unoptimized
      className="size-[22px] rounded-sm object-cover"
    />
  ) : (
    <span className="size-[22px] rounded-sm bg-bg-elevated" aria-hidden="true" />
  );
}

// Matriz de abates: linhas = atacantes de um time, colunas = vítimas do outro.
function KillMatrix({
  attackers,
  victims,
  title,
}: {
  attackers: PlayerFull[];
  victims: PlayerFull[];
  title: string;
}) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 font-display text-xs font-bold uppercase tracking-wide text-text-muted">
        {title}
      </p>
      <table className="border-collapse">
        <thead>
          <tr>
            <th className="p-1" />
            {victims.map((v) => (
              <th key={v.slot} className="p-1">
                <HeroIconCell p={v} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {attackers.map((a) => (
            <tr key={a.slot}>
              <td className="p-1">
                <HeroIconCell p={a} />
              </td>
              {victims.map((v) => {
                const k = a.killsVsEnemies[v.slot] ?? 0;
                return (
                  <td
                    key={v.slot}
                    className={`min-w-9 p-1 text-center font-mono text-sm tabular-nums ${
                      k > 0 ? "text-text-display" : "text-text-faded/40"
                    }`}
                  >
                    {k > 0 ? k : "·"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CombatPanel({ players }: { players: PlayerFull[] }) {
  const { radiant, dire } = splitTeams(players);
  return (
    <div className="space-y-6">
      <StatTable players={players} columns={COLUMNS} />
      <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-4">
        <h3 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-text-display">
          Abates — quem matou quem
        </h3>
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <KillMatrix attackers={radiant} victims={dire} title="Iluminados sobre Temidos" />
          <KillMatrix attackers={dire} victims={radiant} title="Temidos sobre Iluminados" />
        </div>
      </section>
    </div>
  );
}
