"use client";
// AvatarUpload — Aba Avatar do modal Phase 9 (D-21).
// Pipeline: file select → valida → Canvas crop quadrado → upload Supabase → saveCustomAvatarUrl → toast.
// Plan de Supabase: Free (sem Image Transform) → Canvas crop nativo no browser (09-04-SUMMARY).

import { useState, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { saveCustomAvatarUrl, clearCustomAvatar } from "@/actions/avatar";

interface Props {
  userId: string;
  currentAvatarUrl: string | null;
  onSaved?: () => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const MIN_DIMENSION = 256;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function AvatarUpload({ userId, currentAvatarUrl, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const t = useTranslations("perfil");

  const handleFile = async (file: File) => {
    setErrorMsg(null);

    // Validação de tamanho (C3)
    if (file.size > MAX_BYTES) {
      setErrorMsg(t("avatarErrTooLarge"));
      return;
    }
    // Validação de formato MIME
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setErrorMsg(t("avatarErrBadFormat"));
      return;
    }

    // Lê dimensões via ImageBitmap — API nativa, sem dependências
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(file);
    } catch {
      setErrorMsg(t("avatarErrUnreadable"));
      return;
    }
    if (bitmap.width < MIN_DIMENSION || bitmap.height < MIN_DIMENSION) {
      setErrorMsg(t("avatarErrTooSmall"));
      return;
    }

    // Canvas crop quadrado (centro) — Free plan fallback (09-04-SUMMARY)
    const size = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - size) / 2;
    const sy = (bitmap.height - size) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = MIN_DIMENSION;
    canvas.height = MIN_DIMENSION;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setErrorMsg(t("avatarErrProcessing"));
      return;
    }
    ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, MIN_DIMENSION, MIN_DIMENSION);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.92)
    );
    if (!blob) {
      setErrorMsg(t("avatarErrGenerating"));
      return;
    }

    // Upload direto ao bucket profile-avatars (D-21)
    const supabase = createClient();
    const filePath = `${userId}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("profile-avatars")
      .upload(filePath, blob, { contentType: "image/png", upsert: true });

    if (uploadError) {
      setErrorMsg(t("avatarErrUploading"));
      toast({ type: "error", title: t("avatarToastSaveFailed"), description: uploadError.message });
      return;
    }

    const publicUrl = supabase.storage
      .from("profile-avatars")
      .getPublicUrl(filePath).data.publicUrl;

    // Persiste URL via Server Action + toast (BLOCKER #4 fix)
    startTransition(async () => {
      try {
        await saveCustomAvatarUrl(publicUrl);
        setPreview(publicUrl);
        toast({ type: "success", title: t("avatarToastUpdated") });
        onSaved?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("avatarErrSaving");
        setErrorMsg(msg);
        toast({ type: "error", title: t("avatarToastSaveFailed"), description: msg });
      }
    });
  };

  // Limpa avatar customizado e restaura Discord/Steam
  const handleClear = () => {
    startTransition(async () => {
      try {
        await clearCustomAvatar();
        setPreview(null);
        toast({ type: "success", title: t("avatarToastReset") });
        onSaved?.();
      } catch (e) {
        const msg = e instanceof Error ? e.message : t("avatarErrClearing");
        setErrorMsg(msg);
        toast({ type: "error", title: t("avatarToastResetFailed"), description: msg });
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-[13px] font-semibold text-text-muted">
        {t("avatarUploadIntro")}
      </p>

      {/* Preview circular do avatar atual */}
      {preview && (
        <div className="flex justify-center">
          <div className="relative size-24 rounded-full overflow-hidden border-2 border-brand-primary/60">
            <Image
              src={preview}
              alt={t("avatarCurrentAlt")}
              fill
              sizes="96px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      )}

      {/* Área de drop / clique para upload */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={t("avatarUploadAria")}
        className="border-2 border-dashed border-border-strong rounded-lg bg-bg-elevated/40 hover:bg-bg-elevated/60 py-6 px-4 text-center transition-colors"
      >
        <p className="font-display text-[13px] font-semibold text-text-body">
          {t("avatarDropPrompt")}
        </p>
        <p className="font-display text-[13px] font-semibold text-text-faded mt-1">
          {t("avatarUploadConstraints")}
        </p>
      </button>

      {/* Input file oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = ""; // reset para permitir re-upload do mesmo arquivo
        }}
        className="hidden"
        aria-hidden="true"
      />

      {/* Mensagem de erro inline */}
      {errorMsg && (
        <p role="alert" className="font-display text-[13px] font-semibold text-error">
          {errorMsg}
        </p>
      )}

      {/* Botão para restaurar avatar padrão (Discord/Steam) */}
      {currentAvatarUrl && (
        <Button variant="ghost" size="sm" onClick={handleClear} disabled={isPending}>
          {t("useDiscordAvatar")}
        </Button>
      )}
    </div>
  );
}
