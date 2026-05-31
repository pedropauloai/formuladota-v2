// Widget de stats numéricos do /me — Partidas / Vitórias / Derrotas / MMR.
// REFATOR 2026-05-26: removido avatar + medalhas (que ficavam DUPLICADOS com
// ProfileIdentity). Agora ProfileStats é puramente numérico, renderizado abaixo
// do header canônico como bloco horizontal de 4 stats lado a lado.
// Server Component — sem interatividade, sem "use client".

interface Props {
  partidas: number | null;
  vitorias: number | null;
  derrotas: number | null;
  mmr: number | null;
}

export function ProfileStats({ partidas, vitorias, derrotas, mmr }: Props) {
  return (
    <section
      aria-label="Estatísticas do jogador"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 border-y border-border-subtle"
    >
      <StatItem label="Partidas" value={partidas} />
      <StatItem label="Vitórias" value={vitorias} />
      <StatItem label="Derrotas" value={derrotas} />
      <StatItem label="MMR" value={mmr} />
    </section>
  );
}

// Subcomponente local — stat individual com label e valor numérico impactante
function StatItem({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      {/* Label uppercase 13px (Label/Caption tier — UI-SPEC) */}
      <p className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </p>
      {/* Valor: Teko condensado 32px bold — exceção tipográfica UI-SPEC pra stats numéricos */}
      <p className="font-display-condensed text-[32px] font-bold text-text-display tabular-nums leading-none mt-1">
        {value ?? "—"}
      </p>
    </div>
  );
}
