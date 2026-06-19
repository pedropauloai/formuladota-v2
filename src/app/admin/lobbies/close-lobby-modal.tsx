"use client";

// Botão + modal "Encerrar sala" (/admin/lobbies). Motivo obrigatório —
// vira audit log via adminCloseLobby.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, X, AlertCircle, Ban } from "lucide-react";
import { adminCloseLobby } from "./actions";

export function CloseLobbyModal({
  lobbyId,
  lobbyName,
}: {
  lobbyId: string;
  lobbyName: string;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setReason("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await adminCloseLobby({ lobbyId, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        close();
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-500/40 bg-red-500/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-red-400 hover:bg-red-500/15 transition-colors"
      >
        <Ban size={11} />
        {t("lobbyClose")}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            className="w-full max-w-md rounded-md border border-border-subtle bg-bg-elevated p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="font-display font-semibold text-sm uppercase tracking-wide text-red-400 mb-1">
                  {t("lobbyCloseTitle")}
                </p>
                <h2 className="font-display text-xl uppercase text-text-display">{lobbyName}</h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="text-text-faded hover:text-text-muted transition-colors ml-4 mt-0.5"
                aria-label={t("closeModal")}
              >
                <X size={16} />
              </button>
            </div>

            <p className="mb-4 font-sans text-sm text-text-body">
              {t("lobbyCloseWarning")}
            </p>

            <label
              htmlFor="close-lobby-reason"
              className="block font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-2"
            >
              {t("reasonRequired")}
            </label>
            <textarea
              id="close-lobby-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("lobbyCloseReasonPlaceholder")}
              className="w-full resize-none rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/60"
            />

            {error && (
              <div className="mt-3 flex items-center gap-2 font-mono text-sm text-error">
                <AlertCircle size={12} />
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-md px-4 py-2 font-sans text-sm uppercase tracking-widest text-text-faded hover:text-text-muted transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || reason.trim().length < 3}
                className="inline-flex items-center gap-2 rounded-md bg-red-600 px-5 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {pending && <Loader2 size={12} className="animate-spin" />}
                {t("lobbyCloseTitle")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
