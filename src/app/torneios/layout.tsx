import type { ReactNode } from "react";
import { exigirLiga } from "@/lib/liga";

// Torneios é da liga: sem a flag fila_competitiva, o endereço (e o de cada torneio) leva à home.
export default async function TorneiosLayout({ children }: { children: ReactNode }) {
  await exigirLiga();
  return children;
}
