"use client";

// Botão "Inscrever time" — Client Component que abre dropdown se user é captain
// de mais de 1 time, ou inscreve direto se é só de 1.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trophy, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { registerTeamForTournament } from "@/app/times/actions";
import { Button } from "@/components/ui/button";

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
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleRegister = (teamId: string) => {
    startTransition(async () => {
      const r = await registerTeamForTournament({ tournamentId, teamId });
      if (!r.success) {
        toast({ type: "error", title: r.error });
        return;
      }
      toast({ type: "success", title: "Time inscrito no torneio!" });
      setShowDropdown(false);
      router.refresh();
    });
  };

  if (availableTeams.length === 0) return null;

  // 1 time só → botão direto (cinematic — torneios são CTA de máximo impacto)
  const singleTeam = availableTeams.length === 1 ? availableTeams[0] : null;
  if (singleTeam) {
    return (
      <Button
        type="button"
        variant="cinematic"
        size="md"
        onClick={() => handleRegister(singleTeam.id)}
        disabled={isPending}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
        Inscrever {singleTeam.name}
      </Button>
    );
  }

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="cinematic"
        size="md"
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={isPending}
      >
        {isPending ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
        Inscrever time
        <ChevronDown size={14} />
      </Button>
      {showDropdown && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-md border border-border-subtle bg-bg-base/95 backdrop-blur-md shadow-2xl z-30">
          {availableTeams.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleRegister(t.id)}
              disabled={isPending}
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-bg-elevated transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <span className="font-sans text-sm 2xl:text-base text-text-display">{t.name}</span>
              <span className="font-display font-semibold text-sm uppercase tracking-wide text-text-faded">
                [{t.tag}]
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
