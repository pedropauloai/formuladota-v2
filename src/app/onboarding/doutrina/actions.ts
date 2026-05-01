"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { DOCTRINE_VERSION } from "@/lib/doctrine";

const acceptInput = z.object({
  acceptedVersion: z.number().int().positive(),
});

// Server Action invocada via <form action={acceptDoctrine}>.
// Retorna void — erros redirecionam de volta com query param ?error=.
export async function acceptDoctrine(formData: FormData): Promise<void> {
  const parsed = acceptInput.safeParse({
    acceptedVersion: Number(formData.get("acceptedVersion") ?? 0),
  });

  if (!parsed.success) {
    redirect("/onboarding/doutrina?error=invalid");
  }

  // Confere se a versão aceita pelo cliente bate com a versão atual do servidor.
  // Protege contra forms stale após Pedro publicar nova versão da doutrina.
  if (parsed.data.acceptedVersion !== DOCTRINE_VERSION) {
    redirect("/onboarding/doutrina?error=stale_version");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      doctrine_accepted_at: new Date().toISOString(),
      doctrine_version: DOCTRINE_VERSION,
    })
    .eq("id", user.id);

  if (error) {
    console.error("[acceptDoctrine] update falhou:", error.message);
    redirect("/onboarding/doutrina?error=db");
  }

  revalidatePath("/", "layout");
  redirect("/perfil");
}
