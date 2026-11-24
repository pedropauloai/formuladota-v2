// PROTÓTIPO descartável: três versões da porta (home) para o PPA escolher a direção visual, com a fila
// de verdade no herói. Só em desenvolvimento (o grupo (dev) responde 404 em produção). Abrir em
// /party/home-previa?v=a|b|c&estado=agora|marcada|aovivo (debaixo de /party, que o portão de login
// deixa abrir para o visitante); setas do teclado trocam a versão.
// Depois da escolha, a vencedora é reescrita de verdade na home e este protótipo sai da main.

import { Suspense } from "react";
import { getPublicQueue } from "@/lib/loja/fila/server";
import { getOwnerProof } from "@/lib/loja/owner-proof";
import { fontesPrevia } from "./fontes";
import { Previa } from "./previa";

export const dynamic = "force-dynamic";

export default async function HomePrevia() {
  const [fila, prova] = await Promise.all([getPublicQueue(), getOwnerProof()]);
  return (
    <Suspense>
      <Previa real={fila} rank={prova?.leaderboardRank ?? null} rankTier={prova?.rankTier ?? null} fontes={fontesPrevia} />
    </Suspense>
  );
}
