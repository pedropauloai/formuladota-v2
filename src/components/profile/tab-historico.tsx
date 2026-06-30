// Tab Histórico — partidas FORMULADOTA do jogador (match_players, leitura pública).
// Stats reais por partida vindos do OpenDota: herói, K/D/A, vitória/derrota, GPM.
// Funciona pra QUALQUER user (perfil próprio e público).

import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getHeroById } from "@/lib/queries/heroes";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

interface MatchRow {
  match_id: string;
  hero_id: number;
  hero_name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  is_winner: boolean;
  enriched_at: string | null;
}

export async function TabHistorico({ userId }: { userId: string }) {
  const t = await getTranslations("perfil");
  const supabase = await createClient();

  const { data } = await supabase
    .from("match_players")
    .select(
      "match_id, hero_id, hero_name, kills, deaths, assists, gold_per_min, is_winner, enriched_at"
    )
    .eq("user_id", userId)
    .order("enriched_at", { ascending: false })
    .limit(25);
  const rows = (data ?? []) as MatchRow[];

  if (rows.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          title={t("historicoEmptyTitle")}
          description={t("historicoEmptyDesc")}
        />
      </div>
    );
  }

  // URL canônica do placar = dota_match_id (ID real da Valve). match_details é
  // pública e mapeia match_id (UUID) → dota_match_id. Cast: tabela nova (069).
  const matchIds = [...new Set(rows.map((m) => m.match_id))];
  const mdTable = supabase.from("match_details" as never) as unknown as {
    select: (q: string) => {
      in: (
        c: string,
        v: string[]
      ) => PromiseLike<{ data: { match_id: string; dota_match_id: string | null }[] | null }>;
    };
  };
  const { data: mds } = await mdTable.select("match_id, dota_match_id").in("match_id", matchIds);
  const dotaByMatch = new Map<string, string>();
  for (const d of mds ?? []) {
    if (d.dota_match_id) dotaByMatch.set(d.match_id, d.dota_match_id);
  }

  return (
    <div className="pt-6">
      <Card variant="flat" className="overflow-hidden p-0">
        <ul className="divide-y divide-border-subtle/60">
          {rows.map((m, i) => {
            const hero = getHeroById(m.hero_id);
            const kda = ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2);
            return (
              <li key={`${m.match_id}-${i}`}>
                <Link
                  href={`/partida/historico/${dotaByMatch.get(m.match_id) ?? m.match_id}`}
                  className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-bg-surface/40"
                >
                {/* Resultado (faixa lateral). */}
                <span
                  className={`h-9 w-1 shrink-0 rounded-full ${
                    m.is_winner ? "bg-play-primary" : "bg-error"
                  }`}
                  aria-hidden="true"
                />
                {hero ? (
                  <Image
                    src={hero.portrait_url}
                    alt={hero.name_pt}
                    title={hero.name_pt}
                    width={40}
                    height={40}
                    className="size-10 shrink-0 rounded-sm object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="size-10 shrink-0 rounded-sm bg-bg-elevated" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm font-medium text-text-display">
                    {hero?.name_pt ?? m.hero_name ?? `Herói ${m.hero_id}`}
                  </p>
                  <p
                    className={`font-display text-xs font-bold uppercase tracking-wide ${
                      m.is_winner ? "text-play-primary" : "text-error"
                    }`}
                  >
                    {m.is_winner ? t("matchWin") : t("matchLoss")}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-display text-sm font-bold tabular-nums text-text-display">
                    {m.kills}/{m.deaths}/{m.assists}
                  </p>
                  <p className="font-display text-[0.7rem] uppercase tracking-wide text-text-faded">
                    {t("matchKda", { kda })}
                  </p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="font-mono text-sm tabular-nums text-gold">{m.gold_per_min}</p>
                  <p className="font-display text-[0.7rem] uppercase tracking-wide text-text-faded">
                    GPM
                  </p>
                </div>
                <span className="hidden shrink-0 font-display text-xs text-text-faded md:block">
                  {m.enriched_at
                    ? new Date(m.enriched_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : ""}
                </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
