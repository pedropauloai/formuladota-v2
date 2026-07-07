"use client";

// Blocos compartilhados pelos painéis do placar (presentational, sem estado).
// Mantém os painéis enxutos e a aparência consistente entre abas. Client porque
// os painéis rodam no cliente (dentro de match-detail) e usam useTranslations.

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { PlayerFull } from "@/lib/dota/match-stats";
import { RoleIcon } from "@/components/match/match-scoreboard";

export function fmtK(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

export function fmtPct(n: number | null): string {
  if (n == null) return "—";
  return `${Math.round(n * 100)}%`;
}

export function mmss(totalSeconds: number): string {
  const neg = totalSeconds < 0;
  const s = Math.abs(Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${neg ? "-" : ""}${mm}:${String(ss).padStart(2, "0")}`;
}

// Rótulo compacto do jogador: ícone do herói (quadrado) + nome (linka pro perfil).
export function PlayerLabel({ p }: { p: PlayerFull }) {
  const t = useTranslations("scoreboard");
  const posLabel = t(`pos${Math.min(5, Math.max(1, p.positionSlot))}`);
  const inner = (
    <span className="flex min-w-0 items-center gap-2">
      {p.heroIcon ? (
        <Image
          src={p.heroIcon}
          alt={p.heroName}
          title={p.heroName}
          width={24}
          height={24}
          unoptimized
          className="size-6 shrink-0 rounded-sm object-cover"
        />
      ) : (
        <span className="size-6 shrink-0 rounded-sm bg-bg-elevated" aria-hidden="true" />
      )}
      <RoleIcon slot={p.positionSlot} size={15} className="ml-0.5" label={posLabel} />
      <span className="min-w-0 truncate font-body text-sm text-text-display">{p.name}</span>
    </span>
  );
  if (p.profileHref) {
    return (
      <Link href={p.profileHref} className="transition-opacity hover:opacity-80">
        {inner}
      </Link>
    );
  }
  return inner;
}

// Cabeçalho de time (Iluminados/Temidos) com faixa de cor.
export function TeamHeader({ team }: { team: "radiant" | "dire" }) {
  const t = useTranslations("scoreboard");
  const isRadiant = team === "radiant";
  return (
    <h3
      className={`mb-2 font-display text-base font-bold uppercase tracking-wide ${
        isRadiant ? "text-[#00C466]" : "text-brand-primary"
      }`}
    >
      {isRadiant ? t("teamRadiant") : t("teamDire")}
    </h3>
  );
}

// Coluna de cabeçalho numérico (alinhado à direita).
export function ThNum({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-2 text-right font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
      {children}
    </th>
  );
}

export function TdNum({
  children,
  accent = "text-text-muted",
}: {
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <td className={`px-2 py-2 text-right font-mono text-sm tabular-nums ${accent}`}>
      {children}
    </td>
  );
}

// Agrupa por time preservando a ordem de slot.
export function splitTeams(players: PlayerFull[]) {
  return {
    radiant: players.filter((p) => p.team === "radiant"),
    dire: players.filter((p) => p.team === "dire"),
  };
}

export interface StatColumn {
  /** Chave i18n no namespace `scoreboard` (ex.: "colPerfTeamfight"). */
  labelKey: string;
  render: (p: PlayerFull) => React.ReactNode;
  accent?: string;
}

// Tabela densa reutilizável: 1ª coluna = jogador, demais = números à direita.
// Renderiza os dois times empilhados, cada um sob seu cabeçalho.
export function StatTable({
  players,
  columns,
}: {
  players: PlayerFull[];
  columns: StatColumn[];
}) {
  const t = useTranslations("scoreboard");
  const { radiant, dire } = splitTeams(players);
  return (
    <div className="space-y-5">
      {(["radiant", "dire"] as const).map((team) => {
        const list = team === "radiant" ? radiant : dire;
        return (
          <div key={team}>
            <TeamHeader team={team} />
            <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border-subtle bg-bg-elevated/40">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle/60">
                    <th className="px-3 py-2 text-left font-display text-[0.62rem] font-bold uppercase tracking-wide text-text-faded">
                      {t("colPlayer")}
                    </th>
                    {columns.map((c) => (
                      <ThNum key={c.labelKey}>{t(c.labelKey)}</ThNum>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle/40">
                  {list.map((p, i) => (
                    <tr key={p.userId ?? `${team}-${i}`} className="hover:bg-bg-surface/40">
                      <td className="px-3 py-2">
                        <PlayerLabel p={p} />
                      </td>
                      {columns.map((c) => (
                        <TdNum key={c.labelKey} accent={c.accent}>
                          {c.render(p)}
                        </TdNum>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
