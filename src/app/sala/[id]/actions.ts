"use server";

// A marcação "tenho 18 anos ou mais" na primeira entrada numa sala de voz (decisão do PPA de
// 23/11/2026). Grava pela função confirm_adult, com a sessão de quem pede: uma vez só, e repetir não dá erro.

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { TERMOS_SALA } from "@/lib/sala/termos";

export type MaioridadeState = { erro: "sem_marcacao" | "falhou" } | null;

const Form = z.object({
  roomId: z.string().uuid(),
  maior: z.literal("sim"),
  next: z.string().regex(/^\/sala\/[0-9a-f-]{36}(\?convite=[A-Za-z0-9_-]{20,128})?$/).optional(),
});

export async function confirmAdult(_prev: MaioridadeState, formData: FormData): Promise<MaioridadeState> {
  const parsed = Form.safeParse({ roomId: formData.get("roomId"), maior: formData.get("maior"), next: formData.get("next") ?? undefined });
  if (!parsed.success) return { erro: "sem_marcacao" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_adult", { p_terms_version: TERMOS_SALA });
  if (error) {
    console.error("[sala] marcação de maioridade:", error.message);
    return { erro: "falhou" };
  }
  redirect(parsed.data.next ?? `/sala/${parsed.data.roomId}`);
}
