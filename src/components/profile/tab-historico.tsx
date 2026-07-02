// Tab Histórico — partidas FORMULADOTA do jogador (match_players, leitura pública).
// Linha rica estilo Dotabuff: herói, V/D, K/D/A + KDA, LH/DN, GPM, patrimônio e os
// ITENS da partida. Funciona pra QUALQUER user (perfil próprio e público).

import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getHeroById } from "@/lib/queries/heroes";
import { itemImageUrl } from "@/lib/queries/items";
import { gameModeName } from "@/lib/dota/game-mode";
import { EmptyState } from "@/components/ui/empty-state";

interface MatchRow {
  match_id: string;
  hero_id: number;
  hero_name: string | null;
  kills: number;
  deaths: number;
  assists: number;
  gold_per_min: number;
  last_hits: number;
  denies: number;
  net_worth: number;
  is_winner: boolean;
  mmr_change: number | null;
  enriched_at: string | null;
  items: { inventory?: (number | null)[]; neutral?: number | null } | null;
}

function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export async function TabHistorico({ userId }: { userId: string }) {
  const t = await getTranslations("perfil");
  const supabase = await createClient();

  const { data } = await supabase
    .from("match_players")
    .select(
      "match_id, hero_id, hero_name, kills, deaths, assists, gold_per_min, last_hits, denies, net_worth, is_winner, mmr_change, enriched_at, items"
    )
    .eq("user_id", userId)
    .order("enriched_at", { ascending: false })
    .limit(25);
  const rows = (data ?? []) as unknown as MatchRow[];

  if (rows.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState title={t("historicoEmptyTitle")} description={t("historicoEmptyDesc")} />
      </div>
    );
  }

  // URL canônica do placar = dota_match_id + tipo de partida. match_details é pública.
  const matchIds = [...new Set(rows.map((m) => m.match_id))];
  const mdTable = supabase.from("match_details" as never) as unknown as {
    select: (q: string) => {
      in: (
        c: string,
        v: string[]
      ) => PromiseLike<{
        data:
          | { match_id: string; dota_match_id: string | null; game_mode: number | null }[]
          | null;
      }>;
    };
  };
  const { data: mds } = await mdTable
    .select("match_id, dota_match_id, game_mode")
    .in("match_id", matchIds);
  const dotaByMatch = new Map<string, string>();
  const modeByMatch = new Map<string, number>();
  for (const d of mds ?? []) {
    if (d.dota_match_id) dotaByMatch.set(d.match_id, d.dota_match_id);
    if (d.game_mode != null) modeByMatch.set(d.match_id, d.game_mode);
  }

  return (
    <ul className="space-y-2 pt-6">
      {rows.map((m, i) => {
        const hero = getHeroById(m.hero_id);
        const kda = ((m.kills + m.assists) / Math.max(1, m.deaths)).toFixed(2);
        const modeName = gameModeName(modeByMatch.get(m.match_id));
        const date = m.enriched_at
          ? new Date(m.enriched_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
          : null;
        const inv = (m.items?.inventory ?? []).map((x) => x ?? 0);
        return (
          <li key={`${m.match_id}-${i}`}>
            <Link
              href={`/partida/historico/${dotaByMatch.get(m.match_id) ?? m.match_id}`}
              className={`flex flex-col gap-2.5 rounded-[var(--radius-md)] border border-l-[3px] border-border-subtle bg-bg-deep/80 p-2.5 backdrop-blur-sm transition-colors hover:bg-bg-surface/70 lg:flex-row lg:items-center ${
                m.is_winner ? "border-l-play-primary" : "border-l-error"
              }`}
            >
              {/* Herói + identidade. */}
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                {hero ? (
                  <Image
                    src={hero.image_full}
                    alt={hero.name_pt}
                    title={hero.name_pt}
                    width={64}
                    height={36}
                    unoptimized
                    className="h-9 w-16 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <span className="h-9 w-16 shrink-0 rounded-sm bg-bg-elevated" aria-hidden="true" />
                )}
                <div className="min-w-0">
                  <p className="truncate font-body text-sm font-semibold text-text-display">
                    {hero?.name_pt ?? m.hero_name ?? `Herói ${m.hero_id}`}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span
                      className={`font-display text-[0.7rem] font-bold uppercase tracking-wide ${
                        m.is_winner ? "text-play-primary" : "text-error"
                      }`}
                    >
                      {m.is_winner ? t("matchWin") : t("matchLoss")}
                    </span>
                    {modeName && (
                      <span className="font-display text-[0.7rem] uppercase tracking-wide text-text-muted">
                        · {modeName}
                      </span>
                    )}
                    {date && <span className="font-display text-[0.7rem] text-text-muted">· {date}</span>}
                  </div>
                </div>
              </div>

              {/* Stats. */}
              <div className="flex shrink-0 items-center gap-4 sm:gap-5">
                {/* Variação de MMR da partida (match_players.mmr_change). */}
                <Stat
                  label="MMR"
                  accent={
                    m.mmr_change == null
                      ? "text-text-muted"
                      : m.mmr_change >= 0
                        ? "text-play-primary"
                        : "text-error"
                  }
                >
                  {m.mmr_change == null
                    ? "—"
                    : m.mmr_change >= 0
                      ? `+${m.mmr_change}`
                      : m.mmr_change}
                </Stat>
                <Stat label={t("matchKda", { kda })} accent="text-text-display">
                  <span className="text-play-primary">{m.kills}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-error">{m.deaths}</span>
                  <span className="text-text-muted">/</span>
                  <span className="text-gold">{m.assists}</span>
                </Stat>
                <Stat label="LH / DN" accent="text-text-muted">
                  {m.last_hits}
                  <span className="text-text-faded"> / </span>
                  {m.denies}
                </Stat>
                <Stat label="GPM" accent="text-gold">
                  {m.gold_per_min}
                </Stat>
                <Stat label="Patrim." accent="text-gold">
                  {fmtK(m.net_worth)}
                </Stat>
              </div>

              {/* Itens da partida. */}
              <div className="flex shrink-0 items-center gap-0.5">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <ItemIcon key={idx} id={inv[idx] ?? 0} />
                ))}
                <span className="mx-0.5 h-4 w-px bg-border-subtle/60" aria-hidden="true" />
                <ItemIcon id={m.items?.neutral ?? 0} neutral />
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Stat({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="text-right">
      <p className={`font-display text-sm font-bold tabular-nums ${accent}`}>{children}</p>
      <p className="font-display text-[0.65rem] uppercase tracking-wide text-text-muted">{label}</p>
    </div>
  );
}

function ItemIcon({ id, neutral = false }: { id: number; neutral?: boolean }) {
  const url = itemImageUrl(id);
  const ring = neutral ? "ring-1 ring-gold/50" : "";
  if (!url) {
    return (
      <span
        className={`block h-[18px] w-6 shrink-0 rounded-sm border border-border-subtle/60 bg-bg-surface ${ring}`}
        aria-hidden="true"
      />
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={24}
      height={18}
      unoptimized
      className={`h-[18px] w-6 shrink-0 rounded-sm object-cover ${ring}`}
    />
  );
}
