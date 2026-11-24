// A liga (Ranking, Times e Torneios) volta junto com a busca de partida, então segue a flag
// fila_competitiva. Flag autoritativa: desligada, o endereço leva à home para todos, inclusive o admin.
import { redirect } from "next/navigation";
import { getFeatureFlags } from "@/lib/queries/feature-flags";

/** As rotas da liga, também fora do mapa do site enquanto ela está desligada. */
export const LIGA_PATHS: readonly string[] = ["/ranking", "/times", "/torneios"];

/** Para o layout de cada rota da liga: sem a flag, leva à home (o padrão das flags desligadas). */
export async function exigirLiga(): Promise<void> {
  const { fila_competitiva } = await getFeatureFlags();
  if (!fila_competitiva) redirect("/");
}
