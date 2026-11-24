// O servidor FORMULADOTA (/sala): o invólucro do site e, para quem está logado, a coluna de canais à
// esquerda, que fica de pé entre um canal e outro (a voz não cai ao trocar de canal). Flag sala_voz
// desligada dá 404 para todos, inclusive o admin.

import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ClientShell } from "@/components/client-shell/shell";
import { Servidor } from "@/components/sala/servidor";
import { authInfo } from "@/lib/sala/contexto";
import { salaVozOn } from "@/lib/sala/flag";
import { listaDeCanais } from "@/lib/sala/lista-canais";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

async function ehAdmin(userId: string): Promise<boolean> {
  // Só decide se a engrenagem de gerenciar aparece; o /admin confere de novo.
  const { data } = await createServiceClient().from("profiles").select("is_admin").eq("id", userId).maybeSingle();
  return data?.is_admin === true;
}

export default async function SalaLayout({ children }: { children: ReactNode }) {
  if (!(await salaVozOn())) notFound();
  const auth = await authInfo();
  const [lista, admin] = auth ? await Promise.all([listaDeCanais(createServiceClient(), auth.userId), ehAdmin(auth.userId)]) : [null, false];
  return (
    <ClientShell currentRoute="/sala" hideRightSidebar hideBottomBar>
      {lista ? <Servidor inicial={lista} souDono={admin}>{children}</Servidor> : children}
    </ClientShell>
  );
}
