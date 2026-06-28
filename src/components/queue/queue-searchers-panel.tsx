"use client";

// QueueSearchersPanel — "Quem está findando" (acima da seleção de função no find).
//
// match_queue é RLS self → a lista global vem do RPC get_queue_searchers (migration
// 062, SECURITY DEFINER): identidade Steam + funções filadas + nível/HONOR. O painel
// assina o realtime da fila (queue_live_stats, migration 061) e, a cada evento,
// refetcha — push, sem polling. Agrupa por função, com ícone de role (pos-N) +
// identidade Steam + medalha de HONOR/nível. Mostra o placar de vagas por função.

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getQueueSearchers,
  type QueueSearcher,
  type QueueRole,
} from "@/app/queue/actions";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { getTierForLevel } from "@/lib/levels";

const ROLES: { id: QueueRole; pos: string; key: string }[] = [
  { id: "safelane", pos: "1", key: "roleSafelane" },
  { id: "midlane", pos: "2", key: "roleMidlane" },
  { id: "offlane", pos: "3", key: "roleOfflane" },
  { id: "support", pos: "4", key: "roleSupport" },
  { id: "support_dedicated", pos: "5", key: "roleSupportDedicated" },
];

const ROLE_TARGET = 2; // jogadores por função pra fechar partida cheia
const MATCH_SIZE = 10;

export function QueueSearchersPanel() {
  const t = useTranslations("playMenu");
  const [searchers, setSearchers] = useState<QueueSearcher[]>([]);
  const channelId = useId();
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    const supabase = createClient();
    const refetch = async () => {
      const list = await getQueueSearchers();
      if (aliveRef.current) setSearchers(list);
    };
    void refetch(); // snapshot inicial (o realtime só entrega mudanças)
    const channel = supabase
      .channel(`queue-searchers-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "queue_live_stats",
          filter: "id=eq.singleton",
        },
        () => void refetch()
      )
      .subscribe();
    return () => {
      aliveRef.current = false;
      void supabase.removeChannel(channel);
    };
  }, [channelId]);

  const total = searchers.length;

  return (
    <div className="mb-3 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-text-display">
          <Users size={14} className="text-play-primary" aria-hidden="true" />
          {t("searchersTitle")}
        </span>
        {/* Placar da partida se formando. */}
        <span className="font-display text-sm font-bold tabular-nums text-gold">
          {Math.min(total, MATCH_SIZE)}/{MATCH_SIZE}
        </span>
      </div>

      {total === 0 ? (
        <p className="font-body text-xs text-text-faded">{t("searchersEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {ROLES.map((r) => {
            // Jogador flexível aparece em cada função que filou (mostra disponibilidade).
            const inRole = searchers.filter((s) => s.roles.includes(r.id));
            const needed = inRole.length < ROLE_TARGET;
            return (
              <li key={r.id}>
                <div className="mb-1 flex items-center gap-1.5">
                  <Image
                    src={`/dota/positions/pos-${r.pos}.png`}
                    alt=""
                    width={16}
                    height={16}
                    className="size-4 shrink-0 object-contain"
                    aria-hidden="true"
                  />
                  <span className="font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
                    {t(r.key)}
                  </span>
                  <span
                    className={`ml-auto font-display text-xs font-bold tabular-nums ${
                      needed ? "text-gold" : "text-play-primary"
                    }`}
                  >
                    {Math.min(inRole.length, ROLE_TARGET)}/{ROLE_TARGET}
                  </span>
                </div>
                {inRole.length === 0 ? (
                  <p className="pl-6 font-body text-[0.7rem] text-text-faded">
                    {t("searchersNeedRole")}
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {inRole.map((s) => (
                      <li
                        key={s.userId}
                        className="flex items-center gap-2 rounded-sm border border-border-subtle/60 bg-bg-surface px-2 py-1"
                      >
                        {s.avatar ? (
                          <Image
                            src={s.avatar}
                            alt=""
                            width={20}
                            height={20}
                            className="size-5 shrink-0 rounded-sm object-cover"
                            unoptimized
                          />
                        ) : (
                          <span
                            className="size-5 shrink-0 rounded-sm bg-bg-elevated"
                            aria-hidden="true"
                          />
                        )}
                        <span className="flex-1 truncate font-body text-xs text-text-body">
                          {s.name}
                        </span>
                        <span className="shrink-0 font-display text-[0.7rem] font-bold tabular-nums text-text-muted">
                          {t("playerLevelShort", { level: s.level })}
                        </span>
                        <HonorRankMedal
                          rank={getTierForLevel(s.level)}
                          size="sm"
                          tooltip={false}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
