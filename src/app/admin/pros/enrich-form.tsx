"use client";

// Form pra PRO submeter o ID da partida Dota 2 (match_id da Steam) depois
// que a PT terminou. Dispara enrichMatchFromOpenDota que busca os 10
// jogadores via API OpenDota e popula match_players.

import { useState, useTransition } from "react";
import { Database, Loader2 } from "lucide-react";
import { enrichMatchFromOpenDota } from "./actions";

interface Match {
  id: string;
  createdAt: string;
  alunoCount: number;
  enrichedAt: string | null;
  dotaMatchId: string | null;
}

interface Props {
  matches: Match[];
}

export function EnrichForm({ matches }: Props) {
  const [selected, setSelected] = useState<string | null>(matches[0]?.id ?? null);
  const [dotaMatchId, setDotaMatchId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!selected) {
      setError("Selecione uma PT.");
      return;
    }
    const trimmed = dotaMatchId.trim();
    if (!/^\d+$/.test(trimmed)) {
      setError("Match ID precisa ser numérico (ex: 7891234567).");
      return;
    }
    startTransition(async () => {
      const res = await enrichMatchFromOpenDota(selected, trimmed);
      if (!res.success) {
        setError(res.error);
      } else {
        setSuccess(`Match enriquecido: ${res.data?.playersInserted} jogadores salvos.`);
        setDotaMatchId("");
      }
    });
  }

  const pendingMatches = matches.filter((m) => !m.enrichedAt);

  if (pendingMatches.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-card)]/30 p-6 text-center font-mono-ui text-sm text-[var(--color-muted-foreground)]">
        Nenhuma PT pendente de submissão. Inicie uma PT primeiro.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="match-select"
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
        >
          PT pendente
        </label>
        <select
          id="match-select"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono-ui text-sm text-white"
        >
          {pendingMatches.map((m) => (
            <option key={m.id} value={m.id}>
              {new Date(m.createdAt).toLocaleString("pt-BR")} · {m.alunoCount} aluno
              {m.alunoCount === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="dota-match-id"
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-[var(--color-muted-foreground)]"
        >
          Dota Match ID
        </label>
        <input
          id="dota-match-id"
          type="text"
          inputMode="numeric"
          pattern="\d+"
          value={dotaMatchId}
          onChange={(e) => setDotaMatchId(e.target.value)}
          placeholder="ex: 7891234567"
          className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 font-mono-ui text-sm text-white placeholder:text-[var(--color-muted-foreground)]/50"
        />
        <p className="mt-2 font-mono-ui text-xs text-[var(--color-muted-foreground)]">
          Encontre o match ID no histórico do Dota 2 ou em https://dotabuff.com/
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--color-brand-red)] px-6 py-3 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)]/80 disabled:opacity-50"
      >
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
        Buscar dados na OpenDota
      </button>

      {error && <p className="font-mono-ui text-sm text-red-400">{error}</p>}
      {success && <p className="font-mono-ui text-sm text-emerald-400">{success}</p>}
    </form>
  );
}
