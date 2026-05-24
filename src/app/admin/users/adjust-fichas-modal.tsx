"use client";

// Modal client de ajuste de fichas — chamado de /admin/users por linha.
// Usa <dialog> nativo + server action adjustUserFichas.

import { useState, useTransition, useRef } from "react";
import { Coins, Plus, Minus, Loader2 } from "lucide-react";
import { adjustUserFichas } from "@/app/admin/fichas/actions";

interface Props {
  userId: string;
  username: string;
  currentBalance: number;
}

export function AdjustFichasModal({ userId, username, currentBalance }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"grant" | "debit">("grant");
  const [amount, setAmount] = useState<string>("1");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDivElement>(null);

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
      setError("Quantidade precisa ser número positivo.");
      return;
    }
    const delta = mode === "grant" ? n : -n;
    startTransition(async () => {
      const res = await adjustUserFichas({ userId, delta, reason });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(
          `Ajuste salvo. Novo saldo: ${res.newBalance} ${res.newBalance === 1 ? "ficha" : "fichas"}.`
        );
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
        className="inline-flex items-center gap-1.5 rounded-md border border-brand-primary/40 bg-brand-primary/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-brand-primary hover:bg-brand-primary/15 transition-colors"
      >
        <Coins size={11} />
        Ajustar
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            className="w-full max-w-md rounded-md border border-border-subtle bg-bg-elevated p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="adjust-fichas-title"
          >
            <header className="mb-5 space-y-1">
              <p className="font-mono text-[10px] uppercase tracking-widest text-brand-primary">
                Ajustar fichas
              </p>
              <h2
                id="adjust-fichas-title"
                className="font-display text-xl uppercase text-white"
              >
                {username}
              </h2>
              <p className="font-mono text-xs text-text-muted">
                Saldo atual:{" "}
                <span className="text-white">
                  {currentBalance} {currentBalance === 1 ? "ficha" : "fichas"}
                </span>
              </p>
            </header>

            {/* Mode toggle */}
            <div className="mb-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("grant")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-sans text-xs font-semibold uppercase tracking-widest transition-colors ${
                  mode === "grant"
                    ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                    : "border-border-subtle text-white/50 hover:text-white"
                }`}
              >
                <Plus size={12} />
                Adicionar
              </button>
              <button
                type="button"
                onClick={() => setMode("debit")}
                className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 font-sans text-xs font-semibold uppercase tracking-widest transition-colors ${
                  mode === "debit"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-300"
                    : "border-border-subtle text-white/50 hover:text-white"
                }`}
              >
                <Minus size={12} />
                Remover
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="amount"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/60"
                >
                  Quantidade
                </label>
                <input
                  id="amount"
                  type="number"
                  min="1"
                  max="1000"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-mono text-sm text-white"
                />
              </div>

              <div>
                <label
                  htmlFor="reason"
                  className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/60"
                >
                  Razão (obrigatória)
                </label>
                <textarea
                  id="reason"
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="ex: bonificação de boas-vindas, compensação por PT cancelada, estorno PIX"
                  className="w-full resize-none rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-xs text-white placeholder:text-white/30"
                />
                <p className="mt-1 font-mono text-[9px] text-white/30">
                  {reason.length}/500 — fica no log permanente da plataforma
                </p>
              </div>

              {error && (
                <p className="font-mono text-xs text-red-400">{error}</p>
              )}
              {success && (
                <p className="font-mono text-xs text-emerald-400">{success}</p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="rounded-md px-4 py-2 font-sans text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
              >
                Fechar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={pending || !reason.trim() || !amount}
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2 font-sans text-xs font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${
                  mode === "grant"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : "bg-amber-600 hover:bg-amber-500"
                }`}
              >
                {pending && <Loader2 size={12} className="animate-spin" />}
                {mode === "grant" ? "Adicionar" : "Remover"} {amount || "0"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
