import type { ReactNode } from "react";
import { exigirLiga } from "@/lib/liga";

// O ranking é da liga: sem a flag fila_competitiva, o endereço leva à home.
export default async function RankingLayout({ children }: { children: ReactNode }) {
  await exigirLiga();
  return children;
}
