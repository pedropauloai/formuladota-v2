import type { ReactNode } from "react";
import { exigirLiga } from "@/lib/liga";

// Times é da liga: sem a flag fila_competitiva, o endereço (e o de cada time) leva à home.
export default async function TimesLayout({ children }: { children: ReactNode }) {
  await exigirLiga();
  return children;
}
