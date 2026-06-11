"use client";

// CreateLobbyModal — popup "CONFIGURAÇÕES DA SALA" (ref: configuração lobby.png):
// toma quase todo o viewport com dimmer (chrome visível atrás), título Teko,
// e delega os campos pro CriarLobbyForm (fonte única do form de criação).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { CriarLobbyForm } from "@/app/criar-lobby/criar-lobby-form";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateLobbyModal({ open, onClose }: Props) {
  const router = useRouter();

  // ESC fecha
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4 sm:p-8">
      <button
        type="button"
        aria-label="Fechar modal"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deep/80 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Configurações da sala"
        className="relative flex max-h-full w-full max-w-5xl flex-col rounded-sm border border-border-strong bg-bg-base shadow-[var(--shadow-cinematic)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-3">
          <h2 className="font-display-condensed text-2xl uppercase leading-none text-text-display">
            Configurações da sala
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-sm text-text-faded hover:bg-bg-elevated hover:text-text-body transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <CriarLobbyForm
            onClose={onClose}
            onCreated={(id) => {
              onClose();
              router.push(`/lobbies/${id}`);
            }}
          />
        </div>
      </div>
    </div>
  );
}
