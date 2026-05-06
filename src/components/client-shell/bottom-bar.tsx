// Bottom bar minimal — só o botão JOGAR DOTA flutuante à direita.
// Sem footer, sem chat input, sem counter — visual de client de jogo.
// Click abre PlayPanel overlay direito.

"use client";

import { useState } from "react";
import Link from "next/link";
import { Play } from "lucide-react";
import { PlayPanel } from "./play-panel";

type PlayState =
  | "modes"
  | "salas-menu"
  | "lobbies-list"
  | "criar-sala"
  | { type: "lobby-room"; lobbyId: string };

interface Props {
  persona: string;
  avatar: string | null;
  subActive: boolean;
  isAdmin: boolean;
  /** Estado inicial do PlayPanel (deep-link via query string). */
  initialPlayState?: PlayState;
}

export function DashboardBottomBar({ subActive, isAdmin, initialPlayState }: Props) {
  const [panelOpen, setPanelOpen] = useState(initialPlayState !== undefined);

  // Se sub inativa e não-admin, redireciona pra assinatura em vez de abrir painel
  const blocked = !subActive && !isAdmin;

  return (
    <>
      <div className="relative z-20 flex h-20 shrink-0 items-center justify-end px-4 xl:h-24 xl:px-6 2xl:h-28 2xl:px-8 pointer-events-none">
        {blocked ? (
          <Link
            href="/assinatura"
            className="pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 border-[var(--color-warning)] bg-gradient-to-b from-[var(--color-warning)]/30 to-[var(--color-warning)]/10 px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-white shadow-lg transition-all hover:scale-[1.02] xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em]"
          >
            <Play size={22} fill="currentColor" aria-hidden="true" />
            <span>Ativar mensalidade</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            aria-expanded={panelOpen}
            aria-label="Abrir painel de jogo"
            className="pointer-events-auto group relative flex h-14 items-center gap-3 overflow-hidden rounded-md border-2 border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-8 font-display text-lg font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[var(--color-play-green)]/40 transition-all hover:scale-[1.02] hover:shadow-[var(--color-play-green)]/60 xl:h-16 xl:px-12 xl:text-xl 2xl:h-20 2xl:px-16 2xl:text-2xl 2xl:tracking-[0.3em]"
          >
            <Play size={22} fill="currentColor" aria-hidden="true" />
            <span>Jogar Dota</span>
            <span
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <PlayPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        initialState={initialPlayState}
      />
    </>
  );
}
