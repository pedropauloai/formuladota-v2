"use client";

// HubCenter — a CAPA do client (/ e /dashboard), visitante E logado.
//
// É a TESE do produto, estampada e cabendo na tela SEM scroll (Pedro 2026-06-18,
// "é o principal do produto"). Otimizada pra 1920x1080 (preenche o canvas) e
// responsiva pra baixo. Tese: o ambiente competitivo da Valve é quebrado
// (anonimato, topo fechado, regiões isoladas) e a FormulaDota é a resposta
// (identidade, temporadas, ranking único). Aprofundamento em /manifesto.
//
// i18n: textos via namespace "capa" (next-intl). PT padrão, EN no pivô internacional.
//
// Client Component (passa refs de LucideIcon pros pilares — não serializável).

import { Link } from "@/i18n/navigation";
import {
  Swords,
  ShieldX,
  ArrowDown,
  Fingerprint,
  RotateCcw,
  Trophy,
  Compass,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { signInWithDiscord } from "@/app/login/actions";

export interface HubCenterProps {
  /** True = visitante deslogado. Adapta só o CTA (login vs jogar). */
  isVisitor?: boolean;
  /** PROs com fila aberta agora — pulso da comunidade (prova social). */
  prosOnlineCount: number;
  /** Feature flag on = CTA "Subir MMR" (/ranked-com-pro); off = "Ver Partidas" (/partidas). */
  showRankedComPro?: boolean;
}

// Os 3 pilares — falha da Valve → resposta da FormulaDota. Texto via i18n (capa).
// `id` casa com as chaves pillar<Id>Problem/Solution/Line nas mensagens.
const PILLARS = [
  { id: "Anonimato", icon: Fingerprint },
  { id: "Mmr", icon: RotateCcw },
  { id: "Regiao", icon: Trophy },
] as const;

export function HubCenter({ isVisitor, prosOnlineCount, showRankedComPro = false }: HubCenterProps) {
  const t = useTranslations("capa");
  // CTA de ação (logado): "Subir MMR" quando a feature está on; senão o guia do MMR
  // (/mmr) — vitrine didática do sistema (Pedro 2026-07-02).
  const ctaHref = showRankedComPro ? "/ranked-com-pro" : "/mmr";
  const ctaLabel = showRankedComPro ? t("ctaPlay") : t("ctaMmr");

  return (
    <section className="mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-5 px-6 py-6 2xl:gap-8 2xl:px-10 2xl:py-10">
      {/* TESE — headline gigante + subtítulo */}
      <header className="space-y-3 2xl:space-y-5">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary 2xl:text-base">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-[0.92] tracking-tight text-text-display sm:text-5xl 2xl:text-8xl">
          {t("headlineLead")}{" "}
          <span
            className="text-brand-primary"
            style={{ textShadow: "0 0 32px var(--color-brand-primary-glow)" }}
          >
            {t("headlineEmphasis")}
          </span>
        </h1>
        <p className="max-w-3xl font-display text-base font-semibold leading-snug text-text-body xl:text-lg 2xl:text-2xl">
          {t("subtitle")}
        </p>
      </header>

      {/* 3 PILARES — falha da Valve → resposta FormulaDota */}
      <div className="grid gap-4 sm:grid-cols-3 2xl:gap-6">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="flex flex-col rounded-lg border border-border-subtle bg-bg-base/60 p-4 2xl:p-6"
            >
              {/* Na Valve (problema) */}
              <div className="flex items-center gap-1.5 text-text-faded">
                <ShieldX size={13} aria-hidden="true" className="shrink-0" />
                <span className="font-display text-[11px] font-semibold uppercase tracking-wide 2xl:text-xs">
                  {t("naValve")}
                </span>
              </div>
              <p className="mt-0.5 font-display text-sm font-semibold text-text-muted line-through decoration-error/50 2xl:text-base">
                {t(`pillar${p.id}Problem`)}
              </p>

              {/* Transformação */}
              <ArrowDown
                size={16}
                aria-hidden="true"
                className="my-2 text-brand-primary 2xl:my-3"
              />

              {/* Na FormulaDota (resposta) */}
              <div className="flex items-center gap-2">
                <Icon
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-brand-primary 2xl:size-6"
                />
                <p className="font-display text-base font-bold uppercase leading-tight tracking-wide text-text-display 2xl:text-xl">
                  {t(`pillar${p.id}Solution`)}
                </p>
              </div>
              <p className="mt-1.5 font-body text-xs leading-snug text-text-muted 2xl:mt-2.5 2xl:text-sm">
                {t(`pillar${p.id}Line`)}
              </p>
            </div>
          );
        })}
      </div>

      {/* DOUTRINA — a outra metade da tese: o sistema é justo (os 3 pilares) E
          os jogadores jogam alinhados pelos fundamentos (Pedro 2026-06-19). */}
      <div className="flex items-start gap-3 rounded-lg border border-brand-primary/30 bg-brand-primary/[0.06] px-4 py-3 2xl:items-center 2xl:py-4">
        <Compass
          size={20}
          aria-hidden="true"
          className="mt-0.5 shrink-0 text-brand-primary 2xl:mt-0 2xl:size-6"
        />
        <p className="font-display text-sm font-semibold leading-snug text-text-body 2xl:text-base">
          <span className="font-bold uppercase text-text-display">
            {t("doctrineLead")}
          </span>{" "}
          {t("doctrineBody")}{" "}
          <Link
            href="/codigo-de-conduta"
            className="font-bold text-brand-primary transition-colors hover:text-text-display"
          >
            {t("doctrineLink")}
          </Link>
        </p>
      </div>

      {/* CTA + aprofundamento + pulso da comunidade */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        {isVisitor ? (
          <form action={signInWithDiscord}>
            <Button
              type="submit"
              variant="cinematic"
              size="lg"
              aria-label={t("ctaLogin")}
            >
              <Swords size={20} aria-hidden="true" />
              {t("ctaLogin")}
            </Button>
          </form>
        ) : (
          <Link href={ctaHref} aria-label={ctaLabel}>
            <Button variant="cinematic" size="lg">
              <Swords size={20} aria-hidden="true" />
              {ctaLabel}
            </Button>
          </Link>
        )}
        <Link
          href="/manifesto"
          className="font-display text-sm font-semibold text-brand-primary transition-colors hover:text-text-display 2xl:text-base"
        >
          {t("whyLink")}
        </Link>
        {/* Pulso de PROs online — só quando a feature "Ranked com PRO" está ligada
            (com ela off, "0 PROs online" não faz sentido). Pedro 2026-07-02. */}
        {showRankedComPro && (
          <span
            className="font-display text-sm font-semibold text-text-muted 2xl:text-base"
            role="status"
          >
            {t("pulso", { count: prosOnlineCount })}
          </span>
        )}
      </div>
    </section>
  );
}
