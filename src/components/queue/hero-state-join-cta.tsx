"use client";

// Cliente: botão "Entrar na fila agora" do HeroState que abre o JoinQueueModal.
// Mesmo modal usado pela bottom-bar — UX consistente.

import { useState } from "react";
import { Play, ArrowRight } from "lucide-react";
import type { ProLiveStatus } from "@/lib/queries/pros";
import { JoinQueueModal } from "@/components/landing/join-queue-modal";

interface Props {
  coachId: string;
  viewerUserId: string;
  prosOnline: ProLiveStatus[];
  fichaBalance: number;
}

export function HeroStateJoinCta({ prosOnline, fichaBalance }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 inline-flex items-center justify-center gap-3 rounded-md border-2 border-play-primary bg-gradient-to-b from-play-primary to-play-primary-hover px-8 py-3 font-display text-base font-bold uppercase tracking-[0.2em] text-text-display shadow-lg shadow-[var(--color-play-primary-glow)] transition-all hover:scale-[1.02] hover:shadow-[var(--color-play-primary-glow)] xl:px-12 xl:py-4 xl:text-lg xl:tracking-[0.25em]"
      >
        <Play size={20} fill="currentColor" aria-hidden="true" />
        Entrar na fila agora
        <ArrowRight size={16} aria-hidden="true" />
      </button>
      <JoinQueueModal
        open={open}
        onClose={() => setOpen(false)}
        prosOnline={prosOnline}
        fichaBalance={fichaBalance}
      />
    </>
  );
}
