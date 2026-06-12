"use client";

// Controles client do CRUD de seasons (/admin/temporadas):
//   CreateSeasonForm — nome + início (opcional) + prize pool (opcional)
//   SeasonRowActions — Ativar / Desativar / Encerrar (confirmação destrutiva)

import { useState, useTransition } from "react";
import { Loader2, Plus, Power, Square, AlertCircle, CheckCircle } from "lucide-react";
import {
  createSeason,
  activateSeason,
  deactivateSeason,
  endSeason,
} from "./actions";

function Msg({ type, msg }: { type: "error" | "success"; msg: string }) {
  return (
    <div className={`flex items-center gap-2 font-mono text-sm ${type === "error" ? "text-error" : "text-emerald-400"}`}>
      {type === "error" ? <AlertCircle size={12} /> : <CheckCircle size={12} />}
      {msg}
    </div>
  );
}

// ─── Form de criação ─────────────────────────────────────────────────────────

export function CreateSeasonForm() {
  const [name, setName] = useState("");
  const [startedAt, setStartedAt] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSuccess(null);
    const pool = prizePool.trim() === "" ? undefined : Number(prizePool);
    if (pool !== undefined && (!Number.isFinite(pool) || pool < 0)) {
      setError("Prize pool precisa ser número >= 0.");
      return;
    }
    startTransition(async () => {
      const res = await createSeason({
        name,
        startedAt: startedAt || undefined,
        prizePool: pool,
      });
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess("Season criada (inativa — ative quando quiser).");
        setName("");
        setStartedAt("");
        setPrizePool("");
      }
    });
  }

  const inputCls =
    "w-full rounded-md border border-border-subtle bg-black/40 px-3 py-2 font-sans text-sm text-text-body placeholder:text-text-faded focus:outline-none focus:border-brand-primary/60";
  const labelCls =
    "block font-display font-semibold text-sm uppercase tracking-wide text-text-faded mb-1.5";

  return (
    <div className="rounded-md border border-border-subtle bg-bg-elevated p-5 space-y-4">
      <h2 className="font-display text-sm uppercase tracking-widest text-text-display">
        Criar season
      </h2>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="season-name" className={labelCls}>Nome</label>
          <input
            id="season-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Temporada 2 — Ascensão"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="season-start" className={labelCls}>Início (opcional)</label>
          <input
            id="season-start"
            type="date"
            value={startedAt}
            onChange={(e) => setStartedAt(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="season-pool" className={labelCls}>Prize pool R$ (opcional)</label>
          <input
            id="season-pool"
            type="number"
            min="0"
            step="0.01"
            value={prizePool}
            onChange={(e) => setPrizePool(e.target.value)}
            placeholder="0"
            className={inputCls}
          />
        </div>
      </div>

      {error && <Msg type="error" msg={error} />}
      {success && <Msg type="success" msg={success} />}

      <button
        type="button"
        onClick={submit}
        disabled={pending || name.trim().length < 3}
        className="inline-flex items-center gap-2 rounded-md bg-brand-primary px-5 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors hover:bg-brand-primary/80 disabled:opacity-50"
      >
        {pending ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
        Criar season
      </button>
    </div>
  );
}

// ─── Ações por linha ─────────────────────────────────────────────────────────

type RowActionKind = "activate" | "deactivate" | "end";

const ROW_ACTION_COPY: Record<
  RowActionKind,
  { label: string; confirm: string; cls: string; confirmCls: string }
> = {
  activate: {
    label: "Ativar",
    confirm: "Ativar esta season? A season ativa atual será desativada.",
    cls: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10",
    confirmCls: "bg-emerald-600 hover:bg-emerald-500",
  },
  deactivate: {
    label: "Desativar",
    confirm: "Desativar esta season? O sistema fica sem season ativa.",
    cls: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",
    confirmCls: "bg-amber-600 hover:bg-amber-500",
  },
  end: {
    label: "Encerrar",
    confirm: "ENCERRAR esta season? Ação irreversível — ela não poderá ser reativada.",
    cls: "border-red-500/40 text-red-400 hover:bg-red-500/10",
    confirmCls: "bg-red-600 hover:bg-red-500",
  },
};

export function SeasonRowActions({
  seasonId,
  seasonName,
  active,
  ended,
}: {
  seasonId: number;
  seasonName: string;
  active: boolean;
  ended: boolean;
}) {
  const [confirming, setConfirming] = useState<RowActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(kind: RowActionKind) {
    setError(null);
    startTransition(async () => {
      const fn =
        kind === "activate" ? activateSeason : kind === "deactivate" ? deactivateSeason : endSeason;
      const res = await fn({ seasonId });
      if (!res.success) setError(res.error);
      setConfirming(null);
    });
  }

  const available: RowActionKind[] = ended
    ? []
    : active
      ? ["deactivate", "end"]
      : ["activate", "end"];

  if (available.length === 0) {
    return <span className="font-mono text-sm text-text-faded">encerrada</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {available.map((kind) => {
          const copy = ROW_ACTION_COPY[kind];
          return (
            <button
              key={kind}
              type="button"
              disabled={pending}
              onClick={() => setConfirming(kind)}
              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-display font-semibold text-sm uppercase tracking-wide transition-colors disabled:opacity-50 ${copy.cls}`}
            >
              {kind === "end" ? <Square size={11} /> : <Power size={11} />}
              {copy.label}
            </button>
          );
        })}
      </div>
      {error && <Msg type="error" msg={error} />}

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirming(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-md border border-border-subtle bg-bg-elevated p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="font-display text-xl uppercase text-text-display mb-2">
              {ROW_ACTION_COPY[confirming].label} — {seasonName}
            </h2>
            <p className="font-sans text-sm text-text-body mb-6">
              {ROW_ACTION_COPY[confirming].confirm}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                disabled={pending}
                className="rounded-md px-4 py-2 font-sans text-sm uppercase tracking-widest text-text-faded hover:text-text-muted transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => run(confirming)}
                disabled={pending}
                className={`inline-flex items-center gap-2 rounded-md px-5 py-2 font-sans text-sm font-semibold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${ROW_ACTION_COPY[confirming].confirmCls}`}
              >
                {pending && <Loader2 size={12} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
