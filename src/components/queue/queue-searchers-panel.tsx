"use client";

// QueueSearchersPanel — "Quem está findando" (acima da seleção de função no find).
//
// Escala pra muitos jogadores (Pedro 2026-06-28): NÃO lista um por função (jogador
// flexível duplicaria). Em vez disso:
//   - DEMANDA por função: 5 linhas numéricas fixas (o nudge — qual função falta).
//   - QUEM: um stack ÚNICO deduplicado de avatares; hover abre / clique FIXA um
//     popover com a lista (cada pessoa 1x, com as funções como mini-ícones).
//
// Dados: RPC get_queue_searchers (migration 062/063, só ALIVE). O painel assina o
// realtime da fila (queue_live_stats) e refetcha no evento — push, sem polling.

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
const STACK_MAX = 6; // avatares no stack antes do "+N"
const LIST_MAX = 24; // jogadores no popover antes do "+N mais"

export function QueueSearchersPanel() {
  const t = useTranslations("playMenu");
  const [searchers, setSearchers] = useState<QueueSearcher[]>([]);
  const [open, setOpen] = useState(false); // hover
  const [pinned, setPinned] = useState(false); // clique fixa
  const channelId = useId();
  const aliveRef = useRef(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    aliveRef.current = true;
    const supabase = createClient();
    const refetch = async () => {
      const list = await getQueueSearchers();
      if (aliveRef.current) setSearchers(list);
    };
    void refetch(); // snapshot inicial (realtime só entrega mudanças)
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

  // Fecha o popover FIXADO ao clicar fora.
  useEffect(() => {
    if (!pinned) return;
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setPinned(false);
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pinned]);

  const total = searchers.length;
  const showPopover = (open || pinned) && total > 0;

  return (
    <div className="mb-3 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-2.5">
      {/* Cabeçalho + stack de "quem" (deduplicado) */}
      <div ref={wrapRef} className="relative">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-text-display">
            <Users size={14} className="text-play-primary" aria-hidden="true" />
            {t("searchersTitle")}
          </span>
          <span className="font-display text-sm font-bold tabular-nums text-gold">
            {t("searchersInQueue", { count: total })}
          </span>
        </div>

        {total === 0 ? (
          <p className="font-body text-xs text-text-faded">{t("searchersEmpty")}</p>
        ) : (
          <button
            type="button"
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => {
              if (!pinned) setOpen(false);
            }}
            onClick={() => {
              setPinned((p) => !p);
              setOpen(true);
            }}
            aria-expanded={showPopover}
            className="flex w-full items-center gap-2 rounded-sm px-1 py-1 transition-colors hover:bg-bg-elevated/60"
          >
            <span className="flex">
              {searchers.slice(0, STACK_MAX).map((s, i) => (
                <span
                  key={s.userId}
                  className="rounded-sm ring-1 ring-bg-deep"
                  style={{ marginLeft: i === 0 ? 0 : -6 }}
                >
                  {s.avatar ? (
                    <Image
                      src={s.avatar}
                      alt=""
                      width={24}
                      height={24}
                      className="size-6 rounded-sm object-cover"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="block size-6 rounded-sm bg-bg-elevated"
                      aria-hidden="true"
                    />
                  )}
                </span>
              ))}
            </span>
            {total > STACK_MAX && (
              <span className="font-display text-xs font-bold tabular-nums text-text-muted">
                +{total - STACK_MAX}
              </span>
            )}
            <span className="ml-auto font-body text-[0.7rem] uppercase tracking-wide text-text-faded">
              {t("searchersSeeAll")}
            </span>
          </button>
        )}

        {/* Popover com a lista deduplicada */}
        {showPopover && (
          <div className="absolute left-0 right-0 top-full z-[var(--z-system)] mt-1 max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-border-strong bg-bg-base p-2 shadow-[var(--shadow-cinematic)]">
            <ul className="space-y-1">
              {searchers.slice(0, LIST_MAX).map((s) => (
                <li
                  key={s.userId}
                  className="flex items-center gap-2 rounded-sm border border-border-subtle/60 bg-bg-surface px-2 py-1"
                >
                  {s.avatar ? (
                    <Image
                      src={s.avatar}
                      alt=""
                      width={22}
                      height={22}
                      className="size-[22px] shrink-0 rounded-sm object-cover"
                      unoptimized
                    />
                  ) : (
                    <span
                      className="size-[22px] shrink-0 rounded-sm bg-bg-elevated"
                      aria-hidden="true"
                    />
                  )}
                  <span className="min-w-0 flex-1 truncate font-body text-xs text-text-body">
                    {s.name}
                  </span>
                  {/* Funções filadas (mini-ícones). */}
                  <span className="flex shrink-0 items-center gap-0.5">
                    {ROLES.filter((r) => s.roles.includes(r.id)).map((r) => (
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
            {total > LIST_MAX && (
              <p className="px-1 pt-1 font-body text-[0.7rem] text-text-faded">
                {t("searchersMore", { count: total - LIST_MAX })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Demanda por função — nudge fixo (5 linhas, nunca cresce). */}
      <ul className="mt-2.5 space-y-1">
        {ROLES.map((r) => {
          const count = searchers.filter((s) => s.roles.includes(r.id)).length;
          const needed = count < ROLE_TARGET;
          const accent = needed ? "text-gold" : "text-play-primary";
          return (
            <li key={r.id} className="flex items-center gap-2">
              <Image
                src={`/dota/positions/pos-${r.pos}.png`}
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0 object-contain"
                aria-hidden="true"
              />
              <span className="flex-1 truncate font-display text-xs font-semibold uppercase tracking-wide text-text-muted">
                {t(r.key)}
              </span>
              <span className={`font-display text-xs font-bold tabular-nums ${accent}`}>
                {Math.min(count, ROLE_TARGET)}/{ROLE_TARGET}
              </span>
              <span className={`w-14 shrink-0 text-right font-body text-[0.7rem] ${accent}`}>
                {count === 0
                  ? t("searchersNeeded")
                  : needed
                    ? t("searchersMissing", { count: ROLE_TARGET - count })
                    : t("searchersReady")}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
