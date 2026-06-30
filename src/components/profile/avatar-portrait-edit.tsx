"use client";
// Edição da imagem de perfil NO PRÓPRIO avatar (Pedro 2026-06-30): em modo edição,
// o avatar ganha um botão de câmera que abre um popover com as opções de avatar
// (upload) + retrato do herói. Sem card/componente separado.

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Camera } from "lucide-react";
import { UserAvatar } from "@/components/ui/avatar";
import { AvatarUpload } from "./avatar-upload";
import { PortraitEditor } from "./inline-edit-controls";

interface Props {
  editing: boolean;
  avatarSrc?: string;
  avatarAlt: string;
  fallback: string;
  ringColor: "brand" | null;
  userId: string;
  initialAvatar: string | null;
  initialPortrait: string | null;
}

export function AvatarPortraitEdit({
  editing,
  avatarSrc,
  avatarAlt,
  fallback,
  ringColor,
  userId,
  initialAvatar,
  initialPortrait,
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  return (
    <div className="relative shrink-0">
      <UserAvatar
        src={avatarSrc}
        alt={avatarAlt}
        fallback={fallback}
        size="xl"
        ringColor={ringColor}
      />

      {editing && (
        <>
          {/* Gatilho: câmera no canto do avatar. */}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Editar imagem de perfil"
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-sm border border-border-strong bg-bg-deep text-text-muted shadow-md transition-colors hover:text-text-display"
          >
            <Camera className="size-3.5" />
          </button>

          {open && (
            <div className="absolute left-0 top-full z-[var(--z-system)] mt-2 w-72 rounded-[var(--radius-md)] border border-border-strong bg-bg-base p-3 shadow-[var(--shadow-cinematic)]">
              <AvatarUpload
                userId={userId}
                currentAvatarUrl={initialAvatar}
                onSaved={() => router.refresh()}
              />
              <div className="mt-3 border-t border-border-subtle pt-3">
                <PortraitEditor initialPortrait={initialPortrait} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
