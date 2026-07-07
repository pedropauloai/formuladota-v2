// Aba Teamfights — cada confronto: janela de tempo, mortes e saldo de ouro/XP
// por time (quem lucrou na luta).

import { useTranslations } from "next-intl";
import type { TeamfightView } from "@/lib/dota/match-objectives";

function fmtSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${Math.round(n / 1000 * 10) / 10}k`;
}

export function TeamfightsPanel({ teamfights }: { teamfights: TeamfightView[] }) {
  const t = useTranslations("scoreboard");
  if (!teamfights.length) {
    return <p className="font-body text-sm text-text-faded">{t("teamfightsEmpty")}</p>;
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40">
      <table className="w-full min-w-[640px] border-collapse">
        <thead>
          <tr className="border-b border-border-subtle/60 text-right">
            <th className="px-3 py-2 text-left font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
              {t("tfMatchup")}
            </th>
            <th className="px-2 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
              {t("tfDeaths")}
            </th>
            <th className="px-2 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
              {t("tfGoldRadiant")}
            </th>
            <th className="px-2 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
              {t("tfGoldDire")}
            </th>
            <th className="px-3 py-2 font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
              {t("tfAdvantage")}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle/40">
          {teamfights.map((f, i) => {
            const net = f.radiantGold - f.direGold;
            const winner = net > 0 ? t("teamRadiant") : net < 0 ? t("teamDire") : "—";
            const color = net > 0 ? "text-[#00C466]" : net < 0 ? "text-brand-primary" : "text-text-muted";
            return (
              <tr key={i} className="text-right hover:bg-bg-surface/40">
                <td className="px-3 py-2 text-left font-mono text-sm tabular-nums text-text-display">
                  {f.startMin}–{f.endMin}min
                </td>
                <td className="px-2 py-2 font-mono text-sm tabular-nums text-text-muted">{f.deaths}</td>
                <td className="px-2 py-2 font-mono text-sm tabular-nums text-[#00C466]">
                  {fmtSigned(f.radiantGold)}
                </td>
                <td className="px-2 py-2 font-mono text-sm tabular-nums text-brand-primary">
                  {fmtSigned(f.direGold)}
                </td>
                <td className={`px-3 py-2 font-display text-xs font-bold uppercase tracking-wide ${color}`}>
                  {winner}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
