"use client";

// Client Component pra ações no team detail: leave (member) / delete (captain) /
// kick member (captain). Invite por username search fica V2 — admin/captain
// pode usar SQL ou UI futura.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { leaveTeam, kickMember, deleteTeam } from "../actions";
import { Button } from "@/components/ui/button";

interface Member {
  user_id: string;
  role: string;
  profile: { id: string; username: string | null; avatar_url: string | null } | null;
}

export function TeamDetailActions({
  teamId,
  teamName,
  isCaptain,
  isMember,
  members,
  currentUserId,
}: {
  teamId: string;
  teamName: string;
  isCaptain: boolean;
  isMember: boolean;
  members: Member[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleLeave = () => {
    if (!confirm(`Sair do time ${teamName}?`)) return;
    startTransition(async () => {
      const r = await leaveTeam(teamId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Você saiu do time.");
      router.push("/times");
    });
  };

  const handleDelete = () => {
    if (!confirm(`DELETAR o time ${teamName}? Essa ação é irreversível.`)) return;
    startTransition(async () => {
      const r = await deleteTeam(teamId);
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Time deletado.");
      router.push("/times");
    });
  };

  const handleKick = (userId: string, username: string | null) => {
    if (!confirm(`Remover ${username ?? "este membro"} do time?`)) return;
    startTransition(async () => {
      const r = await kickMember({ teamId, userId });
      if (!r.success) {
        toast.error(r.error);
        return;
      }
      toast.success("Membro removido.");
      router.refresh();
    });
  };

  if (!isMember && !isCaptain) {
    return null;
  }

  return (
    <section className="mt-10 space-y-4">
      <h2 className="font-sans text-xs 2xl:text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
        Ações
      </h2>

      {/* Captain: gerenciar membros (kick) */}
      {isCaptain && members.length > 1 && (
        <div className="rounded-md border border-border-subtle bg-bg-base p-4 space-y-3">
          <p className="font-sans text-xs font-semibold uppercase tracking-wide text-text-body">
            Gerenciar roster
          </p>
          <div className="space-y-2">
            {members
              .filter((m) => m.user_id !== currentUserId)
              .map((m) => (
                <div
                  key={m.user_id}
                  className="flex items-center justify-between gap-3 rounded-sm bg-bg-elevated px-3 py-2"
                >
                  <span className="font-sans text-sm text-text-display">
                    {m.profile?.username ?? "Anônimo"}{" "}
                    <span className="font-mono text-[10px] uppercase tracking-widest text-text-faded">
                      · {m.role}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleKick(m.user_id, m.profile?.username ?? null)}
                    disabled={isPending}
                    className="text-text-muted hover:text-error transition-colors disabled:opacity-30"
                    aria-label="Remover membro"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {isMember && !isCaptain && (
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={handleLeave}
            disabled={isPending}
          >
            {isPending ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
            Sair do time
          </Button>
        )}

        {isCaptain && (
          <Button
            type="button"
            variant="destructive"
            size="md"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Trash2 size={14} />
            )}
            Deletar time
          </Button>
        )}
      </div>

      <p className="font-mono text-[10px] uppercase tracking-widest text-white/30">
        Invite por username · V2
      </p>
    </section>
  );
}
