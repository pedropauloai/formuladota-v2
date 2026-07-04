"use client";

// QueueSearchersPanel — "Quem está findando" + demanda por função.
//
// Dois contextos (Pedro 2026-06-28):
//   - MENU lateral (default): card com stack interativo (hover/clique → popover
//     com a lista) e linhas de função SÓ informativas.
//   - CONTADOR de busca (bare + onPickRole): sem chrome de card, stack estático,
//     e as linhas de função viram CLICÁVEIS → trocar de função na hora pra fechar
//     a que está faltando (re-fila instantânea, sem custo de permissão).
//
// Escala pra muitos jogadores: NÃO lista 1 por função (jogador flexível duplicaria)
// — 5 linhas numéricas fixas (nudge) + stack único deduplicado. Dados do RPC
// get_queue_searchers (só ALIVE); refetch via realtime de queue_live_stats.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Users, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  getQueueSearchers,
  type QueueSearcher,
  type QueueRole,
} from "@/app/queue/actions";
import { HonorRankMedal } from "@/components/ui/honor-rank-medal";
import { UserHoverCard } from "@/components/profile/user-hover-card";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { getTierForLevel } from "@/lib/levels";
import { ROLES, MODE_LABEL, MODE_ORDER } from "@/lib/queue/constants";

const ROLE_TARGET = 2; // jogadores por função pra fechar partida cheia
const ROLE_IDS: QueueRole[] = ROLES.map((r) => r.id);
const STACK_MAX = 6; // avatares no stack antes do "+N"
const LIST_MAX = 24; // jogadores no popover antes do "+N mais"

// Composição REAL (igual ao try_form_match): cada jogador ocupa UMA vaga, então um
// flexível (todas as funções) conta só 1x — não infla toda função pra "2/2". Mais
// restritos primeiro; o flexível vai pra função mais carente (distribui melhor).
function computeComposition(searchers: { roles: QueueRole[] }[]): {
  filled: Record<QueueRole, number>;
  totalAssigned: number;
} {
  const remaining: Record<QueueRole, number> = {
    safelane: ROLE_TARGET, midlane: ROLE_TARGET, offlane: ROLE_TARGET,
    support: ROLE_TARGET, support_dedicated: ROLE_TARGET,
  };
  const filled: Record<QueueRole, number> = {
    safelane: 0, midlane: 0, offlane: 0, support: 0, support_dedicated: 0,
  };
  const sorted = [...searchers].sort((a, b) => a.roles.length - b.roles.length);
  for (const s of sorted) {
    let best: QueueRole | null = null;
    for (const role of ROLE_IDS) {
      if (s.roles.includes(role) && remaining[role] > 0) {
        if (best === null || remaining[role] > remaining[best]) best = role;
      }
    }
    if (best) {
      remaining[best] -= 1;
      filled[best] += 1;
    }
  }
  const totalAssigned = ROLE_IDS.reduce((sum, r) => sum + filled[r], 0);
  return { filled, totalAssigned };
}

interface Props {
  /** Sem chrome de card e stack estático (contexto do contador de busca). */
  bare?: boolean;
  /** Se passado (contexto de busca), as 5 funções viram toggle: marca/desmarca. */
  onToggleRole?: (role: QueueRole) => void;
  /** Se passado, mostra o botão "Qualquer função" → fila por todas as 5. */
  onPickAll?: () => void;
  /** Funções que o próprio jogador filou (destaca as selecionadas no toggle). */
  myRoles?: QueueRole[];
}

