// Gate + audit compartilhados pelas Server Actions admin de PROs.
// Server-only por construção (importa supabase/server + next/cache) — NÃO é
// "use server": exporta helpers e schemas, não actions.

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string };

export const UuidSchema = z.string().uuid("ID inválido.");
export const ReasonSchema = z
  .string()
  .trim()
  .min(3, "Motivo obrigatório (mín 3 caracteres).")
  .max(500, "Motivo longo demais (máx 500).");
export const DotaMatchIdSchema = z
  .string()
  .trim()
  .regex(/^\d{8,12}$/, "Match ID Dota deve ter entre 8 e 12 dígitos numéricos.");

export type AdminGate =
  | { ok: true; adminId: string }
  | { ok: false; error: string };

/** Valida que o CALLER (cookie de sessão) é admin — nunca confia no client. */
export async function requireAdmin(): Promise<AdminGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Não autenticado." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) {
    return { ok: false, error: "Apenas admins podem realizar esta ação." };
  }
  return { ok: true, adminId: user.id };
}

/** Audit log best-effort via service client — nunca bloqueia a action. */
export async function logAdmin(opts: {
  adminId: string;
  targetUserId: string | null;
  action: string;
  reason: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  try {
    const service = createServiceClient();
    await service.from("admin_audit_log" as never).insert({
      actor_user_id: opts.adminId,
      target_user_id: opts.targetUserId,
      action: opts.action,
      reason: opts.reason,
      payload_after: opts.payload ?? null,
      created_at: new Date().toISOString(),
    } as never);
  } catch {
    // best-effort
  }
}

/** Rotas que exibem estado de fila/PT — revalidar após qualquer mutação. */
export function revalidateQueueRoutes(): void {
  revalidatePath("/admin/pros");
  revalidatePath("/ranked-com-pro");
  revalidatePath("/dashboard");
  revalidatePath("/");
}
