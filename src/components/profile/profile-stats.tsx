// Widget de stats numéricos do /me — Partidas / Vitórias / Derrotas / MMR.
// REFATOR 2026-05-26: removido avatar + medalhas (que ficavam DUPLICADOS com
// ProfileIdentity). Agora ProfileStats é puramente numérico, renderizado abaixo
// do header canônico como bloco horizontal de 4 stats lado a lado.
// Server Component — sem interatividade, sem "use client".

import { useTranslations } from "next-intl";

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
}

export function ProfileStats({ partidas, vitorias, derrotas, mmr }: Props) {
  const t = useTranslations("perfil");
  return (
    <section
      aria-label={t("playerStatsAria")}
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-y border-border-subtle"
    >
      <StatItem label={t("statPartidas")} value={partidas} />
      <StatItem label={t("statVitorias")} value={vitorias} />
      <StatItem label={t("statDerrotas")} value={derrotas} />
      {/* MMR = número de valor/progresso → família GOLD (Pedro 2026-06-11) */}
      <StatItem label={t("statMmr")} value={mmr} gold />
    </section>
  );
}

// Subcomponente local — stat individual com label e valor numérico impactante.
// `gold` pinta o valor com o token de valor/progresso (nível, MMR, fichas).
function StatItem({
  label,
  value,
  gold,
}: {
  label: string;
  value: number | null;
  gold?: boolean;
}) {
  return (
    <div>
      {/* Label uppercase 13px (Label/Caption tier — UI-SPEC) */}
      <p
        className={`font-display text-[13px] font-semibold uppercase tracking-wide ${
          gold ? "text-gold-muted" : "text-text-faded"
        }`}
      >
        {label}
      </p>
      {/* Valor: Teko condensado 32px bold — exceção tipográfica UI-SPEC pra stats numéricos */}
      <p
        className={`font-display-condensed text-[32px] font-bold tabular-nums leading-none mt-1 ${
          gold ? "text-gold" : "text-text-display"
        }`}
      >
        {value ?? "—"}
      </p>
    </div>
  );
}
