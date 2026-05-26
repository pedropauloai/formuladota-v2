// Coluna esquerda da /me — stats numéricos + medalhas (UI-SPEC "Coluna stats").
// Width 280px fixo (lg+), font-display-condensed pros valores (exceção tipográfica UI-SPEC).
// Server Component — sem interatividade, sem "use client".

import { UserAvatar } from "@/components/ui/avatar";
import { DotaRankMedal, type DotaRank } from "@/components/ui/dota-rank-medal";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";

interface Props {
  avatarUrl: string | null;
  username: string | null;
  dotaRank: DotaRank;
  honorRank: HonorRank;
  mmr: number | null;
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
}

export function ProfileStats({
  avatarUrl,
  username,
  dotaRank,
  honorRank,
  mmr,
  partidas,
  vitorias,
  derrotas,
}: Props) {
  const ranqueado = mmr !== null;

  return (
    <aside
      aria-label="Estatísticas do jogador"
      className="w-full lg:w-[280px] flex-shrink-0 p-6 flex flex-col gap-6"
    >
      {/* Avatar centralizado em mobile, alinhado à esquerda em desktop */}
      <div className="flex justify-center lg:justify-start">
        <UserAvatar
          src={avatarUrl ?? undefined}
          alt={`Avatar de ${username ?? "Anônimo"}`}
          fallback={(username ?? "??").slice(0, 2).toUpperCase()}
          size="xl"
          ringColor={ranqueado ? "brand" : null}
        />
      </div>

      {/* Grid de stats numéricos: 2 colunas em mobile, 1 em desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
        <StatItem label="Partidas" value={partidas} />
        <StatItem label="Vitórias" value={vitorias} />
        <StatItem label="Derrotas" value={derrotas} />
        <StatItem label="MMR" value={mmr} />
      </div>

      {/* Par canônico SKILL + HONOR lado a lado (M12) */}
      <div className="flex items-center justify-center lg:justify-start gap-3 mt-2 pt-4 border-t border-border-subtle">
        <DotaRankMedal
          rank={dotaRank}
          size="md"
          showLabel
          glow={dotaRank === "immortal" || dotaRank === "immortal-top-100"}
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
        <HonorRankMedal
          rank={honorRank}
          size="md"
          showLabel
          calibrationStatus={ranqueado ? "ranqueado" : "visitante"}
        />
      </div>
    </aside>
  );
}

// Subcomponente local — stat individual com label e valor numérico impactante
function StatItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-b border-border-subtle pb-3 last:border-b-0">
      {/* Label uppercase 13px (Label/Caption tier — UI-SPEC) */}
      <p className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </p>
      {/* Valor: Teko condensado 24px bold — exceção tipográfica UI-SPEC pra stats numéricos */}
      <p className="font-display-condensed text-[24px] font-bold text-text-display tabular-nums leading-none mt-1">
        {value ?? "—"}
      </p>
    </div>
  );
}
