// Queries de leitura sobre PROs (coaches estendidos com fila/headline).
// Server-only — usa createClient SSR.

import { createClient } from "@/lib/supabase/server";

export type ProLiveStatus = {
  coachId: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  filaAberta: boolean;
  filaAbertaEm: string | null;
  filaMaxVagas: number;
  username: string | null;
  avatarUrl: string | null;
  mmrAtual: number | null;
  vagasOcupadas: number;
  vagasRestantes: number;
};

type RawRow = {
  coach_id: string;
  slug: string;
  headline: string | null;
  bio: string | null;
  fila_aberta: boolean;
  fila_aberta_em: string | null;
  fila_max_vagas: number;
  username: string | null;
  avatar_url: string | null;
  mmr_atual: number | null;
  vagas_ocupadas: number;
  vagas_restantes: number;
};

// Lê o status público dos PROs via function SECURITY DEFINER (anon + authenticated).
export async function getProsLiveStatus(): Promise<ProLiveStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_pros_live_status");
  if (error) {
    console.error("[getProsLiveStatus]", error.message);
    return [];
  }
  return ((data ?? []) as RawRow[]).map((r) => ({
    coachId: r.coach_id,
    slug: r.slug,
    headline: r.headline,
    bio: r.bio,
    filaAberta: r.fila_aberta,
    filaAbertaEm: r.fila_aberta_em,
    filaMaxVagas: r.fila_max_vagas,
    username: r.username,
    avatarUrl: r.avatar_url,
    mmrAtual: r.mmr_atual,
    vagasOcupadas: r.vagas_ocupadas,
    vagasRestantes: r.vagas_restantes,
  }));
}
