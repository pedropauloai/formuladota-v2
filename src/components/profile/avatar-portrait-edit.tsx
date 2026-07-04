"use client";
// Edição da imagem de perfil NO PRÓPRIO avatar (Pedro 2026-06-30): em modo edição,
// o avatar ganha um botão de câmera que abre um MODAL (overlay central) com as
// opções de avatar (upload) + retrato do herói. Modal porque um popover ancorado
// era recortado pelo overflow-hidden dos cards/header.

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Camera, X } from "lucide-react";
import { XpAvatarRing } from "@/components/ui/xp-avatar-ring";
import { AvatarUpload } from "./avatar-upload";
import { PortraitEditor } from "./inline-edit-controls";

interface Props {
  editing: boolean;
  avatarSrc?: string;
  avatarAlt: string;
  fallback: string;
  /** Nível da conta (badge no anel) + progresso de XP no nível (0-1, preenche o anel). */
  level: number;
  xpPct: number;
  userId: string;
  initialAvatar: string | null;
  initialPortrait: string | null;
}

export function AvatarPortraitEdit({
  editing,
  avatarSrc,
  avatarAlt,
  fallback,
  level,
  xpPct,
  userId,
  initialAvatar,
  initialPortrait,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative shrink-0">
      {/* Identidade canônica: anel de XP + nível (não mais avatar solto). */}
      <XpAvatarRing
        src={avatarSrc ?? null}
        alt={avatarAlt}
        fallback={fallback}
        level={level}
        pct={xpPct}
        size={72}
      />

      {editing && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Editar imagem de perfil"
          className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-sm border border-border-strong bg-bg-deep text-text-muted shadow-md transition-colors hover:text-text-display"
        >
          <Camera className="size-4" />
        </button>
      )}

      {/* MODAL central — fora de qualquer overflow-hidden, sempre visível. */}
      {open && editing && (
        <div
          className="fixed inset-0 z-[var(--z-system)] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-[var(--radius-lg)] border border-border-strong bg-bg-base p-5 shadow-[var(--shadow-cinematic)]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-base font-bold uppercase tracking-wide text-text-display">
                Imagem de perfil
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="text-text-muted transition-colors hover:text-text-display"
              >
                <X className="size-4" />
              </button>
            </header>

            <AvatarUpload
              userId={userId}
              currentAvatarUrl={initialAvatar}
              onSaved={() => router.refresh()}
            />

            <div className="mt-4 border-t border-border-subtle pt-4">
              <PortraitEditor initialPortrait={initialPortrait} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
