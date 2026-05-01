// Card individual de um pacote no catálogo público.
// Server Component — não precisa de interatividade no card em si.
// Click no botão navega para /checkout/[packageId] (Plan 02-06).

import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Tables } from "@/types/database";

type Package = Tables<"packages">;

interface PackageCardProps {
  pkg: Package;
}

// Formato R$ X,XX (PT-BR)
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PackageCard({ pkg }: PackageCardProps) {
  const isMensal = pkg.tipo === "mensal";
  const precoFormatado = formatBRL(pkg.preco_brl);

  return (
    <Card
      className={`flex flex-col bg-[#0A0A1A] border-[#27272a] transition-colors hover:border-[#00F0FF]/40 ${
        isMensal ? "ring-1 ring-[#A855F7]/30" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl text-[#f4f4f5] font-display">
            {pkg.nome}
          </CardTitle>
          <Badge
            variant="outline"
            className={
              isMensal
                ? "border-[#A855F7] text-[#A855F7]"
                : "border-[#00F0FF] text-[#00F0FF]"
            }
          >
            {isMensal ? "Mensal" : "Avulso"}
          </Badge>
        </div>
        {pkg.descricao && (
          <CardDescription className="text-[#a1a1aa]">
            {pkg.descricao}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <ul
          className="space-y-2 text-sm text-[#f4f4f5]"
          aria-label={`Conteúdo do pacote ${pkg.nome}`}
        >
          <li className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[#00F0FF]" aria-hidden="true" />
            <span>
              <strong>{pkg.qtd_partidas}</strong>{" "}
              partida{pkg.qtd_partidas === 1 ? "" : "s"} com Pedro
            </span>
          </li>
          {pkg.qtd_sessoes > 0 && (
            <li className="flex items-center gap-2">
              <Sparkles
                className="h-4 w-4 text-[#A855F7]"
                aria-hidden="true"
              />
              <span>
                <strong>{pkg.qtd_sessoes}</strong>{" "}
                sessão{pkg.qtd_sessoes === 1 ? "" : "ões"} teórica
                {pkg.qtd_sessoes === 1 ? "" : "s"}
              </span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-stretch">
        <p className="text-3xl font-display text-[#00F0FF]">
          {precoFormatado}
          <span className="text-sm text-[#a1a1aa] ml-1">
            {isMensal ? "/mês" : ""}
          </span>
        </p>
        <Link
          href={`/checkout/${pkg.id}`}
          aria-label={`Comprar pacote ${pkg.nome} por ${precoFormatado}`}
          className="inline-flex items-center justify-center rounded-lg bg-[#00F0FF] text-black font-medium text-sm px-4 py-2 transition-colors hover:bg-[#00F0FF]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00F0FF]/50"
        >
          Comprar
        </Link>
      </CardFooter>
    </Card>
  );
}
