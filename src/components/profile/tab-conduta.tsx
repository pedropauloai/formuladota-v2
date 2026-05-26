// Tab Conduta — HonorRankMedal xl (elemento dominante) + breakdown + link releia.
// FUNCIONAL: behaviorStatus e doctrineAcceptedAt vêm do profile real (getProfileForMe).
// commends/strikes V2 (sem RPC ainda) — exibe "—" como placeholder honesto.
// Server Component — sem interatividade, sem "use client".

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { HonorRankMedal, type HonorRank } from "@/components/ui/honor-rank-medal";
import { Button } from "@/components/ui/button";

interface Props {
  honorRank: HonorRank;
  behaviorStatus: string | null;
  doctrineAcceptedAt: string | null;
  commends: number | null;
  strikes: number | null;
}

// Mapeia behavior_status do DB para label + tom visual (UI-SPEC Copywriting Contract)
function behaviorStatusLabel(
  status: string | null
): { label: string; tone: "success" | "warning" | "error" } {
  switch (status) {
    case "suspended":
      return { label: "CONDUTA: SUSPENSA", tone: "warning" };
    case "banned":
      return { label: "CONDUTA: BANIDA", tone: "error" };
    default:
      // null / "active" / qualquer outro string = aprovada
      return { label: "CONDUTA: APROVADA", tone: "success" };
  }
}

export function TabConduta({
  honorRank,
  behaviorStatus,
  doctrineAcceptedAt,
  commends,
  strikes,
}: Props) {
  const { label, tone } = behaviorStatusLabel(behaviorStatus);

  // Cores semânticas do badge de status — zero hex hardcoded (C14)
  const toneCls =
    tone === "success"
      ? "border-success/40 text-success"
      : tone === "warning"
        ? "border-warning/40 text-warning"
        : "border-error/40 text-error";

  return (
    <div className="pt-6 space-y-6">
      {/* HonorRankMedal xl — elemento dominante desta tab (UI-SPEC) */}
      <div className="flex flex-col items-center gap-3">
        <HonorRankMedal
          rank={honorRank}
          size="xl"
          showLabel
          calibrationStatus="ranqueado"
        />
      </div>

      {/* Breakdown: commends + strikes + doutrina aceita em (grid 3 colunas) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <BreakdownCard label="Commends" value={commends ?? "—"} />
        <BreakdownCard label="Avisos" value={strikes ?? "—"} />
        <BreakdownCard
          label="Doutrina aceita em"
          value={
            doctrineAcceptedAt
              ? new Date(doctrineAcceptedAt).toLocaleDateString("pt-BR")
              : "—"
          }
        />
      </div>

      {/* Badge de status de conduta (role="status" — C5 acessibilidade) */}
      <div
        role="status"
        className={`inline-flex items-center px-3 py-1.5 rounded-md border ${toneCls} font-display text-[13px] font-bold uppercase tracking-[0.08em]`}
      >
        {label}
      </div>

      {/* Link "Releia o Código de Conduta" — Button ghost com ExternalLink (UI-SPEC) */}
      <div>
        <Link href="/codigo-de-conduta">
          <Button variant="ghost" size="sm">
            Releia o Código de Conduta
            <ExternalLink size={12} aria-hidden="true" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

// Subcomponente local — card de breakdown com label + valor
function BreakdownCard({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-elevated/40 p-4">
      <p className="font-display text-[13px] font-semibold uppercase tracking-wide text-text-faded">
        {label}
      </p>
      <p className="font-display text-2xl font-bold text-text-display mt-1">
        {value}
      </p>
    </div>
  );
}
