"use server";

// Server Actions enxutas — 1 RPC PG por ação.
// Sem revalidatePath: o RealtimeListener (subscribe em coach_queue_entries)
// dispara router.refresh em todos os clientes incluindo o que disparou
// a ação. Optimistic UI no client cobre o gap até o realtime chegar.

import { createClient } from "@/lib/supabase/server";

export type JoinQueueResult =
  | { success: true; entryId: string }
  | { success: false; error: string; code?: string };

interface JoinRpcResponse {
  success: boolean;
  entry_id?: string;
  error?: string;
  code?: string;
}

interface LeaveRpcResponse {
  success: boolean;
  error?: string;
  code?: string;
}

export async function joinCoachQueue(coachId: string): Promise<JoinQueueResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("join_coach_queue", {
    p_coach_id: coachId,
  });
  if (error) {
    return { success: false, error: "Erro de rede: " + error.message };
  }
  const res = data as unknown as JoinRpcResponse;
  if (!res?.success) {
    return {
      success: false,
      error: res?.error ?? "Erro desconhecido.",
      code: res?.code,
    };
  }
  return { success: true, entryId: res.entry_id! };
}

export async function leaveCoachQueue(entryId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("leave_coach_queue", {
    p_entry_id: entryId,
  });
  if (error) {
    return { success: false as const, error: "Erro de rede: " + error.message };
  }
  const res = data as unknown as LeaveRpcResponse;
  if (!res?.success) {
    return {
      success: false as const,
      error: res?.error ?? "Erro desconhecido.",
    };
  }
  return { success: true as const };
}
