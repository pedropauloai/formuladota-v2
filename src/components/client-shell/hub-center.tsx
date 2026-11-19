"use client";

// HubCenter — a CAPA do client (/ e /dashboard), visitante E logado.
//
// É a TESE do produto, estampada e cabendo na tela SEM scroll em 1920x1080 (Pedro 2026-06-18,
// "é o principal do produto"). Tese: o ambiente competitivo da Valve é quebrado (anonimato,
// topo fechado, regiões isoladas) e o FORMULADOTA é a resposta (identidade, temporadas,
// ranking único). Aprofundamento em /manifesto.
//
// Design 2.0 (19/11/2026): a pele do cliente do Dota, a mesma da barra superior. Título
// condensado com brilho, pilares em painéis com o marcador hexagonal dos eventos do cliente,
// chamadas em placa. A resposta do FORMULADOTA vem primeiro; o problema da Valve fica riscado.
//
// i18n: textos via namespace "capa" (next-intl).

import { Link } from "@/i18n/navigation";
import { Compass, Fingerprint, RotateCcw, Swords, Trophy } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useSound } from "@/lib/sound/hooks";
import { signInWithDiscord } from "@/app/login/actions";
import { BrandGlyph } from "@/components/loja/brand-glyph";
import { CtaWarp, Embers, HexBadge, Panel, plate, v2Page } from "@/components/v2";

export interface HubCenterProps {
  /** True = visitante deslogado. Adapta só o CTA (login vs jogar). */
  isVisitor?: boolean;
  /** PROs com fila aberta agora — pulso da comunidade (prova social). */
  prosOnlineCount: number;
  /** Feature flag on = CTA "Subir MMR" (/ranked-com-pro); off = guia do MMR (/mmr). */
  showRankedComPro?: boolean;
}

// Os 3 pilares — falha da Valve → resposta do FORMULADOTA. `id` casa com as chaves
// pillar<Id>Problem/Solution/Line nas mensagens. Ícone como elemento (não componente).
const PILLARS: ReadonlyArray<{ id: string; icon: ReactNode }> = [
  { id: "Anonimato", icon: <Fingerprint size={26} aria-hidden="true" /> },
  { id: "Mmr", icon: <RotateCcw size={26} aria-hidden="true" /> },
  { id: "Regiao", icon: <Trophy size={26} aria-hidden="true" /> },
];

// Fundo da capa: o vídeo são 24 MB da CDN da Valve, então só o computador toca. Celular e
// quem pediu menos movimento ficam com a imagem oficial do mesmo vídeo (170 KB); quem pediu
// economia de dados fica só com a camada escura. Decide depois da hidratação.
const MONTAGE_POSTER = "https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.jpg";
type Backdrop = "nada" | "imagem" | "video";

function useBackdrop(): Backdrop {
  const [backdrop, setBackdrop] = useState<Backdrop>("nada");
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 767px)");
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const update = () => {
      if (connection?.saveData === true) setBackdrop("nada");
      else setBackdrop(reduceMotion.matches || phone.matches ? "imagem" : "video");
    };
    update();
    reduceMotion.addEventListener("change", update);
    phone.addEventListener("change", update);
    return () => {
      reduceMotion.removeEventListener("change", update);
      phone.removeEventListener("change", update);
    };
  }, []);
  return backdrop;
}

