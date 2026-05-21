// Query do package "Ficha avulsa" — usado em CTAs de compra (checkout deep-link).

import { createClient } from "@/lib/supabase/server";

export interface FichaPackage {
  id: string;
  precoBrl: number;
  nome: string;
}

export async function getFichaPackage(): Promise<FichaPackage | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("packages")
    .select("id, preco_brl, nome")
    .eq("nome", "Ficha avulsa")
    .eq("tipo", "avulso")
    .eq("ativo", true)
    .limit(1)
    .single();
  if (!data) return null;
  return {
    id: data.id,
    precoBrl: Number(data.preco_brl),
    nome: data.nome,
  };
}
