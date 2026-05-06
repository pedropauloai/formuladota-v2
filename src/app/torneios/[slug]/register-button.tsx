"use client";

// Botão "Inscrever time" — Client Component que abre dropdown se user é captain
// de mais de 1 time, ou inscreve direto se é só de 1.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { registerTeamForTournament } from "@/app/times/actions";

interface AvailableTeam {
  id: string;
  name: string;
  tag: string;
}

export function TournamentRegisterButton({
  tournamentId,
  availableTeams,
}: {
  tournamentId: string;
  availableTeams: AvailableTeam[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleRegister = (teamId: string) => {
    startTransition(async () => {
      const r = await registerTeamForTournament({ tournamentId, teamId });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Time inscrito no torneio!");
      setShowDropdown(false);
      router.refresh();
    });
  };

  if (availableTeams.length === 0) return null;

  // 1 time só → botão direto
  const singleTeam = availableTeams.length === 1 ? availableTeams[0] : null;
  if (singleTeam) {
    return (
      <button
        type="button"
        onClick={() => handleRegister(singleTeam.id)}
        disabled={isPending}
        className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-6 font-display text-sm 2xl:text-base font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[var(--color-play-green)]/30 hover:brightness-110 hover:shadow-[var(--color-play-green)]/50 transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
        Inscrever {singleTeam.name}
      </button>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isPending}
        className="inline-flex h-12 items-center gap-2 rounded-md border border-[var(--color-play-green)] bg-gradient-to-b from-[var(--color-play-green)] to-[var(--color-play-green-dark)] px-6 font-display text-sm 2xl:text-base font-bold uppercase tracking-[0.25em] text-white shadow-lg shadow-[var(--color-play-green)]/30 hover:brightness-110 hover:shadow-[var(--color-play-green)]/50 transition-all disabled:opacity-50"
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
        Inscrever time
        <ChevronDown size={14} />
      </button>
      {showDropdown && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-md border border-[var(--color-border)] bg-black/95 backdrop-blur-md shadow-2xl z-30">
          {availableTeams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleRegister(t.id)}
              disabled={isPending}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-white/5 transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <span className="font-sans text-sm text-white">{t.name}</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">
                [{t.tag}]
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