function Backdrop({ kind }: { kind: Backdrop }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {kind === "imagem" && <div className="h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${MONTAGE_POSTER})` }} />}
      {kind === "video" && (
        <video autoPlay muted loop playsInline preload="auto" poster={MONTAGE_POSTER} className="h-full w-full object-cover">
          <source src="https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_webm.webm" type="video/webm" />
          <source src="https://cdn.steamstatic.com/apps/dota2/videos/dota_react/homepage/dota_montage_02.mp4" type="video/mp4" />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-bg-deep/90 via-bg-deep/72 to-bg-deep/92" />
      {/* Brasa da marca subindo do pé da tela, como o brilho atrás do logo da barra. */}
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(60%_70%_at_30%_100%,var(--color-brand-primary-glow),transparent_70%)]" />
    </div>
  );
}

function Pillar({ id, icon }: { id: string; icon: ReactNode }) {
  const t = useTranslations("capa");
  return (
    <Panel className="flex h-full gap-4 p-4 hero:p-5" wrapperClassName="h-full">
      <HexBadge size={58} className="mt-0.5 hidden self-start sm:grid hero:[width:68px]">
        <span className="text-gold-bright">{icon}</span>
      </HexBadge>
      <div className="min-w-0 space-y-1.5">
        <p className="font-display-condensed text-[1.75rem] uppercase leading-[0.9] text-text-display hero:text-[2.1rem]">{t(`pillar${id}Solution`)}</p>
        <p className="text-xs text-text-faded hero:text-sm">
          {t("naValve")}: <span className="text-text-muted line-through decoration-error/70 decoration-2">{t(`pillar${id}Problem`)}</span>
        </p>
        <p className="text-sm leading-snug text-text-muted hero:text-[0.95rem]">{t(`pillar${id}Line`)}</p>
      </div>
    </Panel>
  );
}

function Doctrine() {
  const t = useTranslations("capa");
  return (
    <Panel className="flex items-center gap-4 px-4 py-3 hero:px-5 hero:py-4">
      <HexBadge size={44} className="hidden sm:grid">
        <Compass size={20} aria-hidden="true" className="text-gold-bright" />
      </HexBadge>
      <p className="text-sm leading-snug text-text-body hero:text-base">
        <span className="font-bold uppercase text-text-display">{t("doctrineLead")}</span> {t("doctrineBody")}{" "}
        <Link href="/metodologia" className="font-bold text-gold transition-colors hover:text-gold-bright">
          {t("doctrineLink")}
        </Link>
      </p>
    </Panel>
  );
}

function Actions({ isVisitor, showRankedComPro, prosOnlineCount }: Required<HubCenterProps>) {
  const t = useTranslations("capa");
  const play = useSound();
  // Logado: "Subir MMR" com a feature ligada; senão o guia do MMR (/mmr), vitrine do sistema.
  const ctaHref = showRankedComPro ? "/ranked-com-pro" : "/mmr";
  const ctaLabel = showRankedComPro ? t("ctaPlay") : t("ctaMmr");
  const cta = plate({ kind: "cta", large: true });
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
      {isVisitor ? (
        <form action={signInWithDiscord}>
          <button type="submit" onClick={() => play("click")} className={cn(cta, "w-full sm:w-auto")}>
            <CtaWarp />
            <BrandGlyph brand="discord" size={22} className="[&_path]:fill-current" />
            {t("ctaLogin")}
          </button>
        </form>
      ) : (
        <Link href={ctaHref} onClick={() => play("click")} className={cn(cta, "w-full sm:w-auto")}>
          <CtaWarp />
          <Swords size={20} aria-hidden="true" />
          {ctaLabel}
        </Link>
      )}
      <Link href="/manifesto" className={plate({ kind: "ghost" })}>
        {t("whyLink")}
      </Link>
      {/* Pulso de PROs online: só com a feature "Ranked com PRO" ligada ("0 online" não diz nada). */}
      {showRankedComPro && (
        <span className="font-display text-sm font-semibold text-text-muted hero:text-base" role="status">
          {t("pulso", { count: prosOnlineCount })}
        </span>
      )}
    </div>
  );
}

export function HubCenter({ isVisitor = false, prosOnlineCount, showRankedComPro = false }: HubCenterProps) {
  const t = useTranslations("capa");
  const backdrop = useBackdrop();
  return (
    <>
      <Backdrop kind={backdrop} />
      <section
        className={cn(
          v2Page,
          "relative z-[1] mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center gap-5 overflow-x-clip px-5 py-6 hero:gap-7 hero:px-10 hero:py-8",
        )}
      >
        <Embers count={6} className="-z-10" />
        <header className="space-y-3 hero:space-y-4">
          <h1 className="font-display-condensed text-[3.6rem] uppercase leading-[0.82] text-text-display [text-shadow:0_4px_24px_var(--color-bg-deep)] sm:text-[5rem] hero:text-[7.5rem]">
            {t("headlineLead")}{" "}
            <span className="text-brand-primary [text-shadow:0_0_36px_var(--color-brand-primary-glow),0_0_2px_var(--color-brand-primary)]">{t("headlineEmphasis")}</span>
          </h1>
          <p className="max-w-3xl text-base font-medium leading-relaxed text-text-body [text-shadow:0_2px_10px_var(--color-bg-deep)] hero:text-xl">{t("subtitle")}</p>
        </header>

        <div className="grid gap-3 md:grid-cols-3 hero:gap-4">
          {PILLARS.map((p) => (
            <Pillar key={p.id} id={p.id} icon={p.icon} />
          ))}
        </div>

        <Doctrine />
        <Actions isVisitor={isVisitor} showRankedComPro={showRankedComPro} prosOnlineCount={prosOnlineCount} />
      </section>
    </>
  );
}
