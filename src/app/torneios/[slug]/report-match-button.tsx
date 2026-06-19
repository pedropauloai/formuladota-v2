"use client";

// Botão admin pra reportar o placar de um match do bracket (no detalhe público).
// Abre um mini-form inline: vencedor + placar → reportTournamentMatch (avança o
// vencedor pro próximo round; encerra o torneio se for a final).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Flag } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { reportTournamentMatch } from "@/app/admin/torneios/actions";

export function ReportMatchButton({
  matchId,
  teamAId,
  teamBId,
  teamAName,
  teamBName,
}: {
  matchId: string;
  teamAId: string;
  teamBId: string;
  teamAName: string;
  teamBName: string;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [winner, setWinner] = useState("");
  const [scoreA, setScoreA] = useState("1");
  const [scoreB, setScoreB] = useState("0");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full px-3 py-1.5 bg-bg-deep font-display font-semibold text-[11px] uppercase tracking-wide text-brand-primary hover:bg-brand-primary/10 transition-colors flex items-center justify-center gap-1.5"
      >
        <Flag size={11} aria-hidden="true" /> Reportar placar
      </button>
    );
  }

  const submit = () => {
    if (!winner) {
      toast({ type: "error", title: "Escolha o time vencedor." });
      return;
    }
    startTransition(async () => {
      const r = await reportTournamentMatch({
        matchId,
        winnerTeamId: winner,
        scoreA: Number(scoreA) || 0,
        scoreB: Number(scoreB) || 0,
      });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      toast({ type: "success", title: "Placar reportado." });
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <div className="bg-bg-deep p-3 space-y-2 border-t border-border-subtle">
      <select
        value={winner}
        onChange={(e) => setWinner(e.target.value)}
        aria-label="Time vencedor"
        className="w-full rounded-sm border border-border-subtle bg-black/40 px-2 py-1.5 font-sans text-sm 2xl:text-base text-white focus:border-brand-primary focus:outline-none"
      >
        <option value="">Vencedor…</option>
        <option value={teamAId}>{teamAName}</option>
        <option value={teamBId}>{teamBName}</option>
      </select>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={99}
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          aria-label={`Placar de ${teamAName}`}
          className="w-14 rounded-sm border border-border-subtle bg-black/40 px-2 py-1 font-mono text-sm 2xl:text-base text-white text-center focus:border-brand-primary focus:outline-none"
        />
        <span className="font-display text-text-faded">×</span>
        <input
          type="number"
          min={0}
          max={99}
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          aria-label={`Placar de ${teamBName}`}
          className="w-14 rounded-sm border border-border-subtle bg-black/40 px-2 py-1 font-mono text-sm 2xl:text-base text-white text-center focus:border-brand-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="ml-auto flex items-center gap-1 rounded-sm border border-brand-primary/50 bg-brand-primary/10 px-3 py-1 font-display text-[11px] font-semibold uppercase text-brand-primary hover:bg-brand-primary/20 transition-colors disabled:opacity-40"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : null}
          Salvar
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="font-display text-[11px] font-semibold uppercase text-text-faded hover:text-text-body"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
