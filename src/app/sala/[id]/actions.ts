"use server";

// Data de nascimento na primeira entrada numa sala de voz (escolha 2 da spec). Grava pela função
// declare_birth_date, com a sessão de quem pede: uma vez só, e a mesma data de novo não dá erro.

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type NascimentoState = { erro: "invalida" | "ja_informada" | "falhou" } | null;

const Form = z.object({
  roomId: z.string().uuid(),
  nascimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function declareBirthDate(_prev: NascimentoState, formData: FormData): Promise<NascimentoState> {
  const parsed = Form.safeParse({ roomId: formData.get("roomId"), nascimento: formData.get("nascimento") });
  if (!parsed.success) return { erro: "invalida" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("declare_birth_date", { p_birth_date: parsed.data.nascimento });
  if (error?.code === "22023") return { erro: "invalida" };
  if (error?.code === "42501") return { erro: "ja_informada" };
  if (error) {
    console.error("[sala] declarar data de nascimento:", error.message);
    return { erro: "falhou" };
  }
  redirect(`/sala/${parsed.data.roomId}`);
}
