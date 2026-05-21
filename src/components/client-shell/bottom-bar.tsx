"use client";

// Bottom bar client — botão grande flutuante. Comportamento condicional:
//
//   Admin (real)                 -> link "Painel PROs" -> /admin/pros (verde)
//   Sem ficha                    -> link "Comprar Ficha" -> /checkout/[id] (amber)
//   Com ficha + na fila          -> botão "Na fila" -> abre QueueStatusModal (blue)
//   Com ficha + fora da fila     -> botão "Jogar Dota" -> abre JoinQueueModal (verde)

import { useState } from "react";
import Link from "next/link";
import { Play, Coins, Radio, Hourglass } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { JoinQueueModal } from "@/components/landing/join-queue-modal";
import { QueueStatusModal } from "@/components/landing/queue-status-modal";

interface Props {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  prosOnline: ProLiveStatus[];
  myQueues: MyQueueEntry[];
}

export function DashboardBottomBar({
  isAdmin,
  fichaBalance,
  fichaPackageId,
  prosOnline,
  myQueues,
}: Props) {
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const inQueue = myQueues.length > 0;
  const onlineProsCount = prosOnline.filter((p) => p.filaAberta).length;

  return (
    <>
      <div className="relative z-20 flex h-20 shrink-0 items-center justify-end px-4 xl:h-24 xl:px-6 2xl:h-28 2xl:px-8 pointer-events-none">
        <Cta
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          inQueue={inQueue}
          onlineProsCount={onlineProsCount}
          onJoinClick={() => setJoinModalOpen(true)}
          onStatusClick={() => setStatusModalOpen(true)}
        />
      </div>

      <JoinQueueModal
        open={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        prosOnline={prosOnline}
        fichaBalance={fichaBalance}
      />
      <QueueStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        myQueues={myQueues}
      />
    </>
  );
}

interface CtaProps {
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  inQueue: boolean;
  onlineProsCount: number;
  onJoinClick: () => void;
  onStatusClick: () => void;
}

function Cta({
  isAdmin,
  fichaBalance,
  fichaPackageId,
  inQueue,
  onlineProsCount,
  onJoinClick,
  onStatusClick,
}: CtaProps) {
  const base =
    "pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 px-8 font-display text-lg font-bold uppercase tracking-[0.25em] shadow-lg transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em]";
  const shine =
    <span
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
      aria-hidden="true"
    />;

  // Admin (real) — atalho pro painel
  if (isAdmin) {
    return (
      <Link
        href="/admin/pros"
        className={`${base} border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] text-white shadow-[var(--color-play-green)]/40 hover:shadow-[var(--color-play-green)]/60`}
      >
        <Radio size={22} aria-hidden="true" />
        <span>Painel PROs</span>
        {shine}
      </Link>
    );
  }

  // Cliente em fila — abre QueueStatusModal
  if (inQueue) {
    return (
      <button
        type="button"
        onClick={onStatusClick}
        className={`${base} border-emerald-500 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60`}
      >
        <Hourglass size={22} aria-hidden="true" />
        <span>Na fila</span>
        {shine}
      </button>
    );
  }

  // Cliente com ficha — abre JoinQueueModal
  if (fichaBalance > 0) {
    return (
      <button
        type="button"
        onClick={onJoinClick}
        className={`${base} border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] text-white shadow-[var(--color-play-green)]/40 hover:shadow-[var(--color-play-green)]/60`}
      >
        <Play size={22} fill="currentColor" aria-hidden="true" />
        <span>Jogar Dota</span>
        {onlineProsCount === 0 && (
          <span className="ml-2 rounded-md bg-black/30 px-2 py-0.5 font-mono text-[10px] tracking-widest">
            sem PRO
          </span>
        )}
        {shine}
      </button>
    );
  }

  // Cliente sem ficha — link pro checkout
  return (
    <Link
      href={fichaPackageId ? `/checkout/${fichaPackageId}` : "/codigo-de-conduta"}
      className={`${base} border-amber-400 bg-gradient-to-b from-amber-300 to-amber-500 text-black shadow-amber-500/40 hover:shadow-amber-400/60`}
    >
      <Coins size={22} aria-hidden="true" />
      <span>Comprar Ficha</span>
      {shine}
    </Link>
  );
}
