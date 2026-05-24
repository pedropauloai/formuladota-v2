"use client";

// Bottom bar client — botão grande flutuante. Comportamento condicional:
//
//   Visitante deslogado          -> form "ENTRAR pra subir de MMR" (verde)
//   Admin (real)                 -> link "Painel PROs" -> /admin/pros (verde)
//   Sem ficha                    -> link "Comprar Ficha" -> /checkout/[id] (amber)
//   Com ficha + na fila          -> botão "Na fila" -> abre QueueStatusModal (blue)
//   Com ficha + fora da fila     -> botão "Jogar Dota" -> abre JoinQueueModal (verde)
//
// VISITANTE DESLOGADO (task #63 — 2026-05-24): bottom-bar mantém presença
// cinematic com CTA "ENTRAR pra subir de MMR" (Server Action OAuth Discord).
// Não esconde a barra inteira — visitante precisa do peso visual do header +
// bottom-bar pra perceber a plataforma como "client" jogável, não como
// landing institucional.

import { useState } from "react";
import Link from "next/link";
import { Play, Coins, Radio, Hourglass, LogIn } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { JoinQueueModal } from "@/components/landing/join-queue-modal";
import { QueueStatusModal } from "@/components/landing/queue-status-modal";
import { signInWithDiscord } from "@/app/login/actions";

interface Props {
  /** Visitante deslogado: troca CTA de jogo por CTA "Entrar pra subir de MMR". */
  isVisitor: boolean;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  prosOnline: ProLiveStatus[];
  myQueues: MyQueueEntry[];
}

export function DashboardBottomBar({
  isVisitor,
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
      <div className="relative z-[var(--z-overlay)] flex h-20 shrink-0 items-center justify-end px-4 xl:h-24 xl:px-6 2xl:h-28 2xl:px-8 pointer-events-none">
        <Cta
          isVisitor={isVisitor}
          isAdmin={isAdmin}
          fichaBalance={fichaBalance}
          fichaPackageId={fichaPackageId}
          inQueue={inQueue}
          onlineProsCount={onlineProsCount}
          onJoinClick={() => setJoinModalOpen(true)}
          onStatusClick={() => setStatusModalOpen(true)}
        />
      </div>

      {/* Modais só fazem sentido pra logado — visitante nunca chega aqui pq Cta
          retorna form OAuth antes. Renderizar do mesmo jeito mantém hooks
          consistentes no client. */}
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
  isVisitor: boolean;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  inQueue: boolean;
  onlineProsCount: number;
  onJoinClick: () => void;
  onStatusClick: () => void;
}

function Cta({
  isVisitor,
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
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
      aria-hidden="true"
    />;

  // Visitante deslogado — CTA OAuth Discord. Vem ANTES do admin/fila pq nenhum
  // desses estados é alcançável sem sessão.
  if (isVisitor) {
    return (
      <form action={signInWithDiscord}>
        <button
          type="submit"
          className={`${base} border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover text-text-display shadow-[var(--color-play-primary-glow)] hover:shadow-[var(--color-play-primary-glow)]`}
        >
          <LogIn size={22} aria-hidden="true" />
          <span>Entrar pra subir de MMR</span>
          {shine}
        </button>
      </form>
    );
  }

  // Admin (real) — atalho pro painel
  if (isAdmin) {
    return (
      <Link
        href="/admin/pros"
        className={`${base} border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover text-text-display shadow-[var(--color-play-primary-glow)] hover:shadow-[var(--color-play-primary-glow)]`}
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
        className={`${base} border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover text-text-display shadow-[var(--color-play-primary-glow)] hover:shadow-[var(--color-play-primary-glow)]`}
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
