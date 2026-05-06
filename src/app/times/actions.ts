"use server";

// Server Actions de teams — Phase 7.5.
// createTeam, inviteToTeam, acceptInvite, declineInvite, leaveTeam, kickMember.
// RLS gate + triggers SQL garantem max 7 membros e captain como member auto.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type TeamResult =
  | { success: true; teamId?: string; teamSlug?: string }
  | { success: false; error: string };

const createTeamSchema = z.object({
  name: z.string().min(3).max(60),
  tag: z
    .string()
    .min(2)
    .max(5)
    .regex(/^[A-Z0-9]+$/, "Tag: 2-5 chars maiúsculos/números"),
  slug: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-z0-9-]+$/, "Slug: minúsculas, números e hífen"),
  description: z.string().max(280).optional(),
});

export async function createTeam(input: {
  name: string;
  tag: string;
  slug: string;
  description?: string;
}): Promise<TeamResult> {
  const parsed = createTeamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      tag: parsed.data.tag,
      slug: parsed.data.slug,
      description: parsed.data.description,
      captain_id: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Slug ou tag já em uso." };
    }
    console.error("[createTeam] insert falhou:", error.message);
    return { success: false, error: "Erro ao criar time." };
  }

  revalidatePath("/times");
  return { success: true, teamId: data.id, teamSlug: data.slug };
}

const inviteSchema = z.object({
  teamId: z.string().uuid(),
  invitedUserId: z.string().uuid(),
  message: z.string().max(280).optional(),
});

export async function inviteToTeam(input: {
  teamId: string;
  invitedUserId: string;
  message?: string;
}): Promise<TeamResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados inválidos." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Cancela invites pending anteriores (idempotência) — RLS captain gate
  await supabase
    .from("team_invites")
    .update({ status: "expired" })
    .eq("team_id", parsed.data.teamId)
    .eq("invited_user_id", parsed.data.invitedUserId)
    .eq("status", "pending");

  const { error } = await supabase.from("team_invites").insert({
    team_id: parsed.data.teamId,
    invited_user_id: parsed.data.invitedUserId,
    invited_by: user.id,
    message: parsed.data.message,
  });

  if (error) {
    if (error.code === "42501") {
      return { success: false, error: "Apenas o capitão convida." };
    }
    console.error("[inviteToTeam] falhou:", error.message);
    return { success: false, error: "Erro ao convidar." };
  }

  revalidatePath(`/times`);
  return { success: true };
}

export async function acceptInvite(inviteId: string): Promise<TeamResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { error } = await supabase.rpc("accept_team_invite", {
    p_invite_id: inviteId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/times");
  return { success: true };
}

export async function declineInvite(inviteId: string): Promise<TeamResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "declined", responded_at: new Date().toISOString() })
    .eq("id", inviteId)
    .eq("invited_user_id", user.id);

  if (error) {
    return { success: false, error: "Erro ao recusar convite." };
  }

  revalidatePath("/times");
  return { success: true };
}

export async function leaveTeam(teamId: string): Promise<TeamResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // Captain não pode sair — precisa transferir capitania ou deletar time
  const { data: team } = await supabase
    .from("teams")
    .select("captain_id")
    .eq("id", teamId)
    .single();
  if (team?.captain_id === user.id) {
    return {
      success: false,
      error: "Capitão precisa transferir capitania ou deletar o time.",
    };
  }

  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", user.id);

  if (error) {
    return { success: false, error: "Erro ao sair do time." };
  }

  revalidatePath("/times");
  return { success: true };
}

export async function kickMember(input: {
  teamId: string;
  userId: string;
}): Promise<TeamResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Não autenticado." };

  // RLS team_members_delete_self_or_captain gate
  const { error } = await supabase
    .from("team_members")
    .delete()
    .eq("team_id", input.teamId)
    .eq("user_id", input.userId);

  if (error) {
    return { success: false, error: "Erro ao remover membro." };
  }

  revalidatePath("/times");
  return { success: true };
}

export async function deleteTeam(teamId: string): Promise<TeamResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("teams").delete().eq("id", teamId);

  if (error) {
    return { success: false, error: "Erro ao deletar time." };
  }

  revalidatePath("/times");
  return { success: true };
}

export async function registerTeamForTournament(input: {
  tournamentId: string;
  teamId: string;
}): Promise<TeamResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("tournament_teams").insert({
    tournament_id: input.tournamentId,
    team_id: input.teamId,
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Time já inscrito neste torneio." };
    }
    if (error.code === "42501") {
      return {
        success: false,
        error: "Inscrições fechadas ou você não é capitão deste time.",
      };
    }
    return { success: false, error: "Erro ao inscrever no torneio." };
  }

  revalidatePath("/torneios");
  return { success: true };
}
