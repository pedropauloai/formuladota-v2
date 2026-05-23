"use server";

// Server Actions enxutas — 1 RPC PG por ação + revalidatePath pra invalidar
// cache do Next. Client component ainda deve chamar router.refresh() após
// success pra forçar re-fetch imediato dos Server Components.

import { revalidatePath } from "next/cache";
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
  // Invalida cache do Next pra próximas nav/refresh terem dados frescos.
  // Realtime channel + router.refresh no client cobrem o caso imediato.
  revalidatePath("/", "layout");
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
  revalidatePath("/", "layout");
  return { success: true as const };
}
