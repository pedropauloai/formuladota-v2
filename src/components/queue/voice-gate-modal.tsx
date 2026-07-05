"use client";

// Modal CENTRAL do gate de voz — aparece quando o jogador (ou alguém do grupo)
// tenta buscar partida sem estar no canal de voz 🎧 Buscando Partida do Discord.
// Estilo espelha o popup de "configurações da sala" / partida encontrada:
// takeover central, dimmer com blur, card cinematic. Link do Discord clicável.

import { Headphones, ExternalLink, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

// Convite oficial (mesmo hardcode do resto do app).
const DISCORD_INVITE_URL = "https://discord.com/invite/USntaFRS6x";

interface Props {
  open: boolean;
  /** Mensagem vinda do servidor (solo ou nomeando quem falta no grupo). */
  message: string;
  onClose: () => void;
  /** "Já entrei — buscar de novo": fecha e re-dispara a busca. */
  onRetry: () => void;
}

export function VoiceGateModal({ open, message, onClose, onRetry }: Props) {
  if (!open) return null;
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[var(--z-takeover)] flex items-center justify-center bg-bg-deep/80 p-4 backdrop-blur-sm animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-md rounded-sm border border-border-strong bg-bg-base p-6 text-center shadow-[var(--shadow-cinematic)] animate-in zoom-in-95 duration-150">
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-sm p-1 text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Ícone brand */}
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-sm border-2 border-brand-primary bg-brand-primary/10 shadow-[0_0_16px_var(--color-brand-primary-glow)]">
          <Headphones size={26} className="text-brand-primary" aria-hidden="true" />
        </div>

        <h2 className="mb-2 font-display-condensed text-2xl uppercase leading-none text-text-display">
          Captains Mode exige voz
        </h2>
        <p className="mb-4 font-body text-sm leading-relaxed text-text-muted">{message}</p>

        {/* Destaque do canal */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-sm border border-border-subtle bg-bg-elevated/50 px-3 py-1.5">
          <Headphones size={14} className="text-text-faded" aria-hidden="true" />
          <span className="font-display text-sm font-semibold text-text-body">Buscando (CM)</span>
        </div>

        <div className="flex flex-col gap-2">
          <a href={DISCORD_INVITE_URL} target="_blank" rel="noopener noreferrer" className="w-full">
            <Button variant="cinematic" size="md" className="w-full">
              <ExternalLink size={16} aria-hidden="true" />
              Abrir o Discord
            </Button>
          </a>
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onRetry}
            className="w-full"
          >
            <Search size={14} aria-hidden="true" />
            Já entrei — buscar de novo
          </Button>
        </div>
      </div>
    </div>
  );
}