export function QueueSearchersPanel({
  bare = false,
  onToggleRole,
  onPickAll,
  myRoles,
}: Props) {
  const t = useTranslations("playMenu");
  const [searchers, setSearchers] = useState<QueueSearcher[]>([]);
  const [open, setOpen] = useState(false); // hover (popover do menu)
  const [pinned, setPinned] = useState(false); // clique fixa (popover do menu)
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

  // Fecha o popover FIXADO ao clicar fora (só no contexto do menu).
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

  const visible = searchers;
  const total = visible.length;
  // Contagem POR MODO (cada jogador conta em cada modo que marcou).
  const modeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of visible) for (const m of s.gameModes) c[m] = (c[m] ?? 0) + 1;
    return c;
  }, [visible]);
  // Composição real (vagas ocupadas, flexível conta 1x) — usada só pro "faltam X pra formar".
  const comp = useMemo(() => computeComposition(visible), [visible]);
  // Quantos jogadores OFERECEM cada função (headcount; flexível conta em cada uma que topa).
  // Base intuitiva do nudge (Pedro 2026-07-01): substitui o X/2 de vagas — que confundia,
  // pois um flexível enche 1 vaga só e fazia a função marcada aparecer "0/2".
  const offers = useMemo(() => {
    const o: Record<QueueRole, number> = {
      safelane: 0, midlane: 0, offlane: 0, support: 0, support_dedicated: 0,
    };
    for (const s of visible) for (const r of s.roles) if (r in o) o[r as QueueRole] += 1;
    return o;
  }, [visible]);
  const myRoleSet = useMemo(() => new Set(myRoles ?? []), [myRoles]);
  // Funções carentes (menos de 2 ofertas) que EU ainda não cubro → o que vale a pena pegar.
  const neededRoles = ROLES.filter((r) => offers[r.id] < ROLE_TARGET && !myRoleSet.has(r.id));
  const missingToForm = Math.max(0, 10 - comp.totalAssigned);
  const showPopover = (open || pinned) && total > 0;
  const rootCls = bare
    ? ""
    : "mb-3 rounded-[var(--radius-md)] border border-border-subtle bg-bg-elevated/40 p-2.5";

  return (
    <div className={rootCls}>
      {/* Cabeçalho + contagem */}
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wide text-text-display">
          <Users size={14} className="text-play-primary" aria-hidden="true" />
          {t("searchersTitle")}
        </span>
        <span className="font-display text-sm font-bold tabular-nums text-gold">
          {t("searchersInQueue", { count: total })}
        </span>
      </div>

      {/* Contagem POR MODO de jogo. */}
      {total > 0 && (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {MODE_ORDER.filter((m) => modeCounts[m]).map((m) => (
            <span
              key={m}
              className="rounded-sm bg-bg-elevated px-1.5 py-0.5 font-display text-[0.65rem] uppercase tracking-wide text-text-muted"
            >
              {MODE_LABEL[m]} <span className="font-bold text-gold">{modeCounts[m]}</span>
            </span>
          ))}
        </div>
      )}

      {/* QUEM: stack deduplicado */}
      {total === 0 ? (
        <p className="font-body text-xs text-text-faded">{t("searchersEmpty")}</p>
      ) : bare ? (
        // Contexto da BUSCA: mostra TODOS os que estão findando, sem "+N" (Pedro
        // 2026-07-01 — transparência total de quem está na fila). Cada avatar tem
        // hover com o perfil; o teto de 10 por partida cabe folgado.
        <div className="flex items-center gap-2 px-1 py-1">
          <AvatarStack searchers={visible} hoverable max={Infinity} />
        </div>
      ) : (
        // Contexto do menu: stack interativo com popover.
        <div ref={wrapRef} className="relative">
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
            <AvatarStack searchers={visible} />
            <span className="ml-auto font-body text-[0.7rem] uppercase tracking-wide text-text-faded">
              {t("searchersSeeAll")}
            </span>
          </button>

          {showPopover && (
            <div className="absolute left-0 right-0 top-full z-[var(--z-system)] mt-1 max-h-72 overflow-y-auto rounded-[var(--radius-md)] border border-border-strong bg-bg-base p-2 shadow-[var(--shadow-cinematic)]">
              <ul className="space-y-1">
                {visible.slice(0, LIST_MAX).map((s) => (
                  <SearcherRow key={s.userId} s={s} />
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
      )}

      {/* Faltam quantos jogadores pra fechar os 10 (contagem simples, sem X/2 por vaga). */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border-subtle/60 pt-2">
        <span className="font-display text-xs font-bold uppercase tracking-wide text-text-muted">
          {t("searchersToFormLabel")}
        </span>
        <span
          className={`font-display text-sm font-bold tabular-nums ${
            missingToForm === 0 ? "text-play-primary" : "text-gold"
          }`}
        >
          {missingToForm === 0
            ? t("searchersFormReady")
            : t("searchersToFormCount", { count: missingToForm })}
        </span>
      </div>

      {onToggleRole ? (
        // CONTEXTO DE BUSCA — controle completo: as 5 funções viram TOGGLE (marca e
        // desmarca com o mesmo toque). Selecionada = destaque + check; carente (nudge)
        // = dourada; disponível = neutra. Re-fila na hora (mantém o tempo).
        <>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 font-display text-[0.7rem] font-bold uppercase tracking-wide text-play-primary">
              {t("searchersYouOffer")}
            </span>
            {ROLES.map((r) => {
              const on = myRoleSet.has(r.id);
              const scarce = offers[r.id] < ROLE_TARGET;
              const cls = on
                ? "border-play-primary/50 bg-play-primary/15 text-play-primary"
                : scarce
                  ? "border-gold/40 bg-gold/10 text-gold hover:bg-gold/20"
                  : "border-border-subtle bg-bg-elevated text-text-muted hover:border-play-primary/40";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onToggleRole(r.id)}
                  aria-pressed={on}
                  title={t(r.key)}
                  className={`flex items-center gap-1 rounded-sm border px-1.5 py-0.5 font-display text-[0.7rem] font-semibold uppercase tracking-wide transition-colors ${cls}`}
                >
                  <Image src={`/dota/positions/pos-${r.pos}.png`} alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" aria-hidden="true" />
                  <span className="truncate">{t(r.key)}</span>
                  {on && <Check size={11} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
          <p className="mt-1 font-body text-[0.7rem] text-text-faded">{t("searchersToggleHint")}</p>
        </>
      ) : (
        // CONTEXTO DE MENU — só informativo: funções carentes (a seleção é na lista abaixo).
        neededRoles.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="font-display text-[0.7rem] font-bold uppercase tracking-wide text-gold">
              {t("searchersNeededRoles")}
            </span>
            {neededRoles.map((r) => (
              <span
                key={r.id}
                title={t(r.key)}
                className="flex items-center gap-1 rounded-sm border border-border-subtle bg-bg-elevated px-1.5 py-0.5 font-display text-[0.7rem] font-semibold uppercase tracking-wide text-text-muted"
              >
                <Image src={`/dota/positions/pos-${r.pos}.png`} alt="" width={14} height={14} className="size-3.5 shrink-0 object-contain" aria-hidden="true" />
                <span className="truncate">{t(r.key)}</span>
              </span>
            ))}
          </div>
        )
      )}

      {/* Findar TODAS as funções (mais flexível = fila mais rápida). */}
      {onPickAll && (myRoles?.length ?? 0) < ROLES.length && (
        <button
          type="button"
          onClick={onPickAll}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-md)] border border-gold/40 bg-gold/10 px-2.5 py-1.5 font-display text-sm font-bold uppercase tracking-wide text-gold transition-colors hover:bg-gold/20"
        >
          <Check size={14} aria-hidden="true" /> {t("anyRole")}
        </button>
      )}
    </div>
  );
}

/* ---------------- helpers ---------------- */

function AvatarStack({
  searchers,
  hoverable = false,
  max = STACK_MAX,
}: {
  searchers: QueueSearcher[];
  /** Envolve cada avatar num UserHoverCard. NÃO usar dentro de <button>. */
  hoverable?: boolean;
  /** Máx de avatares antes do "+N". No contexto de busca passa Infinity (mostra TODOS
      — transparência total de quem está findando, sem truncar). */
  max?: number;
}) {
  const extra = searchers.length - max;
  return (
    <>
      <span className="flex flex-wrap gap-y-1">
        {searchers.slice(0, max).map((s, i) => {
          const img = s.avatar ? (
            <Image
              src={s.avatar}
              alt=""
              width={24}
              height={24}
              className="size-6 rounded-sm object-cover"
              unoptimized
            />
          ) : (
            <span className="block size-6 rounded-sm bg-bg-elevated" aria-hidden="true" />
          );
          return (
            <span
              key={s.userId}
              className="rounded-sm ring-1 ring-bg-deep"
              style={{ marginLeft: i === 0 ? 0 : -6 }}
            >
              {hoverable ? (
                <UserHoverCard userId={s.userId} className="block">
                  {img}
                </UserHoverCard>
              ) : (
                img
              )}
            </span>
          );
        })}
      </span>
      {extra > 0 && (
        <span className="font-display text-xs font-bold tabular-nums text-text-muted">
          +{extra}
        </span>
      )}
    </>
  );
}

function SearcherRow({ s }: { s: QueueSearcher }) {
  return (
    <li className="flex items-center gap-2 rounded-sm border border-border-subtle/60 bg-bg-surface px-2 py-1">
      <UserHoverCard
        userId={s.userId}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        {/* Avatar com anel de XP + badge de nível (padrão da plataforma). */}
        <XpAvatarRing
          src={s.avatar}
          alt={s.name}
          fallback={s.name.slice(0, 2).toUpperCase()}
          level={s.level}
          pct={0}
          size={24}
        />
        <span className="min-w-0 flex-1 truncate font-body text-xs text-text-body hover:text-text-display">
          {s.name}
        </span>
      </UserHoverCard>
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
      {/* Modo(s) que o jogador está buscando. */}
      <span className="flex shrink-0 items-center gap-1">
        {MODE_ORDER.filter((m) => s.gameModes.includes(m)).map((m) => (
          <span
            key={m}
            className="rounded-sm bg-bg-elevated px-1 py-0.5 font-display text-[0.58rem] uppercase tracking-wide text-text-faded"
          >
            {MODE_LABEL[m]}
          </span>
        ))}
      </span>
      <HonorRankMedal rank={getTierForLevel(s.level)} size="sm" tooltip={false} />
    </li>
  );
}
