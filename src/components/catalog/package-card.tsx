// Card individual de um pacote no catálogo público.
// Server Component — não precisa de interatividade no card em si.
// Click no botão navega para /checkout/[packageId].
// Phase 3.5: rebrand FORMULADOTA — paleta vermelho/preto, sem menção nome próprio.
// Header genérico "Coach Immortal" + badge "Top 0.5%".

import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
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
  username: string;       // exibição genérica "Coach Immortal" em V1; futuro V3 multi-coach
  avatarUrl: string | null;
  badge: string;          // ex: "Top 0.5%" / "Immortal"; futuro V3 derivar de role/MMR real
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

export async function PackageCard({ pkg, coach }: PackageCardProps) {
  const t = await getTranslations("billing");
  const isMensal = pkg.tipo === "mensal";
  const precoFormatado = formatBRL(pkg.preco_brl);

  return (
    <Card
      className={`flex flex-col bg-[var(--color-card)] border-[var(--color-border)] transition-colors hover:border-[var(--color-brand-red)]/60 ${
        isMensal ? "ring-1 ring-[var(--color-brand-red)]/30" : ""
      }`}
    >
      <CardHeader>
        {/* Header de coach: avatar + nome genérico + badge tier. */}
        {/* V1 mostra "Coach Immortal" (sem nome próprio per B6). V3 multi-coach usa nome real. */}
        <div className="mb-3 flex items-center gap-2 text-sm">
          {coach.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coach.avatarUrl}
              alt={t("coachAvatarAlt", { name: coach.username })}
              className="h-8 w-8 rounded-sm border border-[var(--color-brand-red)]/30"
            />
          ) : (
            <div
              aria-hidden="true"
              className="h-8 w-8 rounded-sm border border-[var(--color-border)] bg-[var(--color-card)]"
            />
          )}
          <span className="text-[var(--color-muted-foreground)]">
            {t("coachByLabel")}{" "}
            <span className="text-[var(--color-foreground)] font-medium">{coach.username}</span>
          </span>
          {coach.badge && (
            <Badge
              variant="outline"
              className="border-[var(--color-brand-red)]/40 text-[var(--color-brand-red)] text-sm py-0 px-1.5"
            >
              {coach.badge}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-2xl text-[var(--color-foreground)] font-display uppercase tracking-wide">
            {pkg.nome}
          </CardTitle>
          <Badge
            variant="outline"
            className="border-[var(--color-brand-red)] text-[var(--color-brand-red)]"
          >
            {isMensal ? t("typeMonthly") : t("typeOneOff")}
          </Badge>
        </div>
        {pkg.descricao && (
          <CardDescription className="text-[var(--color-muted-foreground)]">
            {pkg.descricao}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex-1">
        <ul
          className="space-y-2 text-sm text-[var(--color-foreground)]"
          aria-label={t("packageContentAria", { name: pkg.nome })}
        >
          <li className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--color-brand-red)]" aria-hidden="true" />
            <span>
              {t.rich("matchesWithCoach", {
                count: pkg.qtd_partidas,
                strong: (chunks) => <strong>{chunks}</strong>,
              })}
            </span>
          </li>
          {pkg.qtd_sessoes > 0 && (
            <li className="flex items-center gap-2">
              <Sparkles
                className="h-4 w-4 text-[var(--color-brand-red)]"
                aria-hidden="true"
              />
              <span>
                {t.rich("theorySessions", {
                  count: pkg.qtd_sessoes,
                  strong: (chunks) => <strong>{chunks}</strong>,
                })}
              </span>
            </li>
          )}
        </ul>
      </CardContent>

      <CardFooter className="flex flex-col gap-3 items-stretch">
        <p className="text-3xl font-display text-[var(--color-brand-red)]">
          {precoFormatado}
          <span className="text-sm text-[var(--color-muted-foreground)] ml-1">
            {isMensal ? t("perMonthSuffix") : ""}
          </span>
        </p>
        <Link
          href={`/checkout/${pkg.id}`}
          aria-label={t("buyPackageAria", { name: pkg.nome, price: precoFormatado })}
          className="inline-flex items-center justify-center rounded-md border border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-4 py-2 font-sans text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[var(--color-brand-red)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-red)]/50"
        >
          {t("buyCta")}
        </Link>
      </CardFooter>
    </Card>
  );
}
