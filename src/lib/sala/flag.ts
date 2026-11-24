// A flag da sala (autoritativa: desligada, a sala some para todos, inclusive o admin). Páginas, painel
// e servidor da sala leem por aqui; a aba da barra lê a sala_voz direto (getFeatureFlags).

import "server-only";
import { cache } from "react";
import { getFeatureFlags } from "@/lib/queries/feature-flags";
import { createClient } from "@/lib/supabase/server";
import { SALA_FLAG, salaFlagKey } from "./flag-chave";

export const salaVozOn = cache(async (): Promise<boolean> => {
  const key = salaFlagKey({ NODE_ENV: process.env.NODE_ENV, SALA_FLAG_KEY: process.env.SALA_FLAG_KEY });
  if (key === SALA_FLAG) return (await getFeatureFlags()).sala_voz;
  const supabase = await createClient();
  const { data } = await supabase.from("feature_flags").select("enabled").eq("key", key).maybeSingle();
  return data?.enabled === true;
});
