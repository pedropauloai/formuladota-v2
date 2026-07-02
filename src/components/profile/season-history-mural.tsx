// SeasonHistoryMural — imortalização: o histórico PERMANENTE de temporadas do jogador
// ("S1: Imortal · S2: Top 25 · S3: Lendário"). Lê season_achievements (gravado no
// fim de cada temporada). Vazio até a 1ª temporada fechar. Server component.
// Ver docs/foundations/RANKING_SYSTEM.md (o prestígio acumula: "fui Imortal na S2").

import { createClient } from "@/lib/supabase/server";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { Trophy } from "lucide-react";

interface AchievementRow {
  season_id: number;
  final_medal: string | null;
  final_stars: number | null;
  leaderboard_rank: number | null;
  title: string | null;
}

export async function SeasonHistoryMural({ userId }: { userId: string }) {
  const supabase = await createClient();

  const { data: achievements } = await supabase
    .from("season_achievements")
    .select("season_id, final_medal, final_stars, leaderboard_rank, title")
    .eq("user_id", userId);

  const rows = (achievements ?? []) as AchievementRow[];
  if (rows.length === 0) return null; // sem temporadas concluídas ainda

  // Nomes das temporadas (season_number pro rótulo "S{n}").
  const seasonIds = rows.map((r) => r.season_id);
  const { data: seasons } = await supabase
    .from("seasons")
    .select("id, name, season_number")
    .in("id", seasonIds);
  const seasonById = new Map<number, { name: string; num: number | null }>();
  for (const s of seasons ?? []) {
    seasonById.set(s.id, { name: s.name, num: s.season_number ?? null });
  }

  // Mais recente primeiro.
  const sorted = [...rows].sort((a, b) => b.season_id - a.season_id);

  return (
    <section className="rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-text-display">
        <Trophy size={15} className="text-gold" aria-hidden="true" />
        Histórico de temporadas
      </h3>
      <ul className="space-y-2">
        {sorted.map((a) => {
          const s = seasonById.get(a.season_id);
          const label = s?.num != null ? `S${s.num}` : `#${a.season_id}`;
          return (
            <li
              key={a.season_id}
              className="flex items-center gap-3 rounded-sm border border-border-subtle/60 bg-bg-surface/40 px-3 py-2"
            >
              <span className="w-9 shrink-0 font-display-condensed text-lg font-bold uppercase tracking-wide text-gold">
                {label}
              </span>
              {a.final_medal && (
                <DotaRankMedal rank={a.final_medal as DotaRank} size="sm" tooltip={false} />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate font-body text-sm text-text-body">
                  {s?.name ?? "Temporada"}
                </span>
                {a.title && (
                  <span className="block font-display text-xs font-bold uppercase tracking-wide text-gold-bright">
                    {a.title}
                  </span>
                )}
              </span>
              {a.leaderboard_rank != null && (
                <span className="shrink-0 rounded-sm border border-border-gold bg-gold/10 px-2 py-0.5 font-display-condensed text-sm uppercase tracking-wider text-gold-bright">
                  Top {a.leaderboard_rank}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
