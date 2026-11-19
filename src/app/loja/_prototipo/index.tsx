// PROTÓTIPO (descartável). Três versões radicalmente diferentes da vitrine /loja, trocadas por
// ?versao=a|b|c (e ?versao=atual para comparar com a de hoje), na própria rota, com os dados reais.
// Só no servidor local: em produção a página ignora o parâmetro. A escolhida vira código de verdade;
// as outras ficam no branch do protótipo.

import { Suspense } from "react";
import type { VitrineDados } from "./dados";
import { NOME_A, VarianteA } from "./variante-a";
import { NOME_B, VarianteB } from "./variante-b";
import { NOME_C, VarianteC } from "./variante-c";
import { SeletorVersao, type OpcaoVersao } from "./seletor";

export const OPCOES: OpcaoVersao[] = [
  { key: "a", nome: NOME_A },
  { key: "b", nome: NOME_B },
  { key: "c", nome: NOME_C },
  { key: "atual", nome: "Loja de hoje" },
];

/** Versão pedida na URL; null em produção ou quando a pedida é a de hoje. */
export function versaoPedida(raw: string | string[] | undefined): string | null {
  if (process.env.NODE_ENV === "production") return null;
  const key = typeof raw === "string" ? raw.toLowerCase() : "a";
  return OPCOES.some((o) => o.key === key) ? key : "a";
}

export function Prototipo({ versao, data }: { versao: string; data: VitrineDados }) {
  return (
    <>
      {versao === "a" && <VarianteA data={data} />}
      {versao === "b" && <VarianteB data={data} />}
      {versao === "c" && <VarianteC data={data} />}
    </>
  );
}

export function SeletorPrototipo({ versao }: { versao: string }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <Suspense fallback={null}>
      <SeletorVersao opcoes={OPCOES} atual={versao} />
    </Suspense>
  );
}
