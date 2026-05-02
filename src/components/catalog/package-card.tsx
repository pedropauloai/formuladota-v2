// Card individual de um pacote no catálogo público.
// Server Component — não precisa de interatividade no card em si.
// Click no botão navega para /checkout/[packageId] (Plan 02-06).
// Phase 3 (Plan 03-05): aceita prop `coach` pra renderizar header com avatar
// + "Por: {username}" + badge "Immortal" cyan acima do nome do pacote.

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

// Tipo da coach passada via prop. Mantemos só os campos que o card consome
// — evita acoplamento com schema completo de profiles/coaches e facilita
// reuso em V3 quando coaches plurais entrarem (cada um com seu próprio badge).
export interface CoachInfo {
  username: string;
  avatarUrl: string | null;
  badge: string; // ex: "Immortal" pra Pedro; futuro: derivar de role/MMR real
}

interface PackageCardProps {
  pkg: Package;
  coach: CoachInfo;
}

// Formato R$ X,XX (PT-BR)
function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function PackageCard({ pkg, coach }: PackageCardProps) {
  const isMensal = pkg.tipo === "mensal";
  const precoFormatado = formatBRL(pkg.preco_brl);

  return (
    <Card
      className={`flex flex-col bg-[#0A0A1A] border-[#27272a] transition-colors hover:border-[#00F0FF]/40 ${
        isMensal ? "ring-1 ring-[#A855F7]/30" : ""
      }`}
    >
      <CardHeader>
        {/* Header de coach: avatar + "Por: {username}" + badge tier (ex: Immortal). */}
        {/* Renderizado ACIMA do nome do pacote pra dar protagonismo ao coach (Phase 3 H1.4). */}
        <div className="mb-3 flex items-center gap-2 text-xs">
          {coach.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.avatarUrl}
              alt={`Avatar de ${coach.username}`}
              className="h-8 w-8 rounded-full border border-[#00F0FF]/30"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-full border border-[#27272a] bg-[#0A0A1A]"
            />
          )}
          <span className="text-[#a1a1aa]">
            Por:{" "}
            <span className="text-[#f4f4f5] font-medium">{coach.username}</span>
          </span>
          {coach.badge && (
            <Badge
              variant="outline"
              className="border-[#00F0FF]/40 text-[#00F0FF] text-[10px] py-0 px-1.5"
            >
              {coach.badge}
            </Badge>
          )}
        </div>

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
