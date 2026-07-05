"use client";

// HubCenter — a CAPA do client (/ e /dashboard), visitante E logado.
//
// É a TESE do produto, estampada e cabendo na tela SEM scroll (Pedro 2026-06-18,
// "é o principal do produto"). Otimizada pra 1920x1080 (preenche o canvas) e
// responsiva pra baixo. Tese: o ambiente competitivo da Valve é quebrado
// (anonimato, topo fechado, regiões isoladas) e o FORMULADOTA é a resposta
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
  ArrowRight,
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

// Os 3 pilares — falha da Valve → resposta do FORMULADOTA. Texto via i18n (capa).
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
    <>
      {/* Vídeo de fundo — montagem oficial do Dota 2 (cdn Steam) atrás da capa, com
          camada escura por cima pra o texto ganhar destaque (Pedro 2026-07-05). */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        >
          <source
            src="https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm"
            type="video/webm"
          />
          <source
            src="https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.mp4"
            type="video/mp4"
          />
        </video>
        <div className="absolute inset-0 bg-gradient-to-br from-bg-deep/90 via-bg-deep/72 to-bg-deep/92" />
      </div>

      <section className="relative z-[1] mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-3 px-6 py-4 xl:gap-4 2xl:gap-6 2xl:px-10 2xl:py-8">
      {/* TESE — headline gigante + subtítulo */}
      <header className="space-y-2 2xl:space-y-4">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary 2xl:text-base">
          {t("eyebrow")}
        </p>
        <h1 className="font-display text-4xl font-bold uppercase leading-[0.9] tracking-tight text-text-display sm:text-5xl 2xl:text-7xl">
          {t("headlineLead")}{" "}
          <span
            className="text-brand-primary"
            style={{ textShadow: "0 0 32px var(--color-brand-primary-glow)" }}
          >
            {t("headlineEmphasis")}
          </span>
        </h1>
        <p className="max-w-3xl font-display text-sm font-semibold leading-snug text-text-body xl:text-base 2xl:text-xl">
          {t("subtitle")}
        </p>
      </header>

      {/* 3 PILARES — falha da Valve → resposta FORMULADOTA */}
      <div className="grid gap-3 sm:grid-cols-3 2xl:gap-4">
        {PILLARS.map((p) => {
          const Icon = p.icon;
          return (
            <div
              key={p.id}
              className="flex flex-col rounded-lg border border-border-subtle bg-bg-base/60 p-3 2xl:p-5"
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
                className="my-1.5 text-brand-primary 2xl:my-2"
              />

              {/* No FORMULADOTA (resposta) */}
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
              <p className="mt-1 font-body text-xs leading-snug text-text-muted 2xl:mt-2 2xl:text-sm">
                {t(`pillar${p.id}Line`)}
              </p>
            </div>
          );
        })}
      </div>

      {/* DOUTRINA — a outra metade da tese: o sistema é justo (os 3 pilares) E
          os jogadores jogam alinhados pelos fundamentos (Pedro 2026-06-19). */}
      <div className="flex items-start gap-3 rounded-lg border border-brand-primary/30 bg-brand-primary/[0.06] px-4 py-2.5 2xl:items-center 2xl:py-3">
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
            href="/metodologia"
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
          className="inline-flex items-center gap-2 rounded-md border-2 border-brand-primary/50 bg-brand-primary/10 px-4 py-2 font-display text-sm font-bold uppercase tracking-wide text-brand-primary transition-all hover:border-brand-primary hover:bg-brand-primary/20 2xl:text-base"
        >
          {t("whyLink")}
          <ArrowRight size={16} aria-hidden="true" />
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
    </>
  );
}
