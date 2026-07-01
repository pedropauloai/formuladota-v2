"use client";

// Bottom bar — canto inferior-direito. Estados:
//   Visitante / usuário comum -> PlayMenu (botão "Jogar Dota" + painel de modalidades
//                                que cresce a partir do botão, estilo Dota 2).
//   Admin (real)              -> "Painel PROs" (atalho).
//   Em fila (PRO)             -> "Na fila" abre QueueStatusModal.
//
// Pedro 2026-06-03: "Jogar Dota" abre o menu de modalidades (não mais "Entrar pra subir
// de MMR" / acoplado a ficha). Ficha/permissão são tratadas dentro de cada modalidade.

import { useState } from "react";
import { Hourglass } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import type { MyQueueEntry } from "@/lib/queries/queue";
import type { PlayMenuState } from "@/lib/play-menu-preference";
import type { SmokeAsset } from "@/lib/cosmetics";
import { QueueStatusModal } from "@/components/landing/queue-status-modal";
import { useTranslations } from "next-intl";
import { PlayMenu } from "./play-menu";
import { ReadyCheckOverlay } from "@/components/queue/ready-check-overlay";

interface Props {
  /** Visitante deslogado: o menu abre como vitrine, ações disparam login. */
  isVisitor: boolean;
  fichaBalance: number;
  fichaPackageId: string | null;
  prosOnline: ProLiveStatus[];
  myQueues: MyQueueEntry[];
  /** Estado do menu Jogar Dota (cookie) — persiste entre rotas. */
  initialPlayMenu: PlayMenuState;
  /** Está em grupo? A busca vira "em grupo" (todos entram na fila juntos). */
  inParty: boolean;
  /** Fumaça equipada (cosmético) — aplicada no card de busca e no ready-check. */
  smokeTheme?: SmokeAsset | null;
}

export function DashboardBottomBar({
  isVisitor,
  myQueues,
  initialPlayMenu,
  inParty,
  smokeTheme = null,
}: Props) {
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const inQueue = myQueues.length > 0;

  return (
    <>
      <div
        className="relative z-[var(--z-overlay)] flex h-20 shrink-0 items-end justify-end xl:h-24 2xl:h-28 pointer-events-none"
        // padding via inline (imune ao JIT do Tailwind que não gerava pr-*): fiel ao
        // cliente Dota — mais respiro à direita do que embaixo. Pedro 2026-07-01.
        style={{ paddingRight: "2.75rem", paddingBottom: "1.25rem" }}
      >
        <Cta
          isVisitor={isVisitor}
          inQueue={inQueue}
          initialPlayMenu={initialPlayMenu}
          inParty={inParty}
          smokeTheme={smokeTheme}
          onStatusClick={() => setStatusModalOpen(true)}
        />
      </div>

      <QueueStatusModal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        myQueues={myQueues}
      />

      {/* Ready check (popup central "partida encontrada") — global pra logados. */}
      {!isVisitor && <ReadyCheckOverlay smokeTheme={smokeTheme} />}
    </>
  );
}

interface CtaProps {
  isVisitor: boolean;
  inQueue: boolean;
  initialPlayMenu: PlayMenuState;
  inParty: boolean;
  smokeTheme: SmokeAsset | null;
  onStatusClick: () => void;
}

function Cta({
  isVisitor,
  inQueue,
  initialPlayMenu,
  inParty,
  smokeTheme,
  onStatusClick,
}: CtaProps) {
  const t = useTranslations("shell");
  const base =
    "pointer-events-auto group relative flex h-11 items-center gap-3 overflow-hidden rounded-md border-2 px-8 font-display text-lg font-bold uppercase tracking-[0.25em] shadow-lg transition-all hover:scale-[1.02] xl:h-12 xl:px-12 xl:text-xl 2xl:h-14 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em]";
  const shine = (
    <span
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform [transition-duration:var(--motion-duration-hero)] group-hover:translate-x-full"
      aria-hidden="true"
    />
  );

  // Em fila do PRO — abre o status da fila.
  if (inQueue) {
    return (
      <button
        type="button"
        onClick={onStatusClick}
        className={`${base} border-emerald-500 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white shadow-emerald-500/40 hover:shadow-emerald-500/60`}
      >
        <Hourglass size={22} aria-hidden="true" />
        <span>{t("inQueue")}</span>
        {shine}
      </button>
    );
  }

  // Visitante e usuário comum — PlayMenu (drawer full-height + estados persistidos).
  return (
    <PlayMenu
      isVisitor={isVisitor}
      initial={initialPlayMenu}
      inParty={inParty}
      smokeTheme={smokeTheme}
    />
  );
}
