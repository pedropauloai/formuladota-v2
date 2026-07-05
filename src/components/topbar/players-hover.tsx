"use client";

// Hover de LISTA de jogadores pro topbar (fila / online). Usa Radix HoverCard
// (área de graça nativa → persiste ao descer o mouse pro card). Busca os dados
// sob demanda quando abre. Cada linha: avatar + medalha da season (com o número
// do leaderboard pros Imortais) + nome + funções (quando é fila).

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { SeasonRankMedal } from "@/components/ui/season-rank-medal";
import { ROLES } from "@/lib/queue/constants";
import type { QueueRole } from "@/app/queue/actions";

export interface HoverPlayer {
  userId: string;
  name: string;
  avatar: string | null;
  mmr: number | null;
  level: number;
  xpPct?: number;
  seasonPos: number | null;
  /** Só na fila — funções que o jogador filou (mostra os ícones de posição). */
  roles?: QueueRole[];
}

export function PlayersHover({
  children,
  load,
  title,
  emptyText,
}: {
  children: ReactNode;
  load: () => Promise<HoverPlayer[]>;
  title: string;
  emptyText: string;
}) {
  const [players, setPlayers] = useState<HoverPlayer[] | null>(null);
  const [loading, setLoading] = useState(false);

  function onOpenChange(open: boolean) {
    if (open) {
      setLoading(true);
      void load()
        .then((p) => setPlayers(p))
        .catch(() => setPlayers([]))
        .finally(() => setLoading(false));
    }
  }

  return (
    <HoverCard openDelay={120} closeDelay={200} onOpenChange={onOpenChange}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent align="center" className="w-80 p-2">
        <p className="mb-1.5 px-1 font-display text-xs font-bold uppercase tracking-wide text-text-faded">
          {title}
        </p>
        {players === null || loading ? (
          <ul className="space-y-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-2 rounded-sm px-1.5 py-1">
                <span className="size-6 shrink-0 animate-pulse rounded-sm bg-bg-elevated" />
                <span className="h-3 w-2/3 animate-pulse rounded bg-bg-elevated" />
              </li>
            ))}
          </ul>
        ) : players.length === 0 ? (
          <p className="px-1 py-3 text-center font-body text-xs text-text-faded">{emptyText}</p>
        ) : (
          <ul className="max-h-80 space-y-0.5 overflow-y-auto">
            {players.map((p) => (
              <li
                key={p.userId}
                className="flex items-center gap-2 rounded-sm px-1.5 py-1 hover:bg-bg-elevated/50"
              >
                <XpAvatarRing
                  src={p.avatar}
                  alt={p.name}
                  fallback={p.name.slice(0, 2).toUpperCase()}
                  level={p.level}
                  pct={p.xpPct ?? 0}
                  size={26}
                />
                <SeasonRankMedal mmr={p.mmr} position={p.seasonPos} size="sm" className="shrink-0" />
                <span className="min-w-0 flex-1 truncate font-body text-xs text-text-body">
                  {p.name}
                </span>
                {p.roles && p.roles.length > 0 && (
                  <span className="flex shrink-0 items-center gap-0.5">
                    {ROLES.filter((r) => p.roles!.includes(r.id)).map((r) => (
                      <Image
                        key={r.id}
                        src={`/dota/positions/pos-${r.pos}.png`}
                        alt=""
                        width={14}
                        height={14}
                        className="size-3.5 object-contain"
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
