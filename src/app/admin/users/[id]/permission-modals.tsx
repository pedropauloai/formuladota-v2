"use client";

// Modal de ajuste de PERMISSÕES DE PARTIDA (/admin/users/[id]).
// Conceder = decrementa match_permissions_consumed (negativo = crédito bônus);
// Debitar = incrementa. Ver permission-actions.ts pro racional do modelo.

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ticket, ChevronUp, ChevronDown, Loader2, X, CheckCircle, AlertCircle } from "lucide-react";
import { adjustMatchPermissions } from "@/app/admin/users/permission-actions";

export function AdjustPermissionsModal({
  targetUserId,
  username,
  available,
}: {
  targetUserId: string;
  username: string;
  available: number;
}) {
  const t = useTranslations("misc2");
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"grant" | "debit">("grant");
  const [amount, setAmount] = useState("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
    setSuccess(null);
    setAmount("1");
    setReason("");
    setMode("grant");
  }

  function submit() {
    setError(null);
    setSuccess(null);
    const n = parseInt(amount, 10);
    if (!Number.isFinite(n) || n <= 0) {
      setError(t("amountMustBePositive"));
      return;
    }
    startTransition(async () => {
      const res = await adjustMatchPermissions({ targetUserId, amount: n, mode, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(t("permsAdjustedSuccess", { available: res.data?.available ?? "?" }));
        setAmount("1");
        setReason("");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-primary/40 bg-brand-primary/5 px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide text-brand-primary hover:bg-brand-primary/15 transition-colors"
      >
        <Ticket size={11} />
        {t("adjustPermissions")}
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
                <p className="font-display font-semibold text-sm uppercase tracking-wide text-brand-primary mb-1">
                  {t("matchPermissions")}
                </p>
                <h2 className="font-display text-xl uppercase text-text-display">{username}</h2>
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

            <p className="font-display text-sm font-semibold text-text-body mb-4">
              {t("availableBalance")} <span className="tabular-nums text-gold">{available}</span>
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {(["grant", "debit"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-sans text-sm font-semibold uppercase tracking-widest transition-colors ${
                    mode === m
                      ? m === "grant"
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                        : "border-amber-500/60 bg-amber-500/10 text-amber-300"
                      : "border-border-subtle text-text-faded hover:text-text-muted"
                  }`}
                >
                  {m === "grant" ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  {m === "grant" ? t("grant") : t("debit")}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="perm-amount"
                  className="block font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-2"
                >
                  {t("quantity")}
                </label>
                <input
                  id="perm-amount"
                  type="number"
                  min="1"
                  max="100"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-text-body"
                />
              </div>
              <div>
                <label
                  htmlFor="perm-reason"
                  className="block font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-2"
                >
                  {t("reasonRequired")}
                </label>
                <textarea
                  id="perm-reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={t("permsReasonPlaceholder")}
                  className="w-full resize-none rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/60"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 font-mono text-sm text-error">
                  <AlertCircle size={12} />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 font-mono text-sm text-emerald-400">
                  <CheckCircle size={12} />
                  {success}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-md px-4 py-2 font-sans text-sm uppercase tracking-widest text-text-faded hover:text-text-muted transition-colors"
              >
                {t("close")}
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !reason.trim() || !amount}
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${
                  mode === "grant"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {pending && <Loader2 size={12} className="animate-spin" />}
                {mode === "grant" ? t("grant") : t("debit")} {amount || "0"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
