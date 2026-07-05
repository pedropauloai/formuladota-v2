"use client";

// Telemetria AO VIVO no placar da partida em andamento: heróis + net worth + K/D/A,
// atualizando sozinho (~8s). Fonte = lobbies.live_stats (bot via GetRealtimeStats).
// Delay do DotaTV (~2-3 min) — é anti-cheat da Valve, não dá pra ser instantâneo.

import { useEffect, useState } from "react";
import Image from "next/image";
import { Radio } from "lucide-react";
import { getLiveMatchStats, type LiveMatchT, type LiveTeamT } from "@/app/partida/live-actions";

function mmss(seg: number): string {
  const s = Math.max(0, Math.floor(seg || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function LiveMatchTelemetry({
  lobbyUuid,
  initial,
}: {
  lobbyUuid: string;
  initial: LiveMatchT | null;
}) {
  const [live, setLive] = useState<LiveMatchT | null>(initial);

  // Poll resiliente (nunca morre em erro) — mesma filosofia do resto do fluxo.
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const next = await getLiveMatchStats(lobbyUuid);
        if (alive && next) setLive(next);
      } catch {
        // transitório — tenta no próximo tick
      }
      if (alive) timer = setTimeout(tick, 8000);
    };
    timer = setTimeout(tick, 8000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [lobbyUuid]);

  if (!live || (!live.radiant && !live.dire)) return null;

  return (
    <section className="rounded-md border border-play-primary/40 bg-bg-elevated/40 p-4">
      <header className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-wide text-play-primary">
          <Radio size={15} className="animate-pulse" aria-hidden="true" />
          Ao vivo {live.stale && <span className="text-text-faded">(pausado)</span>}
        </span>
        <span className="font-display-condensed text-lg tabular-nums text-text-display">
          {mmss(live.gameTime)}
        </span>
      </header>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LiveTeam title="Iluminados" accent="text-[#00C466]" team={live.radiant} />
        <LiveTeam title="Temidos" accent="text-brand-primary" team={live.dire} />
      </div>
      <p className="mt-3 text-center font-body text-[0.65rem] text-text-faded">
        Atualiza sozinho · delay do DotaTV (~2-3 min, anti-cheat da Valve)
      </p>
    </section>
  );
}

function fmtNw(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function LiveTeam({
  title,
  accent,
  team,
}: {
  title: string;
  accent: string;
  team: LiveTeamT | null;
}) {
  if (!team) {
    return (
      <div className="rounded-sm border border-border-subtle bg-bg-surface p-3">
        <p className={`font-display text-sm font-bold uppercase tracking-wide ${accent}`}>{title}</p>
        <p className="mt-2 font-body text-sm text-text-faded">Sem dados ainda.</p>
      </div>
    );
  }
  return (
    <div className="rounded-sm border border-border-subtle bg-bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className={`font-display text-sm font-bold uppercase tracking-wide ${accent}`}>{title}</p>
        <span className="flex items-center gap-2 font-display-condensed text-sm tabular-nums">
          <span className="text-gold">{fmtNw(team.netWorth)}</span>
          <span className="text-text-faded">·</span>
          <span className="text-text-display">{team.score} k</span>
        </span>
      </div>
      <ul className="space-y-1">
        {team.players.map((p, i) => (
          <li key={i} className="flex items-center gap-2">
            {p.heroImage ? (
              <Image
                src={p.heroImage}
                alt={p.heroName ?? ""}
                title={p.heroName ?? undefined}
                width={30}
                height={17}
                unoptimized
                className="h-[17px] w-[30px] shrink-0 rounded-sm object-cover"
              />
            ) : (
              <span className="h-[17px] w-[30px] shrink-0 rounded-sm bg-bg-elevated" aria-hidden="true" />
            )}
            <span className="min-w-0 flex-1 truncate font-body text-xs text-text-body">
              {p.nick ?? p.heroName ?? "Jogador"}
            </span>
            <span className="shrink-0 font-display text-[0.6rem] uppercase text-text-faded">
              nv {p.level}
            </span>
            <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-text-muted">
              {p.k}/{p.d}/{p.a}
            </span>
            <span className="w-12 shrink-0 text-right font-mono text-xs tabular-nums text-gold">
              {fmtNw(p.netWorth)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
