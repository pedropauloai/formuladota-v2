"use client";

// AdminHistoryList — últimas PTs realizadas do coach selecionado: data,
// match ID dota, placar (radiant:dire), duração e estado do enrich OpenDota.
// PTs sem dados ganham input inline pra enriquecer (enrichMatchFromOpenDota,
// já admin-gated — importa KDA/GPM/rank_tier e popula match_players).

import { useState, useTransition } from "react";
import { Database, Loader2 } from "lucide-react";
import { enrichMatchFromOpenDota } from "./actions";
import type { AdminHistoryMatch } from "./admin-pros-types";
import { formatDateShort } from "./format";

interface Props {
  history: AdminHistoryMatch[];
  onChanged: () => void;
}

export function AdminHistoryList({ history, onChanged }: Props) {
  if (history.length === 0) {
    return (
      <p className="rounded-sm border border-dashed border-border-subtle bg-bg-elevated/30 p-4 text-center font-display text-sm font-semibold text-text-muted">
        Nenhuma PT realizada ainda. O histórico nasce quando esse PRO entrar em
        campo.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-border-subtle/60 rounded-sm border border-border-subtle bg-bg-base/40">
      {history.map((m) => (
        <HistoryRow key={m.matchId} match={m} onChanged={onChanged} />
      ))}
    </ul>
  );
}

// ─── Linha do histórico ──────────────────────────────────────────────────────

function HistoryRow({
  match,
  onChanged,
}: {
  match: AdminHistoryMatch;
  onChanged: () => void;
}) {
  // Prefill com o match ID já registrado (fluxo bot grava dota_match_id sem enrich)
  const [dotaId, setDotaId] = useState(match.dotaMatchId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasScore = match.radiantScore !== null && match.direScore !== null;
  // opendota = dados importados | manual = confirmada sem dados (guard do
  // enrich bloqueia re-enrich) | pendente = realizada sem enrich (enriquecível)
  const enrichState: "opendota" | "manual" | "pendente" =
    match.enrichedAt === null
      ? "pendente"
      : match.dotaMatchId
        ? "opendota"
        : "manual";

  function handleEnrich() {
    const id = dotaId.trim();
    if (!/^\d{8,12}$/.test(id)) {
      setError("Match ID Dota deve ter entre 8 e 12 dígitos numéricos.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await enrichMatchFromOpenDota(match.matchId, id);
      if (!res.success) setError(res.error);
      else onChanged();
    });
  }

  return (
    <li className="space-y-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="font-mono text-sm tabular-nums text-text-muted">
          {formatDateShort(match.createdAt)}
        </span>
        <span className="font-mono text-sm text-text-body">
          {match.dotaMatchId ? `dota #${match.dotaMatchId}` : "sem match ID"}
        </span>
        {hasScore && (
          <span
            className="font-display text-sm font-bold tabular-nums text-gold"
            title="Placar Radiant : Dire"
          >
            {match.radiantScore} : {match.direScore}
          </span>
        )}
        {match.duracaoMin !== null && (
          <span className="font-mono text-sm tabular-nums text-text-muted">
            {match.duracaoMin}min
          </span>
        )}
        <span className="font-mono text-sm text-text-muted">
          {match.alunoCount} aluno{match.alunoCount === 1 ? "" : "s"}
        </span>
        <span
          className={`ml-auto inline-flex items-center gap-1 font-display-condensed text-base uppercase leading-none tracking-wider ${
            enrichState === "opendota"
              ? "text-success"
              : enrichState === "manual"
                ? "text-text-faded"
                : "text-warning"
          }`}
        >
          <Database size={12} aria-hidden="true" />
          {enrichState === "opendota"
            ? "OpenDota"
            : enrichState === "manual"
              ? "manual"
              : "sem dados"}
        </span>
      </div>

      {/* Enriquecer pós-fato — só quando o enrich ainda é possível */}
      {enrichState === "pendente" && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={dotaId}
            onChange={(e) => setDotaId(e.target.value)}
            placeholder="match ID dota — ex: 7891234567"
            className="w-56 rounded-sm border border-border-subtle bg-bg-elevated px-2 py-1.5 font-mono text-sm text-text-body placeholder:text-text-faded"
            aria-label={`Match ID Dota pra enriquecer PT de ${formatDateShort(match.createdAt)}`}
          />
          <button
            type="button"
            onClick={handleEnrich}
            disabled={pending || dotaId.trim().length === 0}
            className="inline-flex items-center gap-1.5 rounded-sm border border-brand-primary/50 bg-brand-primary/10 px-2.5 py-1.5 font-display text-sm font-semibold uppercase tracking-wide text-brand-primary transition-colors hover:bg-brand-primary/20 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 size={12} className="animate-spin" aria-hidden="true" />
            ) : (
              <Database size={12} aria-hidden="true" />
            )}
            Enriquecer
          </button>
          {error && <p className="font-mono-ui text-sm text-error">{error}</p>}
        </div>
      )}
    </li>
  );
}
