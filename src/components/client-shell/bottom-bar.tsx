"use client";

// Bottom bar — botão grande flutuante "Jogar Dota" que abre o PlayMenu (menu lateral
// de modalidades, estilo Dota 2: Competitiva / Salas Personalizadas / Ranked com PRO).
//
// Estados:
//   Visitante       -> "Jogar Dota" abre o menu (vitrine); as ações pedem login.
//   Admin (real)    -> "Painel PROs" (atalho pro painel).
//   Em fila (PRO)   -> "Na fila" abre QueueStatusModal.
//   Default         -> "Jogar Dota" abre o PlayMenu.
//
// Pedro 2026-06-03: deixou de ser "Entrar pra subir de MMR" / acoplado a ficha —
// agora é "Jogar Dota" abrindo o menu, igual ao cliente do Dota 2. Ficha/permissão
// são tratadas DENTRO de cada modalidade no PlayMenu.

import { useState } from "react";
import Link from "next/link";
import { Play, Radio, Hourglass } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import { QueueStatusModal } from "@/components/landing/queue-status-modal";
import { PlayMenu } from "./play-menu";

interface Props {
  /** Visitante deslogado: o menu abre como vitrine, ações disparam login. */
  isVisitor: boolean;
  isAdmin: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  prosOnline: ProLiveStatus[];
  myQueues: MyQueueEntry[];
}

export function DashboardBottomBar({ isVisitor, isAdmin, myQueues }: Props) {
  const [playOpen, setPlayOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const inQueue = myQueues.length > 0;

  return (
    <>
      <div className="relative z-[var(--z-overlay)] flex h-20 shrink-0 items-center justify-end px-4 xl:h-24 xl:px-6 2xl:h-28 2xl:px-8 pointer-events-none">
        <Cta
          isVisitor={isVisitor}
          isAdmin={isAdmin}
          inQueue={inQueue}
          onPlayClick={() => setPlayOpen(true)}
          onStatusClick={() => setStatusModalOpen(true)}
        />
      </div>

      <PlayMenu open={playOpen} onClose={() => setPlayOpen(false)} isVisitor={isVisitor} />
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
  inQueue: boolean;
  onPlayClick: () => void;
  onStatusClick: () => void;
}

function Cta({ isVisitor, isAdmin, inQueue, onPlayClick, onStatusClick }: CtaProps) {
  const base =
    "pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 px-8 font-display text-lg font-bold uppercase tracking-[0.25em] shadow-lg transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em]";
  const shine = (
    <span
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
      aria-hidden="true"
    />
  );

  // Admin (real) — atalho pro painel (não para visitante).
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

  // Em fila do PRO — abre o status da fila.
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

  // Visitante e usuário comum — "Jogar Dota" abre o menu de modalidades.
  return (
    <button
      type="button"
      onClick={onPlayClick}
      className={`${base} border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover text-text-display shadow-[var(--color-play-primary-glow)] hover:shadow-[var(--color-play-primary-glow)]`}
    >
      <Play size={22} fill="currentColor" aria-hidden="true" />
      <span>Jogar Dota</span>
      {shine}
    </button>
  );
}
