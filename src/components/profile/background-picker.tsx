"use client";

// BackgroundPicker — modal pra trocar o fundo do perfil (slot profile_theme) com
// PREVIEW EM TEMPO REAL (Pedro 2026-07-01): clicar num fundo aplica na tela cheia na
// hora (sem salvar); "Salvar" persiste (equipCosmetic), "Fechar" descarta.
//
// O preview vive num portal em document.body (fixed, escapa o stacking do ClientShell):
// camada de fundo cobrindo a tela + painel flutuante com as miniaturas. O overlay de
// leitura é o MESMO do shell, então o preview é fiel ao resultado final.

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ImageIcon, X, Check, Lock, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  getProfileThemeOptions,
  equipCosmetic,
  unequipSlot,
  type ProfileThemeOption,
} from "@/actions/cosmetics";

// Mesmo overlay de leitura do ClientShell immersive (topo/base escurecidos).
const OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 30%, rgba(0,0,0,0.4) 70%, rgba(0,0,0,0.85) 100%)";

export function BackgroundPicker() {
  const t = useTranslations("perfil");
  const router = useRouter();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ProfileThemeOption[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null); // null = fundo limpo
  const [initialId, setInitialId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setMounted(true), []);

  const load = useCallback(async () => {
    const opts = await getProfileThemeOptions();
    setOptions(opts);
    const eq = opts.find((o) => o.equipped)?.id ?? null;
    setSelectedId(eq);
    setInitialId(eq);
  }, []);

  function openPicker() {
    setOpen(true);
    if (!options) void load();
  }
  const close = useCallback(() => setOpen(false), []);

  // Esc fecha.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  const previewBg = selectedId
    ? options?.find((o) => o.id === selectedId)?.bg ?? null
    : null;

  async function handleSave() {
    if (selectedId === initialId) {
      close();
      return;
    }
    setSaving(true);
    const res = selectedId
      ? await equipCosmetic(selectedId)
      : await unequipSlot("profile_theme");
    setSaving(false);
    if (!res.success) {
      toast({ type: "error", title: res.error ?? t("bgEquipError") });
      return;
    }
    setInitialId(selectedId);
    close();
    router.refresh();
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={openPicker}>
        <ImageIcon size={14} aria-hidden="true" />
        {t("changeBackground")}
      </Button>

      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[var(--z-takeover)]">
            {/* Camada de PREVIEW fullscreen (fundo escolhido + overlay de leitura). */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: "#0a0a0b",
                backgroundImage: previewBg ? `${OVERLAY}, ${previewBg}` : OVERLAY,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
              onClick={close}
              aria-hidden="true"
            />

            {/* Painel flutuante com as miniaturas + ações. */}
            <div className="absolute inset-x-0 bottom-0 mx-auto max-h-[70vh] w-full max-w-4xl overflow-hidden rounded-t-[var(--radius-lg)] border-t border-x border-border-strong bg-bg-base/95 shadow-[var(--shadow-cinematic)] backdrop-blur-md animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
                <h2 className="font-display text-lg font-bold uppercase tracking-wide text-text-display">
                  {t("changeBackground")}
                </h2>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t("bgClose")}
                  className="rounded-sm p-1 text-text-faded transition-colors hover:bg-bg-elevated hover:text-text-body"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>

              <div className="max-h-[46vh] overflow-y-auto p-4">
                {!options ? (
                  <div className="flex items-center justify-center py-10 text-text-muted">
                    <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
                    {/* Opção "Limpo" (nenhum fundo). */}
                    <ThumbButton
                      label={t("backgroundNone")}
                      bg={null}
                      active={selectedId === null}
                      owned
                      onClick={() => setSelectedId(null)}
                    />
                    {options.map((o) => (
                      <ThumbButton
                        key={o.id}
                        label={o.name}
                        bg={o.bg}
                        active={selectedId === o.id}
                        owned={o.owned}
                        onClick={() => o.owned && setSelectedId(o.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-border-subtle px-4 py-3">
                <Button variant="ghost" size="sm" onClick={close}>
                  {t("bgCancel")}
                </Button>
                <Button
                  variant="cinematic"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || selectedId === initialId}
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Check size={14} aria-hidden="true" />
                  )}
                  {t("bgSave")}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function ThumbButton({
  label,
  bg,
  active,
  owned,
  onClick,
}: {
  label: string;
  bg: string | null;
  active: boolean;
  owned: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!owned}
      title={label}
      aria-pressed={active}
      className={`group relative aspect-video overflow-hidden rounded-sm border transition-all ${
        active
          ? "border-brand-primary ring-2 ring-brand-primary/40"
          : "border-border-subtle hover:border-brand-primary/60"
      } ${!owned ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <span
        className="absolute inset-0"
        style={
          bg
            ? { backgroundImage: bg, backgroundSize: "cover", backgroundPosition: "center" }
            : { backgroundColor: "#0a0a0b" }
        }
        aria-hidden="true"
      />
      {!owned && (
        <span className="absolute inset-0 flex items-center justify-center bg-bg-deep/50 text-text-faded">
          <Lock size={14} aria-hidden="true" />
        </span>
      )}
      {active && owned && (
        <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-brand-primary text-text-display">
          <Check size={10} aria-hidden="true" />
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 truncate bg-bg-deep/70 px-1 py-0.5 text-center font-display text-[0.6rem] uppercase tracking-wide text-text-muted">
        {label}
      </span>
    </button>
  );
}
