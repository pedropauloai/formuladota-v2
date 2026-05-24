"use client";

// Form pra PRO submeter o ID da partida Dota 2 (match_id da Steam) depois
// que a PT terminou. Dispara enrichMatchFromOpenDota que busca os 10
// jogadores via API OpenDota e popula match_players.

import { useState, useTransition } from "react";
import { Database } from "lucide-react";
import { enrichMatchFromOpenDota } from "./actions";
import { Button } from "@/components/ui/button";

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
      <p className="rounded-md border border-dashed border-border-subtle bg-bg-elevated/30 p-6 text-center font-mono-ui text-sm text-text-muted">
        Nenhuma PT pendente de submissão. Inicie uma PT primeiro.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="match-select"
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-text-muted"
        >
          PT pendente
        </label>
        <select
          id="match-select"
          value={selected ?? ""}
          onChange={(e) => setSelected(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono-ui text-sm text-text-body"
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
          className="mb-2 block font-sans text-xs font-semibold uppercase tracking-widest text-text-muted"
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
          className="w-full rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 font-mono-ui text-sm text-text-body placeholder:text-text-faded"
        />
        <p className="mt-2 font-mono-ui text-xs text-text-muted">
          Encontre o match ID no histórico do Dota 2 ou em https://dotabuff.com/
        </p>
      </div>

      <Button
        type="submit"
        variant="primary"
        size="md"
        loading={pending}
        disabled={pending}
        className="w-full"
      >
        <Database size={16} />
        Buscar dados na OpenDota
      </Button>

      {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
      {success && <p className="font-mono-ui text-sm text-success">{success}</p>}
    </form>
  );
}
